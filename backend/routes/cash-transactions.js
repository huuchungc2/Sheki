const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const requireShop = require('../middleware/requireShop');
const requirePermission = require('../middleware/requirePermission');
const { requireFeature } = require('../middleware/requireFeature');
const { getPool } = require('../config/db');
const { getScope } = require('../utils/scope');

const BASE_FROM = `
      FROM cash_transactions ct
      JOIN users u ON ct.user_id = u.id
      LEFT JOIN groups g ON ct.group_id = g.id
      JOIN users c ON ct.created_by = c.id
    `;

async function buildCashTxWhere(query, shopId, reqUser, req) {
  let where = ' WHERE ct.shop_id = ? ';
  const params = [shopId];

  const scope = req ? await getScope(req, 'reports') : (!!reqUser?.scope_own_data && !reqUser?.can_access_admin && !reqUser?.is_super_admin ? 'own' : 'shop');
  const effUserId = scope === 'own' ? Number(reqUser.id) : (query.user_id ? parseInt(query.user_id, 10) : null);
  if (effUserId) {
    where += ' AND ct.user_id = ? ';
    params.push(effUserId);
  }
  if (query.kind === 'income' || query.kind === 'expense') {
    where += ' AND ct.kind = ? ';
    params.push(query.kind);
  }
  const y = query.year;
  const m = query.month;
  if (y != null && y !== '' && m != null && m !== '') {
    const yi = parseInt(y, 10);
    const mi = parseInt(m, 10);
    if (!Number.isNaN(yi) && !Number.isNaN(mi) && mi >= 1 && mi <= 12) {
      where += ' AND YEAR(ct.created_at) = ? AND MONTH(ct.created_at) = ? ';
      params.push(yi, mi);
    }
  }

  return { where, params };
}

const SELECT_LIST = `SELECT ct.id, ct.user_id, ct.group_id, ct.kind, ct.amount, ct.note, ct.created_at,
        u.full_name AS user_full_name, u.username AS user_username,
        g.name AS group_name,
        c.full_name AS created_by_name`;

/** Admin: thu chi nội bộ — danh sách (lọc theo tháng/năm + NV + loại) */
router.get('/', auth, requireShop, requirePermission('reports', 'view'), requireFeature('cash_transactions.view'), async (req, res, next) => {
  try {
    const pool = await getPool();
    const { page = 1, limit = 20 } = req.query;
    const offset = (Math.max(1, parseInt(page, 10)) - 1) * Math.min(100, Math.max(1, parseInt(limit, 10)));
    const lim = Math.min(100, Math.max(1, parseInt(limit, 10)));

    const { where, params } = await buildCashTxWhere(req.query, req.shopId, req.user, req);

    const [countRows] = await pool.query(
      `SELECT COUNT(*) AS total ${BASE_FROM} ${where}`,
      params
    );
    const total = countRows[0]?.total ?? 0;

    const listParams = [...params, lim, offset];
    const [rows] = await pool.query(
      `${SELECT_LIST}
      ${BASE_FROM}
      ${where}
      ORDER BY ct.created_at DESC
      LIMIT ? OFFSET ?`,
      listParams
    );

    res.json({
      data: rows,
      total,
      page: parseInt(page, 10),
      limit: lim,
    });
  } catch (err) {
    next(err);
  }
});

/** Xuất toàn bộ bản ghi theo bộ lọc (không phân trang) — phục vụ Excel */
router.get('/export', auth, requireShop, requirePermission('reports', 'view'), async (req, res, next) => {
  try {
    const pool = await getPool();
    const { where, params } = await buildCashTxWhere(req.query, req.shopId, req.user, req);
    const [rows] = await pool.query(
      `${SELECT_LIST}
      ${BASE_FROM}
      ${where}
      ORDER BY ct.created_at DESC`,
      params
    );
    res.json({ data: rows });
  } catch (err) {
    next(err);
  }
});

/** Admin: tạo phiếu thu/chi */
router.post('/', auth, requireShop, requirePermission('reports', 'edit'), requireFeature('cash_transactions.edit'), async (req, res, next) => {
  try {
    const pool = await getPool();
    const sid = req.shopId;
    const { user_id, group_id, kind, amount, note } = req.body;

    const scope = await getScope(req, 'reports');
    const uid = scope === 'own' ? Number(req.user.id) : parseInt(user_id, 10);
    if (!uid || Number.isNaN(uid)) {
      return res.status(400).json({ error: 'Chọn nhân viên' });
    }
    if (kind !== 'income' && kind !== 'expense') {
      return res.status(400).json({ error: 'Loại phải là thu hoặc chi' });
    }
    const amt = Number(amount);
    if (!Number.isFinite(amt) || amt <= 0) {
      return res.status(400).json({ error: 'Số tiền phải lớn hơn 0' });
    }

    const [urows] = await pool.query('SELECT id FROM users WHERE id = ?', [uid]);
    if (urows.length === 0) {
      return res.status(400).json({ error: 'Nhân viên không tồn tại' });
    }

    let gid = null;
    if (group_id != null && group_id !== '') {
      gid = parseInt(group_id, 10);
      if (Number.isNaN(gid)) {
        return res.status(400).json({ error: 'Nhóm không hợp lệ' });
      }
      const [mem] = await pool.query(
        'SELECT 1 FROM user_groups ug INNER JOIN groups g ON g.id = ug.group_id WHERE ug.user_id = ? AND ug.group_id = ? AND g.shop_id = ?',
        [uid, gid, sid]
      );
      if (mem.length === 0) {
        return res.status(400).json({ error: 'Nhân viên không thuộc nhóm đã chọn' });
      }
    }

    const createdBy = req.user.id;
    const [result] = await pool.query(
      `INSERT INTO cash_transactions (shop_id, user_id, group_id, kind, amount, note, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [sid, uid, gid, kind, amt, note ? String(note).trim() || null : null, createdBy]
    );

    const [inserted] = await pool.query(
      `SELECT ct.id, ct.user_id, ct.group_id, ct.kind, ct.amount, ct.note, ct.created_at,
        u.full_name AS user_full_name, u.username AS user_username,
        g.name AS group_name,
        c.full_name AS created_by_name
       FROM cash_transactions ct
       JOIN users u ON ct.user_id = u.id
       LEFT JOIN groups g ON ct.group_id = g.id
       JOIN users c ON ct.created_by = c.id
       WHERE ct.id = ? AND ct.shop_id = ?`,
      [result.insertId, sid]
    );

    res.status(201).json({ data: inserted[0], message: 'Đã lưu' });
  } catch (err) {
    next(err);
  }
});

/** Admin: xóa bản ghi (nhập nhầm) */
router.delete('/:id', auth, requireShop, requirePermission('reports', 'delete'), requireFeature('cash_transactions.edit'), async (req, res, next) => {
  try {
    const pool = await getPool();
    const id = parseInt(req.params.id, 10);
    if (!id) return res.status(400).json({ error: 'ID không hợp lệ' });
    const [r] = await pool.query('DELETE FROM cash_transactions WHERE id = ? AND shop_id = ?', [id, req.shopId]);
    if (r.affectedRows === 0) {
      return res.status(404).json({ error: 'Không tìm thấy bản ghi' });
    }
    res.json({ message: 'Đã xóa' });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
