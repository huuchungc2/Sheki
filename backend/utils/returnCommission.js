const EPSILON = 1e-9;

function roundMoney(value) {
  return Math.round((parseFloat(value) || 0) * 100) / 100;
}

function allocateReturnAcrossLines(lines, requestedQty, alreadyReturnedQty = 0) {
  let remaining = Math.max(0, parseFloat(requestedQty) || 0);
  let skip = Math.max(0, parseFloat(alreadyReturnedQty) || 0);
  const allocations = [];

  for (const line of lines || []) {
    if (remaining <= EPSILON) break;
    const lineQty = Math.max(0, parseFloat(line.qty) || 0);
    if (lineQty <= EPSILON) continue;

    const skippedOnLine = Math.min(skip, lineQty);
    skip -= skippedOnLine;
    const available = lineQty - skippedOnLine;
    if (available <= EPSILON) continue;

    const take = Math.min(remaining, available);
    allocations.push({ line, take });
    remaining -= take;
  }

  return allocations;
}

function prorateLineCommission(lineCommissionAmount, lineQty, returnedQty) {
  const qty = parseFloat(lineQty) || 0;
  if (qty <= 0) return 0;
  const take = Math.max(0, Math.min(qty, parseFloat(returnedQty) || 0));
  return (parseFloat(lineCommissionAmount) || 0) * take / qty;
}

function resolveReturnAdjustment({
  calculatedAmount,
  originalCommission,
  alreadyAdjusted = 0,
  fullyReturned = false,
}) {
  const remaining = Math.max(
    0,
    roundMoney(originalCommission) - roundMoney(alreadyAdjusted)
  );
  if (remaining <= 0) return 0;
  if (fullyReturned) return roundMoney(remaining);
  return Math.min(roundMoney(calculatedAmount), roundMoney(remaining));
}

module.exports = {
  allocateReturnAcrossLines,
  prorateLineCommission,
  resolveReturnAdjustment,
  roundMoney,
};
