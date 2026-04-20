const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const requireShop = require('../middleware/requireShop');
const authorize = require('../middleware/authorize');
const { getPool } = require('../config/db');

router.get('/', auth, requireShop, async (req, res, next) => {
  try {
    const pool = await getPool();
    const sid = req.shopId;
    // Self-heal: đảm bảo chỉ 1 kho default (nếu dữ liệu cũ bị lệch) — trong shop hiện tại
    await pool.query('START TRANSACTION');
    try {
      const [defaults] = await pool.query(
        'SELECT id FROM warehouses WHERE shop_id = ? AND is_active = 1 AND is_default = 1 ORDER BY id ASC',
        [sid]
      );
      if (defaults.length > 1) {
        const keepId = defaults[0].id;
        await pool.query('UPDATE warehouses SET is_default = 0 WHERE shop_id = ? AND is_active = 1 AND id <> ?', [sid, keepId]);
      }
      if (defaults.length === 0) {
        const [firstActive] = await pool.query(
          'SELECT id FROM warehouses WHERE shop_id = ? AND is_active = 1 ORDER BY (name = "Kho trung tâm") DESC, id ASC LIMIT 1',
          [sid]
        );
        if (firstActive.length) {
          await pool.query('UPDATE warehouses SET is_default = 1 WHERE id = ?', [firstActive[0].id]);
        }
      }
      await pool.query('COMMIT');
    } catch (e) {
      await pool.query('ROLLBACK');
      throw e;
    }

    const [rows] = await pool.query('SELECT * FROM warehouses WHERE shop_id = ? AND is_active = 1 ORDER BY is_default DESC, name', [sid]);
    res.json({ data: rows });
  } catch (err) {
    next(err);
  }
});

router.post('/', auth, requireShop, authorize('admin'), async (req, res, next) => {
  try {
    const { name, address, is_default } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Thiếu tên kho' });
    }

    const pool = await getPool();
    const sid = req.shopId;
    await pool.query('START TRANSACTION');
    try {
      if (is_default) {
        await pool.query('UPDATE warehouses SET is_default = 0 WHERE shop_id = ? AND is_active = 1', [sid]);
      }
      const [result] = await pool.query(
        'INSERT INTO warehouses (shop_id, name, address, is_default, is_active) VALUES (?, ?, ?, ?, 1)',
        [sid, name, address || null, is_default ? 1 : 0]
      );
      await pool.query('COMMIT');
      return res.status(201).json({ id: result.insertId, message: 'Tạo kho thành công' });
    } catch (e) {
      await pool.query('ROLLBACK');
      throw e;
    }

  } catch (err) {
    next(err);
  }
});

router.put('/:id', auth, requireShop, authorize('admin'), async (req, res, next) => {
  try {
    const { name, address, is_active, is_default } = req.body;

    const pool = await getPool();
    const sid = req.shopId;
    await pool.query('START TRANSACTION');
    try {
      const [before] = await pool.query('SELECT is_default, is_active FROM warehouses WHERE id = ? AND shop_id = ? LIMIT 1', [req.params.id, sid]);
      const wasDefault = !!before?.[0]?.is_default;

      if (is_default) {
        await pool.query('UPDATE warehouses SET is_default = 0 WHERE shop_id = ? AND is_active = 1', [sid]);
      }
      await pool.query(
        'UPDATE warehouses SET name = ?, address = ?, is_active = ?, is_default = ? WHERE id = ? AND shop_id = ?',
        [name, address || null, is_active, is_default ? 1 : 0, req.params.id, sid]
      );

      const isNowActive = parseInt(is_active) === 1;
      const isNowDefault = !!is_default;

      // Nếu tắt kho default hoặc bỏ default khỏi kho đang là default → tự chọn kho default khác
      if ((wasDefault && !isNowActive) || (wasDefault && isNowActive && !isNowDefault)) {
        const [nextDefault] = await pool.query(
          'SELECT id FROM warehouses WHERE shop_id = ? AND is_active = 1 AND id <> ? ORDER BY (name = "Kho trung tâm") DESC, id ASC LIMIT 1',
          [sid, req.params.id]
        );
        if (nextDefault.length) {
          await pool.query('UPDATE warehouses SET is_default = 1 WHERE id = ?', [nextDefault[0].id]);
        }
      }

      await pool.query('COMMIT');
    } catch (e) {
      await pool.query('ROLLBACK');
      throw e;
    }

    res.json({ message: 'Cập nhật kho thành công' });
  } catch (err) {
    next(err);
  }
});

router.delete('/:id', auth, requireShop, authorize('admin'), async (req, res, next) => {
  try {
    const pool = await getPool();
    const sid = req.shopId;
    await pool.query('START TRANSACTION');
    try {
      const [cur] = await pool.query('SELECT is_default FROM warehouses WHERE id = ? AND shop_id = ?', [req.params.id, sid]);
      const wasDefault = !!cur?.[0]?.is_default;

      await pool.query('UPDATE warehouses SET is_active = 0, is_default = 0 WHERE id = ? AND shop_id = ?', [req.params.id, sid]);

      if (wasDefault) {
        const [nextDefault] = await pool.query(
          'SELECT id FROM warehouses WHERE shop_id = ? AND is_active = 1 ORDER BY id ASC LIMIT 1',
          [sid]
        );
        if (nextDefault.length) {
          await pool.query('UPDATE warehouses SET is_default = 1 WHERE id = ?', [nextDefault[0].id]);
        }
      }

      await pool.query('COMMIT');
    } catch (e) {
      await pool.query('ROLLBACK');
      throw e;
    }
    res.json({ message: 'Vô hiệu hóa kho thành công' });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
