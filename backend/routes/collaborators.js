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

    // Filter theo kỳ phát sinh dòng HH/điều chỉnh (created_at của commission/adjustment)
    // để hoàn hàng (commission_adjustments) nằm đúng kỳ duyệt hoàn.
    const txFilterConds = [];
    const txFilterParams = [];
    if (month) { txFilterConds.push('MONTH(t.entry_date) = ?'); txFilterParams.push(parseInt(month)); }
    if (year)  { txFilterConds.push('YEAR(t.entry_date) = ?');  txFilterParams.push(parseInt(year)); }
    const txWhereExtra = txFilterConds.length ? ' AND ' + txFilterConds.join(' AND ') : '';

    const orderFilterConds = [];
    const orderFilterParams = [];
    if (group_id) { orderFilterConds.push('o.group_id = ?'); orderFilterParams.push(parseInt(group_id)); }
    const orderWhereExtra = orderFilterConds.length ? ' AND ' + orderFilterConds.join(' AND ') : '';

    // IMPORTANT: group filter must constrain transactions (t) too.
    // If we only filter the joined `orders o` in an ON clause, SUM(t.amount) still includes out-of-group rows.
    const txJoinOrders = orderFilterConds.length ? ' JOIN orders o_tx ON o_tx.id = t.order_id' : '';
    const txOrderWhereExtra = orderFilterConds.length ? ' AND o_tx.group_id = ?' : '';
    const salesFilter = sales_id ? ' AND cr.sales_id = ?' : '';
    const salesParam  = sales_id ? [parseInt(sales_id)] : [];

    const txFrom = `
      FROM (
        SELECT id AS tx_id, order_id, NULL AS return_id, user_id, type, ctv_user_id, commission_amount AS amount, created_at AS entry_date, 'commission' AS entry_kind
        FROM commissions
        UNION ALL
        SELECT id AS tx_id, order_id, return_id, user_id, type, ctv_user_id, amount, created_at AS entry_date, 'adjustment' AS entry_kind
        FROM commission_adjustments
      ) t
    `;

    // Tổng hợp: mỗi cặp Sales-CTV
    // total_orders: số giao dịch HH (đơn bán + đơn hoàn), tức đếm cả commissions + commission_adjustments.
    // total_revenue: tổng doanh thu theo đơn (không nhân đôi theo số dòng HH).
    // Params: [...txFilterParams, ...orderFilterParams, ...salesParam]
    const [pairs] = await pool.query(`
      SELECT
        sal.id as sales_id, sal.full_name as sales_name,
        ctv.id as ctv_id, ctv.full_name as ctv_name,
        ctv.commission_rate as ctv_rate,
        COALESCE(SUM(t.amount), 0) as override_commission,
        -- Số đơn: chỉ đếm giao dịch bán (commission), không cộng đơn hoàn (adjustment)
        COALESCE(COUNT(DISTINCT CASE WHEN t.entry_kind = 'commission' THEN t.order_id END), 0) as total_orders,
        COALESCE(SUM(DISTINCT o.total_amount), 0) as total_revenue
      FROM collaborators cr
      JOIN users sal ON cr.sales_id = sal.id
      JOIN users ctv ON cr.ctv_id = ctv.id
      LEFT JOIN (
        SELECT t.tx_id, t.order_id, t.user_id, t.type, t.ctv_user_id, t.amount, t.entry_date, t.entry_kind
        ${txFrom}
        ${txJoinOrders}
        WHERE 1=1 ${txWhereExtra}${txOrderWhereExtra}
      ) t ON t.user_id = sal.id AND t.type = 'override' AND t.ctv_user_id = ctv.id
      LEFT JOIN orders o ON o.id = t.order_id AND o.salesperson_id = ctv.id ${orderWhereExtra}
      WHERE 1=1 ${salesFilter}
      GROUP BY sal.id, sal.full_name, ctv.id, ctv.full_name, ctv.commission_rate
      ORDER BY sal.full_name, override_commission DESC
    `, [
      ...txFilterParams,
      // txOrderWhereExtra (if any)
      ...(orderFilterParams.length ? orderFilterParams : []),
      // orderWhereExtra (if any)
      ...(orderFilterParams.length ? orderFilterParams : []),
      ...salesParam,
    ]);

    // Chi tiết đơn
    // Trả theo từng giao dịch HH (commission/adjustment) để “Số đơn” khớp (đơn hoàn = 1 dòng riêng).
    // Params: [...txFilterParams, ...orderFilterParams, ...salesParam]
    const [orders] = await pool.query(`
      SELECT
        sal.id as sales_id, sal.full_name as sales_name,
        ctv.id as ctv_id, ctv.full_name as ctv_name,
        t.tx_id,
        o.id as order_id, o.code as order_code,
        t.entry_date as order_date, o.total_amount, o.status,
        g.name as group_name, cu.name as customer_name,
        t.amount as override_commission,
        CASE
          WHEN t.entry_kind = 'adjustment' THEN adj_rates.override_rate
          ELSE c.override_rate
        END as override_rate,
        t.entry_kind
      FROM collaborators cr
      JOIN users sal ON cr.sales_id = sal.id
      JOIN users ctv ON cr.ctv_id = ctv.id
      JOIN (
        SELECT t.tx_id, t.order_id, t.return_id, t.user_id, t.type, t.ctv_user_id, t.amount, t.entry_date, t.entry_kind
        ${txFrom}
        WHERE 1=1 ${txWhereExtra}
      ) t ON t.user_id = sal.id AND t.type = 'override' AND t.ctv_user_id = ctv.id
      JOIN orders o ON o.id = t.order_id AND o.salesperson_id = ctv.id ${orderWhereExtra}
      LEFT JOIN commissions c ON c.order_id = o.id AND c.user_id = sal.id AND c.type = 'override' AND c.ctv_user_id = ctv.id
      LEFT JOIN (
        SELECT
          ca.id AS tx_id,
          CASE WHEN COUNT(DISTINCT r1.override_rate) = 1 THEN MAX(r1.override_rate) ELSE NULL END AS override_rate
        FROM commission_adjustments ca
        JOIN returns r ON r.id = ca.return_id
        JOIN return_items ri ON ri.return_id = r.id
        JOIN order_items oi ON oi.order_id = ca.order_id AND oi.product_id = ri.product_id
        LEFT JOIN (
          SELECT
            oi2.order_id,
            oi2.product_id,
            (
              SELECT ct.sales_override_rate
              FROM commission_tiers ct
              WHERE ct.ctv_rate_min <= oi2.commission_rate
                AND (ct.ctv_rate_max IS NULL OR ct.ctv_rate_max >= oi2.commission_rate)
              ORDER BY ct.ctv_rate_min DESC
              LIMIT 1
            ) AS override_rate
          FROM order_items oi2
        ) r1 ON r1.order_id = oi.order_id AND r1.product_id = oi.product_id
        GROUP BY ca.id
      ) adj_rates ON adj_rates.tx_id = t.tx_id
      LEFT JOIN groups g ON o.group_id = g.id
      LEFT JOIN customers cu ON o.customer_id = cu.id
      WHERE 1=1 ${salesFilter}
      ORDER BY sal.full_name, ctv.full_name, t.entry_date DESC
    `, [...txFilterParams, ...orderFilterParams, ...salesParam]);

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
