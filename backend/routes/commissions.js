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
    const { month, year, group_id, page = 1, limit = 20, user_id } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    const conditions = ['1=1'];
    const baseParams = [];

    // Sales: HH bán hàng (direct) + HH từ CTV (override cho user_id = mình). Không gồm adjustment ở bảng này.
    if (req.user.scope_own_data) {
      conditions.push('t.user_id = ?');
      conditions.push("(t.type = 'direct' OR t.type = 'override')");
      conditions.push("t.entry_kind = 'commission'");
      baseParams.push(req.user.id);
    } else if (user_id != null && String(user_id).trim() !== '') {
      // Admin: xem 1 nhân viên — cùng bộ lọc như «Hoa hồng của tôi» (bỏ qua nếu Sales gửi nhầm)
      const uid = parseInt(String(user_id), 10);
      if (!Number.isNaN(uid)) {
        conditions.push('t.user_id = ?');
        conditions.push("(t.type = 'direct' OR t.type = 'override')");
        conditions.push("t.entry_kind = 'commission'");
        baseParams.push(uid);
      }
    }
    // Cùng nghĩa Dashboard / Employee overview: kỳ lọc theo **tháng tạo đơn** (o.created_at), không theo thời điểm ghi commission
    if (month)    { conditions.push('MONTH(o.created_at) = ?'); baseParams.push(parseInt(month)); }
    if (year)     { conditions.push('YEAR(o.created_at) = ?');  baseParams.push(parseInt(year)); }
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
          t.id, t.user_id AS commission_user_id, t.commission_amount, t.type, t.ctv_user_id, t.entry_kind,
          ctv.full_name as ctv_name,
          o.id as order_id, o.code as order_code,
          o.salesperson_id AS order_salesperson_id,
          o.total_amount, o.status, t.entry_date as order_date,
          o.group_id, g.name as group_name,
          cu.name as customer_name,
          o.shipping_fee, o.ship_payer, o.salesperson_absorbed_amount,
          ROW_NUMBER() OVER (PARTITION BY t.order_id, t.user_id ORDER BY t.id) AS _user_ord_rn
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

    // Sales: tổng HH (direct / override) lấy trực tiếp từ `commissions` + `orders` — trùng GET /reports/dashboard.
    // Tránh SUM trên subquery UNION + JOIN (MySQL có thể làm sai phân nhánh override).
    let s;
    const parsedQueryUid = user_id != null && String(user_id).trim() !== ''
      ? parseInt(String(user_id), 10)
      : NaN;
    const adminEmployeeUid =
      !req.user.scope_own_data && !Number.isNaN(parsedQueryUid) ? parsedQueryUid : null;

    if (req.user.scope_own_data) {
      const summaryConds = ['c.user_id = ?'];
      const summaryParams = [req.user.id];
      if (month) {
        summaryConds.push('MONTH(o.created_at) = ?');
        summaryParams.push(parseInt(month, 10));
      }
      if (year) {
        summaryConds.push('YEAR(o.created_at) = ?');
        summaryParams.push(parseInt(year, 10));
      }
      if (group_id) {
        summaryConds.push('o.group_id = ?');
        summaryParams.push(parseInt(group_id, 10));
      }
      const [summaryRows] = await pool.query(
        `SELECT
          COALESCE(SUM(CASE WHEN c.type = 'direct'   THEN c.commission_amount ELSE 0 END), 0) AS direct_commission,
          COALESCE(SUM(CASE WHEN c.type = 'override' THEN c.commission_amount ELSE 0 END), 0) AS override_commission,
          COALESCE(SUM(c.commission_amount), 0) AS total_commission,
          COUNT(DISTINCT CASE WHEN c.type = 'direct' THEN c.order_id END) AS total_orders
         FROM commissions c
         INNER JOIN orders o ON c.order_id = o.id
         WHERE ${summaryConds.join(' AND ')}`,
        summaryParams
      );
      s = summaryRows[0];
    } else if (adminEmployeeUid != null) {
      const summaryConds = ['c.user_id = ?'];
      const summaryParams = [adminEmployeeUid];
      if (month) {
        summaryConds.push('MONTH(o.created_at) = ?');
        summaryParams.push(parseInt(month, 10));
      }
      if (year) {
        summaryConds.push('YEAR(o.created_at) = ?');
        summaryParams.push(parseInt(year, 10));
      }
      if (group_id) {
        summaryConds.push('o.group_id = ?');
        summaryParams.push(parseInt(group_id, 10));
      }
      const [summaryRows] = await pool.query(
        `SELECT
          COALESCE(SUM(CASE WHEN c.type = 'direct'   THEN c.commission_amount ELSE 0 END), 0) AS direct_commission,
          COALESCE(SUM(CASE WHEN c.type = 'override' THEN c.commission_amount ELSE 0 END), 0) AS override_commission,
          COALESCE(SUM(c.commission_amount), 0) AS total_commission,
          COUNT(DISTINCT CASE WHEN c.type = 'direct' THEN c.order_id END) AS total_orders
         FROM commissions c
         INNER JOIN orders o ON c.order_id = o.id
         WHERE ${summaryConds.join(' AND ')}`,
        summaryParams
      );
      s = summaryRows[0];
    } else {
      const [summaryRows] = await pool.query(
        `
      SELECT
        COALESCE(SUM(CASE WHEN t.type = 'direct'   THEN t.commission_amount ELSE 0 END), 0) as direct_commission,
        COALESCE(SUM(CASE WHEN t.type = 'override' THEN t.commission_amount ELSE 0 END), 0) as override_commission,
        COALESCE(SUM(t.commission_amount), 0) as total_commission,
        COUNT(DISTINCT CASE WHEN t.type = 'direct' AND t.entry_kind='commission' THEN t.order_id END) as total_orders
      ${baseFrom}
      ${whereClause}
    `,
        baseParams
      );
      s = summaryRows[0];
    }

    let totalKhachShip = 0;
    let totalNvChiu = 0;
    if (req.user.scope_own_data && month && year) {
      // Ship / NV chỉ theo đơn mình là salesperson (giống GET /reports/dashboard — không lấy ship đơn của CTV khi chỉ có override)
      const shipConds = [
        'MONTH(o.created_at) = ?',
        'YEAR(o.created_at) = ?',
        'o.salesperson_id = ?',
        "o.status <> 'cancelled'",
      ];
      const shipParams = [parseInt(month), parseInt(year), req.user.id];
      if (group_id) {
        shipConds.push('o.group_id = ?');
        shipParams.push(parseInt(group_id));
      }
      const [shipRows] = await pool.query(
        `SELECT
          COALESCE(SUM(CASE WHEN o.ship_payer = 'shop' THEN 0 ELSE o.shipping_fee END), 0) AS total_khach_ship,
          COALESCE(SUM(o.salesperson_absorbed_amount), 0) AS total_nv_chiu
        FROM orders o
        WHERE ${shipConds.join(' AND ')}`,
        shipParams
      );
      totalKhachShip = parseFloat(shipRows[0]?.total_khach_ship) || 0;
      totalNvChiu = parseFloat(shipRows[0]?.total_nv_chiu) || 0;
    } else if (adminEmployeeUid != null && month && year) {
      const shipConds = [
        'MONTH(o.created_at) = ?',
        'YEAR(o.created_at) = ?',
        'o.salesperson_id = ?',
        "o.status <> 'cancelled'",
      ];
      const shipParams = [parseInt(month, 10), parseInt(year, 10), adminEmployeeUid];
      if (group_id) {
        shipConds.push('o.group_id = ?');
        shipParams.push(parseInt(group_id, 10));
      }
      const [shipRows] = await pool.query(
        `SELECT
          COALESCE(SUM(CASE WHEN o.ship_payer = 'shop' THEN 0 ELSE o.shipping_fee END), 0) AS total_khach_ship,
          COALESCE(SUM(o.salesperson_absorbed_amount), 0) AS total_nv_chiu
        FROM orders o
        WHERE ${shipConds.join(' AND ')}`,
        shipParams
      );
      totalKhachShip = parseFloat(shipRows[0]?.total_khach_ship) || 0;
      totalNvChiu = parseFloat(shipRows[0]?.total_nv_chiu) || 0;
    } else {
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
      totalKhachShip = parseFloat(oa.total_khach_ship) || 0;
      totalNvChiu = parseFloat(oa.total_nv_chiu) || 0;
    }

    const directComm = parseFloat(s.direct_commission) || 0;
    const overrideComm = parseFloat(s.override_commission) || 0;
    const totalCommissionAll = parseFloat(s.total_commission) || 0;
    const totalLuong = totalCommissionAll + totalKhachShip - totalNvChiu;

    res.json({
      data: rows.map(row => {
        const comm = parseFloat(row.commission_amount) || 0;
        const khach =
          row.ship_payer === 'shop' ? 0 : parseFloat(row.shipping_fee) || 0;
        const nv = parseFloat(row.salesperson_absorbed_amount) || 0;
        const userOrdRn = parseInt(row._user_ord_rn, 10) || 1;
        const uid = parseInt(row.commission_user_id, 10);
        const spId = parseInt(row.order_salesperson_id, 10);
        const isPhuTrachDon = uid === spId;
        const applyShipNv =
          isPhuTrachDon &&
          userOrdRn === 1 &&
          String(row.entry_kind) === 'commission';
        const luong = applyShipNv ? comm + khach - nv : comm;
        const { _user_ord_rn, commission_user_id, order_salesperson_id, ...rest } = row;
        return {
          ...rest,
          commission_amount: comm,
          total_amount: parseFloat(row.total_amount) || 0,
          shipping_fee: parseFloat(row.shipping_fee) || 0,
          ship_payer: row.ship_payer === 'shop' ? 'shop' : 'customer',
          salesperson_absorbed_amount: nv,
          khach_tra_ship: applyShipNv ? khach : 0,
          nv_chiu_display: applyShipNv ? nv : 0,
          luong,
        };
      }),
      total: countRows[0].total,
      page: parseInt(page),
      limit: parseInt(limit),
      summary: {
        direct_commission: directComm,
        override_commission: overrideComm,
        total_commission: totalCommissionAll,
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
