const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const { getPool } = require('../config/db');

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

    // ── Tháng này ──
    const [thisMonth] = await pool.query(
      `SELECT COUNT(*) as total_orders,
              COALESCE(SUM(total_amount),0) as revenue,
              COALESCE(SUM(CASE WHEN status='completed' THEN total_amount END),0) as completed_revenue
       FROM orders WHERE created_at >= ? AND created_at < ?${spFilter}`,
      [firstDayThisMonth, new Date(y, m+1, 1), ...spParam]
    );

    // ── Tháng trước ──
    const [lastMonth] = await pool.query(
      `SELECT COALESCE(SUM(total_amount),0) as revenue
       FROM orders WHERE created_at >= ? AND created_at <= ?${spFilter}`,
      [firstDayLastMonth, lastDayLastMonth, ...spParam]
    );

    // ── Hôm nay ──
    const [today] = await pool.query(
      `SELECT COUNT(*) as total_orders, COALESCE(SUM(total_amount),0) as revenue
       FROM orders WHERE created_at >= ?${spFilter}`,
      [todayStart, ...spParam]
    );

    // ── Đơn theo trạng thái (tháng này) ──
    const [statusStats] = await pool.query(
      `SELECT status, COUNT(*) as cnt FROM orders
       WHERE created_at >= ?${spFilter} GROUP BY status`,
      [firstDayThisMonth, ...spParam]
    );
    const byStatus = { pending:0, shipping:0, completed:0, cancelled:0 };
    statusStats.forEach(r => { if (byStatus[r.status] !== undefined) byStatus[r.status] = r.cnt; });

    // ── Hoa hồng tháng này ──
    const commSpFilter = isSales ? ' AND c.user_id = ?' : '';
    const [commThis] = await pool.query(
      `SELECT
         COALESCE(SUM(CASE WHEN c.type='direct'   THEN c.commission_amount END),0) as direct_commission,
         COALESCE(SUM(CASE WHEN c.type='override' THEN c.commission_amount END),0) as override_commission
       FROM commissions c
       JOIN orders o ON c.order_id = o.id
       WHERE MONTH(o.created_at)=? AND YEAR(o.created_at)=?${commSpFilter}`,
      [m+1, y, ...(isSales ? [uid] : [])]
    );

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
      `SELECT o.id, o.code, o.total_amount, o.status, o.created_at,
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
        `SELECT u.id, u.full_name,
                COUNT(DISTINCT o.id) as total_orders,
                COALESCE(SUM(o.total_amount),0) as revenue,
                COALESCE(SUM(CASE WHEN c.type='direct' THEN c.commission_amount END),0) as direct_comm,
                COALESCE(SUM(CASE WHEN c.type='override' THEN c.commission_amount END),0) as override_comm
         FROM users u
         JOIN roles r ON u.role_id = r.id
         LEFT JOIN orders o ON o.salesperson_id = u.id AND MONTH(o.created_at)=? AND YEAR(o.created_at)=?
         LEFT JOIN commissions c ON c.order_id = o.id AND c.user_id = u.id
         WHERE r.code='sales' AND u.is_active=1
         GROUP BY u.id, u.full_name
         ORDER BY revenue DESC LIMIT 5`,
        [m+1, y]
      );
      topSales = rows.map(r => ({
        ...r,
        total_orders:    parseInt(r.total_orders) || 0,
        revenue:         parseFloat(r.revenue) || 0,
        direct_comm:     parseFloat(r.direct_comm) || 0,
        override_comm:   parseFloat(r.override_comm) || 0,
      }));
    }

    const rev      = parseFloat(thisMonth[0].revenue) || 0;
    const revLast  = parseFloat(lastMonth[0].revenue) || 0;
    const revChange = revLast > 0 ? ((rev - revLast) / revLast * 100).toFixed(1) : null;

    res.json({
      data: {
        thisMonth: {
          revenue:           rev,
          completed_revenue: parseFloat(thisMonth[0].completed_revenue) || 0,
          total_orders:      parseInt(thisMonth[0].total_orders) || 0,
          revenue_change:    revChange,
        },
        lastMonth: { revenue: revLast },
        today: {
          revenue:      parseFloat(today[0].revenue) || 0,
          total_orders: parseInt(today[0].total_orders) || 0,
        },
        byStatus,
        commission: {
          direct:   parseFloat(commThis[0].direct_commission) || 0,
          override: parseFloat(commThis[0].override_commission) || 0,
          total:    (parseFloat(commThis[0].direct_commission) || 0) + (parseFloat(commThis[0].override_commission) || 0),
        },
        customers: {
          total: parseInt(custTotal[0].total) || 0,
          new:   parseInt(custNew[0].total) || 0,
        },
        products: { total: parseInt(products[0].total) || 0 },
        recentOrders: recentOrders.map(o => ({
          ...o, total_amount: parseFloat(o.total_amount) || 0
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
    const ordersExistsCond = groupId
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
        COALESCE(ship_nv.total_nv_chiu, 0) as total_nv_chiu
       FROM users u
       JOIN roles r ON u.role_id = r.id
       LEFT JOIN (
         SELECT salesperson_id,
                COUNT(*) as total_orders,
                SUM(total_amount) as total_sales
         FROM orders
         WHERE MONTH(created_at) = ?
           AND YEAR(created_at) = ?
           ${groupId ? ' AND group_id = ?' : ''}
         GROUP BY salesperson_id
       ) o_stats ON u.id = o_stats.salesperson_id
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
           ${groupId ? ' AND group_id = ?' : ''}
         GROUP BY salesperson_id
       ) ship_nv ON u.id = ship_nv.salesperson_id
       WHERE r.code = 'sales' AND u.is_active = 1
       ${ordersExistsCond}
       ORDER BY total_sales DESC`,
      [
        // o_stats
        currentMonth, currentYear, ...(groupId ? [groupId] : []),
        // c_direct
        currentMonth, currentYear, ...(groupId ? [groupId] : []),
        // c_override
        currentMonth, currentYear, ...(groupId ? [groupId] : []),
        // ship_nv — chỉ theo NV phụ trách đơn (salesperson_id), không nhân cho người chỉ HH override
        currentMonth, currentYear, ...(groupId ? [groupId] : []),
        // EXISTS filter
        ...(groupId ? [currentMonth, currentYear, groupId] : []),
      ]
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

    res.json({
      data: {
        salesData: formattedSalesData,
        summary: {
          totalSales,
          totalCommission,
          totalEmployees: formattedSalesData.length
        }
      }
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
