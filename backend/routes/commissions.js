const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const authorize = require('../middleware/authorize');
const { getPool } = require('../config/db');

router.get('/', auth, async (req, res, next) => {
  try {
    const pool = await getPool();
    const { user_id, month, year, page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

    let query = `
      SELECT c.*, c.type, c.ctv_user_id, o.code as order_code, o.status, o.total_amount, u.full_name as salesperson_name, ctv.full_name as ctv_name
      FROM commissions c
      JOIN orders o ON c.order_id = o.id
      JOIN users u ON c.user_id = u.id
      LEFT JOIN users ctv ON c.ctv_user_id = ctv.id
      WHERE 1=1
    `;
    let countQuery = 'SELECT COUNT(*) as total FROM commissions c JOIN orders o ON c.order_id = o.id WHERE 1=1';
    const params = [];

    if (req.user.role === 'sales') {
      query += ' AND c.user_id = ?';
      countQuery += ' AND c.user_id = ?';
      params.push(req.user.id);
    } else if (user_id) {
      query += ' AND c.user_id = ?';
      countQuery += ' AND c.user_id = ?';
      params.push(user_id);
    }

    if (month) {
      query += ' AND MONTH(c.created_at) = ?';
      countQuery += ' AND MONTH(c.created_at) = ?';
      params.push(parseInt(month));
    }

    if (year) {
      query += ' AND YEAR(c.created_at) = ?';
      countQuery += ' AND YEAR(c.created_at) = ?';
      params.push(parseInt(year));
    }

    query += ' ORDER BY c.created_at DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), parseInt(offset));

    const [rows] = await pool.query(query, params);
    const [countRows] = await pool.query(countQuery, params.slice(0, -2));

    const formattedRows = rows.map(row => ({
      ...row,
      commission_amount: parseFloat(row.commission_amount) || 0,
      total_amount: parseFloat(row.total_amount) || 0,
    }));

    res.json({ data: formattedRows, total: countRows[0].total, page: parseInt(page), limit: parseInt(limit) });
  } catch (err) {
    next(err);
  }
});

router.get('/summary', auth, async (req, res, next) => {
  try {
    const pool = await getPool();
    const { month, year } = req.query;

    let whereClause = 'WHERE 1=1';
    const params = [];

    if (req.user.role === 'sales') {
      whereClause += ' AND c.user_id = ?';
      params.push(req.user.id);
    }

    if (month) {
      whereClause += ' AND MONTH(c.created_at) = ?';
      params.push(parseInt(month));
    }

    if (year) {
      whereClause += ' AND YEAR(c.created_at) = ?';
      params.push(parseInt(year));
    }

    const [summary] = await pool.query(
      `SELECT
        COUNT(*) as total_orders,
        SUM(c.commission_amount) as total_commission,
        AVG(c.commission_amount) as avg_commission
       FROM commissions c
       ${whereClause}`,
      params
    );

    res.json({ data: summary[0] });
  } catch (err) {
    next(err);
  }
});

router.get('/orders', auth, async (req, res, next) => {
  try {
    const pool = await getPool();
    const { month, year, group_id, page = 1, limit = 20 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    // Build WHERE + params — dùng chung cho tất cả queries
    const conditions = ['1=1'];
    const baseParams = [];

    if (req.user.role === 'sales') {
      // Sales chỉ thấy đơn mình tự bán (direct), KHÔNG thấy override từ CTV
      // (override hiển thị riêng ở màn hình "Hoa hồng từ CTV")
      conditions.push('c.user_id = ?');
      conditions.push("c.type = 'direct'");
      baseParams.push(req.user.id);
    }
    if (month)    { conditions.push('MONTH(o.created_at) = ?'); baseParams.push(parseInt(month)); }
    if (year)     { conditions.push('YEAR(o.created_at) = ?');  baseParams.push(parseInt(year)); }
    if (group_id) { conditions.push('o.group_id = ?');          baseParams.push(parseInt(group_id)); }

    const whereClause = 'WHERE ' + conditions.join(' AND ');

    const [rows] = await pool.query(`
      SELECT
        c.id, c.commission_amount, c.type, c.ctv_user_id,
        ctv.full_name as ctv_name,
        o.id as order_id, o.code as order_code,
        o.total_amount, o.status, o.created_at as order_date,
        o.group_id, g.name as group_name,
        cu.name as customer_name
      FROM commissions c
      JOIN orders o ON c.order_id = o.id
      LEFT JOIN users ctv ON c.ctv_user_id = ctv.id
      LEFT JOIN groups g ON o.group_id = g.id
      LEFT JOIN customers cu ON o.customer_id = cu.id
      ${whereClause}
      ORDER BY o.created_at DESC
      LIMIT ? OFFSET ?
    `, [...baseParams, parseInt(limit), offset]);

    const [countRows] = await pool.query(`
      SELECT COUNT(*) as total
      FROM commissions c
      JOIN orders o ON c.order_id = o.id
      ${whereClause}
    `, baseParams);

    const [summaryRows] = await pool.query(`
      SELECT
        COALESCE(SUM(CASE WHEN c.type = 'direct'   THEN c.commission_amount ELSE 0 END), 0) as direct_commission,
        COALESCE(SUM(CASE WHEN c.type = 'override' THEN c.commission_amount ELSE 0 END), 0) as override_commission,
        COALESCE(SUM(c.commission_amount), 0) as total_commission,
        COUNT(DISTINCT CASE WHEN c.type = 'direct' THEN c.order_id END) as total_orders
      FROM commissions c
      JOIN orders o ON c.order_id = o.id
      ${whereClause}
    `, baseParams);

    const s = summaryRows[0];
    res.json({
      data: rows.map(row => ({
        ...row,
        commission_amount: parseFloat(row.commission_amount) || 0,
        total_amount:      parseFloat(row.total_amount) || 0,
      })),
      total:   countRows[0].total,
      page:    parseInt(page),
      limit:   parseInt(limit),
      summary: {
        direct_commission:   parseFloat(s.direct_commission)   || 0,
        override_commission: parseFloat(s.override_commission) || 0,
        total_commission:    parseFloat(s.total_commission)    || 0,
        total_orders:        parseInt(s.total_orders)          || 0,
      }
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
