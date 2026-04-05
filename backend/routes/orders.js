const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const { getPool } = require('../config/db');
const {
  generateOrderCode,
  recalculateStock,
  recalculateAllStock,
  deductStockOnComplete,
  restoreStockOnCancel,
  recalculateCommission,
  calculateItemCommission,
  updateLoyaltyPoints
} = require('../services/orderService');

router.get('/', auth, async (req, res, next) => {
  try {
    const pool = await getPool();
    const { search, status, employee, warehouse, date_from, date_to, page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

    let query = `
      SELECT o.*, c.name as customer_name, c.phone as customer_phone, u.full_name as salesperson_name, w.name as warehouse_name, g.name as group_name,
        COALESCE((SELECT commission_amount FROM commissions WHERE order_id = o.id LIMIT 1), 0) as commission_amount
      FROM orders o
      LEFT JOIN customers c ON o.customer_id = c.id
      LEFT JOIN users u ON o.salesperson_id = u.id
      LEFT JOIN warehouses w ON o.warehouse_id = w.id
      LEFT JOIN groups g ON o.group_id = g.id
      WHERE 1=1
    `;
    let countQuery = 'SELECT COUNT(*) as total FROM orders WHERE 1=1';
    const params = [];

    if (req.user.role === 'sales') {
      query += ' AND o.salesperson_id = ?';
      countQuery += ' AND salesperson_id = ?';
      params.push(req.user.id);
    }

    if (search) {
      query += ' AND (o.code LIKE ? OR c.name LIKE ?)';
      countQuery += ' AND code LIKE ?';
      const like = `%${search}%`;
      params.push(like, like);
    }

    if (status) {
      query += ' AND o.status = ?';
      countQuery += ' AND status = ?';
      params.push(status);
    }

    if (employee) {
      query += ' AND o.salesperson_id = ?';
      countQuery += ' AND salesperson_id = ?';
      params.push(employee);
    }

    if (warehouse) {
      query += ' AND o.warehouse_id = ?';
      countQuery += ' AND warehouse_id = ?';
      params.push(warehouse);
    }

    if (date_from) {
      query += ' AND DATE(o.created_at) >= ?';
      countQuery += ' AND DATE(created_at) >= ?';
      params.push(date_from);
    }

    if (date_to) {
      query += ' AND DATE(o.created_at) <= ?';
      countQuery += ' AND DATE(created_at) <= ?';
      params.push(date_to);
    }

    query += ' ORDER BY o.created_at DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), parseInt(offset));

    const [rows] = await pool.query(query, params);
    const [countRows] = await pool.query(countQuery, params.slice(0, -2));

    // Convert DECIMAL strings to numbers and compute commission
    const formattedRows = rows.map(row => {
      const total = parseFloat(row.total_amount) || 0;
      return {
        ...row,
        total_amount: total,
        subtotal: parseFloat(row.subtotal) || 0,
        discount: parseFloat(row.discount) || 0,
        tax_amount: parseFloat(row.tax_amount) || 0,
        shipping_fee: parseFloat(row.shipping_fee) || 0,
        commission_amount: parseFloat(row.commission_amount) || 0,
      };
    });

    res.json({ data: formattedRows, total: countRows[0].total, page: parseInt(page), limit: parseInt(limit) });
  } catch (err) {
    next(err);
  }
});

router.get('/:id', auth, async (req, res, next) => {
  try {
    const pool = await getPool();

    const [rows] = await pool.query(
      `SELECT o.*, c.name as customer_name, c.phone as customer_phone, c.email as customer_email, c.city as customer_city, c.district as customer_district, c.ward as customer_ward, c.tier as customer_tier, u.full_name as salesperson_name, w.name as warehouse_name, g.name as group_name
       FROM orders o
       LEFT JOIN customers c ON o.customer_id = c.id
       LEFT JOIN users u ON o.salesperson_id = u.id
       LEFT JOIN warehouses w ON o.warehouse_id = w.id
       LEFT JOIN groups g ON o.group_id = g.id
       WHERE o.id = ?`,
      [req.params.id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Không tìm thấy đơn hàng' });
    }

    if (req.user.role === 'sales' && rows[0].salesperson_id !== req.user.id) {
      return res.status(403).json({ error: 'Không có quyền xem đơn hàng này' });
    }

    const [items] = await pool.query(
      `SELECT oi.*, p.name as product_name, p.sku, p.unit
       FROM order_items oi
       JOIN products p ON oi.product_id = p.id
       WHERE oi.order_id = ?`,
      [req.params.id]
    );

    // Convert DECIMAL strings to numbers
    const order = rows[0];
    const formattedOrder = {
      ...order,
      total_amount: parseFloat(order.total_amount) || 0,
      subtotal: parseFloat(order.subtotal) || 0,
      discount: parseFloat(order.discount) || 0,
      tax_amount: parseFloat(order.tax_amount) || 0,
      shipping_fee: parseFloat(order.shipping_fee) || 0,
    };

    const formattedItems = items.map(item => ({
      ...item,
      qty: parseFloat(item.qty) || 0,
      unit_price: parseFloat(item.unit_price) || 0,
      discount_rate: parseFloat(item.discount_rate) || 0,
      discount_amount: parseFloat(item.discount_amount) || 0,
      commission_rate: parseFloat(item.commission_rate) || 0,
      commission_amount: parseFloat(item.commission_amount) || 0,
      subtotal: parseFloat(item.subtotal) || 0,
    }));

    res.json({ data: { ...formattedOrder, items: formattedItems } });
  } catch (err) {
    next(err);
  }
});

router.post('/', auth, async (req, res, next) => {
  try {
    const { customer_id, warehouse_id, group_id, shipping_address, carrier_service, shipping_fee, payment_method, discount, note, items } = req.body;

    if (!customer_id || !warehouse_id || !items || items.length === 0) {
      return res.status(400).json({ error: 'Thiếu thông tin bắt buộc' });
    }

    const pool = await getPool();
    const code = await generateOrderCode();

    let subtotal = 0;
    let totalCommission = 0;

    for (const item of items) {
      const discountAmount = (item.unit_price * item.qty * (item.discount_rate || 0)) / 100;
      const commissionAmount = await calculateItemCommission(item.unit_price, item.qty, discountAmount, item.commission_rate);
      const itemSubtotal = (item.unit_price * item.qty) - discountAmount;

      subtotal += itemSubtotal;
      totalCommission += commissionAmount;

      item.discount_amount = discountAmount;
      item.commission_amount = commissionAmount;
      item.subtotal = itemSubtotal;
    }

    const totalAmount = subtotal + (shipping_fee || 0) - (discount || 0);

    // Dùng status từ request, mặc định 'pending' (KHÔNG dùng 'draft')
    const orderStatus = req.body.status || 'pending';

    const [orderResult] = await pool.query(
      `INSERT INTO orders (code, customer_id, salesperson_id, warehouse_id, group_id, status, shipping_address, carrier_service, shipping_fee, payment_method, subtotal, discount, total_amount, note)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [code, customer_id, req.user.id, warehouse_id, group_id || null, orderStatus, shipping_address, carrier_service, shipping_fee || 0, payment_method || 'cash', subtotal, discount || 0, totalAmount, note]
    );

    const orderId = orderResult.insertId;

    for (const item of items) {
      await pool.query(
        `INSERT INTO order_items (order_id, product_id, qty, unit_price, discount_rate, discount_amount, commission_rate, commission_amount, subtotal)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [orderId, item.product_id, item.qty, item.unit_price, item.discount_rate || 0, item.discount_amount, item.commission_rate || 0, item.commission_amount, item.subtotal]
      );

      await recalculateStock(item.product_id);
    }

    await recalculateCommission(orderId);

    res.status(201).json({ id: orderId, code, message: 'Tạo đơn hàng thành công' });
  } catch (err) {
    next(err);
  }
});

router.put('/:id', auth, async (req, res, next) => {
  try {
    const pool = await getPool();

    const [existing] = await pool.query('SELECT * FROM orders WHERE id = ?', [req.params.id]);
    if (existing.length === 0) {
      return res.status(404).json({ error: 'Không tìm thấy đơn hàng' });
    }

    const order = existing[0];

    if (req.user.role === 'sales' && order.salesperson_id !== req.user.id) {
      return res.status(403).json({ error: 'Không có quyền sửa đơn hàng này' });
    }

    const { customer_id, warehouse_id, group_id, status, shipping_address, carrier_service, shipping_fee, payment_method, discount, note, items } = req.body;

    const oldStatus = order.status;

    let subtotal = 0;
    let totalCommission = 0;

    if (items) {
      await pool.query('DELETE FROM order_items WHERE order_id = ?', [req.params.id]);

      for (const item of items) {
        const discountAmount = (item.unit_price * item.qty * (item.discount_rate || 0)) / 100;
        const commissionAmount = await calculateItemCommission(item.unit_price, item.qty, discountAmount, item.commission_rate);
        const itemSubtotal = (item.unit_price * item.qty) - discountAmount;

        subtotal += itemSubtotal;
        totalCommission += commissionAmount;

        item.discount_amount = discountAmount;
        item.commission_amount = commissionAmount;
        item.subtotal = itemSubtotal;

        await pool.query(
          `INSERT INTO order_items (order_id, product_id, qty, unit_price, discount_rate, discount_amount, commission_rate, commission_amount, subtotal)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [req.params.id, item.product_id, item.qty, item.unit_price, item.discount_rate || 0, item.discount_amount, item.commission_rate || 0, item.commission_amount, item.subtotal]
        );
      }
    } else {
      const [currentItems] = await pool.query('SELECT * FROM order_items WHERE order_id = ?', [req.params.id]);
      for (const item of currentItems) {
        subtotal += parseFloat(item.subtotal);
        totalCommission += parseFloat(item.commission_amount);
      }
    }

    const totalAmount = subtotal + (shipping_fee !== undefined ? shipping_fee : order.shipping_fee) - (discount !== undefined ? discount : order.discount);

    await pool.query(
      `UPDATE orders SET customer_id = ?, warehouse_id = ?, group_id = ?, status = ?, shipping_address = ?, carrier_service = ?, shipping_fee = ?, payment_method = ?, subtotal = ?, discount = ?, total_amount = ?, note = ?
       WHERE id = ?`,
      [customer_id || order.customer_id, warehouse_id || order.warehouse_id, group_id !== undefined ? group_id : order.group_id, status || order.status, shipping_address || order.shipping_address, carrier_service || order.carrier_service, shipping_fee !== undefined ? shipping_fee : order.shipping_fee, payment_method || order.payment_method, subtotal, discount !== undefined ? discount : order.discount, totalAmount, note || order.note, req.params.id]
    );

    const newStatus = status || order.status;

    // Xử lý kho theo status transition
    if (newStatus !== oldStatus) {
      if (newStatus === 'completed' && oldStatus !== 'completed') {
        // Giao hàng thành công → trừ hẳn stock_qty vật lý
        await deductStockOnComplete(req.params.id);
      } else if (newStatus === 'cancelled') {
        // Hủy đơn → hoàn lại kho
        await restoreStockOnCancel(req.params.id, oldStatus);
      } else {
        // Các transition khác (pending↔shipping...) → chỉ recalc reserved
        const [allItems] = await pool.query('SELECT product_id FROM order_items WHERE order_id = ?', [req.params.id]);
        const productIds = [...new Set(allItems.map(i => i.product_id))];
        for (const productId of productIds) {
          await recalculateStock(productId);
        }
      }
    } else {
      // Status không đổi nhưng items có thể đổi → recalc
      const [allItems] = await pool.query('SELECT product_id FROM order_items WHERE order_id = ?', [req.params.id]);
      const productIds = [...new Set(allItems.map(i => i.product_id))];
      for (const productId of productIds) {
        await recalculateStock(productId);
      }
    }

    await recalculateCommission(req.params.id);

    if (newStatus === 'completed' && oldStatus !== 'completed') {
      await updateLoyaltyPoints(customer_id || order.customer_id, req.params.id, totalAmount);
    }

    res.json({ message: 'Cập nhật đơn hàng thành công' });
  } catch (err) {
    next(err);
  }
});

router.delete('/:id', auth, async (req, res, next) => {
  try {
    const pool = await getPool();

    const [existing] = await pool.query('SELECT * FROM orders WHERE id = ?', [req.params.id]);
    if (existing.length === 0) {
      return res.status(404).json({ error: 'Không tìm thấy đơn hàng' });
    }

    const order = existing[0];

    if (req.user.role === 'sales' && order.salesperson_id !== req.user.id) {
      return res.status(403).json({ error: 'Không có quyền xóa đơn hàng này' });
    }

    const deletedStatus = order.status;

    // Lấy danh sách product_id trước khi xóa
    const [itemsBefore] = await pool.query('SELECT DISTINCT product_id FROM order_items WHERE order_id = ?', [req.params.id]);
    const productIds = [...new Set(itemsBefore.map(i => i.product_id))];

    // Nếu đơn đã completed → cộng lại stock_qty trước khi xóa
    if (deletedStatus === 'completed') {
      await restoreStockOnCancel(req.params.id, 'completed');
    }

    await pool.query('DELETE FROM commissions WHERE order_id = ?', [req.params.id]);
    await pool.query('DELETE FROM order_items WHERE order_id = ?', [req.params.id]);
    await pool.query('DELETE FROM orders WHERE id = ?', [req.params.id]);

    // Recalc reserved sau khi xóa
    for (const productId of productIds) {
      await recalculateStock(productId);
    }

    res.json({ message: 'Xóa đơn hàng thành công' });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
