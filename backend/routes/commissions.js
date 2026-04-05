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
    const { month, year, page = 1, limit = 50 } = req.query;
    const offset = (page - 1) * limit;

    let whereClause = 'WHERE 1=1';
    const params = [];

    if (req.user.role === 'sales') {
      whereClause += ' AND c.user_id = ?';
      params.push(req.user.id);
    }

    if (month) {
      whereClause += ' AND MONTH(o.created_at) = ?';
      params.push(parseInt(month));
    }

    if (year) {
      whereClause += ' AND YEAR(o.created_at) = ?';
      params.push(parseInt(year));
    }

    const query = `
      SELECT c.id, c.commission_amount, c.type, c.ctv_user_id, ctv.full_name as ctv_name,
             o.id as order_id, o.code as order_code, o.total_amount, o.status, o.created_at as order_date
      FROM commissions c
      JOIN orders o ON c.order_id = o.id
      LEFT JOIN users ctv ON c.ctv_user_id = ctv.id
      ${whereClause}
      ORDER BY o.created_at DESC
      LIMIT ? OFFSET ?
    `;
    const countQuery = `
      SELECT COUNT(*) as total
      FROM commissions c
      JOIN orders o ON c.order_id = o.id
      ${whereClause}
    `;

    const [rows] = await pool.query(query, [...params, parseInt(limit), parseInt(offset)]);
    const [countRows] = await pool.query(countQuery, params);

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

module.exports = router;
