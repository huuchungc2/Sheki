import * as React from "react";
import { Link } from "react-router-dom";
import {
  DollarSign, Users, ShoppingCart, TrendingUp, TrendingDown,
  Clock, Truck, CheckCircle2, XCircle, ChevronRight,
  Loader2, AlertCircle, ArrowUpRight, ArrowDownRight,
  Wallet, CircleDollarSign, Package,
} from "lucide-react";
import {
  BarChart, Bar, Cell, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import { cn, formatCurrency, isAdminUser } from "../lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

const API_URL = (import.meta as any)?.env?.VITE_API_URL || "/api";

const STATUS_CFG: Record<string, { label: string; variant: string; icon: any }> = {
  pending:   { label: "Chờ duyệt", variant: "warning",  icon: Clock },
  shipping:  { label: "Đang giao", variant: "info",     icon: Truck },
  completed: { label: "Đã giao",   variant: "success",  icon: CheckCircle2 },
  cancelled: { label: "Đã hủy",   variant: "danger",   icon: XCircle },
};

const STATUS_STYLE: Record<string, string> = {
  warning: "bg-amber-50 text-amber-700 border-amber-200",
  info:    "bg-blue-50 text-blue-700 border-blue-200",
  success: "bg-emerald-50 text-emerald-700 border-emerald-200",
  danger:  "bg-red-50 text-red-600 border-red-200",
};

const STATUS_BG: Record<string, string> = {
  pending:   "bg-amber-50 border-amber-100",
  shipping:  "bg-blue-50 border-blue-100",
  completed: "bg-emerald-50 border-emerald-100",
  cancelled: "bg-red-50 border-red-100",
};

const STATUS_ICON_COLOR: Record<string, string> = {
  pending:   "text-amber-600",
  shipping:  "text-blue-600",
  completed: "text-emerald-600",
  cancelled: "text-red-500",
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
    <span className={cn(
      "inline-flex items-center gap-0.5 text-xs font-semibold px-2 py-0.5 rounded-full",
      up ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-600"
    )}>
      {up ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
      {up ? "+" : ""}{pct}%
    </span>
  );
}

/* ── KPI Card ── */
function KpiCard({
  icon: Icon, iconBg, iconColor, label, value, sub, badge, note,
}: {
  icon: any; iconBg: string; iconColor: string;
  label: string; value: string; sub?: string; badge?: string | null; note?: string;
}) {
  return (
    <Card className="shadow-none border-slate-200">
      <CardContent className="p-5">
        <div className="flex items-center justify-between mb-3">
          <div className={cn("w-9 h-9 rounded-xl flex items-center justify-center", iconBg)}>
            <Icon className={cn("w-4 h-4", iconColor)} />
          </div>
          {badge !== undefined && <ChangeBadge pct={badge ?? null} />}
        </div>
        <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-widest">{label}</p>
        <p className="text-xl font-bold text-slate-900 mt-1 tabular-nums">{value}</p>
        {sub && <p className="text-xs text-slate-400 mt-1">{sub}</p>}
        {note && <p className="text-[11px] text-slate-400 mt-1 leading-snug">{note}</p>}
      </CardContent>
    </Card>
  );
}

/* ── Lương mini card ── */
function LuongCard({
  icon: Icon, iconBg, iconColor, label, value, sub, color,
}: {
  icon: any; iconBg: string; iconColor: string;
  label: string; value: string; sub: string; color: string;
}) {
  return (
    <Card className="shadow-none">
      <CardContent className="p-5">
        <div className={cn("w-9 h-9 rounded-xl flex items-center justify-center mb-3", iconBg)}>
          <Icon className={cn("w-4 h-4", iconColor)} />
        </div>
        <p className={cn("text-[11px] font-semibold uppercase tracking-widest", color)}>{label}</p>
        <p className={cn("text-xl font-bold mt-1 tabular-nums", color.replace("600", "800").replace("500", "700"))}>{value}</p>
        <p className="text-xs text-slate-500 mt-0.5">{sub}</p>
      </CardContent>
    </Card>
  );
}

/* ── Rank badge ── */
function RankBadge({ i }: { i: number }) {
  const cls = i === 0
    ? "bg-amber-100 text-amber-700"
    : i === 1 ? "bg-slate-200 text-slate-600"
    : i === 2 ? "bg-orange-100 text-orange-600"
    : "bg-slate-50 text-slate-400";
  return (
    <span className={cn("w-6 h-6 rounded-full inline-flex items-center justify-center text-xs font-bold", cls)}>
      {i + 1}
    </span>
  );
}

/* ── Status pill ── */
function StatusPill({ status }: { status: string }) {
  const cfg = STATUS_CFG[status];
  if (!cfg) return <span className="text-xs text-slate-400">{status}</span>;
  const style = STATUS_STYLE[cfg.variant] || "bg-slate-100 text-slate-500";
  return (
    <span className={cn("inline-flex items-center text-[10px] font-semibold px-2 py-0.5 rounded-full border", style)}>
      {cfg.label}
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
      } catch { setCurrentUser(null); }
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
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(r => { if (!r.ok) throw new Error("Không thể tải dữ liệu"); return r.json(); })
      .then(j => setData(j.data))
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [token]);

  if (loading) return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
    </div>
  );

  if (error) return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <div className="text-center">
        <AlertCircle className="w-12 h-12 mx-auto text-red-400 mb-3" />
        <p className="text-red-500 font-medium">{error}</p>
        <Button onClick={() => window.location.reload()} className="mt-4" size="sm">
          Thử lại
        </Button>
      </div>
    </div>
  );

  const d            = data;
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
          <h1 className="text-2xl font-bold text-slate-900">
            {greet(currentUser?.full_name || "bạn")}
          </h1>
          <p className="text-slate-500 text-sm mt-0.5">
            {new Date().toLocaleDateString("vi-VN", {
              weekday: "long", year: "numeric", month: "long", day: "numeric",
            })}
          </p>
        </div>
        <Button asChild>
          <Link to="/orders/new">+ Tạo đơn mới</Link>
        </Button>
      </div>

      {/* ── ADMIN VIEW ── */}
      {isAdmin && (
        <>
          {/* KPI hàng 1 */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <KpiCard
              icon={DollarSign} iconBg="bg-blue-50" iconColor="text-blue-600"
              label="Doanh thu tháng này"
              value={formatCurrency(thisMonth.revenue || 0)}
              sub={`Hôm nay: ${formatCurrency(today.revenue || 0)}`}
              badge={thisMonth.revenue_change ?? null}
              note="Tổng tạm tính (sau CK dòng), không gồm đơn hủy"
            />
            <KpiCard
              icon={ShoppingCart} iconBg="bg-emerald-50" iconColor="text-emerald-600"
              label="Đơn hàng tháng này"
              value={String(thisMonth.total_orders || 0)}
              sub={`Hôm nay: ${today.total_orders || 0} đơn`}
            />
            <KpiCard
              icon={TrendingUp} iconBg="bg-purple-50" iconColor="text-purple-600"
              label="Tổng hoa hồng tháng"
              value={formatCurrency(commission.total || 0)}
              sub={`CTV: ${formatCurrency(commission.override || 0)}`}
            />
            <KpiCard
              icon={Users} iconBg="bg-amber-50" iconColor="text-amber-600"
              label="Khách hàng"
              value={(customers.total || 0).toLocaleString()}
              sub={`Mới tháng này: +${customers.new || 0}`}
            />
          </div>

          {/* Return KPIs */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <KpiCard
              icon={TrendingDown} iconBg="bg-red-50" iconColor="text-red-600"
              label="Doanh số hoàn"
              value={formatCurrency(-(thisMonth.return_revenue || 0))}
              sub={`Hôm nay: ${formatCurrency(-(today.return_revenue || 0))}`}
            />
            <KpiCard
              icon={TrendingDown} iconBg="bg-red-50" iconColor="text-red-600"
              label="HH hoàn"
              value={formatCurrency(-Math.abs(thisMonth.return_commission || 0))}
              sub={`Hôm nay: ${formatCurrency(-Math.abs(today.return_commission || 0))}`}
            />
            <KpiCard
              icon={ShoppingCart} iconBg="bg-red-50" iconColor="text-red-600"
              label="Đơn hoàn"
              value={String(thisMonth.return_orders || 0)}
              sub={`Hôm nay: ${today.return_orders || 0} đơn`}
            />
          </div>

          {/* Lương admin */}
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
            <LuongCard
              icon={Truck} iconBg="bg-sky-100" iconColor="text-sky-600"
              label="Ship KH Trả" color="text-sky-600"
              value={formatCurrency(luongMonth.total_khach_ship || 0)}
              sub="Tháng này (theo đơn)"
            />
            <LuongCard
              icon={CircleDollarSign} iconBg="bg-rose-100" iconColor="text-rose-600"
              label="Tiền NV chịu" color="text-rose-600"
              value={formatCurrency(luongMonth.total_nv_chiu || 0)}
              sub="Tháng này (theo đơn)"
            />
            <div className="col-span-2 lg:col-span-1">
              <LuongCard
                icon={Wallet} iconBg="bg-violet-100" iconColor="text-violet-600"
                label="Tổng lương" color="text-violet-600"
                value={formatCurrency(luongMonth.total_luong || 0)}
                sub="Tổng HH + Ship KH Trả − tiền NV chịu"
              />
            </div>
          </div>

          {/* Trạng thái đơn */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {Object.entries(STATUS_CFG).map(([key, cfg]) => (
              <div key={key} className={cn(
                "p-4 rounded-2xl flex items-center gap-3 border",
                STATUS_BG[key]
              )}>
                <cfg.icon className={cn("w-5 h-5 flex-shrink-0", STATUS_ICON_COLOR[key])} />
                <div>
                  <p className={cn("text-xs font-semibold", STATUS_ICON_COLOR[key])}>{cfg.label}</p>
                  <p className="text-xl font-bold text-slate-900">{byStatus[key] || 0}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Top nhân viên + Đơn gần đây */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="lg:col-span-2 shadow-none border-slate-200">
              <CardHeader className="px-5 py-4 border-b border-slate-100 flex-row items-center justify-between space-y-0">
                <CardTitle className="text-sm font-bold text-slate-700">Top nhân viên tháng này</CardTitle>
                <Link to="/employees" className="text-xs text-blue-600 hover:underline flex items-center gap-0.5">
                  Xem tất cả <ChevronRight className="w-3 h-3" />
                </Link>
              </CardHeader>
              <CardContent className="p-0">
                {topSales.length === 0 ? (
                  <div className="py-10 text-center text-slate-400 text-sm">Chưa có dữ liệu</div>
                ) : (
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-100">
                        <th className="px-5 py-3 text-xs font-semibold text-slate-500 text-left">#</th>
                        <th className="px-5 py-3 text-xs font-semibold text-slate-500 text-left">Nhân viên</th>
                        <th className="px-5 py-3 text-xs font-semibold text-slate-500 text-center">Đơn</th>
                        <th className="px-5 py-3 text-xs font-semibold text-slate-500 text-right">Doanh số</th>
                        <th className="px-5 py-3 text-xs font-semibold text-slate-500 text-right">Hoa hồng</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {topSales.map((s: any, i: number) => (
                        <tr key={s.id} className="hover:bg-slate-50/60 transition-colors">
                          <td className="px-5 py-3"><RankBadge i={i} /></td>
                          <td className="px-5 py-3">
                            <Link to={`/employees/${s.id}`} className="font-semibold text-slate-800 hover:text-blue-600">
                              {s.full_name}
                            </Link>
                          </td>
                          <td className="px-5 py-3 text-center text-slate-600">{s.total_orders}</td>
                          <td className="px-5 py-3 text-right font-semibold text-slate-900">{formatCurrency(s.revenue)}</td>
                          <td className="px-5 py-3 text-right font-semibold text-emerald-600">
                            {formatCurrency(s.direct_comm + s.override_comm)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </CardContent>
            </Card>

            {/* Đơn gần đây */}
            <Card className="shadow-none border-slate-200">
              <CardHeader className="px-5 py-4 border-b border-slate-100 flex-row items-center justify-between space-y-0">
                <CardTitle className="text-sm font-bold text-slate-700">Đơn hàng gần đây</CardTitle>
                <Link to="/orders" className="text-xs text-blue-600 hover:underline flex items-center gap-0.5">
                  Xem tất cả <ChevronRight className="w-3 h-3" />
                </Link>
              </CardHeader>
              <CardContent className="p-0 divide-y divide-slate-50">
                {recentOrders.length === 0 ? (
                  <div className="py-10 text-center text-slate-400 text-sm">Chưa có đơn hàng</div>
                ) : recentOrders.slice(0, 6).map((o: any) => (
                  <Link key={o.id} to={`/orders/edit/${o.id}`}
                    className="flex items-center justify-between px-5 py-3 hover:bg-slate-50/60 transition-colors">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center text-xs font-bold text-slate-500 flex-shrink-0">
                        {(o.customer_name || "?").split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-slate-800 truncate">{o.customer_name || "—"}</p>
                        <p className="text-xs text-slate-400 font-mono">{o.code}</p>
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0 ml-2">
                      <p className="text-xs font-bold text-slate-900">{formatCurrency(o.subtotal ?? o.total_amount)}</p>
                      <StatusPill status={o.status} />
                    </div>
                  </Link>
                ))}
              </CardContent>
            </Card>
          </div>

          {/* Top khách hàng */}
          <Card className="shadow-none border-slate-200">
            <CardHeader className="px-5 py-4 border-b border-slate-100 flex-row items-center justify-between space-y-0">
              <CardTitle className="text-sm font-bold text-slate-700">Top khách hàng theo doanh số (tháng này)</CardTitle>
              <Link to="/customers" className="text-xs text-blue-600 hover:underline flex items-center gap-0.5">
                Xem tất cả <ChevronRight className="w-3 h-3" />
              </Link>
            </CardHeader>
            <CardContent className="p-0">
              {topCustomers.length === 0 ? (
                <div className="py-10 text-center text-slate-400 text-sm">Chưa có dữ liệu</div>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-100">
                      <th className="px-5 py-3 text-xs font-semibold text-slate-500 text-left">#</th>
                      <th className="px-5 py-3 text-xs font-semibold text-slate-500 text-left">Khách hàng</th>
                      <th className="px-5 py-3 text-xs font-semibold text-slate-500 text-center">Đơn</th>
                      <th className="px-5 py-3 text-xs font-semibold text-slate-500 text-right">Doanh số</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {topCustomers.map((c: any, i: number) => (
                      <tr key={c.id} className="hover:bg-slate-50/60 transition-colors">
                        <td className="px-5 py-3"><RankBadge i={i} /></td>
                        <td className="px-5 py-3">
                          <p className="font-semibold text-slate-800 truncate">{c.name || "—"}</p>
                          <p className="text-xs text-slate-400">{c.phone || ""}</p>
                        </td>
                        <td className="px-5 py-3 text-center text-slate-600">{c.total_orders || 0}</td>
                        <td className="px-5 py-3 text-right font-semibold text-slate-900">{formatCurrency(c.revenue || 0)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </CardContent>
          </Card>

          {/* Top sản phẩm */}
          <Card className="shadow-none border-slate-200">
            <CardHeader className="px-5 py-4 border-b border-slate-100 flex-row items-center justify-between space-y-0">
              <CardTitle className="text-sm font-bold text-slate-700">Top sản phẩm bán chạy tháng này</CardTitle>
              <Link to="/products" className="text-xs text-blue-600 hover:underline flex items-center gap-0.5">
                Xem tất cả <ChevronRight className="w-3 h-3" />
              </Link>
            </CardHeader>
            <CardContent className="p-5">
              {topProducts.length === 0 ? (
                <div className="py-6 text-center text-slate-400 text-sm">Chưa có dữ liệu</div>
              ) : (
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={topProducts} barSize={36}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: "#64748b", fontSize: 11 }} dy={6} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fill: "#94a3b8", fontSize: 11 }}
                      tickFormatter={(v) => v >= 1e6 ? `${(v / 1e6).toFixed(1)}M` : v >= 1e3 ? `${(v / 1e3).toFixed(0)}K` : v} />
                    <Tooltip formatter={(v: number) => [formatCurrency(v), "Doanh thu"]}
                      contentStyle={{ borderRadius: 12, border: "none", boxShadow: "0 4px 20px rgba(0,0,0,0.1)" }} />
                    <Bar dataKey="revenue" radius={[6, 6, 0, 0]}>
                      {topProducts.map((_: any, i: number) => (
                        <Cell key={i} fill={["#2563eb", "#3b82f6", "#60a5fa", "#93c5fd"][Math.min(i, 3)]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </>
      )}

      {/* ── SALES VIEW ── */}
      {!isAdmin && (
        <>
          {/* KPI Sales */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <KpiCard
              icon={DollarSign} iconBg="bg-blue-50" iconColor="text-blue-600"
              label="Doanh thu tháng"
              value={formatCurrency(thisMonth.revenue || 0)}
              sub={`Hôm nay: ${formatCurrency(today.revenue || 0)}`}
              note="Tổng tạm tính (sau CK dòng), không gồm đơn hủy"
            />
            <KpiCard
              icon={TrendingUp} iconBg="bg-emerald-50" iconColor="text-emerald-600"
              label="HH bán hàng"
              value={formatCurrency(commission.direct || 0)}
              sub="Từ đơn tự bán"
            />
            <KpiCard
              icon={Users} iconBg="bg-purple-50" iconColor="text-purple-600"
              label="HH từ CTV"
              value={formatCurrency(commission.override || 0)}
              sub={`Tổng HH: ${formatCurrency(commission.total || 0)}`}
            />
            <KpiCard
              icon={ShoppingCart} iconBg="bg-amber-50" iconColor="text-amber-600"
              label="Đơn hàng tháng"
              value={String(thisMonth.total_orders || 0)}
              sub={`Hôm nay: ${today.total_orders || 0} đơn`}
            />
          </div>

          {/* Return KPIs Sales */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <KpiCard
              icon={TrendingDown} iconBg="bg-red-50" iconColor="text-red-600"
              label="Doanh số hoàn"
              value={formatCurrency(-(thisMonth.return_revenue || 0))}
              sub={`Hôm nay: ${formatCurrency(-(today.return_revenue || 0))}`}
            />
            <KpiCard
              icon={TrendingDown} iconBg="bg-red-50" iconColor="text-red-600"
              label="HH hoàn"
              value={formatCurrency(-Math.abs(thisMonth.return_commission || 0))}
              sub={`Hôm nay: ${formatCurrency(-Math.abs(today.return_commission || 0))}`}
            />
            <KpiCard
              icon={ShoppingCart} iconBg="bg-red-50" iconColor="text-red-600"
              label="Đơn hoàn"
              value={String(thisMonth.return_orders || 0)}
              sub={`Hôm nay: ${today.return_orders || 0} đơn`}
            />
          </div>

          {/* Lương Sales */}
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
            <LuongCard
              icon={Truck} iconBg="bg-sky-100" iconColor="text-sky-600"
              label="Ship KH Trả" color="text-sky-600"
              value={formatCurrency(luongMonth.total_khach_ship || 0)}
              sub="Đơn bạn phụ trách — tháng này"
            />
            <LuongCard
              icon={CircleDollarSign} iconBg="bg-rose-100" iconColor="text-rose-600"
              label="Tiền NV chịu" color="text-rose-600"
              value={formatCurrency(luongMonth.total_nv_chiu || 0)}
              sub="Đơn bạn phụ trách — tháng này"
            />
            <div className="col-span-2 lg:col-span-1">
              <LuongCard
                icon={Wallet} iconBg="bg-violet-100" iconColor="text-violet-600"
                label="Tổng lương" color="text-violet-600"
                value={formatCurrency(luongMonth.total_luong || 0)}
                sub="Tổng HH + Ship KH Trả − tiền NV chịu"
              />
            </div>
          </div>

          {/* Trạng thái đơn Sales */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {Object.entries(STATUS_CFG).map(([key, cfg]) => (
              <div key={key} className={cn(
                "p-4 rounded-2xl flex items-center gap-3 border",
                STATUS_BG[key]
              )}>
                <cfg.icon className={cn("w-5 h-5 flex-shrink-0", STATUS_ICON_COLOR[key])} />
                <div>
                  <p className={cn("text-xs font-semibold", STATUS_ICON_COLOR[key])}>{cfg.label}</p>
                  <p className="text-xl font-bold text-slate-900">{byStatus[key] || 0}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Top sản phẩm Sales + Đơn gần đây */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="lg:col-span-2 shadow-none border-slate-200">
              <CardHeader className="px-5 py-4 border-b border-slate-100 flex-row items-center justify-between space-y-0">
                <CardTitle className="text-sm font-bold text-slate-700">Top sản phẩm bán chạy tháng này</CardTitle>
              </CardHeader>
              <CardContent className="p-5">
                {topProducts.length === 0 ? (
                  <div className="py-6 text-center text-slate-400 text-sm">Chưa có dữ liệu</div>
                ) : (
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={topProducts} barSize={32}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: "#64748b", fontSize: 11 }} dy={6} />
                      <YAxis axisLine={false} tickLine={false} tick={{ fill: "#94a3b8", fontSize: 11 }}
                        tickFormatter={(v) => v >= 1e6 ? `${(v / 1e6).toFixed(1)}M` : v >= 1e3 ? `${(v / 1e3).toFixed(0)}K` : v} />
                      <Tooltip formatter={(v: number) => [formatCurrency(v), "Doanh thu"]}
                        contentStyle={{ borderRadius: 12, border: "none", boxShadow: "0 4px 20px rgba(0,0,0,0.1)" }} />
                      <Bar dataKey="revenue" radius={[6, 6, 0, 0]}>
                        {topProducts.map((_: any, i: number) => (
                          <Cell key={i} fill={["#10b981", "#34d399", "#6ee7b7"][Math.min(i, 2)]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            <Card className="shadow-none border-slate-200">
              <CardHeader className="px-5 py-4 border-b border-slate-100 flex-row items-center justify-between space-y-0">
                <CardTitle className="text-sm font-bold text-slate-700">Đơn hàng gần đây</CardTitle>
                <Link to="/orders" className="text-xs text-blue-600 hover:underline flex items-center gap-0.5">
                  Xem tất cả <ChevronRight className="w-3 h-3" />
                </Link>
              </CardHeader>
              <CardContent className="p-0 divide-y divide-slate-50">
                {recentOrders.length === 0 ? (
                  <div className="py-10 text-center text-slate-400 text-sm">Chưa có đơn hàng</div>
                ) : recentOrders.slice(0, 6).map((o: any) => (
                  <Link key={o.id} to={`/orders/edit/${o.id}`}
                    className="flex items-center justify-between px-5 py-3 hover:bg-slate-50/60 transition-colors">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center text-xs font-bold text-slate-500 flex-shrink-0">
                        {(o.customer_name || "?").split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-slate-800 truncate">{o.customer_name || "—"}</p>
                        <p className="text-xs text-slate-400 font-mono">{o.code}</p>
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0 ml-2">
                      <p className="text-xs font-bold text-slate-900">{formatCurrency(o.subtotal ?? o.total_amount)}</p>
                      <StatusPill status={o.status} />
                    </div>
                  </Link>
                ))}
              </CardContent>
            </Card>
          </div>

          {/* Top khách hàng Sales */}
          <Card className="shadow-none border-slate-200">
            <CardHeader className="px-5 py-4 border-b border-slate-100 flex-row items-center justify-between space-y-0">
              <CardTitle className="text-sm font-bold text-slate-700">Top khách hàng theo doanh số (tháng này)</CardTitle>
              <Link to="/customers" className="text-xs text-blue-600 hover:underline flex items-center gap-0.5">
                Xem tất cả <ChevronRight className="w-3 h-3" />
              </Link>
            </CardHeader>
            <CardContent className="p-0">
              {topCustomers.length === 0 ? (
                <div className="py-10 text-center text-slate-400 text-sm">Chưa có dữ liệu</div>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-100">
                      <th className="px-5 py-3 text-xs font-semibold text-slate-500 text-left">#</th>
                      <th className="px-5 py-3 text-xs font-semibold text-slate-500 text-left">Khách hàng</th>
                      <th className="px-5 py-3 text-xs font-semibold text-slate-500 text-center">Đơn</th>
                      <th className="px-5 py-3 text-xs font-semibold text-slate-500 text-right">Doanh số</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {topCustomers.map((c: any, i: number) => (
                      <tr key={c.id} className="hover:bg-slate-50/60 transition-colors">
                        <td className="px-5 py-3"><RankBadge i={i} /></td>
                        <td className="px-5 py-3">
                          <p className="font-semibold text-slate-800 truncate">{c.name || "—"}</p>
                          <p className="text-xs text-slate-400">{c.phone || ""}</p>
                        </td>
                        <td className="px-5 py-3 text-center text-slate-600">{c.total_orders || 0}</td>
                        <td className="px-5 py-3 text-right font-semibold text-slate-900">{formatCurrency(c.revenue || 0)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
