const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const authorize = require('../middleware/authorize');
const { getPool } = require('../config/db');

router.get('/', auth, async (req, res, next) => {
  try {
    const pool = await getPool();
    // Self-heal: đảm bảo chỉ 1 kho default (nếu dữ liệu cũ bị lệch)
    await pool.query('START TRANSACTION');
    try {
      const [defaults] = await pool.query(
        'SELECT id FROM warehouses WHERE is_active = 1 AND is_default = 1 ORDER BY id ASC'
      );
      if (defaults.length > 1) {
        const keepId = defaults[0].id;
        await pool.query('UPDATE warehouses SET is_default = 0 WHERE is_active = 1 AND id <> ?', [keepId]);
      }
      if (defaults.length === 0) {
        const [firstActive] = await pool.query(
          'SELECT id FROM warehouses WHERE is_active = 1 ORDER BY (name = "Kho trung tâm") DESC, id ASC LIMIT 1'
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

    const [rows] = await pool.query('SELECT * FROM warehouses WHERE is_active = 1 ORDER BY is_default DESC, name');
    res.json({ data: rows });
  } catch (err) {
    next(err);
  }
});

router.post('/', auth, authorize('admin'), async (req, res, next) => {
  try {
    const { name, address, is_default } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Thiếu tên kho' });
    }

    const pool = await getPool();
    await pool.query('START TRANSACTION');
    try {
      if (is_default) {
        await pool.query('UPDATE warehouses SET is_default = 0 WHERE is_active = 1');
      }
      const [result] = await pool.query(
        'INSERT INTO warehouses (name, address, is_default, is_active) VALUES (?, ?, ?, 1)',
        [name, address || null, is_default ? 1 : 0]
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

router.put('/:id', auth, authorize('admin'), async (req, res, next) => {
  try {
    const { name, address, is_active, is_default } = req.body;

    const pool = await getPool();
    await pool.query('START TRANSACTION');
    try {
      const [before] = await pool.query('SELECT is_default, is_active FROM warehouses WHERE id = ? LIMIT 1', [req.params.id]);
      const wasDefault = !!before?.[0]?.is_default;

      if (is_default) {
        await pool.query('UPDATE warehouses SET is_default = 0 WHERE is_active = 1');
      }
      await pool.query(
        'UPDATE warehouses SET name = ?, address = ?, is_active = ?, is_default = ? WHERE id = ?',
        [name, address || null, is_active, is_default ? 1 : 0, req.params.id]
      );

      const isNowActive = parseInt(is_active) === 1;
      const isNowDefault = !!is_default;

      // Nếu tắt kho default hoặc bỏ default khỏi kho đang là default → tự chọn kho default khác
      if ((wasDefault && !isNowActive) || (wasDefault && isNowActive && !isNowDefault)) {
        const [nextDefault] = await pool.query(
          'SELECT id FROM warehouses WHERE is_active = 1 AND id <> ? ORDER BY (name = "Kho trung tâm") DESC, id ASC LIMIT 1',
          [req.params.id]
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

router.delete('/:id', auth, authorize('admin'), async (req, res, next) => {
  try {
    const pool = await getPool();
    await pool.query('START TRANSACTION');
    try {
      const [cur] = await pool.query('SELECT is_default FROM warehouses WHERE id = ?', [req.params.id]);
      const wasDefault = !!cur?.[0]?.is_default;

      await pool.query('UPDATE warehouses SET is_active = 0, is_default = 0 WHERE id = ?', [req.params.id]);

      if (wasDefault) {
        const [nextDefault] = await pool.query(
          'SELECT id FROM warehouses WHERE is_active = 1 ORDER BY id ASC LIMIT 1'
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
