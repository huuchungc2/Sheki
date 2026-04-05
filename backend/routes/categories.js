const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const authorize = require('../middleware/authorize');
const { getPool } = require('../config/db');

router.get('/', auth, async (req, res, next) => {
  try {
    const pool = await getPool();
    const [rows] = await pool.query('SELECT id, name, is_active FROM categories WHERE is_active = 1 ORDER BY name');
    res.json({ data: rows });
  } catch (err) {
    next(err);
  }
});

router.post('/', auth, authorize('admin'), async (req, res, next) => {
  try {
    const { name, parent_id } = req.body;
    if (!name) return res.status(400).json({ error: 'Thiếu tên danh mục' });
    const pool = await getPool();
    const [result] = await pool.query('INSERT INTO categories (name, parent_id) VALUES (?, ?)', [name, parent_id || null]);
    res.status(201).json({ id: result.insertId, message: 'Tạo danh mục thành công' });
  } catch (err) { next(err); }
});

router.put('/:id', auth, authorize('admin'), async (req, res, next) => {
  try {
    const { name, parent_id, is_active } = req.body;
    const pool = await getPool();
    const [existing] = await pool.query('SELECT id FROM categories WHERE id = ?', [req.params.id]);
    if (existing.length === 0) return res.status(404).json({ error: 'Không tìm thấy danh mục' });
    await pool.query('UPDATE categories SET name = ?, parent_id = ?, is_active = ? WHERE id = ?', [name, parent_id, is_active, req.params.id]);
    res.json({ message: 'Cập nhật danh mục thành công' });
  } catch (err) { next(err); }
});

module.exports = router;
