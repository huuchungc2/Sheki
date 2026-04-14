/**
 * KPI hoa hồng thống nhất (CLAUDE.md): direct gross + override net theo kỳ phát sinh (commissions.created_at).
 * Dùng chung Dashboard, /reports/salary summary, đối soát đơn hàng.
 */

/**
 * @param {import('mysql2/promise').Pool} pool
 * @param {{ month: number, year: number, groupId?: number|null, userId?: number|null }} opts
 *   userId: chỉ sales — giới hạn c.user_id (và override adj cùng user)
 */
async function getCommissionMonthKpi(pool, { month, year, groupId = null, userId = null }) {
  const g = groupId != null ? parseInt(String(groupId), 10) : null;
  const uid = userId != null ? parseInt(String(userId), 10) : null;
  const groupCond = g != null && Number.isFinite(g) ? ' AND o.group_id = ?' : '';
  const userCond = uid != null && Number.isFinite(uid) ? ' AND c.user_id = ?' : '';
  const userCondAdj = uid != null && Number.isFinite(uid) ? ' AND ca.user_id = ?' : '';

  const baseParams = [month, year];
  const directParams = [...baseParams];
  const ovParams = [...baseParams];
  const adjParams = [...baseParams];
  if (g != null && Number.isFinite(g)) {
    directParams.push(g);
    ovParams.push(g);
    adjParams.push(g);
  }
  if (uid != null && Number.isFinite(uid)) {
    directParams.push(uid);
    ovParams.push(uid);
    adjParams.push(uid);
  }

  const [[dRow]] = await pool.query(
    `SELECT COALESCE(SUM(c.commission_amount), 0) AS v
     FROM commissions c
     JOIN orders o ON c.order_id = o.id
     WHERE MONTH(c.created_at) = ? AND YEAR(c.created_at) = ?
       AND c.type = 'direct' AND o.status != 'cancelled'${groupCond}${userCond}`,
    directParams
  );
  const [[oRow]] = await pool.query(
    `SELECT COALESCE(SUM(c.commission_amount), 0) AS v
     FROM commissions c
     JOIN orders o ON c.order_id = o.id
     WHERE MONTH(c.created_at) = ? AND YEAR(c.created_at) = ?
       AND c.type = 'override' AND o.status != 'cancelled'${groupCond}${userCond}`,
    ovParams
  );
  const [[aRow]] = await pool.query(
    `SELECT COALESCE(SUM(ca.amount), 0) AS v
     FROM commission_adjustments ca
     JOIN orders o ON ca.order_id = o.id
     WHERE MONTH(ca.created_at) = ? AND YEAR(ca.created_at) = ?
       AND ca.type = 'override' AND o.status != 'cancelled'${groupCond}${userCondAdj}`,
    adjParams
  );

  const directGross = parseFloat(dRow?.v) || 0;
  const overrideComm = parseFloat(oRow?.v) || 0;
  const overrideAdj = parseFloat(aRow?.v) || 0;
  const overrideNet = overrideComm + overrideAdj;
  const totalHH = directGross + overrideNet;

  return {
    directGross,
    overrideComm,
    overrideAdj,
    overrideNet,
    totalHH,
  };
}

/**
 * Tổng HH direct (gross) theo phát sinh trong khoảng ngày [dateFrom, dateTo] (DATE(c.created_at)),
 * cùng bộ lọc đơn như danh sách đơn (trừ khi không có ngày — khi đó không lọc theo thời gian).
 */
async function sumDirectGrossAccrualForOrderFilters(pool, {
  scopeOwnData,
  userId,
  search,
  status,
  employee,
  warehouse,
  date_from,
  date_to,
  group_id,
}) {
  const params = [];
  let sql = `
    SELECT COALESCE(SUM(c.commission_amount), 0) AS v
    FROM commissions c
    INNER JOIN orders o ON c.order_id = o.id
    LEFT JOIN customers cu ON o.customer_id = cu.id
    WHERE c.type = 'direct'
      AND o.status != 'cancelled'
  `;

  if (scopeOwnData && userId) {
    sql += ' AND o.salesperson_id = ?';
    params.push(userId);
  }
  if (search) {
    const like = `%${search}%`;
    sql += ' AND (o.code LIKE ? OR cu.name LIKE ?)';
    params.push(like, like);
  }
  if (status) {
    sql += ' AND o.status = ?';
    params.push(status);
  }
  if (employee) {
    sql += ' AND o.salesperson_id = ?';
    params.push(employee);
  }
  if (warehouse) {
    sql += ' AND o.warehouse_id = ?';
    params.push(warehouse);
  }
  if (group_id) {
    sql += ' AND o.group_id = ?';
    params.push(parseInt(group_id, 10));
  }
  if (date_from) {
    sql += ' AND DATE(c.created_at) >= ?';
    params.push(date_from);
  }
  if (date_to) {
    sql += ' AND DATE(c.created_at) <= ?';
    params.push(date_to);
  }

  const [[row]] = await pool.query(sql, params);
  return parseFloat(row?.v) || 0;
}

/**
 * Khi date_from = ngày 1 và date_to = cuối tháng cùng năm/tháng → trả { month, year } để dùng chung SQL với báo cáo (MONTH/YEAR).
 * Không khớp (tuần, tuỳ chọn, lệch ngày) → null.
 */
function tryParseFullCalendarMonthFromRange(date_from, date_to) {
  if (!date_from || !date_to) return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(date_from).trim());
  const n = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(date_to).trim());
  if (!m || !n) return null;
  const y1 = parseInt(m[1], 10);
  const mo1 = parseInt(m[2], 10);
  const d1 = parseInt(m[3], 10);
  const y2 = parseInt(n[1], 10);
  const mo2 = parseInt(n[2], 10);
  const d2 = parseInt(n[3], 10);
  if (y1 !== y2 || mo1 !== mo2) return null;
  const lastDay = new Date(y1, mo1, 0).getDate();
  if (d1 !== 1 || d2 !== lastDay) return null;
  return { month: mo1, year: y1 };
}

module.exports = {
  getCommissionMonthKpi,
  sumDirectGrossAccrualForOrderFilters,
  tryParseFullCalendarMonthFromRange,
};
