import { isAdminUser } from "./utils";

/** Sửa đơn quầy: khớp PUT /orders/:id khi is_counter_sale (hoặc địa chỉ quầy). */
export function mayEditCounterSaleOrder(user: any): boolean {
  if (!user) return false;
  if (user.is_super_admin || isAdminUser(user)) return true;
  const c2 = user._caps2;
  if (c2 && typeof c2 === "object" && c2["orders.counter_edit"] === true) return true;
  return !!(user._caps?.orders?.edit && c2 && c2["orders.edit"] === true);
}

/** Xóa đơn quầy: khớp DELETE /orders/:id cho đơn quầy. */
export function mayDeleteCounterSaleOrder(user: any): boolean {
  if (!user) return false;
  if (user.is_super_admin || isAdminUser(user)) return true;
  const c2 = user._caps2;
  if (c2 && typeof c2 === "object" && c2["orders.counter_delete"] === true) return true;
  return !!(user._caps?.orders?.delete && c2 && c2["orders.delete"] === true);
}
