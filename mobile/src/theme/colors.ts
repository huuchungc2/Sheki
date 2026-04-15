// mobile/src/theme/colors.ts
export const colors = {
  primary: '#E31837',
  primaryDark: '#C41230',
  dark: '#0F172A',
  blue: '#2563EB',
  blueDark: '#1D4ED8',
  white: '#FFFFFF',
  bgLight: '#F8FAFC',
  border: '#E2E8F0',
  textDark: '#0F172A',
  textMid: '#64748B',
  textLight: '#94A3B8',
  success: '#10B981',
  successBg: '#ECFDF5',
  warning: '#F59E0B',
  warningBg: '#FFFBEB',
  danger: '#EF4444',
  dangerBg: '#FEF2F2',
  info: '#2563EB',
  infoBg: '#EFF6FF',
};

export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  full: 999,
};

export const font = {
  regular: '400' as const,
  medium: '500' as const,
  semibold: '600' as const,
  bold: '700' as const,
  black: '900' as const,
};

// Order status config — dùng cho StatusBadge
export const orderStatusConfig: Record<string, { label: string; color: string; bg: string }> = {
  draft:     { label: 'Nháp',       color: '#64748B', bg: '#F1F5F9' },
  confirmed: { label: 'Xác nhận',   color: '#2563EB', bg: '#EFF6FF' },
  shipping:  { label: 'Đang giao',  color: '#F59E0B', bg: '#FFFBEB' },
  done:      { label: 'Hoàn thành', color: '#10B981', bg: '#ECFDF5' },
  cancelled: { label: 'Đã hủy',     color: '#EF4444', bg: '#FEF2F2' },
};

// Format tiền VND
export function formatCurrency(amount: number | string | null | undefined): string {
  const num = Number(amount) || 0;
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(num);
}

// Format ngày
export function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
}
