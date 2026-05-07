/** Khối cấu hình dòng đơn từ GET /auth/me → shop_order_line (nested hoặc legacy flat). */
export type ShopOrderLineBlock = {
  show_commission?: boolean;
  show_discount?: boolean;
  default_commission_rate?: number;
  /** % CK mặc định khi thêm dòng mới */
  default_discount_rate?: number;
  /** SL: true = cho nhập lẻ (DECIMAL 10,3) */
  qty_allow_decimal?: boolean;
};

function blockLooksLikeOrderLine(block: unknown): block is ShopOrderLineBlock {
  if (!block || typeof block !== "object") return false;
  const b = block as Record<string, unknown>;
  return (
    "show_commission" in b ||
    "show_discount" in b ||
    "qty_allow_decimal" in b ||
    "default_commission_rate" in b ||
    "default_discount_rate" in b
  );
}

/** Chuẩn hóa cờ từ API (boolean / 0-1 / "true") — mặc định true giống backend khi null. */
export function coerceOrderLineBool(v: unknown, defaultValue: boolean): boolean {
  if (v == null) return defaultValue;
  if (typeof v === "boolean") return v;
  if (typeof v === "number") return v !== 0 && Number.isFinite(v);
  if (typeof v === "string") {
    const s = v.trim().toLowerCase();
    if (s === "true" || s === "1" || s === "yes") return true;
    if (s === "false" || s === "0" || s === "no") return false;
    const n = Number(s);
    if (!Number.isNaN(n)) return n !== 0;
  }
  return defaultValue;
}

export function pickShopOrderLineBlock(sol: unknown, mode: "delivery" | "counter"): ShopOrderLineBlock | null {
  if (!sol || typeof sol !== "object") return null;
  const o = sol as Record<string, unknown>;
  const nested = mode === "delivery" ? o.delivery : o.counter;
  if (nested && typeof nested === "object" && nested !== null && blockLooksLikeOrderLine(nested)) {
    return nested as ShopOrderLineBlock;
  }
  if (
    mode === "counter" &&
    o.delivery &&
    typeof o.delivery === "object" &&
    o.delivery !== null &&
    blockLooksLikeOrderLine(o.delivery)
  ) {
    return o.delivery as ShopOrderLineBlock;
  }
  if (mode === "delivery") {
    if (
      "order_line_show_commission" in o ||
      "order_line_show_discount" in o ||
      "order_qty_allow_decimal" in o
    ) {
      return {
        show_commission: o.order_line_show_commission as ShopOrderLineBlock["show_commission"],
        show_discount: o.order_line_show_discount as ShopOrderLineBlock["show_discount"],
        default_commission_rate: Number(o.order_default_commission_rate),
        default_discount_rate: Number(o.order_default_discount_rate),
        qty_allow_decimal: o.order_qty_allow_decimal as ShopOrderLineBlock["qty_allow_decimal"],
      };
    }
  }
  if (mode === "counter") {
    if (
      "counter_order_line_show_commission" in o ||
      "counter_order_line_show_discount" in o ||
      "counter_order_qty_allow_decimal" in o
    ) {
      return {
        show_commission: o.counter_order_line_show_commission as ShopOrderLineBlock["show_commission"],
        show_discount: o.counter_order_line_show_discount as ShopOrderLineBlock["show_discount"],
        default_commission_rate: Number(o.counter_order_default_commission_rate),
        default_discount_rate: Number(o.counter_order_default_discount_rate),
        qty_allow_decimal: o.counter_order_qty_allow_decimal as ShopOrderLineBlock["qty_allow_decimal"],
      };
    }
  }
  if (blockLooksLikeOrderLine(o) && !("delivery" in o) && !("counter" in o)) {
    return o as ShopOrderLineBlock;
  }
  return null;
}
