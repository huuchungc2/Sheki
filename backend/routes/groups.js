const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const requireShop = require('../middleware/requireShop');
const requirePermission = require('../middleware/requirePermission');
const { getPool } = require('../config/db');

// Get all groups
router.get('/', auth, requireShop, async (req, res, next) => {
  try {
    const pool = await getPool();
    const [rows] = await pool.query('SELECT * FROM groups WHERE shop_id = ? AND is_active = 1 ORDER BY name', [req.shopId]);
    res.json({ data: rows });
  } catch (err) { next(err); }
});

// Get groups for a user
router.get('/user/:userId', auth, requireShop, async (req, res, next) => {
  try {
    const pool = await getPool();
    const [rows] = await pool.query(
      'SELECT g.* FROM groups g JOIN user_groups ug ON g.id = ug.group_id WHERE g.shop_id = ? AND ug.user_id = ? ORDER BY g.name',
      [req.shopId, req.params.userId]
    );
    res.json({ data: rows });
  } catch (err) { next(err); }
});

// Create group
router.post('/', auth, requireShop, requirePermission('settings', 'edit'), async (req, res, next) => {
  try {
    const { name, description } = req.body;
    if (!name) return res.status(400).json({ error: 'Thiếu tên nhóm' });
    const pool = await getPool();
    const [result] = await pool.query('INSERT INTO groups (shop_id, name, description) VALUES (?, ?, ?)', [req.shopId, name, description || '']);
    res.status(201).json({ id: result.insertId, message: 'Tạo nhóm thành công' });
  } catch (err) { next(err); }
});

// Update group
router.put('/:id', auth, requireShop, requirePermission('settings', 'edit'), async (req, res, next) => {
  try {
    const { name, description, is_active } = req.body;
    const pool = await getPool();
    await pool.query('UPDATE groups SET name = ?, description = ?, is_active = ? WHERE id = ? AND shop_id = ?', [name, description, is_active, req.params.id, req.shopId]);
    res.json({ message: 'Cập nhật nhóm thành công' });
  } catch (err) { next(err); }
});

// Delete group
router.delete('/:id', auth, requireShop, requirePermission('settings', 'delete'), async (req, res, next) => {
  try {
    const pool = await getPool();
    await pool.query('UPDATE groups SET is_active = 0 WHERE id = ? AND shop_id = ?', [req.params.id, req.shopId]);
    res.json({ message: 'Vô hiệu hóa nhóm thành công' });
  } catch (err) { next(err); }
});

// Assign user to groups
router.put('/user/:userId', auth, requireShop, requirePermission('employees', 'edit'), async (req, res, next) => {
  try {
    const { group_ids } = req.body;
    const pool = await getPool();
    const sid = req.shopId;
    await pool.query(
      `DELETE ug FROM user_groups ug
       INNER JOIN groups g ON g.id = ug.group_id
       WHERE ug.user_id = ? AND g.shop_id = ?`,
      [req.params.userId, sid]
    );
    if (group_ids && group_ids.length > 0) {
      for (const groupId of group_ids) {
        const [[g]] = await pool.query('SELECT id FROM groups WHERE id = ? AND shop_id = ? LIMIT 1', [groupId, sid]);
        if (!g) continue;
        await pool.query('INSERT INTO user_groups (user_id, group_id) VALUES (?, ?)', [req.params.userId, groupId]);
      }
    }
    res.json({ message: 'Cập nhật nhóm cho nhân viên thành công' });
  } catch (err) { next(err); }
});

module.exports = router;
