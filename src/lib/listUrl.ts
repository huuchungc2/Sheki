/** Dùng chung cho danh sách có phân trang trên URL (?page=&q=...) */

export function parseListPage(sp: URLSearchParams, key = "page"): number {
  const p = parseInt(sp.get(key) || "1", 10);
  return Number.isFinite(p) && p >= 1 ? p : 1;
}

/** Các nút số trang quanh trang hiện tại (không cố định 1…5) */
export function getVisiblePageNumbers(current: number, totalPages: number, maxButtons = 5): number[] {
  if (totalPages <= 0) return [];
  if (totalPages <= maxButtons) {
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }
  const half = Math.floor(maxButtons / 2);
  let start = Math.max(1, current - half);
  let end = Math.min(totalPages, start + maxButtons - 1);
  if (end - start + 1 < maxButtons) {
    start = Math.max(1, end - maxButtons + 1);
  }
  return Array.from({ length: end - start + 1 }, (_, i) => start + i);
}
