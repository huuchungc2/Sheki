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
  pending:   { label: "Chờ duyệt", color: "text-amber-600",  icon: Clock,         bg: "bg-amber-50" },
  shipping:  { label: "Đang giao", color: "text-blue-600",   icon: Truck,         bg: "bg-blue-50" },
  completed: { label: "Đã giao",   color: "text-emerald-600",icon: CheckCircle2,  bg: "bg-emerald-50" },
  cancelled: { label: "Đã hủy",   color: "text-red-500",    icon: XCircle,       bg: "bg-red-50" },
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
    <span className={cn("inline-flex items-center gap-0.5 text-xs font-bold px-2 py-0.5 rounded-full",
      up ? "bg-emerald-50 text-emerald-600" : "bg-red-50 text-red-600"
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
      <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
    </div>
  );

  if (error) return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <div className="text-center">
        <AlertCircle className="w-12 h-12 mx-auto text-red-400 mb-3" />
        <p className="text-red-500 font-medium">{error}</p>
        <button onClick={() => window.location.reload()} className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-xl text-sm">Thử lại</button>
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
          <h1 className="text-2xl font-bold text-slate-900">{greet(currentUser?.full_name || "bạn")}</h1>
          <p className="text-slate-500 text-sm mt-0.5">
            {new Date().toLocaleDateString("vi-VN", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
          </p>
        </div>
        <div className="flex gap-2">
          <Link to="/orders/new" className="px-4 py-2 bg-red-600 text-white rounded-xl text-sm font-semibold hover:bg-red-700 transition-all shadow-sm">
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
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600">
                  <DollarSign className="w-4 h-4" />
                </div>
                <ChangeBadge pct={thisMonth.revenue_change} />
              </div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Doanh thu tháng này</p>
              <p className="text-xl font-bold text-slate-900 mt-1">{formatCurrency(thisMonth.revenue || 0)}</p>
              <p className="text-xs text-slate-400 mt-1">Hôm nay: {formatCurrency(today.revenue || 0)}</p>
              <p className="text-[11px] text-slate-400 mt-1 leading-snug">Tổng tạm tính (sau CK dòng), không gồm đơn hủy</p>
            </div>

            {/* Tổng đơn tháng */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <div className="w-9 h-9 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600">
                  <ShoppingCart className="w-4 h-4" />
                </div>
              </div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Đơn hàng tháng này</p>
              <p className="text-xl font-bold text-slate-900 mt-1">{thisMonth.total_orders || 0}</p>
              <p className="text-xs text-slate-400 mt-1">Hôm nay: {today.total_orders || 0} đơn</p>
            </div>

            {/* Hoa hồng tháng */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <div className="w-9 h-9 rounded-xl bg-purple-50 flex items-center justify-center text-purple-600">
                  <TrendingUp className="w-4 h-4" />
                </div>
              </div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Tổng hoa hồng tháng</p>
              <p className="text-xl font-bold text-slate-900 mt-1">{formatCurrency(commission.total || 0)}</p>
              <p className="text-xs text-slate-400 mt-1">CTV: {formatCurrency(commission.override || 0)}</p>
            </div>

            {/* Khách hàng */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <div className="w-9 h-9 rounded-xl bg-amber-50 flex items-center justify-center text-amber-600">
                  <Users className="w-4 h-4" />
                </div>
              </div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Khách hàng</p>
              <p className="text-xl font-bold text-slate-900 mt-1">{(customers.total || 0).toLocaleString()}</p>
              <p className="text-xs text-slate-400 mt-1">Mới tháng này: +{customers.new || 0}</p>
            </div>
          </div>

          {/* Return KPIs */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
              <div className="w-9 h-9 rounded-xl bg-red-50 flex items-center justify-center text-red-600 mb-3">
                <TrendingDown className="w-4 h-4" />
              </div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Tổng doanh số hoàn</p>
              <p className="text-xl font-bold text-red-600 mt-1">{formatCurrency(-(thisMonth.return_revenue || 0))}</p>
              <p className="text-xs text-slate-400 mt-1">Hôm nay: {formatCurrency(-(today.return_revenue || 0))}</p>
            </div>
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
              <div className="w-9 h-9 rounded-xl bg-red-50 flex items-center justify-center text-red-600 mb-3">
                <TrendingDown className="w-4 h-4" />
              </div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">HH hoàn (Sale)</p>
              <p className="text-xl font-bold text-red-600 mt-1">{formatCurrency(-Math.abs(thisMonth.return_commission_direct || 0))}</p>
              <p className="text-xs text-slate-400 mt-1">Hôm nay: {formatCurrency(-Math.abs(today.return_commission_direct || 0))}</p>
            </div>
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
              <div className="w-9 h-9 rounded-xl bg-red-50 flex items-center justify-center text-red-600 mb-3">
                <TrendingDown className="w-4 h-4" />
              </div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">HH hoàn (Quản lý)</p>
              <p className="text-xl font-bold text-red-600 mt-1">{formatCurrency(-Math.abs(thisMonth.return_commission_override || 0))}</p>
              <p className="text-xs text-slate-400 mt-1">Hôm nay: {formatCurrency(-Math.abs(today.return_commission_override || 0))}</p>
            </div>
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
              <div className="w-9 h-9 rounded-xl bg-red-50 flex items-center justify-center text-red-600 mb-3">
                <ShoppingCart className="w-4 h-4" />
              </div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Tổng đơn hoàn</p>
              <p className="text-xl font-bold text-red-600 mt-1">{thisMonth.return_orders || 0}</p>
              <p className="text-xs text-slate-400 mt-1">Hôm nay: {today.return_orders || 0} đơn</p>
            </div>
          </div>

          {/* Lương / ship / NV chịu — cùng lưới 2 cột mobile như hàng KPI */}
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="bg-gradient-to-br from-sky-50 to-white p-5 rounded-2xl border border-sky-100 shadow-sm ring-1 ring-sky-100/80">
              <div className="w-9 h-9 rounded-xl bg-sky-100 flex items-center justify-center text-sky-600 mb-3">
                <Truck className="w-4 h-4" />
              </div>
              <p className="text-xs font-semibold text-sky-600/90 uppercase tracking-wide">Ship KH Trả</p>
              <p className="text-xl font-bold text-sky-800 mt-1 tabular-nums">{formatCurrency(luongMonth.total_khach_ship || 0)}</p>
              <p className="text-xs text-slate-500 mt-0.5">Tháng này (theo đơn)</p>
            </div>
            <div className="bg-gradient-to-br from-rose-50 to-white p-5 rounded-2xl border border-rose-100 shadow-sm ring-1 ring-rose-100/80">
              <div className="w-9 h-9 rounded-xl bg-rose-100 flex items-center justify-center text-rose-600 mb-3">
                <CircleDollarSign className="w-4 h-4" />
              </div>
              <p className="text-xs font-semibold text-rose-600/90 uppercase tracking-wide">Tiền NV chịu</p>
              <p className="text-xl font-bold text-rose-800 mt-1 tabular-nums">{formatCurrency(luongMonth.total_nv_chiu || 0)}</p>
              <p className="text-xs text-slate-500 mt-0.5">Tháng này (theo đơn)</p>
            </div>
            <div className="col-span-2 lg:col-span-1 bg-gradient-to-br from-violet-50 to-white p-5 rounded-2xl border border-violet-100 shadow-sm ring-1 ring-violet-100/80">
              <div className="w-9 h-9 rounded-xl bg-violet-100 flex items-center justify-center text-violet-600 mb-3">
                <Wallet className="w-4 h-4" />
              </div>
              <p className="text-xs font-semibold text-violet-600/90 uppercase tracking-wide">Tổng lương</p>
              <p className="text-xl font-bold text-violet-800 mt-1 tabular-nums">{formatCurrency(luongMonth.total_luong || 0)}</p>
              <p className="text-xs text-slate-500 mt-0.5">Tổng HH + Ship KH Trả − tiền NV chịu</p>
            </div>
          </div>

          {/* Trạng thái đơn tháng này */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {Object.entries(STATUS_CFG).map(([key, cfg]) => (
              <div key={key} className={cn("p-4 rounded-2xl flex items-center gap-3", cfg.bg)}>
                <cfg.icon className={cn("w-5 h-5 flex-shrink-0", cfg.color)} />
                <div>
                  <p className={cn("text-xs font-semibold", cfg.color)}>{cfg.label}</p>
                  <p className="text-xl font-bold text-slate-900">{byStatus[key] || 0}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Top nhân viên + Đơn gần đây */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Top nhân viên */}
            <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
                <h2 className="text-sm font-bold text-slate-700">Top nhân viên tháng này</h2>
                <Link to="/employees" className="text-xs text-blue-600 hover:underline flex items-center gap-0.5">
                  Xem tất cả <ChevronRight className="w-3 h-3" />
                </Link>
              </div>
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
                        <td className="px-5 py-3">
                          <span className={cn("w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold",
                            i === 0 ? "bg-amber-100 text-amber-700" :
                            i === 1 ? "bg-slate-200 text-slate-600" :
                            i === 2 ? "bg-orange-100 text-orange-600" : "bg-slate-50 text-slate-400"
                          )}>{i + 1}</span>
                        </td>
                        <td className="px-5 py-3">
                          <Link to={`/employees/${s.id}`} className="font-semibold text-slate-800 hover:text-blue-600">{s.full_name}</Link>
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
            </div>

            {/* Đơn gần đây */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
                <h2 className="text-sm font-bold text-slate-700">Đơn hàng gần đây</h2>
                <Link to="/orders" className="text-xs text-blue-600 hover:underline flex items-center gap-0.5">
                  Xem tất cả <ChevronRight className="w-3 h-3" />
                </Link>
              </div>
              <div className="divide-y divide-slate-50">
                {recentOrders.length === 0 ? (
                  <div className="py-10 text-center text-slate-400 text-sm">Chưa có đơn hàng</div>
                ) : recentOrders.slice(0, 6).map((o: any) => {
                  const st = STATUS_CFG[o.status] || { label: o.status, color: "text-slate-500", bg: "bg-slate-50", icon: Clock };
                  return (
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
                        <span className={cn("text-[10px] font-semibold", st.color)}>{st.label}</span>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Top khách hàng */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
              <h2 className="text-sm font-bold text-slate-700">Top khách hàng theo doanh số (tháng này)</h2>
              <Link to="/customers" className="text-xs text-blue-600 hover:underline flex items-center gap-0.5">
                Xem tất cả <ChevronRight className="w-3 h-3" />
              </Link>
            </div>
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
                      <td className="px-5 py-3">
                        <span
                          className={cn(
                            "w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold",
                            i === 0
                              ? "bg-amber-100 text-amber-700"
                              : i === 1
                                ? "bg-slate-200 text-slate-600"
                                : i === 2
                                  ? "bg-orange-100 text-orange-600"
                                  : "bg-slate-50 text-slate-400"
                          )}
                        >
                          {i + 1}
                        </span>
                      </td>
                      <td className="px-5 py-3">
                        <div className="min-w-0">
                          <p className="font-semibold text-slate-800 truncate">{c.name || "—"}</p>
                          <p className="text-xs text-slate-400">{c.phone || ""}</p>
                        </div>
                      </td>
                      <td className="px-5 py-3 text-center text-slate-600">{c.total_orders || 0}</td>
                      <td className="px-5 py-3 text-right font-semibold text-slate-900">
                        {formatCurrency(c.revenue || 0)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* Top sản phẩm */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
              <h2 className="text-sm font-bold text-slate-700">Top sản phẩm bán chạy tháng này</h2>
              <Link to="/products" className="text-xs text-blue-600 hover:underline flex items-center gap-0.5">
                Xem tất cả <ChevronRight className="w-3 h-3" />
              </Link>
            </div>
            {topProducts.length === 0 ? (
              <div className="py-10 text-center text-slate-400 text-sm">Chưa có dữ liệu</div>
            ) : (
              <div className="p-5">
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={topProducts} barSize={36}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: "#64748b", fontSize: 11 }} dy={6} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fill: "#94a3b8", fontSize: 11 }}
                      tickFormatter={(v) => v >= 1e6 ? `${(v/1e6).toFixed(1)}M` : v >= 1e3 ? `${(v/1e3).toFixed(0)}K` : v} />
                    <Tooltip formatter={(v: number) => [formatCurrency(v), "Doanh thu"]}
                      contentStyle={{ borderRadius: 12, border: "none", boxShadow: "0 4px 20px rgba(0,0,0,0.1)" }} />
                    <Bar dataKey="revenue" radius={[6, 6, 0, 0]}>
                      {topProducts.map((_: any, i: number) => (
                        <Cell key={i} fill={i === 0 ? "#2563eb" : i === 1 ? "#3b82f6" : i === 2 ? "#60a5fa" : "#93c5fd"} />
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
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
              <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600 mb-3">
                <DollarSign className="w-4 h-4" />
              </div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Doanh thu tháng</p>
              <p className="text-xl font-bold text-slate-900 mt-1">{formatCurrency(thisMonth.revenue || 0)}</p>
              <p className="text-xs text-slate-400 mt-1">Hôm nay: {formatCurrency(today.revenue || 0)}</p>
              <p className="text-[11px] text-slate-400 mt-1 leading-snug">Tổng tạm tính (sau CK dòng), không gồm đơn hủy</p>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
              <div className="w-9 h-9 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600 mb-3">
                <TrendingUp className="w-4 h-4" />
              </div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">HH bán hàng</p>
              <p className="text-xl font-bold text-emerald-700 mt-1">{formatCurrency(commission.direct || 0)}</p>
              <p className="text-xs text-slate-400 mt-1">Từ đơn tự bán</p>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
              <div className="w-9 h-9 rounded-xl bg-purple-50 flex items-center justify-center text-purple-600 mb-3">
                <Users className="w-4 h-4" />
              </div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">HH từ CTV</p>
              <p className="text-xl font-bold text-purple-700 mt-1">{formatCurrency(commission.override || 0)}</p>
              <p className="text-xs text-slate-400 mt-1 leading-snug" title="Override cho quản lý khi CTV lên đơn ghi nhận quản lý. Nếu bạn chỉ là CTV, thường = 0; HH của bạn nằm ở «HH bán hàng».">
                Tổng HH: {formatCurrency(commission.total || 0)}
              </p>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
              <div className="w-9 h-9 rounded-xl bg-amber-50 flex items-center justify-center text-amber-600 mb-3">
                <ShoppingCart className="w-4 h-4" />
              </div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Đơn hàng tháng</p>
              <p className="text-xl font-bold text-slate-900 mt-1">{thisMonth.total_orders || 0}</p>
              <p className="text-xs text-slate-400 mt-1">Hôm nay: {today.total_orders || 0} đơn</p>
            </div>
          </div>

          {/* Return KPIs */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
              <div className="w-9 h-9 rounded-xl bg-red-50 flex items-center justify-center text-red-600 mb-3">
                <TrendingDown className="w-4 h-4" />
              </div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Tổng doanh số hoàn</p>
              <p className="text-xl font-bold text-red-600 mt-1">{formatCurrency(-(thisMonth.return_revenue || 0))}</p>
              <p className="text-xs text-slate-400 mt-1">Hôm nay: {formatCurrency(-(today.return_revenue || 0))}</p>
            </div>
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
              <div className="w-9 h-9 rounded-xl bg-red-50 flex items-center justify-center text-red-600 mb-3">
                <TrendingDown className="w-4 h-4" />
              </div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">HH hoàn (Sale)</p>
              <p className="text-xl font-bold text-red-600 mt-1">{formatCurrency(-Math.abs(thisMonth.return_commission_direct || 0))}</p>
              <p className="text-xs text-slate-400 mt-1">Hôm nay: {formatCurrency(-Math.abs(today.return_commission_direct || 0))}</p>
            </div>
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
              <div className="w-9 h-9 rounded-xl bg-red-50 flex items-center justify-center text-red-600 mb-3">
                <TrendingDown className="w-4 h-4" />
              </div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">HH hoàn (Quản lý)</p>
              <p className="text-xl font-bold text-red-600 mt-1">{formatCurrency(-Math.abs(thisMonth.return_commission_override || 0))}</p>
              <p className="text-xs text-slate-400 mt-1">Hôm nay: {formatCurrency(-Math.abs(today.return_commission_override || 0))}</p>
            </div>
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
              <div className="w-9 h-9 rounded-xl bg-red-50 flex items-center justify-center text-red-600 mb-3">
                <ShoppingCart className="w-4 h-4" />
              </div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Tổng đơn hoàn</p>
              <p className="text-xl font-bold text-red-600 mt-1">{thisMonth.return_orders || 0}</p>
              <p className="text-xs text-slate-400 mt-1">Hôm nay: {today.return_orders || 0} đơn</p>
            </div>
          </div>

          {/* Lương / ship / NV — cùng lưới 2 cột mobile như hàng KPI */}
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="bg-gradient-to-br from-sky-50 to-white p-5 rounded-2xl border border-sky-100 shadow-sm ring-1 ring-sky-100/80">
              <div className="w-9 h-9 rounded-xl bg-sky-100 flex items-center justify-center text-sky-600 mb-3">
                <Truck className="w-4 h-4" />
              </div>
              <p className="text-xs font-semibold text-sky-600/90 uppercase tracking-wide">Ship KH Trả</p>
              <p className="text-xl font-bold text-sky-800 mt-1 tabular-nums">{formatCurrency(luongMonth.total_khach_ship || 0)}</p>
              <p className="text-xs text-slate-500 mt-0.5">Đơn bạn phụ trách — tháng này</p>
            </div>
            <div className="bg-gradient-to-br from-rose-50 to-white p-5 rounded-2xl border border-rose-100 shadow-sm ring-1 ring-rose-100/80">
              <div className="w-9 h-9 rounded-xl bg-rose-100 flex items-center justify-center text-rose-600 mb-3">
                <CircleDollarSign className="w-4 h-4" />
              </div>
              <p className="text-xs font-semibold text-rose-600/90 uppercase tracking-wide">Tiền NV chịu</p>
              <p className="text-xl font-bold text-rose-800 mt-1 tabular-nums">{formatCurrency(luongMonth.total_nv_chiu || 0)}</p>
              <p className="text-xs text-slate-500 mt-0.5">Đơn bạn phụ trách — tháng này</p>
            </div>
            <div className="col-span-2 lg:col-span-1 bg-gradient-to-br from-violet-50 to-white p-5 rounded-2xl border border-violet-100 shadow-sm ring-1 ring-violet-100/80">
              <div className="w-9 h-9 rounded-xl bg-violet-100 flex items-center justify-center text-violet-600 mb-3">
                <Wallet className="w-4 h-4" />
              </div>
              <p className="text-xs font-semibold text-violet-600/90 uppercase tracking-wide">Tổng lương</p>
              <p className="text-xl font-bold text-violet-800 mt-1 tabular-nums">{formatCurrency(luongMonth.total_luong || 0)}</p>
              <p className="text-xs text-slate-500 mt-0.5">Tổng HH + Ship KH Trả − tiền NV chịu</p>
            </div>
          </div>

          {/* Trạng thái đơn */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {Object.entries(STATUS_CFG).map(([key, cfg]) => (
              <div key={key} className={cn("p-4 rounded-2xl flex items-center gap-3", cfg.bg)}>
                <cfg.icon className={cn("w-5 h-5 flex-shrink-0", cfg.color)} />
                <div>
                  <p className={cn("text-xs font-semibold", cfg.color)}>{cfg.label}</p>
                  <p className="text-xl font-bold text-slate-900">{byStatus[key] || 0}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Top sản phẩm + Đơn gần đây */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Top sản phẩm */}
            <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-100">
                <h2 className="text-sm font-bold text-slate-700">Top sản phẩm bán chạy tháng này</h2>
              </div>
              {topProducts.length === 0 ? (
                <div className="py-10 text-center text-slate-400 text-sm">Chưa có dữ liệu</div>
              ) : (
                <div className="p-5">
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={topProducts} barSize={32}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: "#64748b", fontSize: 11 }} dy={6} />
                      <YAxis axisLine={false} tickLine={false} tick={{ fill: "#94a3b8", fontSize: 11 }}
                        tickFormatter={(v) => v >= 1e6 ? `${(v/1e6).toFixed(1)}M` : v >= 1e3 ? `${(v/1e3).toFixed(0)}K` : v} />
                      <Tooltip formatter={(v: number) => [formatCurrency(v), "Doanh thu"]}
                        contentStyle={{ borderRadius: 12, border: "none", boxShadow: "0 4px 20px rgba(0,0,0,0.1)" }} />
                      <Bar dataKey="revenue" radius={[6, 6, 0, 0]}>
                        {topProducts.map((_: any, i: number) => (
                          <Cell key={i} fill={i === 0 ? "#10b981" : i === 1 ? "#34d399" : "#6ee7b7"} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>

            {/* Đơn gần đây */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
                <h2 className="text-sm font-bold text-slate-700">Đơn hàng gần đây</h2>
                <Link to="/orders" className="text-xs text-blue-600 hover:underline flex items-center gap-0.5">
                  Xem tất cả <ChevronRight className="w-3 h-3" />
                </Link>
              </div>
              <div className="divide-y divide-slate-50">
                {recentOrders.length === 0 ? (
                  <div className="py-10 text-center text-slate-400 text-sm">Chưa có đơn hàng</div>
                ) : recentOrders.slice(0, 6).map((o: any) => {
                  const st = STATUS_CFG[o.status] || { label: o.status, color: "text-slate-500", bg: "bg-slate-50", icon: Clock };
                  return (
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
                        <span className={cn("text-[10px] font-semibold", st.color)}>{st.label}</span>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Top khách hàng */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
              <h2 className="text-sm font-bold text-slate-700">Top khách hàng theo doanh số (tháng này)</h2>
              <Link to="/customers" className="text-xs text-blue-600 hover:underline flex items-center gap-0.5">
                Xem tất cả <ChevronRight className="w-3 h-3" />
              </Link>
            </div>
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
                      <td className="px-5 py-3">
                        <span className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold bg-slate-50 text-slate-400">
                          {i + 1}
                        </span>
                      </td>
                      <td className="px-5 py-3">
                        <div className="min-w-0">
                          <p className="font-semibold text-slate-800 truncate">{c.name || "—"}</p>
                          <p className="text-xs text-slate-400">{c.phone || ""}</p>
                        </div>
                      </td>
                      <td className="px-5 py-3 text-center text-slate-600">{c.total_orders || 0}</td>
                      <td className="px-5 py-3 text-right font-semibold text-slate-900">
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
