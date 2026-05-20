/**
 * Ship KH Trả / NV chịu — cùng công thức báo cáo chốt kỳ lương (payroll_settlements):
 * SUM trên orders (salesperson_id), không chỉ đơn có dòng hoa hồng.
 */
async function sumShipNvForOrdersScope(pool, opts) {
  const {
    shopId,
    payrollPeriodId = null,
    groupId = null,
    salespersonId = null,
    month = null,
    year = null,
    yearOnly = false,
  } = opts;

  const conds = ['o.shop_id = ?', "o.status <> 'cancelled'"];
  const params = [shopId];

  if (payrollPeriodId != null && Number.isFinite(Number(payrollPeriodId))) {
    conds.push('o.payroll_period_id = ?');
    params.push(Number(payrollPeriodId));
  } else if (yearOnly && year != null) {
    conds.push('YEAR(o.created_at) = ?');
    params.push(Number(year));
  } else if (month != null && year != null) {
    conds.push('MONTH(o.created_at) = ?', 'YEAR(o.created_at) = ?');
    params.push(Number(month), Number(year));
  }

  if (groupId != null && Number.isFinite(Number(groupId))) {
    conds.push('o.group_id = ?');
    params.push(Number(groupId));
  }
  if (salespersonId != null && Number.isFinite(Number(salespersonId))) {
    conds.push('o.salesperson_id = ?');
    params.push(Number(salespersonId));
  }

  const [[row]] = await pool.query(
    `SELECT
       COALESCE(SUM(CASE WHEN o.ship_payer = 'shop' THEN 0 ELSE o.shipping_fee END), 0) AS total_khach_ship,
       COALESCE(SUM(o.salesperson_absorbed_amount), 0) AS total_nv_chiu
     FROM orders o
     WHERE ${conds.join(' AND ')}`,
    params
  );

  return {
    total_khach_ship: parseFloat(row?.total_khach_ship) || 0,
    total_nv_chiu: parseFloat(row?.total_nv_chiu) || 0,
  };
}

module.exports = { sumShipNvForOrdersScope };
