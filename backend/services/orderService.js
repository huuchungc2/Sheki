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

async function recalculateStock(productId) {
  const pool = await getPool();

  const [reservedResult] = await pool.query(
    `SELECT COALESCE(SUM(oi.qty), 0) as reserved
     FROM order_items oi
     JOIN orders o ON oi.order_id = o.id
     WHERE oi.product_id = ? AND o.status IN ('draft', 'confirmed', 'shipping')`,
    [productId]
  );

  const reserved = parseFloat(reservedResult[0].reserved) || 0;

  await pool.query(
    'UPDATE products SET reserved_stock = ?, available_stock = stock_qty - ? WHERE id = ?',
    [reserved, reserved, productId]
  );
}

async function recalculateAllStock() {
  const pool = await getPool();

  const [products] = await pool.query('SELECT id FROM products WHERE is_active = 1');

  for (const product of products) {
    await recalculateStock(product.id);
  }
}

async function recalculateCommission(orderId) {
  const pool = await getPool();

  const [items] = await pool.query(
    'SELECT oi.commission_amount, oi.commission_rate, oi.qty, oi.unit_price, oi.discount_amount FROM order_items oi WHERE oi.order_id = ?',
    [orderId]
  );

  const totalCommission = items.reduce((sum, item) => sum + parseFloat(item.commission_amount || 0), 0);

  const [orderRows] = await pool.query('SELECT salesperson_id FROM orders WHERE id = ?', [orderId]);
  if (orderRows.length === 0) return;

  const userId = orderRows[0].salesperson_id;

  // Xóa tất cả commission cũ của order này
  await pool.query('DELETE FROM commissions WHERE order_id = ?', [orderId]);

  // 1. Tạo direct commission cho người tạo đơn (sales/CTV)
  await pool.query(
    'INSERT INTO commissions (order_id, user_id, commission_amount, type) VALUES (?, ?, ?, "direct")',
    [orderId, userId, totalCommission]
  );

  // 2. Tính override commission cho Sales quản lý CTV này
  await calculateOverrideCommissions(orderId, userId, totalCommission, items);
}

async function calculateOverrideCommissions(orderId, ctvUserId, ctvCommissionAmount, items) {
  const pool = await getPool();

  // Tìm tất cả Sales quản lý CTV này
  const [managers] = await pool.query(
    'SELECT sales_id FROM collaborators WHERE ctv_id = ?',
    [ctvUserId]
  );

  if (managers.length === 0) return;

  // Lấy commission_rate trung bình của CTV từ các items trong đơn
  const avgRateResult = items.reduce((sum, item) => sum + parseFloat(item.commission_rate || 0), 0) / items.length;
  const avgCtvRate = avgRateResult || 0;

  // Tìm tier phù hợp: ctv_rate_min <= avgCtvRate <= ctv_rate_max
  const [tiers] = await pool.query(
    'SELECT * FROM commission_tiers WHERE ctv_rate_min <= ? AND (ctv_rate_max IS NULL OR ctv_rate_max >= ?) ORDER BY ctv_rate_min DESC LIMIT 1',
    [avgCtvRate, avgCtvRate]
  );

  if (tiers.length === 0) return;

  const overrideRate = parseFloat(tiers[0].sales_override_rate);

  // Tính override: % trên tổng commission của CTV
  const overrideAmount = Math.round(ctvCommissionAmount * overrideRate / 100 * 100) / 100;

  if (overrideAmount <= 0) return;

  // Tạo override commission cho từng Sales quản lý
  for (const manager of managers) {
    await pool.query(
      'INSERT INTO commissions (order_id, user_id, commission_amount, type, ctv_user_id) VALUES (?, ?, ?, "override", ?)',
      [orderId, manager.sales_id, overrideAmount, ctvUserId]
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
  recalculateCommission,
  calculateItemCommission,
  updateLoyaltyPoints
};
