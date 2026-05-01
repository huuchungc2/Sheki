const { getPool } = require('../config/db');

async function ensureOpenPayrollPeriod(pool, { shopId, userId = null }) {
  const [[row]] = await pool.query(
    `SELECT id, from_at
     FROM payroll_periods
     WHERE shop_id = ? AND status = 'open'
     ORDER BY id DESC
     LIMIT 1`,
    [shopId]
  );
  if (row?.id) {
    const openId = Number(row.id);
    // Reindex to correct periods (avoid dumping legacy orders into open period)
    await reindexOrdersToPayrollPeriods(pool, { shopId });
    return openId;
  }

  // First open period for a shop: start from earliest order date (if any)
  const [[minOrder]] = await pool.query(
    `SELECT MIN(created_at) AS v FROM orders WHERE shop_id = ?`,
    [shopId]
  );
  const fromAt = minOrder?.v ? new Date(minOrder.v) : new Date();
  const [r] = await pool.query(
    `INSERT INTO payroll_periods (shop_id, from_at, status, created_by)
     VALUES (?, ?, 'open', ?)`,
    [shopId, fromAt, userId]
  );
  const newId = Number(r.insertId);
  await reindexOrdersToPayrollPeriods(pool, { shopId });

  return newId;
}

async function getPayrollPeriodById(pool, { shopId, periodId }) {
  const [[row]] = await pool.query(
    `SELECT id, shop_id, from_at, to_at, status, closed_at, created_by, created_at
     FROM payroll_periods
     WHERE shop_id = ? AND id = ?
     LIMIT 1`,
    [shopId, periodId]
  );
  return row || null;
}

// Assign orders.payroll_period_id based on orders.created_at falling into a period range.
// This is needed for legacy data and for correct viewing of closed periods.
async function reindexOrdersToPayrollPeriods(pool, { shopId }) {
  // Ensure earliest period covers earliest order (bootstrap safety)
  const [[minOrder]] = await pool.query(
    `SELECT MIN(created_at) AS v FROM orders WHERE shop_id = ?`,
    [shopId]
  );
  const [[minPeriod]] = await pool.query(
    `SELECT id, from_at FROM payroll_periods WHERE shop_id = ? ORDER BY id ASC LIMIT 1`,
    [shopId]
  );
  if (minOrder?.v && minPeriod?.id && minPeriod?.from_at) {
    const oMin = new Date(minOrder.v);
    const pMin = new Date(minPeriod.from_at);
    if (oMin < pMin) {
      await pool.query(
        `UPDATE payroll_periods SET from_at = ? WHERE shop_id = ? AND id = ?`,
        [oMin, shopId, Number(minPeriod.id)]
      );
    }
  }

  // Update only orders that currently have NULL payroll_period_id OR point to a non-matching period window.
  // Choose latest matching period id (ORDER BY p.id DESC).
  await pool.query(
    `
    UPDATE orders o
    SET o.payroll_period_id = (
      SELECT p.id
      FROM payroll_periods p
      WHERE p.shop_id = o.shop_id
        AND o.created_at >= p.from_at
        AND (p.to_at IS NULL OR o.created_at < p.to_at)
      ORDER BY p.id DESC
      LIMIT 1
    )
    WHERE o.shop_id = ?
      AND (
        o.payroll_period_id IS NULL
        OR o.payroll_period_id NOT IN (
          SELECT pp.id
          FROM payroll_periods pp
          WHERE pp.shop_id = o.shop_id
            AND o.created_at >= pp.from_at
            AND (pp.to_at IS NULL OR o.created_at < pp.to_at)
        )
      )
    `,
    [shopId]
  );

  // Any order that still doesn't match (created before first period, bad data) → assign to earliest period.
  const [[firstPeriod]] = await pool.query(
    `SELECT id FROM payroll_periods WHERE shop_id = ? ORDER BY id ASC LIMIT 1`,
    [shopId]
  );
  if (firstPeriod?.id) {
    await pool.query(
      `UPDATE orders
       SET payroll_period_id = ?
       WHERE shop_id = ? AND payroll_period_id IS NULL`,
      [Number(firstPeriod.id), shopId]
    );
  }
}

async function rebuildPayrollSettlementsForPeriod(pool, { shopId, periodId }) {
  const pid = Number(periodId);
  if (!Number.isFinite(pid) || pid <= 0) return;

  // Ensure orders are indexed correctly before rebuilding
  await reindexOrdersToPayrollPeriods(pool, { shopId });

  // Snapshot settlements for periodId (payroll_settlements)
  const [aggRows] = await pool.query(
    `
    SELECT
      o.salesperson_id AS user_id,
      COALESCE(SUM(CASE WHEN o.ship_payer='shop' THEN 0 ELSE o.shipping_fee END), 0) AS ship_khach_tra,
      COALESCE(SUM(o.salesperson_absorbed_amount), 0) AS nv_chiu,
      COALESCE(SUM(CASE WHEN c.type='direct' THEN c.commission_amount ELSE 0 END), 0) AS direct_commission
    FROM orders o
    LEFT JOIN commissions c
      ON c.order_id = o.id AND c.user_id = o.salesperson_id AND c.type='direct'
    WHERE o.shop_id = ?
      AND o.payroll_period_id = ?
      AND o.status <> 'cancelled'
    GROUP BY o.salesperson_id
    `,
    [shopId, pid]
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
    [shopId, pid, shopId, pid]
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
    [shopId, pid]
  );

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
    [shopId, pid]
  );

  const ovMap = new Map(ovRows.map((r) => [Number(r.user_id), parseFloat(r.override_net) || 0]));
  const retDirectMap = new Map(retDirectRows.map((r) => [Number(r.user_id), parseFloat(r.return_abs) || 0]));
  const retOverrideMap = new Map(retOverrideRows.map((r) => [Number(r.user_id), parseFloat(r.return_override_abs) || 0]));

  const aggByUser = new Map(aggRows.map((r) => [Number(r.user_id), r]));
  const allUserIds = new Set([
    ...aggRows.map((r) => Number(r.user_id)),
    ...ovRows.map((r) => Number(r.user_id)),
    ...retDirectRows.map((r) => Number(r.user_id)),
    ...retOverrideRows.map((r) => Number(r.user_id)),
  ]);

  for (const uid of allUserIds) {
    if (!Number.isFinite(uid) || uid <= 0) continue;
    const r = aggByUser.get(uid);
    const direct = parseFloat(r?.direct_commission) || 0;
    const override = ovMap.get(uid) || 0;
    const ship = parseFloat(r?.ship_khach_tra) || 0;
    const nv = parseFloat(r?.nv_chiu) || 0;
    const retDirectAbs = retDirectMap.get(uid) || 0;
    const retOverrideAbs = retOverrideMap.get(uid) || 0;
    const returnDisplayAbs = retDirectAbs + retOverrideAbs;
    const totalLuong = (direct + override) - retDirectAbs + ship - nv;

    await pool.query(
      `
      INSERT INTO payroll_settlements
        (shop_id, payroll_period_id, user_id, direct_commission, override_commission, return_commission_abs, ship_khach_tra, nv_chiu, total_luong)
      VALUES
        (?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        direct_commission = VALUES(direct_commission),
        override_commission = VALUES(override_commission),
        return_commission_abs = VALUES(return_commission_abs),
        ship_khach_tra = VALUES(ship_khach_tra),
        nv_chiu = VALUES(nv_chiu),
        total_luong = VALUES(total_luong)
      `,
      [shopId, pid, uid, direct, override, returnDisplayAbs, ship, nv, totalLuong]
    );
  }
}

async function closeOpenPayrollPeriod(pool, { shopId, userId = null, closedAt = null }) {
  const now = closedAt ? new Date(closedAt) : new Date();

  // Cutoff-based closing (business rule):
  // - Period just closed contains all orders created BEFORE cutoff that are still "unsettled"
  // - New open period contains orders created AT/AFTER cutoff
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const [[openRow]] = await conn.query(
      `SELECT id
       FROM payroll_periods
       WHERE shop_id = ? AND status = 'open'
       ORDER BY id DESC
       LIMIT 1`,
      [shopId]
    );
    if (!openRow?.id) {
      // Ensure bootstrap open period exists (outside conn is fine, but keep consistent via conn)
      const [[minOrder]] = await conn.query(`SELECT MIN(created_at) AS v FROM orders WHERE shop_id = ?`, [shopId]);
      const fromAt = minOrder?.v ? new Date(minOrder.v) : new Date();
      const [ins] = await conn.query(
        `INSERT INTO payroll_periods (shop_id, from_at, status, created_by)
         VALUES (?, ?, 'open', ?)`,
        [shopId, fromAt, userId]
      );
      await conn.commit();
      return { closedPeriodId: null, newOpenPeriodId: Number(ins.insertId) };
    }

    const openId = Number(openRow.id);

    // Step 1: close the open period at cutoff
    await conn.query(
      `UPDATE payroll_periods
       SET status='closed', to_at=?, closed_at=?
       WHERE id = ? AND shop_id = ? AND status='open'`,
      [now, now, openId, shopId]
    );

    // Step 2: create new open period starting at cutoff
    const [r] = await conn.query(
      `INSERT INTO payroll_periods (shop_id, from_at, status, created_by)
       VALUES (?, ?, 'open', ?)`,
      [shopId, now, userId]
    );
    const newOpenId = Number(r.insertId);

    // Step 3: assign "unsettled" orders into the correct side of the cutoff
    // - Orders before cutoff should belong to the just-closed period (openId)
    await conn.query(
      `UPDATE orders
       SET payroll_period_id = ?
       WHERE shop_id = ?
         AND created_at < ?
         AND (payroll_period_id IS NULL OR payroll_period_id = ?)`,
      [openId, shopId, now, openId]
    );

    // - Orders at/after cutoff should belong to the new open period
    await conn.query(
      `UPDATE orders
       SET payroll_period_id = ?
       WHERE shop_id = ?
         AND created_at >= ?
         AND (payroll_period_id IS NULL OR payroll_period_id = ?)`,
      [newOpenId, shopId, now, openId]
    );

    await conn.commit();

    // Snapshot settlements for the closed period after re-assignment
    await rebuildPayrollSettlementsForPeriod(pool, { shopId, periodId: openId });

    return { closedPeriodId: openId, newOpenPeriodId: newOpenId };
  } catch (e) {
    try { await conn.rollback(); } catch {}
    throw e;
  } finally {
    conn.release();
  }
}

async function getOrderPayrollPeriod(pool, { shopId, orderId }) {
  const [[row]] = await pool.query(
    `SELECT o.payroll_period_id, p.status
     FROM orders o
     LEFT JOIN payroll_periods p ON p.id = o.payroll_period_id
     WHERE o.shop_id = ? AND o.id = ?
     LIMIT 1`,
    [shopId, orderId]
  );
  return {
    payroll_period_id: row?.payroll_period_id != null ? Number(row.payroll_period_id) : null,
    status: row?.status ? String(row.status) : null,
  };
}

/** Thời điểm (vd `returns.created_at`) nằm trong [from_at, to_at] của một kỳ lương đã chốt — dùng chặn xóa đơn hoàn giống đơn bán. */
async function isShopDateTimeInClosedPayrollPeriod(poolOrConn, { shopId, at }) {
  const [[row]] = await poolOrConn.query(
    `SELECT 1 AS blocked
     FROM payroll_periods
     WHERE shop_id = ?
       AND status = 'closed'
       AND ? >= from_at
       AND to_at IS NOT NULL
       AND ? <= to_at
     LIMIT 1`,
    [shopId, at, at]
  );
  return !!row?.blocked;
}

module.exports = {
  ensureOpenPayrollPeriod,
  reindexOrdersToPayrollPeriods,
  rebuildPayrollSettlementsForPeriod,
  closeOpenPayrollPeriod,
  getPayrollPeriodById,
  getOrderPayrollPeriod,
  isShopDateTimeInClosedPayrollPeriod,
};

