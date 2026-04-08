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

/** Quyền giao diện / API quản trị (JWT có can_access_admin; token cũ fallback role === admin) */
export function isAdminUser(user: { can_access_admin?: boolean; role?: string } | null | undefined): boolean {
  if (!user) return false;
  if (typeof user.can_access_admin === "boolean") return user.can_access_admin;
  return user.role === "admin";
}
