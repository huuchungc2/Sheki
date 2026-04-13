import clsx, { type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number) {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
  }).format(amount);
}

export function formatDate(date: Date | string) {
  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(date));
}

/** yyyy-mm-dd theo giờ local (tránh lệch ngày so với `toISOString().split("T")[0]` UTC). */
export function localTodayIsoDate(): string {
  const t = new Date();
  return `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, "0")}-${String(t.getDate()).padStart(2, "0")}`;
}

/** Chuỗi yyyy-mm-dd → phần ngày/tháng/năm cho dropdown dương lịch */
export function splitIsoDate(iso: string): { y: string; m: string; d: string } {
  if (!iso || !/^\d{4}-\d{2}-\d{2}$/.test(iso)) return { y: "", m: "", d: "" };
  const [y, m, d] = iso.split("-");
  return { y, m: String(Number(m)), d: String(Number(d)) };
}

/** Đủ ngày/tháng/năm → yyyy-mm-dd (dương lịch); thiếu → "" */
export function composeIsoDate(y: string, m: string, d: string): string {
  if (!y || !m || !d) return "";
  const yi = parseInt(y, 10);
  const mi = parseInt(m, 10);
  const di = parseInt(d, 10);
  if (Number.isNaN(yi) || Number.isNaN(mi) || Number.isNaN(di) || mi < 1 || mi > 12 || di < 1) return "";
  const maxD = new Date(yi, mi, 0).getDate();
  const day = Math.min(di, maxD);
  const dt = new Date(yi, mi - 1, day);
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}-${String(dt.getDate()).padStart(2, "0")}`;
}

/** Quyền giao diện / API quản trị.
 * - Ưu tiên cờ `can_access_admin` (có thể là boolean/number/string tuỳ nguồn localStorage/token cũ).
 * - Fallback theo `role`/`role_name` (case-insensitive) để tránh UI bị ẩn khi dữ liệu role viết hoa.
 */
export function isAdminUser(
  user:
    | { can_access_admin?: any; role?: any; role_name?: any }
    | null
    | undefined
): boolean {
  if (!user) return false;

  const flag = (user as any).can_access_admin;
  if (typeof flag === "boolean") return flag;
  if (flag != null) {
    const s = String(flag).trim().toLowerCase();
    if (s === "1" || s === "true" || s === "yes") return true;
    if (s === "0" || s === "false" || s === "no") return false;
    // fallback: JS truthy
    return Boolean(flag);
  }

  const role = String((user as any).role || "").trim().toLowerCase();
  if (role === "admin") return true;
  const roleName = String((user as any).role_name || "").trim().toLowerCase();
  if (roleName === "admin") return true;

  return false;
}
