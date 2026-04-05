export const formatCtvRate = (min: number, max?: number | null): string => {
  if (typeof max === 'number' && max != null) {
    return `${min}% → ${max}%`;
  }
  return `≥ ${min}%`;
};

// Compute direct (CTV) and override (Sales manager) commissions for a line/order
export function calculateLineCommissions(
  subtotal: number,
  ctvRateMin: number,
  ctvRateMax: number | null,
  salesOverrideRate: number,
  hasManager: boolean
): { direct: number; override: number } {
  const direct = subtotal * (ctvRateMin / 100);
  // Override áp dụng khi có quản lý và tier đủ điều kiện (ctvRateMin >= 10 theo rule ví dụ)
  const tierQualified = typeof ctvRateMin === 'number' && ctvRateMin >= 10;
  const override = (hasManager && tierQualified) ? subtotal * (salesOverrideRate / 100) : 0;
  return { direct, override };
}
