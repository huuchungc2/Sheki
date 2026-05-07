import * as React from "react";
import { Link } from "react-router-dom";
import {
  DollarSign, Users, Package, ShoppingCart,
  TrendingUp, TrendingDown, Clock, Truck,
  CheckCircle2, XCircle, ChevronRight,
  Loader2, AlertCircle, ArrowUpRight, ArrowDownRight,
  Wallet, CircleDollarSign,
} from "lucide-react";
import {
  BarChart, Bar, Cell, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer
} from "recharts";
import { cn, formatCurrency, isAdminUser } from "../lib/utils";

const API_URL =
  (import.meta as any)?.env?.VITE_API_URL ||
  "/api";

const STATUS_CFG: Record<string, { label: string; color: string; icon: any; bg: string }> = {
  pending:   { label: "Chờ duyệt", color: "text-amber-700 dark:text-amber-300",   icon: Clock,        bg: "bg-amber-50 border border-amber-200 dark:bg-amber-950/30 dark:border-amber-900/50" },
  shipping:  { label: "Đang giao", color: "text-sky-700 dark:text-sky-300",       icon: Truck,        bg: "bg-sky-50 border border-sky-200 dark:bg-sky-950/30 dark:border-sky-900/50" },
  completed: { label: "Đã giao",   color: "text-emerald-700 dark:text-emerald-300", icon: CheckCircle2, bg: "bg-emerald-50 border border-emerald-200 dark:bg-emerald-950/30 dark:border-emerald-900/50" },
  cancelled: { label: "Đã hủy",    color: "text-destructive",                    icon: XCircle,      bg: "bg-destructive/10 border border-destructive/30" },
};

function greet(name: string) {
  const h = new Date().getHours();
  const g = h < 12 ? "Chào buổi sáng" : h < 18 ? "Chào buổi chiều" : "Chào buổi tối";
  return `${g}, ${name}!`;
}

function ChangeBadge({ pct }: { pct: string | null }) {
  if (pct === null) return null;
  const up = parseFloat(pct) >= 0;
  return (
    <span className={cn("inline-flex items-center gap-0.5 text-xs font-bold px-2 py-0.5 rounded-full border",
      up ? "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-300 dark:border-emerald-900/50"
         : "bg-destructive/10 text-destructive border-destructive/30"
    )}>
      {up ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
      {up ? "+" : ""}{pct}%
    </span>
  );
}

export function Dashboard() {
  const [data, setData]       = React.useState<any>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError]     = React.useState<string | null>(null);

  const [currentUser, setCurrentUser] = React.useState<any>(() => {
    const u = localStorage.getItem("user");
    return u ? JSON.parse(u) : null;
  });
  const [token, setToken] = React.useState<string>(() => localStorage.getItem("token") || "");
  const isAdmin = isAdminUser(currentUser);

  React.useEffect(() => {
    const syncAuth = () => {
      try {
        const u = localStorage.getItem("user");
        setCurrentUser(u ? JSON.parse(u) : null);
      } catch {
        setCurrentUser(null);
      }
      setToken(localStorage.getItem("token") || "");
    };
    syncAuth();
    window.addEventListener("auth-change", syncAuth as any);
    window.addEventListener("storage", syncAuth as any);
    return () => {
      window.removeEventListener("auth-change", syncAuth as any);
      window.removeEventListener("storage", syncAuth as any);
    };
  }, []);

  React.useEffect(() => {
    if (!token) {
      setError("Phiên đăng nhập hết hạn. Vui lòng đăng nhập lại.");
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    fetch(`${API_URL}/reports/dashboard`, {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(r => { if (!r.ok) throw new Error("Không thể tải dữ liệu"); return r.json(); })
      .then(j => setData(j.data))
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [token]);

  if (loading) return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <Loader2 className="w-8 h-8 animate-spin text-primary" />
    </div>
  );

  if (error) return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <div className="text-center">
        <AlertCircle className="w-12 h-12 mx-auto text-destructive/70 mb-3" />
        <p className="text-destructive font-semibold">{error}</p>
        <button onClick={() => window.location.reload()} className="mt-4 h-10 px-4 bg-primary text-primary-foreground rounded-md text-sm font-semibold hover:opacity-95 transition-opacity">Thử lại</button>
      </div>
    </div>
  );

  const d = data;
  const recentOrders = d?.recentOrders || [];
  const topProducts  = d?.topProducts  || [];
  const topCustomers = d?.topCustomers || [];
  const topSales     = d?.topSales     || [];
  const byStatus     = d?.byStatus     || {};
  const commission   = d?.commission   || { direct: 0, override: 0, total: 0 };
  const luongMonth   = d?.luongMonth   || { total_khach_ship: 0, total_nv_chiu: 0, total_luong: 0 };
  const thisMonth    = d?.thisMonth    || {};
  const today        = d?.today        || {};
  const customers    = d?.customers    || {};

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">{greet(currentUser?.full_name || "bạn")}</h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            {new Date().toLocaleDateString("vi-VN", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
          </p>
        </div>
        <div className="flex gap-2">
          <Link to="/orders/new" className="h-10 inline-flex items-center px-4 bg-primary text-primary-foreground rounded-md text-sm font-semibold hover:opacity-95 transition-opacity">
            + Tạo đơn mới
          </Link>
        </div>
      </div>

      {/* ───── ADMIN VIEW ───── */}
      {isAdmin && (
        <>
          {/* Stat cards hàng 1 */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Doanh thu tháng */}
            <div className="bg-card p-5 rounded-xl border border-border shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <div className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center text-primary">
                  <DollarSign className="w-4 h-4" />
                </div>
                <ChangeBadge pct={thisMonth.revenue_change} />
              </div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Doanh thu tháng này</p>
              <p className="text-xl font-semibold text-foreground mt-1 tabular-nums">{formatCurrency(thisMonth.revenue || 0)}</p>
              <p className="text-xs text-muted-foreground mt-1">Hôm nay: {formatCurrency(today.revenue || 0)}</p>
              <p className="text-[11px] text-muted-foreground mt-1 leading-snug">Tổng tạm tính (sau CK dòng), không gồm đơn hủy</p>
            </div>

            {/* Tổng đơn tháng */}
            <div className="bg-card p-5 rounded-xl border border-border shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <div className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center text-primary">
                  <ShoppingCart className="w-4 h-4" />
                </div>
              </div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Đơn hàng tháng này</p>
              <p className="text-xl font-semibold text-foreground mt-1 tabular-nums">{thisMonth.total_orders || 0}</p>
              <p className="text-xs text-muted-foreground mt-1">Hôm nay: {today.total_orders || 0} đơn</p>
            </div>

            {/* Hoa hồng tháng */}
            <div className="bg-card p-5 rounded-xl border border-border shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <div className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center text-primary">
                  <TrendingUp className="w-4 h-4" />
                </div>
              </div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Tổng hoa hồng tháng</p>
              <p className="text-xl font-semibold text-foreground mt-1 tabular-nums">{formatCurrency(commission.total || 0)}</p>
              <p className="text-xs text-muted-foreground mt-1">CTV: {formatCurrency(commission.override || 0)}</p>
            </div>

            {/* Khách hàng */}
            <div className="bg-card p-5 rounded-xl border border-border shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <div className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center text-primary">
                  <Users className="w-4 h-4" />
                </div>
              </div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Khách hàng</p>
              <p className="text-xl font-semibold text-foreground mt-1 tabular-nums">{(customers.total || 0).toLocaleString()}</p>
              <p className="text-xs text-muted-foreground mt-1">Mới tháng này: +{customers.new || 0}</p>
            </div>
          </div>

          {/* Return KPIs */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-card p-5 rounded-xl border border-border shadow-sm">
              <div className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center text-destructive mb-3">
                <TrendingDown className="w-4 h-4" />
              </div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Tổng doanh số hoàn</p>
              <p className="text-xl font-semibold text-destructive mt-1 tabular-nums">{formatCurrency(-(thisMonth.return_revenue || 0))}</p>
              <p className="text-xs text-muted-foreground mt-1">Hôm nay: {formatCurrency(-(today.return_revenue || 0))}</p>
            </div>
            <div className="bg-card p-5 rounded-xl border border-border shadow-sm">
              <div className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center text-destructive mb-3">
                <TrendingDown className="w-4 h-4" />
              </div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">HH hoàn (Sale)</p>
              <p className="text-xl font-semibold text-destructive mt-1 tabular-nums">{formatCurrency(-Math.abs(thisMonth.return_commission_direct || 0))}</p>
              <p className="text-xs text-muted-foreground mt-1">Hôm nay: {formatCurrency(-Math.abs(today.return_commission_direct || 0))}</p>
            </div>
            <div className="bg-card p-5 rounded-xl border border-border shadow-sm">
              <div className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center text-destructive mb-3">
                <TrendingDown className="w-4 h-4" />
              </div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">HH hoàn (Quản lý)</p>
              <p className="text-xl font-semibold text-destructive mt-1 tabular-nums">{formatCurrency(-Math.abs(thisMonth.return_commission_override || 0))}</p>
              <p className="text-xs text-muted-foreground mt-1">Hôm nay: {formatCurrency(-Math.abs(today.return_commission_override || 0))}</p>
            </div>
            <div className="bg-card p-5 rounded-xl border border-border shadow-sm">
              <div className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center text-destructive mb-3">
                <ShoppingCart className="w-4 h-4" />
              </div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Tổng đơn hoàn</p>
              <p className="text-xl font-semibold text-destructive mt-1 tabular-nums">{thisMonth.return_orders || 0}</p>
              <p className="text-xs text-muted-foreground mt-1">Hôm nay: {today.return_orders || 0} đơn</p>
            </div>
          </div>

          {/* Lương / ship / NV chịu — cùng lưới 2 cột mobile như hàng KPI */}
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="bg-card p-5 rounded-xl border border-border shadow-sm">
              <div className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center text-primary mb-3">
                <Truck className="w-4 h-4" />
              </div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Ship KH Trả</p>
              <p className="text-xl font-semibold text-foreground mt-1 tabular-nums">{formatCurrency(luongMonth.total_khach_ship || 0)}</p>
              <p className="text-xs text-muted-foreground mt-0.5">Tháng này (theo đơn)</p>
            </div>
            <div className="bg-card p-5 rounded-xl border border-border shadow-sm">
              <div className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center text-primary mb-3">
                <CircleDollarSign className="w-4 h-4" />
              </div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Tiền NV chịu</p>
              <p className="text-xl font-semibold text-foreground mt-1 tabular-nums">{formatCurrency(luongMonth.total_nv_chiu || 0)}</p>
              <p className="text-xs text-muted-foreground mt-0.5">Tháng này (theo đơn)</p>
            </div>
            <div className="col-span-2 lg:col-span-1 bg-card p-5 rounded-xl border border-border shadow-sm">
              <div className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center text-primary mb-3">
                <Wallet className="w-4 h-4" />
              </div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Tổng lương</p>
              <p className="text-xl font-semibold text-foreground mt-1 tabular-nums">{formatCurrency(luongMonth.total_luong || 0)}</p>
              <p className="text-xs text-muted-foreground mt-0.5">Tổng HH + Ship KH Trả − tiền NV chịu</p>
            </div>
          </div>

          {/* Trạng thái đơn tháng này */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {Object.entries(STATUS_CFG).map(([key, cfg]) => (
              <div key={key} className={cn("p-4 rounded-xl flex items-center gap-3", cfg.bg)}>
                <cfg.icon className={cn("w-5 h-5 flex-shrink-0", cfg.color)} />
                <div>
                  <p className={cn("text-xs font-semibold", cfg.color)}>{cfg.label}</p>
                  <p className="text-xl font-semibold text-foreground tabular-nums">{byStatus[key] || 0}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Top nhân viên + Đơn gần đây */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Top nhân viên */}
            <div className="lg:col-span-2 bg-card rounded-xl border border-border shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-border flex items-center justify-between">
                <h2 className="text-sm font-semibold text-foreground">Top nhân viên tháng này</h2>
                <Link to="/employees" className="text-xs text-primary hover:underline flex items-center gap-0.5">
                  Xem tất cả <ChevronRight className="w-3 h-3" />
                </Link>
              </div>
              {topSales.length === 0 ? (
                <div className="py-10 text-center text-muted-foreground text-sm">Chưa có dữ liệu</div>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-muted/30 border-b border-border">
                      <th className="px-5 py-3 text-xs font-semibold text-muted-foreground text-left">#</th>
                      <th className="px-5 py-3 text-xs font-semibold text-muted-foreground text-left">Nhân viên</th>
                      <th className="px-5 py-3 text-xs font-semibold text-muted-foreground text-center">Đơn</th>
                      <th className="px-5 py-3 text-xs font-semibold text-muted-foreground text-right">Doanh số</th>
                      <th className="px-5 py-3 text-xs font-semibold text-muted-foreground text-right">Hoa hồng</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {topSales.map((s: any, i: number) => (
                      <tr key={s.id} className="hover:bg-muted/30 transition-colors">
                        <td className="px-5 py-3">
                          <span className={cn("w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold",
                            i === 0 ? "bg-amber-100 text-amber-700" :
                            i === 1 ? "bg-muted text-muted-foreground" :
                            i === 2 ? "bg-orange-100 text-orange-700" : "bg-muted/30 text-muted-foreground"
                          )}>{i + 1}</span>
                        </td>
                        <td className="px-5 py-3">
                          <Link to={`/employees/${s.id}`} className="font-semibold text-foreground hover:text-primary">{s.full_name}</Link>
                        </td>
                        <td className="px-5 py-3 text-center text-muted-foreground tabular-nums">{s.total_orders}</td>
                        <td className="px-5 py-3 text-right font-semibold text-foreground tabular-nums">{formatCurrency(s.revenue)}</td>
                        <td className="px-5 py-3 text-right font-semibold text-emerald-700 dark:text-emerald-300 tabular-nums">
                          {formatCurrency(s.direct_comm + s.override_comm)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            {/* Đơn gần đây */}
            <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-border flex items-center justify-between">
                <h2 className="text-sm font-semibold text-foreground">Đơn hàng gần đây</h2>
                <Link to="/orders" className="text-xs text-primary hover:underline flex items-center gap-0.5">
                  Xem tất cả <ChevronRight className="w-3 h-3" />
                </Link>
              </div>
              <div className="divide-y divide-border">
                {recentOrders.length === 0 ? (
                  <div className="py-10 text-center text-muted-foreground text-sm">Chưa có đơn hàng</div>
                ) : recentOrders.slice(0, 6).map((o: any) => {
                  const st = STATUS_CFG[o.status] || { label: o.status, color: "text-muted-foreground", bg: "bg-muted/30 border border-border", icon: Clock };
                  return (
                    <Link key={o.id} to={`/orders/edit/${o.id}`}
                      className="flex items-center justify-between px-5 py-3 hover:bg-muted/30 transition-colors">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-7 h-7 rounded-full bg-muted flex items-center justify-center text-xs font-bold text-muted-foreground flex-shrink-0">
                          {(o.customer_name || "?").split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-semibold text-foreground truncate">{o.customer_name || "—"}</p>
                          <p className="text-xs text-muted-foreground font-mono">{o.code}</p>
                        </div>
                      </div>
                      <div className="text-right flex-shrink-0 ml-2">
                        <p className="text-xs font-semibold text-foreground tabular-nums">{formatCurrency(o.subtotal ?? o.total_amount)}</p>
                        <span className={cn("text-[10px] font-semibold", st.color)}>{st.label}</span>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Top khách hàng */}
          <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-border flex items-center justify-between">
              <h2 className="text-sm font-semibold text-foreground">Top khách hàng theo doanh số (tháng này)</h2>
              <Link to="/customers" className="text-xs text-primary hover:underline flex items-center gap-0.5">
                Xem tất cả <ChevronRight className="w-3 h-3" />
              </Link>
            </div>
            {topCustomers.length === 0 ? (
              <div className="py-10 text-center text-muted-foreground text-sm">Chưa có dữ liệu</div>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-muted/30 border-b border-border">
                    <th className="px-5 py-3 text-xs font-semibold text-muted-foreground text-left">#</th>
                    <th className="px-5 py-3 text-xs font-semibold text-muted-foreground text-left">Khách hàng</th>
                    <th className="px-5 py-3 text-xs font-semibold text-muted-foreground text-center">Đơn</th>
                    <th className="px-5 py-3 text-xs font-semibold text-muted-foreground text-right">Doanh số</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {topCustomers.map((c: any, i: number) => (
                    <tr key={c.id} className="hover:bg-muted/30 transition-colors">
                      <td className="px-5 py-3">
                        <span
                          className={cn(
                            "w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold",
                            i === 0
                              ? "bg-amber-100 text-amber-700"
                              : i === 1
                                ? "bg-muted text-muted-foreground"
                                : i === 2
                                  ? "bg-orange-100 text-orange-600"
                                  : "bg-muted/30 text-muted-foreground"
                          )}
                        >
                          {i + 1}
                        </span>
                      </td>
                      <td className="px-5 py-3">
                        <div className="min-w-0">
                          <p className="font-semibold text-foreground truncate">{c.name || "—"}</p>
                          <p className="text-xs text-muted-foreground">{c.phone || ""}</p>
                        </div>
                      </td>
                      <td className="px-5 py-3 text-center text-muted-foreground tabular-nums">{c.total_orders || 0}</td>
                      <td className="px-5 py-3 text-right font-semibold text-foreground tabular-nums">
                        {formatCurrency(c.revenue || 0)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* Top sản phẩm */}
          <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-border flex items-center justify-between">
              <h2 className="text-sm font-semibold text-foreground">Top sản phẩm bán chạy tháng này</h2>
              <Link to="/products" className="text-xs text-primary hover:underline flex items-center gap-0.5">
                Xem tất cả <ChevronRight className="w-3 h-3" />
              </Link>
            </div>
            {topProducts.length === 0 ? (
              <div className="py-10 text-center text-muted-foreground text-sm">Chưa có dữ liệu</div>
            ) : (
              <div className="p-5">
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={topProducts} barSize={36}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} dy={6} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
                      tickFormatter={(v) => v >= 1e6 ? `${(v/1e6).toFixed(1)}M` : v >= 1e3 ? `${(v/1e3).toFixed(0)}K` : v} />
                    <Tooltip formatter={(v: number) => [formatCurrency(v), "Doanh thu"]}
                      contentStyle={{ borderRadius: 12, border: "none", boxShadow: "0 4px 20px rgba(0,0,0,0.1)" }} />
                    <Bar dataKey="revenue" radius={[6, 6, 0, 0]}>
                      {topProducts.map((_: any, i: number) => (
                        <Cell
                          key={i}
                          fill={
                            i === 0
                              ? "hsl(var(--primary))"
                              : i === 1
                                ? "hsl(var(--primary) / 0.9)"
                                : i === 2
                                  ? "hsl(var(--primary) / 0.8)"
                                  : "hsl(var(--primary) / 0.65)"
                          }
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        </>
      )}

      {/* ───── SALES VIEW ───── */}
      {!isAdmin && (
        <>
          {/* Stat cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-card p-5 rounded-xl border border-border shadow-sm">
              <div className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center text-primary mb-3">
                <DollarSign className="w-4 h-4" />
              </div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Doanh thu tháng</p>
              <p className="text-xl font-semibold text-foreground mt-1 tabular-nums">{formatCurrency(thisMonth.revenue || 0)}</p>
              <p className="text-xs text-muted-foreground mt-1">Hôm nay: {formatCurrency(today.revenue || 0)}</p>
              <p className="text-[11px] text-muted-foreground mt-1 leading-snug">Tổng tạm tính (sau CK dòng), không gồm đơn hủy</p>
            </div>

            <div className="bg-card p-5 rounded-xl border border-border shadow-sm">
              <div className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center text-primary mb-3">
                <TrendingUp className="w-4 h-4" />
              </div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">HH bán hàng</p>
              <p className="text-xl font-semibold text-emerald-700 dark:text-emerald-300 mt-1 tabular-nums">{formatCurrency(commission.direct || 0)}</p>
              <p className="text-xs text-muted-foreground mt-1">Từ đơn tự bán</p>
            </div>

            <div className="bg-card p-5 rounded-xl border border-border shadow-sm">
              <div className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center text-primary mb-3">
                <Users className="w-4 h-4" />
              </div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">HH từ CTV</p>
              <p className="text-xl font-semibold text-foreground mt-1 tabular-nums">{formatCurrency(commission.override || 0)}</p>
              <p className="text-xs text-muted-foreground mt-1 leading-snug" title="Override cho quản lý khi CTV lên đơn ghi nhận quản lý. Nếu bạn chỉ là CTV, thường = 0; HH của bạn nằm ở «HH bán hàng».">
                Tổng HH: {formatCurrency(commission.total || 0)}
              </p>
            </div>

            <div className="bg-card p-5 rounded-xl border border-border shadow-sm">
              <div className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center text-primary mb-3">
                <ShoppingCart className="w-4 h-4" />
              </div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Đơn hàng tháng</p>
              <p className="text-xl font-semibold text-foreground mt-1 tabular-nums">{thisMonth.total_orders || 0}</p>
              <p className="text-xs text-muted-foreground mt-1">Hôm nay: {today.total_orders || 0} đơn</p>
            </div>
          </div>

          {/* Return KPIs */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-card p-5 rounded-xl border border-border shadow-sm">
              <div className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center text-destructive mb-3">
                <TrendingDown className="w-4 h-4" />
              </div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Tổng doanh số hoàn</p>
              <p className="text-xl font-semibold text-destructive mt-1 tabular-nums">{formatCurrency(-(thisMonth.return_revenue || 0))}</p>
              <p className="text-xs text-muted-foreground mt-1">Hôm nay: {formatCurrency(-(today.return_revenue || 0))}</p>
            </div>
            <div className="bg-card p-5 rounded-xl border border-border shadow-sm">
              <div className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center text-destructive mb-3">
                <TrendingDown className="w-4 h-4" />
              </div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">HH hoàn (Sale)</p>
              <p className="text-xl font-semibold text-destructive mt-1 tabular-nums">{formatCurrency(-Math.abs(thisMonth.return_commission_direct || 0))}</p>
              <p className="text-xs text-muted-foreground mt-1">Hôm nay: {formatCurrency(-Math.abs(today.return_commission_direct || 0))}</p>
            </div>
            <div className="bg-card p-5 rounded-xl border border-border shadow-sm">
              <div className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center text-destructive mb-3">
                <TrendingDown className="w-4 h-4" />
              </div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">HH hoàn (Quản lý)</p>
              <p className="text-xl font-semibold text-destructive mt-1 tabular-nums">{formatCurrency(-Math.abs(thisMonth.return_commission_override || 0))}</p>
              <p className="text-xs text-muted-foreground mt-1">Hôm nay: {formatCurrency(-Math.abs(today.return_commission_override || 0))}</p>
            </div>
            <div className="bg-card p-5 rounded-xl border border-border shadow-sm">
              <div className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center text-destructive mb-3">
                <ShoppingCart className="w-4 h-4" />
              </div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Tổng đơn hoàn</p>
              <p className="text-xl font-semibold text-destructive mt-1 tabular-nums">{thisMonth.return_orders || 0}</p>
              <p className="text-xs text-muted-foreground mt-1">Hôm nay: {today.return_orders || 0} đơn</p>
            </div>
          </div>

          {/* Lương / ship / NV — cùng lưới 2 cột mobile như hàng KPI */}
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="bg-card p-5 rounded-xl border border-border shadow-sm">
              <div className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center text-primary mb-3">
                <Truck className="w-4 h-4" />
              </div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Ship KH Trả</p>
              <p className="text-xl font-semibold text-foreground mt-1 tabular-nums">{formatCurrency(luongMonth.total_khach_ship || 0)}</p>
              <p className="text-xs text-muted-foreground mt-0.5">Đơn bạn phụ trách — tháng này</p>
            </div>
            <div className="bg-card p-5 rounded-xl border border-border shadow-sm">
              <div className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center text-primary mb-3">
                <CircleDollarSign className="w-4 h-4" />
              </div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Tiền NV chịu</p>
              <p className="text-xl font-semibold text-foreground mt-1 tabular-nums">{formatCurrency(luongMonth.total_nv_chiu || 0)}</p>
              <p className="text-xs text-muted-foreground mt-0.5">Đơn bạn phụ trách — tháng này</p>
            </div>
            <div className="col-span-2 lg:col-span-1 bg-card p-5 rounded-xl border border-border shadow-sm">
              <div className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center text-primary mb-3">
                <Wallet className="w-4 h-4" />
              </div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Tổng lương</p>
              <p className="text-xl font-semibold text-foreground mt-1 tabular-nums">{formatCurrency(luongMonth.total_luong || 0)}</p>
              <p className="text-xs text-muted-foreground mt-0.5">Tổng HH + Ship KH Trả − tiền NV chịu</p>
            </div>
          </div>

          {/* Trạng thái đơn */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {Object.entries(STATUS_CFG).map(([key, cfg]) => (
              <div key={key} className={cn("p-4 rounded-2xl flex items-center gap-3", cfg.bg)}>
                <cfg.icon className={cn("w-5 h-5 flex-shrink-0", cfg.color)} />
                <div>
                  <p className={cn("text-xs font-semibold", cfg.color)}>{cfg.label}</p>
                  <p className="text-xl font-semibold text-foreground tabular-nums">{byStatus[key] || 0}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Top sản phẩm + Đơn gần đây */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Top sản phẩm */}
            <div className="lg:col-span-2 bg-card rounded-xl border border-border shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-border">
                <h2 className="text-sm font-semibold text-foreground">Top sản phẩm bán chạy tháng này</h2>
              </div>
              {topProducts.length === 0 ? (
                <div className="py-10 text-center text-muted-foreground text-sm">Chưa có dữ liệu</div>
              ) : (
                <div className="p-5">
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={topProducts} barSize={32}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                      <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} dy={6} />
                      <YAxis axisLine={false} tickLine={false} tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
                        tickFormatter={(v) => v >= 1e6 ? `${(v/1e6).toFixed(1)}M` : v >= 1e3 ? `${(v/1e3).toFixed(0)}K` : v} />
                      <Tooltip formatter={(v: number) => [formatCurrency(v), "Doanh thu"]}
                        contentStyle={{ borderRadius: 12, border: "none", boxShadow: "0 4px 20px rgba(0,0,0,0.1)" }} />
                      <Bar dataKey="revenue" radius={[6, 6, 0, 0]}>
                        {topProducts.map((_: any, i: number) => (
                          <Cell
                            key={i}
                            fill={
                              i === 0
                                ? "hsl(var(--primary))"
                                : i === 1
                                  ? "hsl(var(--primary) / 0.85)"
                                  : "hsl(var(--primary) / 0.7)"
                            }
                          />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>

            {/* Đơn gần đây */}
            <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-border flex items-center justify-between">
                <h2 className="text-sm font-semibold text-foreground">Đơn hàng gần đây</h2>
                <Link to="/orders" className="text-xs text-primary hover:underline flex items-center gap-0.5">
                  Xem tất cả <ChevronRight className="w-3 h-3" />
                </Link>
              </div>
              <div className="divide-y divide-border">
                {recentOrders.length === 0 ? (
                  <div className="py-10 text-center text-muted-foreground text-sm">Chưa có đơn hàng</div>
                ) : recentOrders.slice(0, 6).map((o: any) => {
                  const st = STATUS_CFG[o.status] || { label: o.status, color: "text-muted-foreground", bg: "bg-muted/30 border border-border", icon: Clock };
                  return (
                    <Link key={o.id} to={`/orders/edit/${o.id}`}
                      className="flex items-center justify-between px-5 py-3 hover:bg-muted/30 transition-colors">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-7 h-7 rounded-full bg-muted flex items-center justify-center text-xs font-bold text-muted-foreground flex-shrink-0">
                          {(o.customer_name || "?").split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-semibold text-foreground truncate">{o.customer_name || "—"}</p>
                          <p className="text-xs text-muted-foreground font-mono">{o.code}</p>
                        </div>
                      </div>
                      <div className="text-right flex-shrink-0 ml-2">
                        <p className="text-xs font-semibold text-foreground tabular-nums">{formatCurrency(o.subtotal ?? o.total_amount)}</p>
                        <span className={cn("text-[10px] font-semibold", st.color)}>{st.label}</span>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Top khách hàng */}
          <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-border flex items-center justify-between">
              <h2 className="text-sm font-semibold text-foreground">Top khách hàng theo doanh số (tháng này)</h2>
              <Link to="/customers" className="text-xs text-primary hover:underline flex items-center gap-0.5">
                Xem tất cả <ChevronRight className="w-3 h-3" />
              </Link>
            </div>
            {topCustomers.length === 0 ? (
              <div className="py-10 text-center text-muted-foreground text-sm">Chưa có dữ liệu</div>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-muted/30 border-b border-border">
                    <th className="px-5 py-3 text-xs font-semibold text-muted-foreground text-left">#</th>
                    <th className="px-5 py-3 text-xs font-semibold text-muted-foreground text-left">Khách hàng</th>
                    <th className="px-5 py-3 text-xs font-semibold text-muted-foreground text-center">Đơn</th>
                    <th className="px-5 py-3 text-xs font-semibold text-muted-foreground text-right">Doanh số</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {topCustomers.map((c: any, i: number) => (
                    <tr key={c.id} className="hover:bg-muted/30 transition-colors">
                      <td className="px-5 py-3">
                        <span className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold bg-muted/30 text-muted-foreground">
                          {i + 1}
                        </span>
                      </td>
                      <td className="px-5 py-3">
                        <div className="min-w-0">
                          <p className="font-semibold text-foreground truncate">{c.name || "—"}</p>
                          <p className="text-xs text-muted-foreground">{c.phone || ""}</p>
                        </div>
                      </td>
                      <td className="px-5 py-3 text-center text-muted-foreground tabular-nums">{c.total_orders || 0}</td>
                      <td className="px-5 py-3 text-right font-semibold text-foreground tabular-nums">
                        {formatCurrency(c.revenue || 0)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </>
      )}
    </div>
  );
}
