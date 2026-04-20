const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const requireShop = require('../middleware/requireShop');
const authorize = require('../middleware/authorize');
const { getPool } = require('../config/db');

router.get('/', auth, requireShop, async (req, res, next) => {
  try {
    const pool = await getPool();
    const wantAll = String(req.query.all || '') === '1' || String(req.query.include_inactive || '') === '1';
    const isAdmin = req.user?.can_access_admin === true || req.user?.role === 'admin';
    const canSeeAll = wantAll && isAdmin;
    const [rows] = await pool.query(
      `SELECT id, name, parent_id, is_active
       FROM categories
       WHERE shop_id = ? ${canSeeAll ? '' : 'AND is_active = 1'}
       ORDER BY name`,
      [req.shopId],
    );
    res.json({ data: rows });
  } catch (err) {
    next(err);
  }
});

router.post('/', auth, requireShop, authorize('admin'), async (req, res, next) => {
  try {
    const { name, parent_id } = req.body;
    if (!name) return res.status(400).json({ error: 'Thiếu tên danh mục' });
    const pool = await getPool();
    const [result] = await pool.query('INSERT INTO categories (shop_id, name, parent_id) VALUES (?, ?, ?)', [req.shopId, name, parent_id || null]);
    res.status(201).json({ id: result.insertId, message: 'Tạo danh mục thành công' });
  } catch (err) { next(err); }
});

router.put('/:id', auth, requireShop, authorize('admin'), async (req, res, next) => {
  try {
    const { name, parent_id, is_active } = req.body;
    const pool = await getPool();
    const [existing] = await pool.query('SELECT id FROM categories WHERE id = ? AND shop_id = ?', [req.params.id, req.shopId]);
    if (existing.length === 0) return res.status(404).json({ error: 'Không tìm thấy danh mục' });
    if (!name) return res.status(400).json({ error: 'Thiếu tên danh mục' });
    const activeVal = is_active === undefined ? 1 : (is_active ? 1 : 0);
    await pool.query(
      'UPDATE categories SET name = ?, parent_id = ?, is_active = ? WHERE id = ? AND shop_id = ?',
      [name, parent_id || null, activeVal, req.params.id, req.shopId]
    );
    res.json({ message: 'Cập nhật danh mục thành công' });
  } catch (err) { next(err); }
});

router.delete('/:id', auth, requireShop, authorize('admin'), async (req, res, next) => {
  try {
    const pool = await getPool();
    const [existing] = await pool.query('SELECT id FROM categories WHERE id = ? AND shop_id = ?', [req.params.id, req.shopId]);
    if (existing.length === 0) return res.status(404).json({ error: 'Không tìm thấy danh mục' });
    // Soft delete (ẩn)
    await pool.query('UPDATE categories SET is_active = 0 WHERE id = ? AND shop_id = ?', [req.params.id, req.shopId]);
    res.json({ message: 'Ẩn danh mục thành công' });
  } catch (err) { next(err); }
});

module.exports = router;
