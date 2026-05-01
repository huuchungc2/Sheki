const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const requireShop = require('../middleware/requireShop');
const requirePermission = require('../middleware/requirePermission');
const { requireFeature } = require('../middleware/requireFeature');
const { getPool } = require('../config/db');
const {
  ensureOpenPayrollPeriod,
  closeOpenPayrollPeriod,
  getPayrollPeriodById,
  reindexOrdersToPayrollPeriods,
  rebuildPayrollSettlementsForPeriod,
} = require('../services/payrollPeriod');

// GET /api/payroll/periods/current
router.get('/periods/current', auth, requireShop, requireFeature('reports.salary'), async (req, res, next) => {
  try {
    const pool = await getPool();
    const openId = await ensureOpenPayrollPeriod(pool, { shopId: req.shopId, userId: req.user.id });
    const period = await getPayrollPeriodById(pool, { shopId: req.shopId, periodId: openId });
    res.json({ data: period });
  } catch (e) {
    next(e);
  }
});

// GET /api/payroll/periods?status=open|closed
router.get('/periods', auth, requireShop, requireFeature('reports.salary'), async (req, res, next) => {
  try {
    const pool = await getPool();
    const status = req.query.status ? String(req.query.status) : null;
    const conds = ['shop_id = ?'];
    const params = [req.shopId];
    if (status === 'open' || status === 'closed') {
      conds.push('status = ?');
      params.push(status);
    }
    const [rows] = await pool.query(
      `SELECT id, shop_id, from_at, to_at, status, closed_at, created_by, created_at
       FROM payroll_periods
       WHERE ${conds.join(' AND ')}
       ORDER BY id DESC
       LIMIT 200`,
      params
    );
    res.json({ data: rows });
  } catch (e) {
    next(e);
  }
});

// POST /api/payroll/periods/close  (admin/kế toán)
router.post(
  '/periods/close',
  auth,
  requireShop,
  requirePermission('reports', 'edit'),
  requireFeature('reports.salary'),
  async (req, res, next) => {
    try {
      const pool = await getPool();
      const { closed_at } = req.body || {};
      const ret = await closeOpenPayrollPeriod(pool, {
        shopId: req.shopId,
        userId: req.user.id,
        closedAt: closed_at || null,
      });
      res.json({ data: ret });
    } catch (e) {
      next(e);
    }
  }
);

// POST /api/payroll/reindex-orders (admin/kế toán)
// Re-assign legacy orders to payroll periods by orders.created_at.
router.post(
  '/reindex-orders',
  auth,
  requireShop,
  requirePermission('reports', 'edit'),
  requireFeature('reports.salary'),
  async (req, res, next) => {
    try {
      const pool = await getPool();
      await reindexOrdersToPayrollPeriods(pool, { shopId: req.shopId });
      res.json({ message: 'OK' });
    } catch (e) {
      next(e);
    }
  }
);

// POST /api/payroll/periods/:id/rebuild-settlements (admin/kế toán)
// Rebuild snapshot settlements for a closed period (bootstrap fix).
router.post(
  '/periods/:id/rebuild-settlements',
  auth,
  requireShop,
  requirePermission('reports', 'edit'),
  requireFeature('reports.salary'),
  async (req, res, next) => {
    try {
      const pool = await getPool();
      const periodId = parseInt(String(req.params.id), 10);
      if (!Number.isFinite(periodId)) return res.status(400).json({ error: 'period_id không hợp lệ' });

      const [[p]] = await pool.query(
        `SELECT id, status FROM payroll_periods WHERE shop_id = ? AND id = ? LIMIT 1`,
        [req.shopId, periodId]
      );
      if (!p) return res.status(404).json({ error: 'Không tìm thấy kỳ lương' });
      if (String(p.status) !== 'closed') {
        return res.status(400).json({ error: 'Chỉ rebuild được cho kỳ đã chốt' });
      }

      await rebuildPayrollSettlementsForPeriod(pool, { shopId: req.shopId, periodId });
      res.json({ message: 'OK' });
    } catch (e) {
      next(e);
    }
  }
);

// GET /api/payroll/periods/:id/settlements
router.get('/periods/:id/settlements', auth, requireShop, requireFeature('reports.salary'), async (req, res, next) => {
  try {
    const pool = await getPool();
    const periodId = parseInt(String(req.params.id), 10);
    if (!Number.isFinite(periodId)) return res.status(400).json({ error: 'period_id không hợp lệ' });

    const [[p]] = await pool.query(
      `SELECT id, status FROM payroll_periods WHERE shop_id = ? AND id = ? LIMIT 1`,
      [req.shopId, periodId]
    );
    if (!p) return res.status(404).json({ error: 'Không tìm thấy kỳ lương' });

    const [rows] = await pool.query(
      `SELECT s.*, u.full_name
       FROM payroll_settlements s
       JOIN users u ON u.id = s.user_id
       WHERE s.shop_id = ? AND s.payroll_period_id = ?
       ORDER BY s.total_luong DESC`,
      [req.shopId, periodId]
    );
    res.json({ data: rows.map(r => ({ ...r,
      direct_commission: parseFloat(r.direct_commission) || 0,
      override_commission: parseFloat(r.override_commission) || 0,
      return_commission_abs: parseFloat(r.return_commission_abs) || 0,
      ship_khach_tra: parseFloat(r.ship_khach_tra) || 0,
      nv_chiu: parseFloat(r.nv_chiu) || 0,
      total_luong: parseFloat(r.total_luong) || 0,
    })) });
  } catch (e) { next(e); }
});

// GET /api/payroll/periods/:id/preview
// Dùng cho kỳ open (tạm tính) hoặc closed (đối soát nhanh).
router.get('/periods/:id/preview', auth, requireShop, requireFeature('reports.salary'), async (req, res, next) => {
  try {
    const pool = await getPool();
    const periodId = parseInt(String(req.params.id), 10);
    if (!Number.isFinite(periodId)) return res.status(400).json({ error: 'period_id không hợp lệ' });

    const [[p]] = await pool.query(
      `SELECT id, status FROM payroll_periods WHERE shop_id = ? AND id = ? LIMIT 1`,
      [req.shopId, periodId]
    );
    if (!p) return res.status(404).json({ error: 'Không tìm thấy kỳ lương' });

    const [directShipRows] = await pool.query(
      `
      SELECT
        o.salesperson_id AS user_id,
        COALESCE(SUM(CASE WHEN o.ship_payer='shop' THEN 0 ELSE o.shipping_fee END), 0) AS ship_khach_tra,
        COALESCE(SUM(o.salesperson_absorbed_amount), 0) AS nv_chiu,
        COALESCE(SUM(CASE WHEN c.type='direct' AND c.user_id=o.salesperson_id THEN c.commission_amount ELSE 0 END), 0) AS direct_commission
      FROM orders o
      LEFT JOIN commissions c ON c.order_id = o.id
      WHERE o.shop_id = ?
        AND o.payroll_period_id = ?
        AND o.status <> 'cancelled'
      GROUP BY o.salesperson_id
      `,
      [req.shopId, periodId]
    );

    const [ovRows] = await pool.query(
      `
      SELECT
        x.user_id,
        COALESCE(SUM(x.amount), 0) AS override_net
      FROM (
        SELECT c.user_id, c.commission_amount AS amount
        FROM commissions c
        JOIN orders o ON o.id = c.order_id
        WHERE o.shop_id = ?
          AND o.payroll_period_id = ?
          AND o.status <> 'cancelled'
          AND c.type = 'override'
        UNION ALL
        SELECT ca.user_id, ca.amount
        FROM commission_adjustments ca
        JOIN orders o ON o.id = ca.order_id
        WHERE o.shop_id = ?
          AND o.status <> 'cancelled'
          AND ca.type = 'override'
          AND EXISTS (
            SELECT 1 FROM payroll_periods pp
            WHERE pp.id = ? AND pp.shop_id = o.shop_id
              AND ca.created_at >= pp.from_at
              AND (pp.to_at IS NULL OR ca.created_at <= pp.to_at)
          )
      ) x
      GROUP BY x.user_id
      `,
      [req.shopId, periodId, req.shopId, periodId]
    );

    const [retDirectRows] = await pool.query(
      `
      SELECT
        o.salesperson_id AS user_id,
        COALESCE(SUM(ABS(ca.amount)), 0) AS return_abs
      FROM commission_adjustments ca
      JOIN orders o ON o.id = ca.order_id
      WHERE o.shop_id = ?
        AND o.status <> 'cancelled'
        AND ca.type='direct'
        AND ca.user_id = o.salesperson_id
        AND EXISTS (
          SELECT 1 FROM payroll_periods pp
          WHERE pp.id = ? AND pp.shop_id = o.shop_id
            AND ca.created_at >= pp.from_at
            AND (pp.to_at IS NULL OR ca.created_at <= pp.to_at)
        )
      GROUP BY o.salesperson_id
      `,
      [req.shopId, periodId]
    );

    // Trừ HH override khi hoàn (quản lý): đã nằm trong override net; cần số abs riêng để hiển thị cột «HH hoàn»
    const [retOverrideRows] = await pool.query(
      `
      SELECT
        ca.user_id AS user_id,
        COALESCE(SUM(CASE WHEN ca.amount < 0 THEN -ca.amount ELSE 0 END), 0) AS return_override_abs
      FROM commission_adjustments ca
      JOIN orders o ON o.id = ca.order_id
      WHERE o.shop_id = ?
        AND o.status <> 'cancelled'
        AND ca.type = 'override'
        AND EXISTS (
          SELECT 1 FROM payroll_periods pp
          WHERE pp.id = ? AND pp.shop_id = o.shop_id
            AND ca.created_at >= pp.from_at
            AND (pp.to_at IS NULL OR ca.created_at <= pp.to_at)
        )
      GROUP BY ca.user_id
      `,
      [req.shopId, periodId]
    );

    const [adjRows] = await pool.query(
      `
      SELECT user_id, COALESCE(SUM(amount), 0) AS adj
      FROM payroll_adjustments
      WHERE shop_id = ? AND to_period_id = ?
      GROUP BY user_id
      `,
      [req.shopId, periodId]
    );

    const ovMap = new Map(ovRows.map((r) => [Number(r.user_id), parseFloat(r.override_net) || 0]));
    const retDirectMap = new Map(retDirectRows.map((r) => [Number(r.user_id), parseFloat(r.return_abs) || 0]));
    const retOverrideMap = new Map(retOverrideRows.map((r) => [Number(r.user_id), parseFloat(r.return_override_abs) || 0]));
    const adjMap = new Map(adjRows.map((r) => [Number(r.user_id), parseFloat(r.adj) || 0]));

    const userIds = new Set([
      ...directShipRows.map((r) => Number(r.user_id)),
      ...ovRows.map((r) => Number(r.user_id)),
      ...retDirectRows.map((r) => Number(r.user_id)),
      ...retOverrideRows.map((r) => Number(r.user_id)),
      ...adjRows.map((r) => Number(r.user_id)),
    ]);
    const ids = [...userIds].filter((n) => Number.isFinite(n) && n > 0);
    if (!ids.length) return res.json({ data: [] });

    const placeholders = ids.map(() => '?').join(',');
    const [users] = await pool.query(
      `SELECT id, full_name FROM users WHERE id IN (${placeholders})`,
      ids
    );
    const nameMap = new Map(users.map((u) => [Number(u.id), String(u.full_name)]));

    const baseMap = new Map(directShipRows.map((r) => [Number(r.user_id), r]));
    const out = ids.map((uid) => {
      const b = baseMap.get(uid) || {};
      const direct = parseFloat(b.direct_commission) || 0;
      const ship = parseFloat(b.ship_khach_tra) || 0;
      const nv = parseFloat(b.nv_chiu) || 0;
      const override = ovMap.get(uid) || 0;
      const retDirectAbs = retDirectMap.get(uid) || 0;
      const retOverrideAbs = retOverrideMap.get(uid) || 0;
      const retDisplayAbs = retDirectAbs + retOverrideAbs;
      const adj = adjMap.get(uid) || 0;
      // Chỉ trừ lại HH direct khi hoàn (đã tách khỏi cột direct); phần override hoàn đã gộp trong override net
      const totalLuong = (direct + override) - retDirectAbs + ship - nv + adj;
      return {
        user_id: uid,
        full_name: nameMap.get(uid) || `#${uid}`,
        direct_commission: direct,
        override_commission: override,
        return_commission_abs: retDisplayAbs,
        return_commission_direct_abs: retDirectAbs,
        return_commission_override_abs: retOverrideAbs,
        ship_khach_tra: ship,
        nv_chiu: nv,
        adjustments: adj,
        total_luong: totalLuong,
      };
    });

    out.sort((a, b) => (Number(b.total_luong) || 0) - (Number(a.total_luong) || 0));
    res.json({ data: out });
  } catch (e) { next(e); }
});

module.exports = router;

