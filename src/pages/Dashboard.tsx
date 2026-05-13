import * as React from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  DollarSign, Users, Package, ShoppingCart,
  TrendingUp, TrendingDown, Clock, Truck,
  CheckCircle2, XCircle, ChevronRight,
  Loader2, AlertCircle, ArrowUpRight, ArrowDownRight,
  Wallet, CircleDollarSign, Search, ChevronDown, X,
  Filter, RefreshCcw,
} from "lucide-react";
import {
  BarChart, Bar, Cell, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer
} from "recharts";
import { cn, formatCurrency, isAdminUser, formatDate } from "../lib/utils";
import { useChartTheme } from "../lib/chartTheme";

const API_URL =
  (import.meta as any)?.env?.VITE_API_URL ||
  "/api";

const dashSelectCls =
  "min-h-10 rounded-md border border-input bg-background px-3 py-2 text-sm font-medium text-foreground outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background";

const STATUS_CFG: Record<string, { label: string; icon: any; cls: string }> = {
  pending:   { label: "Chờ duyệt", icon: Clock,        cls: "kpi-status--pending" },
  shipping:  { label: "Đang giao", icon: Truck,        cls: "kpi-status--shipping" },
  completed: { label: "Đã giao",   icon: CheckCircle2, cls: "kpi-status--completed" },
  cancelled: { label: "Đã hủy",    icon: XCircle,      cls: "bg-destructive/10 border border-destructive/30 text-destructive" },
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
      up ? "kpi-badge-success"
         : "bg-destructive/10 text-destructive border-destructive/30"
    )}>
      {up ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
      {up ? "+" : ""}{pct}%
    </span>
  );
}

export function Dashboard() {
  const C = useChartTheme();
  const [searchParams, setSearchParams] = useSearchParams();
  const employeeId = (searchParams.get("employee") ?? "").trim();
  const groupId = (searchParams.get("group_id") ?? "").trim();
  const payrollPeriodIdParam = (searchParams.get("payroll_period_id") ?? "").trim();
  const filterMonth =
    searchParams.get("month")?.trim() || String(new Date().getMonth() + 1).padStart(2, "0");
  const filterYear = searchParams.get("year")?.trim() || String(new Date().getFullYear());
  const filterMode = payrollPeriodIdParam ? "payroll" : "month";

  const yearOptions = React.useMemo(() => {
    const yy = new Date().getFullYear();
    return Array.from({ length: yy - 2019 + 2 }, (_, i) => String(2020 + i));
  }, []);

  const [data, setData] = React.useState<any>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError]     = React.useState<string | null>(null);

  const [currentUser, setCurrentUser] = React.useState<any>(() => {
    const u = localStorage.getItem("user");
    return u ? JSON.parse(u) : null;
  });
  const [token, setToken] = React.useState<string>(() => localStorage.getItem("token") || "");
  const isAdmin = isAdminUser(currentUser);

  const patchDashParams = React.useCallback(
    (patch: Record<string, string | null | undefined>) => {
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          for (const [k, v] of Object.entries(patch)) {
            if (v === null || v === undefined || v === "") next.delete(k);
            else next.set(k, v);
          }
          return next;
        },
        { replace: true }
      );
    },
    [setSearchParams]
  );

  const [groups, setGroups] = React.useState<any[]>([]);
  const [payrollPeriods, setPayrollPeriods] = React.useState<any[]>([]);
  const fetchPayrollPeriodsList = React.useCallback(async (): Promise<any[]> => {
    const t = localStorage.getItem("token") || "";
    try {
      const listRes = await fetch(`${API_URL}/payroll/periods`, { headers: { Authorization: `Bearer ${t}` } });
      if (!listRes.ok) return [];
      const listJ = await listRes.json();
      const list = listJ?.data || [];
      setPayrollPeriods(list);
      return list;
    } catch {
      setPayrollPeriods([]);
      return [];
    }
  }, []);

  React.useEffect(() => {
    if (!token) return;
    const ep = isAdmin ? "/groups" : `/groups/user/${currentUser?.id}`;
    fetch(`${API_URL}${ep}`, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then((j) => setGroups(j.data || []))
      .catch(() => setGroups([]));
  }, [token, isAdmin, currentUser?.id]);

  // Luôn tải danh sách kỳ khi có token — cần trước khi bấm «Kỳ lương» (lúc đó filterMode vẫn là month).
  React.useEffect(() => {
    if (!token) return;
    void fetchPayrollPeriodsList();
  }, [token, fetchPayrollPeriodsList]);

  const [showEmployeeMenu, setShowEmployeeMenu] = React.useState(false);
  const [employeeQuery, setEmployeeQuery] = React.useState("");
  const [employeeOptions, setEmployeeOptions] = React.useState<any[]>([]);
  const [employeeLoading, setEmployeeLoading] = React.useState(false);
  const [employeeSelectedName, setEmployeeSelectedName] = React.useState<string>("");

  React.useEffect(() => {
    if (!isAdmin || !employeeId) {
      setEmployeeSelectedName("");
      return;
    }
    let aborted = false;
    fetch(`${API_URL}/users/${employeeId}`, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => {
        if (aborted) return;
        setEmployeeSelectedName(String(j?.data?.full_name || ""));
      })
      .catch(() => {
        if (aborted) return;
        setEmployeeSelectedName("");
      });
    return () => { aborted = true; };
  }, [isAdmin, employeeId, token]);

  React.useEffect(() => {
    if (!isAdmin || !showEmployeeMenu) return;
    const q = employeeQuery.trim();
    const t = window.setTimeout(async () => {
      try {
        setEmployeeLoading(true);
        const params = new URLSearchParams({
          scoped: "1",
          limit: "20",
          active_only: "1",
          ...(q ? { search: q } : {}),
        });
        const res = await fetch(`${API_URL}/users?${params}`, { headers: { Authorization: `Bearer ${token}` } });
        if (!res.ok) return;
        const j = await res.json();
        setEmployeeOptions(j?.data || []);
      } catch {
        setEmployeeOptions([]);
      } finally {
        setEmployeeLoading(false);
      }
    }, 250);
    return () => window.clearTimeout(t);
  }, [isAdmin, showEmployeeMenu, employeeQuery, token]);

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
    const qs = new URLSearchParams();
    if (payrollPeriodIdParam) qs.set("payroll_period_id", payrollPeriodIdParam);
    else {
      qs.set("month", filterMonth);
      qs.set("year", filterYear);
    }
    if (groupId) qs.set("group_id", groupId);
    if (isAdminUser(currentUser) && employeeId) qs.set("employee", employeeId);
    const qstr = qs.toString();
    fetch(`${API_URL}/reports/dashboard${qstr ? `?${qstr}` : ""}`, {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(r => { if (!r.ok) throw new Error("Không thể tải dữ liệu"); return r.json(); })
      .then(j => setData(j.data))
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [token, employeeId, groupId, filterMonth, filterYear, payrollPeriodIdParam, currentUser]);

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
  const meta = (d as any)?.meta;
  const periodLabelDash =
    meta?.filter === "payroll" && meta?.payroll_period_id != null
      ? `Kỳ lương #${meta.payroll_period_id}`
      : meta?.filter === "year" && meta?.year
        ? `Năm ${meta.year}`
        : meta?.month && meta?.year
          ? `Tháng ${meta.month}/${meta.year}`
          : "Tháng hiện tại";
  const showTodayKpi = meta?.show_today_kpi !== false;
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

      <div className="rounded-xl border border-border bg-card p-4 shadow-sm md:p-5 space-y-4">
        <div className="flex items-center gap-2 text-foreground">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-muted text-muted-foreground">
            <Filter className="h-4 w-4" />
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground">Lọc tổng quan</p>
            <p className="text-xs text-muted-foreground">
              {isAdmin ? "Admin: nhân viên, " : ""}nhóm bán hàng, kỳ (tháng/năm hoặc kỳ lương)
            </p>
          </div>
        </div>
        <div className="flex flex-col gap-4 lg:flex-row lg:flex-wrap lg:items-end">
          {isAdmin && (
            <div className="relative">
              <button
                type="button"
                onClick={() => {
                  setShowEmployeeMenu((v) => !v);
                  setEmployeeQuery("");
                }}
                className="flex items-center gap-2 h-10 px-3 bg-background border border-input hover:bg-accent/50 rounded-md text-sm font-medium text-foreground transition-colors min-w-[200px] justify-between"
                title="Lọc KPI theo nhân viên bán (salesperson)"
              >
                <span className="truncate">
                  {employeeId ? (employeeSelectedName || `NV #${employeeId}`) : "Tất cả nhân viên"}
                </span>
                <ChevronDown className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
              </button>

              {showEmployeeMenu && (
                <div className="absolute top-full left-0 mt-1 w-[18rem] bg-popover text-popover-foreground border border-border rounded-lg shadow-lg z-50 overflow-hidden">
                  <div className="p-2 border-b border-border">
                    <div className="relative">
                      <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                      <input
                        value={employeeQuery}
                        onChange={(e) => setEmployeeQuery(e.target.value)}
                        placeholder="Gõ tên/username/phone..."
                        className="w-full h-10 pl-9 pr-9 bg-background border border-input rounded-md text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                      />
                      <button
                        type="button"
                        onClick={() => setShowEmployeeMenu(false)}
                        className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded hover:bg-accent text-muted-foreground hover:text-foreground"
                        title="Đóng"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        patchDashParams({ employee: null });
                        setShowEmployeeMenu(false);
                      }}
                      className={cn(
                        "mt-2 w-full text-left px-3 py-2 rounded-lg text-sm transition-colors",
                        !employeeId ? "bg-accent text-accent-foreground font-semibold" : "hover:bg-accent/50 text-foreground"
                      )}
                    >
                      Tất cả nhân viên
                    </button>
                  </div>

                  <div className="max-h-72 overflow-auto">
                    {employeeLoading ? (
                      <div className="px-3 py-3 text-sm text-muted-foreground flex items-center gap-2">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Đang tải...
                      </div>
                    ) : employeeOptions.length === 0 ? (
                      <div className="px-3 py-3 text-sm text-muted-foreground">
                        Không tìm thấy nhân viên
                      </div>
                    ) : (
                      employeeOptions.map((emp: any) => (
                        <button
                          key={emp.id}
                          type="button"
                          onClick={() => {
                            patchDashParams({ employee: String(emp.id) });
                            setEmployeeSelectedName(String(emp.full_name || ""));
                            setShowEmployeeMenu(false);
                          }}
                          className={cn(
                            "w-full text-left px-3 py-2.5 text-sm hover:bg-accent/50 transition-colors",
                            String(employeeId) === String(emp.id) ? "bg-accent text-accent-foreground font-semibold" : "text-foreground"
                          )}
                        >
                          <div className="flex items-center justify-between gap-3">
                            <span className="truncate">{emp.full_name}</span>
                            <span className="shrink-0 text-xs text-muted-foreground">#{emp.id}</span>
                          </div>
                          {emp.username ? (
                            <div className="text-xs text-muted-foreground truncate mt-0.5">{emp.username}</div>
                          ) : null}
                        </button>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
          <label className="flex flex-col gap-1.5 min-w-[180px]">
            <span className="text-xs font-medium text-muted-foreground">Nhóm bán hàng</span>
            <select
              value={groupId}
              onChange={(e) => patchDashParams({ group_id: e.target.value || null })}
              className={dashSelectCls}
            >
              <option value="">Tất cả nhóm</option>
              {groups.map((g: any) => (
                <option key={g.id} value={String(g.id)}>{g.name}</option>
              ))}
            </select>
          </label>
          <div className="flex flex-col gap-1.5 min-w-0">
            <span className="text-xs font-medium text-muted-foreground">Cách lọc kỳ</span>
            <div className="flex flex-wrap items-center gap-2">
              <div className="inline-flex rounded-lg border border-border bg-muted/30 p-1">
                <button
                  type="button"
                  disabled={payrollPeriods.length === 0}
                  title={payrollPeriods.length === 0 ? "Chưa có kỳ lương trong shop" : undefined}
                  onClick={async () => {
                    let list = payrollPeriods;
                    if (!list.length) list = await fetchPayrollPeriodsList();
                    const first = list[0] ? String(list[0].id) : "";
                    if (!first) return;
                    patchDashParams({
                      payroll_period_id: first,
                      month: null,
                      year: null,
                    });
                  }}
                  className={cn(
                    "rounded-md px-3 py-2 text-xs font-semibold transition",
                    filterMode === "payroll" ? "bg-background text-foreground shadow-sm border border-border" : "text-muted-foreground hover:text-foreground",
                    payrollPeriods.length === 0 && "opacity-50 cursor-not-allowed"
                  )}
                >
                  Kỳ lương
                </button>
                <button
                  type="button"
                  onClick={() =>
                    patchDashParams({
                      payroll_period_id: null,
                      month: filterMonth || String(new Date().getMonth() + 1).padStart(2, "0"),
                      year: filterYear || String(new Date().getFullYear()),
                    })
                  }
                  className={cn(
                    "rounded-md px-3 py-2 text-xs font-semibold transition",
                    filterMode === "month" ? "bg-background text-foreground shadow-sm border border-border" : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  Tháng
                </button>
              </div>
              {filterMode === "payroll" ? (
                <>
                  <select
                    value={payrollPeriodIdParam}
                    onChange={(e) => {
                      patchDashParams({ payroll_period_id: e.target.value || null });
                    }}
                    className={cn(dashSelectCls, "min-w-[12rem]")}
                  >
                    {payrollPeriods.map((p: any) => (
                      <option key={p.id} value={String(p.id)}>
                        #{p.id} • {p.status === "open" ? "Đang mở" : "Đã chốt"} • {formatDate(p.from_at)}
                        {p.to_at ? ` → ${formatDate(p.to_at)}` : ""}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    title="Làm mới danh sách kỳ"
                    onClick={() => void fetchPayrollPeriodsList()}
                    className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-border bg-background text-muted-foreground hover:bg-accent transition-colors"
                  >
                    <RefreshCcw className="h-4 w-4" />
                  </button>
                </>
              ) : (
                <>
                  <select
                    value={filterMonth}
                    onChange={(e) => patchDashParams({ month: e.target.value })}
                    className={cn(dashSelectCls, "w-[130px]")}
                  >
                    <option value="all">Tất cả (cả năm)</option>
                    {Array.from({ length: 12 }, (_, i) => (
                      <option key={i + 1} value={String(i + 1).padStart(2, "0")}>
                        Tháng {i + 1}
                      </option>
                    ))}
                  </select>
                  <select
                    value={filterYear}
                    onChange={(e) => patchDashParams({ year: e.target.value })}
                    className={cn(dashSelectCls, "w-[100px]")}
                  >
                    {yearOptions.map((yy) => (
                      <option key={yy} value={yy}>{yy}</option>
                    ))}
                  </select>
                </>
              )}
            </div>
          </div>
        </div>
        {employeeId && isAdmin ? (
          <p className="text-xs text-muted-foreground">
            KPI theo nhân viên bán (salesperson): doanh thu, hoa hồng, hoàn, lương (ship/NV chịu), trạng thái đơn, top SP/KH, đơn gần đây.
          </p>
        ) : null}
      </div>

      {/* ───── ADMIN VIEW ───── */}
      {isAdmin && (
        <>
          {/* Stat cards hàng 1 */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Doanh thu tháng */}
            <div className="kpi-card kpi-card--revenue p-5 rounded-xl shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <div className="w-9 h-9 rounded-lg flex items-center justify-center kpi-icon kpi-icon--revenue">
                  <DollarSign className="w-4 h-4" />
                </div>
                {thisMonth.revenue_change != null ? <ChangeBadge pct={thisMonth.revenue_change} /> : null}
              </div>
              <p className="text-xs font-semibold uppercase tracking-wide kpi-title kpi-icon--revenue">Doanh thu — {periodLabelDash}</p>
              <p className="text-xl font-semibold mt-1 tabular-nums kpi-metric kpi-icon--revenue">{formatCurrency(thisMonth.revenue || 0)}</p>
              {showTodayKpi ? (
                <p className="text-xs text-muted-foreground mt-1">Hôm nay: {formatCurrency(today.revenue || 0)}</p>
              ) : null}
              <p className="text-[11px] text-muted-foreground mt-1 leading-snug">Tổng tạm tính (sau CK dòng), không gồm đơn hủy</p>
            </div>

            {/* Tổng đơn */}
            <div className="kpi-card kpi-card--orders p-5 rounded-xl shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <div className="w-9 h-9 rounded-lg flex items-center justify-center kpi-icon kpi-icon--orders">
                  <ShoppingCart className="w-4 h-4" />
                </div>
              </div>
              <p className="text-xs font-semibold uppercase tracking-wide kpi-title kpi-icon--orders">Đơn hàng — {periodLabelDash}</p>
              <p className="text-xl font-semibold mt-1 tabular-nums kpi-metric kpi-icon--orders">{thisMonth.total_orders || 0}</p>
              {showTodayKpi ? (
                <p className="text-xs text-muted-foreground mt-1">Hôm nay: {today.total_orders || 0} đơn</p>
              ) : null}
            </div>

            {/* Hoa hồng */}
            <div className="kpi-card kpi-card--commission p-5 rounded-xl shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <div className="w-9 h-9 rounded-lg flex items-center justify-center kpi-icon kpi-icon--commission">
                  <TrendingUp className="w-4 h-4" />
                </div>
              </div>
              <p className="text-xs font-semibold uppercase tracking-wide kpi-title kpi-icon--commission">Tổng hoa hồng — {periodLabelDash}</p>
              <p className="text-xl font-semibold mt-1 tabular-nums kpi-metric kpi-icon--commission">{formatCurrency(commission.total || 0)}</p>
              <p className="text-xs text-muted-foreground mt-1">CTV: {formatCurrency(commission.override || 0)}</p>
            </div>

            {/* Khách hàng */}
            <div className="kpi-card kpi-card--customers p-5 rounded-xl shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <div className="w-9 h-9 rounded-lg flex items-center justify-center kpi-icon kpi-icon--customers">
                  <Users className="w-4 h-4" />
                </div>
              </div>
              <p className="text-xs font-semibold uppercase tracking-wide kpi-title kpi-icon--customers">Khách hàng</p>
              <p className="text-xl font-semibold mt-1 tabular-nums kpi-metric kpi-icon--customers">{(customers.total || 0).toLocaleString()}</p>
              <p className="text-xs text-muted-foreground mt-1">Mới trong kỳ: +{customers.new || 0}</p>
            </div>
          </div>

          {/* Return KPIs */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="kpi-card kpi-card--returns p-5 rounded-xl shadow-sm">
              <div className="w-9 h-9 rounded-lg flex items-center justify-center mb-3 kpi-icon kpi-icon--returns">
                <TrendingDown className="w-4 h-4" />
              </div>
              <p className="text-xs font-semibold uppercase tracking-wide kpi-title kpi-icon--returns">Tổng doanh số hoàn</p>
              <p className="text-xl font-semibold mt-1 tabular-nums kpi-metric kpi-icon--returns">{formatCurrency(-(thisMonth.return_revenue || 0))}</p>
              {showTodayKpi ? (
                <p className="text-xs text-muted-foreground mt-1">Hôm nay: {formatCurrency(-(today.return_revenue || 0))}</p>
              ) : null}
            </div>
            <div className="kpi-card kpi-card--return-commission p-5 rounded-xl shadow-sm">
              <div className="w-9 h-9 rounded-lg flex items-center justify-center mb-3 kpi-icon kpi-icon--return-commission">
                <TrendingDown className="w-4 h-4" />
              </div>
              <p className="text-xs font-semibold uppercase tracking-wide kpi-title kpi-icon--return-commission">HH hoàn (Sale)</p>
              <p className="text-xl font-semibold mt-1 tabular-nums kpi-metric kpi-icon--return-commission">{formatCurrency(-Math.abs(thisMonth.return_commission_direct || 0))}</p>
              {showTodayKpi ? (
                <p className="text-xs text-muted-foreground mt-1">Hôm nay: {formatCurrency(-Math.abs(today.return_commission_direct || 0))}</p>
              ) : null}
            </div>
            <div className="kpi-card kpi-card--return-commission p-5 rounded-xl shadow-sm">
              <div className="w-9 h-9 rounded-lg flex items-center justify-center mb-3 kpi-icon kpi-icon--return-commission">
                <TrendingDown className="w-4 h-4" />
              </div>
              <p className="text-xs font-semibold uppercase tracking-wide kpi-title kpi-icon--return-commission">HH hoàn (Quản lý)</p>
              <p className="text-xl font-semibold mt-1 tabular-nums kpi-metric kpi-icon--return-commission">{formatCurrency(-Math.abs(thisMonth.return_commission_override || 0))}</p>
              {showTodayKpi ? (
                <p className="text-xs text-muted-foreground mt-1">Hôm nay: {formatCurrency(-Math.abs(today.return_commission_override || 0))}</p>
              ) : null}
            </div>
            <div className="kpi-card kpi-card--returns p-5 rounded-xl shadow-sm">
              <div className="w-9 h-9 rounded-lg flex items-center justify-center mb-3 kpi-icon kpi-icon--returns">
                <ShoppingCart className="w-4 h-4" />
              </div>
              <p className="text-xs font-semibold uppercase tracking-wide kpi-title kpi-icon--returns">Tổng đơn hoàn</p>
              <p className="text-xl font-semibold mt-1 tabular-nums kpi-metric kpi-icon--returns">{thisMonth.return_orders || 0}</p>
              {showTodayKpi ? (
                <p className="text-xs text-muted-foreground mt-1">Hôm nay: {today.return_orders || 0} đơn</p>
              ) : null}
            </div>
          </div>

          {/* Lương / ship / NV chịu — cùng lưới 2 cột mobile như hàng KPI */}
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="kpi-card kpi-card--ship p-5 rounded-xl shadow-sm">
              <div className="w-9 h-9 rounded-lg flex items-center justify-center mb-3 kpi-icon kpi-icon--ship">
                <Truck className="w-4 h-4" />
              </div>
              <p className="text-xs font-semibold uppercase tracking-wide kpi-title kpi-icon--ship">Ship KH Trả</p>
              <p className="text-xl font-semibold mt-1 tabular-nums kpi-metric kpi-icon--ship">{formatCurrency(luongMonth.total_khach_ship || 0)}</p>
              <p className="text-xs text-muted-foreground mt-0.5">Trong kỳ (theo đơn)</p>
            </div>
            <div className="kpi-card kpi-card--absorbed p-5 rounded-xl shadow-sm">
              <div className="w-9 h-9 rounded-lg flex items-center justify-center mb-3 kpi-icon kpi-icon--absorbed">
                <CircleDollarSign className="w-4 h-4" />
              </div>
              <p className="text-xs font-semibold uppercase tracking-wide kpi-title kpi-icon--absorbed">Tiền NV chịu</p>
              <p className="text-xl font-semibold mt-1 tabular-nums kpi-metric kpi-icon--absorbed">{formatCurrency(luongMonth.total_nv_chiu || 0)}</p>
              <p className="text-xs text-muted-foreground mt-0.5">Trong kỳ (theo đơn)</p>
            </div>
            <div className="col-span-2 lg:col-span-1 kpi-card kpi-card--salary p-5 rounded-xl shadow-sm">
              <div className="w-9 h-9 rounded-lg flex items-center justify-center mb-3 kpi-icon kpi-icon--salary">
                <Wallet className="w-4 h-4" />
              </div>
              <p className="text-xs font-semibold uppercase tracking-wide kpi-title kpi-icon--salary">Tổng lương</p>
              <p className="text-xl font-semibold mt-1 tabular-nums kpi-metric kpi-icon--salary">{formatCurrency(luongMonth.total_luong || 0)}</p>
              <p className="text-xs text-muted-foreground mt-0.5">Tổng HH + Ship KH Trả − tiền NV chịu</p>
            </div>
          </div>

          {/* Trạng thái đơn trong kỳ */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {Object.entries(STATUS_CFG).map(([key, cfg]) => (
              <div key={key} className={cn("p-4 rounded-xl flex items-center gap-3", key === "cancelled" ? cfg.cls : cn("kpi-status", cfg.cls))}>
                <cfg.icon className={cn("w-5 h-5 flex-shrink-0", key === "cancelled" ? "text-destructive" : "kpi-status__icon")} />
                <div>
                  <p className={cn("text-xs font-semibold", key === "cancelled" ? "text-destructive" : "kpi-status__label")}>{cfg.label}</p>
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
                <h2 className="text-sm font-semibold text-foreground">Top nhân viên — {periodLabelDash}</h2>
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
                        <td className="px-5 py-3 text-right font-semibold kpi-text-success tabular-nums">
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
              <h2 className="text-sm font-semibold text-foreground">Top khách hàng — {periodLabelDash}</h2>
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
              <h2 className="text-sm font-semibold text-foreground">Top sản phẩm — {periodLabelDash}</h2>
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
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={C.grid} />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: C.muted, fontSize: 11 }} dy={6} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fill: C.muted, fontSize: 11 }}
                      tickFormatter={(v) => v >= 1e6 ? `${(v/1e6).toFixed(1)}M` : v >= 1e3 ? `${(v/1e3).toFixed(0)}K` : v} />
                    <Tooltip formatter={(v: number) => [formatCurrency(v), "Doanh thu"]}
                      contentStyle={{ borderRadius: 12, border: "none", boxShadow: "0 4px 20px rgb(0 0 0 / 0.10)" }} />
                    <Bar dataKey="revenue" radius={[6, 6, 0, 0]}>
                      {topProducts.map((_: any, i: number) => (
                        <Cell
                          key={i}
                          fill={i === 0 ? C.primary : i === 1 ? C.primary80 : i === 2 ? C.primary55 : C.primary55}
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
            <div className="kpi-card kpi-card--revenue p-5 rounded-xl shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <div className="w-9 h-9 rounded-lg flex items-center justify-center kpi-icon kpi-icon--revenue">
                  <DollarSign className="w-4 h-4" />
                </div>
                {thisMonth.revenue_change != null ? <ChangeBadge pct={thisMonth.revenue_change} /> : null}
              </div>
              <p className="text-xs font-semibold uppercase tracking-wide kpi-title kpi-icon--revenue">Doanh thu — {periodLabelDash}</p>
              <p className="text-xl font-semibold mt-1 tabular-nums kpi-metric kpi-icon--revenue">{formatCurrency(thisMonth.revenue || 0)}</p>
              {showTodayKpi ? (
                <p className="text-xs text-muted-foreground mt-1">Hôm nay: {formatCurrency(today.revenue || 0)}</p>
              ) : null}
              <p className="text-[11px] text-muted-foreground mt-1 leading-snug">Tổng tạm tính (sau CK dòng), không gồm đơn hủy</p>
            </div>

            <div className="kpi-card kpi-card--commission-direct p-5 rounded-xl shadow-sm">
              <div className="w-9 h-9 rounded-lg flex items-center justify-center mb-3 kpi-icon kpi-icon--commission-direct">
                <TrendingUp className="w-4 h-4" />
              </div>
              <p className="text-xs font-semibold uppercase tracking-wide kpi-title kpi-icon--commission-direct">HH bán hàng</p>
              <p className="text-xl font-semibold mt-1 tabular-nums kpi-metric kpi-icon--commission-direct">{formatCurrency(commission.direct || 0)}</p>
              <p className="text-xs text-muted-foreground mt-1">Từ đơn tự bán</p>
            </div>

            <div className="kpi-card kpi-card--commission p-5 rounded-xl shadow-sm">
              <div className="w-9 h-9 rounded-lg flex items-center justify-center mb-3 kpi-icon kpi-icon--commission">
                <Users className="w-4 h-4" />
              </div>
              <p className="text-xs font-semibold uppercase tracking-wide kpi-title kpi-icon--commission">HH từ CTV</p>
              <p className="text-xl font-semibold mt-1 tabular-nums kpi-metric kpi-icon--commission">{formatCurrency(commission.override || 0)}</p>
              <p className="text-xs text-muted-foreground mt-1 leading-snug" title="Override cho quản lý khi CTV lên đơn ghi nhận quản lý. Nếu bạn chỉ là CTV, thường = 0; HH của bạn nằm ở «HH bán hàng».">
                Tổng HH: {formatCurrency(commission.total || 0)}
              </p>
            </div>

            <div className="kpi-card kpi-card--orders p-5 rounded-xl shadow-sm">
              <div className="w-9 h-9 rounded-lg flex items-center justify-center mb-3 kpi-icon kpi-icon--orders">
                <ShoppingCart className="w-4 h-4" />
              </div>
              <p className="text-xs font-semibold uppercase tracking-wide kpi-title kpi-icon--orders">Đơn hàng — {periodLabelDash}</p>
              <p className="text-xl font-semibold mt-1 tabular-nums kpi-metric kpi-icon--orders">{thisMonth.total_orders || 0}</p>
              {showTodayKpi ? (
                <p className="text-xs text-muted-foreground mt-1">Hôm nay: {today.total_orders || 0} đơn</p>
              ) : null}
            </div>
          </div>

          {/* Return KPIs */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="kpi-card kpi-card--returns p-5 rounded-xl shadow-sm">
              <div className="w-9 h-9 rounded-lg flex items-center justify-center mb-3 kpi-icon kpi-icon--returns">
                <TrendingDown className="w-4 h-4" />
              </div>
              <p className="text-xs font-semibold uppercase tracking-wide kpi-title kpi-icon--returns">Tổng doanh số hoàn</p>
              <p className="text-xl font-semibold mt-1 tabular-nums kpi-metric kpi-icon--returns">{formatCurrency(-(thisMonth.return_revenue || 0))}</p>
              {showTodayKpi ? (
                <p className="text-xs text-muted-foreground mt-1">Hôm nay: {formatCurrency(-(today.return_revenue || 0))}</p>
              ) : null}
            </div>
            <div className="kpi-card kpi-card--return-commission p-5 rounded-xl shadow-sm">
              <div className="w-9 h-9 rounded-lg flex items-center justify-center mb-3 kpi-icon kpi-icon--return-commission">
                <TrendingDown className="w-4 h-4" />
              </div>
              <p className="text-xs font-semibold uppercase tracking-wide kpi-title kpi-icon--return-commission">HH hoàn (Sale)</p>
              <p className="text-xl font-semibold mt-1 tabular-nums kpi-metric kpi-icon--return-commission">{formatCurrency(-Math.abs(thisMonth.return_commission_direct || 0))}</p>
              {showTodayKpi ? (
                <p className="text-xs text-muted-foreground mt-1">Hôm nay: {formatCurrency(-Math.abs(today.return_commission_direct || 0))}</p>
              ) : null}
            </div>
            <div className="kpi-card kpi-card--return-commission p-5 rounded-xl shadow-sm">
              <div className="w-9 h-9 rounded-lg flex items-center justify-center mb-3 kpi-icon kpi-icon--return-commission">
                <TrendingDown className="w-4 h-4" />
              </div>
              <p className="text-xs font-semibold uppercase tracking-wide kpi-title kpi-icon--return-commission">HH hoàn (Quản lý)</p>
              <p className="text-xl font-semibold mt-1 tabular-nums kpi-metric kpi-icon--return-commission">{formatCurrency(-Math.abs(thisMonth.return_commission_override || 0))}</p>
              {showTodayKpi ? (
                <p className="text-xs text-muted-foreground mt-1">Hôm nay: {formatCurrency(-Math.abs(today.return_commission_override || 0))}</p>
              ) : null}
            </div>
            <div className="kpi-card kpi-card--returns p-5 rounded-xl shadow-sm">
              <div className="w-9 h-9 rounded-lg flex items-center justify-center mb-3 kpi-icon kpi-icon--returns">
                <ShoppingCart className="w-4 h-4" />
              </div>
              <p className="text-xs font-semibold uppercase tracking-wide kpi-title kpi-icon--returns">Tổng đơn hoàn</p>
              <p className="text-xl font-semibold mt-1 tabular-nums kpi-metric kpi-icon--returns">{thisMonth.return_orders || 0}</p>
              {showTodayKpi ? (
                <p className="text-xs text-muted-foreground mt-1">Hôm nay: {today.return_orders || 0} đơn</p>
              ) : null}
            </div>
          </div>

          {/* Lương / ship / NV — cùng lưới 2 cột mobile như hàng KPI */}
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="kpi-card kpi-card--ship p-5 rounded-xl shadow-sm">
              <div className="w-9 h-9 rounded-lg flex items-center justify-center mb-3 kpi-icon kpi-icon--ship">
                <Truck className="w-4 h-4" />
              </div>
              <p className="text-xs font-semibold uppercase tracking-wide kpi-title kpi-icon--ship">Ship KH Trả</p>
              <p className="text-xl font-semibold mt-1 tabular-nums kpi-metric kpi-icon--ship">{formatCurrency(luongMonth.total_khach_ship || 0)}</p>
              <p className="text-xs text-muted-foreground mt-0.5">Đơn bạn phụ trách — trong kỳ</p>
            </div>
            <div className="kpi-card kpi-card--absorbed p-5 rounded-xl shadow-sm">
              <div className="w-9 h-9 rounded-lg flex items-center justify-center mb-3 kpi-icon kpi-icon--absorbed">
                <CircleDollarSign className="w-4 h-4" />
              </div>
              <p className="text-xs font-semibold uppercase tracking-wide kpi-title kpi-icon--absorbed">Tiền NV chịu</p>
              <p className="text-xl font-semibold mt-1 tabular-nums kpi-metric kpi-icon--absorbed">{formatCurrency(luongMonth.total_nv_chiu || 0)}</p>
              <p className="text-xs text-muted-foreground mt-0.5">Đơn bạn phụ trách — trong kỳ</p>
            </div>
            <div className="col-span-2 lg:col-span-1 kpi-card kpi-card--salary p-5 rounded-xl shadow-sm">
              <div className="w-9 h-9 rounded-lg flex items-center justify-center mb-3 kpi-icon kpi-icon--salary">
                <Wallet className="w-4 h-4" />
              </div>
              <p className="text-xs font-semibold uppercase tracking-wide kpi-title kpi-icon--salary">Tổng lương</p>
              <p className="text-xl font-semibold mt-1 tabular-nums kpi-metric kpi-icon--salary">{formatCurrency(luongMonth.total_luong || 0)}</p>
              <p className="text-xs text-muted-foreground mt-0.5">Tổng HH + Ship KH Trả − tiền NV chịu</p>
            </div>
          </div>

          {/* Trạng thái đơn */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {Object.entries(STATUS_CFG).map(([key, cfg]) => (
              <div
                key={key}
                className={cn(
                  "p-4 rounded-2xl flex items-center gap-3",
                  key === "cancelled" ? cfg.cls : cn("kpi-status", cfg.cls)
                )}
              >
                <cfg.icon className={cn("w-5 h-5 flex-shrink-0", key === "cancelled" ? "text-destructive" : "kpi-status__icon")} />
                <div>
                  <p className={cn("text-xs font-semibold", key === "cancelled" ? "text-destructive" : "kpi-status__label")}>{cfg.label}</p>
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
                <h2 className="text-sm font-semibold text-foreground">Top sản phẩm — {periodLabelDash}</h2>
              </div>
              {topProducts.length === 0 ? (
                <div className="py-10 text-center text-muted-foreground text-sm">Chưa có dữ liệu</div>
              ) : (
                <div className="p-5">
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={topProducts} barSize={32}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={C.grid} />
                      <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: C.muted, fontSize: 11 }} dy={6} />
                      <YAxis axisLine={false} tickLine={false} tick={{ fill: C.muted, fontSize: 11 }}
                        tickFormatter={(v) => v >= 1e6 ? `${(v/1e6).toFixed(1)}M` : v >= 1e3 ? `${(v/1e3).toFixed(0)}K` : v} />
                      <Tooltip formatter={(v: number) => [formatCurrency(v), "Doanh thu"]}
                        contentStyle={{ borderRadius: 12, border: "none", boxShadow: "0 4px 20px rgb(0 0 0 / 0.10)" }} />
                      <Bar dataKey="revenue" radius={[6, 6, 0, 0]}>
                        {topProducts.map((_: any, i: number) => (
                          <Cell
                            key={i}
                            fill={i === 0 ? C.primary : i === 1 ? C.primary80 : C.primary55}
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
              <h2 className="text-sm font-semibold text-foreground">Top khách hàng — {periodLabelDash}</h2>
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
