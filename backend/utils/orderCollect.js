/**
 * Thu khách / Shop thu — theo LOGIC_BUSINESS.md §3
 * @param {'shop'|'customer'} shipPayer
 */
function round2(n) {
  return Math.max(0, Math.round((Number(n) || 0) * 100) / 100);
}

function computeOrderCollects(subtotal, shippingFee, deposit, shipPayer) {
  const s = round2(subtotal);
  const sh = round2(shippingFee);
  const d = round2(deposit);
  if (shipPayer === 'customer') {
    return {
      customer_collect: round2(s + sh - d),
      shop_collect: round2(s - d),
    };
  }
  const v = round2(s - sh - d);
  return { customer_collect: v, shop_collect: v };
}

module.exports = { computeOrderCollects, round2 };
