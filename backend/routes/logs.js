const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const authorize = require('../middleware/authorize');
const { getPool } = require('../config/db');

router.get('/', auth, authorize('admin'), async (req, res, next) => {
  try {
    const pool = await getPool();
    const { search, module, status, page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

    let query = 'SELECT * FROM activity_logs WHERE 1=1';
    let countQuery = 'SELECT COUNT(*) as total FROM activity_logs WHERE 1=1';
    const params = [];

    if (search) {
      query += ' AND (user_name LIKE ? OR target_name LIKE ? OR module LIKE ?)';
      countQuery += ' AND (user_name LIKE ? OR target_name LIKE ? OR module LIKE ?)';
      const like = `%${search}%`;
      params.push(like, like, like);
    }

    if (module) {
      query += ' AND module = ?';
      countQuery += ' AND module = ?';
      params.push(module);
    }

    if (status) {
      query += ' AND status = ?';
      countQuery += ' AND status = ?';
      params.push(status);
    }

    query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), parseInt(offset));

    const [rows] = await pool.query(query, params);
    const [countRows] = await pool.query(countQuery, params.slice(0, -2));

    res.json({ data: rows, total: countRows[0].total, page: parseInt(page), limit: parseInt(limit) });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
