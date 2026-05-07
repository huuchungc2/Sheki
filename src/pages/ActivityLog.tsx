import * as React from "react";
import { 
  Search, Filter, ChevronLeft, ChevronRight, Loader2, AlertCircle,
  User, Package, ShoppingCart, Warehouse, Settings, Key, Upload,
  Eye, CheckCircle2, XCircle, Clock, FileText
} from "lucide-react";
import { cn, formatDate } from "../lib/utils";

const API_URL =
  (import.meta as any)?.env?.VITE_API_URL ||
  "/api";

const MODULE_ICONS: Record<string, any> = {
  employees: User,
  products: Package,
  customers: User,
  orders: ShoppingCart,
  inventory: Warehouse,
  auth: Key,
  settings: Settings,
  import: Upload,
};

const MODULE_LABELS: Record<string, string> = {
  employees: "Nhân viên",
  products: "Sản phẩm",
  customers: "Khách hàng",
  orders: "Đơn hàng",
  inventory: "Kho bãi",
  auth: "Đăng nhập",
  settings: "Cài đặt",
  import: "Nhập liệu",
};

const ACTION_LABELS: Record<string, string> = {
  create: "Tạo mới",
  update: "Cập nhật",
  delete: "Xóa",
  login: "Đăng nhập",
  logout: "Đăng xuất",
  import: "Nhập hàng loạt",
  export: "Xuất dữ liệu",
};

export function ActivityLog() {
  const [logs, setLogs] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [searchInput, setSearchInput] = React.useState("");
  const [searchQuery, setSearchQuery] = React.useState("");
  const [isComposing, setIsComposing] = React.useState(false);
  const [module, setModule] = React.useState("");
  const [status, setStatus] = React.useState("");
  const [page, setPage] = React.useState(1);
  const [total, setTotal] = React.useState(0);
  const [selectedLog, setSelectedLog] = React.useState<any>(null);
  const limit = 20;

  React.useEffect(() => {
    if (isComposing) return;
    const t = window.setTimeout(() => {
      const next = searchInput;
      if (next === searchQuery) return;
      const hasMeaningful = next.trim().length > 0;
      setSearchQuery(hasMeaningful ? next : "");
      setPage(1);
    }, 350);
    return () => window.clearTimeout(t);
  }, [searchInput, searchQuery, isComposing]);

  const fetchLogs = React.useCallback(async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("token");
      const params = new URLSearchParams({
        search: searchQuery,
        module,
        status,
        page: String(page),
        limit: String(limit),
      });
      const res = await fetch(`${API_URL}/logs?${params}`, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (!res.ok) throw new Error("Không thể tải nhật ký");
      const json = await res.json();
      setLogs(json.data);
      setTotal(json.total || 0);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [searchQuery, module, status, page]);

  React.useEffect(() => { fetchLogs(); }, [fetchLogs]);

  const totalPages = Math.ceil(total / limit);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-xl font-semibold tracking-tight">Nhật ký hoạt động</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Theo dõi mọi thay đổi trong hệ thống{total ? ` (${total} bản ghi)` : ""}.
          </p>
        </div>
      </div>

      <div className="bg-card border border-border rounded-lg p-4 flex flex-col md:flex-row gap-3 md:items-center md:justify-between">
        <div className="relative w-full md:max-w-md">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            value={searchInput}
            onChange={(e) => { setSearchInput(e.target.value); }}
            onCompositionStart={() => setIsComposing(true)}
            onCompositionEnd={(e) => {
              setIsComposing(false);
              setSearchInput((e.target as HTMLInputElement).value);
            }}
            placeholder="Tìm theo người dùng, IP, mô tả..."
            className={cn(
              "w-full h-10 pl-9 pr-3 rounded-md bg-background text-foreground text-sm",
              "border border-input outline-none",
              "focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
            )}
          />
        </div>

        <div className="flex flex-col sm:flex-row gap-2 w-full md:w-auto">
          <select
            value={module}
            onChange={(e) => { setModule(e.target.value); setPage(1); }}
            className={cn(
              "h-10 w-full sm:w-48 rounded-md bg-background text-foreground text-sm",
              "border border-input px-3 outline-none",
              "focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
            )}
          >
            <option value="">Tất cả module</option>
            {Object.entries(MODULE_LABELS).map(([key, label]) => (
              <option key={key} value={key}>{label}</option>
            ))}
          </select>

          <select
            value={status}
            onChange={(e) => { setStatus(e.target.value); setPage(1); }}
            className={cn(
              "h-10 w-full sm:w-40 rounded-md bg-background text-foreground text-sm",
              "border border-input px-3 outline-none",
              "focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
            )}
          >
            <option value="">Tất cả trạng thái</option>
            <option value="success">Thành công</option>
            <option value="error">Lỗi</option>
          </select>
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/10 text-destructive px-4 py-3 text-sm flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span className="min-w-0">{error}</span>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-6 h-6 text-muted-foreground animate-spin" />
        </div>
      ) : (
        <>
          <div className="rounded-lg border border-border overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-muted border-b border-border">
                    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide">Thời gian</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide">Người dùng</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide">IP</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide">Module</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide">Hành động</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide">Mô tả</th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-muted-foreground uppercase tracking-wide">Trạng thái</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wide">Chi tiết</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {logs.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="px-4 py-10 text-center text-sm text-muted-foreground">
                        Không có nhật ký nào
                      </td>
                    </tr>
                  ) : logs.map((log: any) => {
                    const Icon = MODULE_ICONS[log.module] || FileText;
                    const isSuccess = log.status === "success";
                    return (
                      <tr key={log.id} className="bg-background hover:bg-accent/30 transition-colors">
                        <td className="px-4 py-3">
                          <p className="text-sm tabular-nums">{formatDate(log.created_at)}</p>
                          <p className="text-xs text-muted-foreground tabular-nums">
                            {new Date(log.created_at).toLocaleTimeString("vi-VN")}
                          </p>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2 min-w-0">
                            <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-xs font-semibold text-foreground shrink-0">
                              {(log.user_name || "U").charAt(0).toUpperCase()}
                            </div>
                            <span className="text-sm font-medium truncate">{log.user_name || "—"}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-xs font-mono tabular-nums text-muted-foreground" title={log.ip_address || undefined}>
                            {log.ip_address || "—"}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Icon className="w-4 h-4" />
                            <span className="text-foreground/90">{MODULE_LABELS[log.module] || log.module}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-sm font-medium">{ACTION_LABELS[log.action] || log.action}</span>
                        </td>
                        <td className="px-4 py-3">
                          <p className="text-sm text-muted-foreground truncate max-w-[240px]">{log.target_name || "—"}</p>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span
                            className={cn(
                              "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wide border",
                              isSuccess
                                ? "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-300 dark:border-emerald-900/50"
                                : "bg-red-50 text-red-700 border-red-200 dark:bg-red-950/30 dark:text-red-300 dark:border-red-900/50",
                            )}
                          >
                            {isSuccess ? <CheckCircle2 className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                            {isSuccess ? "OK" : "Lỗi"}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <button
                            onClick={() => setSelectedLog(log)}
                            className={cn(
                              "inline-flex items-center justify-center h-8 w-8 rounded-md",
                              "text-muted-foreground hover:text-foreground hover:bg-accent transition-colors",
                            )}
                            aria-label="Xem chi tiết"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {totalPages > 1 && (
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <p className="text-xs text-muted-foreground">
                Hiển thị{" "}
                <span className="text-foreground tabular-nums">
                  {(page - 1) * limit + 1}-{Math.min(page * limit, total)}
                </span>{" "}
                trong số{" "}
                <span className="text-foreground tabular-nums">{total}</span> nhật ký
              </p>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className={cn(
                    "h-9 w-9 rounded-md border border-border bg-background",
                    "text-muted-foreground hover:text-foreground hover:bg-accent transition-colors",
                    "disabled:opacity-40 disabled:pointer-events-none",
                  )}
                  aria-label="Trang trước"
                >
                  <ChevronLeft className="w-4 h-4 mx-auto" />
                </button>

                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  const p = i + 1;
                  const active = page === p;
                  return (
                    <button
                      key={p}
                      onClick={() => setPage(p)}
                      className={cn(
                        "h-9 w-9 rounded-md border text-xs font-semibold tabular-nums transition-colors",
                        active
                          ? "bg-primary text-primary-foreground border-primary"
                          : "bg-background text-foreground border-border hover:bg-accent",
                      )}
                      aria-current={active ? "page" : undefined}
                    >
                      {p}
                    </button>
                  );
                })}

                <button
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className={cn(
                    "h-9 w-9 rounded-md border border-border bg-background",
                    "text-muted-foreground hover:text-foreground hover:bg-accent transition-colors",
                    "disabled:opacity-40 disabled:pointer-events-none",
                  )}
                  aria-label="Trang sau"
                >
                  <ChevronRight className="w-4 h-4 mx-auto" />
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {selectedLog && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-foreground/20 backdrop-blur-sm"
          onClick={() => setSelectedLog(null)}
          role="dialog"
          aria-modal="true"
        >
          <div
            className="w-full max-w-lg bg-card text-card-foreground rounded-xl border border-border shadow-lg"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-5 py-4 border-b border-border">
              <h3 className="text-base font-semibold tracking-tight">Chi tiết nhật ký</h3>
              <button
                onClick={() => setSelectedLog(null)}
                className={cn(
                  "h-9 w-9 rounded-md border border-border bg-background",
                  "text-muted-foreground hover:text-foreground hover:bg-accent transition-colors",
                )}
                aria-label="Đóng"
              >
                <XCircle className="w-4 h-4 mx-auto" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Thời gian</p>
                  <p className="text-sm font-medium mt-1 tabular-nums">{formatDate(selectedLog.created_at)}</p>
                  <p className="text-xs text-muted-foreground tabular-nums">
                    {new Date(selectedLog.created_at).toLocaleTimeString("vi-VN")}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Người dùng</p>
                  <p className="text-sm font-medium mt-1">{selectedLog.user_name || "—"}</p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Module</p>
                  <p className="text-sm font-medium mt-1">{MODULE_LABELS[selectedLog.module] || selectedLog.module}</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Hành động</p>
                  <p className="text-sm font-medium mt-1">{ACTION_LABELS[selectedLog.action] || selectedLog.action}</p>
                </div>
              </div>

              {selectedLog.target_name && (
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Đối tượng</p>
                  <p className="text-sm font-medium mt-1">{selectedLog.target_name}</p>
                </div>
              )}

              {selectedLog.details && (
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Chi tiết</p>
                  <pre className="mt-2 p-3 bg-muted rounded-lg text-xs overflow-auto max-h-44 border border-border">
                    {JSON.stringify(
                      typeof selectedLog.details === "string" ? JSON.parse(selectedLog.details) : selectedLog.details,
                      null,
                      2
                    )}
                  </pre>
                </div>
              )}

              {selectedLog.error_message && (
                <div>
                  <p className="text-xs font-medium text-destructive uppercase tracking-wide">Lỗi</p>
                  <div className="mt-2 p-3 rounded-lg border border-destructive/30 bg-destructive/10 text-sm text-destructive">
                    {selectedLog.error_message}
                  </div>
                </div>
              )}

              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Địa chỉ IP</p>
                <p className="text-sm font-mono mt-1 tabular-nums">{selectedLog.ip_address || "—"}</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
