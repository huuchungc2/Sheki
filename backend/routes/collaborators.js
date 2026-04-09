const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const authorize = require('../middleware/authorize');
const { getPool } = require('../config/db');

// GET /api/collaborators/my-managers — CTV xem quản lý; ?group_id= chỉ quản lý thuộc nhóm đó (user_groups)
// ?include_user_ids=1,2 — thêm user (vd. quản lý đơn đang sửa) nếu chưa có trong danh sách lọc
router.get('/my-managers', auth, async (req, res, next) => {
  try {
    const pool = await getPool();
    const uid = req.user.id;
    const groupIdRaw = req.query.group_id;
    const groupId =
      groupIdRaw !== undefined && groupIdRaw !== null && groupIdRaw !== ''
        ? parseInt(groupIdRaw, 10)
        : null;

    let sql = `SELECT u.id, u.full_name, u.email, u.phone, u.commission_rate
       FROM collaborators c
       JOIN users u ON c.sales_id = u.id
       WHERE c.ctv_id = ? AND u.is_active = 1`;
    const params = [uid];
    if (groupId && Number.isFinite(groupId)) {
      sql += ` AND EXISTS (
        SELECT 1 FROM user_groups ug WHERE ug.user_id = u.id AND ug.group_id = ?
      )`;
      params.push(groupId);
    }
    sql += ` ORDER BY u.full_name`;
    const [rows] = await pool.query(sql, params);

    const includeRaw = req.query.include_user_ids;
    if (includeRaw && String(includeRaw).trim()) {
      const wantIds = String(includeRaw)
        .split(',')
        .map((s) => parseInt(s.trim(), 10))
        .filter((n) => Number.isFinite(n));
      const have = new Set(rows.map((r) => r.id));
      for (const extraId of wantIds) {
        if (have.has(extraId)) continue;
        const [pair] = await pool.query(
          'SELECT 1 FROM collaborators WHERE sales_id = ? AND ctv_id = ? LIMIT 1',
          [extraId, uid]
        );
        if (!pair.length) continue;
        const [urows] = await pool.query(
          'SELECT id, full_name, email, phone, commission_rate FROM users WHERE id = ? AND is_active = 1',
          [extraId]
        );
        if (urows.length) rows.push(urows[0]);
      }
      rows.sort((a, b) => String(a.full_name).localeCompare(String(b.full_name), 'vi'));
    }

    res.json({ data: rows });
  } catch (err) {
    next(err);
  }
});

// GET /api/collaborators/my-ctvs — Quản lý xem CTV của mình
router.get('/my-ctvs', auth, async (req, res, next) => {
  try {
    const pool = await getPool();
    const uid = req.user.id;
    const [rows] = await pool.query(
      `SELECT u.id, u.full_name, u.email, u.phone, u.commission_rate
       FROM collaborators c
       JOIN users u ON c.ctv_id = u.id
       WHERE c.sales_id = ? AND u.is_active = 1
       ORDER BY u.full_name`,
      [uid]
    );
    res.json({ data: rows });
  } catch (err) {
    next(err);
  }
});

// GET /api/collaborators - Lấy danh sách CTV theo sales hoặc tất cả
router.get('/', auth, authorize('admin'), async (req, res, next) => {
  try {
    const pool = await getPool();
    const { sales_id } = req.query;
    let where = 'WHERE 1=1';
    const params = [];
    if (sales_id) {
      where += ' AND c.sales_id = ?';
      params.push(sales_id);
    }
    const [rows] = await pool.query(
      `SELECT c.*, 
        s.full_name as sales_name, s.email as sales_email, s.commission_rate as sales_commission_rate,
        ctv.full_name as ctv_name, ctv.email as ctv_email, ctv.phone as ctv_phone
       FROM collaborators c
       JOIN users s ON c.sales_id = s.id
       JOIN users ctv ON c.ctv_id = ctv.id
       ${where}
       ORDER BY s.full_name, ctv.full_name`,
      params
    );
    const formatted = rows.map(r => ({
      ...r,
      sales_id: parseInt(r.sales_id),
      ctv_id: parseInt(r.ctv_id),
    }));
    res.json({ data: formatted });
  } catch (err) {
    next(err);
  }
});

// POST /api/collaborators - Gán CTV cho Sale
router.post('/', auth, authorize('admin'), async (req, res, next) => {
  try {
    const { sales_id, ctv_id } = req.body;
    if (!sales_id || !ctv_id) {
      return res.status(400).json({ message: 'Thiếu sales_id hoặc ctv_id' });
    }
    const pool = await getPool();

    // Validate: cả 2 phải là role sales
    const [users] = await pool.query(
      `SELECT u.id, r.scope_own_data, r.can_access_admin FROM users u
       JOIN roles r ON u.role_id = r.id
       WHERE u.id IN (?, ?) AND u.is_active = 1`,
      [sales_id, ctv_id]
    );
    if (users.length < 2) {
      return res.status(400).json({ message: 'Không tìm thấy nhân viên hoặc nhân viên không hoạt động' });
    }
    for (const u of users) {
      if (!u.scope_own_data || u.can_access_admin) {
        return res.status(400).json({ message: 'Chỉ gán được giữa nhân viên có phạm vi đơn hàng của mình (vai trò kiểu kinh doanh)' });
      }
    }

    const [result] = await pool.query(
      'INSERT IGNORE INTO collaborators (sales_id, ctv_id) VALUES (?, ?)',
      [sales_id, ctv_id]
    );
    if (result.affectedRows === 0) {
      return res.status(409).json({ message: 'CTV này đã được gán cho Sale' });
    }
    res.status(201).json({ sales_id: parseInt(sales_id), ctv_id: parseInt(ctv_id) });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/collaborators/:salesId/:ctvId - Bỏ gán CTV
router.delete('/:salesId/:ctvId', auth, authorize('admin'), async (req, res, next) => {
  try {
    const pool = await getPool();
    const [result] = await pool.query(
      'DELETE FROM collaborators WHERE sales_id = ? AND ctv_id = ?',
      [req.params.salesId, req.params.ctvId]
    );
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Không tìm thấy quan hệ CTV này' });
    }
    res.json({ message: 'Đã bỏ gán CTV' });
  } catch (err) {
    next(err);
  }
});

// GET /api/collaborators/available-ctvs - Lấy danh sách sales chưa được gán làm CTV cho sales_id nào đó
router.get('/available-ctvs', auth, authorize('admin'), async (req, res, next) => {
  try {
    const { sales_id } = req.query;
    if (!sales_id) {
      return res.status(400).json({ message: 'Thiếu sales_id' });
    }
    const pool = await getPool();
    const [rows] = await pool.query(
      `SELECT u.id, u.full_name, u.email, u.phone FROM users u
       JOIN roles r ON u.role_id = r.id
       WHERE r.scope_own_data = 1 AND r.can_access_admin = 0 AND u.is_active = 1 AND u.id != ?
       AND u.id NOT IN (SELECT ctv_id FROM collaborators WHERE sales_id = ?)
       ORDER BY u.full_name`,
      [sales_id, sales_id]
    );
    res.json({ data: rows });
  } catch (err) {
    next(err);
  }
});

// GET /api/collaborators/commissions - aggregated commissions across all employees
// Allow both Admin and Sales to view
router.get('/commissions/all', auth, async (req, res, next) => {
  try {
    const pool = await getPool();
    const { month, year, group_id, sales_id } = req.query;

    // filterParams: chỉ cho date/group (dùng trong JOIN ON và WHERE)
    const filterConds = [];
    const filterParams = [];
    if (month)    { filterConds.push('MONTH(o.created_at) = ?'); filterParams.push(parseInt(month)); }
    if (year)     { filterConds.push('YEAR(o.created_at) = ?');  filterParams.push(parseInt(year)); }
    if (group_id) { filterConds.push('o.group_id = ?');          filterParams.push(parseInt(group_id)); }
    const joinExtra  = filterConds.length ? ' AND ' + filterConds.join(' AND ') : '';
    const whereExtra = filterConds.length ? ' AND ' + filterConds.join(' AND ') : '';
    const salesFilter = sales_id ? ' AND cr.sales_id = ?' : '';
    const salesParam  = sales_id ? [parseInt(sales_id)] : [];

    // Tổng hợp: mỗi cặp Sales-CTV
    // Params: [...filterParams(JOIN ON), ...salesParam(WHERE)]
    const [pairs] = await pool.query(`
      SELECT
        sal.id as sales_id, sal.full_name as sales_name,
        ctv.id as ctv_id, ctv.full_name as ctv_name,
        ctv.commission_rate as ctv_rate,
        COALESCE(SUM(c.commission_amount), 0) as override_commission,
        COALESCE(COUNT(DISTINCT o.id), 0) as total_orders,
        COALESCE(SUM(o.total_amount), 0) as total_revenue
      FROM collaborators cr
      JOIN users sal ON cr.sales_id = sal.id
      JOIN users ctv ON cr.ctv_id = ctv.id
      LEFT JOIN orders o ON o.salesperson_id = ctv.id ${joinExtra}
      LEFT JOIN commissions c ON c.order_id = o.id
        AND c.user_id = sal.id AND c.type = 'override' AND c.ctv_user_id = ctv.id
      WHERE 1=1 ${salesFilter}
      GROUP BY sal.id, sal.full_name, ctv.id, ctv.full_name, ctv.commission_rate
      ORDER BY sal.full_name, override_commission DESC
    `, [...filterParams, ...salesParam]);

    // Chi tiết đơn
    // Params: [...filterParams(WHERE), ...salesParam(WHERE)]
    const [orders] = await pool.query(`
      SELECT
        sal.id as sales_id, sal.full_name as sales_name,
        ctv.id as ctv_id, ctv.full_name as ctv_name,
        o.id as order_id, o.code as order_code,
        o.created_at as order_date, o.total_amount, o.status,
        g.name as group_name, cu.name as customer_name,
        c.commission_amount as override_commission,
        c.override_rate as override_rate
      FROM collaborators cr
      JOIN users sal ON cr.sales_id = sal.id
      JOIN users ctv ON cr.ctv_id = ctv.id
      JOIN orders o ON o.salesperson_id = ctv.id
      JOIN commissions c ON c.order_id = o.id
        AND c.user_id = sal.id AND c.type = 'override' AND c.ctv_user_id = ctv.id
      LEFT JOIN groups g ON o.group_id = g.id
      LEFT JOIN customers cu ON o.customer_id = cu.id
      WHERE 1=1 ${whereExtra} ${salesFilter}
      ORDER BY sal.full_name, ctv.full_name, o.created_at DESC
    `, [...filterParams, ...salesParam]);

    res.json({
      data: {
        pairs: pairs.map(r => ({
          ...r,
          override_commission: parseFloat(r.override_commission) || 0,
          total_orders:  parseInt(r.total_orders) || 0,
          total_revenue: parseFloat(r.total_revenue) || 0,
        })),
        orders: orders.map(r => ({
          ...r,
          total_amount:        parseFloat(r.total_amount) || 0,
          override_commission: parseFloat(r.override_commission) || 0,
          override_rate:       r.override_rate != null ? parseFloat(r.override_rate) : null,
        })),
        totals: {
          total_override: pairs.reduce((s, r) => s + parseFloat(r.override_commission), 0),
          total_orders:   pairs.reduce((s, r) => s + parseInt(r.total_orders), 0),
        }
      }
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
