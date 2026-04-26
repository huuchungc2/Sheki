import * as React from "react";
import { Link, useParams } from "react-router-dom";
import {
  DollarSign, TrendingUp, Users, Download,
  Loader2, AlertCircle, ChevronRight, ShoppingCart, ChevronDown, Wallet, Truck, CircleDollarSign, ArrowLeft
} from "lucide-react";
import { formatCurrency, formatDate, cn, isAdminUser } from "../lib/utils";
import { exportSalesCommission, exportAdminCommission } from "../lib/exportExcel";

const API_URL =
  (import.meta as any)?.env?.VITE_API_URL ||
  "/api";

const statusConfig: Record<string, { label: string; color: string }> = {
  pending:   { label: "Chờ duyệt", color: "bg-amber-50 text-amber-600" },
  shipping:  { label: "Đang giao", color: "bg-blue-50 text-blue-600" },
  completed: { label: "Đã giao",   color: "bg-emerald-50 text-emerald-600" },
  cancelled: { label: "Đã hủy",   color: "bg-red-50 text-red-500" },
};

export function CommissionReport() {
  const { userId: userIdFromRoute } = useParams();
  const subjectUserId = React.useMemo(() => {
    if (!userIdFromRoute || !/^\d+$/.test(String(userIdFromRoute))) return undefined;
    return parseInt(String(userIdFromRoute), 10);
  }, [userIdFromRoute]);

  const [currentUser, setCurrentUser] = React.useState<any>(() => {
    const u = localStorage.getItem("user");
    return u ? JSON.parse(u) : null;
  });
  React.useEffect(() => {
    const syncFromStorage = () => {
      const u = localStorage.getItem("user");
      setCurrentUser(u ? JSON.parse(u) : null);
    };
    const onAuthChange = () => syncFromStorage();
    const onStorage = (e: StorageEvent) => {
      if (e.key === "user" || e.key === "token") syncFromStorage();
    };
    window.addEventListener("auth-change", onAuthChange as any);
    window.addEventListener("storage", onStorage);
    return () => {
      window.removeEventListener("auth-change", onAuthChange as any);
      window.removeEventListener("storage", onStorage);
    };
  }, []);
  const isAdmin = isAdminUser(currentUser);
  /** Admin xem 1 NV: cùng UI/công thức «Hoa hồng của tôi», lọc theo user_id trên URL (không dùng id đăng nhập) */
  const employeeDrilldown = Boolean(isAdmin && subjectUserId != null);
  const [subjectUserName, setSubjectUserName] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!employeeDrilldown || subjectUserId == null) {
      setSubjectUserName(null);
      return;
    }
    const token = localStorage.getItem("token");
    fetch(`${API_URL}/users/${subjectUserId}`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => (r.ok ? r.json() : null))
      .then(j => setSubjectUserName(j?.data?.full_name || null))
      .catch(() => setSubjectUserName(null));
  }, [employeeDrilldown, subjectUserId]);

  const [loading, setLoading]   = React.useState(true);
  const [error, setError]       = React.useState<string | null>(null);

  // Filter state
  const [month, setMonth]     = React.useState(String(new Date().getMonth() + 1).padStart(2, "0"));
  const [year, setYear]       = React.useState(String(new Date().getFullYear()));
  const [groupId, setGroupId] = React.useState("");
  const [groups, setGroups]   = React.useState<any[]>([]);

  // Sales view data (từ /commissions/orders)
  const [orderCommissions, setOrderCommissions] = React.useState<any[]>([]);
  const [summary, setSummary] = React.useState<any>({
    direct_commission: 0,
    override_commission: 0,
    total_commission: 0,
    total_orders: 0,
    total_khach_ship: 0,
    total_nv_chiu: 0,
    total_luong: 0,
  });
  const [returnsSummary, setReturnsSummary] = React.useState<any>({
    return_orders: 0,
    return_revenue: 0,
    return_commission: 0,
  });

  // Admin view data
  const [salesData, setSalesData]   = React.useState<any[]>([]);
  const [ctvPairs, setCtvPairs]     = React.useState<any[]>([]);
  const [ctvOrders, setCtvOrders]   = React.useState<any[]>([]);
  const [ctvTotals, setCtvTotals]   = React.useState<any>({});
  const [activeTab, setActiveTab]   = React.useState<"direct" | "ctv">("direct");
  const [expandedCtv, setExpandedCtv] = React.useState<Set<string>>(new Set());
  const [orderPopup, setOrderPopup]     = React.useState<any | null>(null);
  const [popupItems, setPopupItems]     = React.useState<any[]>([]);
  const [popupLoading, setPopupLoading] = React.useState(false);

  // Phân trang bảng chi tiết đơn
  const [commPage, setCommPage]     = React.useState(1);
  const [commTotal, setCommTotal]   = React.useState(0);
  const [commLimit, setCommLimit]   = React.useState(20);
  const [exporting, setExporting]   = React.useState(false);

  // Fetch groups
  React.useEffect(() => {
    const token = localStorage.getItem("token");
    const endpoint = isAdmin ? "/groups" : `/groups/user/${currentUser?.id}`;
    fetch(`${API_URL}${endpoint}`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json()).then(j => setGroups(j.data || [])).catch(() => {});
  }, [isAdmin, currentUser?.id]);

  const fetchReport = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    setSummary({
      direct_commission: 0,
      override_commission: 0,
      total_commission: 0,
      total_orders: 0,
      total_khach_ship: 0,
      total_nv_chiu: 0,
      total_luong: 0,
    });
    setOrderCommissions([]);
    setReturnsSummary({ return_orders: 0, return_revenue: 0, return_commission: 0 });
    try {
      const token = localStorage.getItem("token");
      const params = new URLSearchParams({ month, year, page: String(commPage), limit: String(commLimit) });
      if (groupId) params.set("group_id", groupId);
      if (employeeDrilldown && subjectUserId != null) params.set("user_id", String(subjectUserId));

      // 1. Chi tiết theo đơn (cùng API «Hoa hồng của tôi»; Admin + user_id = 1 NV)
      const [orderRes, returnsRes] = await Promise.all([
        fetch(`${API_URL}/commissions/orders?${params}`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${API_URL}/reports/returns-summary?${params}`, { headers: { Authorization: `Bearer ${token}` } }),
      ]);
      if (!orderRes.ok) throw new Error("Không thể tải báo cáo hoa hồng");
      const orderJson = await orderRes.json();
      setOrderCommissions(orderJson.data || []);
      setCommTotal(orderJson.total || 0);
      const s = orderJson.summary;
      const directCommission = parseFloat(s?.direct_commission) || 0;
      const overrideCommission = parseFloat(s?.override_commission) || 0;
      const totalOrders = parseInt(s?.total_orders) || 0;
      const totalKhachShip = parseFloat(s?.total_khach_ship) || 0;
      const totalNvChiu = parseFloat(s?.total_nv_chiu) || 0;
      const totalLuongApi = parseFloat(s?.total_luong) || 0;
      const totalCommApi = parseFloat(s?.total_commission) || 0;
      const totalReturnCommAbs = parseFloat(s?.total_return_commission_abs) || 0;

      setSummary({
        direct_commission: directCommission,
        override_commission: overrideCommission,
        total_commission: totalCommApi || directCommission + overrideCommission,
        total_orders: totalOrders,
        total_khach_ship: totalKhachShip,
        total_nv_chiu: totalNvChiu,
        total_return_commission_abs: totalReturnCommAbs,
        total_luong: totalLuongApi,
      });

      if (returnsRes.ok) {
        const rj = await returnsRes.json();
        setReturnsSummary({
          return_orders: Number(rj?.data?.return_orders) || 0,
          return_revenue: Number(rj?.data?.return_revenue) || 0,
          return_commission: Number(rj?.data?.return_commission) || 0,
        });
      }

      // 3. Bảng tổng hợp (theo menu Admin): luôn gọi khi không drilldown.
      // - Admin => toàn shop
      // - Non-admin (Sales) => scope own => API tự trả 1 dòng của chính mình
      if (!employeeDrilldown) {
        const salaryParams = new URLSearchParams({ month, year });
        if (groupId) salaryParams.set("group_id", groupId);

        const [salaryRes, ctvRes] = await Promise.all([
          fetch(`${API_URL}/reports/salary?${salaryParams}`, { headers: { Authorization: `Bearer ${token}` } }),
          // Admin: xem toàn hệ thống; Sales: chỉ xem cặp của mình (sales_id = current user)
          (() => {
            const p = new URLSearchParams(salaryParams);
            if (!isAdmin && currentUser?.id != null) p.set("sales_id", String(currentUser.id));
            return fetch(`${API_URL}/collaborators/commissions/all?${p}`, { headers: { Authorization: `Bearer ${token}` } });
          })(),
        ]);

        if (salaryRes.ok) {
          const j = await salaryRes.json();
          const sd = j.data?.salesData || [];
          setSalesData(sd);

          // KPI tổng (HH bán gross + CTV net) lấy từ `/reports/salary` — cùng nguồn với Dashboard (commissionKpi),
          // không cộng từ từng dòng NV (tránh thiếu khi NV không có đơn trong tháng nhưng vẫn có phát sinh HH).
          const sumOrders = sd.reduce((s: number, i: any) => s + (Number(i.total_orders) || 0), 0);
          const sumShip = sd.reduce((s: number, i: any) => s + (Number(i.total_khach_ship) || 0), 0);
          const sumNv = sd.reduce((s: number, i: any) => s + (Number(i.total_nv_chiu) || 0), 0);
          const sumLuong = sd.reduce((s: number, i: any) => s + (Number(i.total_luong) || 0), 0);
          const ordersAll = Number(j.data?.summary?.totalOrdersAll) || 0;
          const kpiD = Number(j.data?.summary?.kpi_direct_gross);
          const kpiO = Number(j.data?.summary?.kpi_override_net);
          const kpiT = Number(j.data?.summary?.kpi_total_hh);
          const kpiLuong = Number(j.data?.summary?.kpi_total_luong);
          const kpiShip = Number(j.data?.summary?.kpi_total_khach_ship);
          const kpiNv = Number(j.data?.summary?.kpi_total_nv_chiu);
          const fallbackD = sd.reduce((s: number, i: any) => s + (Number(i.direct_commission) || 0), 0);
          const fallbackO = sd.reduce((s: number, i: any) => s + (Number(i.override_commission) || 0), 0);

          setSummary((prev: any) => ({
            ...prev,
            direct_commission: Number.isFinite(kpiD) ? kpiD : fallbackD,
            override_commission: Number.isFinite(kpiO) ? kpiO : fallbackO,
            total_commission: Number.isFinite(kpiT) ? kpiT : fallbackD + fallbackO,
            total_orders: ordersAll || sumOrders,
            total_khach_ship: Number.isFinite(kpiShip) ? kpiShip : sumShip,
            total_nv_chiu: Number.isFinite(kpiNv) ? kpiNv : sumNv,
            total_luong: Number.isFinite(kpiLuong) ? kpiLuong : sumLuong,
          }));
        }
        if (ctvRes.ok) {
          const j = await ctvRes.json();
          setCtvPairs(j.data?.pairs || []);
          setCtvOrders(j.data?.orders || []);
          setCtvTotals(j.data?.totals || {});
        }
      } else if (employeeDrilldown) {
        setSalesData([]);
        setCtvPairs([]);
        setCtvOrders([]);
        setCtvTotals({});
      }
    } catch (err: any) {
      setError(err.message || "Đã xảy ra lỗi");
    } finally {
      setLoading(false);
    }
  }, [month, year, groupId, commPage, commLimit, isAdmin, currentUser?.id, employeeDrilldown, subjectUserId]);

  // Reset page khi filter hoặc limit / NV thay đổi
  React.useEffect(() => { setCommPage(1); }, [month, year, groupId, commLimit, subjectUserId]);

  React.useEffect(() => { fetchReport(); }, [fetchReport]);

  const openOrderPopup = async (item: any) => {
    setOrderPopup(item);
    setPopupItems([]);
    setPopupLoading(true);
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API_URL}/orders/${item.order_id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const json = await res.json();
        setPopupItems(json.data?.items || []);
      }
    } catch {}
    finally { setPopupLoading(false); }
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      const token = localStorage.getItem("token");
      const groupName = groups.find(g => String(g.id) === groupId)?.name || "";

      // Fetch toàn bộ data (limit=9999, không phân trang)
      const allParams = new URLSearchParams({ month, year, page: "1", limit: "9999" });
      if (groupId) allParams.set("group_id", groupId);
      if (employeeDrilldown && subjectUserId != null) allParams.set("user_id", String(subjectUserId));
      const allRes = await fetch(`${API_URL}/commissions/orders?${allParams}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const allJson = await allRes.json();
      const allOrders = allJson.data || [];
      const periodSummary = { ...summary, ...(allJson.summary || {}) };

      if (isAdmin && !employeeDrilldown) {
        exportAdminCommission({
          salesData,
          orderCommissions: allOrders,
          ctvPairs,
          ctvOrders,
          month,
          year,
          groupName,
          periodSummary,
        });
      } else {
        exportSalesCommission({
          orders: allOrders,
          summary: periodSummary,
          userName: employeeDrilldown ? (subjectUserName || `NV #${subjectUserId}`) : (currentUser?.full_name || "NhanVien"),
          month,
          year,
          groupName,
        });
      }
    } catch (e) {
      console.error("Export error", e);
    } finally {
      setExporting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-10 h-10 text-blue-600 animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <AlertCircle className="w-14 h-14 text-red-400" />
        <p className="text-base font-semibold text-slate-700">{error}</p>
        <button onClick={fetchReport} className="px-5 py-2 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700">Thử lại</button>
      </div>
    );
  }

  const isSalesMyCommission = !isAdmin && !employeeDrilldown;
  const totalOrdersWithReturns = Number(summary.total_orders) || 0;

  return (
    <div className="space-y-6 min-w-0 max-w-full overflow-x-hidden">
      {/* Header + Filter — lọc + Xuất Excel luôn 1 hàng (overflow-x-auto khi màn hẹp) */}
      <div className="flex flex-col gap-4 min-w-0 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3 min-w-0 sm:min-w-[12rem] sm:flex-1">
          {employeeDrilldown && (
            <Link
              to="/reports/commissions"
              className="mt-1 p-2 rounded-xl text-slate-500 hover:bg-slate-100 transition-colors shrink-0"
              title="Về báo cáo toàn bộ"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
          )}
          <div className="min-w-0">
            <h1 className="text-2xl font-bold text-slate-900 break-words">
              {employeeDrilldown
                ? `Hoa hồng: ${subjectUserName || `Nhân viên #${subjectUserId}`}`
                : "Báo cáo hoa hồng"}
            </h1>
            <p className="text-slate-500 text-sm mt-0.5 break-words">
              {employeeDrilldown
                ? "Cùng cột KPI và bảng đơn như «Hoa hồng của tôi» — theo nhân viên đã chọn (lọc theo user_id trên URL)."
                : "Tổng hợp hoa hồng theo menu Admin; dữ liệu sẽ tự co theo phạm vi (cá nhân/nhóm/toàn shop)."}
            </p>
          </div>
        </div>
        <div className="flex flex-nowrap items-center justify-start sm:justify-end gap-2 w-full min-w-0 overflow-x-auto pb-0.5 [scrollbar-width:thin]">
          <select value={groupId} onChange={(e) => setGroupId(e.target.value)}
            className="shrink-0 min-w-[7.5rem] max-w-[46vw] sm:max-w-none sm:min-w-[9rem] px-2.5 py-2 bg-white border border-slate-200 rounded-xl text-sm font-medium text-slate-700 outline-none focus:ring-2 focus:ring-blue-100">
            <option value="">Tất cả nhóm</option>
            {groups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
          </select>
          <select value={month} onChange={(e) => setMonth(e.target.value)}
            className="shrink-0 min-w-[5.5rem] px-2.5 py-2 bg-white border border-slate-200 rounded-xl text-sm font-medium text-slate-700 outline-none focus:ring-2 focus:ring-blue-100">
            {Array.from({ length: 12 }, (_, i) => (
              <option key={i + 1} value={String(i + 1).padStart(2, "0")}>Tháng {i + 1}</option>
            ))}
          </select>
          <select value={year} onChange={(e) => setYear(e.target.value)}
            className="shrink-0 min-w-[4.25rem] px-2.5 py-2 bg-white border border-slate-200 rounded-xl text-sm font-medium text-slate-700 outline-none focus:ring-2 focus:ring-blue-100">
            {[2024, 2025, 2026, 2027].map(y => <option key={y} value={y}>{y}</option>)}
          </select>
          <button
            onClick={handleExport}
            disabled={loading || exporting}
            className="inline-flex shrink-0 items-center gap-1.5 sm:gap-2 whitespace-nowrap px-3 sm:px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 transition-all shadow-sm disabled:opacity-50">
            {exporting
              ? <><Loader2 className="w-4 h-4 animate-spin" /> Đang xuất...</>
              : <><Download className="w-4 h-4" /> Xuất Excel</>
            }
          </button>
        </div>
      </div>

      {/* KPI — cùng Dashboard; [&>*]:min-w-0 tránh grid làm tràn ngang (min-width: auto mặc định) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 w-full min-w-0 [&>*]:min-w-0">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm min-w-0">
          <div className="w-9 h-9 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600 mb-3">
            <TrendingUp className="w-4 h-4" />
          </div>
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">HH bán hàng</p>
          <p className="text-xl font-bold text-emerald-700 mt-1 break-words tabular-nums">{formatCurrency(summary.direct_commission || 0)}</p>
          <p className="text-xs text-slate-400 mt-1 break-words">Từ đơn tự bán</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm min-w-0">
          <div className={`w-9 h-9 rounded-xl flex items-center justify-center mb-3 ${isSalesMyCommission ? "bg-purple-50 text-purple-600" : "bg-blue-50 text-blue-600"}`}>
            <Users className="w-4 h-4" />
          </div>
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">HH từ CTV</p>
          <p className={`text-xl font-bold mt-1 break-words tabular-nums ${isSalesMyCommission ? "text-purple-700" : "text-blue-700"}`}>
            {formatCurrency(summary.override_commission || 0)}
          </p>
          {isSalesMyCommission ? (
            <p className="text-xs text-slate-400 mt-1 leading-snug break-words" title="Override cho quản lý khi CTV lên đơn ghi nhận quản lý. Nếu bạn chỉ là CTV, thường = 0; HH của bạn nằm ở «HH bán hàng».">
              Tổng HH: {formatCurrency(summary.total_commission || 0)}
            </p>
          ) : (
            <p className="text-xs text-slate-400 mt-1 leading-snug line-clamp-3 break-words" title="Chỉ khi bạn là quản lý nhận override; đơn ghi nhận quản lý + cặp collaborators + tier. Nếu bạn chỉ là người lên đơn (CTV), HH nằm ở «HH bán hàng».">
              {employeeDrilldown
                ? "Tiền quản lý nhận từ đơn CTV — nếu chỉ là CTV, thường = 0"
                : "Override quản lý trên đơn CTV"}
            </p>
          )}
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm min-w-0">
          <div className="w-9 h-9 rounded-xl bg-purple-50 flex items-center justify-center text-purple-600 mb-3">
            <DollarSign className="w-4 h-4" />
          </div>
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Tổng hoa hồng</p>
          <p className="text-xl font-bold text-purple-700 mt-1 break-words tabular-nums">
            {formatCurrency((summary.direct_commission || 0) + (summary.override_commission || 0))}
          </p>
          <p className="text-xs text-slate-400 mt-1 break-words">Bán hàng + CTV</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm min-w-0">
          <div className="w-9 h-9 rounded-xl bg-amber-50 flex items-center justify-center text-amber-600 mb-3">
            <ShoppingCart className="w-4 h-4" />
          </div>
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Số đơn hàng</p>
          <p className="text-xl font-bold text-slate-900 mt-1 tabular-nums">{totalOrdersWithReturns}</p>
          <p className="text-xs text-slate-400 mt-1 break-words">Tháng {month}/{year}</p>
        </div>
      </div>

      {/* Return KPIs — giống Dashboard */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 w-full min-w-0 [&>*]:min-w-0">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm min-w-0">
          <div className="w-9 h-9 rounded-xl bg-red-50 flex items-center justify-center text-red-600 mb-3">
            <DollarSign className="w-4 h-4" />
          </div>
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Tổng doanh số hoàn</p>
          <p className="text-xl font-bold text-red-600 mt-1 break-words tabular-nums">
            {formatCurrency(-(returnsSummary.return_revenue || 0))}
          </p>
          <p className="text-xs text-slate-400 mt-1 break-words">Tháng {month}/{year}</p>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm min-w-0">
          <div className="w-9 h-9 rounded-xl bg-red-50 flex items-center justify-center text-red-600 mb-3">
            <TrendingUp className="w-4 h-4" />
          </div>
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Tổng HH hoàn</p>
          <p className="text-xl font-bold text-red-600 mt-1 break-words tabular-nums">
            {formatCurrency(returnsSummary.return_commission || 0)}
          </p>
          <p className="text-xs text-slate-400 mt-1 break-words">Tháng {month}/{year}</p>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm min-w-0">
          <div className="w-9 h-9 rounded-xl bg-red-50 flex items-center justify-center text-red-600 mb-3">
            <ShoppingCart className="w-4 h-4" />
          </div>
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Tổng đơn hoàn</p>
          <p className="text-xl font-bold text-red-600 mt-1 tabular-nums">{returnsSummary.return_orders || 0}</p>
          <p className="text-xs text-slate-400 mt-1 break-words">Tháng {month}/{year}</p>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 w-full min-w-0 [&>*]:min-w-0">
        <div className="bg-gradient-to-br from-sky-50 to-white p-5 rounded-2xl border border-sky-100 shadow-sm ring-1 ring-sky-100/80 min-w-0">
          <div className="w-9 h-9 rounded-xl bg-sky-100 flex items-center justify-center text-sky-600 mb-3">
            <Truck className="w-4 h-4" />
          </div>
          <p className="text-xs font-semibold text-sky-600/90 uppercase tracking-wide">Ship KH Trả</p>
          <p className="text-xl font-bold text-sky-800 mt-1 tabular-nums break-words">{formatCurrency(summary.total_khach_ship || 0)}</p>
          <p className="text-xs text-slate-500 mt-0.5 break-words leading-snug">
            {isSalesMyCommission ? "Đơn bạn phụ trách — tháng này" : "Tháng này (theo đơn)"}
          </p>
        </div>
        <div className="bg-gradient-to-br from-rose-50 to-white p-5 rounded-2xl border border-rose-100 shadow-sm ring-1 ring-rose-100/80 min-w-0">
          <div className="w-9 h-9 rounded-xl bg-rose-100 flex items-center justify-center text-rose-600 mb-3">
            <CircleDollarSign className="w-4 h-4" />
          </div>
          <p className="text-xs font-semibold text-rose-600/90 uppercase tracking-wide">Tiền NV chịu</p>
          <p className="text-xl font-bold text-rose-800 mt-1 tabular-nums break-words">{formatCurrency(summary.total_nv_chiu || 0)}</p>
          <p className="text-xs text-slate-500 mt-0.5 break-words leading-snug">
            {isSalesMyCommission ? "Đơn bạn phụ trách — tháng này" : "Tháng này (theo đơn)"}
          </p>
        </div>
        <div className="col-span-2 lg:col-span-1 bg-gradient-to-br from-violet-50 to-white p-5 rounded-2xl border border-violet-100 shadow-sm ring-1 ring-violet-100/80 min-w-0">
          <div className="w-9 h-9 rounded-xl bg-violet-100 flex items-center justify-center text-violet-600 mb-3">
            <Wallet className="w-4 h-4" />
          </div>
          <p className="text-xs font-semibold text-violet-600/90 uppercase tracking-wide">Tổng lương</p>
          <p className="text-xl font-bold text-violet-800 mt-1 tabular-nums break-words">{formatCurrency(summary.total_luong || 0)}</p>
          <p className="text-xs text-slate-500 mt-0.5 break-words leading-snug">Tổng HH + Ship KH Trả − tiền NV chịu</p>
        </div>
      </div>

      {/* Tabs (theo menu Admin): Hoa hồng NV / Hoa hồng CTV — ẩn khi xem 1 NV */}
      {!employeeDrilldown && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden min-w-0">
          {/* Tab header */}
          <div className="flex border-b border-slate-100">
            <button
              onClick={() => setActiveTab("direct")}
              className={cn("px-6 py-4 text-sm font-semibold transition-colors border-b-2",
                activeTab === "direct"
                  ? "border-blue-600 text-blue-600 bg-blue-50/50"
                  : "border-transparent text-slate-500 hover:text-slate-700"
              )}>
              Hoa hồng nhân viên
              {salesData.length > 0 && (
                <span className="ml-2 px-1.5 py-0.5 rounded-full text-xs bg-slate-100 text-slate-600">{salesData.length}</span>
              )}
            </button>
            <button
              onClick={() => setActiveTab("ctv")}
              className={cn("px-6 py-4 text-sm font-semibold transition-colors border-b-2",
                activeTab === "ctv"
                  ? "border-emerald-600 text-emerald-600 bg-emerald-50/50"
                  : "border-transparent text-slate-500 hover:text-slate-700"
              )}>
              Hoa hồng từ CTV
              {ctvTotals.total_override > 0 && (
                <span className="ml-2 px-1.5 py-0.5 rounded-full text-xs bg-emerald-50 text-emerald-600 font-bold">
                  {formatCurrency(ctvTotals.total_override)}
                </span>
              )}
            </button>
          </div>

          {/* Tab: Hoa hồng nhân viên */}
          {activeTab === "direct" && (
            salesData.length === 0 ? (
              <div className="py-12 text-center text-slate-400 text-sm">Chưa có dữ liệu trong tháng này</div>
            ) : (
              <div className="min-w-0 overflow-x-auto">
                <table className="w-full text-left border-collapse text-sm min-w-[640px]">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-100">
                      <th className="px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Nhân viên</th>
                      <th className="px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide text-right text-slate-700">Doanh số</th>
                      <th className="px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide text-right">Hoa hồng</th>
                      <th className="px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide text-right whitespace-nowrap">Ship / NV chịu</th>
                      <th className="px-5 py-3 text-xs font-semibold text-violet-600 uppercase tracking-wide text-right whitespace-nowrap">Tổng lương</th>
                      <th className="px-5 py-3 w-8"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {salesData.map((item: any) => (
                      <tr key={item.id} className="hover:bg-slate-50/60 transition-colors">
                        <td className="px-5 py-3">
                          <p className="font-semibold text-slate-900">{item.full_name}</p>
                          <p className="text-xs text-slate-400 mt-0.5">{item.position || "Sales"}</p>
                          <p className="text-xs text-slate-400 mt-0.5">
                            <span className="text-slate-400">Số đơn:</span>{" "}
                            <span className="font-semibold text-slate-600 tabular-nums">{item.total_orders || 0}</span>
                          </p>
                        </td>
                        <td className="px-5 py-3 text-right tabular-nums font-bold text-slate-900">
                          {formatCurrency(item.total_sales || 0)}
                        </td>
                        <td className="px-5 py-3 text-right tabular-nums">
                          <p className="text-xs text-slate-400 mt-0.5">
                            <span className="text-slate-400">Bán hàng:</span>{" "}
                            <span className="font-semibold text-emerald-600">{formatCurrency(item.direct_commission || 0)}</span>
                          </p>
                          <p className="text-xs text-slate-400 mt-0.5">
                            <span className="text-slate-400">Từ CTV:</span>{" "}
                            <span className="font-semibold text-blue-600">{formatCurrency(item.override_commission || 0)}</span>
                          </p>
                          <p className="text-xs text-slate-400 mt-0.5">
                            <span className="text-slate-400">Tổng:</span>{" "}
                            <span className="font-bold text-slate-900">
                              {formatCurrency((item.direct_commission || 0) + (item.override_commission || 0))}
                            </span>
                          </p>
                        </td>
                        <td className="px-5 py-3 text-right tabular-nums">
                          <p className="text-xs text-slate-400 mt-0.5">
                            <span className="text-slate-400">Ship KH trả:</span>{" "}
                            <span className="font-semibold text-sky-800">{formatCurrency(item.total_khach_ship || 0)}</span>
                          </p>
                          <p className="text-xs text-slate-400 mt-0.5">
                            <span className="text-slate-400">NV chịu:</span>{" "}
                            <span className="font-semibold text-rose-800">{formatCurrency(item.total_nv_chiu || 0)}</span>
                          </p>
                        </td>
                        <td className="px-5 py-3 text-right font-bold text-violet-800 tabular-nums">
                          {formatCurrency(Number(item.total_luong) || 0)}
                        </td>
                        <td className="px-5 py-3 text-right">
                          <Link to={`/reports/commissions/${item.id}`}
                            className="text-xs font-semibold text-blue-600 hover:underline flex items-center gap-0.5 justify-end">
                            Chi tiết <ChevronRight className="w-3 h-3" />
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="bg-slate-800 text-white text-sm font-bold">
                      <td className="px-5 py-3">Tổng cộng</td>
                      <td className="px-5 py-3 text-right tabular-nums font-bold text-slate-100">
                        {formatCurrency(salesData.reduce((s: number, i: any) => s + (i.total_sales || 0), 0))}
                      </td>
                      <td className="px-5 py-3 text-right">
                        <div className="text-[11px] font-normal text-slate-300 mb-1">Bán hàng / Từ CTV / Tổng</div>
                        <div className="flex flex-col gap-0.5 items-end">
                          <div className="text-emerald-400 tabular-nums">{formatCurrency(salesData.reduce((s: number, i: any) => s + (i.direct_commission || 0), 0))}</div>
                          <div className="text-blue-300 tabular-nums">{formatCurrency(salesData.reduce((s: number, i: any) => s + (i.override_commission || 0), 0))}</div>
                          <div className="text-white tabular-nums">{formatCurrency(salesData.reduce((s: number, i: any) => s + (i.direct_commission || 0) + (i.override_commission || 0), 0))}</div>
                        </div>
                      </td>
                      <td className="px-5 py-3 text-right">
                        <div className="text-[11px] font-normal text-slate-300 mb-1">Ship KH trả / NV chịu</div>
                        <div className="flex flex-col gap-0.5 items-end">
                          <div className="text-sky-300 tabular-nums">{formatCurrency(salesData.reduce((s: number, i: any) => s + (i.total_khach_ship || 0), 0))}</div>
                          <div className="text-rose-300 tabular-nums">{formatCurrency(salesData.reduce((s: number, i: any) => s + (i.total_nv_chiu || 0), 0))}</div>
                        </div>
                      </td>
                      <td className="px-5 py-3 text-right text-violet-300">{formatCurrency(salesData.reduce((s: number, i: any) => s + (Number(i.total_luong) || 0), 0))}</td>
                      <td className="px-5 py-3"></td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )
          )}

          {/* Tab: Hoa hồng từ CTV */}
          {activeTab === "ctv" && (() => {
            // Group pairs by sales — chỉ lấy pairs có override > 0
            const bySales: Record<number, any[]> = {};
            ctvPairs
              .filter(p => p.override_commission > 0)
              .forEach(p => { if (!bySales[p.sales_id]) bySales[p.sales_id] = []; bySales[p.sales_id].push(p); });
            const ordersByPair: Record<string, any[]> = {};
            ctvOrders.forEach(o => {
              const k = `${o.sales_id}-${o.ctv_id}`;
              if (!ordersByPair[k]) ordersByPair[k] = [];
              ordersByPair[k].push(o);
            });
            const salesIds = Object.keys(bySales).map(Number);

            return salesIds.length === 0 ? (
              <div className="py-12 text-center text-slate-400 text-sm">Chưa có hoa hồng CTV trong tháng này</div>
            ) : (
              <div>
                {salesIds.map(sid => {
                  const pairs = bySales[sid];
                  const salesName = pairs[0]?.sales_name || "—";
                  const salesTotal = pairs.reduce((s: number, p: any) => s + p.override_commission, 0);
                  const salesKey = `s-${sid}`;
                  const isOpen = expandedCtv.has(salesKey);
                  const toggle = (k: string) => setExpandedCtv(prev => {
                    const next = new Set(prev); next.has(k) ? next.delete(k) : next.add(k); return next;
                  });

                  return (
                    <div key={sid} className="border-b border-slate-100 last:border-0">
                      {/* Sales row */}
                      <button onClick={() => toggle(salesKey)}
                        className="w-full px-5 py-3.5 flex items-center justify-between hover:bg-slate-50/60 transition-colors">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-xs font-bold">
                            {salesName.split(" ").map((n: string) => n[0]).join("").slice(0,2).toUpperCase()}
                          </div>
                          <div className="text-left">
                            <p className="text-sm font-bold text-slate-900">{salesName}</p>
                            <p className="text-xs text-slate-400">{pairs.length} CTV • {pairs.reduce((s: number, p: any) => s + p.total_orders, 0)} đơn</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-sm font-bold text-emerald-600">{formatCurrency(salesTotal)}</span>
                          <Link to={`/employees/${sid}`} onClick={e => e.stopPropagation()}
                            className="text-xs text-blue-600 hover:underline px-2 py-1 bg-blue-50 rounded-lg">Xem NV</Link>
                          <ChevronDown className={cn("w-4 h-4 text-slate-400 transition-transform", isOpen && "rotate-180")} />
                        </div>
                      </button>

                      {/* CTV rows */}
                      {isOpen && pairs.map((pair: any) => {
                        const pairKey = `${pair.sales_id}-${pair.ctv_id}`;
                        const isPairOpen = expandedCtv.has(pairKey);
                        const pairOrders = ordersByPair[pairKey] || [];
                        const STATUS_CFG: Record<string, string> = {
                          pending: "bg-amber-100 text-amber-700", shipping: "bg-blue-100 text-blue-700",
                          completed: "bg-emerald-100 text-emerald-700", cancelled: "bg-red-100 text-red-600"
                        };
                        const STATUS_LABEL: Record<string, string> = {
                          pending: "Chờ duyệt", shipping: "Đang giao", completed: "Đã giao", cancelled: "Đã hủy"
                        };
                        return (
                          <div key={pairKey} className="border-t border-slate-50">
                            <button onClick={() => toggle(pairKey)}
                              className="w-full pl-14 pr-5 py-2.5 flex items-center justify-between bg-slate-50/40 hover:bg-slate-50 transition-colors">
                              <div className="flex items-center gap-2">
                                <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 text-xs font-bold">
                                  {pair.ctv_name?.split(" ").map((n: string) => n[0]).join("").slice(0,2).toUpperCase()}
                                </div>
                                <span className="text-sm font-medium text-slate-700">{pair.ctv_name}</span>
                                <span className="text-xs text-slate-400">— {pair.total_orders} đơn · DT {formatCurrency(pair.total_revenue)}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-bold text-emerald-600">{formatCurrency(pair.override_commission)}</span>
                                <ChevronDown className={cn("w-3.5 h-3.5 text-slate-400 transition-transform", isPairOpen && "rotate-180")} />
                              </div>
                            </button>

                            {isPairOpen && pairOrders.length > 0 && (
                              <div className="pl-14 border-t border-slate-100">
                                <table className="w-full text-xs border-collapse">
                                  <thead>
                                    <tr className="bg-slate-50 border-b border-slate-100 text-slate-400 font-semibold">
                                      <th className="px-4 py-2 text-left">Mã đơn</th>
                                      <th className="px-4 py-2 text-left">Ngày</th>
                                      <th className="px-4 py-2 text-left">Khách hàng</th>
                                      <th className="px-4 py-2 text-left">Nhóm BH</th>
                                      <th className="px-4 py-2 text-right">Tổng tiền</th>
                                      <th className="px-4 py-2 text-right">HH override</th>
                                      <th className="px-4 py-2 text-center">Trạng thái</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-slate-50">
                                    {pairOrders.map((o: any) => (
                                      <tr key={o.order_id} className="hover:bg-slate-50/60">
                                        <td className="px-4 py-2">
                                          <Link to={`/orders/edit/${o.order_id}`} className="font-bold text-blue-600 hover:underline font-mono">{o.order_code}</Link>
                                        </td>
                                        <td className="px-4 py-2 text-slate-500">{formatDate(o.order_date)}</td>
                                        <td className="px-4 py-2 text-slate-700">{o.customer_name || "—"}</td>
                                        <td className="px-4 py-2">
                                          {o.group_name ? <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">{o.group_name}</span> : "—"}
                                        </td>
                                        <td className="px-4 py-2 text-right font-semibold text-slate-900">{formatCurrency(o.total_amount)}</td>
                                        <td className="px-4 py-2 text-right font-bold text-emerald-600">{formatCurrency(o.override_commission)}</td>
                                        <td className="px-4 py-2 text-center">
                                          <span className={cn("px-2 py-0.5 rounded-full font-semibold", STATUS_CFG[o.status] || "bg-slate-100 text-slate-600")}>
                                            {STATUS_LABEL[o.status] || o.status}
                                          </span>
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  );
                })}

                {/* Grand total */}
                <div className="px-5 py-3.5 bg-slate-800 text-white flex items-center justify-between text-sm font-bold">
                  <span>Tổng cộng</span>
                  <div className="flex gap-6">
                    <span className="text-slate-400 font-normal">Đơn: {ctvTotals.total_orders || 0}</span>
                    <span className="text-emerald-400">{formatCurrency(ctvTotals.total_override || 0)}</span>
                  </div>
                </div>
              </div>
            );
          })()}
        </div>
      )}

      {/* Bảng chi tiết hoa hồng theo đơn (cả sales lẫn admin đều thấy) */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden min-w-0">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
          <h2 className="text-sm font-bold text-slate-700">
            Chi tiết hoa hồng theo đơn hàng
            {commTotal > 0 && <span className="ml-2 text-xs font-normal text-slate-400">({commTotal} dòng)</span>}
          </h2>
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <span>Hiển thị</span>
            <select
              value={commLimit}
              onChange={e => { setCommLimit(Number(e.target.value)); setCommPage(1); }}
              className="px-2 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs outline-none focus:border-blue-300 cursor-pointer"
            >
              <option value={10}>10</option>
              <option value={20}>20</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
            <span>dòng/trang</span>
          </div>
        </div>
        <div className="min-w-0 overflow-x-auto">
          <table className="w-full text-left border-collapse text-sm min-w-[720px]">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100">
                <th className="px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Mã đơn hàng</th>
                <th className="px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">NHÂN VIÊN</th>
                <th className="px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Khách hàng</th>
                <th className="px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide text-right whitespace-nowrap">Ship / NV chịu</th>
                <th className="px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide text-right whitespace-nowrap">Hoa hồng / Lương</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {orderCommissions.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-5 py-12 text-center text-slate-400">
                    Chưa có hoa hồng trong tháng {month}/{year}
                    {groupId ? ` — nhóm đã chọn` : ""}
                  </td>
                </tr>
              ) : orderCommissions.map((item: any) => {
                const st = statusConfig[item.status] || { label: item.status || "—", color: "bg-slate-50 text-slate-500" };
                return (
                  <tr key={item.id}
                    className="hover:bg-blue-50/40 transition-colors cursor-pointer"
                    onClick={() => openOrderPopup(item)}>
                    <td className="px-5 py-3">
                      <div className="leading-snug">
                        <div className="font-bold text-blue-600 font-mono">{item.order_code}</div>
                        <div className="mt-1">
                          <span className={cn("inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold", st.color)}>
                            {st.label}
                          </span>
                        </div>
                        <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-400">
                          <span>{formatDate(item.order_date)}</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3">
                      <div className="leading-snug">
                        <p className="text-slate-700 font-medium">{item.salesperson_name || "—"}</p>
                        <p className="text-xs text-slate-400 mt-0.5">
                          <span className="text-slate-400">Nhóm BH:</span>{" "}
                          <span className="font-semibold text-slate-600">{item.group_name || "—"}</span>
                        </p>
                        <p className="text-xs text-slate-400 mt-0.5">
                          <span className="text-slate-400">Loại BH:</span>{" "}
                          <span className="font-semibold text-slate-600">
                            {String(item.entry_kind) === "adjustment"
                              ? "Hoàn"
                              : item.type === "direct"
                                ? "Bán hàng"
                                : `Từ CTV${item.ctv_name ? ` (${item.ctv_name})` : ""}`}
                          </span>
                        </p>
                      </div>
                    </td>
                    <td className="px-5 py-3 text-slate-700">
                      <div className="leading-snug">
                        <div>{item.customer_name || "—"}</div>
                        <div className="mt-1 text-xs text-slate-400">
                          Tổng tiền: <span className="font-semibold text-slate-700 tabular-nums">{formatCurrency(item.total_amount)}</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3 text-right tabular-nums">
                      {String(item.entry_kind) === "adjustment" ? (
                        <div className="leading-snug">
                          <p className="text-xs text-slate-400 mt-0.5">
                            <span className="text-slate-400">Ship KH trả:</span>{" "}
                            <span className="font-semibold text-slate-300">—</span>
                          </p>
                          <p className="text-xs text-slate-400 mt-0.5">
                            <span className="text-slate-400">NV chịu:</span>{" "}
                            <span className="font-semibold text-slate-300">—</span>
                          </p>
                        </div>
                      ) : (
                        <div className="leading-snug">
                          <p className="text-xs text-slate-400 mt-0.5">
                            <span className="text-slate-400">Ship KH trả:</span>{" "}
                            <span className={cn("font-semibold", (Number(item.khach_tra_ship) > 0 ? "text-sky-800" : "text-slate-300"))}>
                              {formatCurrency(Number(item.khach_tra_ship) || 0)}
                            </span>
                          </p>
                          <p className="text-xs text-slate-400 mt-0.5">
                            <span className="text-slate-400">NV chịu:</span>{" "}
                            <span className={cn("font-semibold", (Number(item.nv_chiu_display) > 0 ? "text-rose-700" : "text-slate-300"))}>
                              {formatCurrency(Number(item.nv_chiu_display) || 0)}
                            </span>
                          </p>
                        </div>
                      )}
                    </td>
                    <td className="px-5 py-3 text-right tabular-nums">
                      <div className="leading-snug">
                        <p className="text-xs text-slate-400 mt-0.5">
                          <span className="text-slate-400">Hoa hồng:</span>{" "}
                          <span className={cn(
                            "font-bold",
                            String(item.entry_kind) === "adjustment"
                              ? (Number(item.commission_amount) < 0 ? "text-rose-600" : "text-emerald-600")
                              : item.type === "override"
                                ? "text-blue-700"
                                : "text-emerald-600"
                          )}>
                            {formatCurrency(item.commission_amount)}
                          </span>
                        </p>
                        <p className="text-xs text-slate-400 mt-0.5">
                          <span className="text-slate-400">Lương:</span>{" "}
                          <span className={cn(
                            "font-bold",
                            Number(item.luong) < 0 ? "text-red-600" : "text-violet-800"
                          )}>
                            {formatCurrency(Number(item.luong) || 0)}
                          </span>
                        </p>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
            {orderCommissions.length > 0 && (
              <tfoot>
                <tr className="bg-slate-800 text-white text-sm font-bold">
                  <td className="px-5 py-3 align-top" colSpan={2}>
                    <span className="block">Tổng theo trang {commPage}</span>
                    <span className="block text-xs font-normal text-slate-400 mt-1 leading-snug">
                      Chỉ cộng các dòng đang hiển thị ({orderCommissions.length}/{commTotal} dòng trang này) — không phải tổng cả kỳ.
                    </span>
                  </td>
                  <td className="px-5 py-3 text-right tabular-nums align-top">
                    <div className="text-[11px] font-normal text-slate-300 mb-1">Tổng tiền</div>
                    <div className="text-slate-200 tabular-nums">
                      {formatCurrency(orderCommissions.reduce((s: number, i: any) => s + i.total_amount, 0))}
                    </div>
                  </td>
                  <td className="px-5 py-3 text-right tabular-nums align-top">
                    <div className="text-[11px] font-normal text-slate-300 mb-1">Ship KH trả / NV chịu</div>
                    <div className="flex flex-col gap-0.5 items-end">
                      <div className="text-sky-300 tabular-nums">
                        {formatCurrency(orderCommissions.reduce((s: number, i: any) => s + Number(i.khach_tra_ship || 0), 0))}
                      </div>
                      <div className="text-rose-300 tabular-nums">
                        {formatCurrency(orderCommissions.reduce((s: number, i: any) => s + Number(i.nv_chiu_display || 0), 0))}
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-3 text-right tabular-nums align-top">
                    <div className="text-[11px] font-normal text-slate-300 mb-1">Hoa hồng / Lương</div>
                    <div className="flex flex-col gap-0.5 items-end">
                      <div className="text-emerald-400 tabular-nums">
                        {formatCurrency(orderCommissions.reduce((s: number, i: any) => s + i.commission_amount, 0))}
                      </div>
                      <div className="text-white tabular-nums">
                        {formatCurrency(orderCommissions.reduce((s: number, i: any) => s + Number(i.luong || 0), 0))}
                      </div>
                    </div>
                  </td>
                </tr>
                <tr className="bg-violet-50 border-t border-violet-100 text-sm text-slate-800">
                  <td className="px-5 py-3 font-semibold" colSpan={4}>
                    Tổng lương cả kỳ (cùng số thẻ KPI phía trên — gồm mọi dòng, không phân trang)
                  </td>
                  <td className="px-5 py-3 text-right font-bold text-violet-800 tabular-nums text-base">
                    {formatCurrency(summary.total_luong || 0)}
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>

        {/* Phân trang */}
        {commTotal > commLimit && (
          <div className="px-5 py-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
            <p className="text-xs text-slate-400">
              Hiển thị <span className="font-semibold text-slate-700">
                {(commPage - 1) * commLimit + 1}–{Math.min(commPage * commLimit, commTotal)}
              </span> / <span className="font-semibold text-slate-700">{commTotal}</span> dòng
            </p>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setCommPage(p => Math.max(1, p - 1))}
                disabled={commPage === 1}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:bg-slate-200 disabled:opacity-30 transition-all text-sm"
              >‹</button>
              {Array.from({ length: Math.min(5, Math.ceil(commTotal / commLimit)) }, (_, i) => {
                const totalPages = Math.ceil(commTotal / commLimit);
                let p = i + 1;
                if (totalPages > 5) {
                  if (commPage <= 3) p = i + 1;
                  else if (commPage >= totalPages - 2) p = totalPages - 4 + i;
                  else p = commPage - 2 + i;
                }
                return (
                  <button key={p} onClick={() => setCommPage(p)}
                    className={`w-8 h-8 rounded-lg text-xs font-bold transition-all ${
                      commPage === p ? "bg-blue-600 text-white shadow-sm" : "hover:bg-slate-200 text-slate-600"
                    }`}>
                    {p}
                  </button>
                );
              })}
              <button
                onClick={() => setCommPage(p => Math.min(Math.ceil(commTotal / commLimit), p + 1))}
                disabled={commPage >= Math.ceil(commTotal / commLimit)}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:bg-slate-200 disabled:opacity-30 transition-all text-sm"
              >›</button>
            </div>
          </div>
        )}
      </div>

      {/* Popup chi tiết đơn hàng */}
      {orderPopup && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          onClick={() => setOrderPopup(null)}>
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[85vh] flex flex-col"
            onClick={e => e.stopPropagation()}>
            {/* Header */}
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <div>
                <p className="text-lg font-bold text-slate-900 font-mono">{orderPopup.order_code}</p>
                <p className="text-xs text-slate-400 mt-0.5">
                  {formatDate(orderPopup.order_date)} •
                  {orderPopup.customer_name && ` ${orderPopup.customer_name} •`}
                  {orderPopup.group_name && ` ${orderPopup.group_name}`}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <span className={cn("px-2.5 py-1 rounded-full text-xs font-semibold",
                  statusConfig[orderPopup.status]?.color || "bg-slate-100 text-slate-600")}>
                  {statusConfig[orderPopup.status]?.label || orderPopup.status}
                </span>
                <button onClick={() => setOrderPopup(null)}
                  className="p-2 hover:bg-slate-100 rounded-xl text-slate-400 transition-all">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto">
              {popupLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
                </div>
              ) : (
                <>
                  <table className="w-full text-sm border-collapse">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-100">
                        <th className="px-5 py-3 text-xs font-semibold text-slate-500 text-left">Sản phẩm</th>
                        <th className="px-5 py-3 text-xs font-semibold text-slate-500 text-center">SL</th>
                        <th className="px-5 py-3 text-xs font-semibold text-slate-500 text-right">Thành tiền</th>
                        <th className="px-5 py-3 text-xs font-semibold text-slate-500 text-right">HH</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {popupItems.length === 0 ? (
                        <tr><td colSpan={4} className="px-5 py-8 text-center text-slate-400">Không có sản phẩm</td></tr>
                      ) : popupItems.map((item: any, i: number) => {
                        const net = parseFloat(item.unit_price) * parseFloat(item.qty) - parseFloat(item.discount_amount || 0);
                        return (
                          <tr key={i} className="hover:bg-slate-50/50">
                            <td className="px-5 py-3">
                              <p className="font-medium text-slate-800">{item.product_name || item.name}</p>
                              <p className="text-xs text-slate-400 font-mono">{item.sku}</p>
                            </td>
                            <td className="px-5 py-3 text-center text-slate-700">{parseFloat(item.qty)}</td>
                            <td className="px-5 py-3 text-right font-semibold text-slate-900">{formatCurrency(net)}</td>
                            <td className="px-5 py-3 text-right font-bold text-emerald-600">{formatCurrency(parseFloat(item.commission_amount))}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>

                  {/* Footer tổng */}
                  <div className="px-5 py-4 bg-slate-800 text-white flex items-center justify-between text-sm font-bold rounded-b-2xl">
                    <div className="flex gap-6">
                      <span className="text-slate-400 font-normal">Tổng tiền:</span>
                      <span>{formatCurrency(orderPopup.total_amount)}</span>
                    </div>
                    <div className="flex gap-6">
                      <span className="text-slate-400 font-normal">Hoa hồng:</span>
                      <span className="text-emerald-400">{formatCurrency(orderPopup.commission_amount)}</span>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
