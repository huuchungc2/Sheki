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

  // reserved = SL đơn đang pending/shipping (chưa giao xong, cần giữ hàng)
  const [reservedResult] = await pool.query(
    `SELECT COALESCE(SUM(oi.qty), 0) as reserved
     FROM order_items oi
     JOIN orders o ON oi.order_id = o.id
     WHERE oi.product_id = ? AND o.status IN ('pending', 'shipping')`,
    [productId]
  );

  // sold = SL đã xuất thật (completed) — trừ hẳn khỏi stock_qty vật lý
  const [soldResult] = await pool.query(
    `SELECT COALESCE(SUM(oi.qty), 0) as sold
     FROM order_items oi
     JOIN orders o ON oi.order_id = o.id
     WHERE oi.product_id = ? AND o.status = 'completed'`,
    [productId]
  );

  const reserved = parseFloat(reservedResult[0].reserved) || 0;
  const sold     = parseFloat(soldResult[0].sold) || 0;

  // Lấy stock_qty gốc (initial) — lưu trong trường stock_qty ban đầu khi nhập kho
  // stock_qty thực = initial_stock - sold
  // available = stock_qty_thực - reserved
  const [orig] = await pool.query(
    'SELECT stock_qty FROM products WHERE id = ?', [productId]
  );
  if (!orig.length) return;

  // stock_qty trong DB là kho vật lý hiện tại (sau khi trừ completed)
  // Tính available = stock_qty - reserved (không trừ thêm sold vì stock_qty đã phản ánh thực tế)
  const stockQty    = parseFloat(orig[0].stock_qty) || 0;
  const availableStock = Math.max(0, stockQty - reserved);

  await pool.query(
    'UPDATE products SET reserved_stock = ?, available_stock = ? WHERE id = ?',
    [reserved, availableStock, productId]
  );
}

async function recalculateAllStock() {
  const pool = await getPool();
  const [products] = await pool.query('SELECT id FROM products WHERE is_active = 1');
  for (const product of products) {
    await recalculateStock(product.id);
  }
}

// Gọi khi đơn chuyển sang completed: trừ hẳn stock_qty vật lý
async function deductStockOnComplete(orderId) {
  const pool = await getPool();
  const [items] = await pool.query(
    'SELECT product_id, qty FROM order_items WHERE order_id = ?', [orderId]
  );
  for (const item of items) {
    await pool.query(
      'UPDATE products SET stock_qty = GREATEST(0, stock_qty - ?) WHERE id = ?',
      [parseFloat(item.qty), item.product_id]
    );
    await recalculateStock(item.product_id);
  }
}

// Gọi khi đơn bị cancelled: hoàn lại kho (nếu đã completed thì cộng lại stock_qty)
async function restoreStockOnCancel(orderId, oldStatus) {
  const pool = await getPool();
  const [items] = await pool.query(
    'SELECT product_id, qty FROM order_items WHERE order_id = ?', [orderId]
  );
  for (const item of items) {
    if (oldStatus === 'completed') {
      // Đã trừ stock_qty rồi → cộng lại
      await pool.query(
        'UPDATE products SET stock_qty = stock_qty + ? WHERE id = ?',
        [parseFloat(item.qty), item.product_id]
      );
    }
    await recalculateStock(item.product_id);
  }
}

async function recalculateCommission(orderId) {
  const pool = await getPool();

  const [items] = await pool.query(
    'SELECT oi.commission_amount, oi.commission_rate, oi.qty, oi.unit_price, oi.discount_amount FROM order_items oi WHERE oi.order_id = ?',
    [orderId]
  );

  const totalCommission = items.reduce((sum, item) => sum + parseFloat(item.commission_amount || 0), 0);

  const [orderRows] = await pool.query('SELECT salesperson_id, total_amount FROM orders WHERE id = ?', [orderId]);
  if (orderRows.length === 0) return;

  const userId = orderRows[0].salesperson_id;
  const orderTotalAmount = parseFloat(orderRows[0].total_amount) || 0;

  // Xóa tất cả commission cũ của order này
  await pool.query('DELETE FROM commissions WHERE order_id = ?', [orderId]);

  // 1. Tạo direct commission cho người tạo đơn (sales/CTV)
  await pool.query(
    'INSERT INTO commissions (order_id, user_id, commission_amount, type) VALUES (?, ?, ?, "direct")',
    [orderId, userId, totalCommission]
  );

  // 2. Tính override commission cho Sales quản lý CTV này
  await calculateOverrideCommissions(orderId, userId, orderTotalAmount);
}

async function calculateOverrideCommissions(orderId, ctvUserId, orderTotalAmount) {
  const pool = await getPool();

  // Tìm tất cả Sales quản lý CTV này (bảng collaborators: sales_id quản lý ctv_id)
  const [managers] = await pool.query(
    'SELECT c.sales_id, u.commission_rate FROM collaborators c JOIN users u ON c.sales_id = u.id WHERE c.ctv_id = ?',
    [ctvUserId]
  );

  if (managers.length === 0) return;

  for (const manager of managers) {
    // Tra bảng commission_tiers theo commission_rate của SALES (người quản lý)
    const salesCommissionRate = parseFloat(manager.commission_rate) || 0;

    const [tiers] = await pool.query(
      `SELECT sales_override_rate FROM commission_tiers 
       WHERE ctv_rate_min <= ? AND (ctv_rate_max IS NULL OR ctv_rate_max >= ?) 
       ORDER BY ctv_rate_min DESC LIMIT 1`,
      [salesCommissionRate, salesCommissionRate]
    );

    if (tiers.length === 0) continue;

    const overrideRate = parseFloat(tiers[0].sales_override_rate);

    // ✅ ĐÚNG: tính % trên TỔNG TIỀN ĐƠN (không phải trên hoa hồng CTV)
    // VD: đơn 1,000,000đ × 3% = 30,000đ
    const overrideAmount = Math.round(orderTotalAmount * overrideRate / 100 * 100) / 100;

    if (overrideAmount <= 0) continue;

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
  deductStockOnComplete,
  restoreStockOnCancel,
  recalculateCommission,
  calculateItemCommission,
  updateLoyaltyPoints
};
