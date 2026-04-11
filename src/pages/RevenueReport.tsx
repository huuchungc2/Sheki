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
import { formatCurrency, cn } from "../lib/utils";
import { exportRevenueReport } from "../lib/exportExcel";
const API_URL =
  (import.meta as any)?.env?.VITE_API_URL ||
  "/api";

/** Sheki primary — UI_SPEC */
const PRIMARY = "#E31837";
const PRIMARY_SOFT = "#fce8ec";

const selectCls =
  "min-h-[44px] rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-medium text-slate-800 shadow-sm outline-none transition focus:border-[#E31837] focus:ring-2 focus:ring-[#E31837]/15";

function rankStyle(i: number) {
  if (i === 0) return "bg-amber-100 text-amber-800 ring-1 ring-amber-200";
  if (i === 1) return "bg-slate-200 text-slate-700 ring-1 ring-slate-300";
  if (i === 2) return "bg-orange-100 text-orange-800 ring-1 ring-orange-200";
  return "bg-slate-100 text-slate-500";
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

  const yearOptions = React.useMemo(() => {
    const y = new Date().getFullYear();
    return Array.from({ length: y - 2019 + 2 }, (_, i) => String(2020 + i));
  }, []);

  React.useEffect(() => {
    const fetchGroups = async () => {
      try {
        const token = localStorage.getItem("token");
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
  }, []);

  const fetchReport = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem("token");
      const params = new URLSearchParams({ month, year });
      if (groupId) params.set("group_id", groupId);
      const res = await fetch(`${API_URL}/reports/salary?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Không thể tải báo cáo");
      const json = await res.json();
      setSalesData(json.data.salesData || []);
      setSummary(json.data.summary || {});
    } catch (err: any) {
      setError(err.message || "Đã xảy ra lỗi");
    } finally {
      setLoading(false);
    }
  }, [month, year, groupId]);

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

  const handleExport = () => {
    setExporting(true);
    try {
      exportRevenueReport({
        salesData,
        summary: summary || {},
        month,
        year,
        groupName,
      });
    } finally {
      setExporting(false);
    }
  };

  const periodLabel = `Tháng ${parseInt(month, 10)}/${year}`;

  if (loading) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center gap-3">
        <Loader2 className="h-10 w-10 animate-spin text-[#E31837]" />
        <p className="text-sm text-slate-500">Đang tải báo cáo doanh thu…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-red-50">
          <AlertCircle className="h-8 w-8 text-[#E31837]" />
        </div>
        <p className="text-lg font-semibold text-slate-900">{error}</p>
        <button
          type="button"
          onClick={fetchReport}
          className="rounded-lg bg-[#E31837] px-6 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#C41230]"
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
          <nav className="mb-2 flex flex-wrap items-center gap-1 text-xs text-slate-500">
            <Link to="/" className="transition hover:text-[#E31837]">
              Trang chủ
            </Link>
            <ChevronRight className="h-3 w-3 text-slate-400" />
            <span className="font-medium text-slate-700">Doanh thu</span>
          </nav>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Báo cáo doanh thu</h1>
          <p className="mt-1 max-w-2xl text-sm leading-relaxed text-slate-500">
            Doanh số và hoa hồng theo nhân viên trong kỳ (lọc theo nhóm bán hàng ghi trên đơn).
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
          <CalendarRange className="h-5 w-5 text-[#E31837]" />
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Kỳ</p>
            <p className="text-sm font-bold text-slate-900">{periodLabel}</p>
          </div>
        </div>
      </div>

      {/* Bộ lọc — một khối gọn */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm md:p-5">
        <div className="mb-4 flex items-center gap-2 text-slate-800">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 text-slate-600">
            <Filter className="h-4 w-4" />
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-900">Lọc báo cáo</p>
            <p className="text-xs text-slate-500">Chọn nhóm, tháng và năm</p>
          </div>
        </div>
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="grid w-full grid-cols-1 gap-3 sm:grid-cols-2 lg:flex lg:flex-1 lg:flex-wrap lg:gap-3">
            <label className="flex min-w-0 flex-col gap-1.5 lg:min-w-[200px]">
              <span className="text-xs font-medium text-slate-600">Nhóm bán hàng</span>
              <select value={groupId} onChange={(e) => setGroupId(e.target.value)} className={selectCls}>
                <option value="">Tất cả nhóm</option>
                {groups.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex min-w-0 flex-col gap-1.5 lg:w-[140px]">
              <span className="text-xs font-medium text-slate-600">Tháng</span>
              <select value={month} onChange={(e) => setMonth(e.target.value)} className={selectCls}>
                {Array.from({ length: 12 }, (_, i) => (
                  <option key={i + 1} value={String(i + 1).padStart(2, "0")}>
                    Tháng {i + 1}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex min-w-0 flex-col gap-1.5 lg:w-[120px]">
              <span className="text-xs font-medium text-slate-600">Năm</span>
              <select value={year} onChange={(e) => setYear(e.target.value)} className={selectCls}>
                {yearOptions.map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <button
            type="button"
            onClick={handleExport}
            disabled={exporting || salesData.length === 0}
            className={cn(
              "inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-xl px-5 text-sm font-semibold text-white shadow-sm transition",
              "bg-[#E31837] hover:bg-[#C41230] disabled:cursor-not-allowed disabled:opacity-50"
            )}
          >
            {exporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
            Xuất Excel
          </button>
        </div>
      </div>

      {/* KPI — giống Dashboard: icon tròn + số rõ */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm md:p-5">
          <div className="mb-3 flex items-center justify-between">
            <div
              className="flex h-10 w-10 items-center justify-center rounded-xl"
              style={{ backgroundColor: PRIMARY_SOFT, color: PRIMARY }}
            >
              <TrendingUp className="h-5 w-5" />
            </div>
          </div>
          <p className="text-xs font-medium text-slate-500">Tổng doanh số</p>
          <p className="mt-1 truncate text-lg font-bold tabular-nums text-slate-900 md:text-xl">
            {formatCurrency(summary?.totalSales || 0)}
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm md:p-5">
          <div className="mb-3 flex items-center justify-between">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
              <DollarSign className="h-5 w-5" />
            </div>
          </div>
          <p className="text-xs font-medium text-slate-500">Tổng hoa hồng</p>
          <p className="mt-1 truncate text-lg font-bold tabular-nums text-slate-900 md:text-xl">
            {formatCurrency(summary?.totalCommission || 0)}
          </p>
          <p className="mt-1 text-[11px] text-slate-400">HH bán hàng + HH CTV</p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm md:p-5">
          <div className="mb-3 flex items-center justify-between">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
              <ShoppingCart className="h-5 w-5" />
            </div>
          </div>
          <p className="text-xs font-medium text-slate-500">Tổng đơn hàng</p>
          <p className="mt-1 text-lg font-bold tabular-nums text-slate-900 md:text-xl">{totalOrders}</p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm md:p-5">
          <div className="mb-3 flex items-center justify-between">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-50 text-violet-600">
              <Users className="h-5 w-5" />
            </div>
          </div>
          <p className="text-xs font-medium text-slate-500">Nhân viên (Sales)</p>
          <p className="mt-1 text-lg font-bold tabular-nums text-slate-900 md:text-xl">{summary?.totalEmployees ?? 0}</p>
        </div>
      </div>

      {sortedRows.length > 0 && (
        <div className="space-y-6">
          {/* Biểu đồ full width — dễ đọc hơn */}
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-100 bg-slate-50/80 px-5 py-4 md:px-6">
              <div className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-[#E31837]" />
                <div>
                  <h2 className="text-base font-bold text-slate-900">Xếp hạng doanh số</h2>
                  <p className="text-xs text-slate-500">Tối đa 12 nhân viên có doanh số trong kỳ</p>
                </div>
              </div>
            </div>
            <div className="p-4 md:p-6">
              <div className="w-full" style={{ height: rankChartHeight }}>
                {performanceData.length === 0 ? (
                  <div className="flex h-full min-h-[140px] items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50 text-sm text-slate-500">
                    Không có doanh số để hiển thị biểu đồ
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={performanceData}
                      layout="vertical"
                      margin={{ left: 0, right: 16, top: 4, bottom: 4 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" horizontal vertical={false} stroke="#e2e8f0" />
                      <XAxis type="number" hide />
                      <YAxis
                        dataKey="label"
                        type="category"
                        width={112}
                        axisLine={false}
                        tickLine={false}
                        tick={{ fill: "#64748b", fontSize: 11 }}
                        interval={0}
                      />
                      <Tooltip
                        cursor={{ fill: "rgba(227, 24, 55, 0.05)" }}
                        contentStyle={{
                          borderRadius: "12px",
                          border: "1px solid #e2e8f0",
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
                          <Cell key={`c-${index}`} fill={index === 0 ? PRIMARY : index < 3 ? "#e11d48" : "#94a3b8"} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>
          </div>

          {/* Bảng chi tiết */}
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-100 bg-slate-50/80 px-5 py-4 md:px-6">
              <h2 className="text-base font-bold text-slate-900">Chi tiết theo nhân viên</h2>
              <p className="mt-0.5 text-xs text-slate-500">Bấm tên để mở hồ sơ nhân viên</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] border-collapse text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-200">
                    <th className="whitespace-nowrap px-4 py-3.5 text-xs font-semibold uppercase tracking-wide text-slate-500">
                      #
                    </th>
                    <th className="px-4 py-3.5 text-xs font-semibold uppercase tracking-wide text-slate-500">Nhân viên</th>
                    <th className="whitespace-nowrap px-4 py-3.5 text-center text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Đơn
                    </th>
                    <th className="whitespace-nowrap px-4 py-3.5 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Doanh số
                    </th>
                    <th className="whitespace-nowrap px-4 py-3.5 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Hoa hồng
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {sortedRows.map((item, idx) => {
                    const totalHh =
                      item.total_all_commission != null
                        ? item.total_all_commission
                        : (item.total_commission || 0) + (item.override_commission || 0);
                    return (
                      <tr key={item.id} className="transition-colors hover:bg-slate-50/80">
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
                            className="font-semibold text-slate-900 transition hover:text-[#E31837]"
                          >
                            {item.full_name}
                          </Link>
                          <p className="text-xs text-slate-500">
                            HH mặc định {item.commission_rate ?? "—"}%
                            {(item.override_commission || 0) > 0 && (
                              <span className="text-emerald-600"> · có HH CTV</span>
                            )}
                          </p>
                        </td>
                        <td className="px-4 py-3.5 text-center tabular-nums text-slate-800">{item.total_orders || 0}</td>
                        <td className="px-4 py-3.5 text-right font-medium tabular-nums text-slate-900">
                          {formatCurrency(item.total_sales)}
                        </td>
                        <td className="px-4 py-3.5 text-right">
                          <span className="font-semibold tabular-nums text-emerald-600">{formatCurrency(totalHh)}</span>
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
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-white px-6 py-16 text-center shadow-sm">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100">
            <BarChart3 className="h-8 w-8 text-slate-400" />
          </div>
          <p className="text-base font-semibold text-slate-900">Chưa có dữ liệu doanh thu</p>
          <p className="mt-1 max-w-md text-sm text-slate-500">
            Trong kỳ {periodLabel}
            {groupName ? ` — nhóm «${groupName}»` : ""} chưa ghi nhận đơn hoàn thành phân bổ cho nhân viên. Thử đổi tháng/năm hoặc nhóm.
          </p>
        </div>
      )}
    </div>
  );
}
