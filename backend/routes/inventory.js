const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const requireShop = require('../middleware/requireShop');
const authorize = require('../middleware/authorize');
const { getPool } = require('../config/db');
const { recalculateStock } = require('../services/orderService');

// GET: Thống kê nhập/xuất kho (tổng giá trị + số phiếu)
router.get('/summary', auth, requireShop, async (req, res, next) => {
  try {
    const pool = await getPool();
    const { warehouse_id, date_from, date_to } = req.query;

    // Mặc định: tháng hiện tại (theo server time)
    // Nếu có date_from/date_to thì ưu tiên theo range
    let where = 'WHERE sm.shop_id = ?';
    const params = [req.shopId];

    if (warehouse_id) {
      where += ' AND sm.warehouse_id = ?';
      params.push(parseInt(warehouse_id));
    }

    if (date_from) {
      where += ' AND DATE(sm.created_at) >= ?';
      params.push(date_from);
    }
    if (date_to) {
      where += ' AND DATE(sm.created_at) <= ?';
      params.push(date_to);
    }

    if (!date_from && !date_to) {
      where += ' AND DATE_FORMAT(sm.created_at, "%Y-%m") = DATE_FORMAT(CURRENT_DATE(), "%Y-%m")';
    }

    // Chỉ tính phiếu completed (draft không cộng vào thống kê tiền/kpi)
    where += ' AND sm.status = "completed"';

    const [rows] = await pool.query(
      `
      SELECT
        COALESCE(SUM(CASE WHEN sm.type = "import" THEN sm.total_value ELSE 0 END), 0) AS import_total_value,
        COALESCE(SUM(CASE WHEN sm.type = "export" THEN ABS(sm.total_value) ELSE 0 END), 0) AS export_total_value,
        COALESCE(SUM(CASE WHEN sm.type = "import" THEN 1 ELSE 0 END), 0) AS import_count,
        COALESCE(SUM(CASE WHEN sm.type = "export" THEN 1 ELSE 0 END), 0) AS export_count
      FROM stock_movements sm
      ${where}
      `,
      params
    );

    const r = rows?.[0] || {};
    res.json({
      data: {
        import_total_value: parseFloat(r.import_total_value) || 0,
        export_total_value: parseFloat(r.export_total_value) || 0,
        import_count: parseInt(r.import_count) || 0,
        export_count: parseInt(r.export_count) || 0,
      },
    });
  } catch (err) {
    next(err);
  }
});

// GET: Lịch sử nhập/xuất kho
router.get('/', auth, requireShop, async (req, res, next) => {
  try {
    const pool = await getPool();
    const { search, type, status, warehouse_id, date_from, date_to, page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

    let query = `
      SELECT sm.*, w.name as warehouse_name, u.full_name as staff_name, p.name as product_name, p.sku
      FROM stock_movements sm
      LEFT JOIN warehouses w ON sm.warehouse_id = w.id
      LEFT JOIN users u ON sm.created_by = u.id
      LEFT JOIN products p ON sm.product_id = p.id
      WHERE sm.shop_id = ?
    `;
    // Count query phải dùng cùng alias/join để không lỗi "Unknown column sm.*"
    let countQuery = `
      SELECT COUNT(*) as total
      FROM stock_movements sm
      LEFT JOIN warehouses w ON sm.warehouse_id = w.id
      LEFT JOIN users u ON sm.created_by = u.id
      LEFT JOIN products p ON sm.product_id = p.id
      WHERE sm.shop_id = ?
    `;
    const params = [req.shopId];

    if (search) {
      query += ' AND (sm.reason LIKE ? OR u.full_name LIKE ? OR p.name LIKE ?)';
      countQuery += ' AND (sm.reason LIKE ? OR u.full_name LIKE ? OR p.name LIKE ?)';
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

    if (date_from) {
      query += ' AND DATE(sm.created_at) >= ?';
      countQuery += ' AND DATE(sm.created_at) >= ?';
      params.push(date_from);
    }
    if (date_to) {
      query += ' AND DATE(sm.created_at) <= ?';
      countQuery += ' AND DATE(sm.created_at) <= ?';
      params.push(date_to);
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
router.get('/stock-by-warehouse', auth, requireShop, async (req, res, next) => {
  try {
    const pool = await getPool();
    const { warehouse_id, product_id } = req.query;

    if (!warehouse_id) {
      return res.status(400).json({ error: 'Thiếu warehouse_id' });
    }

    let query = `
      SELECT ws.*, p.name as product_name, p.sku, p.unit, p.price
      FROM warehouse_stock ws
      JOIN warehouses wh ON ws.warehouse_id = wh.id AND wh.shop_id = ?
      JOIN products p ON ws.product_id = p.id
      WHERE ws.warehouse_id = ? AND ws.shop_id = ? AND p.is_active = 1 AND p.shop_id = ?
    `;
    const params = [req.shopId, warehouse_id, req.shopId, req.shopId];

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
router.post('/import', auth, requireShop, authorize('admin'), async (req, res, next) => {
  try {
    const { warehouse_id, items, reason, status } = req.body;

    if (!warehouse_id || !items || items.length === 0) {
      return res.status(400).json({ error: 'Thiếu thông tin bắt buộc' });
    }

    const pool = await getPool();
    const sid = req.shopId;
    const [[wh]] = await pool.query('SELECT id FROM warehouses WHERE id = ? AND shop_id = ? LIMIT 1', [warehouse_id, sid]);
    if (!wh) {
      return res.status(400).json({ error: 'Kho không thuộc shop hiện tại' });
    }

    for (const item of items) {
      const qty = parseFloat(item.qty ?? item.quantity ?? 0);
      const price = parseFloat(item.price ?? item.unit_price ?? 0);
      if (!qty || qty <= 0) continue;
      const totalValue = qty * price;

      // Ghi stock_movements
      await pool.query(
        'INSERT INTO stock_movements (shop_id, warehouse_id, product_id, type, qty, reason, status, total_value, created_by) VALUES (?, ?, ?, "import", ?, ?, ?, ?, ?)',
        [sid, warehouse_id, item.product_id, qty, reason || 'Nhập kho', status || 'completed', totalValue, req.user.id]
      );

      if (status === 'completed' || !status) {
        // ✅ Cập nhật warehouse_stock đúng kho
        await pool.query(
          `INSERT INTO warehouse_stock (shop_id, warehouse_id, product_id, stock_qty, available_stock)
           VALUES (?, ?, ?, ?, ?)
           ON DUPLICATE KEY UPDATE 
             stock_qty = stock_qty + VALUES(stock_qty),
             available_stock = available_stock + VALUES(available_stock)`,
          [sid, warehouse_id, item.product_id, qty, qty]
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
router.post('/export', auth, requireShop, authorize('admin'), async (req, res, next) => {
  try {
    const { warehouse_id, destination_warehouse_id, items, reason, status } = req.body;

    if (!warehouse_id || !items || items.length === 0) {
      return res.status(400).json({ error: 'Thiếu thông tin bắt buộc' });
    }

    const pool = await getPool();
    const sid = req.shopId;
    const [[whSrc]] = await pool.query('SELECT id FROM warehouses WHERE id = ? AND shop_id = ? LIMIT 1', [warehouse_id, sid]);
    if (!whSrc) {
      return res.status(400).json({ error: 'Kho xuất không thuộc shop hiện tại' });
    }
    const isCompleted = status === 'completed' || !status;
    const isTransfer = reason === 'export_transfer';

    if (isTransfer) {
      if (!destination_warehouse_id) {
        return res.status(400).json({ error: 'Thiếu destination_warehouse_id (kho nhận)' });
      }
      if (parseInt(destination_warehouse_id) === parseInt(warehouse_id)) {
        return res.status(400).json({ error: 'Kho nhận phải khác kho xuất' });
      }
      const [[whDst]] = await pool.query('SELECT id FROM warehouses WHERE id = ? AND shop_id = ? LIMIT 1', [destination_warehouse_id, sid]);
      if (!whDst) {
        return res.status(400).json({ error: 'Kho nhận không thuộc shop hiện tại' });
      }
    }

    await pool.query('START TRANSACTION');
    try {
      for (const item of items) {
        const qty = parseFloat(item.qty ?? item.quantity ?? 0);
        const price = parseFloat(item.price ?? item.unit_price ?? 0);
        if (!qty || qty <= 0) continue;
        const totalValue = qty * price;

        // ✅ Kiểm tra tồn kho của KHO ĐÓ (không phải tổng)
        const [ws] = await pool.query(
          'SELECT stock_qty, available_stock FROM warehouse_stock WHERE product_id = ? AND warehouse_id = ? AND shop_id = ?',
          [item.product_id, warehouse_id, sid]
        );

        if (ws.length === 0) {
          throw new Error(`Sản phẩm ID ${item.product_id} chưa có trong kho này`);
        }

        if (parseFloat(ws[0].available_stock) < qty) {
          throw new Error(`Tồn kho không đủ. Có thể bán: ${ws[0].available_stock}, yêu cầu: ${qty}`);
        }

        // Ghi stock_movements (export)
        await pool.query(
          'INSERT INTO stock_movements (shop_id, warehouse_id, product_id, type, qty, reason, status, total_value, created_by) VALUES (?, ?, ?, "export", ?, ?, ?, ?, ?)',
          [sid, warehouse_id, item.product_id, -qty, reason || 'Xuất kho', status || 'completed', totalValue, req.user.id]
        );

        if (isCompleted) {
          // ✅ Trừ warehouse_stock đúng kho
          await pool.query(
            'UPDATE warehouse_stock SET stock_qty = GREATEST(0, stock_qty - ?), available_stock = GREATEST(0, available_stock - ?) WHERE product_id = ? AND warehouse_id = ? AND shop_id = ?',
            [qty, qty, item.product_id, warehouse_id, sid]
          );
        }

        if (isTransfer) {
          // Ghi movement nhập vào kho nhận
          await pool.query(
            'INSERT INTO stock_movements (shop_id, warehouse_id, product_id, type, qty, reason, status, total_value, created_by) VALUES (?, ?, ?, "import", ?, ?, ?, ?, ?)',
            [sid, destination_warehouse_id, item.product_id, qty, 'Nhập chuyển kho', status || 'completed', totalValue, req.user.id]
          );

          if (isCompleted) {
            await pool.query(
              `INSERT INTO warehouse_stock (shop_id, warehouse_id, product_id, stock_qty, available_stock)
               VALUES (?, ?, ?, ?, ?)
               ON DUPLICATE KEY UPDATE
                 stock_qty = stock_qty + VALUES(stock_qty),
                 available_stock = available_stock + VALUES(available_stock)`,
              [sid, destination_warehouse_id, item.product_id, qty, qty]
            );
          }
        }
      }

      const productIds = [...new Set(items.map(i => i.product_id))];
      for (const pid of productIds) {
        await recalculateStock(pid, warehouse_id);
        if (isTransfer) await recalculateStock(pid, destination_warehouse_id);
      }

      await pool.query('COMMIT');
    } catch (e) {
      await pool.query('ROLLBACK');
      throw e;
    }

    res.status(201).json({ message: 'Xuất kho thành công' });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
