/**
 * Centralized return/commission-adjustment KPI queries.
 * Keep all aliasing consistent to avoid ambiguous-column bugs.
 */

function parseIntOrNull(v) {
  if (v == null) return null;
  const n = parseInt(String(v), 10);
  return Number.isFinite(n) ? n : null;
}

function buildMonthYearConds(alias, month, year) {
  const m = parseIntOrNull(month);
  const y = parseIntOrNull(year);
  if (!m || !y) throw new Error('Thiếu month/year');
  return {
    conds: [`MONTH(${alias}.created_at) = ?`, `YEAR(${alias}.created_at) = ?`],
    params: [m, y],
  };
}

function buildRangeConds(alias, from, to) {
  const conds = [];
  const params = [];
  if (from != null) { conds.push(`${alias}.created_at >= ?`); params.push(from); }
  if (to != null)   { conds.push(`${alias}.created_at < ?`);  params.push(to); }
  return { conds, params };
}

function buildOrderScopedFilters({ orderAlias = 'o', salespersonId = null, groupId = null, shopId = null }) {
  const conds = [];
  const params = [];
  if (shopId != null) { conds.push(`${orderAlias}.shop_id = ?`); params.push(shopId); }
  if (salespersonId != null) { conds.push(`${orderAlias}.salesperson_id = ?`); params.push(salespersonId); }
  if (groupId != null) { conds.push(`${orderAlias}.group_id = ?`); params.push(groupId); }
  return { conds, params };
}

async function getReturnRevenueAndOrdersByMonthYear(pool, { month, year, salespersonId = null, groupId = null, shopId = null }) {
  // KPI theo kỳ tạo đơn (orders.created_at)
  const { conds, params } = buildMonthYearConds('o', month, year);
  const { conds: orderConds, params: orderParams } = buildOrderScopedFilters({
    orderAlias: 'o',
    salespersonId,
    groupId,
    shopId,
  });

  const whereConds = [...conds, ...orderConds];
  const whereParams = [...params, ...orderParams];

  const [rows] = await pool.query(
    `
    SELECT
      COUNT(DISTINCT r.id) AS return_orders,
      COALESCE(SUM(ri.qty * ((oi.gross_total - oi.discount_total) / NULLIF(oi.qty_total, 0))), 0) AS return_revenue
    FROM returns r
    JOIN orders o ON r.order_id = o.id
    JOIN return_items ri ON ri.return_id = r.id
    JOIN (
      SELECT order_id, product_id,
             SUM(qty) AS qty_total,
             SUM(unit_price * qty) AS gross_total,
             SUM(discount_amount) AS discount_total
      FROM order_items
      GROUP BY order_id, product_id
    ) oi ON oi.order_id = o.id AND oi.product_id = ri.product_id
    WHERE ${whereConds.join(' AND ')}
    `,
    whereParams
  );

  return {
    return_orders: parseInt(rows?.[0]?.return_orders, 10) || 0,
    return_revenue: parseFloat(rows?.[0]?.return_revenue) || 0,
  };
}

async function getReturnRevenueByRange(pool, { from, to, salespersonId = null, shopId = null }) {
  // KPI theo kỳ tạo đơn (orders.created_at)
  const { conds, params } = buildRangeConds('o', from, to);
  const { conds: orderConds, params: orderParams } = buildOrderScopedFilters({
    orderAlias: 'o',
    salespersonId,
    groupId: null,
    shopId,
  });
  const whereConds = [...conds, ...orderConds];
  const whereParams = [...params, ...orderParams];

  const [rows] = await pool.query(
    `
    SELECT
      COALESCE(SUM(ri.qty * ((oi.gross_total - oi.discount_total) / NULLIF(oi.qty_total, 0))), 0) AS return_revenue
    FROM returns r
    JOIN orders o ON r.order_id = o.id
    JOIN return_items ri ON ri.return_id = r.id
    JOIN (
      SELECT order_id, product_id,
             SUM(qty) AS qty_total,
             SUM(unit_price * qty) AS gross_total,
             SUM(discount_amount) AS discount_total
      FROM order_items
      GROUP BY order_id, product_id
    ) oi ON oi.order_id = o.id AND oi.product_id = ri.product_id
    WHERE ${whereConds.length ? whereConds.join(' AND ') : '1=1'}
    `,
    whereParams
  );

  return parseFloat(rows?.[0]?.return_revenue) || 0;
}

async function getReturnOrdersCountByRange(pool, { from, to, salespersonId = null, shopId = null }) {
  // KPI theo kỳ tạo đơn (orders.created_at)
  const { conds, params } = buildRangeConds('o', from, to);
  const { conds: orderConds, params: orderParams } = buildOrderScopedFilters({
    orderAlias: 'o',
    salespersonId,
    groupId: null,
    shopId,
  });
  const whereConds = [...conds, ...orderConds];
  const whereParams = [...params, ...orderParams];

  const [rows] = await pool.query(
    `
    SELECT COUNT(*) AS return_orders
    FROM returns r
    JOIN orders o ON r.order_id = o.id
    WHERE ${whereConds.length ? whereConds.join(' AND ') : '1=1'}
    `,
    whereParams
  );

  return parseInt(rows?.[0]?.return_orders, 10) || 0;
}

/**
 * Rule: Total return commission counts ONLY the salesperson's direct commission adjustments
 * (exclude override/CTV parts). Enforce by:
 * - ca.type = 'direct'
 * - ca.user_id = o.salesperson_id
 * - optional filters: userId (salesperson), groupId
 */
async function getReturnCommissionByMonthYear(pool, { month, year, userId = null, groupId = null, shopId = null }) {
  // KPI theo kỳ tạo đơn (orders.created_at)
  const { conds, params } = buildMonthYearConds('o', month, year);
  conds.push("ca.type = 'direct'");
  conds.push('ca.user_id = o.salesperson_id');
  if (shopId != null) { conds.push('o.shop_id = ?'); params.push(shopId); }
  if (userId != null) { conds.push('o.salesperson_id = ?'); params.push(userId); }
  if (groupId != null) { conds.push('o.group_id = ?'); params.push(groupId); }

  const [rows] = await pool.query(
    `
    SELECT COALESCE(SUM(ca.amount), 0) AS return_commission
    FROM commission_adjustments ca
    JOIN orders o ON ca.order_id = o.id
    WHERE ${conds.join(' AND ')}
    `,
    params
  );

  return parseFloat(rows?.[0]?.return_commission) || 0;
}

async function getReturnCommissionByRange(pool, { from, to, userId = null, shopId = null }) {
  // KPI theo kỳ tạo đơn (orders.created_at)
  const { conds, params } = buildRangeConds('o', from, to);
  conds.push("ca.type = 'direct'");
  conds.push('ca.user_id = o.salesperson_id');
  if (shopId != null) { conds.push('o.shop_id = ?'); params.push(shopId); }
  if (userId != null) { conds.push('o.salesperson_id = ?'); params.push(userId); }

  const [rows] = await pool.query(
    `
    SELECT COALESCE(SUM(ca.amount), 0) AS return_commission
    FROM commission_adjustments ca
    JOIN orders o ON ca.order_id = o.id
    WHERE ${conds.length ? conds.join(' AND ') : '1=1'}
    `,
    params
  );

  return parseFloat(rows?.[0]?.return_commission) || 0;
}

module.exports = {
  getReturnRevenueAndOrdersByMonthYear,
  getReturnRevenueByRange,
  getReturnOrdersCountByRange,
  getReturnCommissionByMonthYear,
  getReturnCommissionByRange,
};

