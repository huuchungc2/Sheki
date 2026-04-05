const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const authorize = require('../middleware/authorize');
const { getPool } = require('../config/db');

router.get('/', auth, async (req, res, next) => {
  try {
    const pool = await getPool();
    const [rows] = await pool.query(
      'SELECT * FROM warehouses WHERE is_active = 1 ORDER BY name'
    );
    res.json({ data: rows });
  } catch (err) {
    next(err);
  }
});

router.post('/', auth, authorize('admin'), async (req, res, next) => {
  try {
    const { name, address } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Thiếu tên kho' });
    }

    const pool = await getPool();
    const [result] = await pool.query(
      'INSERT INTO warehouses (name, address, is_active) VALUES (?, ?, 1)',
      [name, address]
    );

    res.status(201).json({ id: result.insertId, message: 'Tạo kho thành công' });
  } catch (err) {
    next(err);
  }
});

router.put('/:id', auth, authorize('admin'), async (req, res, next) => {
  try {
    const { name, address, is_active } = req.body;

    const pool = await getPool();
    await pool.query(
      'UPDATE warehouses SET name = ?, address = ?, is_active = ? WHERE id = ?',
      [name, address, is_active, req.params.id]
    );

    res.json({ message: 'Cập nhật kho thành công' });
  } catch (err) {
    next(err);
  }
});

router.delete('/:id', auth, authorize('admin'), async (req, res, next) => {
  try {
    const pool = await getPool();
    await pool.query('UPDATE warehouses SET is_active = 0 WHERE id = ?', [req.params.id]);
    res.json({ message: 'Vô hiệu hóa kho thành công' });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
