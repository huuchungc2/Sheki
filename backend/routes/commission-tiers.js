const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const authorize = require('../middleware/authorize');
const { getPool } = require('../config/db');

// GET /api/commission-tiers - Lấy tất cả tiers
router.get('/', auth, authorize('admin'), async (req, res, next) => {
  try {
    const pool = await getPool();
    const [rows] = await pool.query('SELECT * FROM commission_tiers ORDER BY ctv_rate_min DESC');
    const formatted = rows.map(r => ({
      ...r,
      ctv_rate_min: parseFloat(r.ctv_rate_min),
      ctv_rate_max: r.ctv_rate_max ? parseFloat(r.ctv_rate_max) : null,
      sales_override_rate: parseFloat(r.sales_override_rate),
    }));
    res.json({ data: formatted });
  } catch (err) {
    next(err);
  }
});

// POST /api/commission-tiers - Tạo tier mới
router.post('/', auth, authorize('admin'), async (req, res, next) => {
  try {
    const { ctv_rate_min, ctv_rate_max, sales_override_rate, note } = req.body;
    if (ctv_rate_min == null || sales_override_rate == null) {
      return res.status(400).json({ message: 'Thiếu ctv_rate_min hoặc sales_override_rate' });
    }
    const pool = await getPool();
    const [result] = await pool.query(
      'INSERT INTO commission_tiers (ctv_rate_min, ctv_rate_max, sales_override_rate, note) VALUES (?, ?, ?, ?)',
      [ctv_rate_min, ctv_rate_max || null, sales_override_rate, note || null]
    );
    res.status(201).json({ id: result.insertId, ctv_rate_min, ctv_rate_max: ctv_rate_max || null, sales_override_rate, note: note || null });
  } catch (err) {
    next(err);
  }
});

// PUT /api/commission-tiers/:id - Cập nhật tier
router.put('/:id', auth, authorize('admin'), async (req, res, next) => {
  try {
    const { ctv_rate_min, ctv_rate_max, sales_override_rate, note } = req.body;
    const pool = await getPool();
    const [result] = await pool.query(
      'UPDATE commission_tiers SET ctv_rate_min = ?, ctv_rate_max = ?, sales_override_rate = ?, note = ? WHERE id = ?',
      [ctv_rate_min, ctv_rate_max || null, sales_override_rate, note || null, req.params.id]
    );
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Không tìm thấy tier' });
    }
    res.json({ id: parseInt(req.params.id), ctv_rate_min, ctv_rate_max: ctv_rate_max || null, sales_override_rate, note: note || null });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/commission-tiers/:id - Xóa tier
router.delete('/:id', auth, authorize('admin'), async (req, res, next) => {
  try {
    const pool = await getPool();
    const [result] = await pool.query('DELETE FROM commission_tiers WHERE id = ?', [req.params.id]);
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Không tìm thấy tier' });
    }
    res.json({ message: 'Đã xóa tier' });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
