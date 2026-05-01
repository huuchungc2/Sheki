const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const requireShop = require('../middleware/requireShop');
const authorize = require('../middleware/authorize');
const { requireFeature } = require('../middleware/requireFeature');
const { getPool } = require('../config/db');
const { getScope } = require('../utils/scope');

async function loadUserGroupIds(pool, shopId, userId) {
  const [rows] = await pool.query(
    `SELECT ug.group_id
     FROM user_groups ug
     JOIN groups g ON g.id = ug.group_id
     WHERE ug.user_id = ? AND g.shop_id = ? AND g.is_active = 1`,
    [userId, shopId]
  );
  return rows.map((r) => Number(r.group_id)).filter((n) => Number.isFinite(n) && n > 0);
}

router.get('/', auth, requireShop, requireFeature('reports.commissions'), async (req, res, next) => {
  try {
    const pool = await getPool();
    const { user_id, month, year, group_id, page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

    const conditions = ['o.shop_id = ?'];
    const params = [req.shopId];

    const scope = await getScope(req, 'reports');
    if (scope === 'own') {
      conditions.push('t.user_id = ?');
      params.push(req.user.id);
    } else if (scope === 'group') {
      let groupId = group_id != null && String(group_id).trim() !== '' ? parseInt(String(group_id), 10) : null;
      const gids = await loadUserGroupIds(pool, req.shopId, req.user.id);
      if (!gids.length) {
        conditions.push('1=0');
      } else {
        if (groupId != null && !gids.includes(Number(groupId))) {
          return res.status(403).json({ error: 'Không có quyền xem nhóm này' });
        }
        if (groupId == null) groupId = Math.min(...gids);
        conditions.push('o.group_id = ?');
        params.push(groupId);
      }
    } else if (user_id) {
      conditions.push('t.user_id = ?');
      params.push(parseInt(user_id));
    }
    // Đơn bán: tháng theo orders.created_at; bút toán hoàn: tháng theo t.entry_date (= commission_adjustments.created_at)
    if (month) {
      conditions.push(
        '((t.entry_kind = \'adjustment\' AND MONTH(t.entry_date) = ?) OR (t.entry_kind = \'commission\' AND MONTH(o.created_at) = ?))'
      );
      params.push(parseInt(month, 10), parseInt(month, 10));
    }
    if (year) {
      conditions.push(
        '((t.entry_kind = \'adjustment\' AND YEAR(t.entry_date) = ?) OR (t.entry_kind = \'commission\' AND YEAR(o.created_at) = ?))'
      );
      params.push(parseInt(year, 10), parseInt(year, 10));
    }

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

router.get('/summary', auth, requireShop, requireFeature('reports.commissions'), async (req, res, next) => {
  try {
    const pool = await getPool();
    const { user_id, month, year, group_id } = req.query;

    const conditions = ['1=1'];
    // 2 params for UNION (commissions/adjustments) + 1 param for JOIN orders o.shop_id
    const params = [req.shopId, req.shopId, req.shopId];
    const scope = await getScope(req, 'reports');
    if (scope === 'own') {
      conditions.push('t.user_id = ?');
      params.push(req.user.id);
    } else if (scope === 'group') {
      let groupId = group_id != null && String(group_id).trim() !== '' ? parseInt(String(group_id), 10) : null;
      const gids = await loadUserGroupIds(pool, req.shopId, req.user.id);
      if (!gids.length) {
        conditions.push('1=0');
      } else {
        if (groupId != null && !gids.includes(Number(groupId))) {
          return res.status(403).json({ error: 'Không có quyền xem nhóm này' });
        }
        if (groupId == null) groupId = Math.min(...gids);
        conditions.push('o.group_id = ?');
        params.push(groupId);
      }
    } else if (user_id) {
      conditions.push('t.user_id = ?');
      params.push(parseInt(user_id));
    }
    if (month) {
      conditions.push(
        '((t.entry_kind = \'adjustment\' AND MONTH(t.entry_date) = ?) OR (t.entry_kind = \'commission\' AND MONTH(o.created_at) = ?))'
      );
      params.push(parseInt(month, 10), parseInt(month, 10));
    }
    if (year) {
      conditions.push(
        '((t.entry_kind = \'adjustment\' AND YEAR(t.entry_date) = ?) OR (t.entry_kind = \'commission\' AND YEAR(o.created_at) = ?))'
      );
      params.push(parseInt(year, 10), parseInt(year, 10));
    }
    const whereClause = 'WHERE ' + conditions.join(' AND ');

    const [summary] = await pool.query(
      `SELECT
        COUNT(DISTINCT CASE WHEN t.entry_kind = 'commission' THEN t.order_id END) as total_orders,
        COALESCE(SUM(t.amount), 0) as total_commission,
        COALESCE(AVG(t.amount), 0) as avg_commission
       FROM (
         SELECT order_id, user_id, commission_amount as amount, created_at as entry_date, 'commission' as entry_kind FROM commissions WHERE shop_id = ?
         UNION ALL
         SELECT order_id, user_id, amount, created_at as entry_date, 'adjustment' as entry_kind FROM commission_adjustments WHERE shop_id = ?
       ) t
       JOIN orders o ON o.id = t.order_id AND o.shop_id = ?
       ${whereClause}`,
      params
    );

    res.json({ data: summary[0] });
  } catch (err) {
    next(err);
  }
});

router.get('/orders', auth, requireShop, requireFeature('reports.commissions'), async (req, res, next) => {
  try {
    const pool = await getPool();
    const { month, year, group_id, payroll_period_id, page = 1, limit = 20, user_id } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    const conditions = ['o.shop_id = ?'];
    const baseParams = [req.shopId];

    // Sales: HH bán hàng (direct) + HH từ CTV (override cho user_id = mình).
    // Hoàn hàng tạo `commission_adjustments` (âm) nên phải tính cả adjustment để KPI khớp thực tế.
    const scope = await getScope(req, 'reports');
    const isScoped = scope === 'own';
    if (scope === 'own') {
      conditions.push('t.user_id = ?');
      conditions.push("(t.type = 'direct' OR t.type = 'override')");
      baseParams.push(req.user.id);
    } else if (scope === 'group') {
      // Group-scope: force group_id within user's groups
      let gid = group_id != null && String(group_id).trim() !== '' ? parseInt(String(group_id), 10) : null;
      const gids = await loadUserGroupIds(pool, req.shopId, req.user.id);
      if (!gids.length) {
        conditions.push('1=0');
      } else {
        if (gid != null && !gids.includes(Number(gid))) {
          return res.status(403).json({ error: 'Không có quyền xem nhóm này' });
        }
        if (gid == null) gid = Math.min(...gids);
        conditions.push('o.group_id = ?');
        baseParams.push(gid);
      }
    } else if (user_id != null && String(user_id).trim() !== '') {
      // Admin: xem 1 nhân viên — cùng bộ lọc như «Hoa hồng của tôi» (bỏ qua nếu Sales gửi nhầm)
      const uid = parseInt(String(user_id), 10);
      if (!Number.isNaN(uid)) {
        conditions.push('t.user_id = ?');
        conditions.push("(t.type = 'direct' OR t.type = 'override')");
        baseParams.push(uid);
      }
    }
    // Đơn bán: payroll_period_id / tháng tạo đơn; hoàn: kỳ theo ngày bút toán (entry_date) hoặc khoảng payroll_periods
    const pidRaw = payroll_period_id != null && String(payroll_period_id).trim() !== '' ? parseInt(String(payroll_period_id), 10) : null;
    const pid = pidRaw != null && Number.isFinite(pidRaw) ? pidRaw : null;
    if (pid != null) {
      conditions.push(
        `((t.entry_kind = 'commission' AND o.payroll_period_id = ?) OR (t.entry_kind = 'adjustment' AND EXISTS (
          SELECT 1 FROM payroll_periods pp
          WHERE pp.id = ? AND pp.shop_id = o.shop_id
            AND t.entry_date >= pp.from_at
            AND (pp.to_at IS NULL OR t.entry_date <= pp.to_at)
        )))`
      );
      baseParams.push(pid, pid);
    } else {
      if (month) {
        conditions.push(
          '((t.entry_kind = \'adjustment\' AND MONTH(t.entry_date) = ?) OR (t.entry_kind = \'commission\' AND MONTH(o.created_at) = ?))'
        );
        baseParams.push(parseInt(month, 10), parseInt(month, 10));
      }
      if (year) {
        conditions.push(
          '((t.entry_kind = \'adjustment\' AND YEAR(t.entry_date) = ?) OR (t.entry_kind = \'commission\' AND YEAR(o.created_at) = ?))'
        );
        baseParams.push(parseInt(year, 10), parseInt(year, 10));
      }
    }
    // group_id is enforced above for scope=group; for others, allow explicit filter
    if (scope !== 'group' && group_id) { conditions.push('o.group_id = ?'); baseParams.push(parseInt(group_id)); }

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
      LEFT JOIN users sp ON o.salesperson_id = sp.id
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
          sp.full_name as salesperson_name,
          o.total_amount, o.status, t.entry_date as order_date,
          o.group_id, g.name as group_name,
          cu.name as customer_name,
          o.shipping_fee, o.ship_payer, o.salesperson_absorbed_amount,
          -- Ship/NV chỉ hiển thị 1 lần/đơn (ở dòng commission), nên phải đảm bảo dòng commission được xếp trước adjustment.
          ROW_NUMBER() OVER (
            PARTITION BY t.order_id, t.user_id
            ORDER BY
              CASE WHEN t.entry_kind = 'commission' THEN 0 ELSE 1 END,
              t.entry_date ASC,
              t.id ASC
          ) AS _user_ord_rn
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
      !isScoped && !Number.isNaN(parsedQueryUid) ? parsedQueryUid : null;

    if (isScoped) {
      const summaryConds = ['o.shop_id = ?', 't.user_id = ?', "(t.type = 'direct' OR t.type = 'override')"];
      const summaryParams = [req.shopId, req.user.id];
      if (pid != null) {
        summaryConds.push(
          `((t.entry_kind = 'commission' AND o.payroll_period_id = ?) OR (t.entry_kind = 'adjustment' AND EXISTS (
            SELECT 1 FROM payroll_periods pp
            WHERE pp.id = ? AND pp.shop_id = o.shop_id
              AND t.entry_date >= pp.from_at
              AND (pp.to_at IS NULL OR t.entry_date <= pp.to_at)
          )))`
        );
        summaryParams.push(pid, pid);
      } else {
        if (month) {
          summaryConds.push(
            '((t.entry_kind = \'adjustment\' AND MONTH(t.entry_date) = ?) OR (t.entry_kind = \'commission\' AND MONTH(o.created_at) = ?))'
          );
          summaryParams.push(parseInt(month, 10), parseInt(month, 10));
        }
        if (year) {
          summaryConds.push(
            '((t.entry_kind = \'adjustment\' AND YEAR(t.entry_date) = ?) OR (t.entry_kind = \'commission\' AND YEAR(o.created_at) = ?))'
          );
          summaryParams.push(parseInt(year, 10), parseInt(year, 10));
        }
      }
      if (group_id) {
        summaryConds.push('o.group_id = ?');
        summaryParams.push(parseInt(group_id, 10));
      }
      const [summaryRows] = await pool.query(
        `SELECT
          -- Tổng HH = direct gross + override gross (chỉ commissions)
          COALESCE(SUM(CASE WHEN t.type = 'direct'   AND t.entry_kind='commission' THEN t.commission_amount ELSE 0 END), 0) AS direct_commission,
          -- HH từ CTV = override commissions + override adjustments (net, có trừ hoàn)
          COALESCE(SUM(CASE
            WHEN t.type = 'override' AND t.entry_kind='commission' THEN t.commission_amount
            WHEN t.type = 'override' AND t.entry_kind='adjustment' THEN t.commission_amount
            ELSE 0 END), 0) AS override_commission,
          -- Tổng HH = direct gross + override net
          COALESCE(SUM(CASE WHEN t.type='direct' AND t.entry_kind='commission' THEN t.commission_amount ELSE 0 END),0)
            + COALESCE(SUM(CASE WHEN t.type='override' THEN t.commission_amount ELSE 0 END),0) AS total_commission,
          COUNT(DISTINCT CASE WHEN t.type = 'direct' AND t.entry_kind='commission' THEN t.order_id END) AS total_orders
         ${baseFrom}
         WHERE ${summaryConds.join(' AND ')}`,
        summaryParams
      );
      s = summaryRows[0];
    } else if (adminEmployeeUid != null) {
      const summaryConds = ['o.shop_id = ?', 't.user_id = ?', "(t.type = 'direct' OR t.type = 'override')"];
      const summaryParams = [req.shopId, adminEmployeeUid];
      if (pid != null) {
        summaryConds.push(
          `((t.entry_kind = 'commission' AND o.payroll_period_id = ?) OR (t.entry_kind = 'adjustment' AND EXISTS (
            SELECT 1 FROM payroll_periods pp
            WHERE pp.id = ? AND pp.shop_id = o.shop_id
              AND t.entry_date >= pp.from_at
              AND (pp.to_at IS NULL OR t.entry_date <= pp.to_at)
          )))`
        );
        summaryParams.push(pid, pid);
      } else {
        if (month) {
          summaryConds.push(
            '((t.entry_kind = \'adjustment\' AND MONTH(t.entry_date) = ?) OR (t.entry_kind = \'commission\' AND MONTH(o.created_at) = ?))'
          );
          summaryParams.push(parseInt(month, 10), parseInt(month, 10));
        }
        if (year) {
          summaryConds.push(
            '((t.entry_kind = \'adjustment\' AND YEAR(t.entry_date) = ?) OR (t.entry_kind = \'commission\' AND YEAR(o.created_at) = ?))'
          );
          summaryParams.push(parseInt(year, 10), parseInt(year, 10));
        }
      }
      if (group_id) {
        summaryConds.push('o.group_id = ?');
        summaryParams.push(parseInt(group_id, 10));
      }
      const [summaryRows] = await pool.query(
        `SELECT
          COALESCE(SUM(CASE WHEN t.type = 'direct'   AND t.entry_kind='commission' THEN t.commission_amount ELSE 0 END), 0) AS direct_commission,
          COALESCE(SUM(CASE
            WHEN t.type = 'override' AND t.entry_kind='commission' THEN t.commission_amount
            WHEN t.type = 'override' AND t.entry_kind='adjustment' THEN t.commission_amount
            ELSE 0 END), 0) AS override_commission,
          COALESCE(SUM(CASE WHEN t.type='direct' AND t.entry_kind='commission' THEN t.commission_amount ELSE 0 END),0)
            + COALESCE(SUM(CASE WHEN t.type='override' THEN t.commission_amount ELSE 0 END),0) AS total_commission,
          COUNT(DISTINCT CASE WHEN t.type = 'direct' AND t.entry_kind='commission' THEN t.order_id END) AS total_orders
         ${baseFrom}
         WHERE ${summaryConds.join(' AND ')}`,
        summaryParams
      );
      s = summaryRows[0];
    } else {
      const [summaryRows] = await pool.query(
        `
      SELECT
        COALESCE(SUM(CASE WHEN t.type = 'direct'   AND t.entry_kind='commission' THEN t.commission_amount ELSE 0 END), 0) as direct_commission,
        COALESCE(SUM(CASE
          WHEN t.type = 'override' AND t.entry_kind='commission' THEN t.commission_amount
          WHEN t.type = 'override' AND t.entry_kind='adjustment' THEN t.commission_amount
          ELSE 0 END), 0) as override_commission,
        COALESCE(SUM(CASE WHEN t.type='direct' AND t.entry_kind='commission' THEN t.commission_amount ELSE 0 END),0)
          + COALESCE(SUM(CASE WHEN t.type='override' THEN t.commission_amount ELSE 0 END),0) as total_commission,
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
    if (isScoped && (pid != null || (month && year))) {
      // Ship / NV chỉ theo đơn mình là salesperson (giống GET /reports/dashboard — không lấy ship đơn của CTV khi chỉ có override)
      const shipConds = [
        'o.shop_id = ?',
        'o.salesperson_id = ?',
        "o.status <> 'cancelled'",
      ];
      const shipParams = [req.shopId, req.user.id];
      if (pid != null) {
        shipConds.push('o.payroll_period_id = ?');
        shipParams.push(pid);
      } else {
        shipConds.push('MONTH(o.created_at) = ?');
        shipConds.push('YEAR(o.created_at) = ?');
        shipParams.splice(1, 0, parseInt(month));
        shipParams.splice(2, 0, parseInt(year));
      }
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
    } else if (adminEmployeeUid != null && (pid != null || (month && year))) {
      const shipConds = [
        'o.shop_id = ?',
        'o.salesperson_id = ?',
        "o.status <> 'cancelled'",
      ];
      const shipParams = [req.shopId, adminEmployeeUid];
      if (pid != null) {
        shipConds.push('o.payroll_period_id = ?');
        shipParams.splice(1, 0, pid);
      } else {
        shipConds.push('MONTH(o.created_at) = ?');
        shipConds.push('YEAR(o.created_at) = ?');
        shipParams.splice(1, 0, parseInt(month, 10));
        shipParams.splice(2, 0, parseInt(year, 10));
      }
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

    // Tổng HH hoàn (âm) — direct của NV bán; kỳ theo ngày bút toán (ca.created_at) hoặc khoảng kỳ lương
    const retCommConds = ["ca.type = 'direct'", 'ca.user_id = o.salesperson_id', 'o.shop_id = ?'];
    const retCommParams = [req.shopId];
    if (pid != null) {
      retCommConds.push(
        `EXISTS (SELECT 1 FROM payroll_periods pp WHERE pp.id = ? AND pp.shop_id = o.shop_id
          AND ca.created_at >= pp.from_at AND (pp.to_at IS NULL OR ca.created_at <= pp.to_at))`
      );
      retCommParams.push(pid);
    } else if (month && year) {
      retCommConds.push('MONTH(ca.created_at) = ?');
      retCommConds.push('YEAR(ca.created_at) = ?');
      retCommParams.push(parseInt(month, 10), parseInt(year, 10));
    }
    if (isScoped) {
      retCommConds.push('o.salesperson_id = ?');
      retCommParams.push(req.user.id);
    } else if (adminEmployeeUid != null) {
      retCommConds.push('o.salesperson_id = ?');
      retCommParams.push(adminEmployeeUid);
    }
    if (group_id) {
      retCommConds.push('o.group_id = ?');
      retCommParams.push(parseInt(group_id, 10));
    }
    const [[retCommRow]] = await pool.query(
      `SELECT COALESCE(SUM(ca.amount), 0) AS total_return_commission
       FROM commission_adjustments ca
       JOIN orders o ON ca.order_id = o.id
       WHERE ${retCommConds.join(' AND ')}`,
      retCommParams
    );
    const totalReturnCommission = parseFloat(retCommRow?.total_return_commission) || 0; // negative
    const totalReturnCommissionAbs = Math.abs(totalReturnCommission);

    // Tổng lương = Tổng HH − Tổng HH hoàn + Ship KH Trả − tiền NV chịu
    const totalLuong = totalCommissionAll - totalReturnCommissionAbs + totalKhachShip - totalNvChiu;

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
        total_return_commission: totalReturnCommission,
        total_return_commission_abs: totalReturnCommissionAbs,
        total_luong: totalLuong,
      },
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
