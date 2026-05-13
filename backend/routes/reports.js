const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const requireShop = require('../middleware/requireShop');
const requirePermission = require('../middleware/requirePermission');
const { requireFeature } = require('../middleware/requireFeature');
const { getPool } = require('../config/db');
const { getScope } = require('../utils/scope');
const {
  getReturnRevenueAndOrdersByMonthYear,
  getReturnRevenueByRange,
  getReturnOrdersCountByRange,
  getReturnCommissionByMonthYear,
  getReturnCommissionByRange,
} = require('../services/returnMetrics');
const { getCommissionMonthKpi } = require('../services/commissionKpi');
const { ensureOpenPayrollPeriod } = require('../services/payrollPeriod');

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

router.get('/dashboard', auth, requireShop, requirePermission('reports', 'view'), requireFeature('reports.dashboard'), async (req, res, next) => {
  try {
    const pool = await getPool();
    const shopId = req.shopId;
    const now = new Date();
    const payrollPidRaw =
      req.query.payroll_period_id != null && String(req.query.payroll_period_id).trim() !== ''
        ? parseInt(String(req.query.payroll_period_id), 10)
        : null;
    const usePayrollDash = Number.isFinite(payrollPidRaw) && payrollPidRaw > 0;
    let payrollPr = null;
    if (usePayrollDash) {
      const [[prow]] = await pool.query(
        `SELECT id, from_at, to_at FROM payroll_periods WHERE shop_id = ? AND id = ? LIMIT 1`,
        [shopId, payrollPidRaw]
      );
      if (!prow) {
        return res.status(404).json({ error: 'Không tìm thấy kỳ lương' });
      }
      payrollPr = prow;
    }

    let ymY = now.getFullYear();
    let ymM0 = now.getMonth();
    let yearOnly = false;
    if (!usePayrollDash) {
      const qm = req.query.month;
      const qy = req.query.year;
      const qmStr = qm != null ? String(qm).trim() : '';
      const qyStr = qy != null ? String(qy).trim() : '';
      if (qmStr === 'all' && qyStr !== '') {
        const yy = parseInt(qyStr, 10);
        if (Number.isFinite(yy) && yy >= 2000 && yy <= 2100) {
          ymY = yy;
          ymM0 = 0;
          yearOnly = true;
        }
      } else if (qmStr !== '' && qyStr !== '') {
        const mm = parseInt(qmStr, 10);
        const yy = parseInt(qyStr, 10);
        if (Number.isFinite(mm) && mm >= 1 && mm <= 12 && Number.isFinite(yy) && yy >= 2000 && yy <= 2100) {
          ymM0 = mm - 1;
          ymY = yy;
        }
      }
    }

    const y = ymY;
    const m = ymM0;
    const firstDayThisMonth = usePayrollDash
      ? new Date(payrollPr.from_at)
      : yearOnly
        ? new Date(y, 0, 1)
        : new Date(y, m, 1);
    const periodEndExcl = usePayrollDash
      ? new Date(y, m + 1, 1)
      : yearOnly
        ? new Date(y + 1, 0, 1)
        : new Date(y, m + 1, 1);
    const firstDayLastMonth = new Date(y, m - 1, 1);
    const lastDayLastMonth = new Date(y, m, 0);
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const showTodayKpi = !usePayrollDash && !yearOnly && ymY === now.getFullYear() && ymM0 === now.getMonth();
    const scope = await getScope(req, 'reports');
    const isScoped = scope !== 'shop';
    const uid = req.user.id;
    let scopeGroupGids = null;

    // Helper: build salesperson filter
    let spFilter = '';
    let spParam = [];
    let spFilterOrdersAlias = '';
    let spFilterOrdersAliasParam = [];
    if (scope === 'own') {
      spFilter = ' AND salesperson_id = ?';
      spParam = [uid];
      spFilterOrdersAlias = ' AND o.salesperson_id = ?';
      spFilterOrdersAliasParam = [uid];
    } else if (scope === 'group') {
      const [grows] = await pool.query(
        `SELECT ug.group_id
         FROM user_groups ug
         JOIN groups g ON g.id = ug.group_id
         WHERE ug.user_id = ? AND g.shop_id = ? AND g.is_active = 1`,
        [uid, shopId]
      );
      const gids = grows.map((r) => Number(r.group_id)).filter((n) => Number.isFinite(n) && n > 0);
      if (!gids.length) {
        spFilter = ' AND 1=0';
        spFilterOrdersAlias = ' AND 1=0';
      } else {
        scopeGroupGids = gids;
        const ph = gids.map(() => '?').join(',');
        spFilter = ` AND group_id IN (${ph})`;
        spParam = gids;
        spFilterOrdersAlias = ` AND o.group_id IN (${ph})`;
        spFilterOrdersAliasParam = gids;
      }
    }

    /** Admin (scope shop): lọc theo NV bán — `?employee=`; bỏ qua nếu không thuộc shop / không active */
    let filterEmployeeId = null;
    if (!isScoped) {
      const rawEmp = req.query.employee;
      if (rawEmp != null && String(rawEmp).trim() !== '') {
        const eid = parseInt(String(rawEmp), 10);
        if (Number.isFinite(eid) && eid > 0) {
          const [[empRow]] = await pool.query(
            `SELECT u.id FROM users u
             INNER JOIN user_shops us ON us.user_id = u.id
             WHERE u.id = ? AND us.shop_id = ? AND u.is_active = 1
             LIMIT 1`,
            [eid, shopId]
          );
          if (empRow) filterEmployeeId = eid;
        }
      }
    }
    if (filterEmployeeId != null) {
      spFilter += ' AND salesperson_id = ?';
      spParam.push(filterEmployeeId);
      spFilterOrdersAlias += ' AND o.salesperson_id = ?';
      spFilterOrdersAliasParam.push(filterEmployeeId);
    }

    let filterGroupId = null;
    const rawGrp = req.query.group_id;
    if (rawGrp != null && String(rawGrp).trim() !== '') {
      const gid = parseInt(String(rawGrp), 10);
      if (Number.isFinite(gid) && gid > 0) {
        const [[gRow]] = await pool.query(
          'SELECT id FROM `groups` WHERE shop_id = ? AND id = ? AND is_active = 1',
          [shopId, gid]
        );
        if (gRow) {
          if (scope === 'group') {
            const allowedG = await loadUserGroupIds(pool, shopId, uid);
            if (allowedG.includes(gid)) filterGroupId = gid;
          } else {
            filterGroupId = gid;
          }
        }
      }
    }
    if (filterGroupId != null) {
      spFilter += ' AND group_id = ?';
      spParam.push(filterGroupId);
      spFilterOrdersAlias += ' AND o.group_id = ?';
      spFilterOrdersAliasParam.push(filterGroupId);
    }

    const salespersonIdForScope =
      scope === 'own' ? uid : filterEmployeeId != null ? filterEmployeeId : null;

    const ordPeriodSql = usePayrollDash ? ' AND payroll_period_id = ?' : ' AND created_at >= ? AND created_at < ?';
    const ordPeriodParams = usePayrollDash ? [payrollPidRaw] : [firstDayThisMonth, periodEndExcl];

    // Doanh thu = tổng tiền bán hàng (orders.subtotal / Tạm tính), không dùng total_amount (thu khách).
    // Không cộng đơn đã hủy.
    // ── Kỳ đang xem (tháng hoặc kỳ lương) ──
    const [thisMonth] = await pool.query(
      `SELECT COUNT(*) as total_orders,
              COALESCE(SUM(CASE WHEN status != 'cancelled' THEN subtotal ELSE 0 END),0) as revenue,
              COALESCE(SUM(CASE WHEN status='completed' THEN subtotal END),0) as completed_revenue
       FROM orders WHERE shop_id = ?${ordPeriodSql}${spFilter}`,
      [shopId, ...ordPeriodParams, ...spParam]
    );
    const revReturns = await getReturnRevenueByRange(pool, {
      from: usePayrollDash ? null : firstDayThisMonth,
      to: usePayrollDash ? null : periodEndExcl,
      salespersonId: salespersonIdForScope,
      shopId,
      groupId: filterGroupId,
      payrollPeriodId: usePayrollDash ? payrollPidRaw : null,
    });
    const returnOrdersThisMonth = await getReturnOrdersCountByRange(pool, {
      from: usePayrollDash ? null : firstDayThisMonth,
      to: usePayrollDash ? null : periodEndExcl,
      salespersonId: salespersonIdForScope,
      shopId,
      groupId: filterGroupId,
      payrollPeriodId: usePayrollDash ? payrollPidRaw : null,
    });

    // ── Tháng trước (chỉ khi lọc theo tháng — để % thay đổi) ──
    let lastMonth = [{ revenue: 0 }];
    let revLastReturns = 0;
    if (!usePayrollDash) {
      const [lmRows] = await pool.query(
        `SELECT COALESCE(SUM(CASE WHEN status != 'cancelled' THEN subtotal ELSE 0 END),0) as revenue
         FROM orders WHERE shop_id = ? AND created_at >= ? AND created_at <= ?${spFilter}`,
        [shopId, firstDayLastMonth, lastDayLastMonth, ...spParam]
      );
      lastMonth = lmRows;
      revLastReturns = await getReturnRevenueByRange(pool, {
        from: firstDayLastMonth,
        to: firstDayThisMonth,
        salespersonId: salespersonIdForScope,
        shopId,
        groupId: filterGroupId,
      });
    }

    // ── Hôm nay (chỉ khi đang xem đúng tháng hiện tại — lọc theo tháng) ──
    let today = [{ total_orders: 0, revenue: 0 }];
    let revTodayReturns = 0;
    let returnOrdersToday = 0;
    if (showTodayKpi) {
      const [todayRows] = await pool.query(
        `SELECT COUNT(*) as total_orders,
                COALESCE(SUM(CASE WHEN status != 'cancelled' THEN subtotal ELSE 0 END),0) as revenue
         FROM orders WHERE shop_id = ? AND created_at >= ?${spFilter}`,
        [shopId, todayStart, ...spParam]
      );
      today = todayRows;
      revTodayReturns = await getReturnRevenueByRange(pool, {
        from: todayStart,
        to: null,
        salespersonId: salespersonIdForScope,
        shopId,
        groupId: filterGroupId,
      });
      returnOrdersToday = await getReturnOrdersCountByRange(pool, {
        from: todayStart,
        to: null,
        salespersonId: salespersonIdForScope,
        shopId,
        groupId: filterGroupId,
      });
    }

    // ── Đơn theo trạng thái (cùng kỳ) ──
    const [statusStats] = await pool.query(
      `SELECT status, COUNT(*) as cnt FROM orders
       WHERE shop_id = ?${ordPeriodSql}${spFilter} GROUP BY status`,
      [shopId, ...ordPeriodParams, ...spParam]
    );
    const byStatus = { pending:0, shipping:0, completed:0, cancelled:0 };
    statusStats.forEach(r => { if (byStatus[r.status] !== undefined) byStatus[r.status] = r.cnt; });

    const ordPeriodSqlO = usePayrollDash ? ' AND o.payroll_period_id = ?' : ' AND o.created_at >= ? AND o.created_at < ?';
    const ordPeriodParamsO = usePayrollDash ? [payrollPidRaw] : [firstDayThisMonth, periodEndExcl];

    // ── Hoa hồng hoàn (commission_adjustments) ──
    const returnCommissionThisMonth = await getReturnCommissionByRange(pool, {
      from: usePayrollDash ? null : firstDayThisMonth,
      to: usePayrollDash ? null : periodEndExcl,
      userId: isScoped ? uid : filterEmployeeId,
      shopId,
      groupId: filterGroupId,
      payrollPeriodId: usePayrollDash ? payrollPidRaw : null,
    });
    let returnCommissionToday = 0;
    if (showTodayKpi) {
      returnCommissionToday = await getReturnCommissionByRange(pool, {
        from: todayStart,
        to: null,
        userId: isScoped ? uid : filterEmployeeId,
        shopId,
        groupId: filterGroupId,
      });
    }
    // HH hoàn (override/quản lý): dùng để HIỂN THỊ đồng nhất; công thức lương vẫn chỉ trừ direct.
    // Scope:
    // - own: chỉ adjustment của chính user (ca.user_id = uid)
    // - group: theo group_id của order (o.group_id IN gids)
    // - shop: tất cả
    let overrideAdjCondsMonth;
    let overrideAdjParamsMonth;
    if (usePayrollDash) {
      overrideAdjCondsMonth = ['ca.type = \'override\'', 'o.shop_id = ?', 'o.payroll_period_id = ?'];
      overrideAdjParamsMonth = [shopId, payrollPidRaw];
    } else {
      overrideAdjCondsMonth = ['ca.type = \'override\'', 'o.shop_id = ?', 'ca.created_at >= ?', 'ca.created_at < ?'];
      overrideAdjParamsMonth = [shopId, firstDayThisMonth, periodEndExcl];
    }
    if (filterGroupId != null) {
      overrideAdjCondsMonth.push('o.group_id = ?');
      overrideAdjParamsMonth.push(filterGroupId);
    }
    let overrideAdjCondsToday;
    let overrideAdjParamsToday;
    if (showTodayKpi && !usePayrollDash) {
      overrideAdjCondsToday = ['ca.type = \'override\'', 'o.shop_id = ?', 'ca.created_at >= ?'];
      overrideAdjParamsToday = [shopId, todayStart];
    } else {
      overrideAdjCondsToday = ['1=0'];
      overrideAdjParamsToday = [];
    }
    if (filterGroupId != null && showTodayKpi && !usePayrollDash) {
      overrideAdjCondsToday.push('o.group_id = ?');
      overrideAdjParamsToday.push(filterGroupId);
    }
    if (scope === 'own') {
      overrideAdjCondsMonth.push('ca.user_id = ?');
      overrideAdjParamsMonth.push(uid);
      overrideAdjCondsToday.push('ca.user_id = ?');
      overrideAdjParamsToday.push(uid);
    } else if (scope === 'group') {
      // reuse gids computed above (scope === 'group')
      // if gids empty => spFilter already AND 1=0; keep consistent here too
      const gids = scopeGroupGids || [];
      if (!gids.length) {
        overrideAdjCondsMonth.push('1=0');
        overrideAdjCondsToday.push('1=0');
      } else {
        const ph = gids.map(() => '?').join(',');
        overrideAdjCondsMonth.push(`o.group_id IN (${ph})`);
        overrideAdjParamsMonth.push(...gids);
        overrideAdjCondsToday.push(`o.group_id IN (${ph})`);
        overrideAdjParamsToday.push(...gids);
      }
    }
    if (!isScoped && filterEmployeeId != null) {
      overrideAdjCondsMonth.push('o.salesperson_id = ?');
      overrideAdjParamsMonth.push(filterEmployeeId);
      overrideAdjCondsToday.push('o.salesperson_id = ?');
      overrideAdjParamsToday.push(filterEmployeeId);
    }
    const [[overrideAdjMonthRow]] = await pool.query(
      `SELECT COALESCE(SUM(ca.amount), 0) AS override_return_commission
       FROM commission_adjustments ca
       JOIN orders o ON ca.order_id = o.id
       WHERE ${overrideAdjCondsMonth.join(' AND ')}`,
      overrideAdjParamsMonth
    );
    const [[overrideAdjTodayRow]] = await pool.query(
      `SELECT COALESCE(SUM(ca.amount), 0) AS override_return_commission
       FROM commission_adjustments ca
       JOIN orders o ON ca.order_id = o.id
       WHERE ${overrideAdjCondsToday.join(' AND ')}`,
      overrideAdjParamsToday
    );
    const returnCommissionOverrideThisMonth = parseFloat(overrideAdjMonthRow?.override_return_commission) || 0; // negative
    const returnCommissionOverrideToday = parseFloat(overrideAdjTodayRow?.override_return_commission) || 0; // negative

    // ── Ship KH trả + NV chịu + Tổng lương (tháng) ──
    let totalKhachShip = 0;
    let totalNvChiu = 0;
    const totalReturnCommMonth = returnCommissionThisMonth || 0; // negative

    const kpiUserId = isScoped ? uid : filterEmployeeId;
    let directGrossMonth;
    let overrideNetMonth;
    let totalCommGrossMonth;
    if (usePayrollDash) {
      const baseP = [shopId, payrollPidRaw];
      let gsql = '';
      const gpar = [];
      if (filterGroupId != null) {
        gsql = ' AND o.group_id = ?';
        gpar.push(filterGroupId);
      }
      const userSql = kpiUserId != null ? ' AND c.user_id = ?' : '';
      const userPar = kpiUserId != null ? [kpiUserId] : [];
      const userAdjSql = kpiUserId != null ? ' AND ca.user_id = ?' : '';
      const userAdjPar = kpiUserId != null ? [kpiUserId] : [];
      const [[dRow]] = await pool.query(
        `SELECT COALESCE(SUM(c.commission_amount), 0) AS v
         FROM commissions c
         JOIN orders o ON c.order_id = o.id
         WHERE o.shop_id = ? AND o.payroll_period_id = ? AND o.status != 'cancelled'
           AND c.type = 'direct'${gsql}${userSql}`,
        [...baseP, ...gpar, ...userPar]
      );
      const [[oRow]] = await pool.query(
        `SELECT COALESCE(SUM(c.commission_amount), 0) AS v
         FROM commissions c
         JOIN orders o ON c.order_id = o.id
         WHERE o.shop_id = ? AND o.payroll_period_id = ? AND o.status != 'cancelled'
           AND c.type = 'override'${gsql}${userSql}`,
        [...baseP, ...gpar, ...userPar]
      );
      const [[aRow]] = await pool.query(
        `SELECT COALESCE(SUM(ca.amount), 0) AS v
         FROM commission_adjustments ca
         JOIN orders o ON ca.order_id = o.id
         WHERE o.shop_id = ? AND o.payroll_period_id = ? AND o.status != 'cancelled'
           AND ca.type = 'override'${gsql}${userAdjSql}`,
        [...baseP, ...gpar, ...userAdjPar]
      );
      directGrossMonth = parseFloat(dRow?.v) || 0;
      const ovComm = parseFloat(oRow?.v) || 0;
      const ovAdj = parseFloat(aRow?.v) || 0;
      overrideNetMonth = ovComm + ovAdj;
      totalCommGrossMonth = directGrossMonth + overrideNetMonth;
    } else {
      const monthKpi = await getCommissionMonthKpi(pool, {
        month: m + 1,
        year: y,
        userId: kpiUserId,
        shopId,
        groupId: filterGroupId,
      });
      directGrossMonth = monthKpi.directGross;
      overrideNetMonth = monthKpi.overrideNet;
      totalCommGrossMonth = monthKpi.totalHH;
    }

    if (isScoped) {
      const shipGrp = filterGroupId != null ? ' AND o.group_id = ?' : '';
      const shipGrpP = filterGroupId != null ? [filterGroupId] : [];
      let shipNvMonth;
      if (usePayrollDash) {
        [shipNvMonth] = await pool.query(
          `SELECT
             COALESCE(SUM(CASE WHEN o.ship_payer = 'shop' THEN 0 ELSE o.shipping_fee END), 0) AS total_khach_ship,
             COALESCE(SUM(o.salesperson_absorbed_amount), 0) AS total_nv_chiu
           FROM orders o
           WHERE o.payroll_period_id = ?
             AND o.shop_id = ?
             AND o.status != 'cancelled'
             AND o.salesperson_id = ?${shipGrp}`,
          [payrollPidRaw, shopId, uid, ...shipGrpP]
        );
      } else {
        [shipNvMonth] = await pool.query(
          `SELECT
             COALESCE(SUM(CASE WHEN o.ship_payer = 'shop' THEN 0 ELSE o.shipping_fee END), 0) AS total_khach_ship,
             COALESCE(SUM(o.salesperson_absorbed_amount), 0) AS total_nv_chiu
           FROM orders o
           WHERE MONTH(o.created_at) = ? AND YEAR(o.created_at) = ?
             AND o.shop_id = ?
             AND o.status != 'cancelled'
             AND o.salesperson_id = ?${shipGrp}`,
          [m + 1, y, shopId, uid, ...shipGrpP]
        );
      }
      totalKhachShip = parseFloat(shipNvMonth[0].total_khach_ship) || 0;
      totalNvChiu = parseFloat(shipNvMonth[0].total_nv_chiu) || 0;
    } else {
      const shipGrp = filterGroupId != null ? ' AND o.group_id = ?' : '';
      const shipGrpP = filterGroupId != null ? [filterGroupId] : [];
      const shipBySp = filterEmployeeId != null ? ' AND o.salesperson_id = ?' : '';
      const shipBySpP = filterEmployeeId != null ? [filterEmployeeId] : [];
      let shipAgg;
      if (usePayrollDash) {
        [[shipAgg]] = await pool.query(
          `SELECT
             COALESCE(SUM(CASE WHEN o.ship_payer='shop' THEN 0 ELSE o.shipping_fee END),0) AS total_khach_ship,
             COALESCE(SUM(o.salesperson_absorbed_amount),0) AS total_nv_chiu
           FROM orders o
           JOIN users u ON o.salesperson_id = u.id
           WHERE o.payroll_period_id = ?
             AND o.shop_id = ?
             AND o.status!='cancelled'
             AND u.is_active = 1${shipGrp}${shipBySp}`,
          [payrollPidRaw, shopId, ...shipGrpP, ...shipBySpP]
        );
      } else {
        [[shipAgg]] = await pool.query(
          `SELECT
             COALESCE(SUM(CASE WHEN o.ship_payer='shop' THEN 0 ELSE o.shipping_fee END),0) AS total_khach_ship,
             COALESCE(SUM(o.salesperson_absorbed_amount),0) AS total_nv_chiu
           FROM orders o
           JOIN users u ON o.salesperson_id = u.id
           WHERE MONTH(o.created_at)=? AND YEAR(o.created_at)=?
             AND o.shop_id = ?
             AND o.status!='cancelled'
             AND u.is_active = 1${shipGrp}${shipBySp}`,
          [m + 1, y, shopId, ...shipGrpP, ...shipBySpP]
        );
      }
      totalKhachShip = parseFloat(shipAgg?.total_khach_ship) || 0;
      totalNvChiu = parseFloat(shipAgg?.total_nv_chiu) || 0;
    }

    // Tổng lương = Tổng HH − Tổng HH hoàn + Ship KH Trả − NV chịu (cùng nguồn HH với KPI thẻ)
    const totalLuongMonth =
      totalCommGrossMonth - Math.abs(totalReturnCommMonth) + totalKhachShip - totalNvChiu;

    // ── Khách hàng ──
    const custIds = [];
    let custExtra = '';
    if (isScoped) {
      custExtra = ' AND created_by = ?';
      custIds.push(uid);
    } else if (filterEmployeeId != null) {
      custExtra = ' AND created_by = ?';
      custIds.push(filterEmployeeId);
    }
    const [custTotal] = await pool.query(
      `SELECT COUNT(*) as total FROM customers WHERE shop_id = ?${custExtra}`,
      [shopId, ...custIds]
    );
    const [custNew] = await pool.query(
      `SELECT COUNT(*) as total FROM customers WHERE shop_id = ? AND created_at >= ?${custExtra}`,
      [shopId, firstDayThisMonth, ...custIds]
    );

    // ── Sản phẩm ──
    const [products] = await pool.query(
      'SELECT COUNT(*) as total FROM products WHERE shop_id = ? AND is_active=1',
      [shopId]
    );

    // ── Đơn gần đây ──
    const [recentOrders] = await pool.query(
      `SELECT o.id, o.code, o.total_amount, o.subtotal, o.status, o.created_at,
              c.name as customer_name, u.full_name as salesperson_name
       FROM orders o
       LEFT JOIN customers c ON o.customer_id = c.id
       LEFT JOIN users u ON o.salesperson_id = u.id
       WHERE o.shop_id = ?${ordPeriodSqlO}${spFilterOrdersAlias}
       ORDER BY o.created_at DESC LIMIT 8`,
      [shopId, ...ordPeriodParamsO, ...spFilterOrdersAliasParam]
    );

    // ── Top sản phẩm tháng này ──
    const [topProducts] = await pool.query(
      `SELECT p.name, p.sku, SUM(oi.qty) as total_sold, SUM(oi.subtotal) as revenue
       FROM order_items oi
       JOIN products p ON oi.product_id = p.id
       JOIN orders o ON oi.order_id = o.id
       WHERE o.shop_id = ? AND p.shop_id = ?${ordPeriodSqlO}${spFilterOrdersAlias} AND o.status != 'cancelled'
       GROUP BY p.id, p.name, p.sku
       ORDER BY revenue DESC LIMIT 5`,
      [shopId, shopId, ...ordPeriodParamsO, ...spFilterOrdersAliasParam]
    );

    // ── Top khách hàng theo doanh số (tháng này) ──
    // Doanh số = SUM orders.subtotal (sau CK dòng), không gồm đơn hủy.
    const [topCustomers] = await pool.query(
      `SELECT
         c.id,
         c.name,
         c.phone,
         COUNT(o.id) as total_orders,
         COALESCE(SUM(o.subtotal), 0) as revenue
       FROM orders o
       JOIN customers c ON o.customer_id = c.id
       WHERE o.shop_id = ? AND c.shop_id = ?${ordPeriodSqlO}${spFilterOrdersAlias} AND o.status != 'cancelled'
       GROUP BY c.id, c.name, c.phone
       ORDER BY revenue DESC
       LIMIT 5`,
      [shopId, shopId, ...ordPeriodParamsO, ...spFilterOrdersAliasParam]
    );

    // ── Top nhân viên tháng này (admin only) ──
    let topSales = [];
    if (!isScoped) {
      const tsOrdBase = usePayrollDash
        ? 'payroll_period_id = ? AND shop_id = ? AND status != \'cancelled\''
        : 'MONTH(created_at) = ? AND YEAR(created_at) = ? AND shop_id = ? AND status != \'cancelled\'';
      const tsOrdBaseP = usePayrollDash ? [payrollPidRaw, shopId] : [m + 1, y, shopId];
      const tsGrpFrag = filterGroupId != null ? ' AND group_id = ?' : '';
      const tsGrpFragP = filterGroupId != null ? [filterGroupId] : [];
      const tsOwhere = usePayrollDash
        ? 'o.shop_id = ? AND o.payroll_period_id = ? AND o.status != \'cancelled\''
        : 'MONTH(o.created_at) = ? AND YEAR(o.created_at) = ? AND o.shop_id = ? AND o.status != \'cancelled\'';
      const tsOwhereP = usePayrollDash ? [shopId, payrollPidRaw] : [m + 1, y, shopId];
      const tsOgrp = filterGroupId != null ? ' AND o.group_id = ?' : '';
      const tsOgrpP = filterGroupId != null ? [filterGroupId] : [];
      const tsAdjWhere = usePayrollDash
        ? 'o.shop_id = ? AND o.payroll_period_id = ? AND o.status != \'cancelled\''
        : 'MONTH(ca.created_at) = ? AND YEAR(ca.created_at) = ? AND o.shop_id = ? AND o.status != \'cancelled\'';
      const tsAdjP = usePayrollDash ? [shopId, payrollPidRaw] : [m + 1, y, shopId];

      const tsParams = [
        ...tsOrdBaseP,
        ...tsGrpFragP,
        ...tsOwhereP,
        ...tsOgrpP,
        ...tsOwhereP,
        ...tsOgrpP,
        ...tsAdjP,
        ...tsOgrpP,
        shopId,
        ...(filterEmployeeId != null ? [filterEmployeeId] : []),
      ];

      const [rows] = await pool.query(
        `SELECT
           u.id, u.full_name,
           COALESCE(o_stats.total_orders, 0) AS total_orders,
           COALESCE(o_stats.revenue, 0) AS revenue,
           COALESCE(d_comm.direct_comm, 0) AS direct_comm,
           COALESCE(o_comm.override_comm, 0) + COALESCE(o_adj.override_adj, 0) AS override_comm,
           COALESCE(d_comm.direct_comm, 0) + (COALESCE(o_comm.override_comm, 0) + COALESCE(o_adj.override_adj, 0)) AS total_comm
         FROM user_shops us
         JOIN users u ON u.id = us.user_id
         LEFT JOIN (
           SELECT salesperson_id,
                  COUNT(*) AS total_orders,
                  COALESCE(SUM(subtotal), 0) AS revenue
           FROM orders
           WHERE ${tsOrdBase}${tsGrpFrag}
           GROUP BY salesperson_id
         ) o_stats ON o_stats.salesperson_id = u.id
         LEFT JOIN (
           SELECT c.user_id, COALESCE(SUM(c.commission_amount), 0) AS direct_comm
           FROM commissions c
           JOIN orders o ON c.order_id = o.id
           WHERE ${tsOwhere}
             AND c.type='direct'${tsOgrp}
           GROUP BY c.user_id
         ) d_comm ON d_comm.user_id = u.id
         LEFT JOIN (
           SELECT c.user_id, COALESCE(SUM(c.commission_amount), 0) AS override_comm
           FROM commissions c
           JOIN orders o ON c.order_id = o.id
           WHERE ${tsOwhere}
             AND c.type='override'${tsOgrp}
           GROUP BY c.user_id
         ) o_comm ON o_comm.user_id = u.id
         LEFT JOIN (
           SELECT ca.user_id, COALESCE(SUM(ca.amount), 0) AS override_adj
           FROM commission_adjustments ca
           JOIN orders o ON ca.order_id = o.id
           WHERE ${tsAdjWhere}
             AND ca.type='override'${tsOgrp}
           GROUP BY ca.user_id
         ) o_adj ON o_adj.user_id = u.id
         WHERE us.shop_id = ? AND u.is_active=1${filterEmployeeId != null ? ' AND u.id = ?' : ''}
         ORDER BY total_comm DESC
         LIMIT 5`,
        tsParams
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
    const revChange = usePayrollDash || yearOnly ? null : (revLast > 0 ? ((rev - revLast) / revLast * 100).toFixed(1) : null);

    res.json({
      data: {
        meta: {
          filter: usePayrollDash ? 'payroll' : yearOnly ? 'year' : 'month',
          payroll_period_id: usePayrollDash ? payrollPidRaw : null,
          month: yearOnly ? null : m + 1,
          year: y,
          group_id: filterGroupId,
          show_today_kpi: showTodayKpi,
        },
        thisMonth: {
          revenue:           rev,
          completed_revenue: (parseFloat(thisMonth[0].completed_revenue) || 0),
          total_orders:      parseInt(thisMonth[0].total_orders) || 0,
          revenue_change:    revChange,
          return_revenue:    revReturns,
          // direct: chỉ HH hoàn của salesperson (dùng để trừ lương)
          return_commission_direct: returnCommissionThisMonth || 0,
          // override: HH hoàn của quản lý (đã nằm trong override net)
          return_commission_override: returnCommissionOverrideThisMonth || 0,
          // total: để hiển thị “tổng HH hoàn” nếu cần
          return_commission_total: (returnCommissionThisMonth || 0) + (returnCommissionOverrideThisMonth || 0),
          return_orders:     returnOrdersThisMonth,
        },
        lastMonth: { revenue: revLast },
        today: {
          revenue:      (parseFloat(today[0].revenue) || 0),
          total_orders: parseInt(today[0].total_orders) || 0,
          return_revenue:    revTodayReturns,
          return_commission_direct: returnCommissionToday || 0,
          return_commission_override: returnCommissionOverrideToday || 0,
          return_commission_total: (returnCommissionToday || 0) + (returnCommissionOverrideToday || 0),
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
        topCustomers: topCustomers.map((c) => ({
          ...c,
          total_orders: parseInt(c.total_orders) || 0,
          revenue: parseFloat(c.revenue) || 0,
        })),
        topSales,
      }
    });
  } catch (err) {
    next(err);
  }
});

router.get('/salary', auth, requireShop, requirePermission('reports', 'view'), requireFeature('reports.salary'), async (req, res, next) => {
  try {
    const pool = await getPool();
    const shopId = req.shopId;
    const { month, year, group_id, payroll_period_id } = req.query;

    const monthStr = month != null ? String(month).trim() : '';
    const yearStr = year != null ? String(year).trim() : '';
    const yearOnly = monthStr === 'all' && yearStr !== '';
    const currentMonth = yearOnly ? null : (monthStr || String(new Date().getMonth() + 1));
    const currentYear = yearStr || String(new Date().getFullYear());

    // Lọc theo "Nhóm BH" của đơn hàng (orders.group_id), KHÔNG dựa trên user_groups.
    // Vì báo cáo hoa hồng theo nhóm đang hiển thị theo o.group_id (CommissionReport).
    let groupId = group_id ? parseInt(group_id) : null;
    const scope = await getScope(req, 'reports');
    const isScoped = scope !== 'shop';

    // Group-scope: force group_id within user's groups (reuse existing group filter logic)
    if (scope === 'group') {
      const gids = await loadUserGroupIds(pool, shopId, req.user.id);
      if (!gids.length) {
        return res.json({
          data: {
            salesData: [],
            summary: {
              totalSales: 0,
              totalCommission: 0,
              totalOrdersAll: 0,
              totalEmployees: 0,
              kpi_direct_gross: 0,
              kpi_override_net: 0,
              kpi_total_hh: 0,
              kpi_return_commission: 0,
              kpi_total_khach_ship: 0,
              kpi_total_nv_chiu: 0,
              kpi_total_luong: 0,
            },
          },
        });
      }
      if (groupId != null && !gids.includes(Number(groupId))) {
        return res.status(403).json({ error: 'Không có quyền xem nhóm này' });
      }
      if (groupId == null) groupId = Math.min(...gids);
    }

    // New mode: payroll_period_id (default: current open period)
    // If caller provides payroll_period_id → ignore month/year (keep month/year mode for backward compatibility).
    const reqPeriodId =
      payroll_period_id !== undefined && payroll_period_id !== null && String(payroll_period_id).trim() !== ''
        ? parseInt(String(payroll_period_id), 10)
        : null;

    if (reqPeriodId != null || String(req.query?.mode || '') === 'payroll') {
      const periodId =
        reqPeriodId != null && Number.isFinite(reqPeriodId)
          ? reqPeriodId
          : await ensureOpenPayrollPeriod(pool, { shopId, userId: req.user.id });

      const [[p]] = await pool.query(
        `SELECT id, status FROM payroll_periods WHERE shop_id = ? AND id = ? LIMIT 1`,
        [shopId, periodId]
      );
      if (!p) return res.status(404).json({ error: 'Không tìm thấy kỳ lương' });

      const scopedUserId = scope === 'own' ? Number(req.user.id) : null;
      const orderGroupCond = groupId ? ' AND o.group_id = ?' : '';

      // Total orders KPI for this payroll period
      const ordersAllWhere = [
        'o.shop_id = ?',
        'o.payroll_period_id = ?',
        "o.status != 'cancelled'",
      ];
      const ordersAllParams = [shopId, periodId];
      if (groupId) {
        ordersAllWhere.push('o.group_id = ?');
        ordersAllParams.push(groupId);
      }
      if (scope === 'own') {
        ordersAllWhere.push('o.salesperson_id = ?');
        ordersAllParams.push(scopedUserId);
      }
      const [[ordersAll]] = await pool.query(
        `SELECT COUNT(*) AS total_orders FROM orders o WHERE ${ordersAllWhere.join(' AND ')}`,
        ordersAllParams
      );

      // Closed period => read snapshot settlements (payroll_settlements)
      if (String(p.status) === 'closed') {
        const conds = ['s.shop_id = ?', 's.payroll_period_id = ?'];
        const params = [shopId, periodId];
        if (scope === 'own') {
          conds.push('s.user_id = ?');
          params.push(scopedUserId);
        }

        const [rows] = await pool.query(
          `SELECT s.user_id AS id, u.full_name,
                  0 AS commission_rate, 0 AS salary,
                  0 AS total_sales,
                  0 AS direct_adjustment,
                  0 AS override_adjustment,
                  s.direct_commission,
                  s.override_commission,
                  s.return_commission_abs,
                  s.ship_khach_tra AS total_khach_ship,
                  s.nv_chiu AS total_nv_chiu,
                  s.total_luong
           FROM payroll_settlements s
           JOIN users u ON u.id = s.user_id
           WHERE ${conds.join(' AND ')}
           ORDER BY s.total_luong DESC`,
          params
        );

        // order stats per user (total_orders + total_sales) from orders table
        const osConds = ['o.shop_id = ?', 'o.payroll_period_id = ?', "o.status != 'cancelled'"];
        const osParams = [shopId, periodId];
        if (groupId) {
          osConds.push('o.group_id = ?');
          osParams.push(groupId);
        }
        if (scope === 'own') {
          osConds.push('o.salesperson_id = ?');
          osParams.push(scopedUserId);
        }
        const [oStats] = await pool.query(
          `SELECT o.salesperson_id AS user_id, COUNT(*) AS total_orders, COALESCE(SUM(o.subtotal),0) AS total_sales
           FROM orders o
           WHERE ${osConds.join(' AND ')}
           GROUP BY o.salesperson_id`,
          osParams
        );
        const statMap = new Map(oStats.map((r) => [Number(r.user_id), r]));

        const formattedSalesDataAll = rows.map((r) => {
          const uid = Number(r.id);
          const st = statMap.get(uid);
          const totalOrders = parseInt(String(st?.total_orders ?? 0), 10) || 0;
          const totalSales = parseFloat(st?.total_sales) || 0;
          const directGross = parseFloat(r.direct_commission) || 0;
          const overrideNet = parseFloat(r.override_commission) || 0;
          const returnAbs = parseFloat(r.return_commission_abs) || 0;
          const khach = parseFloat(r.total_khach_ship) || 0;
          const nv = parseFloat(r.total_nv_chiu) || 0;
          const totalHH = directGross + overrideNet;
          const totalLuong = parseFloat(r.total_luong) || (totalHH - returnAbs + khach - nv);
          return {
            id: uid,
            full_name: r.full_name,
            commission_rate: 0,
            salary: 0,
            total_orders: totalOrders,
            total_sales: totalSales,
            direct_commission: directGross,
            direct_adjustment: -returnAbs, // keep sign (negative) for legacy UI fields
            total_commission: directGross,
            override_commission: overrideNet,
            total_all_commission: totalHH,
            total_khach_ship: khach,
            total_nv_chiu: nv,
            total_luong: totalLuong,
            total_return_commission_abs: returnAbs,
          };
        });

        const formattedSalesData = formattedSalesDataAll.filter((s) => {
          const totalAll = Number(s.total_all_commission) || 0;
          const ship = Number(s.total_khach_ship) || 0;
          const nv = Number(s.total_nv_chiu) || 0;
          const orders = Number(s.total_orders) || 0;
          const retAbs = Number(s.total_return_commission_abs) || 0;
          return orders > 0 || totalAll !== 0 || ship !== 0 || nv !== 0 || retAbs > 0;
        });

        const summary = {
          totalSales: formattedSalesData.reduce((sum, s) => sum + (Number(s.total_sales) || 0), 0),
          totalCommission: formattedSalesData.reduce((sum, s) => sum + (Number(s.total_all_commission) || 0), 0),
          totalOrdersAll: parseInt(String(ordersAll?.total_orders ?? 0), 10) || 0,
          totalEmployees: formattedSalesData.length,
          kpi_direct_gross: formattedSalesData.reduce((sum, s) => sum + (Number(s.direct_commission) || 0), 0),
          kpi_override_net: formattedSalesData.reduce((sum, s) => sum + (Number(s.override_commission) || 0), 0),
          kpi_total_hh: formattedSalesData.reduce((sum, s) => sum + (Number(s.total_all_commission) || 0), 0),
          kpi_return_commission: formattedSalesData.reduce((sum, s) => sum + (Number(s.total_return_commission_abs) || 0), 0),
          kpi_total_khach_ship: formattedSalesData.reduce((sum, s) => sum + (Number(s.total_khach_ship) || 0), 0),
          kpi_total_nv_chiu: formattedSalesData.reduce((sum, s) => sum + (Number(s.total_nv_chiu) || 0), 0),
          kpi_total_luong: formattedSalesData.reduce((sum, s) => sum + (Number(s.total_luong) || 0), 0),
          payroll_period_id: periodId,
          payroll_period_status: 'closed',
        };

        return res.json({ data: { salesData: formattedSalesData, summary } });
      }

      // Open period => compute realtime from orders/commissions + include payroll_adjustments (to_period_id)
      const [rows] = await pool.query(
        `
        SELECT
          u.id,
          u.full_name,
          u.commission_rate,
          u.salary,
          COALESCE(o_stats.total_orders, 0) AS total_orders,
          COALESCE(o_stats.total_sales, 0) - COALESCE(r_stats.total_returns, 0) AS total_sales,
          COALESCE(c_direct.direct_commission, 0) AS direct_commission,
          COALESCE(a_direct.direct_adjustment, 0) AS direct_adjustment,
          COALESCE(c_override.override_commission, 0) + COALESCE(a_override.override_adjustment, 0) AS override_commission,
          COALESCE(ship_nv.total_khach_ship, 0) AS total_khach_ship,
          COALESCE(ship_nv.total_nv_chiu, 0) AS total_nv_chiu,
          COALESCE(pa.adjustments, 0) AS payroll_adjustments
        FROM user_shops us
        JOIN users u ON u.id = us.user_id
        LEFT JOIN (
          SELECT salesperson_id, COUNT(*) AS total_orders, COALESCE(SUM(subtotal), 0) AS total_sales
          FROM orders
          WHERE shop_id = ? AND payroll_period_id = ?
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
          WHERE o.shop_id = ?
            AND EXISTS (
              SELECT 1 FROM payroll_periods pp
              WHERE pp.id = ? AND pp.shop_id = o.shop_id
                AND r.created_at >= pp.from_at
                AND (pp.to_at IS NULL OR r.created_at <= pp.to_at)
            )
            ${groupId ? ' AND o.group_id = ?' : ''}
          GROUP BY o.salesperson_id
        ) r_stats ON u.id = r_stats.salesperson_id
        LEFT JOIN (
          SELECT c.user_id, COALESCE(SUM(c.commission_amount),0) AS direct_commission
          FROM commissions c
          JOIN orders o ON c.order_id = o.id
          WHERE o.shop_id = ? AND o.payroll_period_id = ?
            AND o.status <> 'cancelled'
            AND c.type = 'direct'
            ${orderGroupCond}
          GROUP BY c.user_id
        ) c_direct ON u.id = c_direct.user_id
        LEFT JOIN (
          SELECT ca.user_id, COALESCE(SUM(ca.amount),0) AS direct_adjustment
          FROM commission_adjustments ca
          JOIN orders o ON ca.order_id = o.id
          WHERE o.shop_id = ?
            AND EXISTS (
              SELECT 1 FROM payroll_periods pp
              WHERE pp.id = ? AND pp.shop_id = o.shop_id
                AND ca.created_at >= pp.from_at
                AND (pp.to_at IS NULL OR ca.created_at <= pp.to_at)
            )
            AND o.status <> 'cancelled'
            AND ca.type = 'direct'
            AND ca.user_id = o.salesperson_id
            ${orderGroupCond}
          GROUP BY ca.user_id
        ) a_direct ON u.id = a_direct.user_id
        LEFT JOIN (
          SELECT c.user_id, COALESCE(SUM(c.commission_amount),0) AS override_commission
          FROM commissions c
          JOIN orders o ON c.order_id = o.id
          WHERE o.shop_id = ? AND o.payroll_period_id = ?
            AND o.status <> 'cancelled'
            AND c.type = 'override'
            ${orderGroupCond}
          GROUP BY c.user_id
        ) c_override ON u.id = c_override.user_id
        LEFT JOIN (
          SELECT ca.user_id, COALESCE(SUM(ca.amount),0) AS override_adjustment
          FROM commission_adjustments ca
          JOIN orders o ON ca.order_id = o.id
          WHERE o.shop_id = ?
            AND EXISTS (
              SELECT 1 FROM payroll_periods pp
              WHERE pp.id = ? AND pp.shop_id = o.shop_id
                AND ca.created_at >= pp.from_at
                AND (pp.to_at IS NULL OR ca.created_at <= pp.to_at)
            )
            AND o.status <> 'cancelled'
            AND ca.type = 'override'
            ${orderGroupCond}
          GROUP BY ca.user_id
        ) a_override ON u.id = a_override.user_id
        LEFT JOIN (
          SELECT salesperson_id,
                 COALESCE(SUM(CASE WHEN ship_payer='shop' THEN 0 ELSE shipping_fee END),0) AS total_khach_ship,
                 COALESCE(SUM(salesperson_absorbed_amount),0) AS total_nv_chiu
          FROM orders
          WHERE shop_id = ? AND payroll_period_id = ?
            AND status <> 'cancelled'
            ${groupId ? ' AND group_id = ?' : ''}
          GROUP BY salesperson_id
        ) ship_nv ON u.id = ship_nv.salesperson_id
        LEFT JOIN (
          SELECT user_id, COALESCE(SUM(amount),0) AS adjustments
          FROM payroll_adjustments
          WHERE shop_id = ? AND to_period_id = ?
          GROUP BY user_id
        ) pa ON u.id = pa.user_id
        WHERE us.shop_id = ? AND u.is_active = 1
          ${scope === 'own' ? ' AND u.id = ?' : ''}
        `,
        [
          // o_stats
          shopId, periodId, ...(groupId ? [groupId] : []),
          // r_stats
          shopId, periodId, ...(groupId ? [groupId] : []),
          // c_direct
          shopId, periodId, ...(groupId ? [groupId] : []),
          // a_direct
          shopId, periodId, ...(groupId ? [groupId] : []),
          // c_override
          shopId, periodId, ...(groupId ? [groupId] : []),
          // a_override
          shopId, periodId, ...(groupId ? [groupId] : []),
          // ship_nv
          shopId, periodId, ...(groupId ? [groupId] : []),
          // payroll_adjustments
          shopId, periodId,
          // us
          shopId,
          ...(scope === 'own' ? [scopedUserId] : []),
        ]
      );

      const formattedSalesDataAll = rows.map((s) => {
        const directGross = parseFloat(s.direct_commission) || 0;
        const overrideNet = parseFloat(s.override_commission) || 0;
        const returnDirectAdj = parseFloat(s.direct_adjustment) || 0; // negative
        const khach = parseFloat(s.total_khach_ship) || 0;
        const nv = parseFloat(s.total_nv_chiu) || 0;
        const payAdj = parseFloat(s.payroll_adjustments) || 0;
        const returnAbs = Math.abs(returnDirectAdj);
        const totalHH = directGross + overrideNet;
        const totalLuong = totalHH - returnAbs + khach - nv + payAdj;
        return {
          ...s,
          total_orders: parseInt(s.total_orders) || 0,
          total_sales: parseFloat(s.total_sales) || 0,
          direct_commission: directGross,
          direct_adjustment: returnDirectAdj,
          total_commission: directGross,
          override_commission: overrideNet,
          total_all_commission: totalHH,
          total_khach_ship: khach,
          total_nv_chiu: nv,
          total_luong: totalLuong,
          salary: parseFloat(s.salary) || 0,
          commission_rate: parseFloat(s.commission_rate) || 0,
          total_return_commission_abs: returnAbs,
          payroll_adjustments: payAdj,
        };
      });

      const formattedSalesData = formattedSalesDataAll.filter((s) => {
        const totalAll = Number(s.total_all_commission) || 0;
        const ship = Number(s.total_khach_ship) || 0;
        const nv = Number(s.total_nv_chiu) || 0;
        const orders = Number(s.total_orders) || 0;
        const adj = Number(s.payroll_adjustments) || 0;
        const retAbs = Number(s.total_return_commission_abs) || 0;
        return orders > 0 || totalAll !== 0 || ship !== 0 || nv !== 0 || adj !== 0 || retAbs > 0;
      });

      formattedSalesData.sort((a, b) => (Number(b.total_luong) || 0) - (Number(a.total_luong) || 0));

      const summary = {
        totalSales: formattedSalesData.reduce((sum, s) => sum + (Number(s.total_sales) || 0), 0),
        totalCommission: formattedSalesData.reduce((sum, s) => sum + (Number(s.total_all_commission) || 0), 0),
        totalOrdersAll: parseInt(String(ordersAll?.total_orders ?? 0), 10) || 0,
        totalEmployees: formattedSalesData.length,
        kpi_direct_gross: formattedSalesData.reduce((sum, s) => sum + (Number(s.direct_commission) || 0), 0),
        kpi_override_net: formattedSalesData.reduce((sum, s) => sum + (Number(s.override_commission) || 0), 0),
        kpi_total_hh: formattedSalesData.reduce((sum, s) => sum + (Number(s.total_all_commission) || 0), 0),
        kpi_return_commission: formattedSalesData.reduce((sum, s) => sum + (Number(s.total_return_commission_abs) || 0), 0),
        kpi_total_khach_ship: formattedSalesData.reduce((sum, s) => sum + (Number(s.total_khach_ship) || 0), 0),
        kpi_total_nv_chiu: formattedSalesData.reduce((sum, s) => sum + (Number(s.total_nv_chiu) || 0), 0),
        kpi_total_luong: formattedSalesData.reduce((sum, s) => sum + (Number(s.total_luong) || 0), 0),
        kpi_payroll_adjustments: formattedSalesData.reduce((sum, s) => sum + (Number(s.payroll_adjustments) || 0), 0),
        payroll_period_id: periodId,
        payroll_period_status: 'open',
      };

      return res.json({ data: { salesData: formattedSalesData, summary } });
    }

    const orderGroupCond = groupId ? ' AND o.group_id = ?' : '';
    const scopedUserId = scope === 'own' ? Number(req.user.id) : null;
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
       FROM user_shops us
       JOIN users u ON u.id = us.user_id
       LEFT JOIN (
         SELECT salesperson_id,
                COUNT(*) as total_orders,
                SUM(subtotal) as total_sales
         FROM orders
         WHERE shop_id = ? AND MONTH(created_at) = ?
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
         WHERE o.shop_id = ? AND MONTH(r.created_at) = ?
           AND YEAR(r.created_at) = ?
           ${groupId ? ' AND o.group_id = ?' : ''}
         GROUP BY o.salesperson_id
       ) r_stats ON u.id = r_stats.salesperson_id
       LEFT JOIN (
         SELECT c.user_id, SUM(c.commission_amount) as direct_commission
         FROM commissions c
         JOIN orders o ON c.order_id = o.id
         WHERE o.shop_id = ? AND MONTH(c.created_at) = ?
           AND YEAR(c.created_at) = ?
           AND c.type = 'direct'
           ${orderGroupCond}
         GROUP BY c.user_id
       ) c_direct ON u.id = c_direct.user_id
       LEFT JOIN (
         SELECT ca.user_id, SUM(ca.amount) as direct_adjustment
         FROM commission_adjustments ca
         JOIN orders o ON ca.order_id = o.id
         WHERE o.shop_id = ? AND MONTH(ca.created_at) = ?
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
         WHERE o.shop_id = ? AND MONTH(c.created_at) = ?
           AND YEAR(c.created_at) = ?
           AND c.type = 'override'
           ${orderGroupCond}
         GROUP BY c.user_id
       ) c_override ON u.id = c_override.user_id
       LEFT JOIN (
         SELECT ca.user_id, SUM(ca.amount) as override_adjustment
         FROM commission_adjustments ca
         JOIN orders o ON ca.order_id = o.id
         WHERE o.shop_id = ? AND MONTH(ca.created_at) = ?
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
         WHERE shop_id = ? AND MONTH(created_at) = ?
           AND YEAR(created_at) = ?
           AND status != 'cancelled'
           ${groupId ? ' AND group_id = ?' : ''}
         GROUP BY salesperson_id
       ) ship_nv ON u.id = ship_nv.salesperson_id
       WHERE us.shop_id = ? AND u.is_active = 1
         ${isScoped ? ' AND u.id = ?' : ''}
       ORDER BY total_sales DESC`,
      [
        // o_stats
        shopId, currentMonth, currentYear, ...(groupId ? [groupId] : []),
        // r_stats
        shopId, currentMonth, currentYear, ...(groupId ? [groupId] : []),
        // c_direct
        shopId, currentMonth, currentYear, ...(groupId ? [groupId] : []),
        // a_direct
        shopId, currentMonth, currentYear, ...(groupId ? [groupId] : []),
        // c_override
        shopId, currentMonth, currentYear, ...(groupId ? [groupId] : []),
        // a_override
        shopId, currentMonth, currentYear, ...(groupId ? [groupId] : []),
        // ship_nv — chỉ theo NV phụ trách đơn (salesperson_id), không nhân cho người chỉ HH override
        shopId, currentMonth, currentYear, ...(groupId ? [groupId] : []),
        // us.shop_id
        shopId,
        ...(isScoped ? [scopedUserId] : []),
      ]
    );

    // KPI “Số đơn hàng” (Admin): đếm theo orders, không phụ thuộc user active/role
    const ordersAllWhere = [
      'o.shop_id = ?',
      'MONTH(o.created_at) = ?',
      'YEAR(o.created_at) = ?',
      "o.status != 'cancelled'",
    ];
    const ordersAllParams = [shopId, currentMonth, currentYear];
    if (groupId) {
      ordersAllWhere.push('o.group_id = ?');
      ordersAllParams.push(groupId);
    }
    if (isScoped) {
      ordersAllWhere.push('o.salesperson_id = ?');
      ordersAllParams.push(scopedUserId);
    }
    const [[ordersAll]] = await pool.query(
      `SELECT COUNT(*) AS total_orders
       FROM orders o
       WHERE ${ordersAllWhere.join(' AND ')}`,
      ordersAllParams
    );

    // Convert DECIMAL strings to numbers
    const formattedSalesDataAll = salesData.map(s => {
      const directGross = parseFloat(s.direct_commission) || 0;
      const overrideNet = parseFloat(s.override_commission) || 0;
      const returnDirectAdj = parseFloat(s.direct_adjustment) || 0; // negative
      const khach = parseFloat(s.total_khach_ship) || 0;
      const nv = parseFloat(s.total_nv_chiu) || 0;
      const returnAbs = Math.abs(returnDirectAdj);
      // Tổng HH (đúng KPI): direct gross + override net (KHÔNG trừ hoàn direct ở đây)
      const totalHH = directGross + overrideNet;
      // Tổng lương: Tổng HH − |HH hoàn direct| + Ship KH Trả − NV chịu
      const totalLuong = totalHH - returnAbs + khach - nv;
      return {
        ...s,
        total_orders: parseInt(s.total_orders) || 0,
        total_sales: parseFloat(s.total_sales) || 0,
        direct_commission: directGross,
        direct_adjustment: returnDirectAdj,
        // Giữ field cũ nhưng chuẩn hóa ý nghĩa để UI không bị lệch:
        // - total_commission: tổng HH direct gross
        // - total_all_commission: tổng HH (direct gross + override net)
        total_commission: directGross,
        override_commission: overrideNet,
        total_all_commission: totalHH,
        total_khach_ship: khach,
        total_nv_chiu: nv,
        total_luong: totalLuong,
        salary: parseFloat(s.salary) || 0,
        commission_rate: parseFloat(s.commission_rate) || 0,
        total_return_commission_abs: returnAbs,
      };
    });

    // Bảng “Hoa hồng nhân viên” phải bao gồm cả NV không có đơn bán nhưng có phát sinh HH (override/adjustment)
    // hoặc chỉ có HH hoàn direct (total_return_commission_abs), để tổng trong bảng không bị lệch KPI tổng.
    const formattedSalesData = formattedSalesDataAll.filter(s => {
      const totalAll = Number(s.total_all_commission) || 0;
      const ship = Number(s.total_khach_ship) || 0;
      const nv = Number(s.total_nv_chiu) || 0;
      const orders = Number(s.total_orders) || 0;
      const retAbs = Number(s.total_return_commission_abs) || 0;
      return orders > 0 || totalAll !== 0 || ship !== 0 || nv !== 0 || retAbs > 0;
    });

    // Sort theo tổng lương: cao → thấp (UI báo cáo hoa hồng nhân viên)
    formattedSalesData.sort((a, b) => (Number(b.total_luong) || 0) - (Number(a.total_luong) || 0));

    const totalSales = formattedSalesData.reduce((sum, s) => sum + s.total_sales, 0);
    const totalCommission = formattedSalesData.reduce((sum, s) => sum + s.total_all_commission, 0);

    const cm = currentMonth != null ? parseInt(String(currentMonth), 10) : null;
    const cy = parseInt(String(currentYear), 10);

    let kpiTotals;
    if (yearOnly) {
      const shopCond = ' AND o.shop_id = ?';
      const groupCond = Number.isFinite(groupId) ? ' AND o.group_id = ?' : '';
      const userCond = isScoped ? ' AND c.user_id = ?' : '';
      const userCondAdj = isScoped ? ' AND ca.user_id = ?' : '';
      const directParams = [cy, shopId, ...(Number.isFinite(groupId) ? [groupId] : []), ...(isScoped ? [scopedUserId] : [])];
      const ovParams = [cy, shopId, ...(Number.isFinite(groupId) ? [groupId] : []), ...(isScoped ? [scopedUserId] : [])];
      const adjParams = [cy, shopId, ...(Number.isFinite(groupId) ? [groupId] : []), ...(isScoped ? [scopedUserId] : [])];

      const [[dRow]] = await pool.query(
        `SELECT COALESCE(SUM(c.commission_amount), 0) AS v
         FROM commissions c
         JOIN orders o ON c.order_id = o.id
         WHERE YEAR(o.created_at) = ?
           AND c.type = 'direct' AND o.status != 'cancelled'${shopCond}${groupCond}${userCond}`,
        directParams
      );
      const [[oRow]] = await pool.query(
        `SELECT COALESCE(SUM(c.commission_amount), 0) AS v
         FROM commissions c
         JOIN orders o ON c.order_id = o.id
         WHERE YEAR(o.created_at) = ?
           AND c.type = 'override' AND o.status != 'cancelled'${shopCond}${groupCond}${userCond}`,
        ovParams
      );
      const [[aRow]] = await pool.query(
        `SELECT COALESCE(SUM(ca.amount), 0) AS v
         FROM commission_adjustments ca
         JOIN orders o ON ca.order_id = o.id
         WHERE YEAR(ca.created_at) = ?
           AND ca.type = 'override' AND o.status != 'cancelled'${shopCond}${groupCond}${userCondAdj}`,
        adjParams
      );
      const directGross = parseFloat(dRow?.v) || 0;
      const overrideComm = parseFloat(oRow?.v) || 0;
      const overrideAdj = parseFloat(aRow?.v) || 0;
      const overrideNet = overrideComm + overrideAdj;
      kpiTotals = { directGross, overrideComm, overrideAdj, overrideNet, totalHH: directGross + overrideNet };
    } else {
      kpiTotals = isScoped
        ? await getCommissionMonthKpi(pool, {
            month: cm,
            year: cy,
            userId: scopedUserId,
            groupId: Number.isFinite(groupId) ? groupId : null,
            shopId,
          })
        : await getCommissionMonthKpi(pool, {
            month: cm,
            year: cy,
            groupId: Number.isFinite(groupId) ? groupId : null,
            shopId,
          });
    }

    // KPI Tổng lương (Admin) phải khớp Dashboard:
    // Tổng lương = Tổng HH (direct gross + override net) − |HH hoàn direct| + Ship KH Trả − NV chịu
    // Lưu ý: danh sách salesData có thể chỉ gồm NV có đơn trong kỳ, nên không dùng sum bảng để làm KPI.
    const kpiReturnCommission = yearOnly
      ? await getReturnCommissionByRange(pool, {
          from: new Date(cy, 0, 1),
          to: new Date(cy + 1, 0, 1),
          userId: isScoped ? scopedUserId : null,
          groupId: Number.isFinite(groupId) ? groupId : null,
          shopId,
        })
      : await getReturnCommissionByMonthYear(pool, {
          month: cm,
          year: cy,
          userId: isScoped ? scopedUserId : null,
          groupId: Number.isFinite(groupId) ? groupId : null,
          shopId,
        }); // negative

    const [[shipNvAll]] = await pool.query(
      `
      SELECT
        COALESCE(SUM(CASE WHEN o.ship_payer = 'shop' THEN 0 ELSE o.shipping_fee END), 0) AS total_khach_ship,
        COALESCE(SUM(o.salesperson_absorbed_amount), 0) AS total_nv_chiu
      FROM orders o
      JOIN users u ON o.salesperson_id = u.id
      WHERE o.shop_id = ?
        AND ${yearOnly ? 'YEAR(o.created_at) = ?' : 'MONTH(o.created_at) = ? AND YEAR(o.created_at) = ?'}
        AND o.status <> 'cancelled'
        AND u.is_active = 1
        ${groupId ? ' AND o.group_id = ?' : ''}
        ${isScoped ? ' AND o.salesperson_id = ?' : ''}
      `,
      [
        shopId,
        ...(yearOnly ? [cy] : [cm, cy]),
        ...(groupId ? [groupId] : []),
        ...(isScoped ? [scopedUserId] : []),
      ]
    );
    const kpiShip = parseFloat(shipNvAll?.total_khach_ship) || 0;
    const kpiNv = parseFloat(shipNvAll?.total_nv_chiu) || 0;
    const kpiTotalLuong =
      (parseFloat(kpiTotals.totalHH) || 0) - Math.abs(kpiReturnCommission || 0) + kpiShip - kpiNv;

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
          kpi_return_commission: kpiReturnCommission,
          kpi_total_khach_ship: kpiShip,
          kpi_total_nv_chiu: kpiNv,
          kpi_total_luong: kpiTotalLuong,
        }
      }
    });
  } catch (err) {
    next(err);
  }
});

// Revenue report (gross) — giống Dashboard: doanh số bán gross, hoàn tách riêng.
// GET /api/reports/revenue?month=MM&year=YYYY&group_id=&payroll_period_id=
// — payroll: đơn/ship/HH theo orders.payroll_period_id; doanh thu hoàn theo returns.created_at trong [from_at,to_at] kỳ (khớp returns-summary).
router.get('/revenue', auth, requireShop, requirePermission('reports', 'view'), requireFeature('reports.revenue'), async (req, res, next) => {
  try {
    const pool = await getPool();
    const shopId = req.shopId;
    const { month, year, group_id, payroll_period_id } = req.query;

    const monthStr = month != null ? String(month).trim() : '';
    const yearStr = year != null ? String(year).trim() : '';
    const yearOnly = monthStr === 'all' && yearStr !== '';
    const currentMonth = yearOnly ? null : (monthStr || String(new Date().getMonth() + 1));
    const currentYear = yearStr || String(new Date().getFullYear());
    const cm = currentMonth != null ? parseInt(String(currentMonth), 10) : null;
    const cy = parseInt(String(currentYear), 10);

    const payrollPidRaw =
      payroll_period_id != null && String(payroll_period_id).trim() !== ''
        ? parseInt(String(payroll_period_id), 10)
        : null;
    const usePayroll = Number.isFinite(payrollPidRaw) && payrollPidRaw > 0;

    const scope = await getScope(req, 'reports');
    const isScoped = scope !== 'shop';
    const scopedUserId = scope === 'own' ? Number(req.user.id) : null;

    let groupId = group_id ? parseInt(group_id) : null;

    if (scope === 'group') {
      const gids = await loadUserGroupIds(pool, shopId, req.user.id);
      if (!gids.length) {
        return res.json({
          data: {
            salesData: [],
            summary: {
              totalSales: 0,
              totalCommission: 0,
              totalReturns: 0,
              totalEmployees: 0,
              payroll_period_id: usePayroll ? payrollPidRaw : null,
              filter: usePayroll ? 'payroll' : yearOnly ? 'year' : 'month',
            },
          },
        });
      }
      if (groupId != null && !gids.includes(Number(groupId))) {
        return res.status(403).json({ error: 'Không có quyền xem nhóm này' });
      }
      if (groupId == null) groupId = Math.min(...gids);
    }

    if (usePayroll) {
      const [[pr]] = await pool.query(
        `SELECT id FROM payroll_periods WHERE shop_id = ? AND id = ? LIMIT 1`,
        [shopId, payrollPidRaw]
      );
      if (!pr) return res.status(404).json({ error: 'Không tìm thấy kỳ lương' });
    }

    let filterEmployeeId = null;
    if (!isScoped && req.query.employee != null && String(req.query.employee).trim() !== '') {
      const eid = parseInt(String(req.query.employee), 10);
      if (Number.isFinite(eid) && eid > 0) {
        const [[er]] = await pool.query(
          `SELECT u.id FROM users u
           INNER JOIN user_shops us ON us.user_id = u.id
           WHERE u.id = ? AND us.shop_id = ? AND u.is_active = 1 LIMIT 1`,
          [eid, shopId]
        );
        if (er) filterEmployeeId = eid;
      }
    }

    const empSp = filterEmployeeId != null ? ' AND salesperson_id = ?' : '';
    const empO = filterEmployeeId != null ? ' AND o.salesperson_id = ?' : '';
    const empP = filterEmployeeId != null ? [filterEmployeeId] : [];

    const orderGroupCond = groupId ? ' AND o.group_id = ?' : '';
    const oStatsGroup = groupId ? ' AND group_id = ?' : '';
    const oStatsWhere = usePayroll
      ? `shop_id = ? AND payroll_period_id = ? AND status != 'cancelled'${oStatsGroup}${empSp}`
      : `shop_id = ? AND ${yearOnly ? 'YEAR(created_at) = ?' : 'MONTH(created_at) = ? AND YEAR(created_at) = ?'} AND status != 'cancelled'${oStatsGroup}${empSp}`;
    const oStatsParams = usePayroll
      ? [shopId, payrollPidRaw, ...(groupId ? [groupId] : []), ...empP]
      : yearOnly
        ? [shopId, cy, ...(groupId ? [groupId] : []), ...empP]
        : [shopId, cm, cy, ...(groupId ? [groupId] : []), ...empP];

    const rStatsWhere = usePayroll
      ? `o.shop_id = ? AND EXISTS (
           SELECT 1 FROM payroll_periods pp
           WHERE pp.id = ? AND pp.shop_id = o.shop_id
             AND r.created_at >= pp.from_at
             AND (pp.to_at IS NULL OR r.created_at <= pp.to_at)
         )${groupId ? ' AND o.group_id = ?' : ''}${empO}`
      : `o.shop_id = ? AND ${yearOnly ? 'YEAR(r.created_at) = ?' : 'MONTH(r.created_at) = ? AND YEAR(r.created_at) = ?'}${groupId ? ' AND o.group_id = ?' : ''}${empO}`;
    const rStatsParams = usePayroll
      ? [shopId, payrollPidRaw, ...(groupId ? [groupId] : []), ...empP]
      : yearOnly
        ? [shopId, cy, ...(groupId ? [groupId] : []), ...empP]
        : [shopId, cm, cy, ...(groupId ? [groupId] : []), ...empP];

    const joinOrdersTime = usePayroll
      ? `o.shop_id = ? AND o.payroll_period_id = ?${empO} AND c.type = `
      : `o.shop_id = ? AND ${yearOnly ? 'YEAR(o.created_at) = ?' : 'MONTH(o.created_at) = ? AND YEAR(o.created_at) = ?'}${empO} AND c.type = `;

    const joinOrdersParams = usePayroll
      ? [shopId, payrollPidRaw, ...empP, ...(groupId ? [groupId] : [])]
      : yearOnly
        ? [shopId, cy, ...empP, ...(groupId ? [groupId] : [])]
        : [shopId, cm, cy, ...empP, ...(groupId ? [groupId] : [])];

    const shipGroup = groupId ? ' AND group_id = ?' : '';
    const shipWhere = usePayroll
      ? `shop_id = ? AND payroll_period_id = ? AND status != 'cancelled'${shipGroup}${empSp}`
      : `shop_id = ? AND ${yearOnly ? 'YEAR(created_at) = ?' : 'MONTH(created_at) = ? AND YEAR(created_at) = ?'} AND status != 'cancelled'${shipGroup}${empSp}`;
    const shipParams = usePayroll
      ? [shopId, payrollPidRaw, ...(groupId ? [groupId] : []), ...empP]
      : yearOnly
        ? [shopId, cy, ...(groupId ? [groupId] : []), ...empP]
        : [shopId, cm, cy, ...(groupId ? [groupId] : []), ...empP];

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
       FROM user_shops us
       JOIN users u ON u.id = us.user_id
       LEFT JOIN (
         SELECT salesperson_id,
                COUNT(*) as total_orders,
                SUM(subtotal) as total_sales
         FROM orders
         WHERE ${oStatsWhere}
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
        WHERE ${rStatsWhere}
         GROUP BY o.salesperson_id
       ) r_stats ON u.id = r_stats.salesperson_id
       LEFT JOIN (
         SELECT c.user_id, SUM(c.commission_amount) as direct_commission
         FROM commissions c
         JOIN orders o ON c.order_id = o.id
        WHERE ${joinOrdersTime}'direct'${orderGroupCond}
         GROUP BY c.user_id
       ) c_direct ON u.id = c_direct.user_id
       LEFT JOIN (
         SELECT c.user_id, SUM(c.commission_amount) as override_commission
         FROM commissions c
         JOIN orders o ON c.order_id = o.id
        WHERE ${joinOrdersTime}'override'${orderGroupCond}
         GROUP BY c.user_id
       ) c_override ON u.id = c_override.user_id
       LEFT JOIN (
         SELECT salesperson_id,
                COALESCE(SUM(CASE WHEN ship_payer = 'shop' THEN 0 ELSE shipping_fee END), 0) AS total_khach_ship,
                COALESCE(SUM(salesperson_absorbed_amount), 0) AS total_nv_chiu
         FROM orders
        WHERE ${shipWhere}
         GROUP BY salesperson_id
       ) ship_nv ON u.id = ship_nv.salesperson_id
       WHERE us.shop_id = ?
         AND COALESCE(o_stats.total_sales, 0) > 0
         ${isScoped ? ' AND u.id = ?' : filterEmployeeId != null ? ' AND u.id = ?' : ''}
       ORDER BY total_sales DESC`,
      [
        ...oStatsParams,
        ...rStatsParams,
        ...joinOrdersParams,
        ...joinOrdersParams,
        ...shipParams,
        shopId,
        ...(isScoped ? [scopedUserId] : filterEmployeeId != null ? [filterEmployeeId] : []),
      ]
    );

    const formatted = salesData.map((s) => {
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

    const summaryConds = usePayroll
      ? ['o.shop_id = ?', 'o.payroll_period_id = ?', "o.status != 'cancelled'"]
      : ['o.shop_id = ?', 'MONTH(o.created_at) = ?', 'YEAR(o.created_at) = ?', "o.status != 'cancelled'"];
    const summaryParams = usePayroll ? [shopId, payrollPidRaw] : [shopId, cm, cy];
    if (groupId != null) {
      summaryConds.push('o.group_id = ?');
      summaryParams.push(groupId);
    }
    if (isScoped) {
      summaryConds.push('o.salesperson_id = ?');
      summaryParams.push(scopedUserId);
    } else if (filterEmployeeId != null) {
      summaryConds.push('o.salesperson_id = ?');
      summaryParams.push(filterEmployeeId);
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

    const retWhere = usePayroll
      ? [
          'o.shop_id = ?',
          `EXISTS (
            SELECT 1 FROM payroll_periods pp
            WHERE pp.id = ? AND pp.shop_id = o.shop_id
              AND r.created_at >= pp.from_at
              AND (pp.to_at IS NULL OR r.created_at <= pp.to_at)
          )`,
        ]
      : ['o.shop_id = ?', 'MONTH(r.created_at) = ?', 'YEAR(r.created_at) = ?'];
    const retParams = usePayroll ? [shopId, payrollPidRaw] : [shopId, cm, cy];
    if (groupId != null) {
      retWhere.push('o.group_id = ?');
      retParams.push(groupId);
    }
    if (isScoped) {
      retWhere.push('o.salesperson_id = ?');
      retParams.push(scopedUserId);
    } else if (filterEmployeeId != null) {
      retWhere.push('o.salesperson_id = ?');
      retParams.push(filterEmployeeId);
    }

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
       WHERE ${retWhere.join(' AND ')}`,
      retParams
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
          payroll_period_id: usePayroll ? payrollPidRaw : null,
          filter: usePayroll ? 'payroll' : yearOnly ? 'year' : 'month',
        },
      },
    });
  } catch (err) {
    next(err);
  }
});

// Returns summary for commission period filters
// GET /api/reports/returns-summary?month=MM&year=YYYY&group_id=&user_id=&payroll_period_id=
router.get('/returns-summary', auth, requireShop, requirePermission('reports', 'view'), async (req, res, next) => {
  try {
    const pool = await getPool();
    const shopId = req.shopId;
    const { month, year, group_id, user_id, payroll_period_id } = req.query;
    const monthStr = month != null ? String(month).trim() : '';
    const yearStr = year != null ? String(year).trim() : '';
    const m = monthStr && monthStr !== 'all' ? parseInt(monthStr, 10) : null;
    const y = yearStr ? parseInt(yearStr, 10) : null;
    const yearOnly = monthStr === 'all' && y != null;
    let groupId = group_id ? parseInt(String(group_id), 10) : null;

    const scope = await getScope(req, 'reports');
    const targetUserId =
      scope === 'own'
        ? req.user.id
        : (user_id != null && String(user_id).trim() !== '' ? parseInt(String(user_id), 10) : null);

    if (scope === 'group') {
      const gids = await loadUserGroupIds(pool, shopId, req.user.id);
      if (!gids.length) {
        return res.json({ data: { return_orders: 0, return_revenue: 0, return_commission: 0 } });
      }
      if (groupId != null && !gids.includes(Number(groupId))) {
        return res.status(403).json({ error: 'Không có quyền xem nhóm này' });
      }
      if (groupId == null) groupId = Math.min(...gids);
    }

    const periodId =
      payroll_period_id != null && String(payroll_period_id).trim() !== ''
        ? parseInt(String(payroll_period_id), 10)
        : null;

    let ret;
    let returnCommissionDirectAbs;
    let returnCommissionOverrideAbs;

    if (periodId != null && Number.isFinite(periodId)) {
      // Hoàn / HH hoàn gắn kỳ lương theo ngày phát sinh (r.created_at / ca.created_at) nằm trong [from_at, to_at] của kỳ — không theo payroll_period_id của đơn gốc.
      const periodMatchR = `EXISTS (
        SELECT 1 FROM payroll_periods pp
        WHERE pp.id = ? AND pp.shop_id = o.shop_id
          AND r.created_at >= pp.from_at
          AND (pp.to_at IS NULL OR r.created_at <= pp.to_at)
      )`;
      const conds = ['o.shop_id = ?', periodMatchR];
      const params = [shopId, periodId];
      if (targetUserId) {
        conds.push('o.salesperson_id = ?');
        params.push(targetUserId);
      }
      if (groupId) {
        conds.push('o.group_id = ?');
        params.push(groupId);
      }

      const [[row]] = await pool.query(
        `
        SELECT
          COALESCE(COUNT(DISTINCT r.id), 0) AS return_orders,
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
        WHERE ${conds.join(' AND ')}
        `,
        params
      );

      const periodMatchCa = `EXISTS (
        SELECT 1 FROM payroll_periods pp
        WHERE pp.id = ? AND pp.shop_id = o.shop_id
          AND ca.created_at >= pp.from_at
          AND (pp.to_at IS NULL OR ca.created_at <= pp.to_at)
      )`;
      const commCondsDirect = [
        "ca.type='direct'",
        'ca.user_id = o.salesperson_id',
        'o.shop_id = ?',
        periodMatchCa,
      ];
      const commParamsDirect = [shopId, periodId];
      if (targetUserId) {
        commCondsDirect.push('o.salesperson_id = ?');
        commParamsDirect.push(targetUserId);
      }
      if (groupId) {
        commCondsDirect.push('o.group_id = ?');
        commParamsDirect.push(groupId);
      }
      const [[cRowDirect]] = await pool.query(
        `
        SELECT COALESCE(SUM(ABS(ca.amount)), 0) AS v
        FROM commission_adjustments ca
        JOIN orders o ON o.id = ca.order_id
        WHERE ${commCondsDirect.join(' AND ')}
        `,
        commParamsDirect
      );

      const commCondsOverride = [
        "ca.type='override'",
        'o.shop_id = ?',
        periodMatchCa,
      ];
      const commParamsOverride = [shopId, periodId];
      if (targetUserId) {
        commCondsOverride.push('ca.user_id = ?');
        commParamsOverride.push(targetUserId);
      }
      if (groupId) {
        commCondsOverride.push('o.group_id = ?');
        commParamsOverride.push(groupId);
      }
      const [[cRowOverride]] = await pool.query(
        `
        SELECT COALESCE(SUM(ABS(ca.amount)), 0) AS v
        FROM commission_adjustments ca
        JOIN orders o ON o.id = ca.order_id
        WHERE ${commCondsOverride.join(' AND ')}
        `,
        commParamsOverride
      );

      ret = { return_orders: Number(row?.return_orders) || 0, return_revenue: Number(row?.return_revenue) || 0 };
      returnCommissionDirectAbs = Number(cRowDirect?.v) || 0;
      returnCommissionOverrideAbs = Number(cRowOverride?.v) || 0;
    } else {
      if (!y) return res.status(400).json({ error: 'Thiếu year' });
      if (!yearOnly && !m) return res.status(400).json({ error: 'Thiếu month/year' });

      if (yearOnly) {
        const from = new Date(y, 0, 1);
        const to = new Date(y + 1, 0, 1);
        const returnRevenue = await getReturnRevenueByRange(pool, {
          from,
          to,
          salespersonId: targetUserId,
          groupId,
          shopId,
        });
        const returnOrders = await getReturnOrdersCountByRange(pool, {
          from,
          to,
          salespersonId: targetUserId,
          groupId,
          shopId,
        });
        ret = { return_orders: returnOrders, return_revenue: returnRevenue };

        returnCommissionDirectAbs = Math.abs(await getReturnCommissionByRange(pool, {
          from,
          to,
          userId: targetUserId,
          groupId,
          shopId,
        }));

        const overrideConds = [
          "ca.type='override'",
          'o.shop_id = ?',
          'ca.created_at >= ?',
          'ca.created_at < ?',
        ];
        const overrideParams = [shopId, from, to];
        if (targetUserId) {
          overrideConds.push('ca.user_id = ?');
          overrideParams.push(targetUserId);
        }
        if (groupId) {
          overrideConds.push('o.group_id = ?');
          overrideParams.push(groupId);
        }
        const [[ovRow]] = await pool.query(
          `
          SELECT COALESCE(SUM(ABS(ca.amount)), 0) AS v
          FROM commission_adjustments ca
          JOIN orders o ON o.id = ca.order_id
          WHERE ${overrideConds.join(' AND ')}
          `,
          overrideParams
        );
        returnCommissionOverrideAbs = Number(ovRow?.v) || 0;
      } else {
        ret = await getReturnRevenueAndOrdersByMonthYear(pool, {
          month: m,
          year: y,
          salespersonId: targetUserId,
          groupId,
          shopId,
        });
        returnCommissionDirectAbs = await getReturnCommissionByMonthYear(pool, {
          month: m,
          year: y,
          userId: targetUserId,
          groupId,
          shopId,
        });

        const overrideConds = [
          "ca.type='override'",
          'o.shop_id = ?',
          'MONTH(ca.created_at) = ?',
          'YEAR(ca.created_at) = ?',
        ];
        const overrideParams = [shopId, m, y];
        if (targetUserId) {
          overrideConds.push('ca.user_id = ?');
          overrideParams.push(targetUserId);
        }
        if (groupId) {
          overrideConds.push('o.group_id = ?');
          overrideParams.push(groupId);
        }
        const [[ovRow]] = await pool.query(
          `
          SELECT COALESCE(SUM(ABS(ca.amount)), 0) AS v
          FROM commission_adjustments ca
          JOIN orders o ON o.id = ca.order_id
          WHERE ${overrideConds.join(' AND ')}
          `,
          overrideParams
        );
        returnCommissionOverrideAbs = Number(ovRow?.v) || 0;
      }
    }

    res.json({
      data: {
        return_orders: ret.return_orders,
        return_revenue: ret.return_revenue,
        // Backward compatible: return_commission = HH hoàn direct (abs)
        return_commission: Number(returnCommissionDirectAbs) || 0,
        return_commission_direct_abs: Number(returnCommissionDirectAbs) || 0,
        return_commission_override_abs: Number(returnCommissionOverrideAbs) || 0,
        return_commission_total_abs: (Number(returnCommissionDirectAbs) || 0) + (Number(returnCommissionOverrideAbs) || 0),
      }
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
