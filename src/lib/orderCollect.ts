export type ShipPayer = "shop" | "customer";

function round2(n: number): number {
  return Math.max(0, Math.round((Number(n) || 0) * 100) / 100);
}

/** Thu khách / Shop thu — LOGIC_BUSINESS.md §3 */
export function computeOrderCollects(
  subtotal: number,
  shippingFee: number,
  deposit: number,
  shipPayer: ShipPayer
): { customerCollect: number; shopCollect: number } {
  const s = round2(subtotal);
  const sh = round2(shippingFee);
  const d = round2(deposit);
  if (shipPayer === "customer") {
    return {
      customerCollect: round2(s + sh - d),
      shopCollect: round2(s - d),
    };
  }
  const v = round2(s - sh - d);
  return { customerCollect: v, shopCollect: v };
}
