const { getPool } = require('../config/db');

async function generateOrderCode() {
  const pool = await getPool();
  const today = new Date();
  const dateStr = `${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, '0')}${String(today.getDate()).padStart(2, '0')}`;

  const [rows] = await pool.query(
    "SELECT code FROM orders WHERE code LIKE ? ORDER BY id DESC LIMIT 1",
    [`DH-${dateStr}-%`]
  );

  let seq = 1;
  if (rows.length > 0) {
    const lastCode = rows[0].code;
    const lastSeq = parseInt(lastCode.split('-').pop());
    seq = lastSeq + 1;
  }

  return `DH-${dateStr}-${String(seq).padStart(4, '0')}`;
}

// ✅ Tính lại tồn kho theo TỪNG KHO (warehouse_stock)
async function recalculateWarehouseStock(productId, warehouseId) {
  const pool = await getPool();

  // reserved = SL đơn pending/shipping từ KHO ĐÓ
  const [reservedResult] = await pool.query(
    `SELECT COALESCE(SUM(oi.qty), 0) as reserved
     FROM order_items oi
     JOIN orders o ON oi.order_id = o.id
     WHERE oi.product_id = ? AND o.warehouse_id = ? AND o.status IN ('pending', 'shipping')`,
    [productId, warehouseId]
  );

  const reserved = parseFloat(reservedResult[0].reserved) || 0;

  // Lấy stock_qty của kho đó
  const [ws] = await pool.query(
    'SELECT stock_qty FROM warehouse_stock WHERE product_id = ? AND warehouse_id = ?',
    [productId, warehouseId]
  );

  if (!ws.length) return; // Kho này chưa có sản phẩm

  const stockQty = parseFloat(ws[0].stock_qty) || 0;
  const availableStock = Math.max(0, stockQty - reserved);

  await pool.query(
    'UPDATE warehouse_stock SET reserved_stock = ?, available_stock = ? WHERE product_id = ? AND warehouse_id = ?',
    [reserved, availableStock, productId, warehouseId]
  );
}

// ✅ Tính lại tồn kho tổng trong products (tổng tất cả kho)
async function recalculateProductTotalStock(productId) {
  const pool = await getPool();

  const [totals] = await pool.query(
    `SELECT 
      COALESCE(SUM(stock_qty), 0) as total_stock,
      COALESCE(SUM(available_stock), 0) as total_available,
      COALESCE(SUM(reserved_stock), 0) as total_reserved
     FROM warehouse_stock WHERE product_id = ?`,
    [productId]
  );

  await pool.query(
    'UPDATE products SET stock_qty = ?, available_stock = ?, reserved_stock = ? WHERE id = ?',
    [totals[0].total_stock, totals[0].total_available, totals[0].total_reserved, productId]
  );
}

// ✅ Hàm chính: recalculate cả warehouse_stock lẫn products
async function recalculateStock(productId, warehouseId = null) {
  const pool = await getPool();

  if (warehouseId) {
    // Chỉ recalc kho cụ thể
    await recalculateWarehouseStock(productId, warehouseId);
  } else {
    // Recalc tất cả kho có sản phẩm này
    const [warehouses] = await pool.query(
      'SELECT DISTINCT warehouse_id FROM warehouse_stock WHERE product_id = ?',
      [productId]
    );
    for (const w of warehouses) {
      await recalculateWarehouseStock(productId, w.warehouse_id);
    }
  }

  // Cập nhật tổng trong products
  await recalculateProductTotalStock(productId);
}

async function recalculateAllStock() {
  const pool = await getPool();
  const [products] = await pool.query('SELECT id FROM products WHERE is_active = 1');
  for (const product of products) {
    await recalculateStock(product.id);
  }
}

// ✅ Khi đơn completed: trừ stock_qty vật lý theo đúng KHO
async function deductStockOnComplete(orderId) {
  const pool = await getPool();

  const [orderRows] = await pool.query('SELECT warehouse_id FROM orders WHERE id = ?', [orderId]);
  if (!orderRows.length) return;
  const warehouseId = orderRows[0].warehouse_id;

  const [items] = await pool.query(
    'SELECT product_id, qty FROM order_items WHERE order_id = ?', [orderId]
  );

  for (const item of items) {
    const qty = parseFloat(item.qty);

    // Trừ stock_qty trong warehouse_stock
    await pool.query(
      'UPDATE warehouse_stock SET stock_qty = GREATEST(0, stock_qty - ?) WHERE product_id = ? AND warehouse_id = ?',
      [qty, item.product_id, warehouseId]
    );

    await recalculateStock(item.product_id, warehouseId);
  }
}

// ✅ Khi đơn cancelled/xóa: hoàn kho đúng KHO
async function restoreStockOnCancel(orderId, oldStatus) {
  const pool = await getPool();

  const [orderRows] = await pool.query('SELECT warehouse_id FROM orders WHERE id = ?', [orderId]);
  if (!orderRows.length) return;
  const warehouseId = orderRows[0].warehouse_id;

  const [items] = await pool.query(
    'SELECT product_id, qty FROM order_items WHERE order_id = ?', [orderId]
  );

  for (const item of items) {
    if (oldStatus === 'completed') {
      // Đã trừ stock_qty rồi → cộng lại vào đúng kho
      await pool.query(
        'UPDATE warehouse_stock SET stock_qty = stock_qty + ? WHERE product_id = ? AND warehouse_id = ?',
        [parseFloat(item.qty), item.product_id, warehouseId]
      );
    }
    await recalculateStock(item.product_id, warehouseId);
  }
}

async function recalculateCommission(orderId) {
  const pool = await getPool();

  // Nếu đơn đã hủy → không tính hoa hồng (xóa commission nếu có)
  const [orderCheck] = await pool.query(
    'SELECT status, salesperson_id, total_amount FROM orders WHERE id = ?',
    [orderId]
  );
  if (!orderCheck.length) return;
  if (String(orderCheck[0].status) === 'cancelled') {
    await pool.query('DELETE FROM commissions WHERE order_id = ?', [orderId]);
    return;
  }

  const [items] = await pool.query(
    `SELECT oi.commission_amount, oi.commission_rate, oi.qty, oi.unit_price,
            oi.discount_amount, oi.subtotal,
            (oi.unit_price * oi.qty - oi.discount_amount) as net_amount
     FROM order_items oi WHERE oi.order_id = ?`,
    [orderId]
  );

  const totalCommission = items.reduce((sum, item) => sum + parseFloat(item.commission_amount || 0), 0);

  const userId           = orderCheck[0].salesperson_id;
  const orderTotalAmount = parseFloat(orderCheck[0].total_amount) || 0;

  await pool.query('DELETE FROM commissions WHERE order_id = ?', [orderId]);

  await pool.query(
    'INSERT INTO commissions (order_id, user_id, commission_amount, type) VALUES (?, ?, ?, "direct")',
    [orderId, userId, totalCommission]
  );

  await calculateOverrideCommissions(orderId, userId, orderTotalAmount, items);
}

async function calculateOverrideCommissions(orderId, ctvUserId, orderTotalAmount, items) {
  const pool = await getPool();

  const [orderRows] = await pool.query('SELECT group_id FROM orders WHERE id = ?', [orderId]);
  if (!orderRows.length) return;
  const orderGroupId = orderRows[0].group_id;

  const [managers] = await pool.query(
    'SELECT c.sales_id FROM collaborators c WHERE c.ctv_id = ?',
    [ctvUserId]
  );
  if (managers.length === 0) return;

  const tierCache = {};
  const getTierRate = async (commissionRate) => {
    const key = String(commissionRate);
    if (tierCache[key] !== undefined) return tierCache[key];
    const [tiers] = await pool.query(
      `SELECT sales_override_rate FROM commission_tiers
       WHERE ctv_rate_min <= ? AND (ctv_rate_max IS NULL OR ctv_rate_max >= ?)
       ORDER BY ctv_rate_min DESC LIMIT 1`,
      [commissionRate, commissionRate]
    );
    tierCache[key] = tiers.length > 0 ? parseFloat(tiers[0].sales_override_rate) : null;
    return tierCache[key];
  };

  for (const manager of managers) {
    if (orderGroupId) {
      const [inGroup] = await pool.query(
        'SELECT 1 FROM user_groups WHERE user_id = ? AND group_id = ? LIMIT 1',
        [manager.sales_id, orderGroupId]
      );
      if (inGroup.length === 0) continue;
    }

    let totalOverrideAmount = 0;
    const itemRates = [];

    for (const item of items) {
      const itemRate = parseFloat(item.commission_rate) || 0;
      const overrideRate = await getTierRate(itemRate);
      if (!overrideRate) continue;

      const netAmount = parseFloat(item.net_amount) || 0;
      const itemOverride = Math.round(netAmount * overrideRate / 100 * 100) / 100;
      totalOverrideAmount += itemOverride;
      itemRates.push(overrideRate);
    }

    if (totalOverrideAmount <= 0) continue;

    const uniqueRates = [...new Set(itemRates)];
    const savedRate = uniqueRates.length === 1 ? uniqueRates[0] : null;

    await pool.query(
      'INSERT INTO commissions (order_id, user_id, commission_amount, type, ctv_user_id, override_rate) VALUES (?, ?, ?, "override", ?, ?)',
      [orderId, manager.sales_id, Math.round(totalOverrideAmount * 100) / 100, ctvUserId, savedRate]
    );
  }
}

async function calculateItemCommission(unitPrice, qty, discountAmount, commissionRate) {
  const netAmount = (parseFloat(unitPrice) * parseFloat(qty)) - parseFloat(discountAmount || 0);
  return Math.round(netAmount * parseFloat(commissionRate || 0) / 100 * 100) / 100;
}

async function updateLoyaltyPoints(customerId, orderId, totalAmount) {
  const pool = await getPool();

  const points = Math.floor(parseFloat(totalAmount) / 10000);

  if (points > 0) {
    await pool.query(
      'INSERT INTO loyalty_points (customer_id, order_id, points, type, note) VALUES (?, ?, ?, "earn", ?)',
      [customerId, orderId, points, `Tích lũy từ đơn hàng`]
    );

    await pool.query(
      'UPDATE customers SET points_balance = points_balance + ?, total_spent = total_spent + ? WHERE id = ?',
      [points, totalAmount, customerId]
    );
  }
}

module.exports = {
  generateOrderCode,
  recalculateStock,
  recalculateAllStock,
  deductStockOnComplete,
  restoreStockOnCancel,
  recalculateCommission,
  calculateItemCommission,
  updateLoyaltyPoints
};
