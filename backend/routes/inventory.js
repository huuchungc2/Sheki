const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const authorize = require('../middleware/authorize');
const { getPool } = require('../config/db');

router.get('/', auth, async (req, res, next) => {
  try {
    const pool = await getPool();
    const { search, type, status, page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

    let query = `
      SELECT sm.*, w.name as warehouse_name, u.full_name as staff_name, p.name as product_name, p.sku
      FROM stock_movements sm
      LEFT JOIN warehouses w ON sm.warehouse_id = w.id
      LEFT JOIN users u ON sm.created_by = u.id
      LEFT JOIN products p ON sm.product_id = p.id
      WHERE 1=1
    `;
    let countQuery = 'SELECT COUNT(*) as total FROM stock_movements WHERE 1=1';
    const params = [];

    if (search) {
      query += ' AND (sm.reason LIKE ? OR u.full_name LIKE ?)';
      countQuery += ' AND (sm.reason LIKE ? OR u.full_name LIKE ?)';
      const like = `%${search}%`;
      params.push(like, like);
    }

    if (type) {
      query += ' AND sm.type = ?';
      countQuery += ' AND sm.type = ?';
      params.push(type);
    }

    if (status) {
      query += ' AND sm.status = ?';
      countQuery += ' AND sm.status = ?';
      params.push(status);
    }

    query += ' ORDER BY sm.created_at DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), parseInt(offset));

    const [rows] = await pool.query(query, params);
    const [countRows] = await pool.query(countQuery, params.slice(0, -2));

    res.json({ data: rows, total: countRows[0].total, page: parseInt(page), limit: parseInt(limit) });
  } catch (err) {
    next(err);
  }
});

router.post('/import', auth, authorize('admin'), async (req, res, next) => {
  try {
    const { warehouse_id, items, reason, status } = req.body;

    if (!warehouse_id || !items || items.length === 0) {
      return res.status(400).json({ error: 'Thiếu thông tin bắt buộc' });
    }

    const pool = await getPool();

    for (const item of items) {
      const qty = parseFloat(item.qty);
      const price = parseFloat(item.price);
      const totalValue = qty * price;

      await pool.query(
        'INSERT INTO stock_movements (warehouse_id, product_id, type, qty, reason, status, total_value, created_by) VALUES (?, ?, "import", ?, ?, ?, ?, ?)',
        [warehouse_id, item.product_id, qty, reason || 'Nhập kho', status || 'completed', totalValue, req.user.id]
      );

      if (status === 'completed' || !status) {
        await pool.query(
          'UPDATE products SET stock_qty = stock_qty + ? WHERE id = ?',
          [qty, item.product_id]
        );
      }
    }

    res.status(201).json({ message: 'Nhập kho thành công' });
  } catch (err) {
    next(err);
  }
});

router.post('/export', auth, authorize('admin'), async (req, res, next) => {
  try {
    const { warehouse_id, items, reason, status } = req.body;

    if (!warehouse_id || !items || items.length === 0) {
      return res.status(400).json({ error: 'Thiếu thông tin bắt buộc' });
    }

    const pool = await getPool();

    for (const item of items) {
      const qty = parseFloat(item.qty);
      const price = parseFloat(item.price);
      const totalValue = qty * price;

      const [product] = await pool.query('SELECT stock_qty FROM products WHERE id = ?', [item.product_id]);
      if (product.length === 0) {
        return res.status(404).json({ error: `Không tìm thấy sản phẩm ID: ${item.product_id}` });
      }
      if (product[0].stock_qty < qty) {
        return res.status(400).json({ error: `Số lượng tồn không đủ cho sản phẩm ${item.product_id}` });
      }

      await pool.query(
        'INSERT INTO stock_movements (warehouse_id, product_id, type, qty, reason, status, total_value, created_by) VALUES (?, ?, "export", ?, ?, ?, ?, ?)',
        [warehouse_id, item.product_id, -qty, reason || 'Xuất kho', status || 'completed', totalValue, req.user.id]
      );

      if (status === 'completed' || !status) {
        await pool.query(
          'UPDATE products SET stock_qty = stock_qty - ? WHERE id = ?',
          [qty, item.product_id]
        );
      }
    }

    res.status(201).json({ message: 'Xuất kho thành công' });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
