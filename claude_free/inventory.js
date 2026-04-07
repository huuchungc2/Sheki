const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const authorize = require('../middleware/authorize');
const { getPool } = require('../config/db');
const { recalculateStock } = require('../services/orderService');

// GET: Lịch sử nhập/xuất kho
router.get('/', auth, async (req, res, next) => {
  try {
    const pool = await getPool();
    const { search, type, status, warehouse_id, page = 1, limit = 20 } = req.query;
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
      query += ' AND (sm.reason LIKE ? OR u.full_name LIKE ? OR p.name LIKE ?)';
      countQuery += ' AND (sm.reason LIKE ? OR sm.reason LIKE ? OR sm.reason LIKE ?)';
      const like = `%${search}%`;
      params.push(like, like, like);
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

    if (warehouse_id) {
      query += ' AND sm.warehouse_id = ?';
      countQuery += ' AND sm.warehouse_id = ?';
      params.push(warehouse_id);
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

// GET: Tồn kho theo kho — dùng cho OrderForm khi chọn kho
router.get('/stock-by-warehouse', auth, async (req, res, next) => {
  try {
    const pool = await getPool();
    const { warehouse_id, product_id } = req.query;

    if (!warehouse_id) {
      return res.status(400).json({ error: 'Thiếu warehouse_id' });
    }

    let query = `
      SELECT ws.*, p.name as product_name, p.sku, p.unit, p.price
      FROM warehouse_stock ws
      JOIN products p ON ws.product_id = p.id
      WHERE ws.warehouse_id = ? AND p.is_active = 1
    `;
    const params = [warehouse_id];

    if (product_id) {
      query += ' AND ws.product_id = ?';
      params.push(product_id);
    }

    const [rows] = await pool.query(query, params);
    res.json({ data: rows });
  } catch (err) {
    next(err);
  }
});

// POST: Nhập kho
router.post('/import', auth, authorize('admin'), async (req, res, next) => {
  try {
    const { warehouse_id, items, reason, status } = req.body;

    if (!warehouse_id || !items || items.length === 0) {
      return res.status(400).json({ error: 'Thiếu thông tin bắt buộc' });
    }

    const pool = await getPool();

    for (const item of items) {
      const qty = parseFloat(item.qty ?? item.quantity ?? 0);
      const price = parseFloat(item.price ?? item.unit_price ?? 0);
      if (!qty || qty <= 0) continue;
      const totalValue = qty * price;

      // Ghi stock_movements
      await pool.query(
        'INSERT INTO stock_movements (warehouse_id, product_id, type, qty, reason, status, total_value, created_by) VALUES (?, ?, "import", ?, ?, ?, ?, ?)',
        [warehouse_id, item.product_id, qty, reason || 'Nhập kho', status || 'completed', totalValue, req.user.id]
      );

      if (status === 'completed' || !status) {
        // ✅ Cập nhật warehouse_stock đúng kho
        await pool.query(
          `INSERT INTO warehouse_stock (warehouse_id, product_id, stock_qty, available_stock)
           VALUES (?, ?, ?, ?)
           ON DUPLICATE KEY UPDATE 
             stock_qty = stock_qty + VALUES(stock_qty),
             available_stock = available_stock + VALUES(available_stock)`,
          [warehouse_id, item.product_id, qty, qty]
        );
      }
    }

    // Recalculate tồn kho sau nhập
    const productIds = [...new Set(items.map(i => i.product_id))];
    for (const pid of productIds) {
      await recalculateStock(pid, warehouse_id);
    }

    res.status(201).json({ message: 'Nhập kho thành công' });
  } catch (err) {
    next(err);
  }
});

// POST: Xuất kho
router.post('/export', auth, authorize('admin'), async (req, res, next) => {
  try {
    const { warehouse_id, items, reason, status } = req.body;

    if (!warehouse_id || !items || items.length === 0) {
      return res.status(400).json({ error: 'Thiếu thông tin bắt buộc' });
    }

    const pool = await getPool();

    for (const item of items) {
      const qty = parseFloat(item.qty ?? item.quantity ?? 0);
      const price = parseFloat(item.price ?? item.unit_price ?? 0);
      if (!qty || qty <= 0) continue;
      const totalValue = qty * price;

      // ✅ Kiểm tra tồn kho của KHO ĐÓ (không phải tổng)
      const [ws] = await pool.query(
        'SELECT stock_qty, available_stock FROM warehouse_stock WHERE product_id = ? AND warehouse_id = ?',
        [item.product_id, warehouse_id]
      );

      if (ws.length === 0) {
        return res.status(400).json({ error: `Sản phẩm ID ${item.product_id} chưa có trong kho này` });
      }

      if (parseFloat(ws[0].available_stock) < qty) {
        return res.status(400).json({ 
          error: `Tồn kho không đủ. Có thể bán: ${ws[0].available_stock}, yêu cầu: ${qty}` 
        });
      }

      // Ghi stock_movements
      await pool.query(
        'INSERT INTO stock_movements (warehouse_id, product_id, type, qty, reason, status, total_value, created_by) VALUES (?, ?, "export", ?, ?, ?, ?, ?)',
        [warehouse_id, item.product_id, -qty, reason || 'Xuất kho', status || 'completed', totalValue, req.user.id]
      );

      if (status === 'completed' || !status) {
        // ✅ Trừ warehouse_stock đúng kho
        await pool.query(
          'UPDATE warehouse_stock SET stock_qty = GREATEST(0, stock_qty - ?), available_stock = GREATEST(0, available_stock - ?) WHERE product_id = ? AND warehouse_id = ?',
          [qty, qty, item.product_id, warehouse_id]
        );
      }
    }

    const productIds = [...new Set(items.map(i => i.product_id))];
    for (const pid of productIds) {
      await recalculateStock(pid, warehouse_id);
    }

    res.status(201).json({ message: 'Xuất kho thành công' });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
