import * as React from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import {
  ArrowLeft, Users, TrendingUp, DollarSign, Package,
  ShoppingCart, BarChart3, Loader2, AlertCircle, Edit2,
  Plus, ChevronDown, Clock, Truck, CheckCircle2, XCircle, Calendar
} from "lucide-react";
import { cn, formatCurrency, formatDate } from "../lib/utils";

const API_URL =
  (import.meta as any)?.env?.VITE_API_URL ||
  "/api";

const statusConfig: Record<string, { label: string; color: string }> = {
  pending:   { label: "Chờ duyệt", color: "bg-amber-100 text-amber-700" },
  shipping:  { label: "Đang giao", color: "bg-blue-100 text-blue-700" },
  completed: { label: "Đã giao",   color: "bg-emerald-100 text-emerald-700" },
  cancelled: { label: "Đã hủy",   color: "bg-red-100 text-red-600" },
};

// ---------- Date preset helpers ----------
function toDateStr(d: Date) {
  return d.toISOString().slice(0, 10);
}
type DatePreset = "today" | "week" | "month" | "last_month" | "last_year" | "custom" | "all";

function getPresetRange(preset: DatePreset): { from: string; to: string } {
  const today = new Date();
  const y = today.getFullYear(), m = today.getMonth(), d = today.getDate();
  if (preset === "today")      return { from: toDateStr(today), to: toDateStr(today) };
  if (preset === "week")  {
    const day = today.getDay() || 7;
    const mon = new Date(today); mon.setDate(d - day + 1);
    const sun = new Date(today); sun.setDate(d - day + 7);
    return { from: toDateStr(mon), to: toDateStr(sun) };
  }
  if (preset === "month")      return { from: toDateStr(new Date(y, m, 1)),     to: toDateStr(new Date(y, m + 1, 0)) };
  if (preset === "last_month") return { from: toDateStr(new Date(y, m - 1, 1)), to: toDateStr(new Date(y, m, 0)) };
  if (preset === "last_year")  return { from: toDateStr(new Date(y - 1, 0, 1)), to: toDateStr(new Date(y - 1, 11, 31)) };
  return { from: "", to: "" };
}

const presetLabels: Record<string, string> = {
  all: "Tất cả", today: "Hôm nay", week: "Tuần này",
  month: "Tháng này", last_month: "Tháng trước", last_year: "Năm trước", custom: "Tuỳ chọn"
};

export function EmployeeDetail() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [overview, setOverview]     = React.useState<any>(null);
  const [orders, setOrders]         = React.useState<any[]>([]);
  const [orderPage, setOrderPage]   = React.useState(1);
  const [orderTotal, setOrderTotal] = React.useState(0);
  const [orderStatus, setOrderStatus] = React.useState("");
  const [loading, setLoading]         = React.useState(true);
  const [ordersLoading, setOrdersLoading] = React.useState(true);
  const [error, setError]             = React.useState<string | null>(null);

  // Date filter
  const [datePreset, setDatePreset] = React.useState<DatePreset>("month");
  const [dateFrom, setDateFrom]     = React.useState(() => toDateStr(new Date(new Date().getFullYear(), new Date().getMonth(), 1)));
  const [dateTo, setDateTo]         = React.useState(() => toDateStr(new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0)));
  const [showDateMenu, setShowDateMenu] = React.useState(false);
  const [customFrom, setCustomFrom] = React.useState("");
  const [customTo, setCustomTo]     = React.useState("");

  const orderLimit = 10;

  const applyPreset = (preset: DatePreset) => {
    setDatePreset(preset);
    setShowDateMenu(false);
    if (preset === "all")    { setDateFrom(""); setDateTo(""); }
    else if (preset !== "custom") {
      const { from, to } = getPresetRange(preset);
      setDateFrom(from); setDateTo(to);
    }
  };

  const applyCustom = () => {
    setDateFrom(customFrom);
    setDateTo(customTo);
    setShowDateMenu(false);
  };

  // Fetch overview (stats + top products) khi date thay đổi
  const fetchOverview = React.useCallback(async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("token");
      const params = new URLSearchParams();
      if (dateFrom) params.set("date_from", dateFrom);
      if (dateTo)   params.set("date_to", dateTo);
      const res = await fetch(`${API_URL}/users/${id}/overview?${params}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Không thể tải dữ liệu");
      }
      const json = await res.json();
      setOverview(json.data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [id, dateFrom, dateTo]);

  // Fetch orders (có filter date + status + page)
  const fetchOrders = React.useCallback(async () => {
    try {
      setOrdersLoading(true);
      const token = localStorage.getItem("token");
      const params = new URLSearchParams({ page: String(orderPage), limit: String(orderLimit) });
      if (orderStatus) params.set("status", orderStatus);
      if (dateFrom)    params.set("date_from", dateFrom);
      if (dateTo)      params.set("date_to", dateTo);
      const res = await fetch(`${API_URL}/users/${id}/orders?${params}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error("Không thể tải đơn hàng");
      const json = await res.json();
      setOrders(json.data);
      setOrderTotal(json.total);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setOrdersLoading(false);
    }
  }, [id, orderPage, orderStatus, dateFrom, dateTo]);

  React.useEffect(() => { fetchOverview(); }, [fetchOverview]);
  React.useEffect(() => { fetchOrders(); },  [fetchOrders]);

  if (loading && !overview) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (error && !overview) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 mx-auto text-red-400 mb-4" />
          <p className="text-red-500 font-medium">{error}</p>
          <button onClick={() => navigate(-1)} className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-xl text-sm">Quay lại</button>
        </div>
      </div>
    );
  }

  const { user, groups, commission, topProducts, orderStats } = overview;
  const totalOrderPages = Math.ceil(orderTotal / orderLimit);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate(-1)} className="p-2 hover:bg-slate-100 rounded-xl text-slate-500 transition-all">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Tổng quan nhân viên</h1>
            <p className="text-slate-500 text-sm mt-0.5">{user.full_name} • {user.position || user.role}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link to={`/employees/${id}/collaborators`} className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-xl text-sm font-medium hover:bg-emerald-700 transition-all">
            <Plus className="w-4 h-4" /> Quản lý CTV
          </Link>
          <Link to={`/employees/edit/${id}`} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 transition-all">
            <Edit2 className="w-4 h-4" /> Chỉnh sửa
          </Link>
        </div>
      </div>

      {/* Date filter */}
      <div className="bg-white border border-slate-200 rounded-2xl px-4 py-3 flex flex-wrap items-center gap-3">
        <Calendar className="w-4 h-4 text-slate-400 flex-shrink-0" />
        <span className="text-sm font-medium text-slate-500">Kỳ thống kê:</span>

        {/* Preset buttons */}
        <div className="flex flex-wrap gap-1.5">
          {(["all","today","week","month","last_month","last_year"] as DatePreset[]).map(p => (
            <button key={p} onClick={() => applyPreset(p)}
              className={cn("px-3 py-1 rounded-lg text-xs font-semibold transition-all",
                datePreset === p ? "bg-blue-600 text-white shadow-sm" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              )}>
              {presetLabels[p]}
            </button>
          ))}

          {/* Custom */}
          <div className="relative">
            <button onClick={() => setShowDateMenu(!showDateMenu)}
              className={cn("flex items-center gap-1 px-3 py-1 rounded-lg text-xs font-semibold transition-all",
                datePreset === "custom" ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              )}>
              Tuỳ chọn <ChevronDown className="w-3 h-3" />
            </button>
            {showDateMenu && (
              <div className="absolute top-full left-0 mt-1 w-64 bg-white border border-slate-200 rounded-xl shadow-xl z-50 p-3 space-y-2">
                <div className="space-y-1">
                  <label className="text-xs text-slate-500 font-medium">Từ ngày</label>
                  <input type="date" value={customFrom} onChange={e => setCustomFrom(e.target.value)}
                    className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-sm outline-none focus:border-blue-400" />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-slate-500 font-medium">Đến ngày</label>
                  <input type="date" value={customTo} onChange={e => setCustomTo(e.target.value)}
                    className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-sm outline-none focus:border-blue-400" />
                </div>
                <button onClick={applyCustom}
                  className="w-full py-1.5 bg-blue-600 text-white rounded-lg text-xs font-semibold hover:bg-blue-700">
                  Áp dụng
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Hiển thị range đang áp dụng */}
        {(dateFrom || dateTo) && (
          <span className="text-xs text-slate-400 ml-auto">
            {dateFrom || '...'} → {dateTo || '...'}
          </span>
        )}
        {loading && <Loader2 className="w-4 h-4 animate-spin text-blue-500 ml-auto" />}
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600 mb-3">
            <DollarSign className="w-4 h-4" />
          </div>
          <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Tổng hoa hồng</p>
          <p className="text-xl font-bold text-slate-900 mt-1">{formatCurrency(commission?.total_commission || 0)}</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <div className="w-9 h-9 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600 mb-3">
            <DollarSign className="w-4 h-4" />
          </div>
          <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">HH bán hàng</p>
          <p className="text-xl font-bold text-indigo-700 mt-1">{formatCurrency(commission?.direct_commission || 0)}</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <div className="w-9 h-9 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600 mb-3">
            <Users className="w-4 h-4" />
          </div>
          <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">HH từ CTV</p>
          <p className="text-xl font-bold text-emerald-700 mt-1">{formatCurrency(commission?.override_commission || 0)}</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <div className="w-9 h-9 rounded-xl bg-amber-50 flex items-center justify-center text-amber-600 mb-3">
            <ShoppingCart className="w-4 h-4" />
          </div>
          <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Số đơn hàng</p>
          <p className="text-xl font-bold text-slate-900 mt-1">{commission?.total_orders || 0}</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <div className="w-9 h-9 rounded-xl bg-purple-50 flex items-center justify-center text-purple-600 mb-3">
            <TrendingUp className="w-4 h-4" />
          </div>
          <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Doanh thu</p>
          <p className="text-xl font-bold text-slate-900 mt-1">{formatCurrency(commission?.total_revenue || 0)}</p>
        </div>
      </div>

      {/* Info + Groups + Order stats */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Thông tin nhân viên */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100">
            <h2 className="text-sm font-bold text-slate-700 flex items-center gap-2">
              <Users className="w-4 h-4 text-blue-500" /> Thông tin nhân viên
            </h2>
          </div>
          <div className="p-5">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-14 h-14 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold text-lg flex-shrink-0">
                {user.full_name?.split(' ').map((n: string) => n[0]).join('').slice(0,2).toUpperCase()}
              </div>
              <div>
                <p className="font-bold text-slate-900">{user.full_name}</p>
                <p className="text-xs font-mono text-slate-700">{user.username}</p>
                <p className="text-xs text-slate-500">{user.email}</p>
                <span className={cn("inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider mt-1",
                  user.is_active ? "bg-emerald-50 text-emerald-600" : "bg-slate-100 text-slate-500"
                )}>
                  {user.is_active ? "Đang làm việc" : "Đã nghỉ"}
                </span>
              </div>
            </div>
            <div className="space-y-2.5 text-sm">
              {[
                ["SĐT", user.phone || '-'],
                ["Phòng ban", user.department || '-'],
                ["Chức vụ", user.position || '-'],
                ["Ngày gia nhập", user.join_date ? formatDate(user.join_date) : '-'],
                ["Lương cơ bản", formatCurrency(user.salary || 0)],
                ["Tỷ lệ hoa hồng", `${user.commission_rate}%`],
              ].map(([label, value]) => (
                <div key={label} className="flex justify-between">
                  <span className="text-slate-400">{label}</span>
                  <span className="font-medium text-slate-800">{value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Nhóm */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100">
            <h2 className="text-sm font-bold text-slate-700 flex items-center gap-2">
              <Users className="w-4 h-4 text-blue-500" /> Nhóm nhân viên
            </h2>
          </div>
          <div className="p-5">
            {groups.length === 0 ? (
              <p className="text-sm text-slate-400 text-center py-6">Chưa thuộc nhóm nào</p>
            ) : (
              <div className="space-y-2">
                {groups.map((g: any) => (
                  <div key={g.id} className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl">
                    <div className="w-7 h-7 rounded-lg bg-blue-100 flex items-center justify-center text-blue-600 flex-shrink-0">
                      <Users className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-900">{g.name}</p>
                      {g.description && <p className="text-xs text-slate-400">{g.description}</p>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Thống kê đơn hàng */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100">
            <h2 className="text-sm font-bold text-slate-700 flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-blue-500" /> Thống kê đơn hàng
            </h2>
          </div>
          <div className="p-5 space-y-2">
            {Object.keys(statusConfig).map(st => {
              const count = orderStats?.[st] || 0;
              const cfg = statusConfig[st];
              return (
                <div key={st} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl">
                  <span className={cn("inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold", cfg.color)}>
                    {cfg.label}
                  </span>
                  <span className="text-base font-bold text-slate-900">{count}</span>
                </div>
              );
            })}
            {Object.keys(orderStats || {}).length === 0 && (
              <p className="text-sm text-slate-400 text-center py-4">Chưa có đơn hàng trong kỳ này</p>
            )}
          </div>
        </div>
      </div>

      {/* Top sản phẩm */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100">
          <h2 className="text-sm font-bold text-slate-700 flex items-center gap-2">
            <Package className="w-4 h-4 text-blue-500" /> Top 10 sản phẩm bán chạy trong kỳ
          </h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100">
                <th className="px-5 py-3 text-xs font-semibold text-slate-500 w-10">#</th>
                <th className="px-5 py-3 text-xs font-semibold text-slate-500">Sản phẩm</th>
                <th className="px-5 py-3 text-xs font-semibold text-slate-500 text-right w-24">SL bán</th>
                <th className="px-5 py-3 text-xs font-semibold text-slate-500 text-right w-32">Doanh thu</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {topProducts.length === 0 ? (
                <tr><td colSpan={4} className="px-5 py-10 text-center text-slate-400">Chưa có dữ liệu trong kỳ này</td></tr>
              ) : topProducts.map((p: any, i: number) => (
                <tr key={p.id} className="hover:bg-slate-50/60">
                  <td className="px-5 py-3">
                    <span className={cn("inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold",
                      i === 0 ? "bg-amber-100 text-amber-700" : i === 1 ? "bg-slate-200 text-slate-600" : i === 2 ? "bg-orange-100 text-orange-700" : "bg-slate-50 text-slate-400"
                    )}>{i + 1}</span>
                  </td>
                  <td className="px-5 py-3">
                    <p className="font-semibold text-slate-800">{p.name}</p>
                    <p className="text-xs text-slate-400 font-mono">{p.sku || ''}</p>
                  </td>
                  <td className="px-5 py-3 text-right font-bold text-slate-900">{p.total_qty} {p.unit || ''}</td>
                  <td className="px-5 py-3 text-right font-semibold text-emerald-600">{formatCurrency(p.total_revenue)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Danh sách đơn hàng */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <h2 className="text-sm font-bold text-slate-700 flex items-center gap-2">
            <ShoppingCart className="w-4 h-4 text-blue-500" /> Đơn hàng trong kỳ
          </h2>
          <select
            value={orderStatus}
            onChange={(e) => { setOrderStatus(e.target.value); setOrderPage(1); }}
            className="px-3 py-2 bg-slate-50 border border-slate-200 text-slate-600 rounded-xl text-sm outline-none focus:border-blue-300 cursor-pointer"
          >
            <option value="">Tất cả trạng thái</option>
            <option value="pending">Chờ duyệt</option>
            <option value="shipping">Đang giao</option>
            <option value="completed">Đã giao</option>
            <option value="cancelled">Đã hủy</option>
          </select>
        </div>

        {ordersLoading ? (
          <div className="flex items-center justify-center py-10">
            <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100">
                    <th className="px-5 py-3 text-xs font-semibold text-slate-500">Mã đơn</th>
                    <th className="px-5 py-3 text-xs font-semibold text-slate-500">Khách hàng</th>
                    <th className="px-5 py-3 text-xs font-semibold text-slate-500">Ngày tạo</th>
                    <th className="px-5 py-3 text-xs font-semibold text-slate-500 text-right">Tổng tiền</th>
                    <th className="px-5 py-3 text-xs font-semibold text-slate-500 text-right">Hoa hồng</th>
                    <th className="px-5 py-3 text-xs font-semibold text-slate-500 text-center">Trạng thái</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {orders.length === 0 ? (
                    <tr><td colSpan={6} className="px-5 py-10 text-center text-slate-400">Không có đơn hàng nào trong kỳ này</td></tr>
                  ) : orders.map((order: any) => {
                    const cfg = statusConfig[order.status] || { label: order.status, color: "bg-slate-100 text-slate-600" };
                    return (
                      <tr key={order.id} className="hover:bg-slate-50/60 cursor-pointer transition-colors"
                        onClick={() => navigate(`/orders/edit/${order.id}`)}>
                        <td className="px-5 py-3 font-bold text-blue-600 font-mono">{order.code}</td>
                        <td className="px-5 py-3">
                          <p className="font-medium text-slate-900">{order.customer_name || '-'}</p>
                          <p className="text-xs text-slate-400">{order.customer_phone || ''}</p>
                        </td>
                        <td className="px-5 py-3 text-slate-500">{formatDate(order.created_at)}</td>
                        <td className="px-5 py-3 text-right font-bold text-slate-900">{formatCurrency(order.total_amount)}</td>
                        <td className="px-5 py-3 text-right font-semibold text-emerald-600">{formatCurrency(order.commission_amount)}</td>
                        <td className="px-5 py-3 text-center">
                          <span className={cn("inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold", cfg.color)}>
                            {cfg.label}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {totalOrderPages > 1 && (
              <div className="px-5 py-3 bg-slate-50/50 border-t border-slate-100 flex items-center justify-between">
                <p className="text-xs text-slate-400">
                  {((orderPage - 1) * orderLimit) + 1}–{Math.min(orderPage * orderLimit, orderTotal)} / {orderTotal} đơn
                </p>
                <div className="flex items-center gap-1">
                  <button onClick={() => setOrderPage(p => Math.max(1, p - 1))} disabled={orderPage === 1}
                    className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:bg-slate-200 disabled:opacity-30 transition-all">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                  </button>
                  {Array.from({ length: Math.min(5, totalOrderPages) }, (_, i) => (
                    <button key={i} onClick={() => setOrderPage(i + 1)}
                      className={cn("w-7 h-7 rounded-lg text-xs font-bold transition-all",
                        orderPage === i + 1 ? "bg-blue-600 text-white" : "hover:bg-slate-200 text-slate-600"
                      )}>{i + 1}</button>
                  ))}
                  <button onClick={() => setOrderPage(p => Math.min(totalOrderPages, p + 1))} disabled={orderPage >= totalOrderPages}
                    className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:bg-slate-200 disabled:opacity-30 transition-all">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
