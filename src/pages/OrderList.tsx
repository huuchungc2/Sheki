import * as React from "react";
import {
  Search, Plus, ChevronLeft, ChevronRight,
  ShoppingCart, Calendar, CreditCard, Truck,
  Edit2, Trash2, CheckCircle2, Clock, XCircle,
  Wallet, ArrowRight, Loader2, ChevronDown, X
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { cn, formatCurrency, formatDate } from "../lib/utils";

const API_URL =
  (import.meta as any)?.env?.VITE_API_URL ||
  "http://localhost:3000/api";

const statusConfig: Record<string, { label: string; color: string; icon: any }> = {
  pending:   { label: "Chờ duyệt", color: "bg-amber-100 text-amber-700",    icon: Clock },
  shipping:  { label: "Đang giao", color: "bg-blue-100 text-blue-700",      icon: Truck },
  completed: { label: "Đã giao",   color: "bg-emerald-100 text-emerald-700", icon: CheckCircle2 },
  cancelled: { label: "Đã hủy",   color: "bg-red-100 text-red-700",        icon: XCircle },
};

const paymentConfig: Record<string, { label: string; icon: any }> = {
  cash:     { label: "Tiền mặt",     icon: Wallet },
  transfer: { label: "Chuyển khoản", icon: ArrowRight },
  card:     { label: "Thẻ ATM",      icon: CreditCard },
};

// Helper: format YYYY-MM-DD theo local time (tránh lệch múi giờ UTC+7)
function toDateStr(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

type DatePreset = "today" | "week" | "month" | "last_month" | "last_year" | "custom" | "";

function getPresetRange(preset: DatePreset): { from: string; to: string } {
  const today = new Date();
  const y = today.getFullYear();
  const m = today.getMonth();
  const d = today.getDate();
  if (preset === "today") return { from: toDateStr(today), to: toDateStr(today) };
  if (preset === "week") {
    const dow = today.getDay(); // 0=CN, 1=T2...
    const diffMon = dow === 0 ? -6 : 1 - dow; // T2 đầu tuần
    const mon = new Date(y, m, d + diffMon);
    const sun = new Date(y, m, d + diffMon + 6);
    return { from: toDateStr(mon), to: toDateStr(sun) };
  }
  if (preset === "month")      return { from: toDateStr(new Date(y, m, 1)),     to: toDateStr(new Date(y, m + 1, 0)) };
  if (preset === "last_month") return { from: toDateStr(new Date(y, m - 1, 1)), to: toDateStr(new Date(y, m, 0)) };
  if (preset === "last_year")  return { from: toDateStr(new Date(y - 1, 0, 1)), to: toDateStr(new Date(y - 1, 11, 31)) };
  return { from: "", to: "" };
}

export function OrderList() {
  const navigate = useNavigate();

  // Lấy role từ localStorage
  const currentUser = React.useMemo(() => {
    const u = localStorage.getItem("user");
    return u ? JSON.parse(u) : null;
  }, []);
  const isAdmin =
    currentUser?.can_access_admin === true || currentUser?.role === "admin";

  const [orders, setOrders]         = React.useState<any[]>([]);
  const [loading, setLoading]       = React.useState(true);
  const [error, setError]           = React.useState<string | null>(null);
  const [search, setSearch]         = React.useState("");
  const [status, setStatus]         = React.useState("");
  const [groupId, setGroupId]       = React.useState("");
  const [groups, setGroups]         = React.useState<any[]>([]);
  const [employeeId, setEmployeeId] = React.useState("");  // chỉ admin dùng
  const [employees, setEmployees]   = React.useState<any[]>([]);
  const [dateFrom, setDateFrom]     = React.useState(toDateStr(new Date()));
  const [dateTo, setDateTo]         = React.useState(toDateStr(new Date()));
  const [datePreset, setDatePreset] = React.useState<DatePreset>("today");
  const [showDateMenu, setShowDateMenu] = React.useState(false);
  const [page, setPage]             = React.useState(1);
  const [total, setTotal]           = React.useState(0);
  const [deleting, setDeleting]     = React.useState<string | null>(null);

  // Bulk select
  const [selected, setSelected]     = React.useState<Set<number>>(new Set());
  const [bulkStatus, setBulkStatus] = React.useState("");
  const [bulkLoading, setBulkLoading] = React.useState(false);

  const limit = 20;

  // Fetch groups
  React.useEffect(() => {
    const token = localStorage.getItem("token");
    const endpoint = isAdmin ? "/groups" : `/groups/user/${currentUser?.id}`;
    fetch(`${API_URL}${endpoint}`, { headers: { "Authorization": `Bearer ${token}` } })
      .then(r => r.json()).then(j => setGroups(j.data || [])).catch(() => {});
  }, [isAdmin, currentUser?.id]);

  // Fetch danh sách nhân viên (admin only)
  React.useEffect(() => {
    if (!isAdmin) return;
    const token = localStorage.getItem("token");
    fetch(`${API_URL}/users?scoped=1&limit=100`, {
      headers: { "Authorization": `Bearer ${token}` }
    })
      .then(r => r.json())
      .then(j => setEmployees(j.data || []))
      .catch(() => {});
  }, [isAdmin]);

  const fetchOrders = React.useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const token = localStorage.getItem("token");
      const params = new URLSearchParams({
        search, status,
        page: String(page),
        limit: String(limit),
        ...(dateFrom   && { date_from: dateFrom }),
        ...(dateTo     && { date_to:   dateTo }),
        ...(employeeId && { employee:  employeeId }),
        ...(groupId    && { group_id:  groupId }),
      });
      const res = await fetch(`${API_URL}/orders?${params}`, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (!res.ok) throw new Error("Không thể tải danh sách đơn hàng");
      const json = await res.json();
      setOrders(json.data);
      setTotal(json.total || 0);
      setSelected(new Set());
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [search, status, groupId, employeeId, dateFrom, dateTo, page]);

  React.useEffect(() => { fetchOrders(); }, [fetchOrders]);

  // Apply preset
  const applyPreset = (preset: DatePreset) => {
    setDatePreset(preset);
    if (preset !== "custom") {
      const { from, to } = getPresetRange(preset);
      setDateFrom(from);
      setDateTo(to);
    }
    if (preset !== "custom") setShowDateMenu(false);
    setPage(1);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Bạn có chắc muốn xóa đơn hàng này?")) return;
    try {
      setDeleting(id);
      const token = localStorage.getItem("token");
      await fetch(`${API_URL}/orders/${id}`, {
        method: "DELETE",
        headers: { "Authorization": `Bearer ${token}` }
      });
      fetchOrders();
    } catch { } finally { setDeleting(null); }
  };

  const handleBulkStatus = async () => {
    if (!bulkStatus || selected.size === 0) return;
    if (!confirm(`Đổi ${selected.size} đơn sang "${statusConfig[bulkStatus]?.label}"?`)) return;
    setBulkLoading(true);
    const token = localStorage.getItem("token");
    await Promise.all([...selected].map(id =>
      fetch(`${API_URL}/orders/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
        body: JSON.stringify({ status: bulkStatus })
      })
    ));
    setBulkLoading(false);
    setBulkStatus("");
    fetchOrders();
  };

  const toggleAll = () => {
    if (selected.size === orders.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(orders.map((o: any) => o.id)));
    }
  };

  const toggleOne = (id: number) => {
    const next = new Set(selected);
    next.has(id) ? next.delete(id) : next.add(id);
    setSelected(next);
  };

  const totalPages = Math.ceil(total / limit);

  const presetLabels: Record<string, string> = {
    today: "Hôm nay", week: "Tuần này", month: "Tháng này",
    last_month: "Tháng trước", last_year: "Năm trước", custom: "Tuỳ chọn"
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Quản lý đơn hàng</h1>
          <p className="text-slate-500 text-sm mt-0.5">Theo dõi và quản lý các giao dịch bán hàng.</p>
        </div>
        <Link to="/orders/new" className="inline-flex items-center gap-2 px-5 py-2.5 bg-red-600 text-white rounded-xl text-sm font-bold hover:bg-red-700 transition-all shadow-lg shadow-red-600/20">
          <Plus className="w-4 h-4" />
          Thêm đơn mới
        </Link>
      </div>

      {/* Filter bar */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 space-y-3">
        <div className="flex flex-wrap gap-3">
          {/* Search */}
          <div className="relative flex-1 min-w-[200px]">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text" value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              placeholder="Mã đơn, tên khách, SĐT..."
              className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 focus:border-red-300 focus:bg-white focus:ring-2 focus:ring-red-100 rounded-xl text-sm outline-none transition-all"
            />
          </div>

          {/* Trạng thái */}
          <select
            value={status}
            onChange={(e) => { setStatus(e.target.value); setPage(1); }}
            className="px-3 py-2 bg-slate-50 border border-slate-200 focus:border-red-300 focus:ring-2 focus:ring-red-100 rounded-xl text-sm outline-none appearance-none cursor-pointer transition-all min-w-[140px]"
          >
            <option value="">Tất cả trạng thái</option>
            <option value="pending">Chờ duyệt</option>
            <option value="shipping">Đang giao</option>
            <option value="completed">Đã giao</option>
            <option value="cancelled">Đã hủy</option>
          </select>

          {/* Nhóm bán hàng */}
          <select
            value={groupId}
            onChange={(e) => { setGroupId(e.target.value); setPage(1); }}
            className="px-3 py-2 bg-slate-50 border border-slate-200 focus:border-red-300 focus:ring-2 focus:ring-red-100 rounded-xl text-sm outline-none appearance-none cursor-pointer transition-all min-w-[140px]"
          >
            <option value="">Tất cả nhóm</option>
            {groups.map((g: any) => (
              <option key={g.id} value={g.id}>{g.name}</option>
            ))}
          </select>

          {/* Nhân viên — chỉ admin */}
          {isAdmin && (
            <select
              value={employeeId}
              onChange={(e) => { setEmployeeId(e.target.value); setPage(1); }}
              className="px-3 py-2 bg-slate-50 border border-slate-200 focus:border-red-300 focus:ring-2 focus:ring-red-100 rounded-xl text-sm outline-none appearance-none cursor-pointer transition-all min-w-[160px]"
            >
              <option value="">Tất cả nhân viên</option>
              {employees.map((emp: any) => (
                <option key={emp.id} value={emp.id}>{emp.full_name}</option>
              ))}
            </select>
          )}

          {/* Date preset dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowDateMenu(!showDateMenu)}
              className="flex items-center gap-2 px-3 py-2 bg-slate-50 border border-slate-200 hover:border-red-300 rounded-xl text-sm font-medium text-slate-700 transition-all min-w-[140px] justify-between"
            >
              <Calendar className="w-4 h-4 text-slate-400" />
              <span>{datePreset ? presetLabels[datePreset] : "Chọn thời gian"}</span>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
            </button>
            {showDateMenu && (
              <div className="absolute top-full left-0 mt-1 w-52 bg-white border border-slate-200 rounded-xl shadow-xl z-50 overflow-hidden">
                {(["today","week","month","last_month","last_year","custom"] as DatePreset[]).map(p => (
                  <button key={p} onClick={() => applyPreset(p)}
                    className={cn("w-full px-4 py-2.5 text-left text-sm hover:bg-slate-50 transition-colors",
                      datePreset === p ? "bg-red-50 text-red-600 font-semibold" : "text-slate-700"
                    )}>
                    {presetLabels[p]}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Custom date range — chỉ hiện khi preset = custom */}
          {datePreset === "custom" && (
            <div className="flex items-center gap-2">
              <input type="date" value={dateFrom}
                onChange={(e) => { setDateFrom(e.target.value); setPage(1); }}
                className="px-3 py-2 bg-slate-50 border border-slate-200 focus:border-red-300 rounded-xl text-sm outline-none focus:ring-2 focus:ring-red-100"
              />
              <span className="text-slate-400 text-xs">–</span>
              <input type="date" value={dateTo}
                onChange={(e) => { setDateTo(e.target.value); setPage(1); }}
                className="px-3 py-2 bg-slate-50 border border-slate-200 focus:border-red-300 rounded-xl text-sm outline-none focus:ring-2 focus:ring-red-100"
              />
            </div>
          )}

          {/* Xóa lọc */}
          {(search || status || groupId || employeeId || datePreset) && (
            <button
              onClick={() => { setSearch(""); setStatus(""); setGroupId(""); setEmployeeId(""); setDateFrom(""); setDateTo(""); setDatePreset(""); setPage(1); }}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-500 bg-slate-50 border border-slate-200 rounded-xl hover:text-red-600 hover:border-red-200 transition-all"
            >
              <X className="w-3.5 h-3.5" />
              Xóa lọc
            </button>
          )}
        </div>

        {/* Hiển thị range ngày đang áp dụng */}
        {(dateFrom || dateTo) && datePreset !== "custom" && (
          <p className="text-xs text-slate-400">
            Đang lọc: <span className="font-semibold text-slate-600">{dateFrom || "..."} → {dateTo || "..."}</span>
          </p>
        )}
      </div>

      {/* Bulk action bar */}
      {selected.size > 0 && (
        <div className="flex items-center gap-3 px-4 py-3 bg-blue-50 border border-blue-200 rounded-xl">
          <span className="text-sm font-semibold text-blue-700">Đã chọn {selected.size} đơn</span>
          <div className="flex items-center gap-2 ml-auto">
            <select
              value={bulkStatus}
              onChange={(e) => setBulkStatus(e.target.value)}
              className="px-3 py-1.5 border border-blue-200 bg-white rounded-lg text-sm outline-none focus:border-blue-400 cursor-pointer"
            >
              <option value="">Đổi trạng thái...</option>
              <option value="pending">Chờ duyệt</option>
              <option value="shipping">Đang giao</option>
              <option value="completed">Đã giao</option>
              <option value="cancelled">Đã hủy</option>
            </select>
            <button
              onClick={handleBulkStatus}
              disabled={!bulkStatus || bulkLoading}
              className="flex items-center gap-1.5 px-4 py-1.5 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 disabled:opacity-50 transition-all"
            >
              {bulkLoading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              Áp dụng
            </button>
            <button onClick={() => setSelected(new Set())} className="px-3 py-1.5 text-sm text-slate-500 hover:text-slate-700">Bỏ chọn</button>
          </div>
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">{error}</div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 text-red-600 animate-spin" />
        </div>
      ) : (
        <>
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="px-4 py-3 w-10">
                    <input type="checkbox"
                      checked={orders.length > 0 && selected.size === orders.length}
                      onChange={toggleAll}
                      className="w-4 h-4 rounded border-slate-300 text-blue-600 cursor-pointer"
                    />
                  </th>
                  <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Mã đơn</th>
                  <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Khách hàng</th>
                  {isAdmin && !employeeId && (
                    <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Nhân viên</th>
                  )}
                  <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Nhóm BH</th>
                  <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Thời gian</th>
                  <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide text-right">Tổng tiền</th>
                  <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide text-right">Hoa hồng</th>
                  <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide text-center">Trạng thái</th>
                  <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Thanh toán</th>
                  <th className="px-4 py-3 w-24"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {orders.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="px-4 py-16 text-center text-slate-400">
                      <ShoppingCart className="w-8 h-8 mx-auto mb-2 text-slate-200" />
                      Không có đơn hàng nào
                    </td>
                  </tr>
                ) : orders.map((order: any) => {
                  const st = statusConfig[order.status] || { label: order.status, color: "bg-slate-100 text-slate-600", icon: Clock };
                  const pay = paymentConfig[order.payment_method] || { label: order.payment_method || "—", icon: Wallet };
                  const isSelected = selected.has(order.id);
                  const initials = (order.customer_name || "?").split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase();
                  const isToday = order.created_at && new Date(order.created_at).toDateString() === new Date().toDateString();
                  return (
                    <tr key={order.id}
                      className={cn("group transition-colors cursor-pointer",
                        isSelected ? "bg-blue-50/60" : "hover:bg-slate-50/60"
                      )}
                      onClick={() => navigate(`/orders/edit/${order.id}`)}
                    >
                      <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                        <input type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleOne(order.id)}
                          className="w-4 h-4 rounded border-slate-300 text-blue-600 cursor-pointer"
                        />
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-sm font-bold text-red-600 font-mono">{order.code || `#${order.id}`}</span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-xs font-bold text-slate-500 flex-shrink-0">
                            {initials}
                          </div>
                          <div>
                            <p className="font-semibold text-slate-900 text-sm leading-tight">{order.customer_name || "—"}</p>
                            <p className="text-xs text-slate-400">{order.customer_phone || ""}</p>
                          </div>
                        </div>
                      </td>
                      {isAdmin && !employeeId && (
                        <td className="px-4 py-3">
                          <p className="text-sm text-slate-700 font-medium">{order.salesperson_name || "—"}</p>
                        </td>
                      )}
                      <td className="px-4 py-3">
                        {order.group_name
                          ? <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700">{order.group_name}</span>
                          : <span className="text-slate-300 text-xs">—</span>
                        }
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-sm font-medium text-slate-700">{isToday ? "Hôm nay" : (order.created_at ? formatDate(order.created_at) : "—")}</p>
                        <p className="text-xs text-slate-400">{order.created_at ? new Date(order.created_at).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) : ""}</p>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className="text-sm font-bold text-slate-900">{formatCurrency(order.total_amount || 0)}</span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className="text-sm font-semibold text-emerald-600">{formatCurrency(order.commission_amount || 0)}</span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={cn("inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold", st.color)}>
                          <st.icon className="w-3 h-3" />
                          {st.label}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5 text-xs text-slate-500">
                          <pay.icon className="w-3.5 h-3.5 text-slate-300" />
                          {pay.label}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Link to={`/orders/edit/${order.id}`}
                            className="w-7 h-7 rounded-lg bg-slate-100 hover:bg-blue-600 hover:text-white flex items-center justify-center text-slate-500 transition-all"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </Link>
                          <button
                            onClick={() => handleDelete(order.id)}
                            disabled={deleting === order.id}
                            className="w-7 h-7 rounded-lg bg-slate-100 hover:bg-red-600 hover:text-white flex items-center justify-center text-slate-500 transition-all disabled:opacity-50"
                          >
                            {deleting === order.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-1">
              <p className="text-xs text-slate-400">
                Hiển thị <span className="font-semibold text-slate-700">{(page - 1) * limit + 1}–{Math.min(page * limit, total)}</span> / <span className="font-semibold text-slate-700">{total}</span> đơn
              </p>
              <div className="flex items-center gap-1">
                <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 disabled:opacity-30 transition-all">
                  <ChevronLeft className="w-4 h-4" />
                </button>
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => i + 1).map(p => (
                  <button key={p} onClick={() => setPage(p)}
                    className={cn("w-8 h-8 rounded-lg text-xs font-bold transition-all",
                      page === p ? "bg-red-600 text-white shadow-lg shadow-red-600/20" : "hover:bg-slate-100 text-slate-600"
                    )}>
                    {p}
                  </button>
                ))}
                <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 disabled:opacity-30 transition-all">
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
