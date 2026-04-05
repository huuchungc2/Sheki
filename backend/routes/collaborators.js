const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const authorize = require('../middleware/authorize');
const { getPool } = require('../config/db');

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
        s.full_name as sales_name, s.email as sales_email,
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
    const [users] = await pool.query('SELECT id, role FROM users WHERE id IN (?, ?) AND is_active = 1', [sales_id, ctv_id]);
    if (users.length < 2) {
      return res.status(400).json({ message: 'Không tìm thấy nhân viên hoặc nhân viên không hoạt động' });
    }
    for (const u of users) {
      if (u.role !== 'sales') {
        return res.status(400).json({ message: 'Chỉ có thể gán nhân viên role sales' });
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
      `SELECT id, full_name, email, phone FROM users 
       WHERE role = 'sales' AND is_active = 1 AND id != ?
       AND id NOT IN (SELECT ctv_id FROM collaborators WHERE sales_id = ?)
       ORDER BY full_name`,
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
    const [rows] = await pool.query(`
      SELECT uc.collaborator_id, u.full_name as collaborator_name, COALESCE(SUM(c.commission_amount), 0) as total_commission,
             COALESCE(COUNT(DISTINCT c.order_id), 0) as total_orders, COALESCE(SUM(o.total_amount), 0) as total_revenue
      FROM user_collaborators uc
      LEFT JOIN commissions c ON c.user_id = uc.collaborator_id
      LEFT JOIN users u ON uc.collaborator_id = u.id
      LEFT JOIN orders o ON o.id = c.order_id
      GROUP BY uc.collaborator_id, u.full_name
      ORDER BY total_commission DESC
    `);
    res.json({ data: rows });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
