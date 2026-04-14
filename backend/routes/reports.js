const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const { getPool } = require('../config/db');
const {
  getReturnRevenueAndOrdersByMonthYear,
  getReturnRevenueByRange,
  getReturnOrdersCountByRange,
  getReturnCommissionByMonthYear,
  getReturnCommissionByRange,
} = require('../services/returnMetrics');
const { getCommissionMonthKpi } = require('../services/commissionKpi');

router.get('/dashboard', auth, async (req, res, next) => {
  try {
    const pool = await getPool();
    const now = new Date();
    const y = now.getFullYear(), m = now.getMonth();
    const firstDayThisMonth = new Date(y, m, 1);
    const firstDayLastMonth = new Date(y, m - 1, 1);
    const lastDayLastMonth  = new Date(y, m, 0);
    const todayStart = new Date(y, m, now.getDate());
    const isSales = !!req.user.scope_own_data;
    const uid = req.user.id;

    // Helper: build salesperson filter
    const spFilter = isSales ? ' AND salesperson_id = ?' : '';
    const spParam  = isSales ? [uid] : [];
    const spFilterOrdersAlias = isSales ? ' AND o.salesperson_id = ?' : '';
    const spFilterOrdersAliasParam = isSales ? [uid] : [];

    const salespersonIdForScope = isSales ? uid : null;

    // Doanh thu = tổng tiền bán hàng (orders.subtotal / Tạm tính), không dùng total_amount (thu khách).
    // Không cộng đơn đã hủy.
    // ── Tháng này ──
    const [thisMonth] = await pool.query(
      `SELECT COUNT(*) as total_orders,
              COALESCE(SUM(CASE WHEN status != 'cancelled' THEN subtotal ELSE 0 END),0) as revenue,
              COALESCE(SUM(CASE WHEN status='completed' THEN subtotal END),0) as completed_revenue
       FROM orders WHERE created_at >= ? AND created_at < ?${spFilter}`,
      [firstDayThisMonth, new Date(y, m+1, 1), ...spParam]
    );
    const revReturns = await getReturnRevenueByRange(pool, {
      from: firstDayThisMonth,
      to: new Date(y, m + 1, 1),
      salespersonId: salespersonIdForScope,
    });
    const returnOrdersThisMonth = await getReturnOrdersCountByRange(pool, {
      from: firstDayThisMonth,
      to: new Date(y, m + 1, 1),
      salespersonId: salespersonIdForScope,
    });

    // ── Tháng trước ──
    const [lastMonth] = await pool.query(
      `SELECT COALESCE(SUM(CASE WHEN status != 'cancelled' THEN subtotal ELSE 0 END),0) as revenue
       FROM orders WHERE created_at >= ? AND created_at <= ?${spFilter}`,
      [firstDayLastMonth, lastDayLastMonth, ...spParam]
    );
    // last month: inclusive end in old code — keep behavior by using < firstDayThisMonth
    const revLastReturns = await getReturnRevenueByRange(pool, {
      from: firstDayLastMonth,
      to: firstDayThisMonth,
      salespersonId: salespersonIdForScope,
    });

    // ── Hôm nay ──
    const [today] = await pool.query(
      `SELECT COUNT(*) as total_orders,
              COALESCE(SUM(CASE WHEN status != 'cancelled' THEN subtotal ELSE 0 END),0) as revenue
       FROM orders WHERE created_at >= ?${spFilter}`,
      [todayStart, ...spParam]
    );
    const revTodayReturns = await getReturnRevenueByRange(pool, {
      from: todayStart,
      to: null,
      salespersonId: salespersonIdForScope,
    });
    const returnOrdersToday = await getReturnOrdersCountByRange(pool, {
      from: todayStart,
      to: null,
      salespersonId: salespersonIdForScope,
    });

    // ── Đơn theo trạng thái (tháng này) ──
    const [statusStats] = await pool.query(
      `SELECT status, COUNT(*) as cnt FROM orders
       WHERE created_at >= ?${spFilter} GROUP BY status`,
      [firstDayThisMonth, ...spParam]
    );
    const byStatus = { pending:0, shipping:0, completed:0, cancelled:0 };
    statusStats.forEach(r => { if (byStatus[r.status] !== undefined) byStatus[r.status] = r.cnt; });

    // ── Hoa hồng tháng này — KPI thống nhất: phát sinh theo commissions.created_at (commissionKpi.js) ──

    // ── Hoa hồng hoàn (commission_adjustments) ──
    const returnCommissionThisMonth = await getReturnCommissionByRange(pool, {
      from: firstDayThisMonth,
      to: new Date(y, m + 1, 1),
      userId: isSales ? uid : null,
    });
    const returnCommissionToday = await getReturnCommissionByRange(pool, {
      from: todayStart,
      to: null,
      userId: isSales ? uid : null,
    });

    // ── Ship KH trả + NV chịu + Tổng lương (tháng) ──
    let totalKhachShip = 0;
    let totalNvChiu = 0;
    const totalReturnCommMonth = returnCommissionThisMonth || 0; // negative

    const monthKpi = isSales
      ? await getCommissionMonthKpi(pool, { month: m + 1, year: y, userId: uid })
      : await getCommissionMonthKpi(pool, { month: m + 1, year: y });
    const directGrossMonth = monthKpi.directGross;
    const overrideNetMonth = monthKpi.overrideNet;
    const totalCommGrossMonth = monthKpi.totalHH;

    if (isSales) {
      const [shipNvMonth] = await pool.query(
        `SELECT
           COALESCE(SUM(CASE WHEN o.ship_payer = 'shop' THEN 0 ELSE o.shipping_fee END), 0) AS total_khach_ship,
           COALESCE(SUM(o.salesperson_absorbed_amount), 0) AS total_nv_chiu
         FROM orders o
         WHERE MONTH(o.created_at) = ? AND YEAR(o.created_at) = ?
           AND o.status != 'cancelled'
           AND o.salesperson_id = ?`,
        [m + 1, y, uid]
      );
      totalKhachShip = parseFloat(shipNvMonth[0].total_khach_ship) || 0;
      totalNvChiu = parseFloat(shipNvMonth[0].total_nv_chiu) || 0;
    } else {
      const [salesIdsRows] = await pool.query(
        `SELECT u.id
         FROM users u
         JOIN roles r ON u.role_id = r.id
         WHERE r.code='sales' AND u.is_active=1`
      );
      const salesIds = (salesIdsRows || [])
        .map(r => parseInt(r.id, 10))
        .filter(n => Number.isFinite(n));
      if (salesIds.length) {
        const inSales = `IN (${salesIds.map(() => '?').join(',')})`;
        const [[shipAgg]] = await pool.query(
          `SELECT
             COALESCE(SUM(CASE WHEN o.ship_payer='shop' THEN 0 ELSE o.shipping_fee END),0) AS total_khach_ship,
             COALESCE(SUM(o.salesperson_absorbed_amount),0) AS total_nv_chiu
           FROM orders o
           WHERE MONTH(o.created_at)=? AND YEAR(o.created_at)=?
             AND o.status!='cancelled'
             AND o.salesperson_id ${inSales}`,
          [m + 1, y, ...salesIds]
        );
        totalKhachShip = parseFloat(shipAgg?.total_khach_ship) || 0;
        totalNvChiu = parseFloat(shipAgg?.total_nv_chiu) || 0;
      }
    }

    // Tổng lương = Tổng HH − Tổng HH hoàn + Ship KH Trả − NV chịu (cùng nguồn HH với KPI thẻ)
    const totalLuongMonth =
      totalCommGrossMonth - Math.abs(totalReturnCommMonth) + totalKhachShip - totalNvChiu;

    // ── Khách hàng ──
    const custFilter = isSales ? ' AND created_by = ?' : '';
    const [custTotal] = await pool.query(
      `SELECT COUNT(*) as total FROM customers WHERE 1=1${custFilter}`,
      isSales ? [uid] : []
    );
    const [custNew] = await pool.query(
      `SELECT COUNT(*) as total FROM customers WHERE created_at >= ?${custFilter}`,
      [firstDayThisMonth, ...(isSales ? [uid] : [])]
    );

    // ── Sản phẩm ──
    const [products] = await pool.query(
      'SELECT COUNT(*) as total FROM products WHERE is_active=1'
    );

    // ── Đơn gần đây ──
    const [recentOrders] = await pool.query(
      `SELECT o.id, o.code, o.total_amount, o.subtotal, o.status, o.created_at,
              c.name as customer_name, u.full_name as salesperson_name
       FROM orders o
       LEFT JOIN customers c ON o.customer_id = c.id
       LEFT JOIN users u ON o.salesperson_id = u.id
       WHERE 1=1${spFilter}
       ORDER BY o.created_at DESC LIMIT 8`,
      spParam
    );

    // ── Top sản phẩm tháng này ──
    const [topProducts] = await pool.query(
      `SELECT p.name, p.sku, SUM(oi.qty) as total_sold, SUM(oi.subtotal) as revenue
       FROM order_items oi
       JOIN products p ON oi.product_id = p.id
       JOIN orders o ON oi.order_id = o.id
       WHERE o.created_at >= ?${spFilter} AND o.status != 'cancelled'
       GROUP BY p.id, p.name, p.sku
       ORDER BY revenue DESC LIMIT 5`,
      [firstDayThisMonth, ...spParam]
    );

    // ── Top nhân viên tháng này (admin only) ──
    let topSales = [];
    if (!isSales) {
      const [rows] = await pool.query(
        `SELECT
           u.id, u.full_name,
           COALESCE(o_stats.total_orders, 0) AS total_orders,
           COALESCE(o_stats.revenue, 0) AS revenue,
           COALESCE(d_comm.direct_comm, 0) AS direct_comm,
           COALESCE(o_comm.override_comm, 0) + COALESCE(o_adj.override_adj, 0) AS override_comm,
           COALESCE(d_comm.direct_comm, 0) + (COALESCE(o_comm.override_comm, 0) + COALESCE(o_adj.override_adj, 0)) AS total_comm
         FROM users u
         JOIN roles r ON u.role_id = r.id
         LEFT JOIN (
           SELECT salesperson_id,
                  COUNT(*) AS total_orders,
                  COALESCE(SUM(subtotal), 0) AS revenue
           FROM orders
           WHERE MONTH(created_at)=? AND YEAR(created_at)=?
             AND status != 'cancelled'
           GROUP BY salesperson_id
         ) o_stats ON o_stats.salesperson_id = u.id
         LEFT JOIN (
           SELECT c.user_id, COALESCE(SUM(c.commission_amount), 0) AS direct_comm
           FROM commissions c
           JOIN orders o ON c.order_id = o.id
           WHERE MONTH(c.created_at)=? AND YEAR(c.created_at)=?
             AND c.type='direct' AND o.status != 'cancelled'
           GROUP BY c.user_id
         ) d_comm ON d_comm.user_id = u.id
         LEFT JOIN (
           SELECT c.user_id, COALESCE(SUM(c.commission_amount), 0) AS override_comm
           FROM commissions c
           JOIN orders o ON c.order_id = o.id
           WHERE MONTH(c.created_at)=? AND YEAR(c.created_at)=?
             AND c.type='override' AND o.status != 'cancelled'
           GROUP BY c.user_id
         ) o_comm ON o_comm.user_id = u.id
         LEFT JOIN (
           SELECT ca.user_id, COALESCE(SUM(ca.amount), 0) AS override_adj
           FROM commission_adjustments ca
           WHERE MONTH(ca.created_at)=? AND YEAR(ca.created_at)=?
             AND ca.type='override'
           GROUP BY ca.user_id
         ) o_adj ON o_adj.user_id = u.id
         WHERE r.code='sales' AND u.is_active=1
         ORDER BY total_comm DESC
         LIMIT 5`,
        [m + 1, y, m + 1, y, m + 1, y, m + 1, y]
      );
      topSales = rows.map(r => ({
        ...r,
        total_orders:  parseInt(r.total_orders) || 0,
        revenue:       parseFloat(r.revenue) || 0,
        direct_comm:   parseFloat(r.direct_comm) || 0,
        override_comm: parseFloat(r.override_comm) || 0,
        total_comm:    parseFloat(r.total_comm) || 0,
      }));
    }

    // values computed above via shared helper

    // Dashboard: hiển thị doanh thu bán hàng (gross). Hoàn hàng hiển thị KPI riêng.
    const rev      = (parseFloat(thisMonth[0].revenue) || 0);
    const revLast  = (parseFloat(lastMonth[0].revenue) || 0);
    const revChange = revLast > 0 ? ((rev - revLast) / revLast * 100).toFixed(1) : null;

    res.json({
      data: {
        thisMonth: {
          revenue:           rev,
          completed_revenue: (parseFloat(thisMonth[0].completed_revenue) || 0),
          total_orders:      parseInt(thisMonth[0].total_orders) || 0,
          revenue_change:    revChange,
          return_revenue:    revReturns,
          return_commission: returnCommissionThisMonth || 0,
          return_orders:     returnOrdersThisMonth,
        },
        lastMonth: { revenue: revLast },
        today: {
          revenue:      (parseFloat(today[0].revenue) || 0),
          total_orders: parseInt(today[0].total_orders) || 0,
          return_revenue:    revTodayReturns,
          return_commission: returnCommissionToday || 0,
          return_orders:     returnOrdersToday,
        },
        byStatus,
        commission: {
          direct:   directGrossMonth,
          override: overrideNetMonth,
          total:    totalCommGrossMonth,
        },
        luongMonth: {
          total_khach_ship: totalKhachShip,
          total_nv_chiu:    totalNvChiu,
          total_luong:      totalLuongMonth,
        },
        customers: {
          total: parseInt(custTotal[0].total) || 0,
          new:   parseInt(custNew[0].total) || 0,
        },
        products: { total: parseInt(products[0].total) || 0 },
        recentOrders: recentOrders.map(o => ({
          ...o,
          total_amount: parseFloat(o.total_amount) || 0,
          subtotal: parseFloat(o.subtotal) || 0,
        })),
        topProducts: topProducts.map(p => ({
          ...p,
          total_sold: parseFloat(p.total_sold) || 0,
          revenue:    parseFloat(p.revenue) || 0,
        })),
        topSales,
      }
    });
  } catch (err) {
    next(err);
  }
});

router.get('/salary', auth, async (req, res, next) => {
  try {
    const pool = await getPool();
    const { month, year, group_id } = req.query;

    const currentMonth = month || new Date().getMonth() + 1;
    const currentYear = year || new Date().getFullYear();

    // Lọc theo "Nhóm BH" của đơn hàng (orders.group_id), KHÔNG dựa trên user_groups.
    // Vì báo cáo hoa hồng theo nhóm đang hiển thị theo o.group_id (CommissionReport).
    const groupId = group_id ? parseInt(group_id) : null;
    const orderGroupCond = groupId ? ' AND o.group_id = ?' : '';
    // Khi lọc theo nhóm: chỉ lấy NV có đơn thuộc nhóm trong kỳ (tránh lẫn NV không liên quan).
    // (Giữ behavior cũ: danh sách NV chỉ hiện khi có doanh số kỳ.)
    const ordersExistsCond =
      groupId != null
        ? ' AND EXISTS (SELECT 1 FROM orders o2 WHERE o2.salesperson_id = u.id AND MONTH(o2.created_at) = ? AND YEAR(o2.created_at) = ? AND o2.group_id = ?)'
        : '';
    const [salesData] = await pool.query(
      `SELECT
        u.id,
        u.full_name,
        u.commission_rate,
        u.salary,
        COALESCE(o_stats.total_orders, 0) as total_orders,
        COALESCE(o_stats.total_sales, 0) - COALESCE(r_stats.total_returns, 0) as total_sales,
        COALESCE(c_direct.direct_commission, 0) as direct_commission,
        COALESCE(a_direct.direct_adjustment, 0) as direct_adjustment,
        COALESCE(c_direct.direct_commission, 0) + COALESCE(a_direct.direct_adjustment, 0) as total_commission,
        COALESCE(c_override.override_commission, 0) + COALESCE(a_override.override_adjustment, 0) as override_commission,
        COALESCE(c_direct.direct_commission, 0) + COALESCE(a_direct.direct_adjustment, 0)
          + COALESCE(c_override.override_commission, 0) + COALESCE(a_override.override_adjustment, 0) as total_all_commission,
        COALESCE(ship_nv.total_khach_ship, 0) as total_khach_ship,
        COALESCE(ship_nv.total_nv_chiu, 0) as total_nv_chiu
       FROM users u
       JOIN roles r ON u.role_id = r.id
       LEFT JOIN (
         SELECT salesperson_id,
                COUNT(*) as total_orders,
                SUM(subtotal) as total_sales
         FROM orders
         WHERE MONTH(created_at) = ?
           AND YEAR(created_at) = ?
           AND status != 'cancelled'
           ${groupId ? ' AND group_id = ?' : ''}
         GROUP BY salesperson_id
       ) o_stats ON u.id = o_stats.salesperson_id
       LEFT JOIN (
         SELECT
           o.salesperson_id,
           COALESCE(SUM(ri.qty * ((oi.gross_total - oi.discount_total) / NULLIF(oi.qty_total, 0))), 0) AS total_returns
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
         WHERE MONTH(r.created_at) = ?
           AND YEAR(r.created_at) = ?
           ${groupId ? ' AND o.group_id = ?' : ''}
         GROUP BY o.salesperson_id
       ) r_stats ON u.id = r_stats.salesperson_id
       LEFT JOIN (
         SELECT c.user_id, SUM(c.commission_amount) as direct_commission
         FROM commissions c
         JOIN orders o ON c.order_id = o.id
         WHERE MONTH(c.created_at) = ?
           AND YEAR(c.created_at) = ?
           AND c.type = 'direct'
           ${orderGroupCond}
         GROUP BY c.user_id
       ) c_direct ON u.id = c_direct.user_id
       LEFT JOIN (
         SELECT ca.user_id, SUM(ca.amount) as direct_adjustment
         FROM commission_adjustments ca
         JOIN orders o ON ca.order_id = o.id
         WHERE MONTH(ca.created_at) = ?
           AND YEAR(ca.created_at) = ?
           AND ca.type = 'direct'
           AND ca.user_id = o.salesperson_id
           ${orderGroupCond}
         GROUP BY ca.user_id
       ) a_direct ON u.id = a_direct.user_id
       LEFT JOIN (
         SELECT c.user_id, SUM(c.commission_amount) as override_commission
         FROM commissions c
         JOIN orders o ON c.order_id = o.id
         WHERE MONTH(c.created_at) = ?
           AND YEAR(c.created_at) = ?
           AND c.type = 'override'
           ${orderGroupCond}
         GROUP BY c.user_id
       ) c_override ON u.id = c_override.user_id
       LEFT JOIN (
         SELECT ca.user_id, SUM(ca.amount) as override_adjustment
         FROM commission_adjustments ca
         JOIN orders o ON ca.order_id = o.id
         WHERE MONTH(ca.created_at) = ?
           AND YEAR(ca.created_at) = ?
           AND ca.type = 'override'
           ${orderGroupCond}
         GROUP BY ca.user_id
       ) a_override ON u.id = a_override.user_id
       LEFT JOIN (
         SELECT salesperson_id,
                COALESCE(SUM(CASE WHEN ship_payer = 'shop' THEN 0 ELSE shipping_fee END), 0) AS total_khach_ship,
                COALESCE(SUM(salesperson_absorbed_amount), 0) AS total_nv_chiu
         FROM orders
         WHERE MONTH(created_at) = ?
           AND YEAR(created_at) = ?
           AND status != 'cancelled'
           ${groupId ? ' AND group_id = ?' : ''}
         GROUP BY salesperson_id
       ) ship_nv ON u.id = ship_nv.salesperson_id
       WHERE r.code = 'sales' AND u.is_active = 1
       ${ordersExistsCond}
       AND COALESCE(o_stats.total_orders, 0) > 0
       ORDER BY total_sales DESC`,
      [
        // o_stats
        currentMonth, currentYear, ...(groupId ? [groupId] : []),
        // r_stats
        currentMonth, currentYear, ...(groupId ? [groupId] : []),
        // c_direct
        currentMonth, currentYear, ...(groupId ? [groupId] : []),
        // a_direct
        currentMonth, currentYear, ...(groupId ? [groupId] : []),
        // c_override
        currentMonth, currentYear, ...(groupId ? [groupId] : []),
        // a_override
        currentMonth, currentYear, ...(groupId ? [groupId] : []),
        // ship_nv — chỉ theo NV phụ trách đơn (salesperson_id), không nhân cho người chỉ HH override
        currentMonth, currentYear, ...(groupId ? [groupId] : []),
        // EXISTS filter
        ...(groupId ? [currentMonth, currentYear, groupId] : []),
      ]
    );

    // KPI “Số đơn hàng” (Admin): đếm theo orders, không phụ thuộc user active/role
    const [[ordersAll]] = await pool.query(
      `SELECT COUNT(*) AS total_orders
       FROM orders o
       WHERE MONTH(o.created_at) = ?
         AND YEAR(o.created_at) = ?
         AND o.status != 'cancelled'
         ${groupId ? ' AND o.group_id = ?' : ''}`,
      [currentMonth, currentYear, ...(groupId ? [groupId] : [])]
    );

    // Convert DECIMAL strings to numbers
    const formattedSalesData = salesData.map(s => {
      const totalAll = parseFloat(s.total_all_commission) || 0;
      const khach = parseFloat(s.total_khach_ship) || 0;
      const nv = parseFloat(s.total_nv_chiu) || 0;
      return {
        ...s,
        total_orders: parseInt(s.total_orders) || 0,
        total_sales: parseFloat(s.total_sales) || 0,
        direct_commission: parseFloat(s.direct_commission) || 0,
        direct_adjustment: parseFloat(s.direct_adjustment) || 0,
        total_commission: parseFloat(s.total_commission) || 0,
        override_commission: parseFloat(s.override_commission) || 0,
        total_all_commission: totalAll,
        total_khach_ship: khach,
        total_nv_chiu: nv,
        total_luong: totalAll + khach - nv,
        salary: parseFloat(s.salary) || 0,
        commission_rate: parseFloat(s.commission_rate) || 0,
      };
    });

    const totalSales = formattedSalesData.reduce((sum, s) => sum + s.total_sales, 0);
    const totalCommission = formattedSalesData.reduce((sum, s) => sum + s.total_all_commission, 0);

    const cm = parseInt(String(currentMonth), 10);
    const cy = parseInt(String(currentYear), 10);
    const kpiTotals = await getCommissionMonthKpi(pool, {
      month: cm,
      year: cy,
      groupId: Number.isFinite(groupId) ? groupId : null,
    });

    res.json({
      data: {
        salesData: formattedSalesData,
        summary: {
          totalSales,
          totalCommission,
          totalOrdersAll: parseInt(ordersAll?.total_orders) || 0,
          totalEmployees: formattedSalesData.length,
          kpi_direct_gross: kpiTotals.directGross,
          kpi_override_net: kpiTotals.overrideNet,
          kpi_total_hh: kpiTotals.totalHH,
        }
      }
    });
  } catch (err) {
    next(err);
  }
});

// Revenue report (gross) — giống Dashboard: doanh số bán gross, hoàn tách riêng.
// GET /api/reports/revenue?month=MM&year=YYYY&group_id=
router.get('/revenue', auth, async (req, res, next) => {
  try {
    const pool = await getPool();
    const { month, year, group_id } = req.query;

    const currentMonth = month || new Date().getMonth() + 1;
    const currentYear = year || new Date().getFullYear();

    const groupId = group_id ? parseInt(group_id) : null;
    const orderGroupCond = groupId ? ' AND o.group_id = ?' : '';
    const ordersExistsCond =
      groupId != null
        ? ' AND EXISTS (SELECT 1 FROM orders o2 WHERE o2.salesperson_id = u.id AND MONTH(o2.created_at) = ? AND YEAR(o2.created_at) = ? AND o2.group_id = ?)'
        : '';

    const [salesData] = await pool.query(
      `SELECT
        u.id,
        u.full_name,
        u.commission_rate,
        u.salary,
        COALESCE(o_stats.total_orders, 0) as total_orders,
        COALESCE(o_stats.total_sales, 0) as total_sales,
        COALESCE(c_direct.direct_commission, 0) as total_commission,
        COALESCE(c_override.override_commission, 0) as override_commission,
        COALESCE(c_direct.direct_commission, 0) + COALESCE(c_override.override_commission, 0) as total_all_commission,
        COALESCE(ship_nv.total_khach_ship, 0) as total_khach_ship,
        COALESCE(ship_nv.total_nv_chiu, 0) as total_nv_chiu,
        COALESCE(r_stats.total_returns, 0) as total_returns
       FROM users u
       LEFT JOIN (
         SELECT salesperson_id,
                COUNT(*) as total_orders,
                SUM(subtotal) as total_sales
         FROM orders
         WHERE MONTH(created_at) = ?
           AND YEAR(created_at) = ?
           AND status != 'cancelled'
           ${groupId ? ' AND group_id = ?' : ''}
         GROUP BY salesperson_id
       ) o_stats ON u.id = o_stats.salesperson_id
       LEFT JOIN (
         SELECT
           o.salesperson_id,
           COALESCE(SUM(ri.qty * ((oi.gross_total - oi.discount_total) / NULLIF(oi.qty_total, 0))), 0) AS total_returns
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
         WHERE MONTH(r.created_at) = ?
           AND YEAR(r.created_at) = ?
           ${groupId ? ' AND o.group_id = ?' : ''}
         GROUP BY o.salesperson_id
       ) r_stats ON u.id = r_stats.salesperson_id
       LEFT JOIN (
         SELECT c.user_id, SUM(c.commission_amount) as direct_commission
         FROM commissions c
         JOIN orders o ON c.order_id = o.id
         WHERE MONTH(o.created_at) = ?
           AND YEAR(o.created_at) = ?
           AND c.type = 'direct'
           ${orderGroupCond}
         GROUP BY c.user_id
       ) c_direct ON u.id = c_direct.user_id
       LEFT JOIN (
         SELECT c.user_id, SUM(c.commission_amount) as override_commission
         FROM commissions c
         JOIN orders o ON c.order_id = o.id
         WHERE MONTH(o.created_at) = ?
           AND YEAR(o.created_at) = ?
           AND c.type = 'override'
           ${orderGroupCond}
         GROUP BY c.user_id
       ) c_override ON u.id = c_override.user_id
       LEFT JOIN (
         SELECT salesperson_id,
                COALESCE(SUM(CASE WHEN ship_payer = 'shop' THEN 0 ELSE shipping_fee END), 0) AS total_khach_ship,
                COALESCE(SUM(salesperson_absorbed_amount), 0) AS total_nv_chiu
         FROM orders
         WHERE MONTH(created_at) = ?
           AND YEAR(created_at) = ?
           AND status != 'cancelled'
           ${groupId ? ' AND group_id = ?' : ''}
         GROUP BY salesperson_id
       ) ship_nv ON u.id = ship_nv.salesperson_id
       WHERE COALESCE(o_stats.total_sales, 0) > 0
       ORDER BY total_sales DESC`,
      [
        // o_stats
        currentMonth, currentYear, ...(groupId ? [groupId] : []),
        // r_stats
        currentMonth, currentYear, ...(groupId ? [groupId] : []),
        // c_direct
        currentMonth, currentYear, ...(groupId ? [groupId] : []),
        // c_override
        currentMonth, currentYear, ...(groupId ? [groupId] : []),
        // ship_nv
        currentMonth, currentYear, ...(groupId ? [groupId] : []),
      ]
    );

    const formatted = salesData.map(s => {
      const totalAll = parseFloat(s.total_all_commission) || 0;
      const khach = parseFloat(s.total_khach_ship) || 0;
      const nv = parseFloat(s.total_nv_chiu) || 0;
      return {
        ...s,
        total_orders: parseInt(s.total_orders) || 0,
        total_sales: parseFloat(s.total_sales) || 0,
        total_returns: parseFloat(s.total_returns) || 0,
        total_commission: parseFloat(s.total_commission) || 0,
        override_commission: parseFloat(s.override_commission) || 0,
        total_all_commission: totalAll,
        total_khach_ship: khach,
        total_nv_chiu: nv,
        total_luong: totalAll + khach - nv,
        salary: parseFloat(s.salary) || 0,
        commission_rate: parseFloat(s.commission_rate) || 0,
      };
    });

    // Summary totals should match Dashboard (gross, not subtract returns)
    const summaryConds = ['MONTH(o.created_at) = ?', 'YEAR(o.created_at) = ?', "o.status != 'cancelled'"];
    const summaryParams = [parseInt(currentMonth), parseInt(currentYear)];
    if (groupId != null) {
      summaryConds.push('o.group_id = ?');
      summaryParams.push(groupId);
    }

    const [[salesSum]] = await pool.query(
      `SELECT COALESCE(SUM(o.subtotal), 0) AS total_sales
       FROM orders o
       WHERE ${summaryConds.join(' AND ')}`,
      summaryParams
    );
    const [[commSum]] = await pool.query(
      `SELECT COALESCE(SUM(c.commission_amount), 0) AS total_commission
       FROM commissions c
       JOIN orders o ON c.order_id = o.id
       WHERE ${summaryConds.join(' AND ')}`,
      summaryParams
    );
    const [[retSum]] = await pool.query(
      `SELECT COALESCE(SUM(ri.qty * ((oi.gross_total - oi.discount_total) / NULLIF(oi.qty_total, 0))), 0) AS total_returns
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
       WHERE MONTH(r.created_at) = ? AND YEAR(r.created_at) = ?${groupId != null ? ' AND o.group_id = ?' : ''}`,
      groupId != null
        ? [parseInt(currentMonth), parseInt(currentYear), groupId]
        : [parseInt(currentMonth), parseInt(currentYear)]
    );

    const totalSales = parseFloat(salesSum?.total_sales) || 0;
    const totalCommission = parseFloat(commSum?.total_commission) || 0;
    const totalReturns = parseFloat(retSum?.total_returns) || 0;

    res.json({
      data: {
        salesData: formatted,
        summary: {
          totalSales,
          totalCommission,
          totalReturns,
          totalEmployees: formatted.length,
        },
      },
    });
  } catch (err) {
    next(err);
  }
});

// Returns summary for commission period filters
// GET /api/reports/returns-summary?month=MM&year=YYYY&group_id=&user_id=
router.get('/returns-summary', auth, async (req, res, next) => {
  try {
    const pool = await getPool();
    const { month, year, group_id, user_id } = req.query;
    const m = month ? parseInt(String(month), 10) : null;
    const y = year ? parseInt(String(year), 10) : null;
    const groupId = group_id ? parseInt(String(group_id), 10) : null;

    const isSales = !!req.user.scope_own_data;
    const targetUserId =
      isSales ? req.user.id : (user_id != null && String(user_id).trim() !== '' ? parseInt(String(user_id), 10) : null);

    if (!m || !y) return res.status(400).json({ error: 'Thiếu month/year' });
    const ret = await getReturnRevenueAndOrdersByMonthYear(pool, {
      month: m,
      year: y,
      salespersonId: targetUserId,
      groupId,
    });
    const returnCommission = await getReturnCommissionByMonthYear(pool, {
      month: m,
      year: y,
      userId: targetUserId,
      groupId,
    });

    res.json({
      data: {
        return_orders: ret.return_orders,
        return_revenue: ret.return_revenue,
        return_commission: returnCommission,
      }
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
