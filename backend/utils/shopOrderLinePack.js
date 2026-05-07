/** Gói 1 hàng shops → { delivery, counter } cho /auth/me và PATCH /shops/me/order-line */

function rowBit(v, defaultWhenNull = true) {
  if (v == null) return defaultWhenNull;
  if (typeof v === "boolean") return v;
  if (typeof v === "number") return v !== 0 && Number.isFinite(v);
  if (typeof v === "string") {
    const s = v.trim().toLowerCase();
    if (s === "true" || s === "1" || s === "yes") return true;
    if (s === "false" || s === "0" || s === "no") return false;
    const n = Number(s);
    if (!Number.isNaN(n)) return n !== 0;
  }
  return defaultWhenNull;
}

function packOrderLineRow(r) {
  const dr = Number(r.order_default_commission_rate);
  const cr = Number(r.counter_order_default_commission_rate);
  const ddr = Number(r.order_default_discount_rate);
  const cddr = Number(r.counter_order_default_discount_rate);
  const delivery = {
    show_commission: rowBit(r.order_line_show_commission, true),
    show_discount: rowBit(r.order_line_show_discount, true),
    default_commission_rate: Number.isFinite(dr) ? Math.min(100, Math.max(0, dr)) : 10,
    default_discount_rate: Number.isFinite(ddr) ? Math.min(100, Math.max(0, ddr)) : 0,
    qty_allow_decimal: rowBit(r.order_qty_allow_decimal == null ? 1 : Number(r.order_qty_allow_decimal), true),
  };
  const hasCounter =
    r.counter_order_line_show_commission !== undefined &&
    r.counter_order_line_show_discount !== undefined;
  const counter = hasCounter
    ? {
        show_commission: rowBit(r.counter_order_line_show_commission, true),
        show_discount: rowBit(r.counter_order_line_show_discount, true),
        default_commission_rate: Number.isFinite(cr) ? Math.min(100, Math.max(0, cr)) : 10,
        default_discount_rate: Number.isFinite(cddr) ? Math.min(100, Math.max(0, cddr)) : 0,
        qty_allow_decimal: rowBit(
          r.counter_order_qty_allow_decimal == null ? 1 : Number(r.counter_order_qty_allow_decimal),
          true
        ),
      }
    : { ...delivery };
  return { delivery, counter };
}

module.exports = { packOrderLineRow };
