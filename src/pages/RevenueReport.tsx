import * as React from "react";
import { Link } from "react-router-dom";
import {
  TrendingUp,
  Users,
  DollarSign,
  Download,
  Loader2,
  AlertCircle,
  ChevronRight,
  ShoppingCart,
  BarChart3,
  CalendarRange,
  Filter,
  RefreshCcw,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import { formatCurrency, cn, formatDate } from "../lib/utils";
import { exportRevenueReport } from "../lib/exportExcel";
const API_URL =
  (import.meta as any)?.env?.VITE_API_URL ||
  "/api";

const selectCls =
  "min-h-[44px] rounded-md border border-input bg-background px-3 py-2.5 text-sm font-semibold text-foreground shadow-sm outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background";

function rankStyle(i: number) {
  if (i === 0) return "bg-amber-100 text-amber-800 ring-1 ring-amber-200";
  if (i === 1) return "bg-muted text-muted-foreground ring-1 ring-border";
  if (i === 2) return "bg-orange-100 text-orange-800 ring-1 ring-orange-200";
  return "bg-muted/30 text-muted-foreground";
}

export function RevenueReport() {
  const [loading, setLoading] = React.useState(true);
  const [exporting, setExporting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [salesData, setSalesData] = React.useState<any[]>([]);
  const [summary, setSummary] = React.useState<any>(null);
  const [month, setMonth] = React.useState(String(new Date().getMonth() + 1).padStart(2, "0"));
  const [year, setYear] = React.useState(String(new Date().getFullYear()));
  const [groupId, setGroupId] = React.useState("");
  const [groups, setGroups] = React.useState<any[]>([]);
  const [token, setToken] = React.useState<string>(() => localStorage.getItem("token") || "");
  const [filterMode, setFilterMode] = React.useState<"payroll" | "month">("month");
  const [payrollPeriods, setPayrollPeriods] = React.useState<any[]>([]);
  const [payrollPeriodId, setPayrollPeriodId] = React.useState<string>("");
  const [periodTouched, setPeriodTouched] = React.useState(false);

  const yearOptions = React.useMemo(() => {
    const y = new Date().getFullYear();
    return Array.from({ length: y - 2019 + 2 }, (_, i) => String(2020 + i));
  }, []);

  React.useEffect(() => {
    const fetchGroups = async () => {
      try {
        const res = await fetch(`${API_URL}/groups`, { headers: { Authorization: `Bearer ${token}` } });
        if (res.ok) {
          const json = await res.json();
          setGroups(json.data || []);
        }
      } catch (err) {
        console.error("Failed to fetch groups", err);
      }
    };
    fetchGroups();
  }, [token]);

  // Sync token after switch-shop/login/logout
  React.useEffect(() => {
    const sync = () => setToken(localStorage.getItem("token") || "");
    sync();
    window.addEventListener("auth-change", sync as any);
    window.addEventListener("storage", sync as any);
    return () => {
      window.removeEventListener("auth-change", sync as any);
      window.removeEventListener("storage", sync as any);
    };
  }, []);

  const fetchPayrollPeriods = React.useCallback(async (): Promise<string | null> => {
    try {
      const t = localStorage.getItem("token") || "";
      const [curRes, listRes] = await Promise.all([
        fetch(`${API_URL}/payroll/periods/current`, { headers: { Authorization: `Bearer ${t}` } }),
        fetch(`${API_URL}/payroll/periods`, { headers: { Authorization: `Bearer ${t}` } }),
      ]);
      if (!curRes.ok || !listRes.ok) return null;
      const curJ = await curRes.json();
      const listJ = await listRes.json();
      const cur = curJ?.data;
      const list = listJ?.data || [];
      const openId = cur?.id != null ? String(cur.id) : "";
      const ids = new Set(list.map((p: any) => String(p.id)));
      const openExists = Boolean(openId && ids.has(openId));
      setPayrollPeriods(list);
      let nextId = payrollPeriodId;
      if (!nextId || !ids.has(nextId)) {
        nextId = openExists ? openId : list[0] ? String(list[0].id) : "";
      }
      if (!periodTouched && openExists) nextId = openId;
      setPayrollPeriodId(nextId);
      return nextId || null;
    } catch {
      return null;
    }
  }, [payrollPeriodId, periodTouched]);

  const fetchReport = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      if (!token) throw new Error("Phiên đăng nhập hết hạn. Vui lòng đăng nhập lại.");
      const params = new URLSearchParams();
      if (filterMode === "payroll") {
        const pid = await fetchPayrollPeriods();
        if (!pid) throw new Error("Chưa có kỳ lương để lọc.");
        params.set("payroll_period_id", pid);
      } else {
        params.set("month", month);
        params.set("year", year);
      }
      if (groupId) params.set("group_id", groupId);
      const res = await fetch(`${API_URL}/reports/revenue?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j?.error || "Không thể tải báo cáo");
      }
      const json = await res.json();
      setSalesData(json.data.salesData || []);
      setSummary(json.data.summary || {});
    } catch (err: any) {
      setError(err.message || "Đã xảy ra lỗi");
    } finally {
      setLoading(false);
    }
  }, [month, year, groupId, token, filterMode, fetchPayrollPeriods]);

  React.useEffect(() => {
    fetchReport();
  }, [fetchReport]);

  const performanceData = React.useMemo(() => {
    return [...salesData]
      .filter((s) => (s.total_sales || 0) > 0)
      .sort((a, b) => b.total_sales - a.total_sales)
      .slice(0, 12)
      .map((s) => ({
        ...s,
        label: s.full_name?.length > 18 ? `${s.full_name.slice(0, 16)}…` : s.full_name,
      }));
  }, [salesData]);

  const sortedRows = React.useMemo(
    () => [...salesData].sort((a, b) => (b.total_sales || 0) - (a.total_sales || 0)),
    [salesData]
  );

  /** Chiều cao biểu đồ ngang: bám theo số dòng — tránh khoảng trống khổng lồ khi ít NV */
  const rankChartHeight = React.useMemo(() => {
    const n = performanceData.length;
    if (n === 0) return 160;
    const perRow = 32;
    const verticalPad = 40;
    return Math.min(460, Math.max(120, n * perRow + verticalPad));
  }, [performanceData.length]);

  const totalOrders = React.useMemo(
    () => sortedRows.reduce((acc, s) => acc + (s.total_orders || 0), 0),
    [sortedRows]
  );

  const groupName = groups.find((g) => String(g.id) === groupId)?.name;

  const periodLabel = React.useMemo(() => {
    if (filterMode === "payroll" && payrollPeriodId) {
      const p = payrollPeriods.find((x: any) => String(x.id) === String(payrollPeriodId));
      if (p) {
        return `Kỳ #${p.id} (${p.status === "open" ? "đang mở" : "đã chốt"}) ${formatDate(p.from_at)}${
          p.to_at ? ` → ${formatDate(p.to_at)}` : ""
        }`;
      }
      return `Kỳ lương #${payrollPeriodId}`;
    }
    return `Tháng ${parseInt(month, 10)}/${year}`;
  }, [filterMode, payrollPeriodId, payrollPeriods, month, year]);

  const exportPeriodDescription =
    filterMode === "payroll" && payrollPeriodId
      ? `${periodLabel}${groupName ? ` — Nhóm: ${groupName}` : ""}`
      : undefined;

  const handleExport = () => {
    setExporting(true);
    try {
      exportRevenueReport({
        salesData,
        summary: summary || {},
        month,
        year,
        groupName,
        periodDescription: exportPeriodDescription,
        payrollPeriodId: filterMode === "payroll" && payrollPeriodId ? payrollPeriodId : undefined,
      });
    } finally {
      setExporting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center gap-3">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">Đang tải báo cáo doanh thu…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10">
          <AlertCircle className="h-8 w-8 text-destructive" />
        </div>
        <p className="text-lg font-semibold text-foreground">{error}</p>
        <button
          type="button"
          onClick={fetchReport}
          className="h-10 rounded-md bg-primary px-6 text-sm font-semibold text-primary-foreground shadow-sm transition-opacity hover:opacity-95"
        >
          Thử lại
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-8">
      {/* Tiêu đề — cùng nhịp với Dashboard */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <nav className="mb-2 flex flex-wrap items-center gap-1 text-xs text-muted-foreground">
            <Link to="/" className="transition-colors hover:text-primary">
              Trang chủ
            </Link>
            <ChevronRight className="h-3 w-3 text-muted-foreground" />
            <span className="font-medium text-foreground">Doanh thu</span>
          </nav>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">Báo cáo doanh thu</h1>
          <p className="mt-1 max-w-2xl text-sm leading-relaxed text-muted-foreground">
            Doanh số và hoa hồng theo nhân viên — lọc theo tháng/năm hoặc kỳ lương (đơn bán theo kỳ đã gán trên đơn; giá trị hoàn theo ngày tạo đơn hoàn trong kỳ).
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2 rounded-xl border border-border bg-card px-4 py-3 shadow-sm">
          <CalendarRange className="h-5 w-5 text-primary" />
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Kỳ</p>
            <p className="text-sm font-semibold text-foreground">{periodLabel}</p>
          </div>
        </div>
      </div>

      {/* Bộ lọc — một khối gọn */}
      <div className="rounded-xl border border-border bg-card p-4 shadow-sm md:p-5">
        <div className="mb-4 flex items-center gap-2 text-foreground">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-muted text-muted-foreground">
            <Filter className="h-4 w-4" />
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground">Lọc báo cáo</p>
            <p className="text-xs text-muted-foreground">Chọn nhóm và kỳ (tháng/năm hoặc kỳ lương)</p>
          </div>
        </div>
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="grid w-full grid-cols-1 gap-3 sm:grid-cols-2 lg:flex lg:flex-1 lg:flex-wrap lg:gap-3">
            <label className="flex min-w-0 flex-col gap-1.5 lg:min-w-[200px]">
              <span className="text-xs font-medium text-muted-foreground">Nhóm bán hàng</span>
              <select value={groupId} onChange={(e) => setGroupId(e.target.value)} className={selectCls}>
                <option value="">Tất cả nhóm</option>
                {groups.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.name}
                  </option>
                ))}
              </select>
            </label>
            <div className="flex min-w-0 flex-col gap-1.5">
              <span className="text-xs font-medium text-muted-foreground">Cách lọc kỳ</span>
              <div className="flex flex-wrap items-center gap-2">
                <div className="inline-flex rounded-xl border border-border bg-muted/30 p-1">
                  <button
                    type="button"
                    onClick={() => setFilterMode("payroll")}
                    className={cn(
                      "rounded-lg px-3 py-2 text-xs font-semibold transition",
                      filterMode === "payroll"
                        ? "bg-background text-foreground shadow-sm border border-border"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    Kỳ lương
                  </button>
                  <button
                    type="button"
                    onClick={() => setFilterMode("month")}
                    className={cn(
                      "rounded-lg px-3 py-2 text-xs font-semibold transition",
                      filterMode === "month"
                        ? "bg-background text-foreground shadow-sm border border-border"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    Tháng
                  </button>
                </div>
                {filterMode === "payroll" ? (
                  <>
                    <select
                      value={payrollPeriodId}
                      onChange={(e) => {
                        setPeriodTouched(true);
                        setPayrollPeriodId(e.target.value);
                      }}
                      className={cn(selectCls, "min-w-[12rem] flex-1")}
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
                      onClick={() => void fetchPayrollPeriods()}
                      className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-border bg-background text-muted-foreground hover:bg-accent transition-colors"
                    >
                      <RefreshCcw className="h-4 w-4" />
                    </button>
                  </>
                ) : (
                  <>
                    <label className="flex min-w-0 flex-col gap-1 lg:w-[140px]">
                      <span className="sr-only">Tháng</span>
                      <select value={month} onChange={(e) => setMonth(e.target.value)} className={selectCls}>
                        {Array.from({ length: 12 }, (_, i) => (
                          <option key={i + 1} value={String(i + 1).padStart(2, "0")}>
                            Tháng {i + 1}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="flex min-w-0 flex-col gap-1 lg:w-[120px]">
                      <span className="sr-only">Năm</span>
                      <select value={year} onChange={(e) => setYear(e.target.value)} className={selectCls}>
                        {yearOptions.map((y) => (
                          <option key={y} value={y}>
                            {y}
                          </option>
                        ))}
                      </select>
                    </label>
                  </>
                )}
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={handleExport}
            disabled={exporting || salesData.length === 0}
            className={cn(
              "inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-xl px-5 text-sm font-semibold text-primary-foreground shadow-sm transition",
              "bg-primary hover:opacity-95 transition-opacity disabled:cursor-not-allowed disabled:opacity-50"
            )}
          >
            {exporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
            Xuất Excel
          </button>
        </div>
      </div>

      {/* KPI — giống Dashboard: icon tròn + số rõ */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4">
        <div className="rounded-xl border border-border bg-card p-4 shadow-sm md:p-5">
          <div className="mb-3 flex items-center justify-between">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-muted text-primary">
              <TrendingUp className="h-5 w-5" />
            </div>
          </div>
          <p className="text-xs font-medium text-muted-foreground">Tổng doanh số</p>
          <p className="mt-1 truncate text-lg font-semibold tabular-nums text-foreground md:text-xl">
            {formatCurrency(summary?.totalSales || 0)}
          </p>
        </div>

        <div className="rounded-xl border border-border bg-card p-4 shadow-sm md:p-5">
          <div className="mb-3 flex items-center justify-between">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-muted text-primary">
              <ShoppingCart className="h-5 w-5" />
            </div>
          </div>
          <p className="text-xs font-medium text-muted-foreground">Tổng đơn hàng</p>
          <p className="mt-1 text-lg font-semibold tabular-nums text-foreground md:text-xl">{totalOrders}</p>
        </div>

        <div className="rounded-xl border border-border bg-card p-4 shadow-sm md:p-5">
          <div className="mb-3 flex items-center justify-between">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-muted text-primary">
              <Users className="h-5 w-5" />
            </div>
          </div>
          <p className="text-xs font-medium text-muted-foreground">Nhân viên (Sales)</p>
          <p className="mt-1 text-lg font-semibold tabular-nums text-foreground md:text-xl">{summary?.totalEmployees ?? 0}</p>
        </div>
      </div>

      {sortedRows.length > 0 && (
        <div className="space-y-6">
          {/* Biểu đồ full width — dễ đọc hơn */}
            <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
              <div className="border-b border-border bg-muted/30 px-5 py-4 md:px-6">
              <div className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5 text-primary" />
                <div>
                    <h2 className="text-base font-semibold text-foreground">Xếp hạng doanh số</h2>
                    <p className="text-xs text-muted-foreground">Tối đa 12 nhân viên có doanh số trong kỳ</p>
                </div>
              </div>
            </div>
            <div className="p-4 md:p-6">
              <div className="w-full" style={{ height: rankChartHeight }}>
                {performanceData.length === 0 ? (
                  <div className="flex h-full min-h-[140px] items-center justify-center rounded-xl border border-dashed border-border bg-muted/30 text-sm text-muted-foreground">
                    Không có doanh số để hiển thị biểu đồ
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={performanceData}
                      layout="vertical"
                      margin={{ left: 0, right: 16, top: 4, bottom: 4 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" horizontal vertical={false} stroke="hsl(var(--border))" />
                      <XAxis type="number" hide />
                      <YAxis
                        dataKey="label"
                        type="category"
                        width={112}
                        axisLine={false}
                        tickLine={false}
                        tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
                        interval={0}
                      />
                      <Tooltip
                        cursor={{ fill: "hsl(var(--primary) / 0.06)" }}
                        contentStyle={{
                          borderRadius: "12px",
                          border: "1px solid hsl(var(--border))",
                          boxShadow: "0 10px 15px -3px rgb(0 0 0 / 0.08)",
                        }}
                        formatter={(value: number) => [formatCurrency(value), "Doanh số"]}
                        labelFormatter={(_, payload) => {
                          const p = payload?.[0]?.payload;
                          return p?.full_name || "";
                        }}
                      />
                      <Bar
                        dataKey="total_sales"
                        radius={[0, 6, 6, 0]}
                        barSize={14}
                        maxBarSize={18}
                        barCategoryGap="4%"
                      >
                        {performanceData.map((_, index) => (
                          <Cell
                            key={`c-${index}`}
                            fill={
                              index === 0
                                ? "hsl(var(--primary))"
                                : index < 3
                                  ? "hsl(var(--primary) / 0.85)"
                                  : "hsl(var(--muted-foreground) / 0.55)"
                            }
                          />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>
          </div>

          {/* Bảng chi tiết */}
          <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
            <div className="border-b border-border bg-muted/30 px-5 py-4 md:px-6">
              <h2 className="text-base font-semibold text-foreground">Chi tiết theo nhân viên</h2>
              <p className="mt-0.5 text-xs text-muted-foreground">Bấm tên để mở hồ sơ nhân viên</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] border-collapse text-left text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="whitespace-nowrap px-4 py-3.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      #
                    </th>
                    <th className="px-4 py-3.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Nhân viên</th>
                    <th className="whitespace-nowrap px-4 py-3.5 text-center text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      Đơn
                    </th>
                    <th className="whitespace-nowrap px-4 py-3.5 text-right text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      Doanh số
                    </th>
                    <th className="whitespace-nowrap px-4 py-3.5 text-right text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      Hoa hồng
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {sortedRows.map((item, idx) => {
                    const totalHh =
                      item.total_all_commission != null
                        ? item.total_all_commission
                        : (item.total_commission || 0) + (item.override_commission || 0);
                    return (
                      <tr key={item.id} className="transition-colors hover:bg-muted/30">
                        <td className="px-4 py-3.5">
                          <span
                            className={cn(
                              "inline-flex h-7 min-w-[1.75rem] items-center justify-center rounded-lg text-xs font-bold",
                              rankStyle(idx)
                            )}
                          >
                            {idx + 1}
                          </span>
                        </td>
                        <td className="px-4 py-3.5">
                          <Link
                            to={`/employees/${item.id}`}
                            className="font-semibold text-foreground transition-colors hover:text-primary"
                          >
                            {item.full_name}
                          </Link>
                          <p className="text-xs text-muted-foreground">
                            HH mặc định {item.commission_rate ?? "—"}%
                            {(item.override_commission || 0) > 0 && (
                              <span className="text-emerald-700 dark:text-emerald-300"> · có HH CTV</span>
                            )}
                          </p>
                        </td>
                        <td className="px-4 py-3.5 text-center tabular-nums text-muted-foreground">{item.total_orders || 0}</td>
                        <td className="px-4 py-3.5 text-right font-medium tabular-nums text-foreground">
                          {formatCurrency(item.total_sales)}
                        </td>
                        <td className="px-4 py-3.5 text-right">
                          <span className="font-semibold tabular-nums text-emerald-700 dark:text-emerald-300">{formatCurrency(totalHh)}</span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {sortedRows.length === 0 && (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-card px-6 py-16 text-center shadow-sm">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-muted">
            <BarChart3 className="h-8 w-8 text-muted-foreground" />
          </div>
          <p className="text-base font-semibold text-foreground">Chưa có dữ liệu doanh thu</p>
          <p className="mt-1 max-w-md text-sm text-muted-foreground">
            Trong kỳ {periodLabel}
            {groupName ? ` — nhóm «${groupName}»` : ""} chưa ghi nhận đơn hoàn thành phân bổ cho nhân viên. Thử đổi kỳ lương / tháng-năm hoặc nhóm.
          </p>
        </div>
      )}
    </div>
  );
}
