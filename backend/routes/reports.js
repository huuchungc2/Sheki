const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const { getPool } = require('../config/db');

router.get('/dashboard', auth, async (req, res, next) => {
  try {
    const pool = await getPool();
    const now = new Date();
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);

    let orderWhere = 'WHERE created_at >= ?';
    let customerWhere = 'WHERE created_at >= ?';
    const orderParams = [firstDay];
    const customerParams = [firstDay];

    if (req.user.role === 'sales') {
      orderWhere += ' AND salesperson_id = ?';
      customerWhere += ' AND created_by = ?';
      orderParams.push(req.user.id);
      customerParams.push(req.user.id);
    }

    const [orders] = await pool.query(
      `SELECT COUNT(*) as total, COALESCE(SUM(total_amount), 0) as revenue FROM orders ${orderWhere}`,
      orderParams
    );

    const [customers] = await pool.query(
      `SELECT COUNT(*) as total FROM customers ${customerWhere}`,
      customerParams
    );

    const [products] = await pool.query('SELECT COUNT(*) as total FROM products WHERE is_active = 1');

    let recentWhere = '1=1';
    const recentParams = [];
    if (req.user.role === 'sales') {
      recentWhere = 'o.salesperson_id = ?';
      recentParams.push(req.user.id);
    }

    const [recentOrders] = await pool.query(
      `SELECT o.id, o.code, o.total_amount, o.status, c.name as customer_name, o.created_at
       FROM orders o
       LEFT JOIN customers c ON o.customer_id = c.id
       WHERE ${recentWhere}
       ORDER BY o.created_at DESC LIMIT 10`,
      recentParams
    );

    let topWhere = 'WHERE o.created_at >= ?';
    const topParams = [firstDay];
    if (req.user.role === 'sales') {
      topWhere += ' AND o.salesperson_id = ?';
      topParams.push(req.user.id);
    }

    const [topProducts] = await pool.query(
      `SELECT p.name, p.sku, SUM(oi.qty) as total_sold, SUM(oi.subtotal) as revenue
       FROM order_items oi
       JOIN products p ON oi.product_id = p.id
       JOIN orders o ON oi.order_id = o.id
       ${topWhere}
       GROUP BY p.id
       ORDER BY total_sold DESC
       LIMIT 5`,
      topParams
    );

    res.json({
      data: {
        orders: {
          ...orders[0],
          total: parseInt(orders[0].total) || 0,
          revenue: parseFloat(orders[0].revenue) || 0,
        },
        customers: {
          ...customers[0],
          total: parseInt(customers[0].total) || 0,
        },
        products: {
          ...products[0],
          total: parseInt(products[0].total) || 0,
        },
        recentOrders: recentOrders.map(o => ({
          ...o,
          total_amount: parseFloat(o.total_amount) || 0,
        })),
        topProducts: topProducts.map(p => ({
          ...p,
          total_sold: parseFloat(p.total_sold) || 0,
          revenue: parseFloat(p.revenue) || 0,
        }))
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

    let groupFilter = '';
    const params = [currentMonth, currentYear];
    if (group_id) {
      groupFilter = ' AND u.id IN (SELECT user_id FROM user_groups WHERE group_id = ?)';
      params.push(group_id);
    }

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
        COALESCE(c_direct.direct_commission, 0) + COALESCE(c_override.override_commission, 0) as total_all_commission
       FROM users u
       LEFT JOIN (
         SELECT salesperson_id,
                COUNT(*) as total_orders,
                SUM(total_amount) as total_sales
         FROM orders
         WHERE MONTH(created_at) = ?
           AND YEAR(created_at) = ?
         GROUP BY salesperson_id
       ) o_stats ON u.id = o_stats.salesperson_id
       LEFT JOIN (
         SELECT c.user_id, SUM(c.commission_amount) as direct_commission
         FROM commissions c
         JOIN orders o ON c.order_id = o.id
         WHERE MONTH(o.created_at) = ?
           AND YEAR(o.created_at) = ?
           AND c.type = 'direct'
         GROUP BY c.user_id
       ) c_direct ON u.id = c_direct.user_id
       LEFT JOIN (
         SELECT c.user_id, SUM(c.commission_amount) as override_commission
         FROM commissions c
         JOIN orders o ON c.order_id = o.id
         WHERE MONTH(o.created_at) = ?
           AND YEAR(o.created_at) = ?
           AND c.type = 'override'
         GROUP BY c.user_id
       ) c_override ON u.id = c_override.user_id
       WHERE u.role = 'sales' AND u.is_active = 1
       ${groupFilter}
       ORDER BY total_sales DESC`,
      [...params, ...params, ...params]
    );

    // Convert DECIMAL strings to numbers
    const formattedSalesData = salesData.map(s => ({
      ...s,
      total_orders: parseInt(s.total_orders) || 0,
      total_sales: parseFloat(s.total_sales) || 0,
      total_commission: parseFloat(s.total_commission) || 0,
      override_commission: parseFloat(s.override_commission) || 0,
      total_all_commission: parseFloat(s.total_all_commission) || 0,
      salary: parseFloat(s.salary) || 0,
      commission_rate: parseFloat(s.commission_rate) || 0,
    }));

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
