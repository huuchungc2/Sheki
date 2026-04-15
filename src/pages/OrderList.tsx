import * as React from "react";
import {
  Search, Plus, ChevronLeft, ChevronRight,
  ShoppingCart, Calendar, CreditCard, Truck,
  Edit2, Trash2, CheckCircle2, Clock, XCircle,
  Wallet, ArrowRight, Loader2, ChevronDown, X, Download
} from "lucide-react";
import { Link, useNavigate, useSearchParams, useLocation } from "react-router-dom";
import { cn, formatCurrency, formatDate } from "../lib/utils";
import { parseListPage, getVisiblePageNumbers } from "../lib/listUrl";
import { exportOrdersList } from "../lib/exportExcel";

const API_URL =
  (import.meta as any)?.env?.VITE_API_URL ||
  "/api";

const statusConfig: Record<string, { label: string; color: string; icon: any }> = {
  pending:   { label: "Chờ duyệt", color: "bg-amber-100 text-amber-700",    icon: Clock },
  shipping:  { label: "Đang giao", color: "bg-blue-100 text-blue-700",      icon: Truck },
  completed: { label: "Đã giao",   color: "bg-emerald-100 text-emerald-700", icon: CheckCircle2 },
  cancelled: { label: "Đã hủy",   color: "bg-red-100 text-red-700",        icon: XCircle },
};

const paymentConfig: Record<string, { label: string; icon: any }> = {
  cash:     { label: "Tiền mặt",     icon: Wallet },
  transfer: { label: "Chuyển khoản", icon: ArrowRight },
  card:     { label: "Thẻ ATM",      icon: CreditCard },
};

/** Cùng công thức danh sách đơn / LOGIC_BUSINESS — một bảng mọi kích thước */
function computeOrderMoney(order: any) {
  const khachTraShip = order.ship_payer === "shop" ? 0 : Number(order.shipping_fee) || 0;
  const commissionAmt = Number(order.commission_amount) || 0;
  const nvChiuAmt = Number(order.salesperson_absorbed_amount) || 0;
  const luongDon = commissionAmt + khachTraShip - nvChiuAmt;
  return { khachTraShip, commissionAmt, nvChiuAmt, luongDon };
}

// Helper: format YYYY-MM-DD theo local time (tránh lệch múi giờ UTC+7)
function toDateStr(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

type DatePreset = "today" | "week" | "month" | "last_month" | "last_year" | "custom" | "";

function getPresetRange(preset: DatePreset): { from: string; to: string } {
  const today = new Date();
  const y = today.getFullYear();
  const m = today.getMonth();
  const d = today.getDate();
  if (preset === "today") return { from: toDateStr(today), to: toDateStr(today) };
  if (preset === "week") {
    const dow = today.getDay(); // 0=CN, 1=T2...
    const diffMon = dow === 0 ? -6 : 1 - dow; // T2 đầu tuần
    const mon = new Date(y, m, d + diffMon);
    const sun = new Date(y, m, d + diffMon + 6);
    return { from: toDateStr(mon), to: toDateStr(sun) };
  }
  if (preset === "month")      return { from: toDateStr(new Date(y, m, 1)),     to: toDateStr(new Date(y, m + 1, 0)) };
  if (preset === "last_month") return { from: toDateStr(new Date(y, m - 1, 1)), to: toDateStr(new Date(y, m, 0)) };
  if (preset === "last_year")  return { from: toDateStr(new Date(y - 1, 0, 1)), to: toDateStr(new Date(y - 1, 11, 31)) };
  return { from: "", to: "" };
}

/** Đọc bộ lọc + trang từ URL — quay lại từ sửa đơn vẫn giữ nguyên */
function readListParams(sp: URLSearchParams) {
  const today = toDateStr(new Date());
  const page = parseListPage(sp);
  const search = sp.get("q") ?? "";
  const product = sp.get("product") ?? "";
  const status = sp.get("status") ?? "";
  const groupId = sp.get("group") ?? "";
  const employeeId = sp.get("employee") ?? "";
  const rawPreset = sp.get("preset") as DatePreset | null;
  const datePreset: DatePreset =
    rawPreset && ["today", "week", "month", "last_month", "last_year", "custom", ""].includes(rawPreset)
      ? rawPreset || "today"
      : "today";
  const dateFrom = sp.get("from") ?? today;
  const dateTo = sp.get("to") ?? today;
  return { page, search, product, status, groupId, employeeId, dateFrom, dateTo, datePreset };
}

export function OrderList() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const ordersListReturn = `${location.pathname}${location.search}`;

  // Lấy role từ localStorage
  const currentUser = React.useMemo(() => {
    const u = localStorage.getItem("user");
    return u ? JSON.parse(u) : null;
  }, []);
  const isAdmin =
    currentUser?.can_access_admin === true || currentUser?.role === "admin";

  /** NV phạm vi cá nhân (scope_own_data): không sửa/xóa/bulk chọn đơn đang giao hoặc đã giao — Admin & role xem toàn hệ thống giữ quyền */
  const canSalesMutateOrderRow = React.useCallback(
    (order: any) => {
      if (isAdmin || currentUser?.scope_own_data === false) return true;
      return !["shipping", "completed"].includes(String(order?.status ?? ""));
    },
    [isAdmin, currentUser?.scope_own_data]
  );

  const todayStr = toDateStr(new Date());
  const { page, search, product, status, groupId, employeeId, dateFrom, dateTo, datePreset } = React.useMemo(
    () => readListParams(searchParams),
    [searchParams.toString()]
  );
  const hasActiveFilters =
    Boolean(search) ||
    Boolean(product) ||
    Boolean(status) ||
    Boolean(groupId) ||
    Boolean(employeeId) ||
    datePreset !== "today" ||
    dateFrom !== todayStr ||
    dateTo !== todayStr ||
    page > 1;

  const [orders, setOrders]         = React.useState<any[]>([]);
  const [loading, setLoading]       = React.useState(true);
  const [error, setError]           = React.useState<string | null>(null);
  const [groups, setGroups]         = React.useState<any[]>([]);
  const [employees, setEmployees]   = React.useState<any[]>([]);
  const [showDateMenu, setShowDateMenu] = React.useState(false);
  const [total, setTotal]           = React.useState(0);
  const [searchInput, setSearchInput] = React.useState("");
  const [productInput, setProductInput] = React.useState("");
  const [isComposing, setIsComposing] = React.useState(false);
  const [summary, setSummary]       = React.useState<{ total_orders: number; total_revenue: number; total_commission: number }>({
    total_orders: 0,
    total_revenue: 0,
    total_commission: 0,
  });
  const [deleting, setDeleting]     = React.useState<string | null>(null);
  const [exporting, setExporting]   = React.useState(false);

  const [orderItemsByOrderId, setOrderItemsByOrderId] = React.useState<Record<string, any[]>>({});

  const patchListParams = React.useCallback(
    (patch: Record<string, string | null | undefined>, opts?: { resetPage?: boolean }) => {
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          for (const [k, v] of Object.entries(patch)) {
            if (v === null || v === undefined || v === "") next.delete(k);
            else next.set(k, v);
          }
          if (opts?.resetPage) next.set("page", "1");
          return next;
        },
        { replace: true }
      );
    },
    [setSearchParams]
  );

  const setPage = React.useCallback(
    (p: number | ((prev: number) => number)) => {
      const current = parseListPage(searchParams);
      const nextPage = typeof p === "function" ? p(current) : p;
      patchListParams({ page: String(Math.max(1, nextPage)) });
    },
    [searchParams, patchListParams]
  );

  React.useEffect(() => {
    setSearchInput(search);
  }, [search]);

  React.useEffect(() => {
    setProductInput(product);
  }, [product]);

  React.useEffect(() => {
    if (isComposing) return;
    const t = window.setTimeout(() => {
      const next = searchInput;
      if (next === search) return;
      const hasMeaningful = next.trim().length > 0;
      patchListParams({ q: hasMeaningful ? next : null }, { resetPage: true });
    }, 350);
    return () => window.clearTimeout(t);
  }, [searchInput, search, patchListParams, isComposing]);

  React.useEffect(() => {
    if (isComposing) return;
    const t = window.setTimeout(() => {
      const next = productInput;
      if (next === product) return;
      const hasMeaningful = next.trim().length > 0;
      patchListParams({ product: hasMeaningful ? next : null }, { resetPage: true });
    }, 350);
    return () => window.clearTimeout(t);
  }, [productInput, product, patchListParams, isComposing]);

  // Bulk select
  const [selected, setSelected]     = React.useState<Set<number>>(new Set());
  const [bulkStatus, setBulkStatus] = React.useState("");
  const [bulkLoading, setBulkLoading] = React.useState(false);

  const limit = 20;

  // Fetch groups
  React.useEffect(() => {
    const token = localStorage.getItem("token");
    const endpoint = isAdmin ? "/groups" : `/groups/user/${currentUser?.id}`;
    fetch(`${API_URL}${endpoint}`, { headers: { "Authorization": `Bearer ${token}` } })
      .then(r => r.json()).then(j => setGroups(j.data || [])).catch(() => {});
  }, [isAdmin, currentUser?.id]);

  // Fetch danh sách nhân viên (admin only)
  React.useEffect(() => {
    if (!isAdmin) return;
    const token = localStorage.getItem("token");
    fetch(`${API_URL}/users?scoped=1&limit=100&active_only=1`, {
      headers: { "Authorization": `Bearer ${token}` }
    })
      .then(r => r.json())
      .then(j => setEmployees(j.data || []))
      .catch(() => {});
  }, [isAdmin]);

  const fetchOrders = React.useCallback(async () => {
    const { page: p, search: q, product: prod, status: st, groupId: gid, employeeId: eid, dateFrom: df, dateTo: dt } =
      readListParams(searchParams);
    try {
      setLoading(true);
      setError(null);
      const token = localStorage.getItem("token");
      const params = new URLSearchParams({
        search: q,
        ...(prod && { product: prod }),
        status: st,
        page: String(p),
        limit: String(limit),
        ...(df && { date_from: df }),
        ...(dt && { date_to: dt }),
        ...(eid && { employee: eid }),
        ...(gid && { group_id: gid }),
      });
      const res = await fetch(`${API_URL}/orders?${params}`, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (!res.ok) throw new Error("Không thể tải danh sách đơn hàng");
      const json = await res.json();
      const newTotal = json.total || 0;
      setOrders(json.data);
      setTotal(newTotal);
      setSummary({
        total_orders: Number(json?.summary?.total_orders) || 0,
        total_revenue: Number(json?.summary?.total_revenue) || 0,
        total_commission: Number(json?.summary?.total_commission) || 0,
      });
      setSelected(new Set());
      setOrderItemsByOrderId({});
      const totalPages = Math.ceil(newTotal / limit);
      if (totalPages > 0 && p > totalPages) {
        patchListParams({ page: String(totalPages) });
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [searchParams.toString(), patchListParams]);

  React.useEffect(() => { fetchOrders(); }, [fetchOrders]);

  React.useEffect(() => {
    const token = localStorage.getItem("token");
    const ids = orders.map((o: any) => o?.id).filter((id: any) => Number.isFinite(Number(id)));
    if (!token || ids.length === 0) {
      setOrderItemsByOrderId({});
      return;
    }
    let aborted = false;
    (async () => {
      try {
        const params = new URLSearchParams({ order_ids: ids.join(",") });
        const res = await fetch(`${API_URL}/orders/page-items?${params}`, {
          headers: { "Authorization": `Bearer ${token}` },
        });
        if (!res.ok) return;
        const json = await res.json();
        const rows = (json?.data ?? []) as any[];
        const by: Record<string, any[]> = {};
        for (const r of rows) {
          const oid = String(r.order_id);
          if (!by[oid]) by[oid] = [];
          by[oid].push(r);
        }
        if (!aborted) setOrderItemsByOrderId(by);
      } catch {
        if (!aborted) setOrderItemsByOrderId({});
      }
    })();
    return () => { aborted = true; };
  }, [orders]);

  const exportExcel = React.useCallback(async () => {
    try {
      setExporting(true);
      const token = localStorage.getItem("token");
      const params = new URLSearchParams({
        search,
        ...(product && { product }),
        status,
        page: "1",
        limit: "10000",
        ...(dateFrom && { date_from: dateFrom }),
        ...(dateTo && { date_to: dateTo }),
        ...(employeeId && { employee: employeeId }),
        ...(groupId && { group_id: groupId }),
      });
      const [resOrders, resItems] = await Promise.all([
        fetch(`${API_URL}/orders?${params}`, {
          headers: { "Authorization": `Bearer ${token}` },
        }),
        fetch(`${API_URL}/orders/export-items?${params}`, {
          headers: { "Authorization": `Bearer ${token}` },
        }),
      ]);
      if (!resOrders.ok) throw new Error("Không thể tải dữ liệu để xuất Excel");
      if (!resItems.ok) throw new Error("Không thể tải chi tiết sản phẩm để xuất Excel");
      const jsonOrders = await resOrders.json();
      const jsonItems = await resItems.json();
      const rows = jsonOrders?.data ?? [];
      const itemRows = jsonItems?.data ?? [];

      const groupName = groupId ? (groups.find((g: any) => String(g.id) === String(groupId))?.name || "") : "";
      const employeeName =
        employeeId ? (employees.find((e: any) => String(e.id) === String(employeeId))?.full_name || "") : "";

      exportOrdersList({
        rows,
        itemRows,
        meta: {
          dateFrom,
          dateTo,
          groupName: groupName || undefined,
          employeeName: employeeName || undefined,
        },
      });
    } catch (e: any) {
      alert(e?.message || "Xuất Excel thất bại");
    } finally {
      setExporting(false);
    }
  }, [search, product, status, dateFrom, dateTo, employeeId, groupId, groups, employees]);

  // Apply preset
  const applyPreset = (preset: DatePreset) => {
    if (preset !== "custom") {
      const { from, to } = getPresetRange(preset);
      patchListParams(
        { preset, from, to, page: "1" },
        {}
      );
    } else {
      patchListParams({ preset: "custom", page: "1" });
    }
    if (preset !== "custom") setShowDateMenu(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Bạn có chắc muốn xóa đơn hàng này?")) return;
    try {
      setDeleting(id);
      const token = localStorage.getItem("token");
      await fetch(`${API_URL}/orders/${id}`, {
        method: "DELETE",
        headers: { "Authorization": `Bearer ${token}` }
      });
      fetchOrders();
    } catch { } finally { setDeleting(null); }
  };

  const handleBulkStatus = async () => {
    if (!bulkStatus || selected.size === 0) return;
    if (!confirm(`Đổi ${selected.size} đơn sang "${statusConfig[bulkStatus]?.label}"?`)) return;
    setBulkLoading(true);
    const token = localStorage.getItem("token");
    await Promise.all([...selected].map(id =>
      fetch(`${API_URL}/orders/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
        body: JSON.stringify({ status: bulkStatus })
      })
    ));
    setBulkLoading(false);
    setBulkStatus("");
    fetchOrders();
  };

  const selectableOrders = React.useMemo(
    () => orders.filter((o: any) => canSalesMutateOrderRow(o)),
    [orders, canSalesMutateOrderRow]
  );

  const toggleAll = () => {
    const ids = selectableOrders.map((o: any) => o.id);
    if (ids.length === 0) return;
    const allSelected = ids.every((id) => selected.has(id));
    if (allSelected) setSelected(new Set());
    else setSelected(new Set(ids));
  };

  const toggleOne = (id: number) => {
    const row = orders.find((o: any) => o.id === id);
    if (row && !canSalesMutateOrderRow(row)) return;
    const next = new Set(selected);
    next.has(id) ? next.delete(id) : next.add(id);
    setSelected(next);
  };

  const totalPages = Math.ceil(total / limit);

  const presetLabels: Record<string, string> = {
    today: "Hôm nay", week: "Tuần này", month: "Tháng này",
    last_month: "Tháng trước", last_year: "Năm trước", custom: "Tuỳ chọn"
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Quản lý đơn hàng</h1>
          <p className="text-slate-500 text-sm mt-0.5">Theo dõi và quản lý các giao dịch bán hàng.</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={exportExcel}
            disabled={exporting}
            className={cn(
              "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all border",
              exporting
                ? "bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed"
                : "bg-white text-slate-700 border-slate-200 hover:border-emerald-200 hover:text-emerald-700"
            )}
            title="Xuất Excel theo bộ lọc hiện tại"
          >
            {exporting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5 shrink-0" />}
            Xuất Excel
          </button>
          <Link to="/orders/new" state={{ ordersListReturn }} className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-red-600 text-white rounded-lg text-xs font-semibold hover:bg-red-700 transition-all shadow-sm shadow-red-600/20">
            <Plus className="w-3.5 h-3.5 shrink-0" />
            Thêm đơn
          </Link>
        </div>
      </div>

      {/* Filter bar */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 space-y-3">
        <div className="flex flex-wrap gap-3">
          {/* Search */}
          <div className="relative flex-1 min-w-[200px]">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              onCompositionStart={() => setIsComposing(true)}
              onCompositionEnd={(e) => {
                setIsComposing(false);
                setSearchInput((e.target as HTMLInputElement).value);
              }}
              placeholder="Mã đơn, tên khách, SĐT..."
              className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 focus:border-red-300 focus:bg-white focus:ring-2 focus:ring-red-100 rounded-xl text-sm outline-none transition-all"
            />
          </div>

          {/* Filter theo sản phẩm */}
          <div className="relative flex-1 min-w-[220px]">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={productInput}
              onChange={(e) => setProductInput(e.target.value)}
              onCompositionStart={() => setIsComposing(true)}
              onCompositionEnd={(e) => {
                setIsComposing(false);
                setProductInput((e.target as HTMLInputElement).value);
              }}
              placeholder="Tên/SKU sản phẩm..."
              className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 focus:border-red-300 focus:bg-white focus:ring-2 focus:ring-red-100 rounded-xl text-sm outline-none transition-all"
            />
          </div>

          {/* Trạng thái */}
          <select
            value={status}
            onChange={(e) => { patchListParams({ status: e.target.value || null }, { resetPage: true }); }}
            className="px-3 py-2 bg-slate-50 border border-slate-200 focus:border-red-300 focus:ring-2 focus:ring-red-100 rounded-xl text-sm outline-none appearance-none cursor-pointer transition-all min-w-[140px]"
          >
            <option value="">Tất cả trạng thái</option>
            <option value="pending">Chờ duyệt</option>
            <option value="shipping">Đang giao</option>
            <option value="completed">Đã giao</option>
            <option value="cancelled">Đã hủy</option>
          </select>

          {/* Nhóm bán hàng */}
          <select
            value={groupId}
            onChange={(e) => { patchListParams({ group: e.target.value || null }, { resetPage: true }); }}
            className="px-3 py-2 bg-slate-50 border border-slate-200 focus:border-red-300 focus:ring-2 focus:ring-red-100 rounded-xl text-sm outline-none appearance-none cursor-pointer transition-all min-w-[140px]"
          >
            <option value="">Tất cả nhóm</option>
            {groups.map((g: any) => (
              <option key={g.id} value={g.id}>{g.name}</option>
            ))}
          </select>

          {/* Nhân viên — chỉ admin */}
          {isAdmin && (
            <select
              value={employeeId}
              onChange={(e) => { patchListParams({ employee: e.target.value || null }, { resetPage: true }); }}
              className="px-3 py-2 bg-slate-50 border border-slate-200 focus:border-red-300 focus:ring-2 focus:ring-red-100 rounded-xl text-sm outline-none appearance-none cursor-pointer transition-all min-w-[160px]"
            >
              <option value="">Tất cả nhân viên</option>
              {employees.map((emp: any) => (
                <option key={emp.id} value={emp.id}>{emp.full_name}</option>
              ))}
            </select>
          )}

          {/* Date preset dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowDateMenu(!showDateMenu)}
              className="flex items-center gap-2 px-3 py-2 bg-slate-50 border border-slate-200 hover:border-red-300 rounded-xl text-sm font-medium text-slate-700 transition-all min-w-[140px] justify-between"
            >
              <Calendar className="w-4 h-4 text-slate-400" />
              <span>{datePreset ? presetLabels[datePreset] : "Chọn thời gian"}</span>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
            </button>
            {showDateMenu && (
              <div className="absolute top-full left-0 mt-1 w-52 bg-white border border-slate-200 rounded-xl shadow-xl z-50 overflow-hidden">
                {(["today","week","month","last_month","last_year","custom"] as DatePreset[]).map(p => (
                  <button key={p} onClick={() => applyPreset(p)}
                    className={cn("w-full px-4 py-2.5 text-left text-sm hover:bg-slate-50 transition-colors",
                      datePreset === p ? "bg-red-50 text-red-600 font-semibold" : "text-slate-700"
                    )}>
                    {presetLabels[p]}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Custom date range — chỉ hiện khi preset = custom */}
          {datePreset === "custom" && (
            <div className="flex items-center gap-2">
              <input type="date" value={dateFrom}
                onChange={(e) => { patchListParams({ from: e.target.value, preset: "custom" }, { resetPage: true }); }}
                className="px-3 py-2 bg-slate-50 border border-slate-200 focus:border-red-300 rounded-xl text-sm outline-none focus:ring-2 focus:ring-red-100"
              />
              <span className="text-slate-400 text-xs">–</span>
              <input type="date" value={dateTo}
                onChange={(e) => { patchListParams({ to: e.target.value, preset: "custom" }, { resetPage: true }); }}
                className="px-3 py-2 bg-slate-50 border border-slate-200 focus:border-red-300 rounded-xl text-sm outline-none focus:ring-2 focus:ring-red-100"
              />
            </div>
          )}

          {/* Xóa lọc */}
          {hasActiveFilters && (
            <button
              onClick={() => { setSearchParams(new URLSearchParams(), { replace: true }); }}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-500 bg-slate-50 border border-slate-200 rounded-xl hover:text-red-600 hover:border-red-200 transition-all"
            >
              <X className="w-3.5 h-3.5" />
              Xóa lọc
            </button>
          )}
        </div>

        {/* Hiển thị range ngày đang áp dụng */}
        {(dateFrom || dateTo) && datePreset !== "custom" && (
          <p className="text-xs text-slate-400">
            Đang lọc: <span className="font-semibold text-slate-600">{dateFrom || "..."} → {dateTo || "..."}</span>
          </p>
        )}
      </div>

      {/* KPI totals (theo bộ lọc hiện tại) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-slate-500">Tổng đơn hàng</p>
            <div className="w-9 h-9 rounded-xl bg-amber-50 flex items-center justify-center">
              <ShoppingCart className="w-5 h-5 text-amber-600" />
            </div>
          </div>
          <p className="mt-3 text-2xl font-extrabold text-slate-900 tabular-nums">
            {summary.total_orders || 0}
          </p>
          <p className="mt-1 text-xs text-slate-500">Tổng đơn (không gồm đơn hủy) theo bộ lọc.</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-slate-500">Tổng doanh thu</p>
            <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center">
              <Wallet className="w-5 h-5 text-blue-600" />
            </div>
          </div>
          <p className="mt-3 text-2xl font-extrabold text-slate-900 tabular-nums">
            {formatCurrency(summary.total_revenue)}
          </p>
          <p className="mt-1 text-xs text-slate-500">Tổng tạm tính (subtotal) theo bộ lọc.</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-slate-500">Tổng hoa hồng</p>
            <div className="w-9 h-9 rounded-xl bg-emerald-50 flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5 text-emerald-600" />
            </div>
          </div>
          <p className="mt-3 text-2xl font-extrabold text-slate-900 tabular-nums">
            {formatCurrency(summary.total_commission)}
          </p>
          <p className="mt-1 text-xs text-slate-500">
            HH bán hàng (direct gross). Tháng đủ ngày (1 → cuối tháng), không lọc thêm → cùng số với «HH bán hàng» báo cáo (cùng tháng/nhóm).
          </p>
        </div>
      </div>

      {/* Bulk action bar */}
      {selected.size > 0 && (
        <div className="flex items-center gap-3 px-4 py-3 bg-blue-50 border border-blue-200 rounded-xl">
          <span className="text-sm font-semibold text-blue-700">Đã chọn {selected.size} đơn</span>
          <div className="flex items-center gap-2 ml-auto">
            <select
              value={bulkStatus}
              onChange={(e) => setBulkStatus(e.target.value)}
              className="px-3 py-1.5 border border-blue-200 bg-white rounded-lg text-sm outline-none focus:border-blue-400 cursor-pointer"
            >
              <option value="">Đổi trạng thái...</option>
              <option value="pending">Chờ duyệt</option>
              <option value="shipping">Đang giao</option>
              <option value="completed">Đã giao</option>
              <option value="cancelled">Đã hủy</option>
            </select>
            <button
              onClick={handleBulkStatus}
              disabled={!bulkStatus || bulkLoading}
              className="flex items-center gap-1.5 px-4 py-1.5 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 disabled:opacity-50 transition-all"
            >
              {bulkLoading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              Áp dụng
            </button>
            <button onClick={() => setSelected(new Set())} className="px-3 py-1.5 text-sm text-slate-500 hover:text-slate-700">Bỏ chọn</button>
          </div>
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">{error}</div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 text-red-600 animate-spin" />
        </div>
      ) : orders.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 py-16 text-center text-slate-400">
          <ShoppingCart className="w-8 h-8 mx-auto mb-2 text-slate-200" />
          Không có đơn hàng nào
        </div>
      ) : (
        <>
          {/* Bảng đầy cột — mọi kích thước; mobile cuộn ngang */}
          <div className="bg-white rounded-2xl border border-slate-200 overflow-x-auto -mx-1 sm:mx-0">
            <p className="md:hidden text-[11px] text-slate-400 px-3 pt-3 pb-0">
              Vuốt ngang để xem đủ cột.
            </p>
            <table className="w-full min-w-[1120px] text-left border-collapse text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="px-4 py-3 w-10">
                    <input type="checkbox"
                      checked={
                        selectableOrders.length > 0 &&
                        selectableOrders.every((o: any) => selected.has(o.id))
                      }
                      onChange={toggleAll}
                      disabled={selectableOrders.length === 0}
                      className="w-4 h-4 rounded border-slate-300 text-blue-600 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                    />
                  </th>
                  <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Mã đơn</th>
                  <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Khách hàng</th>
                  <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Sản phẩm</th>
                  {isAdmin && !employeeId && (
                    <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Nhân viên</th>
                  )}
                  <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide text-right">Tổng tiền</th>
                  <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap">Ship / NV / HH</th>
                  <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide text-right whitespace-nowrap">Lương</th>
                  <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Trạng thái / TT</th>
                  <th className="px-4 py-3 w-24"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {orders.map((order: any) => {
                  const st = statusConfig[order.status] || { label: order.status, color: "bg-slate-100 text-slate-600", icon: Clock };
                  const pay = paymentConfig[order.payment_method] || { label: order.payment_method || "—", icon: Wallet };
                  const isSelected = selected.has(order.id);
                  const rowCanMutate = canSalesMutateOrderRow(order);
                  const initials = (order.customer_name || "?").split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase();
                  const isToday = order.created_at && new Date(order.created_at).toDateString() === new Date().toDateString();
                  const { khachTraShip, commissionAmt, nvChiuAmt, luongDon } = computeOrderMoney(order);
                  const items = orderItemsByOrderId[String(order.id)] || [];
                  return (
                    <tr key={order.id}
                      className={cn(
                        "group transition-colors",
                        rowCanMutate ? "cursor-pointer hover:bg-slate-50/60" : "cursor-default",
                        isSelected && "bg-blue-50/60"
                      )}
                      onClick={
                        rowCanMutate
                          ? () => navigate(`/orders/edit/${order.id}`, { state: { ordersListReturn } })
                          : undefined
                      }
                    >
                      <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                        <input type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleOne(order.id)}
                          disabled={!rowCanMutate}
                          className="w-4 h-4 rounded border-slate-300 text-blue-600 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                        />
                      </td>
                      <td className="px-4 py-3">
                        <div>
                          <span className="text-sm font-bold text-red-600 font-mono">{order.code || `#${order.id}`}</span>
                          <p className="text-xs text-slate-400 mt-0.5">
                            {isToday ? "Hôm nay" : (order.created_at ? formatDate(order.created_at) : "—")}
                            {order.created_at ? ` • ${new Date(order.created_at).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}` : ""}
                          </p>
                          {!isAdmin && order.group_name ? (
                            <span className="mt-1 inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-indigo-50 text-indigo-700">
                              {order.group_name}
                            </span>
                          ) : null}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-xs font-bold text-slate-500 flex-shrink-0">
                            {initials}
                          </div>
                          <div>
                            <p className="font-semibold text-slate-900 text-sm leading-tight">{order.customer_name || "—"}</p>
                            <p className="text-xs text-slate-400">{order.customer_phone || ""}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        {items.length ? (
                          <div className="space-y-0.5">
                            {items.slice(0, 2).map((it: any, idx: number) => (
                              <p key={`${it.product_id}-${idx}`} className="text-xs text-slate-700 leading-tight">
                                <span className="font-semibold">{it.product_name}</span>{" "}
                                <span className="text-slate-400">×</span>{" "}
                                <span className="tabular-nums font-semibold">{it.qty}</span>
                                {it.unit ? <span className="text-slate-400"> {it.unit}</span> : null}
                              </p>
                            ))}
                            {items.length > 2 ? (
                              <p className="text-[11px] text-slate-400">+{items.length - 2} sản phẩm</p>
                            ) : null}
                          </div>
                        ) : (
                          <span className="text-slate-300 text-xs">—</span>
                        )}
                      </td>
                      {isAdmin && !employeeId && (
                        <td className="px-4 py-3">
                          <div>
                            <p className="text-sm text-slate-700 font-medium">{order.salesperson_name || "—"}</p>
                            {order.group_name ? (
                              <span className="mt-1 inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-indigo-50 text-indigo-700">
                                {order.group_name}
                              </span>
                            ) : (
                              <span className="text-slate-300 text-xs">—</span>
                            )}
                          </div>
                        </td>
                      )}
                      <td className="px-4 py-3 text-right">
                        <span className="text-sm font-bold text-slate-900">{formatCurrency(order.total_amount || 0)}</span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="space-y-0.5">
                          <p className="text-xs text-slate-700">
                            <span className="text-slate-400">Ship:</span>{" "}
                            <span className="font-semibold tabular-nums">
                              {order.ship_payer === "shop" ? "Shop trả" : `KH trả ${formatCurrency(Number(order.shipping_fee) || 0)}`}
                            </span>
                          </p>
                          <p className="text-xs">
                            <span className="text-slate-400">NV chịu:</span>{" "}
                            <span className={cn(
                              "tabular-nums",
                              nvChiuAmt > 0 ? "font-semibold text-rose-700" : "text-slate-400"
                            )}>
                              {nvChiuAmt > 0 ? formatCurrency(nvChiuAmt) : "—"}
                            </span>
                          </p>
                          <p className="text-xs">
                            <span className="text-slate-400">HH:</span>{" "}
                            <span className="font-semibold text-emerald-600 tabular-nums">
                              {formatCurrency(commissionAmt)}
                            </span>
                          </p>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span
                          className={cn(
                            "text-sm font-semibold tabular-nums",
                            luongDon < 0 ? "text-red-600" : "text-violet-800"
                          )}
                          title="HH + Ship KH Trả − NV chịu"
                        >
                          {formatCurrency(luongDon)}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="space-y-1">
                          <span className={cn("inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold", st.color)}>
                            <st.icon className="w-3 h-3" />
                            {st.label}
                          </span>
                          <div className="flex items-center gap-1.5 text-xs text-slate-500">
                            <pay.icon className="w-3.5 h-3.5 text-slate-300" />
                            {pay.label}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                        {/* Luôn hiện: mobile/touch không có hover → trước đây opacity-0 khiến mất icon */}
                        <div className="flex items-center justify-end gap-1 min-h-[28px]">
                          {rowCanMutate ? (
                            <>
                              <Link to={`/orders/edit/${order.id}`} state={{ ordersListReturn }}
                                className="w-7 h-7 rounded-lg bg-slate-100 hover:bg-blue-600 hover:text-white flex items-center justify-center text-slate-500 transition-all"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </Link>
                              <button
                                type="button"
                                onClick={() => handleDelete(order.id)}
                                disabled={deleting === order.id}
                                className="w-7 h-7 rounded-lg bg-slate-100 hover:bg-red-600 hover:text-white flex items-center justify-center text-slate-500 transition-all disabled:opacity-50"
                              >
                                {deleting === order.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                              </button>
                            </>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-1">
              <p className="text-xs text-slate-400">
                Hiển thị <span className="font-semibold text-slate-700">{(page - 1) * limit + 1}–{Math.min(page * limit, total)}</span> / <span className="font-semibold text-slate-700">{total}</span> đơn
              </p>
              <div className="flex items-center gap-1">
                <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 disabled:opacity-30 transition-all">
                  <ChevronLeft className="w-4 h-4" />
                </button>
                {getVisiblePageNumbers(page, totalPages, 5).map((p) => (
                  <button key={p} onClick={() => setPage(p)}
                    className={cn("w-8 h-8 rounded-lg text-xs font-bold transition-all",
                      page === p ? "bg-red-600 text-white shadow-lg shadow-red-600/20" : "hover:bg-slate-100 text-slate-600"
                    )}>
                    {p}
                  </button>
                ))}
                <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 disabled:opacity-30 transition-all">
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
