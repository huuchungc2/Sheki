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
  "http://localhost:3000/api";

/** Sheki primary — UI_SPEC */
const PRIMARY = "#E31837";
const PRIMARY_SOFT = "#fce8ec";

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
      {/* Page shell: header + filters */}
      <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm">
        <div className="relative bg-gradient-to-br from-[#1a1a2e] via-slate-900 to-[#2d1520] px-5 py-6 md:px-8 md:py-7">
          <div
            className="pointer-events-none absolute inset-0 opacity-[0.07]"
            style={{
              backgroundImage: `radial-gradient(circle at 20% 50%, ${PRIMARY} 0%, transparent 50%)`,
            }}
          />
          <div className="relative">
            <nav className="mb-3 flex flex-wrap items-center gap-1.5 text-xs md:text-sm">
              <Link to="/" className="text-slate-400 transition hover:text-white">
                Trang chủ
              </Link>
              <ChevronRight className="h-3.5 w-3.5 text-slate-500" />
              <span className="font-medium text-white">Doanh thu</span>
            </nav>
            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <h1 className="text-xl font-bold tracking-tight text-white md:text-2xl">Báo cáo doanh thu</h1>
                <p className="mt-1 max-w-xl text-sm text-slate-400">
                  Tổng hợp doanh số và hoa hồng theo nhân viên bán hàng trong kỳ. Dữ liệu lọc theo nhóm bán hàng trên đơn.
                </p>
              </div>
              <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 backdrop-blur-sm">
                <BarChart3 className="h-5 w-5 text-[#f472b6]" />
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Kỳ xem</p>
                  <p className="text-sm font-bold text-white">{periodLabel}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="border-t border-slate-100 bg-[#F5F5F5] p-4 md:p-5">
          <div className="flex flex-col gap-3 lg:flex-row lg:flex-wrap lg:items-center lg:justify-between">
            <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
              <label className="flex flex-col gap-1.5">
                <span className="text-xs font-semibold text-[#666666]">Nhóm bán hàng</span>
                <select
                  value={groupId}
                  onChange={(e) => setGroupId(e.target.value)}
                  className="min-w-[180px] rounded-md border border-[#E0E0E0] bg-white px-3 py-2 text-sm font-medium text-[#333333] outline-none ring-[#E31837]/20 transition focus:border-[#E31837] focus:ring-2"
                >
                  <option value="">Tất cả nhóm</option>
                  {groups.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex flex-col gap-1.5">
                <span className="text-xs font-semibold text-[#666666]">Tháng</span>
                <select
                  value={month}
                  onChange={(e) => setMonth(e.target.value)}
                  className="min-w-[120px] rounded-md border border-[#E0E0E0] bg-white px-3 py-2 text-sm font-medium text-[#333333] outline-none transition focus:border-[#E31837] focus:ring-2 focus:ring-[#E31837]/20"
                >
                  {Array.from({ length: 12 }, (_, i) => (
                    <option key={i + 1} value={String(i + 1).padStart(2, "0")}>
                      Tháng {i + 1}
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex flex-col gap-1.5">
                <span className="text-xs font-semibold text-[#666666]">Năm</span>
                <select
                  value={year}
                  onChange={(e) => setYear(e.target.value)}
                  className="min-w-[100px] rounded-md border border-[#E0E0E0] bg-white px-3 py-2 text-sm font-medium text-[#333333] outline-none transition focus:border-[#E31837] focus:ring-2 focus:ring-[#E31837]/20"
                >
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
                "inline-flex items-center justify-center gap-2 rounded-md px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition",
                "bg-[#E31837] hover:bg-[#C41230] disabled:cursor-not-allowed disabled:opacity-50"
              )}
            >
              {exporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
              Xuất Excel
            </button>
          </div>
        </div>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4">
        <div className="group relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:shadow-md md:p-5">
          <div className="absolute right-0 top-0 h-24 w-24 translate-x-6 -translate-y-6 rounded-full bg-[#E31837]/[0.06]" />
          <div className="relative flex items-start gap-3">
            <div
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg"
              style={{ backgroundColor: PRIMARY_SOFT, color: PRIMARY }}
            >
              <TrendingUp className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-bold uppercase tracking-wider text-[#666666]">Tổng doanh số</p>
              <p className="mt-1 truncate text-lg font-bold tabular-nums text-[#333333] md:text-xl">
                {formatCurrency(summary?.totalSales || 0)}
              </p>
            </div>
          </div>
        </div>

        <div className="group relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:shadow-md md:p-5">
          <div className="absolute right-0 top-0 h-24 w-24 translate-x-6 -translate-y-6 rounded-full bg-emerald-500/[0.07]" />
          <div className="relative flex items-start gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
              <DollarSign className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-bold uppercase tracking-wider text-[#666666]">Tổng hoa hồng</p>
              <p className="mt-1 truncate text-lg font-bold tabular-nums text-[#333333] md:text-xl">
                {formatCurrency(summary?.totalCommission || 0)}
              </p>
              <p className="mt-0.5 text-[11px] text-[#666666]">Gồm HH bán hàng + HH CTV</p>
            </div>
          </div>
        </div>

        <div className="group relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:shadow-md md:p-5">
          <div className="absolute right-0 top-0 h-24 w-24 translate-x-6 -translate-y-6 rounded-full bg-blue-500/[0.07]" />
          <div className="relative flex items-start gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
              <ShoppingCart className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-bold uppercase tracking-wider text-[#666666]">Tổng đơn hàng</p>
              <p className="mt-1 text-lg font-bold tabular-nums text-[#333333] md:text-xl">{totalOrders}</p>
            </div>
          </div>
        </div>

        <div className="group relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:shadow-md md:p-5">
          <div className="absolute right-0 top-0 h-24 w-24 translate-x-6 -translate-y-6 rounded-full bg-violet-500/[0.07]" />
          <div className="relative flex items-start gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-violet-50 text-violet-600">
              <Users className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-bold uppercase tracking-wider text-[#666666]">Nhân viên (Sales)</p>
              <p className="mt-1 text-lg font-bold tabular-nums text-[#333333] md:text-xl">{summary?.totalEmployees ?? 0}</p>
            </div>
          </div>
        </div>
      </div>

      {sortedRows.length > 0 && (
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-5">
          <div className="xl:col-span-2">
            <div className="h-full rounded-2xl border border-slate-200 bg-white p-5 shadow-sm md:p-6">
              <div className="mb-4 flex items-center justify-between gap-2">
                <div>
                  <h2 className="text-base font-bold text-[#333333]">Top doanh số</h2>
                  <p className="text-xs text-[#666666]">Tối đa 12 nhân viên có doanh số trong kỳ</p>
                </div>
              </div>
              <div className="h-[min(360px,50vh)] w-full min-h-[260px]">
                {performanceData.length === 0 ? (
                  <div className="flex h-full items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50/50 text-sm text-slate-500">
                    Không có doanh số để hiển thị biểu đồ
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={performanceData} layout="vertical" margin={{ left: 8, right: 16, top: 8, bottom: 8 }}>
                      <CartesianGrid strokeDasharray="3 3" horizontal vertical={false} stroke="#E0E0E0" />
                      <XAxis type="number" hide />
                      <YAxis
                        dataKey="label"
                        type="category"
                        width={108}
                        axisLine={false}
                        tickLine={false}
                        tick={{ fill: "#666666", fontSize: 11 }}
                      />
                      <Tooltip
                        cursor={{ fill: "rgba(227, 24, 55, 0.06)" }}
                        contentStyle={{
                          borderRadius: "8px",
                          border: "1px solid #E0E0E0",
                          boxShadow: "0 10px 15px -3px rgb(0 0 0 / 0.08)",
                        }}
                        formatter={(value: number) => [formatCurrency(value), "Doanh số"]}
                        labelFormatter={(_, payload) => {
                          const p = payload?.[0]?.payload;
                          return p?.full_name || "";
                        }}
                      />
                      <Bar dataKey="total_sales" radius={[0, 6, 6, 0]} barSize={18} maxBarSize={24}>
                        {performanceData.map((_, index) => (
                          <Cell key={`c-${index}`} fill={index === 0 ? PRIMARY : index < 3 ? "#f43f5e" : "#94a3b8"} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>
          </div>

          <div className="xl:col-span-3">
            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="border-b border-[#E0E0E0] bg-[#F5F5F5] px-5 py-4">
                <h2 className="text-base font-bold text-[#333333]">Chi tiết theo nhân viên</h2>
                <p className="mt-0.5 text-xs text-[#666666]">Bấm tên để xem hồ sơ nhân viên</p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[640px] border-collapse text-left text-sm">
                  <thead>
                    <tr className="border-b border-[#E0E0E0] bg-[#F5F5F5]">
                      <th className="whitespace-nowrap px-4 py-3 text-xs font-bold uppercase tracking-wide text-[#666666]">
                        #
                      </th>
                      <th className="px-4 py-3 text-xs font-bold uppercase tracking-wide text-[#666666]">Nhân viên</th>
                      <th className="whitespace-nowrap px-4 py-3 text-center text-xs font-bold uppercase tracking-wide text-[#666666]">
                        Đơn
                      </th>
                      <th className="whitespace-nowrap px-4 py-3 text-right text-xs font-bold uppercase tracking-wide text-[#666666]">
                        Doanh số
                      </th>
                      <th className="whitespace-nowrap px-4 py-3 text-right text-xs font-bold uppercase tracking-wide text-[#666666]">
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
                        <tr key={item.id} className="transition-colors hover:bg-[#fafafa]">
                          <td className="px-4 py-3.5">
                            <span
                              className={cn(
                                "inline-flex h-7 min-w-[1.75rem] items-center justify-center rounded-md text-xs font-bold",
                                rankStyle(idx)
                              )}
                            >
                              {idx + 1}
                            </span>
                          </td>
                          <td className="px-4 py-3.5">
                            <Link
                              to={`/employees/${item.id}`}
                              className="font-semibold text-[#333333] transition hover:text-[#E31837]"
                            >
                              {item.full_name}
                            </Link>
                            <p className="text-xs text-[#666666]">
                              HH mặc định {item.commission_rate ?? "—"}%
                              {(item.override_commission || 0) > 0 && (
                                <span className="text-emerald-600"> · có HH CTV</span>
                              )}
                            </p>
                          </td>
                          <td className="px-4 py-3.5 text-center tabular-nums text-[#333333]">{item.total_orders || 0}</td>
                          <td className="px-4 py-3.5 text-right font-medium tabular-nums text-[#333333]">
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
        </div>
      )}

      {sortedRows.length === 0 && (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-white px-6 py-16 text-center">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-slate-100">
            <BarChart3 className="h-8 w-8 text-slate-400" />
          </div>
          <p className="text-base font-semibold text-[#333333]">Chưa có dữ liệu doanh thu</p>
          <p className="mt-1 max-w-md text-sm text-[#666666]">
            Trong kỳ {periodLabel}
            {groupName ? ` — nhóm «${groupName}»` : ""} chưa ghi nhận đơn hoàn thành phân bổ cho nhân viên. Thử đổi tháng/năm hoặc nhóm.
          </p>
        </div>
      )}
    </div>
  );
}
