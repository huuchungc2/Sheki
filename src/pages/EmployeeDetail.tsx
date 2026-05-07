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
  pending:   { label: "Chờ duyệt", color: "bg-muted text-foreground border border-border" },
  shipping:  { label: "Đang giao", color: "bg-muted text-foreground border border-border" },
  completed: { label: "Đã giao",   color: "bg-accent text-accent-foreground border border-border" },
  cancelled: { label: "Đã hủy",   color: "bg-destructive/10 text-destructive border border-destructive/30" },
};

// ---------- Date preset helpers ----------
function toDateStr(d: Date) {
  // Format theo local time để không bị lệch ngày do UTC (VN UTC+7)
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
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
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error && !overview) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 mx-auto text-destructive/80 mb-4" />
          <p className="text-destructive font-semibold">{error}</p>
          <button onClick={() => navigate(-1)} className="mt-4 h-10 px-4 bg-primary text-primary-foreground rounded-md text-sm font-semibold hover:opacity-95 transition-opacity">Quay lại</button>
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
          <button onClick={() => navigate(-1)} className="p-2 hover:bg-accent rounded-lg text-muted-foreground transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">Tổng quan nhân viên</h1>
            <p className="text-muted-foreground text-sm mt-0.5">{user.full_name} • {user.position || user.role}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link to={`/employees/${id}/collaborators`} className="flex items-center gap-2 h-10 px-4 bg-background border border-border text-foreground rounded-md text-sm font-semibold hover:bg-accent transition-colors">
            <Plus className="w-4 h-4" /> Quản lý CTV
          </Link>
          <Link to={`/employees/edit/${id}`} className="flex items-center gap-2 h-10 px-4 bg-primary text-primary-foreground rounded-md text-sm font-semibold hover:opacity-95 transition-opacity">
            <Edit2 className="w-4 h-4" /> Chỉnh sửa
          </Link>
        </div>
      </div>

      {/* Date filter */}
      <div className="bg-card border border-border rounded-xl px-4 py-3 flex flex-wrap items-center gap-3">
        <Calendar className="w-4 h-4 text-muted-foreground flex-shrink-0" />
        <span className="text-sm font-semibold text-muted-foreground">Kỳ thống kê:</span>

        {/* Preset buttons */}
        <div className="flex flex-wrap gap-1.5">
          {(["all","today","week","month","last_month","last_year"] as DatePreset[]).map(p => (
            <button key={p} onClick={() => applyPreset(p)}
              className={cn("px-3 py-1 rounded-md text-xs font-semibold transition-colors border",
                datePreset === p ? "bg-primary text-primary-foreground border-primary" : "bg-background text-foreground border-border hover:bg-accent"
              )}>
              {presetLabels[p]}
            </button>
          ))}

          {/* Custom */}
          <div className="relative">
            <button onClick={() => setShowDateMenu(!showDateMenu)}
              className={cn("flex items-center gap-1 px-3 py-1 rounded-md text-xs font-semibold transition-colors border",
                datePreset === "custom" ? "bg-primary text-primary-foreground border-primary" : "bg-background text-foreground border-border hover:bg-accent"
              )}>
              Tuỳ chọn <ChevronDown className="w-3 h-3" />
            </button>
            {showDateMenu && (
              <div className="absolute top-full left-0 mt-1 w-64 bg-popover text-popover-foreground border border-border rounded-xl shadow-xl z-50 p-3 space-y-2">
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground font-semibold">Từ ngày</label>
                  <input type="date" value={customFrom} onChange={e => setCustomFrom(e.target.value)}
                    className="w-full h-9 px-3 border border-input bg-background rounded-md text-sm font-medium outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background" />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground font-semibold">Đến ngày</label>
                  <input type="date" value={customTo} onChange={e => setCustomTo(e.target.value)}
                    className="w-full h-9 px-3 border border-input bg-background rounded-md text-sm font-medium outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background" />
                </div>
                <button onClick={applyCustom}
                  className="w-full h-9 bg-primary text-primary-foreground rounded-md text-xs font-semibold hover:opacity-95 transition-opacity">
                  Áp dụng
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Hiển thị range đang áp dụng */}
        {(dateFrom || dateTo) && (
          <span className="text-xs text-muted-foreground ml-auto">
            {dateFrom || '...'} → {dateTo || '...'}
          </span>
        )}
        {loading && <Loader2 className="w-4 h-4 animate-spin text-primary ml-auto" />}
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="bg-card p-5 rounded-xl border border-border shadow-sm">
          <div className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center text-primary mb-3">
            <DollarSign className="w-4 h-4" />
          </div>
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Tổng hoa hồng</p>
          <p className="text-xl font-semibold text-foreground mt-1">{formatCurrency(commission?.total_commission || 0)}</p>
        </div>

        <div className="bg-card p-5 rounded-xl border border-border shadow-sm">
          <div className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center text-primary mb-3">
            <DollarSign className="w-4 h-4" />
          </div>
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">HH bán hàng</p>
          <p className="text-xl font-semibold text-foreground mt-1">{formatCurrency(commission?.direct_commission || 0)}</p>
        </div>

        <div className="bg-card p-5 rounded-xl border border-border shadow-sm">
          <div className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center text-primary mb-3">
            <Users className="w-4 h-4" />
          </div>
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">HH từ CTV</p>
          <p className="text-xl font-semibold text-foreground mt-1">{formatCurrency(commission?.override_commission || 0)}</p>
        </div>

        <div className="bg-card p-5 rounded-xl border border-border shadow-sm">
          <div className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center text-primary mb-3">
            <ShoppingCart className="w-4 h-4" />
          </div>
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Số đơn hàng</p>
          <p className="text-xl font-semibold text-foreground mt-1">{commission?.total_orders || 0}</p>
        </div>

        <div className="bg-card p-5 rounded-xl border border-border shadow-sm">
          <div className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center text-primary mb-3">
            <TrendingUp className="w-4 h-4" />
          </div>
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Doanh thu</p>
          <p className="text-xl font-semibold text-foreground mt-1">{formatCurrency(commission?.total_revenue || 0)}</p>
        </div>
      </div>

      {/* Info + Groups + Order stats */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Thông tin nhân viên */}
        <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-border">
            <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <Users className="w-4 h-4 text-primary" /> Thông tin nhân viên
            </h2>
          </div>
          <div className="p-5">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-14 h-14 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-bold text-lg flex-shrink-0">
                {user.full_name?.split(' ').map((n: string) => n[0]).join('').slice(0,2).toUpperCase()}
              </div>
              <div>
                <p className="font-semibold text-foreground">{user.full_name}</p>
                <p className="text-xs font-mono text-muted-foreground">{user.username}</p>
                <p className="text-xs text-muted-foreground">{user.email}</p>
                <span className={cn("inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider mt-1",
                  user.is_active ? "bg-accent text-accent-foreground border border-border" : "bg-muted text-muted-foreground border border-border"
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
                  <span className="text-muted-foreground">{label}</span>
                  <span className="font-medium text-foreground">{value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Nhóm */}
        <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-border">
            <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <Users className="w-4 h-4 text-primary" /> Nhóm nhân viên
            </h2>
          </div>
          <div className="p-5">
            {groups.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">Chưa thuộc nhóm nào</p>
            ) : (
              <div className="space-y-2">
                {groups.map((g: any) => (
                  <div key={g.id} className="flex items-center gap-3 p-3 bg-muted/20 rounded-xl border border-border">
                    <div className="w-7 h-7 rounded-lg bg-muted flex items-center justify-center text-primary flex-shrink-0">
                      <Users className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-foreground">{g.name}</p>
                      {g.description && <p className="text-xs text-muted-foreground">{g.description}</p>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Thống kê đơn hàng */}
        <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-border">
            <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-primary" /> Thống kê đơn hàng
            </h2>
          </div>
          <div className="p-5 space-y-2">
            {Object.keys(statusConfig).map(st => {
              const count = orderStats?.[st] || 0;
              const cfg = statusConfig[st];
              return (
                <div key={st} className="flex items-center justify-between p-3 bg-muted/20 rounded-xl border border-border">
                  <span className={cn("inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border", cfg.color)}>
                    {cfg.label}
                  </span>
                  <span className="text-base font-semibold text-foreground">{count}</span>
                </div>
              );
            })}
            {Object.keys(orderStats || {}).length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">Chưa có đơn hàng trong kỳ này</p>
            )}
          </div>
        </div>
      </div>

      {/* Top sản phẩm */}
      <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-border">
          <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <Package className="w-4 h-4 text-primary" /> Top 10 sản phẩm bán chạy trong kỳ
          </h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="bg-muted/30 border-b border-border">
                <th className="px-5 py-3 text-xs font-semibold text-muted-foreground w-10">#</th>
                <th className="px-5 py-3 text-xs font-semibold text-muted-foreground">Sản phẩm</th>
                <th className="px-5 py-3 text-xs font-semibold text-muted-foreground text-right w-24">SL bán</th>
                <th className="px-5 py-3 text-xs font-semibold text-muted-foreground text-right w-32">Doanh thu</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {topProducts.length === 0 ? (
                <tr><td colSpan={4} className="px-5 py-10 text-center text-muted-foreground">Chưa có dữ liệu trong kỳ này</td></tr>
              ) : topProducts.map((p: any, i: number) => (
                <tr key={p.id} className="hover:bg-muted/20 transition-colors">
                  <td className="px-5 py-3">
                    <span className={cn("inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold border border-border bg-muted text-foreground")}>
                      {i + 1}
                    </span>
                  </td>
                  <td className="px-5 py-3">
                    <p className="font-semibold text-foreground">{p.name}</p>
                    <p className="text-xs text-muted-foreground font-mono">{p.sku || ''}</p>
                  </td>
                  <td className="px-5 py-3 text-right font-semibold text-foreground">{p.total_qty} {p.unit || ''}</td>
                  <td className="px-5 py-3 text-right font-semibold text-foreground">{formatCurrency(p.total_revenue)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Danh sách đơn hàng */}
      <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-border flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <ShoppingCart className="w-4 h-4 text-primary" /> Đơn hàng trong kỳ
          </h2>
          <select
            value={orderStatus}
            onChange={(e) => { setOrderStatus(e.target.value); setOrderPage(1); }}
            className="h-10 px-3 bg-background border border-input text-foreground rounded-md text-sm font-semibold outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background cursor-pointer"
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
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="bg-muted/30 border-b border-border">
                    <th className="px-5 py-3 text-xs font-semibold text-muted-foreground">Mã đơn</th>
                    <th className="px-5 py-3 text-xs font-semibold text-muted-foreground">Khách hàng</th>
                    <th className="px-5 py-3 text-xs font-semibold text-muted-foreground">Ngày tạo</th>
                    <th className="px-5 py-3 text-xs font-semibold text-muted-foreground text-right">Tổng tiền</th>
                    <th className="px-5 py-3 text-xs font-semibold text-muted-foreground text-right">Hoa hồng</th>
                    <th className="px-5 py-3 text-xs font-semibold text-muted-foreground text-center">Trạng thái</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {orders.length === 0 ? (
                    <tr><td colSpan={6} className="px-5 py-10 text-center text-muted-foreground">Không có đơn hàng nào trong kỳ này</td></tr>
                  ) : orders.map((order: any) => {
                    const cfg = statusConfig[order.status] || { label: order.status, color: "bg-muted text-muted-foreground border border-border" };
                    return (
                      <tr key={order.id} className="hover:bg-muted/20 cursor-pointer transition-colors"
                        onClick={() => navigate(`/orders/edit/${order.id}`)}>
                        <td className="px-5 py-3 font-semibold text-primary font-mono">{order.code}</td>
                        <td className="px-5 py-3">
                          <p className="font-medium text-foreground">{order.customer_name || '-'}</p>
                          <p className="text-xs text-muted-foreground">{order.customer_phone || ''}</p>
                        </td>
                        <td className="px-5 py-3 text-muted-foreground">{formatDate(order.created_at)}</td>
                        <td className="px-5 py-3 text-right font-semibold text-foreground">{formatCurrency(order.total_amount)}</td>
                        <td className="px-5 py-3 text-right font-semibold text-foreground">{formatCurrency(order.commission_amount)}</td>
                        <td className="px-5 py-3 text-center">
                          <span className={cn("inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border", cfg.color)}>
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
              <div className="px-5 py-3 bg-muted/20 border-t border-border flex items-center justify-between">
                <p className="text-xs text-muted-foreground">
                  {((orderPage - 1) * orderLimit) + 1}–{Math.min(orderPage * orderLimit, orderTotal)} / {orderTotal} đơn
                </p>
                <div className="flex items-center gap-1">
                  <button onClick={() => setOrderPage(p => Math.max(1, p - 1))} disabled={orderPage === 1}
                    className="w-7 h-7 rounded-md flex items-center justify-center text-muted-foreground hover:bg-accent disabled:opacity-30 transition-colors">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                  </button>
                  {Array.from({ length: Math.min(5, totalOrderPages) }, (_, i) => (
                    <button key={i} onClick={() => setOrderPage(i + 1)}
                      className={cn("w-7 h-7 rounded-md text-xs font-semibold transition-colors border",
                        orderPage === i + 1 ? "bg-primary text-primary-foreground border-primary" : "bg-background text-foreground border-border hover:bg-accent"
                      )}>{i + 1}</button>
                  ))}
                  <button onClick={() => setOrderPage(p => Math.min(totalOrderPages, p + 1))} disabled={orderPage >= totalOrderPages}
                    className="w-7 h-7 rounded-md flex items-center justify-center text-muted-foreground hover:bg-accent disabled:opacity-30 transition-colors">
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
