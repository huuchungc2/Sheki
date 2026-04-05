export const formatCtvRate = (min: number, max?: number | null): string => {
  if (typeof max === 'number' && max != null) {
    return `${min}% → ${max}%`;
  }
  return `≥ ${min}%`;
};
