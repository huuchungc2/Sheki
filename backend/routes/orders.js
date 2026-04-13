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
const { publishOrderEvent } = require('../services/notificationHub');
const { computeOrderCollects, round2 } = require('../utils/orderCollect');

const DEFAULT_LINE_COMMISSION_RATE = 10;

router.get('/', auth, async (req, res, next) => {
  try {
    const pool = await getPool();
    const { search, status, employee, warehouse, date_from, date_to, group_id, page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

    let query = `
      SELECT o.*, c.name as customer_name, c.phone as customer_phone, u.full_name as salesperson_name, w.name as warehouse_name, g.name as group_name,
        COALESCE((
          SELECT commission_amount
          FROM commissions
          WHERE order_id = o.id AND user_id = o.salesperson_id AND type = 'direct'
          LIMIT 1
        ), 0) as commission_amount
      FROM orders o
      LEFT JOIN customers c ON o.customer_id = c.id
      LEFT JOIN users u ON o.salesperson_id = u.id
      LEFT JOIN warehouses w ON o.warehouse_id = w.id
      LEFT JOIN groups g ON o.group_id = g.id
      WHERE 1=1
    `;
    let countQuery = 'SELECT COUNT(*) as total FROM orders WHERE 1=1';
    let summaryQuery = `
      SELECT
        COALESCE(SUM(CASE WHEN o.status != 'cancelled' THEN 1 ELSE 0 END), 0) AS total_orders,
        COALESCE(SUM(CASE WHEN o.status != 'cancelled' THEN o.subtotal ELSE 0 END), 0) AS total_revenue,
        COALESCE(SUM(CASE WHEN o.status != 'cancelled' THEN (
          SELECT commission_amount
          FROM commissions
          WHERE order_id = o.id AND user_id = o.salesperson_id AND type = 'direct'
          LIMIT 1
        ) ELSE 0 END), 0) AS total_commission
      FROM orders o
      LEFT JOIN customers c ON o.customer_id = c.id
      WHERE 1=1
    `;
    const params = [];
    const summaryParams = [];

    if (req.user.scope_own_data) {
      // Sales "Đơn hàng của tôi": CHỈ các đơn mình bán
      query += ' AND o.salesperson_id = ?';
      countQuery += ' AND salesperson_id = ?';
      summaryQuery += ' AND o.salesperson_id = ?';
      params.push(req.user.id);
      summaryParams.push(req.user.id);
    }

    if (search) {
      query += ' AND (o.code LIKE ? OR c.name LIKE ?)';
      countQuery += ' AND code LIKE ?';
      summaryQuery += ' AND (o.code LIKE ? OR c.name LIKE ?)';
      const like = `%${search}%`;
      params.push(like, like);
      summaryParams.push(like, like);
    }

    if (status) {
      query += ' AND o.status = ?';
      countQuery += ' AND status = ?';
      summaryQuery += ' AND o.status = ?';
      params.push(status);
      summaryParams.push(status);
    }

    if (employee) {
      query += ' AND o.salesperson_id = ?';
      countQuery += ' AND salesperson_id = ?';
      summaryQuery += ' AND o.salesperson_id = ?';
      params.push(employee);
      summaryParams.push(employee);
    }

    if (warehouse) {
      query += ' AND o.warehouse_id = ?';
      countQuery += ' AND warehouse_id = ?';
      summaryQuery += ' AND o.warehouse_id = ?';
      params.push(warehouse);
      summaryParams.push(warehouse);
    }

    if (date_from) {
      query += ' AND DATE(o.created_at) >= ?';
      countQuery += ' AND DATE(created_at) >= ?';
      params.push(date_from);
      summaryQuery += ' AND DATE(o.created_at) >= ?';
      summaryParams.push(date_from);
    }
    if (date_to) {
      query += ' AND DATE(o.created_at) <= ?';
      countQuery += ' AND DATE(created_at) <= ?';
      params.push(date_to);
      summaryQuery += ' AND DATE(o.created_at) <= ?';
      summaryParams.push(date_to);
    }

    if (group_id) {
      query += ' AND o.group_id = ?';
      countQuery += ' AND group_id = ?';
      summaryQuery += ' AND o.group_id = ?';
      params.push(parseInt(group_id));
      summaryParams.push(parseInt(group_id));
    }

    query += ' ORDER BY o.created_at DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), parseInt(offset));

    const [rows] = await pool.query(query, params);
    const [countRows] = await pool.query(countQuery, params.slice(0, -2));
    const [[summary]] = await pool.query(summaryQuery, summaryParams);

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
        ship_payer: row.ship_payer === 'shop' ? 'shop' : 'customer',
        deposit: parseFloat(row.deposit) || 0,
        customer_collect: parseFloat(row.customer_collect) || 0,
        shop_collect: parseFloat(row.shop_collect) || 0,
        salesperson_absorbed_amount: parseFloat(row.salesperson_absorbed_amount) || 0,
        commission_amount: parseFloat(row.commission_amount) || 0,
      };
    });

    res.json({
      data: formattedRows,
      total: countRows[0].total,
      page: parseInt(page),
      limit: parseInt(limit),
      summary: {
        total_orders: parseInt(summary?.total_orders) || 0,
        total_revenue: parseFloat(summary?.total_revenue) || 0,
        total_commission: parseFloat(summary?.total_commission) || 0,
      },
    });
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

    if (
      req.user.scope_own_data &&
      rows[0].salesperson_id !== req.user.id
    ) {
      // Cho phép quản lý xem chi tiết đơn nếu có hoa hồng override từ đơn đó
      // (Dùng cho popup chi tiết đơn ở /reports/commissions/ctv)
      const [[ov]] = await pool.query(
        `SELECT 1 as ok
         FROM commissions c
         WHERE c.order_id = ? AND c.user_id = ? AND c.type = 'override'
         LIMIT 1`,
        [rows[0].id, req.user.id]
      );
      if (!ov?.ok) {
        return res.status(403).json({ error: 'Không có quyền xem đơn hàng này' });
      }
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
      ship_payer: order.ship_payer === 'shop' ? 'shop' : 'customer',
      deposit: parseFloat(order.deposit) || 0,
      customer_collect: parseFloat(order.customer_collect) || 0,
      shop_collect: parseFloat(order.shop_collect) || 0,
      salesperson_absorbed_amount: parseFloat(order.salesperson_absorbed_amount) || 0,
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

    // Nếu user đang xem với vai trò "quản lý nhận override", trả thêm breakdown theo dòng:
    // - net_amount dòng
    // - override_rate theo tier của commission_rate từng dòng
    // - override_amount theo dòng
    const [[hasOverride]] = await pool.query(
      `SELECT 1 as ok
       FROM commissions c
       WHERE c.order_id = ? AND c.user_id = ? AND c.type = 'override'
       LIMIT 1`,
      [rows[0].id, req.user.id]
    );

    let override_breakdown = null;
    if (hasOverride?.ok) {
      const tierCache = new Map();
      const getTier = async (ctvRate) => {
        const key = String(ctvRate);
        if (tierCache.has(key)) return tierCache.get(key);
        const [[t]] = await pool.query(
          `SELECT sales_override_rate
           FROM commission_tiers
           WHERE ctv_rate_min <= ? AND (ctv_rate_max IS NULL OR ctv_rate_max >= ?)
           ORDER BY ctv_rate_min DESC LIMIT 1`,
          [ctvRate, ctvRate]
        );
        const rate = t ? parseFloat(t.sales_override_rate) : null;
        tierCache.set(key, rate);
        return rate;
      };

      override_breakdown = await Promise.all(
        formattedItems.map(async (it) => {
          const netAmount =
            (parseFloat(it.unit_price) || 0) * (parseFloat(it.qty) || 0) - (parseFloat(it.discount_amount) || 0);
          const ctvRate = parseFloat(it.commission_rate) || 0;
          const overrideRate = await getTier(ctvRate);
          const overrideAmount =
            overrideRate == null ? 0 : Math.round(netAmount * (overrideRate / 100) * 100) / 100;
          return {
            product_id: it.product_id,
            net_amount: Math.round(netAmount * 100) / 100,
            ctv_rate: Math.round(ctvRate * 100) / 100,
            override_rate: overrideRate,
            override_amount: overrideAmount,
          };
        })
      );
    }

    res.json({ data: { ...formattedOrder, items: formattedItems, override_breakdown } });
  } catch (err) {
    next(err);
  }
});

router.post('/', auth, async (req, res, next) => {
  try {
    const {
      customer_id,
      warehouse_id,
      group_id,
      shipping_address,
      carrier_service,
      shipping_fee,
      ship_payer,
      deposit,
      salesperson_absorbed_amount,
      payment_method,
      discount,
      note,
      items,
      source_type,
      manager_salesperson_id,
      collaborator_user_id,
    } = req.body;

    if (!customer_id || !warehouse_id || !items || items.length === 0) {
      return res.status(400).json({ error: 'Thiếu thông tin bắt buộc' });
    }

    const pool = await getPool();

    const parsedMgrPost =
      manager_salesperson_id !== undefined && manager_salesperson_id !== null && manager_salesperson_id !== ''
        ? parseInt(manager_salesperson_id, 10)
        : null;
    let effectivePostSource = source_type;
    if (effectivePostSource === undefined && parsedMgrPost && Number.isFinite(parsedMgrPost)) {
      effectivePostSource = 'collaborator';
    }

    const isAdminUser = req.user.can_access_admin === true || req.user.role === 'admin';
    if (isAdminUser && effectivePostSource === 'collaborator') {
      return res.status(403).json({
        error: 'Admin không dùng chế độ ghi nhận quản lý nhận HH trực tiếp — chỉ nhân viên Sales.',
      });
    }

    let finalSalespersonId = req.user.id;
    let finalSourceType = effectivePostSource === 'collaborator' ? 'collaborator' : 'sales';
    let finalCollaboratorUserId = null;

    if (finalSourceType === 'collaborator') {
      // NEW semantics (theo yêu cầu nghiệp vụ hiện tại):
      // - salesperson_id = người lên đơn (Lan) => nhận HH direct
      // - collaborator_user_id = quản lý (Minh) => nhận HH override từ đơn của Lan
      const managerId = parseInt(manager_salesperson_id, 10);
      if (!managerId) {
        return res.status(400).json({ error: 'Cần manager_salesperson_id (quản lý nhận hoa hồng từ CTV)' });
      }

      // Validate quan hệ quản lý-CTV: managerId phải là sales_id của user hiện tại (CTV)
      const [pair] = await pool.query(
        'SELECT 1 FROM collaborators WHERE sales_id = ? AND ctv_id = ? LIMIT 1',
        [managerId, req.user.id]
      );
      if (!pair.length) {
        return res.status(400).json({ error: 'Quản lý và nhân viên lên đơn không khớp quan hệ đã gán trong hệ thống' });
      }

      finalSalespersonId = req.user.id;
      finalCollaboratorUserId = managerId;
    }

    const code = await generateOrderCode();

    // Validate stock: qty <= available_stock in this warehouse (server-side, cannot bypass)
    for (const it of items) {
      const productId = it.product_id;
      const qty = parseFloat(it.qty);
      if (!productId || !Number.isFinite(qty) || qty <= 0) continue;
      const [wsRows] = await pool.query(
        'SELECT available_stock FROM warehouse_stock WHERE warehouse_id = ? AND product_id = ? LIMIT 1',
        [warehouse_id, productId]
      );
      const available = wsRows.length ? parseFloat(wsRows[0].available_stock) || 0 : 0;
      if (qty > available) {
        return res.status(400).json({
          error: `Số lượng vượt tồn kho có thể bán trong kho đã chọn (product_id=${productId}, tối đa=${available})`
        });
      }
    }

    let subtotal = 0;
    let totalCommission = 0;

    for (const item of items) {
      const rate =
        parseFloat(item.commission_rate) || 0;
      const discountAmount = (item.unit_price * item.qty * (item.discount_rate || 0)) / 100;
      const commissionAmount = await calculateItemCommission(item.unit_price, item.qty, discountAmount, rate);
      const itemSubtotal = (item.unit_price * item.qty) - discountAmount;

      subtotal += itemSubtotal;
      totalCommission += commissionAmount;

      item.discount_amount = discountAmount;
      item.commission_amount = commissionAmount;
      item.commission_rate = rate;
      item.subtotal = itemSubtotal;
    }

    const shipFee = round2(shipping_fee);
    const shipPayerVal = ship_payer === 'shop' ? 'shop' : 'customer';
    const depositVal = round2(deposit);
    const salespersonAbsorbedVal = round2(salesperson_absorbed_amount);
    const { customer_collect, shop_collect } = computeOrderCollects(subtotal, shipFee, depositVal, shipPayerVal);
    const totalAmount = customer_collect;

    // Dùng status từ request, mặc định 'pending' (KHÔNG dùng 'draft')
    const orderStatus = req.body.status || 'pending';

    const [orderResult] = await pool.query(
      `INSERT INTO orders (code, customer_id, salesperson_id, warehouse_id, group_id, source_type, collaborator_user_id, status, shipping_address, carrier_service, shipping_fee, ship_payer, deposit, customer_collect, shop_collect, salesperson_absorbed_amount, payment_method, subtotal, discount, total_amount, note)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        code,
        customer_id,
        finalSalespersonId,
        warehouse_id,
        group_id || null,
        finalSourceType,
        finalCollaboratorUserId,
        orderStatus,
        shipping_address,
        carrier_service,
        shipFee,
        shipPayerVal,
        depositVal,
        customer_collect,
        shop_collect,
        salespersonAbsorbedVal,
        payment_method || 'cash',
        subtotal,
        discount || 0,
        totalAmount,
        note,
      ]
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

    // Nếu tạo đơn với status=completed ngay từ đầu → trừ kho vật lý đúng kho
    if (orderStatus === 'completed') {
      await deductStockOnComplete(orderId);
      await updateLoyaltyPoints(customer_id, orderId, totalAmount);
    }

    // Realtime notify: tạo đơn mới
    try {
      publishOrderEvent('created', {
        order_id: orderId,
        order_code: code,
        status: orderStatus,
        salesperson_id: finalSalespersonId,
        collaborator_user_id: finalCollaboratorUserId,
        group_id: group_id || null,
        total_amount: totalAmount,
      });
    } catch {}

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

    if (
      req.user.scope_own_data &&
      order.salesperson_id !== req.user.id
    ) {
      return res.status(403).json({ error: 'Không có quyền sửa đơn hàng này' });
    }

    const {
      customer_id,
      warehouse_id,
      group_id,
      status,
      shipping_address,
      carrier_service,
      shipping_fee,
      ship_payer,
      deposit,
      salesperson_absorbed_amount,
      payment_method,
      discount,
      note,
      items,
      source_type,
      manager_salesperson_id,
      collaborator_user_id,
    } = req.body;

    const parsedManagerInfer =
      manager_salesperson_id !== undefined && manager_salesperson_id !== null && manager_salesperson_id !== ''
        ? parseInt(manager_salesperson_id, 10)
        : null;
    let effectiveSourceType = source_type;
    if (effectiveSourceType === undefined && parsedManagerInfer && Number.isFinite(parsedManagerInfer)) {
      effectiveSourceType = 'collaborator';
    }

    const oldStatus = order.status;
    const targetWarehouseId = warehouse_id || order.warehouse_id;

    let subtotal = 0;
    let totalCommission = 0;

    let finalSalespersonId = order.salesperson_id;
    let finalSourceType =
      String(order.source_type || 'sales') === 'collaborator' ? 'collaborator' : 'sales';
    let finalCollaboratorUserId = order.collaborator_user_id || null;

    const isAdminUserPut = req.user.can_access_admin === true || req.user.role === 'admin';
    if (isAdminUserPut && effectiveSourceType === 'collaborator') {
      return res.status(403).json({
        error: 'Admin không dùng chế độ ghi nhận quản lý nhận HH trực tiếp — chỉ nhân viên Sales.',
      });
    }

    if (effectiveSourceType === 'collaborator' || effectiveSourceType === 'sales') {
      if (effectiveSourceType === 'collaborator') {
        const managerId = parseInt(manager_salesperson_id, 10);
        if (!managerId) {
          return res.status(400).json({ error: 'Cần manager_salesperson_id (quản lý nhận hoa hồng từ CTV)' });
        }

        // Validate quan hệ quản lý-CTV theo người đang sửa/lên đơn (sales user)
        const [pair] = await pool.query(
          'SELECT 1 FROM collaborators WHERE sales_id = ? AND ctv_id = ? LIMIT 1',
          [managerId, req.user.id]
        );
        if (!pair.length) {
          return res.status(400).json({ error: 'Quản lý và nhân viên lên đơn không khớp quan hệ đã gán trong hệ thống' });
        }

        finalSalespersonId = req.user.id;
        finalCollaboratorUserId = managerId;
        finalSourceType = 'collaborator';
      } else {
        finalSourceType = 'sales';
        finalCollaboratorUserId = null;
        // Không chọn quản lý → giữ salesperson_id hiện tại (người lên đơn)
      }
    }

    let itemsForPut = items;
    if (Array.isArray(itemsForPut) && itemsForPut.length === 0) {
      itemsForPut = null;
    }
    if (
      (!itemsForPut || !Array.isArray(itemsForPut) || itemsForPut.length === 0) &&
      (effectiveSourceType === 'collaborator' || effectiveSourceType === 'sales')
    ) {
      const [rows] = await pool.query(
        `SELECT product_id, qty, unit_price, discount_rate, commission_rate FROM order_items WHERE order_id = ?`,
        [req.params.id]
      );
      itemsForPut = rows.map((r) => ({
        product_id: r.product_id,
        qty: parseFloat(r.qty),
        unit_price: parseFloat(r.unit_price),
        discount_rate: parseFloat(r.discount_rate) || 0,
        commission_rate: parseFloat(r.commission_rate) || 0,
      }));
    }

    if (itemsForPut && itemsForPut.length) {
      // Validate stock with baseline add-back for current order (pending/shipping only)
      const addBackAllowed = ['pending', 'shipping'].includes(String(oldStatus)) && String(targetWarehouseId) === String(order.warehouse_id);
      const [oldItems] = await pool.query(
        'SELECT product_id, qty FROM order_items WHERE order_id = ?',
        [req.params.id]
      );
      const baselineByProduct = oldItems.reduce((acc, r) => {
        const pid = String(r.product_id);
        acc[pid] = (acc[pid] || 0) + (parseFloat(r.qty) || 0);
        return acc;
      }, {});

      for (const it of itemsForPut) {
        const productId = it.product_id;
        const qty = parseFloat(it.qty);
        if (!productId || !Number.isFinite(qty) || qty <= 0) continue;
        const [wsRows] = await pool.query(
          'SELECT available_stock FROM warehouse_stock WHERE warehouse_id = ? AND product_id = ? LIMIT 1',
          [targetWarehouseId, productId]
        );
        const available = wsRows.length ? parseFloat(wsRows[0].available_stock) || 0 : 0;
        const baseline = addBackAllowed ? (parseFloat(baselineByProduct[String(productId)]) || 0) : 0;
        if (qty > (available + baseline)) {
          return res.status(400).json({
            error: `Số lượng vượt tồn kho có thể bán trong kho đã chọn (product_id=${productId}, tối đa=${available + baseline})`
          });
        }
      }

      await pool.query('DELETE FROM order_items WHERE order_id = ?', [req.params.id]);

      for (const item of itemsForPut) {
        const rate =
          parseFloat(item.commission_rate) || 0;
        const discountAmount = (item.unit_price * item.qty * (item.discount_rate || 0)) / 100;
        const commissionAmount = await calculateItemCommission(item.unit_price, item.qty, discountAmount, rate);
        const itemSubtotal = (item.unit_price * item.qty) - discountAmount;

        subtotal += itemSubtotal;
        totalCommission += commissionAmount;

        item.discount_amount = discountAmount;
        item.commission_amount = commissionAmount;
        item.commission_rate = rate;
        item.subtotal = itemSubtotal;

        await pool.query(
          `INSERT INTO order_items (order_id, product_id, qty, unit_price, discount_rate, discount_amount, commission_rate, commission_amount, subtotal)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [req.params.id, item.product_id, item.qty, item.unit_price, item.discount_rate || 0, item.discount_amount, rate, item.commission_amount, item.subtotal]
        );
      }
    } else {
      const [currentItems] = await pool.query('SELECT * FROM order_items WHERE order_id = ?', [req.params.id]);
      for (const item of currentItems) {
        subtotal += parseFloat(item.subtotal);
        totalCommission += parseFloat(item.commission_amount);
      }
    }

    const shipFeePut = round2(shipping_fee !== undefined ? shipping_fee : order.shipping_fee);
    const shipPayerPut =
      ship_payer !== undefined ? (ship_payer === 'shop' ? 'shop' : 'customer') : (order.ship_payer === 'shop' ? 'shop' : 'customer');
    const depositPut =
      deposit !== undefined ? round2(deposit) : round2(order.deposit != null ? order.deposit : 0);
    const salespersonAbsorbedPut =
      salesperson_absorbed_amount !== undefined
        ? round2(salesperson_absorbed_amount)
        : round2(order.salesperson_absorbed_amount != null ? order.salesperson_absorbed_amount : 0);
    const { customer_collect: custCol, shop_collect: shopCol } = computeOrderCollects(
      subtotal,
      shipFeePut,
      depositPut,
      shipPayerPut
    );
    const totalAmount = custCol;

    await pool.query(
      `UPDATE orders SET customer_id = ?, warehouse_id = ?, group_id = ?, salesperson_id = ?, source_type = ?, collaborator_user_id = ?, status = ?, shipping_address = ?, carrier_service = ?, shipping_fee = ?, ship_payer = ?, deposit = ?, customer_collect = ?, shop_collect = ?, salesperson_absorbed_amount = ?, payment_method = ?, subtotal = ?, discount = ?, total_amount = ?, note = ?
       WHERE id = ?`,
      [
        customer_id || order.customer_id,
        warehouse_id || order.warehouse_id,
        group_id !== undefined ? group_id : order.group_id,
        finalSalespersonId,
        finalSourceType,
        finalCollaboratorUserId,
        status || order.status,
        shipping_address || order.shipping_address,
        carrier_service || order.carrier_service,
        shipFeePut,
        shipPayerPut,
        depositPut,
        custCol,
        shopCol,
        salespersonAbsorbedPut,
        payment_method || order.payment_method,
        subtotal,
        discount !== undefined ? discount : order.discount,
        totalAmount,
        note || order.note,
        req.params.id,
      ]
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

    // Realtime notify: đổi trạng thái
    if (newStatus !== oldStatus) {
      try {
        publishOrderEvent('status_changed', {
          order_id: parseInt(req.params.id),
          order_code: order.code,
          old_status: oldStatus,
          status: newStatus,
          salesperson_id: order.salesperson_id,
          group_id: order.group_id || null,
          total_amount: totalAmount,
        });
      } catch {}
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

    if (
      req.user.scope_own_data &&
      order.salesperson_id !== req.user.id
    ) {
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
