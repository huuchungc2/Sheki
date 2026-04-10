import * as React from "react";
import { 
  Search, Filter, ChevronLeft, ChevronRight, Loader2, AlertCircle,
  User, Package, ShoppingCart, Warehouse, Settings, Key, Upload,
  Eye, CheckCircle2, XCircle, Clock, FileText
} from "lucide-react";
import { cn, formatDate } from "../lib/utils";

import.meta.env.VITE_API_URL || "/api"

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
  const [search, setSearch] = React.useState("");
  const [module, setModule] = React.useState("");
  const [status, setStatus] = React.useState("");
  const [page, setPage] = React.useState(1);
  const [total, setTotal] = React.useState(0);
  const [selectedLog, setSelectedLog] = React.useState<any>(null);
  const limit = 20;

  const fetchLogs = React.useCallback(async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("token");
      const params = new URLSearchParams({
        search,
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
  }, [search, module, status, page]);

  React.useEffect(() => { fetchLogs(); }, [fetchLogs]);

  const totalPages = Math.ceil(total / limit);

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Nhật ký hoạt động</h1>
          <p className="text-slate-500 text-sm mt-1">Theo dõi mọi thay đổi trong hệ thống.</p>
        </div>
      </div>

      <div className="bg-white p-4 rounded-2xl border border-slate-200 flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="relative w-full md:w-96">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input 
            type="text" 
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder="Tìm theo người dùng, mô tả..." 
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border-transparent focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 rounded-xl text-sm transition-all outline-none"
          />
        </div>
        <div className="flex items-center gap-2 w-full md:w-auto">
          <select value={module} onChange={(e) => { setModule(e.target.value); setPage(1); }} className="px-4 py-2 bg-slate-50 text-slate-600 rounded-xl text-sm font-medium outline-none focus:ring-2 focus:ring-blue-500/20">
            <option value="">Tất cả module</option>
            {Object.entries(MODULE_LABELS).map(([key, label]) => (
              <option key={key} value={key}>{label}</option>
            ))}
          </select>
          <select value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }} className="px-4 py-2 bg-slate-50 text-slate-600 rounded-xl text-sm font-medium outline-none focus:ring-2 focus:ring-blue-500/20">
            <option value="">Tất cả trạng thái</option>
            <option value="success">Thành công</option>
            <option value="error">Lỗi</option>
          </select>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" /> {error}
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
        </div>
      ) : (
        <>
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/50 border-b border-slate-200">
                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Thời gian</th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Người dùng</th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Module</th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Hành động</th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Mô tả</th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-center">Trạng thái</th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {logs.length === 0 ? (
                    <tr><td colSpan={7} className="px-6 py-12 text-center text-slate-400">Không có nhật ký nào</td></tr>
                  ) : logs.map((log: any) => {
                    const Icon = MODULE_ICONS[log.module] || FileText;
                    return (
                      <tr key={log.id} className="hover:bg-slate-50/50 transition-all">
                        <td className="px-6 py-4">
                          <p className="text-sm text-slate-900">{formatDate(log.created_at)}</p>
                          <p className="text-xs text-slate-400">{new Date(log.created_at).toLocaleTimeString('vi-VN')}</p>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-xs font-bold text-blue-600">
                              {(log.user_name || 'U').charAt(0).toUpperCase()}
                            </div>
                            <span className="text-sm font-medium text-slate-900">{log.user_name || "—"}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2 text-sm text-slate-600">
                            <Icon className="w-4 h-4 text-slate-400" />
                            {MODULE_LABELS[log.module] || log.module}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-sm font-medium text-slate-900">{ACTION_LABELS[log.action] || log.action}</span>
                        </td>
                        <td className="px-6 py-4">
                          <p className="text-sm text-slate-600 truncate max-w-[200px]">{log.target_name || "—"}</p>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <span className={cn(
                            "inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider",
                            log.status === 'success' ? "bg-emerald-50 text-emerald-600" : "bg-red-50 text-red-600"
                          )}>
                            {log.status === 'success' ? <CheckCircle2 className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                            {log.status === 'success' ? "OK" : "Lỗi"}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <button onClick={() => setSelectedLog(log)} className="p-2 hover:bg-blue-50 hover:text-blue-600 rounded-lg text-slate-400 transition-all">
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
            <div className="flex items-center justify-between gap-4 px-4">
              <p className="text-xs font-medium text-slate-400">Hiển thị <span className="text-slate-900">{(page - 1) * limit + 1}-{Math.min(page * limit, total)}</span> trong số <span className="text-slate-900">{total}</span> nhật ký</p>
              <div className="flex items-center gap-2">
                <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="p-2 text-slate-300 hover:text-blue-600 transition-colors disabled:opacity-30">
                  <ChevronLeft className="w-4 h-4" />
                </button>
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  const p = i + 1;
                  return (
                    <button key={p} onClick={() => setPage(p)} className={cn("w-8 h-8 rounded-lg text-xs font-bold transition-colors", page === p ? "bg-blue-600 text-white shadow-lg shadow-blue-600/20" : "hover:bg-slate-100 text-slate-600")}>
                      {p}
                    </button>
                  );
                })}
                <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="p-2 text-slate-300 hover:text-blue-600 transition-colors disabled:opacity-30">
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Detail Modal */}
      {selectedLog && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setSelectedLog(null)}>
          <div className="bg-white rounded-3xl max-w-lg w-full p-8 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-slate-900">Chi tiết nhật ký</h3>
              <button onClick={() => setSelectedLog(null)} className="p-2 hover:bg-slate-100 rounded-xl text-slate-400">
                <XCircle className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Thời gian</p>
                  <p className="text-sm font-medium text-slate-900 mt-1">{formatDate(selectedLog.created_at)}</p>
                  <p className="text-xs text-slate-400">{new Date(selectedLog.created_at).toLocaleTimeString('vi-VN')}</p>
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Người dùng</p>
                  <p className="text-sm font-medium text-slate-900 mt-1">{selectedLog.user_name || "—"}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Module</p>
                  <p className="text-sm font-medium text-slate-900 mt-1">{MODULE_LABELS[selectedLog.module] || selectedLog.module}</p>
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Hành động</p>
                  <p className="text-sm font-medium text-slate-900 mt-1">{ACTION_LABELS[selectedLog.action] || selectedLog.action}</p>
                </div>
              </div>
              {selectedLog.target_name && (
                <div>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Đối tượng</p>
                  <p className="text-sm font-medium text-slate-900 mt-1">{selectedLog.target_name}</p>
                </div>
              )}
              {selectedLog.details && (
                <div>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Chi tiết</p>
                  <pre className="mt-2 p-3 bg-slate-50 rounded-xl text-xs text-slate-700 overflow-auto max-h-40">
                    {JSON.stringify(typeof selectedLog.details === 'string' ? JSON.parse(selectedLog.details) : selectedLog.details, null, 2)}
                  </pre>
                </div>
              )}
              {selectedLog.error_message && (
                <div>
                  <p className="text-xs font-bold text-red-400 uppercase tracking-wider">Lỗi</p>
                  <p className="mt-2 p-3 bg-red-50 rounded-xl text-sm text-red-600">{selectedLog.error_message}</p>
                </div>
              )}
              {selectedLog.ip_address && (
                <div>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">IP Address</p>
                  <p className="text-sm font-mono text-slate-900 mt-1">{selectedLog.ip_address}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
