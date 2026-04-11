const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const authorize = require('../middleware/authorize');
const { getPool } = require('../config/db');

router.get('/', auth, async (req, res, next) => {
  try {
    const pool = await getPool();
    const { user_id, month, year, page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

    const conditions = ['1=1'];
    const params = [];

    if (req.user.scope_own_data) {
      conditions.push('t.user_id = ?');
      params.push(req.user.id);
    } else if (user_id) {
      conditions.push('t.user_id = ?');
      params.push(parseInt(user_id));
    }
    if (month) { conditions.push('MONTH(t.entry_date) = ?'); params.push(parseInt(month)); }
    if (year)  { conditions.push('YEAR(t.entry_date) = ?');  params.push(parseInt(year)); }

    const whereClause = 'WHERE ' + conditions.join(' AND ');

    const baseSelect = `
      SELECT
        t.id, t.order_id, t.user_id, t.type, t.ctv_user_id,
        t.commission_amount, t.entry_date as created_at,
        t.entry_kind,
        o.code as order_code, o.status, o.total_amount,
        u.full_name as salesperson_name,
        ctv.full_name as ctv_name
      FROM (
        SELECT
          c.id, c.order_id, c.user_id, c.type, c.ctv_user_id,
          c.commission_amount,
          c.created_at as entry_date,
          'commission' as entry_kind
        FROM commissions c
        UNION ALL
        SELECT
          ca.id, ca.order_id, ca.user_id, ca.type, ca.ctv_user_id,
          ca.amount as commission_amount,
          ca.created_at as entry_date,
          'adjustment' as entry_kind
        FROM commission_adjustments ca
      ) t
      JOIN orders o ON t.order_id = o.id
      JOIN users u ON t.user_id = u.id
      LEFT JOIN users ctv ON t.ctv_user_id = ctv.id
    `;

    const [rows] = await pool.query(
      `${baseSelect} ${whereClause} ORDER BY t.entry_date DESC LIMIT ? OFFSET ?`,
      [...params, parseInt(limit), parseInt(offset)]
    );

    const [countRows] = await pool.query(
      `SELECT COUNT(*) as total FROM (${baseSelect} ${whereClause}) x`,
      params
    );

    res.json({
      data: rows.map(row => ({
        ...row,
        commission_amount: parseFloat(row.commission_amount) || 0,
        total_amount: parseFloat(row.total_amount) || 0,
      })),
      total: countRows[0].total,
      page: parseInt(page),
      limit: parseInt(limit),
    });
  } catch (err) {
    next(err);
  }
});

router.get('/summary', auth, async (req, res, next) => {
  try {
    const pool = await getPool();
    const { user_id, month, year } = req.query;

    const conditions = ['1=1'];
    const params = [];
    if (req.user.scope_own_data) {
      conditions.push('t.user_id = ?');
      params.push(req.user.id);
    } else if (user_id) {
      conditions.push('t.user_id = ?');
      params.push(parseInt(user_id));
    }
    if (month) { conditions.push('MONTH(t.entry_date) = ?'); params.push(parseInt(month)); }
    if (year)  { conditions.push('YEAR(t.entry_date) = ?');  params.push(parseInt(year)); }
    const whereClause = 'WHERE ' + conditions.join(' AND ');

    const [summary] = await pool.query(
      `SELECT
        COUNT(DISTINCT t.order_id) as total_orders,
        COALESCE(SUM(t.amount), 0) as total_commission,
        COALESCE(AVG(t.amount), 0) as avg_commission
       FROM (
         SELECT order_id, user_id, commission_amount as amount, created_at as entry_date FROM commissions
         UNION ALL
         SELECT order_id, user_id, amount, created_at as entry_date FROM commission_adjustments
       ) t
       ${whereClause}`,
      params
    );

    res.json({ data: summary[0] });
  } catch (err) {
    next(err);
  }
});

router.get('/orders', auth, async (req, res, next) => {
  try {
    const pool = await getPool();
    const { month, year, group_id, page = 1, limit = 20 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    const conditions = ['1=1'];
    const baseParams = [];

    // Sales chỉ thấy direct commissions của chính mình (không hiển thị override/adjustment ở bảng này)
    if (req.user.scope_own_data) {
      conditions.push('t.user_id = ?');
      conditions.push("t.type = 'direct'");
      conditions.push("t.entry_kind = 'commission'");
      baseParams.push(req.user.id);
    }
    if (month)    { conditions.push('MONTH(t.entry_date) = ?'); baseParams.push(parseInt(month)); }
    if (year)     { conditions.push('YEAR(t.entry_date) = ?');  baseParams.push(parseInt(year)); }
    if (group_id) { conditions.push('o.group_id = ?');          baseParams.push(parseInt(group_id)); }

    const whereClause = 'WHERE ' + conditions.join(' AND ');

    const baseFrom = `
      FROM (
        SELECT
          c.id, c.order_id, c.user_id, c.type, c.ctv_user_id,
          c.commission_amount,
          o.created_at as order_date,
          c.created_at as entry_date,
          'commission' as entry_kind
        FROM commissions c
        JOIN orders o ON c.order_id = o.id
        UNION ALL
        SELECT
          ca.id, ca.order_id, ca.user_id, ca.type, ca.ctv_user_id,
          ca.amount as commission_amount,
          o.created_at as order_date,
          ca.created_at as entry_date,
          'adjustment' as entry_kind
        FROM commission_adjustments ca
        JOIN orders o ON ca.order_id = o.id
      ) t
      JOIN orders o ON t.order_id = o.id
      LEFT JOIN users ctv ON t.ctv_user_id = ctv.id
      LEFT JOIN groups g ON o.group_id = g.id
      LEFT JOIN customers cu ON o.customer_id = cu.id
    `;

    const [rows] = await pool.query(`
      SELECT * FROM (
        SELECT
          t.id, t.commission_amount, t.type, t.ctv_user_id, t.entry_kind,
          ctv.full_name as ctv_name,
          o.id as order_id, o.code as order_code,
          o.total_amount, o.status, t.entry_date as order_date,
          o.group_id, g.name as group_name,
          cu.name as customer_name,
          o.shipping_fee, o.ship_payer, o.salesperson_absorbed_amount,
          ROW_NUMBER() OVER (PARTITION BY t.order_id ORDER BY t.id) AS _ord_rn
        ${baseFrom}
        ${whereClause}
      ) z
      ORDER BY z.order_date DESC
      LIMIT ? OFFSET ?
    `, [...baseParams, parseInt(limit), offset]);

    const [countRows] = await pool.query(`
      SELECT COUNT(*) as total
      ${baseFrom}
      ${whereClause}
    `, baseParams);

    const [summaryRows] = await pool.query(`
      SELECT
        COALESCE(SUM(CASE WHEN t.type = 'direct'   THEN t.commission_amount ELSE 0 END), 0) as direct_commission,
        COALESCE(SUM(CASE WHEN t.type = 'override' THEN t.commission_amount ELSE 0 END), 0) as override_commission,
        COALESCE(SUM(t.commission_amount), 0) as total_commission,
        COUNT(DISTINCT CASE WHEN t.type = 'direct' AND t.entry_kind='commission' THEN t.order_id END) as total_orders
      ${baseFrom}
      ${whereClause}
    `, baseParams);

    const s = summaryRows[0];

    const [orderAggRows] = await pool.query(
      `
      SELECT
        COALESCE(SUM(CASE WHEN o.ship_payer = 'shop' THEN 0 ELSE o.shipping_fee END), 0) AS total_khach_ship,
        COALESCE(SUM(o.salesperson_absorbed_amount), 0) AS total_nv_chiu
      FROM orders o
      WHERE o.id IN (
        SELECT DISTINCT t.order_id
        ${baseFrom}
        ${whereClause}
      )
    `,
      baseParams
    );
    const oa = orderAggRows[0] || {};
    const totalKhachShip = parseFloat(oa.total_khach_ship) || 0;
    const totalNvChiu = parseFloat(oa.total_nv_chiu) || 0;
    const totalCommission = parseFloat(s.total_commission) || 0;
    const totalLuong = totalCommission + totalKhachShip - totalNvChiu;

    res.json({
      data: rows.map(row => {
        const comm = parseFloat(row.commission_amount) || 0;
        const khach =
          row.ship_payer === 'shop' ? 0 : parseFloat(row.shipping_fee) || 0;
        const nv = parseFloat(row.salesperson_absorbed_amount) || 0;
        const ordRn = parseInt(row._ord_rn, 10) || 1;
        const luong = ordRn === 1 ? comm + khach - nv : comm;
        const { _ord_rn, ...rest } = row;
        return {
          ...rest,
          commission_amount: comm,
          total_amount: parseFloat(row.total_amount) || 0,
          shipping_fee: parseFloat(row.shipping_fee) || 0,
          ship_payer: row.ship_payer === 'shop' ? 'shop' : 'customer',
          salesperson_absorbed_amount: nv,
          khach_tra_ship: ordRn === 1 ? khach : 0,
          nv_chiu_display: ordRn === 1 ? nv : 0,
          luong,
        };
      }),
      total: countRows[0].total,
      page: parseInt(page),
      limit: parseInt(limit),
      summary: {
        direct_commission: parseFloat(s.direct_commission) || 0,
        override_commission: parseFloat(s.override_commission) || 0,
        total_commission: totalCommission,
        total_orders: parseInt(s.total_orders) || 0,
        total_khach_ship: totalKhachShip,
        total_nv_chiu: totalNvChiu,
        total_luong: totalLuong,
      },
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
