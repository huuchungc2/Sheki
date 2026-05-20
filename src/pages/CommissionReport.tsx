import * as React from "react";
import { Link, useLocation, useParams, useSearchParams } from "react-router-dom";
import {
  DollarSign, TrendingUp, Users, Download,
  Loader2, AlertCircle, ChevronRight, ShoppingCart, ChevronDown, Wallet, Truck, CircleDollarSign, ArrowLeft, RefreshCcw, Search, X,
  Filter,
} from "lucide-react";
import { formatCurrency, formatDate, cn, isAdminUser, canViewShopReports } from "../lib/utils";
import { exportSalesCommission, exportAdminCommission } from "../lib/exportExcel";

const API_URL =
  (import.meta as any)?.env?.VITE_API_URL ||
  "/api";

/** Cùng class select như Dashboard (`dashSelectCls`) */
const commSelectCls =
  "min-h-10 rounded-md border border-input bg-background px-3 py-2 text-sm font-medium text-foreground outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background";

const statusConfig: Record<string, { label: string; color: string }> = {
  pending:   { label: "Chờ duyệt", color: "bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950/30 dark:text-amber-300 dark:border-amber-900/50" },
  shipping:  { label: "Đang giao", color: "bg-sky-50 text-sky-700 border border-sky-200 dark:bg-sky-950/30 dark:text-sky-300 dark:border-sky-900/50" },
  completed: { label: "Đã giao",   color: "bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-300 dark:border-emerald-900/50" },
  cancelled: { label: "Đã hủy",   color: "bg-destructive/10 text-destructive border border-destructive/30" },
};

/** Đọc query lần đầu (và deep link) để không fetch một nhịp với tháng/năm mặc định sai. */
function initialCommissionReportFilterState(search: string) {
  const sp = new URLSearchParams(search);
  const mode = sp.get("mode");
  const now = new Date();
  const monthDefault = String(now.getMonth() + 1).padStart(2, "0");
  const yearDefault = String(now.getFullYear());
  const gidRaw = sp.get("group_id");
  const groupId = gidRaw != null ? gidRaw : "";

  if (mode === "payroll") {
    const pid = sp.get("payroll_period_id");
    const pidOk = pid && /^\d+$/.test(String(pid)) ? String(pid) : "";
    return {
      month: monthDefault,
      year: yearDefault,
      filterMode: "payroll" as const,
      payrollPeriodId: pidOk,
      periodTouched: Boolean(pidOk),
      groupId,
    };
  }

  const m = sp.get("month");
  const y = sp.get("year");
  return {
    month: m === "all" ? "all" : (m && /^\d{1,2}$/.test(String(m)) ? String(m).padStart(2, "0") : monthDefault),
    year: y && /^\d{4}$/.test(String(y)) ? String(y) : yearDefault,
    filterMode: "month" as const,
    payrollPeriodId: "",
    periodTouched: false,
    groupId,
  };
}

export function CommissionReport() {
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const [bootstrapFilters] = React.useState(() =>
    initialCommissionReportFilterState(location.search),
  );
  const { userId: userIdFromRoute } = useParams();
  /** Drilldown từ route `/reports/commissions/:userId` */
  const routeSubjectUserId = React.useMemo(() => {
    if (!userIdFromRoute || !/^\d+$/.test(String(userIdFromRoute))) return undefined;
    return parseInt(String(userIdFromRoute), 10);
  }, [userIdFromRoute]);

  const employeeQueryRaw = (searchParams.get("employee") ?? "").trim();
  /** Chỉ khi không có `:userId` trên path — lọc NV trên trang danh sách */
  const employeeFromQuery =
    routeSubjectUserId == null && /^[1-9]\d{0,9}$/.test(employeeQueryRaw)
      ? parseInt(employeeQueryRaw, 10)
      : undefined;
  const filterSubjectUserId = routeSubjectUserId ?? employeeFromQuery;

  const patchEmployeeSearchParam = React.useCallback(
    (id: string | null) => {
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          if (id) next.set("employee", id);
          else next.delete("employee");
          return next;
        },
        { replace: true }
      );
    },
    [setSearchParams]
  );

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
  // `isAdmin` = "được xem báo cáo toàn shop" — bao gồm Admin/Super Admin và Sales được cấp scope `reports = shop`.
  const isAdmin = isAdminUser(currentUser) || canViewShopReports(currentUser);
  /** Route `/reports/commissions/:userId` — tiêu đề + nút back; vẫn hiển thị bảng NV/CTV (lọc 1 NV) */
  const routeDrilldown = Boolean(isAdmin && routeSubjectUserId != null);
  /** Lọc theo 1 NV: `?employee=` hoặc route `:userId` */
  const activeEmployeeId = filterSubjectUserId ?? null;
  const [employeeSelectedName, setEmployeeSelectedName] = React.useState<string>("");

  React.useEffect(() => {
    if (!isAdmin && employeeQueryRaw) {
      patchEmployeeSearchParam(null);
    }
  }, [isAdmin, employeeQueryRaw, patchEmployeeSearchParam]);

  React.useEffect(() => {
    if (routeSubjectUserId == null || !employeeQueryRaw) return;
    patchEmployeeSearchParam(null);
  }, [routeSubjectUserId, employeeQueryRaw, patchEmployeeSearchParam]);

  React.useEffect(() => {
    if (filterSubjectUserId == null) {
      setEmployeeSelectedName("");
      return;
    }
    const token = localStorage.getItem("token");
    fetch(`${API_URL}/users/${filterSubjectUserId}`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => (r.ok ? r.json() : null))
      .then(j => setEmployeeSelectedName(String(j?.data?.full_name || "")))
      .catch(() => setEmployeeSelectedName(""));
  }, [filterSubjectUserId]);

  const [loading, setLoading]   = React.useState(true);
  const [error, setError]       = React.useState<string | null>(null);

  // Filter state — bootstrap từ URL (lazy) để lần fetch đầu khớp tháng/năm hoặc kỳ lương trên link.
  const [month, setMonth]     = React.useState(bootstrapFilters.month);
  const [year, setYear]       = React.useState(bootstrapFilters.year);
  const [groupId, setGroupId] = React.useState(bootstrapFilters.groupId);
  const [groups, setGroups]   = React.useState<any[]>([]);
  const [filterMode, setFilterMode] = React.useState<"payroll" | "month">(bootstrapFilters.filterMode);
  const [payrollPeriods, setPayrollPeriods] = React.useState<any[]>([]);
  const [payrollPeriodId, setPayrollPeriodId] = React.useState<string>(bootstrapFilters.payrollPeriodId);
  const [periodTouched, setPeriodTouched] = React.useState(bootstrapFilters.periodTouched);
  const [payrollReady, setPayrollReady] = React.useState(false);

  const periodTouchedRef = React.useRef(bootstrapFilters.periodTouched);
  const payrollPeriodIdRef = React.useRef(bootstrapFilters.payrollPeriodId);
  const fetchSeqRef = React.useRef(0);
  const skipUrlHydrateRef = React.useRef(false);
  React.useEffect(() => {
    periodTouchedRef.current = periodTouched;
  }, [periodTouched]);
  React.useEffect(() => {
    payrollPeriodIdRef.current = payrollPeriodId;
  }, [payrollPeriodId]);

  const writeFilterToUrl = React.useCallback(
    (next: {
      filterMode?: "payroll" | "month";
      month?: string;
      year?: string;
      groupId?: string;
      payrollPeriodId?: string;
    }) => {
      skipUrlHydrateRef.current = true;
      setSearchParams(
        (prev) => {
          const sp = new URLSearchParams(prev);
          const mode = next.filterMode ?? filterMode;
          if (mode === "payroll") {
            sp.set("mode", "payroll");
            const pid = next.payrollPeriodId ?? payrollPeriodId;
            if (pid) sp.set("payroll_period_id", pid);
            else sp.delete("payroll_period_id");
            sp.delete("month");
            sp.delete("year");
          } else {
            sp.set("mode", "month");
            sp.delete("payroll_period_id");
            const m = next.month ?? month;
            const y = next.year ?? year;
            if (m) sp.set("month", m);
            if (y) sp.set("year", y);
          }
          const gid = next.groupId ?? groupId;
          if (gid) sp.set("group_id", gid);
          else sp.delete("group_id");
          return sp;
        },
        { replace: true }
      );
    },
    [filterMode, month, year, groupId, payrollPeriodId, setSearchParams]
  );

  // Hydrate filter từ URL (back/forward, deep link) — mặc định «Tháng» nếu không có mode.
  // Example: /reports/commissions/12?mode=month&month=04&year=2026&group_id=3
  React.useEffect(() => {
    if (skipUrlHydrateRef.current) {
      skipUrlHydrateRef.current = false;
      return;
    }
    const sp = new URLSearchParams(location.search);
    const mode = sp.get("mode");
    const m = sp.get("month");
    const y = sp.get("year");
    const gid = sp.get("group_id");
    const pid = sp.get("payroll_period_id");

    if (gid != null) setGroupId(gid);
    if (mode === "payroll") {
      setFilterMode("payroll");
      if (pid && /^\d+$/.test(String(pid))) {
        setPeriodTouched(true);
        setPayrollPeriodId(String(pid));
      }
      return;
    }
    setFilterMode("month");
    if (m === "all") setMonth("all");
    else if (m && /^\d{1,2}$/.test(m)) setMonth(String(m).padStart(2, "0"));
    if (y && /^\d{4}$/.test(y)) setYear(String(y));
  }, [location.search, routeSubjectUserId]);

  const periodLabelShort = React.useMemo(() => {
    if (filterMode === "payroll") return payrollPeriodId ? `Kỳ #${payrollPeriodId}` : "Kỳ lương";
    return month === "all" ? `Năm ${year}` : `Tháng ${parseInt(month, 10)}/${year}`;
  }, [filterMode, payrollPeriodId, month, year]);

  const buildEmployeeDetailUrl = React.useCallback((uid: number | string) => {
    const sp = new URLSearchParams();
    if (groupId) sp.set("group_id", groupId);
    if (filterMode === "payroll") {
      sp.set("mode", "payroll");
      if (payrollPeriodId) sp.set("payroll_period_id", payrollPeriodId);
    } else {
      sp.set("mode", "month");
      sp.set("month", month);
      sp.set("year", year);
    }
    const qs = sp.toString();
    return `/reports/commissions/${uid}${qs ? `?${qs}` : ""}`;
  }, [filterMode, groupId, month, payrollPeriodId, year]);

  const buildListUrl = React.useCallback(() => {
    const sp = new URLSearchParams();
    if (groupId) sp.set("group_id", groupId);
    if (filterMode === "payroll") {
      sp.set("mode", "payroll");
      if (payrollPeriodId) sp.set("payroll_period_id", payrollPeriodId);
    } else {
      sp.set("mode", "month");
      sp.set("month", month);
      sp.set("year", year);
    }
    const qs = sp.toString();
    return `/reports/commissions${qs ? `?${qs}` : ""}`;
  }, [filterMode, groupId, month, payrollPeriodId, year]);

  // Sales view data (từ /commissions/orders)
  const [orderCommissions, setOrderCommissions] = React.useState<any[]>([]);
  const [summary, setSummary] = React.useState<any>({
    direct_commission: 0,
    override_commission: 0,
    total_commission: 0,
    total_orders: 0,
    total_khach_ship: 0,
    total_nv_chiu: 0,
    total_return_commission_abs: 0,
    total_luong: 0,
  });
  const [returnsSummary, setReturnsSummary] = React.useState<any>({
    return_orders: 0,
    return_revenue: 0,
    return_commission: 0, // backward: direct abs
    return_commission_direct_abs: 0,
    return_commission_override_abs: 0,
    return_commission_total_abs: 0,
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

  const [showEmployeeMenu, setShowEmployeeMenu] = React.useState(false);
  const [employeeQuery, setEmployeeQuery] = React.useState("");
  const [employeeOptions, setEmployeeOptions] = React.useState<any[]>([]);
  const [employeeLoading, setEmployeeLoading] = React.useState(false);

  React.useEffect(() => {
    if (!isAdmin || !showEmployeeMenu) return;
    const q = employeeQuery.trim();
    const t = window.setTimeout(async () => {
      try {
        setEmployeeLoading(true);
        const token = localStorage.getItem("token") || "";
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
  }, [isAdmin, showEmployeeMenu, employeeQuery]);

  // Fetch groups
  React.useEffect(() => {
    const token = localStorage.getItem("token");
    const endpoint = isAdmin ? "/groups" : `/groups/user/${currentUser?.id}`;
    fetch(`${API_URL}${endpoint}`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json()).then(j => setGroups(j.data || [])).catch(() => {});
  }, [isAdmin, currentUser?.id]);

  const fetchPayrollPeriods = React.useCallback(async (): Promise<string> => {
    try {
      const token = localStorage.getItem("token");
      const [curRes, listRes] = await Promise.all([
        fetch(`${API_URL}/payroll/periods/current`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${API_URL}/payroll/periods`, { headers: { Authorization: `Bearer ${token}` } }),
      ]);
      if (!curRes.ok || !listRes.ok) return payrollPeriodIdRef.current || "";
      const curJ = await curRes.json();
      const listJ = await listRes.json();
      const cur = curJ?.data;
      const list = listJ?.data || [];
      const openId = cur?.id != null ? String(cur.id) : "";
      setPayrollPeriods(list);

      const ids = new Set(list.map((p: any) => String(p.id)));
      const openExists = openId && ids.has(openId);
      const prev = payrollPeriodIdRef.current;
      const touched = periodTouchedRef.current;
      const prevOk = prev && ids.has(prev);
      let resolvedId = prev;
      if (!prevOk) resolvedId = openExists ? openId : prev;
      else if (!touched) resolvedId = openExists ? openId : prev;

      payrollPeriodIdRef.current = resolvedId;
      setPayrollPeriodId(resolvedId);
      setPayrollReady(true);
      return resolvedId;
    } catch {
      return payrollPeriodIdRef.current || "";
    }
  }, []);

  // Fetch payroll periods (for Admin + Sales) — refresh when user/shop changes too
  React.useEffect(() => {
    fetchPayrollPeriods();
  }, [fetchPayrollPeriods, currentUser?.id]);

  const fetchReport = React.useCallback(async () => {
    const seq = ++fetchSeqRef.current;
    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem("token");
      const params = new URLSearchParams({ page: String(commPage), limit: String(commLimit) });
      let activePayrollPeriodId = payrollPeriodIdRef.current || payrollPeriodId;
      if (filterMode === "payroll") {
        if (!activePayrollPeriodId) {
          activePayrollPeriodId = await fetchPayrollPeriods();
        }
        if (!activePayrollPeriodId) {
          if (seq !== fetchSeqRef.current) return;
          setError(
            "Không tải được kỳ lương. Kiểm tra quyền «Lương / tổng hợp nhân viên» hoặc chọn «Tháng» để xem theo lịch."
          );
          return;
        }
        params.set("mode", "payroll");
        params.set("payroll_period_id", String(activePayrollPeriodId));
      } else {
        params.set("mode", "month");
        params.set("month", month);
        params.set("year", year);
      }
      if (groupId) params.set("group_id", groupId);
      if (filterSubjectUserId != null) params.set("user_id", String(filterSubjectUserId));

      if (seq !== fetchSeqRef.current) return;
      setSummary({
        direct_commission: 0,
        override_commission: 0,
        total_commission: 0,
        total_orders: 0,
        total_khach_ship: 0,
        total_nv_chiu: 0,
        total_return_commission_abs: 0,
        total_luong: 0,
      });
      setOrderCommissions([]);
      setSalesData([]);
      setCtvPairs([]);
      setCtvOrders([]);
      setCtvTotals({});
      setReturnsSummary({
        return_orders: 0,
        return_revenue: 0,
        return_commission: 0,
        return_commission_direct_abs: 0,
        return_commission_override_abs: 0,
        return_commission_total_abs: 0,
      });

      // 1. Chi tiết theo đơn (cùng API «Hoa hồng của tôi»; Admin + user_id = 1 NV)
      const [orderRes, returnsRes] = await Promise.all([
        fetch(`${API_URL}/commissions/orders?${params}`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${API_URL}/reports/returns-summary?${params}`, { headers: { Authorization: `Bearer ${token}` } }),
      ]);
      if (seq !== fetchSeqRef.current) return;
      if (!orderRes.ok) throw new Error("Không thể tải báo cáo hoa hồng");
      const orderJson = await orderRes.json();
      if (seq !== fetchSeqRef.current) return;
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
          return_commission_direct_abs:
            Number(rj?.data?.return_commission_direct_abs) || Number(rj?.data?.return_commission) || 0,
          return_commission_override_abs: Number(rj?.data?.return_commission_override_abs) || 0,
          return_commission_total_abs: Number(rj?.data?.return_commission_total_abs) || 0,
        });
      }

      // 3. Bảng Hoa hồng NV + CTV (Admin/Sales); lọc 1 NV qua ?employee= hoặc route :userId
      const salaryParams = new URLSearchParams();
      if (filterMode === "payroll" && activePayrollPeriodId) {
        salaryParams.set("mode", "payroll");
        salaryParams.set("payroll_period_id", String(activePayrollPeriodId));
      } else {
        salaryParams.set("mode", "month");
        salaryParams.set("month", month);
        salaryParams.set("year", year);
      }
      if (groupId) salaryParams.set("group_id", groupId);
      if (activeEmployeeId != null) salaryParams.set("employee", String(activeEmployeeId));

      const ctvParams = new URLSearchParams(salaryParams);
      const ctvSalesId =
        !isAdmin && currentUser?.id != null
          ? Number(currentUser.id)
          : activeEmployeeId != null
            ? activeEmployeeId
            : null;
      if (ctvSalesId != null) ctvParams.set("sales_id", String(ctvSalesId));

      const [salaryRes, ctvRes] = await Promise.all([
        fetch(`${API_URL}/reports/salary?${salaryParams}`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${API_URL}/collaborators/commissions/all?${ctvParams}`, { headers: { Authorization: `Bearer ${token}` } }),
      ]);

      if (seq !== fetchSeqRef.current) return;
      if (salaryRes.ok) {
        const j = await salaryRes.json();
        let sd = j.data?.salesData || [];
        if (activeEmployeeId != null) {
          sd = sd.filter((row: any) => Number(row.id) === activeEmployeeId);
        }
        setSalesData(sd);

        const mergeSalaryKpi = (rows: any[], sum: any) => {
          const sumOrders = rows.reduce((acc: number, i: any) => acc + (Number(i.total_orders) || 0), 0);
          const sumShip = rows.reduce((acc: number, i: any) => acc + (Number(i.total_khach_ship) || 0), 0);
          const sumNv = rows.reduce((acc: number, i: any) => acc + (Number(i.total_nv_chiu) || 0), 0);
          const sumLuong = rows.reduce((acc: number, i: any) => acc + (Number(i.total_luong) || 0), 0);
          const ordersAll = Number(sum?.totalOrdersAll) || 0;
          const kpiD = Number(sum?.kpi_direct_gross);
          const kpiO = Number(sum?.kpi_override_net);
          const kpiT = Number(sum?.kpi_total_hh);
          const kpiLuong = Number(sum?.kpi_total_luong);
          const kpiShip = Number(sum?.kpi_total_khach_ship);
          const kpiNv = Number(sum?.kpi_total_nv_chiu);
          const kpiRet = Number(sum?.kpi_return_commission);
          const fallbackD = rows.reduce((acc: number, i: any) => acc + (Number(i.direct_commission) || 0), 0);
          const fallbackO = rows.reduce((acc: number, i: any) => acc + (Number(i.override_commission) || 0), 0);
          const fallbackRet = rows.reduce((acc: number, i: any) => acc + (Number(i.total_return_commission_abs) || 0), 0);
          return {
            direct_commission: Number.isFinite(kpiD) ? kpiD : fallbackD,
            override_commission: Number.isFinite(kpiO) ? kpiO : fallbackO,
            total_commission: Number.isFinite(kpiT) ? kpiT : fallbackD + fallbackO,
            total_orders: ordersAll || sumOrders,
            total_khach_ship: Number.isFinite(kpiShip) ? kpiShip : sumShip,
            total_nv_chiu: Number.isFinite(kpiNv) ? kpiNv : sumNv,
            total_return_commission_abs: Number.isFinite(kpiRet) ? kpiRet : fallbackRet,
            total_luong: Number.isFinite(kpiLuong) ? kpiLuong : sumLuong,
          };
        };

        if (activeEmployeeId == null) {
          setSummary((prev: any) => ({ ...prev, ...mergeSalaryKpi(sd, j.data?.summary) }));
        } else if (sd.length > 0) {
          setSummary((prev: any) => ({ ...prev, ...mergeSalaryKpi(sd, j.data?.summary) }));
        }
      } else if (salaryRes.status === 403) {
        setError((prev) =>
          prev ||
          "Không có quyền xem bảng lương/HH nhân viên (feature «Lương / tổng hợp»). Liên hệ Admin shop."
        );
      } else if (!salaryRes.ok && activeEmployeeId != null) {
        setError((prev) => prev || "Không tải được bảng HH nhân viên. Thử lại hoặc kiểm tra quyền «Lương / tổng hợp».");
      }

      // Lọc 1 NV: nếu salary rỗng nhưng chi tiết đơn có dữ liệu → dựng 1 dòng bảng NV từ KPI đơn
      if (seq === fetchSeqRef.current && activeEmployeeId != null) {
        setSalesData((prev) => {
          if (prev.length > 0) return prev;
          const os = orderJson.summary;
          const hasOrders =
            (Number(os?.total_orders) || 0) > 0 ||
            (orderJson.data?.length || 0) > 0 ||
            (Number(os?.direct_commission) || 0) !== 0;
          if (!hasOrders) return prev;
          const direct = Number(os?.direct_commission) || 0;
          const override = Number(os?.override_commission) || 0;
          return [
            {
              id: activeEmployeeId,
              full_name: employeeSelectedName || `NV #${activeEmployeeId}`,
              total_orders: Number(os?.total_orders) || 0,
              total_sales: 0,
              direct_commission: direct,
              override_commission: override,
              total_all_commission: direct + override,
              total_khach_ship: Number(os?.total_khach_ship) || 0,
              total_nv_chiu: Number(os?.total_nv_chiu) || 0,
              total_luong: Number(os?.total_luong) || 0,
              total_return_commission_abs: Number(os?.total_return_commission_abs) || 0,
            },
          ];
        });
      }

      if (seq !== fetchSeqRef.current) return;
      if (ctvRes.ok) {
        const j = await ctvRes.json();
        const pairs = j.data?.pairs || [];
        const orders = j.data?.orders || [];
        setCtvPairs(pairs);
        setCtvOrders(orders);
        setCtvTotals({
          total_override: pairs.reduce((s: number, p: any) => s + (Number(p.override_commission) || 0), 0),
          total_orders: pairs.reduce((s: number, p: any) => s + (Number(p.total_orders) || 0), 0),
        });
      } else {
        setCtvPairs([]);
        setCtvOrders([]);
        setCtvTotals({});
      }
    } catch (err: any) {
      setError(err.message || "Đã xảy ra lỗi");
    } finally {
      setLoading(false);
    }
  }, [
    month,
    year,
    groupId,
    commPage,
    commLimit,
    isAdmin,
    currentUser?.id,
    routeDrilldown,
    activeEmployeeId,
    filterSubjectUserId,
    filterMode,
    filterMode === "payroll" ? payrollPeriodId : "",
    fetchPayrollPeriods,
  ]);

  // Reset page khi filter hoặc limit / NV thay đổi
  React.useEffect(() => { setCommPage(1); }, [month, year, groupId, commLimit, filterSubjectUserId, filterMode, payrollPeriodId]);

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
      const allParams = new URLSearchParams({ page: "1", limit: "9999" });
      let exportPayrollId = payrollPeriodIdRef.current || payrollPeriodId;
      if (filterMode === "payroll") {
        if (!exportPayrollId) {
          exportPayrollId = await fetchPayrollPeriods();
        }
        if (!exportPayrollId) return;
        allParams.set("mode", "payroll");
        allParams.set("payroll_period_id", String(exportPayrollId));
      } else {
        allParams.set("mode", "month");
        allParams.set("month", month);
        allParams.set("year", year);
      }
      if (groupId) allParams.set("group_id", groupId);
      if (filterSubjectUserId != null) allParams.set("user_id", String(filterSubjectUserId));
      const allRes = await fetch(`${API_URL}/commissions/orders?${allParams}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const allJson = await allRes.json();
      const allOrders = allJson.data || [];
      const periodSummary = { ...summary, ...(allJson.summary || {}) };

      if (isAdmin) {
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
          userName: activeEmployeeId != null
            ? (employeeSelectedName || `NV #${filterSubjectUserId}`)
            : (currentUser?.full_name || "NhanVien"),
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
        <Loader2 className="w-10 h-10 text-primary animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <AlertCircle className="w-14 h-14 text-destructive/70" />
        <p className="text-base font-semibold text-foreground">{error}</p>
        <button onClick={fetchReport} className="h-10 px-5 bg-primary text-primary-foreground rounded-md text-sm font-semibold hover:opacity-95 transition-opacity">Thử lại</button>
      </div>
    );
  }

  const isSalesMyCommission = !isAdmin && !routeDrilldown;
  const totalOrdersWithReturns = Number(summary.total_orders) || 0;

  // (chart removed per request)

  return (
    <div className="space-y-6 min-w-0 max-w-full overflow-x-hidden">
      {/* Tiêu đề */}
      <div className="flex items-start gap-3 min-w-0">
          {routeDrilldown && (
            <Link
              to={buildListUrl()}
              className="mt-1 p-2 rounded-lg text-muted-foreground hover:bg-accent transition-colors shrink-0"
              title="Về báo cáo toàn bộ"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
          )}
          <div className="min-w-0">
            <h1 className="text-2xl font-semibold tracking-tight text-foreground break-words">
              {routeDrilldown
                ? `Hoa hồng: ${employeeSelectedName || `Nhân viên #${filterSubjectUserId}`}`
                : "Báo cáo hoa hồng"}
            </h1>
            <p className="text-muted-foreground text-sm mt-0.5 break-words">
              {activeEmployeeId != null
                ? `Đang xem nhân viên: ${employeeSelectedName || `#${activeEmployeeId}`} — KPI, bảng NV/CTV và chi tiết đơn theo NV này.`
                : "Tổng hợp hoa hồng theo menu Admin; dữ liệu sẽ tự co theo phạm vi (cá nhân/nhóm/toàn shop)."}
            </p>
          </div>
      </div>

      {/* Lọc — cùng layout/chữ như Dashboard */}
      <div className="rounded-xl border border-border bg-card p-4 shadow-sm md:p-5 space-y-4">
        <div className="flex items-center gap-2 text-foreground">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-muted text-muted-foreground">
            <Filter className="h-4 w-4" />
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground">Lọc báo cáo</p>
            <p className="text-xs text-muted-foreground">
              {isAdmin && !userIdFromRoute ? "Admin: nhân viên, " : ""}
              nhóm bán hàng, kỳ (tháng/năm hoặc kỳ lương)
            </p>
          </div>
        </div>
        <div className="flex flex-col gap-4 lg:flex-row lg:flex-wrap lg:items-end lg:justify-between">
          <div className="flex flex-col gap-4 lg:flex-row lg:flex-wrap lg:items-end">
          {isAdmin && !userIdFromRoute ? (
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
                  {employeeFromQuery
                    ? employeeSelectedName || `NV #${employeeFromQuery}`
                    : "Tất cả nhân viên"}
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
                        className="absolute right-2 top-1/2 -translate-y-1/2 rounded hover:bg-accent text-muted-foreground hover:text-foreground"
                        title="Đóng"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        patchEmployeeSearchParam(null);
                        setShowEmployeeMenu(false);
                      }}
                      className={cn(
                        "mt-2 w-full text-left px-3 py-2 rounded-lg text-sm transition-colors",
                        !employeeFromQuery ? "bg-accent text-accent-foreground font-semibold" : "hover:bg-accent/50 text-foreground"
                      )}
                    >
                      Tất cả nhân viên
                    </button>
                  </div>
                  <div className="max-h-72 overflow-auto">
                    {employeeLoading ? (
                      <div className="px-3 py-3 text-sm text-muted-foreground flex items-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Đang tải...
                      </div>
                    ) : employeeOptions.length === 0 ? (
                      <div className="px-3 py-3 text-sm text-muted-foreground">Không tìm thấy nhân viên</div>
                    ) : (
                      employeeOptions.map((emp: any) => (
                        <button
                          key={emp.id}
                          type="button"
                          onClick={() => {
                            patchEmployeeSearchParam(String(emp.id));
                            setEmployeeSelectedName(String(emp.full_name || ""));
                            setShowEmployeeMenu(false);
                          }}
                          className={cn(
                            "w-full text-left px-3 py-2.5 text-sm hover:bg-accent/50 transition-colors",
                            String(employeeFromQuery) === String(emp.id)
                              ? "bg-accent text-accent-foreground font-semibold"
                              : "text-foreground"
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
          ) : null}
            <label className="flex flex-col gap-1.5 min-w-[180px]">
              <span className="text-xs font-medium text-muted-foreground">Nhóm bán hàng</span>
              <select
                value={groupId}
                onChange={(e) => {
                  const v = e.target.value;
                  setGroupId(v);
                  writeFilterToUrl({ groupId: v });
                }}
                className={commSelectCls}
              >
                <option value="">Tất cả nhóm</option>
                {groups.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.name}
                  </option>
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
                    onClick={() => {
                      setFilterMode("payroll");
                      writeFilterToUrl({ filterMode: "payroll", payrollPeriodId });
                    }}
                    className={cn(
                      "rounded-md px-3 py-2 text-xs font-semibold transition",
                      filterMode === "payroll"
                        ? "bg-background text-foreground shadow-sm border border-border"
                        : "text-muted-foreground hover:text-foreground",
                      payrollPeriods.length === 0 && "opacity-50 cursor-not-allowed"
                    )}
                  >
                    Kỳ lương
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setFilterMode("month");
                      writeFilterToUrl({ filterMode: "month", month, year });
                    }}
                    className={cn(
                      "rounded-md px-3 py-2 text-xs font-semibold transition",
                      filterMode === "month"
                        ? "bg-background text-foreground shadow-sm border border-border"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    Tháng
                  </button>
                </div>

          {filterMode === "payroll" ? (
            <select
              value={payrollPeriodId}
              onChange={(e) => {
                const v = e.target.value;
                setPeriodTouched(true);
                setPayrollPeriodId(v);
                writeFilterToUrl({ filterMode: "payroll", payrollPeriodId: v });
              }}
              className={cn(commSelectCls, "min-w-[12rem]")}
            >
              {payrollPeriods.map((p: any) => (
                <option key={p.id} value={String(p.id)}>
                  #{p.id} • {p.status === "open" ? "Đang mở" : "Đã chốt"} • {formatDate(p.from_at)}
                  {p.to_at ? ` → ${formatDate(p.to_at)}` : ""}
                </option>
              ))}
            </select>
          ) : (
            <>
              <select
                value={month}
                onChange={(e) => {
                  const v = e.target.value;
                  setMonth(v);
                  writeFilterToUrl({ filterMode: "month", month: v, year });
                }}
                className={cn(commSelectCls, "w-[130px]")}
              >
                <option value="all">Tất cả (cả năm)</option>
                {Array.from({ length: 12 }, (_, i) => (
                  <option key={i + 1} value={String(i + 1).padStart(2, "0")}>Tháng {i + 1}</option>
                ))}
              </select>
              <select
                value={year}
                onChange={(e) => {
                  const v = e.target.value;
                  setYear(v);
                  writeFilterToUrl({ filterMode: "month", month, year: v });
                }}
                className={cn(commSelectCls, "w-[100px]")}
              >
                {[2024, 2025, 2026, 2027].map(y => <option key={y} value={y}>{y}</option>)}
              </select>
            </>
          )}
          {filterMode === "payroll" ? (
            <button
              type="button"
              onClick={() => fetchPayrollPeriods()}
              className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-border bg-background text-muted-foreground hover:bg-accent transition-colors"
              title="Làm mới danh sách kỳ lương"
            >
              <RefreshCcw className="w-4 h-4" />
            </button>
          ) : null}
              </div>
            </div>
        </div>
          <button
            type="button"
            onClick={handleExport}
            disabled={loading || exporting}
            className="inline-flex h-10 shrink-0 items-center gap-2 whitespace-nowrap rounded-md bg-primary px-4 text-sm font-semibold text-primary-foreground shadow-sm transition-opacity hover:opacity-95 disabled:opacity-50">
            {exporting
              ? <><Loader2 className="w-4 h-4 animate-spin" /> Đang xuất...</>
              : <><Download className="w-4 h-4" /> Xuất Excel</>
            }
          </button>
        </div>
        {routeDrilldown && isAdmin ? (
          <p className="text-xs text-muted-foreground">
            KPI theo nhân viên bán (salesperson): hoa hồng trực tiếp/CTV, đơn chi tiết, hoàn, ship/NV chịu, tổng lương trong kỳ đã chọn.
          </p>
        ) : null}
      </div>

      {/* KPI — cùng Dashboard; [&>*]:min-w-0 tránh grid làm tràn ngang (min-width: auto mặc định) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 w-full min-w-0 [&>*]:min-w-0">
        <div className="kpi-card kpi-card--commission-direct p-5 rounded-xl shadow-sm min-w-0">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center mb-3 kpi-icon kpi-icon--commission-direct">
            <TrendingUp className="w-4 h-4" />
          </div>
          <p className="text-xs font-semibold uppercase tracking-wide kpi-title kpi-icon--commission-direct">HH bán hàng</p>
          <p className="text-xl font-bold mt-1 break-words tabular-nums kpi-metric kpi-icon--commission-direct">{formatCurrency(summary.direct_commission || 0)}</p>
          <p className="text-xs text-muted-foreground mt-1 break-words">Từ đơn tự bán</p>
        </div>

        <div className="kpi-card kpi-card--commission p-5 rounded-xl shadow-sm min-w-0">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center mb-3 kpi-icon kpi-icon--commission">
            <Users className="w-4 h-4" />
          </div>
          <p className="text-xs font-semibold uppercase tracking-wide kpi-title kpi-icon--commission">HH từ CTV</p>
          <p className="text-xl font-bold mt-1 break-words tabular-nums kpi-metric kpi-icon--commission">
            {formatCurrency(summary.override_commission || 0)}
          </p>
          {isSalesMyCommission ? (
            <p className="text-xs text-muted-foreground mt-1 leading-snug break-words" title="Override cho quản lý khi CTV lên đơn ghi nhận quản lý. Nếu bạn chỉ là CTV, thường = 0; HH của bạn nằm ở «HH bán hàng».">
              Tổng HH: {formatCurrency(summary.total_commission || 0)}
            </p>
          ) : (
            <p className="text-xs text-muted-foreground mt-1 leading-snug line-clamp-3 break-words" title="Chỉ khi bạn là quản lý nhận override; đơn ghi nhận quản lý + cặp collaborators + tier. Nếu bạn chỉ là người lên đơn (CTV), HH nằm ở «HH bán hàng».">
              {routeDrilldown
                ? "Tiền quản lý nhận từ đơn CTV — nếu chỉ là CTV, thường = 0"
                : "Override quản lý trên đơn CTV"}
            </p>
          )}
        </div>

        <div className="kpi-card kpi-card--commission p-5 rounded-xl shadow-sm min-w-0">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center mb-3 kpi-icon kpi-icon--commission">
            <DollarSign className="w-4 h-4" />
          </div>
          <p className="text-xs font-semibold uppercase tracking-wide kpi-title kpi-icon--commission">Tổng hoa hồng</p>
          <p className="text-xl font-bold mt-1 break-words tabular-nums kpi-metric kpi-icon--commission">
            {formatCurrency((summary.direct_commission || 0) + (summary.override_commission || 0))}
          </p>
          <p className="text-xs text-muted-foreground mt-1 break-words">Bán hàng + CTV</p>
        </div>

        <div className="kpi-card kpi-card--orders p-5 rounded-xl shadow-sm min-w-0">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center mb-3 kpi-icon kpi-icon--orders">
            <ShoppingCart className="w-4 h-4" />
          </div>
          <p className="text-xs font-semibold uppercase tracking-wide kpi-title kpi-icon--orders">Số đơn hàng</p>
          <p className="text-xl font-bold mt-1 tabular-nums kpi-metric kpi-icon--orders">{totalOrdersWithReturns}</p>
          <p className="text-xs text-muted-foreground mt-1 break-words">{periodLabelShort}</p>
        </div>
      </div>

      {/* Return KPIs — giống Dashboard */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 w-full min-w-0 [&>*]:min-w-0">
        <div className="kpi-card kpi-card--returns p-5 rounded-xl shadow-sm min-w-0">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center mb-3 kpi-icon kpi-icon--returns">
            <DollarSign className="w-4 h-4" />
          </div>
          <p className="text-xs font-semibold uppercase tracking-wide kpi-title kpi-icon--returns">Tổng doanh số hoàn</p>
          <p className="text-xl font-bold mt-1 break-words tabular-nums kpi-metric kpi-icon--returns">
            {formatCurrency(-(returnsSummary.return_revenue || 0))}
          </p>
          <p className="text-xs text-muted-foreground mt-1 break-words">{periodLabelShort}</p>
        </div>
        <div className="kpi-card kpi-card--return-commission p-5 rounded-xl shadow-sm min-w-0">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center mb-3 kpi-icon kpi-icon--return-commission">
            <TrendingUp className="w-4 h-4" />
          </div>
          <p className="text-xs font-semibold uppercase tracking-wide kpi-title kpi-icon--return-commission">HH hoàn (Sale)</p>
          <p className="text-xl font-bold mt-1 break-words tabular-nums kpi-metric kpi-icon--return-commission">
            −{formatCurrency(returnsSummary.return_commission_direct_abs || 0)}
          </p>
          <p className="text-xs text-muted-foreground mt-1 break-words">{periodLabelShort}</p>
        </div>
        <div className="kpi-card kpi-card--return-commission p-5 rounded-xl shadow-sm min-w-0">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center mb-3 kpi-icon kpi-icon--return-commission">
            <TrendingUp className="w-4 h-4" />
          </div>
          <p className="text-xs font-semibold uppercase tracking-wide kpi-title kpi-icon--return-commission">HH hoàn (Quản lý)</p>
          <p className="text-xl font-bold mt-1 break-words tabular-nums kpi-metric kpi-icon--return-commission">
            −{formatCurrency(returnsSummary.return_commission_override_abs || 0)}
          </p>
          <p className="text-xs text-muted-foreground mt-1 break-words">{periodLabelShort}</p>
        </div>
        <div className="kpi-card kpi-card--returns p-5 rounded-xl shadow-sm min-w-0">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center mb-3 kpi-icon kpi-icon--returns">
            <ShoppingCart className="w-4 h-4" />
          </div>
          <p className="text-xs font-semibold uppercase tracking-wide kpi-title kpi-icon--returns">Tổng đơn hoàn</p>
          <p className="text-xl font-bold mt-1 tabular-nums kpi-metric kpi-icon--returns">{returnsSummary.return_orders || 0}</p>
          <p className="text-xs text-muted-foreground mt-1 break-words">{periodLabelShort}</p>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 w-full min-w-0 [&>*]:min-w-0">
        <div className="kpi-card kpi-card--ship p-5 rounded-xl shadow-sm min-w-0">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center mb-3 kpi-icon kpi-icon--ship">
            <Truck className="w-4 h-4" />
          </div>
          <p className="text-xs font-semibold uppercase tracking-wide kpi-title kpi-icon--ship">Ship KH Trả</p>
          <p className="text-xl font-bold mt-1 tabular-nums break-words kpi-metric kpi-icon--ship">{formatCurrency(summary.total_khach_ship || 0)}</p>
          <p className="text-xs text-muted-foreground mt-0.5 break-words leading-snug">
            {isSalesMyCommission ? "Đơn bạn phụ trách — tháng này" : "Tháng này (theo đơn)"}
          </p>
        </div>
        <div className="kpi-card kpi-card--absorbed p-5 rounded-xl shadow-sm min-w-0">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center mb-3 kpi-icon kpi-icon--absorbed">
            <CircleDollarSign className="w-4 h-4" />
          </div>
          <p className="text-xs font-semibold uppercase tracking-wide kpi-title kpi-icon--absorbed">Tiền NV chịu</p>
          <p className="text-xl font-bold mt-1 tabular-nums break-words kpi-metric kpi-icon--absorbed">{formatCurrency(summary.total_nv_chiu || 0)}</p>
          <p className="text-xs text-muted-foreground mt-0.5 break-words leading-snug">
            {isSalesMyCommission ? "Đơn bạn phụ trách — tháng này" : "Tháng này (theo đơn)"}
          </p>
        </div>
        <div className="col-span-2 lg:col-span-1 kpi-card kpi-card--salary p-5 rounded-xl shadow-sm min-w-0">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center mb-3 kpi-icon kpi-icon--salary">
            <Wallet className="w-4 h-4" />
          </div>
          <p className="text-xs font-semibold uppercase tracking-wide kpi-title kpi-icon--salary">Tổng lương</p>
          <p className="text-xl font-bold mt-1 tabular-nums break-words kpi-metric kpi-icon--salary">{formatCurrency(summary.total_luong || 0)}</p>
          <p className="text-xs text-muted-foreground mt-0.5 break-words leading-snug">
            Tổng HH + Ship KH Trả − tiền NV chịu − HH hoàn (direct)
          </p>
        </div>
      </div>

      {/* Tabs: Hoa hồng NV / Hoa hồng CTV — luôn hiện; lọc 1 NV (?employee= hoặc Chi tiết /:userId) thu hẹp dữ liệu */}
      <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden min-w-0">
          {/* Tab header */}
          <div className="flex border-b border-border">
            <button
              onClick={() => setActiveTab("direct")}
              className={cn("px-6 py-4 text-sm font-semibold transition-colors border-b-2",
                activeTab === "direct"
                  ? "border-primary text-primary bg-accent/40"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              )}>
              Hoa hồng nhân viên
              {salesData.length > 0 && (
                <span className="ml-2 px-1.5 py-0.5 rounded-full text-xs bg-muted text-muted-foreground">{salesData.length}</span>
              )}
            </button>
            <button
              onClick={() => setActiveTab("ctv")}
              className={cn("px-6 py-4 text-sm font-semibold transition-colors border-b-2",
                activeTab === "ctv"
                  ? "border-emerald-600 text-emerald-600 bg-emerald-50/50"
                  : "border-transparent text-muted-foreground hover:text-foreground"
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
              <div className="py-12 text-center text-muted-foreground text-sm px-6 max-w-lg mx-auto">
                {activeEmployeeId != null ? (
                  <>
                    <p className="font-medium text-foreground">
                      {employeeSelectedName || `NV #${activeEmployeeId}`} không có đơn/HH trong kỳ đã chọn
                      {groupId ? ` (nhóm ${groups.find((g) => String(g.id) === groupId)?.name || `#${groupId}`})` : ""}.
                    </p>
                    <p className="mt-2 text-xs leading-relaxed">
                      Bộ lọc áp dụng <span className="text-foreground">cả nhóm và nhân viên</span>: chỉ tính đơn thuộc nhóm đó do NV này phụ trách trong {periodLabelShort}.
                      Thử bỏ lọc nhóm hoặc chọn đúng nhóm có đơn của NV (vd. kỳ lương #1 — NV #99 có đơn ở nhóm khác, không phải nhóm đang chọn).
                    </p>
                  </>
                ) : (
                  "Chưa có dữ liệu trong kỳ đã chọn"
                )}
              </div>
            ) : (
              <div className="min-w-0">
                <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-sm min-w-[640px]">
                  <thead>
                    <tr className="bg-muted/30 border-b border-border">
                      <th className="px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Nhân viên</th>
                      <th className="px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide text-right text-foreground">Doanh số</th>
                      <th className="px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide text-right">
                        Hoa hồng
                        <span className="block font-normal normal-case text-muted-foreground tracking-normal mt-0.5">(kèm HH hoàn)</span>
                      </th>
                      <th className="px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide text-right whitespace-nowrap">Ship / NV chịu</th>
                      <th className="px-5 py-3 text-xs font-semibold text-violet-600 uppercase tracking-wide text-right whitespace-nowrap">Tổng lương</th>
                      <th className="px-5 py-3 w-8"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {salesData.map((item: any) => (
                      <tr key={item.id} className="hover:bg-muted/20 transition-colors">
                        <td className="px-5 py-3">
                          <p className="font-semibold text-foreground">{item.full_name}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">{item.position || "Sales"}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            <span className="text-muted-foreground">Số đơn:</span>{" "}
                            <span className="font-semibold text-foreground tabular-nums">{item.total_orders || 0}</span>
                          </p>
                        </td>
                        <td className="px-5 py-3 text-right tabular-nums font-bold text-foreground">
                          {formatCurrency(item.total_sales || 0)}
                        </td>
                        <td className="px-5 py-3 text-right tabular-nums">
                          <p className="text-xs text-muted-foreground mt-0.5">
                            <span className="text-muted-foreground">Bán hàng:</span>{" "}
                            <span className="font-semibold text-emerald-600">{formatCurrency(item.direct_commission || 0)}</span>
                          </p>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            <span className="text-muted-foreground">Từ CTV:</span>{" "}
                            <span className="font-semibold text-primary">{formatCurrency(item.override_commission || 0)}</span>
                          </p>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            <span className="text-muted-foreground">Tổng (gross):</span>{" "}
                            <span className="font-bold text-foreground">
                              {formatCurrency((item.direct_commission || 0) + (item.override_commission || 0))}
                            </span>
                          </p>
                          {(Number(item.total_return_commission_abs) || 0) > 0 && (
                            <p className="text-xs text-muted-foreground mt-0.5">
                              <span className="text-muted-foreground">HH hoàn (trừ):</span>{" "}
                              <span className="font-semibold text-destructive tabular-nums">
                                −{formatCurrency(Number(item.total_return_commission_abs) || 0)}
                              </span>
                            </p>
                          )}
                        </td>
                        <td className="px-5 py-3 text-right tabular-nums">
                          <p className="text-xs text-muted-foreground mt-0.5">
                            <span className="text-muted-foreground">Ship KH trả:</span>{" "}
                            <span className="font-semibold text-sky-800">{formatCurrency(item.total_khach_ship || 0)}</span>
                          </p>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            <span className="text-muted-foreground">NV chịu:</span>{" "}
                            <span className="font-semibold text-rose-800">{formatCurrency(item.total_nv_chiu || 0)}</span>
                          </p>
                        </td>
                        <td className="px-5 py-3 text-right font-bold text-violet-800 tabular-nums">
                          {formatCurrency(Number(item.total_luong) || 0)}
                        </td>
                        <td className="px-5 py-3 text-right">
                          <Link to={buildEmployeeDetailUrl(item.id)}
                            className="text-xs font-semibold text-primary hover:underline flex items-center gap-0.5 justify-end">
                            Chi tiết <ChevronRight className="w-3 h-3" />
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="bg-muted text-foreground text-sm font-bold">
                      <td className="px-5 py-3">Tổng cộng</td>
                      <td className="px-5 py-3 text-right tabular-nums font-bold text-foreground">
                        {formatCurrency(salesData.reduce((s: number, i: any) => s + (i.total_sales || 0), 0))}
                      </td>
                      <td className="px-5 py-3 text-right">
                        <div className="text-[11px] font-normal text-muted-foreground mb-1">Bán hàng / Từ CTV / Tổng gross / HH hoàn</div>
                        <div className="flex flex-col gap-0.5 items-end">
                          <div className="text-emerald-400 tabular-nums">{formatCurrency(salesData.reduce((s: number, i: any) => s + (i.direct_commission || 0), 0))}</div>
                          <div className="text-primary tabular-nums">{formatCurrency(salesData.reduce((s: number, i: any) => s + (i.override_commission || 0), 0))}</div>
                          <div className="text-foreground tabular-nums">{formatCurrency(salesData.reduce((s: number, i: any) => s + (i.direct_commission || 0) + (i.override_commission || 0), 0))}</div>
                          {(() => {
                            const retSum = salesData.reduce((s: number, i: any) => s + (Number(i.total_return_commission_abs) || 0), 0);
                            return retSum > 0 ? (
                              <div className="text-destructive tabular-nums">−{formatCurrency(retSum)}</div>
                            ) : null;
                          })()}
                        </div>
                      </td>
                      <td className="px-5 py-3 text-right">
                        <div className="text-[11px] font-normal text-muted-foreground mb-1">Ship KH trả / NV chịu</div>
                        <div className="flex flex-col gap-0.5 items-end">
                          <div className="text-sky-300 tabular-nums">{formatCurrency(salesData.reduce((s: number, i: any) => s + (i.total_khach_ship || 0), 0))}</div>
                          <div className="text-rose-300 tabular-nums">{formatCurrency(salesData.reduce((s: number, i: any) => s + (i.total_nv_chiu || 0), 0))}</div>
                        </div>
                      </td>
                      <td className="px-5 py-3 text-right text-violet-700 dark:text-violet-300">{formatCurrency(salesData.reduce((s: number, i: any) => s + (Number(i.total_luong) || 0), 0))}</td>
                      <td className="px-5 py-3"></td>
                    </tr>
                  </tfoot>
                </table>
                </div>
              </div>
            )
          )}

          {/* Tab: Hoa hồng từ CTV */}
          {activeTab === "ctv" && (() => {
            const pairsWithHh = ctvPairs.filter((p) => (Number(p.override_commission) || 0) > 0);
            const bySales: Record<number, any[]> = {};
            pairsWithHh.forEach((p) => {
              if (!bySales[p.sales_id]) bySales[p.sales_id] = [];
              bySales[p.sales_id].push(p);
            });
            const ordersByPair: Record<string, any[]> = {};
            ctvOrders.forEach(o => {
              const k = `${o.sales_id}-${o.ctv_id}`;
              if (!ordersByPair[k]) ordersByPair[k] = [];
              ordersByPair[k].push(o);
            });
            const salesIds = Object.keys(bySales).map(Number);

            return salesIds.length === 0 ? (
              <div className="py-12 text-center text-muted-foreground text-sm px-6 max-w-lg mx-auto">
                {ctvPairs.length === 0 ? (
                  <>
                    <p className="font-medium text-foreground">
                      {activeEmployeeId != null
                        ? `${employeeSelectedName || `NV #${activeEmployeeId}`} chưa có CTV được gán hoặc chưa phát sinh HH quản lý (override) trong ${periodLabelShort}.`
                        : `Chưa có dữ liệu HH từ CTV trong ${periodLabelShort}.`}
                    </p>
                    <p className="mt-2 text-xs leading-relaxed">
                      Tab này chỉ hiển thị <span className="text-foreground">HH override</span> khi CTV lên đơn (không phải HH bán trực tiếp ở tab «Hoa hồng nhân viên»).
                      Gán CTV tại menu Cộng tác viên nếu cần.
                    </p>
                  </>
                ) : (
                  <>
                    <p className="font-medium text-foreground">Có {ctvPairs.length} cặp CTV nhưng chưa có HH override trong {periodLabelShort}.</p>
                    <p className="mt-2 text-xs">Thử bỏ lọc nhóm hoặc đổi kỳ nếu HH override phát sinh ở nhóm/kỳ khác.</p>
                  </>
                )}
              </div>
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
                    <div key={sid} className="border-b border-border last:border-0">
                      {/* Sales row */}
                      <button onClick={() => toggle(salesKey)}
                        className="w-full px-5 py-3.5 flex items-center justify-between hover:bg-muted/20 transition-colors">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground text-xs font-bold">
                            {salesName.split(" ").map((n: string) => n[0]).join("").slice(0,2).toUpperCase()}
                          </div>
                          <div className="text-left">
                            <p className="text-sm font-bold text-foreground">{salesName}</p>
                            <p className="text-xs text-muted-foreground">{pairs.length} CTV • {pairs.reduce((s: number, p: any) => s + p.total_orders, 0)} đơn</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-sm font-bold text-emerald-600">{formatCurrency(salesTotal)}</span>
                          <Link to={`/employees/${sid}`} onClick={e => e.stopPropagation()}
                            className="text-xs text-primary hover:underline px-2 py-1 bg-muted rounded-lg">Xem NV</Link>
                          <ChevronDown className={cn("w-4 h-4 text-muted-foreground transition-transform", isOpen && "rotate-180")} />
                        </div>
                      </button>

                      {/* CTV rows */}
                      {isOpen && pairs.map((pair: any) => {
                        const pairKey = `${pair.sales_id}-${pair.ctv_id}`;
                        const isPairOpen = expandedCtv.has(pairKey);
                        const pairOrders = ordersByPair[pairKey] || [];
                        const STATUS_CFG: Record<string, string> = {
                          pending: "bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950/30 dark:text-amber-300 dark:border-amber-900/50",
                          shipping: "bg-sky-50 text-sky-700 border border-sky-200 dark:bg-sky-950/30 dark:text-sky-300 dark:border-sky-900/50",
                          completed: "bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-300 dark:border-emerald-900/50",
                          cancelled: "bg-destructive/10 text-destructive border border-destructive/30",
                        };
                        const STATUS_LABEL: Record<string, string> = {
                          pending: "Chờ duyệt", shipping: "Đang giao", completed: "Đã giao", cancelled: "Đã hủy"
                        };
                        return (
                          <div key={pairKey} className="border-t border-border">
                            <button onClick={() => toggle(pairKey)}
                              className="w-full pl-14 pr-5 py-2.5 flex items-center justify-between bg-muted/15 hover:bg-muted/25 transition-colors">
                              <div className="flex items-center gap-2">
                                <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center text-primary text-xs font-bold">
                                  {pair.ctv_name?.split(" ").map((n: string) => n[0]).join("").slice(0,2).toUpperCase()}
                                </div>
                                <span className="text-sm font-medium text-foreground">{pair.ctv_name}</span>
                                <span className="text-xs text-muted-foreground">— {pair.total_orders} đơn · DT {formatCurrency(pair.total_revenue)}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-bold text-emerald-600">{formatCurrency(pair.override_commission)}</span>
                                <ChevronDown className={cn("w-3.5 h-3.5 text-muted-foreground transition-transform", isPairOpen && "rotate-180")} />
                              </div>
                            </button>

                            {isPairOpen && pairOrders.length > 0 && (
                              <div className="pl-14 border-t border-border">
                                <table className="w-full text-xs border-collapse">
                                  <thead>
                                    <tr className="bg-muted/30 border-b border-border text-muted-foreground font-semibold">
                                      <th className="px-4 py-2 text-left">Mã đơn</th>
                                      <th className="px-4 py-2 text-left">Ngày</th>
                                      <th className="px-4 py-2 text-left">Khách hàng</th>
                                      <th className="px-4 py-2 text-left">Nhóm BH</th>
                                      <th className="px-4 py-2 text-right">Tổng tiền</th>
                                      <th className="px-4 py-2 text-right">HH override</th>
                                      <th className="px-4 py-2 text-center">Trạng thái</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-border">
                                    {pairOrders.map((o: any) => (
                                      <tr key={o.order_id} className="hover:bg-muted/20">
                                        <td className="px-4 py-2">
                                          <Link to={`/orders/edit/${o.order_id}`} className="font-bold text-primary hover:underline font-mono">{o.order_code}</Link>
                                        </td>
                                        <td className="px-4 py-2 text-muted-foreground">{formatDate(o.order_date)}</td>
                                        <td className="px-4 py-2 text-foreground">{o.customer_name || "—"}</td>
                                        <td className="px-4 py-2">
                                          {o.group_name ? <span className="px-2 py-0.5 rounded-full bg-muted text-muted-foreground">{o.group_name}</span> : "—"}
                                        </td>
                                        <td className="px-4 py-2 text-right font-semibold text-foreground">{formatCurrency(o.total_amount)}</td>
                                        <td className="px-4 py-2 text-right font-bold text-emerald-600">{formatCurrency(o.override_commission)}</td>
                                        <td className="px-4 py-2 text-center">
                                          <span className={cn("px-2 py-0.5 rounded-full font-semibold", STATUS_CFG[o.status] || "bg-muted text-muted-foreground border border-border")}>
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
                <div className="px-5 py-3.5 bg-muted text-foreground flex items-center justify-between text-sm font-bold">
                  <span>Tổng cộng</span>
                  <div className="flex gap-6">
                    <span className="text-muted-foreground font-normal">Đơn: {ctvTotals.total_orders || 0}</span>
                    <span className="text-emerald-400">{formatCurrency(ctvTotals.total_override || 0)}</span>
                  </div>
                </div>
              </div>
            );
          })()}
        </div>

      {/* Bảng chi tiết hoa hồng theo đơn (cả sales lẫn admin đều thấy) */}
      <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden min-w-0">
        <div className="px-5 py-4 border-b border-border flex items-center justify-between">
          <h2 className="text-sm font-bold text-foreground">
            Chi tiết hoa hồng theo đơn hàng
            {commTotal > 0 && <span className="ml-2 text-xs font-normal text-muted-foreground">({commTotal} dòng)</span>}
          </h2>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span>Hiển thị</span>
            <select
              value={commLimit}
              onChange={e => { setCommLimit(Number(e.target.value)); setCommPage(1); }}
              className="px-2 py-1 bg-background border border-input rounded-md text-xs outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background cursor-pointer"
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
              <tr className="bg-muted/30 border-b border-border">
                <th className="px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Mã đơn hàng</th>
                <th className="px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">NHÂN VIÊN</th>
                <th className="px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Khách hàng</th>
                <th className="px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide text-right whitespace-nowrap">Ship / NV chịu</th>
                <th className="px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide text-right whitespace-nowrap">Hoa hồng / Lương</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {orderCommissions.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-5 py-12 text-center text-muted-foreground">
                    Chưa có hoa hồng trong tháng {month}/{year}
                    {groupId ? ` — nhóm đã chọn` : ""}
                  </td>
                </tr>
              ) : orderCommissions.map((item: any) => {
                const st = statusConfig[item.status] || { label: item.status || "—", color: "bg-muted/30 text-muted-foreground border border-border" };
                return (
                  <tr key={item.id}
                    className="hover:bg-muted/20 transition-colors cursor-pointer"
                    onClick={() => openOrderPopup(item)}>
                    <td className="px-5 py-3">
                      <div className="leading-snug">
                        <div className="font-bold text-primary font-mono">{item.order_code}</div>
                        <div className="mt-1">
                          <span className={cn("inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold", st.color)}>
                            {st.label}
                          </span>
                        </div>
                        <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
                          <span>{formatDate(item.order_date)}</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3">
                      <div className="leading-snug">
                        <p className="text-foreground font-medium">{item.salesperson_name || "—"}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          <span className="text-muted-foreground">Nhóm BH:</span>{" "}
                          <span className="font-semibold text-foreground">{item.group_name || "—"}</span>
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          <span className="text-muted-foreground">Loại BH:</span>{" "}
                          <span className="font-semibold text-foreground">
                            {String(item.entry_kind) === "adjustment"
                              ? "Hoàn"
                              : item.type === "direct"
                                ? "Bán hàng"
                                : `Từ CTV${item.ctv_name ? ` (${item.ctv_name})` : ""}`}
                          </span>
                        </p>
                      </div>
                    </td>
                    <td className="px-5 py-3 text-foreground">
                      <div className="leading-snug">
                        <div>{item.customer_name || "—"}</div>
                        <div className="mt-1 text-xs text-muted-foreground">
                          Tổng tiền: <span className="font-semibold text-foreground tabular-nums">{formatCurrency(item.total_amount)}</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3 text-right tabular-nums">
                      {String(item.entry_kind) === "adjustment" ? (
                        <div className="leading-snug">
                          <p className="text-xs text-muted-foreground mt-0.5">
                            <span className="text-muted-foreground">Ship KH trả:</span>{" "}
                            <span className="font-semibold text-muted-foreground">—</span>
                          </p>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            <span className="text-muted-foreground">NV chịu:</span>{" "}
                            <span className="font-semibold text-muted-foreground">—</span>
                          </p>
                        </div>
                      ) : (
                        <div className="leading-snug">
                          <p className="text-xs text-muted-foreground mt-0.5">
                            <span className="text-muted-foreground">Ship KH trả:</span>{" "}
                            <span className={cn("font-semibold", (Number(item.khach_tra_ship) > 0 ? "text-sky-800" : "text-muted-foreground"))}>
                              {formatCurrency(Number(item.khach_tra_ship) || 0)}
                            </span>
                          </p>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            <span className="text-muted-foreground">NV chịu:</span>{" "}
                            <span className={cn("font-semibold", (Number(item.nv_chiu_display) > 0 ? "text-rose-700" : "text-muted-foreground"))}>
                              {formatCurrency(Number(item.nv_chiu_display) || 0)}
                            </span>
                          </p>
                        </div>
                      )}
                    </td>
                    <td className="px-5 py-3 text-right tabular-nums">
                      <div className="leading-snug">
                        <p className="text-xs text-muted-foreground mt-0.5">
                          <span className="text-muted-foreground">Hoa hồng:</span>{" "}
                          <span className={cn(
                            "font-bold",
                            String(item.entry_kind) === "adjustment"
                              ? (Number(item.commission_amount) < 0 ? "text-rose-600" : "text-emerald-600")
                              : item.type === "override"
                                ? "text-primary"
                                : "text-emerald-600"
                          )}>
                            {formatCurrency(item.commission_amount)}
                          </span>
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          <span className="text-muted-foreground">Lương:</span>{" "}
                          <span className={cn(
                            "font-bold",
                            Number(item.luong) < 0 ? "text-destructive" : "text-violet-700 dark:text-violet-300"
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
                <tr className="bg-muted text-foreground text-sm font-bold">
                  <td className="px-5 py-3 align-top" colSpan={2}>
                    <span className="block">Tổng theo trang {commPage}</span>
                    <span className="block text-xs font-normal text-muted-foreground mt-1 leading-snug">
                      Chỉ cộng các dòng đang hiển thị ({orderCommissions.length}/{commTotal} dòng trang này) — không phải tổng cả kỳ.
                    </span>
                  </td>
                  <td className="px-5 py-3 text-right tabular-nums align-top">
                    <div className="text-[11px] font-normal text-muted-foreground mb-1">Tổng tiền</div>
                    <div className="text-foreground tabular-nums">
                      {formatCurrency(orderCommissions.reduce((s: number, i: any) => s + i.total_amount, 0))}
                    </div>
                  </td>
                  <td className="px-5 py-3 text-right tabular-nums align-top">
                    <div className="text-[11px] font-normal text-muted-foreground mb-1">Ship KH trả / NV chịu</div>
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
                    <div className="text-[11px] font-normal text-muted-foreground mb-1">Hoa hồng / Lương</div>
                    <div className="flex flex-col gap-0.5 items-end">
                      <div className="text-emerald-400 tabular-nums">
                        {formatCurrency(orderCommissions.reduce((s: number, i: any) => s + i.commission_amount, 0))}
                      </div>
                      <div className="text-foreground tabular-nums">
                        {formatCurrency(orderCommissions.reduce((s: number, i: any) => s + Number(i.luong || 0), 0))}
                      </div>
                    </div>
                  </td>
                </tr>
                <tr className="bg-muted/20 border-t border-border text-sm text-foreground">
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
          <div className="px-5 py-3 bg-muted/20 border-t border-border flex items-center justify-between">
            <p className="text-xs text-muted-foreground">
              Hiển thị <span className="font-semibold text-foreground">
                {(commPage - 1) * commLimit + 1}–{Math.min(commPage * commLimit, commTotal)}
              </span> / <span className="font-semibold text-foreground">{commTotal}</span> dòng
            </p>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setCommPage(p => Math.max(1, p - 1))}
                disabled={commPage === 1}
                className="w-8 h-8 rounded-md flex items-center justify-center text-muted-foreground hover:bg-accent disabled:opacity-30 transition-colors text-sm"
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
                    className={cn(
                      "w-8 h-8 rounded-md text-xs font-bold transition-colors",
                      commPage === p
                        ? "bg-primary text-primary-foreground shadow-sm"
                        : "hover:bg-accent text-muted-foreground"
                    )}>
                    {p}
                  </button>
                );
              })}
              <button
                onClick={() => setCommPage(p => Math.min(Math.ceil(commTotal / commLimit), p + 1))}
                disabled={commPage >= Math.ceil(commTotal / commLimit)}
                className="w-8 h-8 rounded-md flex items-center justify-center text-muted-foreground hover:bg-accent disabled:opacity-30 transition-colors text-sm"
              >›</button>
            </div>
          </div>
        )}
      </div>

      {/* Popup chi tiết đơn hàng */}
      {orderPopup && (
        <div className="fixed inset-0 bg-foreground/50 flex items-center justify-center z-50 p-4"
          onClick={() => setOrderPopup(null)}>
          <div className="bg-card rounded-2xl shadow-2xl max-w-2xl w-full max-h-[85vh] flex flex-col border border-border"
            onClick={e => e.stopPropagation()}>
            {/* Header */}
            <div className="px-6 py-4 border-b border-border flex items-center justify-between">
              <div>
                <p className="text-lg font-bold text-foreground font-mono">{orderPopup.order_code}</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {formatDate(orderPopup.order_date)} •
                  {orderPopup.customer_name && ` ${orderPopup.customer_name} •`}
                  {orderPopup.group_name && ` ${orderPopup.group_name}`}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <span className={cn("px-2.5 py-1 rounded-full text-xs font-semibold",
                  statusConfig[orderPopup.status]?.color || "bg-muted/30 text-muted-foreground border border-border")}>
                  {statusConfig[orderPopup.status]?.label || orderPopup.status}
                </span>
                <button onClick={() => setOrderPopup(null)}
                  className="p-2 hover:bg-accent rounded-xl text-muted-foreground transition-colors">
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
                  <Loader2 className="w-6 h-6 animate-spin text-primary" />
                </div>
              ) : (
                <>
                  <table className="w-full text-sm border-collapse">
                    <thead>
                      <tr className="bg-muted/30 border-b border-border">
                        <th className="px-5 py-3 text-xs font-semibold text-muted-foreground text-left">Sản phẩm</th>
                        <th className="px-5 py-3 text-xs font-semibold text-muted-foreground text-center">SL</th>
                        <th className="px-5 py-3 text-xs font-semibold text-muted-foreground text-right">Thành tiền</th>
                        <th className="px-5 py-3 text-xs font-semibold text-muted-foreground text-right">HH</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {popupItems.length === 0 ? (
                        <tr><td colSpan={4} className="px-5 py-8 text-center text-muted-foreground">Không có sản phẩm</td></tr>
                      ) : popupItems.map((item: any, i: number) => {
                        const net = parseFloat(item.unit_price) * parseFloat(item.qty) - parseFloat(item.discount_amount || 0);
                        return (
                          <tr key={i} className="hover:bg-muted/20">
                            <td className="px-5 py-3">
                              <p className="font-medium text-foreground">{item.product_name || item.name}</p>
                              <p className="text-xs text-muted-foreground font-mono">{item.sku}</p>
                            </td>
                            <td className="px-5 py-3 text-center text-foreground">{parseFloat(item.qty)}</td>
                            <td className="px-5 py-3 text-right font-semibold text-foreground">{formatCurrency(net)}</td>
                            <td className="px-5 py-3 text-right font-bold text-emerald-600">{formatCurrency(parseFloat(item.commission_amount))}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>

                  {/* Footer tổng */}
                  <div className="px-5 py-4 bg-muted text-foreground flex items-center justify-between text-sm font-bold rounded-b-2xl">
                    <div className="flex gap-6">
                      <span className="text-muted-foreground font-normal">Tổng tiền:</span>
                      <span>{formatCurrency(orderPopup.total_amount)}</span>
                    </div>
                    <div className="flex gap-6">
                      <span className="text-muted-foreground font-normal">Hoa hồng:</span>
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
