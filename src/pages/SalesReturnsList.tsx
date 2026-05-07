import * as React from "react";
import { Link, useSearchParams } from "react-router-dom";
import { api } from "../lib/api";
import { formatCurrency, formatDate, cn, isAdminUser } from "../lib/utils";
import { parseListPage, getVisiblePageNumbers } from "../lib/listUrl";
import { exportReturnsList } from "../lib/exportExcel";
import {
  Loader2,
  AlertCircle,
  Package,
  ArrowRight,
  Wallet,
  TrendingDown,
  ShieldCheck,
  Plus,
  CheckCircle2,
  XCircle,
  Clock,
  Search,
  Calendar,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  X,
  Download,
} from "lucide-react";

type ReturnRow = {
  id: number;
  order_id: number;
  order_code: string;
  warehouse_name: string | null;
  created_by_name: string;
  note: string | null;
  created_at: string;
  items: { product_id: number; product_name: string; sku: string; qty: number }[];
  return_amount: number; // goods value (positive); UI shows negative
  commission_return_amount: number; // negative sum
};

type ReqItem = { product_id: number; product_name: string; sku: string; qty: number };

type ReturnRequestRow = {
  id: number;
  order_id: number;
  order_code: string;
  status: "pending" | "approved" | "rejected" | "cancelled";
  reason: string | null;
  admin_note: string | null;
  requested_by_name: string | null;
  approved_by_name: string | null;
  created_at: string;
  items: ReqItem[];
};

type DatePreset = "today" | "week" | "month" | "last_month" | "last_year" | "custom" | "";

function toDateStr(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function getPresetRange(preset: DatePreset): { from: string; to: string } {
  const today = new Date();
  const y = today.getFullYear();
  const m = today.getMonth();
  const d = today.getDate();
  if (preset === "today") return { from: toDateStr(today), to: toDateStr(today) };
  if (preset === "week") {
    const dow = today.getDay();
    const diffMon = dow === 0 ? -6 : 1 - dow;
    const mon = new Date(y, m, d + diffMon);
    const sun = new Date(y, m, d + diffMon + 6);
    return { from: toDateStr(mon), to: toDateStr(sun) };
  }
  if (preset === "month") return { from: toDateStr(new Date(y, m, 1)), to: toDateStr(new Date(y, m + 1, 0)) };
  if (preset === "last_month")
    return { from: toDateStr(new Date(y, m - 1, 1)), to: toDateStr(new Date(y, m, 0)) };
  if (preset === "last_year") return { from: toDateStr(new Date(y - 1, 0, 1)), to: toDateStr(new Date(y - 1, 11, 31)) };
  return { from: "", to: "" };
}

function readListParams(sp: URLSearchParams) {
  const today = toDateStr(new Date());
  const page = parseListPage(sp);
  const search = sp.get("q") ?? "";
  const groupId = sp.get("group_id") ?? "";
  const rawPreset = sp.get("preset") as DatePreset | null;
  const datePreset: DatePreset =
    rawPreset && ["today", "week", "month", "last_month", "last_year", "custom", ""].includes(rawPreset)
      ? rawPreset || "today"
      : "today";
  const dateFrom = sp.get("from") ?? today;
  const dateTo = sp.get("to") ?? today;
  return { page, search, groupId, dateFrom, dateTo, datePreset };
}

export function SalesReturnsList() {
  const currentUser = React.useMemo(() => {
    const u = localStorage.getItem("user");
    return u ? JSON.parse(u) : null;
  }, []);
  const isAdmin = isAdminUser(currentUser);

  const [searchParams, setSearchParams] = useSearchParams();
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [rows, setRows] = React.useState<ReturnRow[]>([]);
  const [total, setTotal] = React.useState(0);
  const [showDateMenu, setShowDateMenu] = React.useState(false);
  const [groups, setGroups] = React.useState<any[]>([]);
  const [searchInput, setSearchInput] = React.useState("");
  const [isComposing, setIsComposing] = React.useState(false);
  const [exporting, setExporting] = React.useState(false);

  const [tab, setTab] = React.useState<"returns" | "requests">("returns");

  // Admin requests
  const [reqLoading, setReqLoading] = React.useState(false);
  const [reqError, setReqError] = React.useState<string | null>(null);
  const [requests, setRequests] = React.useState<ReturnRequestRow[]>([]);
  const [reqActionId, setReqActionId] = React.useState<number | null>(null);
  const [deleteId, setDeleteId] = React.useState<number | null>(null);

  const [creating, setCreating] = React.useState(false);
  const [orderId, setOrderId] = React.useState("");
  const [reason, setReason] = React.useState("");
  const [orderItems, setOrderItems] = React.useState<any[]>([]);
  const [returnQtyByProduct, setReturnQtyByProduct] = React.useState<Record<number, number>>({});
  const [showItemsModal, setShowItemsModal] = React.useState(false);

  const limit = 20;
  const todayStr = toDateStr(new Date());
  const { page, search, groupId, dateFrom, dateTo, datePreset } = React.useMemo(
    () => readListParams(searchParams),
    [searchParams.toString()]
  );
  const hasActiveFilters =
    Boolean(search) ||
    Boolean(groupId) ||
    datePreset !== "today" ||
    dateFrom !== todayStr ||
    dateTo !== todayStr ||
    page > 1;

  const presetLabels: Record<string, string> = {
    today: "Hôm nay",
    week: "Tuần này",
    month: "Tháng này",
    last_month: "Tháng trước",
    last_year: "Năm trước",
    custom: "Tuỳ chọn",
  };

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
    if (isComposing) return;
    const t = window.setTimeout(() => {
      const next = searchInput;
      if (next === search) return;
      const hasMeaningful = next.trim().length > 0;
      patchListParams({ q: hasMeaningful ? next : null }, { resetPage: true });
    }, 350);
    return () => window.clearTimeout(t);
  }, [searchInput, search, patchListParams, isComposing]);

  const applyPreset = (preset: DatePreset) => {
    if (preset !== "custom") {
      const { from, to } = getPresetRange(preset);
      patchListParams({ preset, from, to, page: "1" }, { resetPage: true });
    } else {
      patchListParams({ preset: "custom", page: "1" }, { resetPage: true });
    }
    if (preset !== "custom") setShowDateMenu(false);
  };

  const fetchRequests = React.useCallback(async () => {
    if (!isAdmin) return;
    setReqLoading(true);
    setReqError(null);
    try {
      const res: any = await api.get(`/returns/requests?limit=100`);
      setRequests((res?.data ?? []) as ReturnRequestRow[]);
    } catch (e: any) {
      setReqError(e?.message || "Không thể tải yêu cầu hoàn");
    } finally {
      setReqLoading(false);
    }
  }, [isAdmin]);

  // Fetch groups for filter
  React.useEffect(() => {
    const token = localStorage.getItem("token");
    const endpoint = isAdmin ? "/groups" : `/groups/user/${currentUser?.id}`;
    fetch(`/api${endpoint}`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(j => setGroups(j.data || []))
      .catch(() => {});
  }, [isAdmin, currentUser?.id]);

  const fetchData = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { page: p, search: q, groupId: gid, dateFrom: df, dateTo: dt } = readListParams(searchParams);
      const qs = new URLSearchParams({
        page: String(p),
        limit: String(limit),
        ...(q ? { q } : {}),
        ...(df ? { date_from: df } : {}),
        ...(dt ? { date_to: dt } : {}),
        ...(gid ? { group_id: gid } : {}),
      });
      const res: any = await api.get(`/returns?${qs.toString()}`);
      setRows(res?.data ?? []);
      setTotal(res?.total ?? 0);
      const totalPages = Math.ceil((res?.total ?? 0) / limit);
      if (totalPages > 0 && p > totalPages) patchListParams({ page: String(totalPages) });
    } catch (e: any) {
      setError(e?.message || "Không thể tải dữ liệu");
    } finally {
      setLoading(false);
    }
  }, [searchParams.toString(), patchListParams]);

  const exportExcel = React.useCallback(async () => {
    try {
      setExporting(true);
      const { search: q, groupId: gid, dateFrom: df, dateTo: dt } = readListParams(searchParams);
      const qs = new URLSearchParams({
        page: "1",
        limit: "10000",
        ...(q ? { q } : {}),
        ...(df ? { date_from: df } : {}),
        ...(dt ? { date_to: dt } : {}),
        ...(gid ? { group_id: gid } : {}),
      });
      const res: any = await api.get(`/returns?${qs.toString()}`);
      const allRows = (res?.data ?? []) as any[];
      const groupName = gid ? (groups.find((g) => String(g.id) === String(gid))?.name || "") : "";
      exportReturnsList({
        rows: allRows,
        meta: {
          dateFrom: df,
          dateTo: dt,
          groupName: groupName || undefined,
        },
      });
    } catch (e: any) {
      alert(e?.message || "Xuất Excel thất bại");
    } finally {
      setExporting(false);
    }
  }, [searchParams.toString(), groups]);

  const deleteReturn = React.useCallback(
    async (id: number) => {
      if (!isAdmin) return;
      const ok = window.confirm(`Xóa đơn hoàn #${id}? Hệ thống sẽ hoàn lại kho và khôi phục hoa hồng đã trừ.`);
      if (!ok) return;
      setDeleteId(id);
      try {
        await api.delete(`/returns/${id}`);
        await fetchData();
        if (tab === "requests") await fetchRequests();
      } catch (e: any) {
        alert(e?.message || "Xóa đơn hoàn thất bại");
      } finally {
        setDeleteId(null);
      }
    },
    [isAdmin, fetchData, tab, fetchRequests]
  );

  React.useEffect(() => {
    fetchData();
  }, [fetchData]);

  React.useEffect(() => {
    if (isAdmin && tab === "requests") fetchRequests();
  }, [isAdmin, tab, fetchRequests]);

  const loadOrderForRequest = async () => {
    if (!orderId) return;
    setCreating(true);
    try {
      const orderRes: any = await api.get(`/orders/${orderId}`);
      const items = (orderRes?.data?.items ?? []).map((it: any) => ({
        product_id: it.product_id,
        product_name: it.product_name || it.name || `#${it.product_id}`,
        sku: it.sku || "",
        qty: Number(it.qty) || 0,
      }));
      setOrderItems(items);
      const defaults: Record<number, number> = {};
      items.forEach((it: any) => {
        defaults[it.product_id] = Math.max(0, Number(it.qty) || 0);
      });
      setReturnQtyByProduct(defaults);
      setShowItemsModal(true);
    } catch (e: any) {
      alert(e?.message || "Không thể tải đơn để tạo yêu cầu hoàn");
    } finally {
      setCreating(false);
    }
  };

  const submitRequest = async () => {
    const items = orderItems
      .map((it: any) => ({
        product_id: it.product_id,
        qty: Number(returnQtyByProduct[it.product_id] || 0),
      }))
      .filter((it: any) => it.qty > 0);
    if (items.length === 0) {
      alert("Vui lòng nhập số lượng hoàn cho ít nhất 1 sản phẩm");
      return;
    }
    setCreating(true);
    try {
      await api.post(`/returns/requests`, {
        order_id: Number(orderId),
        reason: reason || null,
        items,
      });
      setShowItemsModal(false);
      setOrderItems([]);
      setReturnQtyByProduct({});
      setOrderId("");
      setReason("");
      fetchRequests();
    } catch (e: any) {
      alert(e?.message || "Tạo yêu cầu hoàn thất bại");
    } finally {
      setCreating(false);
    }
  };

  const approve = async (id: number) => {
    const note = window.prompt("Ghi chú admin (tuỳ chọn):") ?? "";
    setReqActionId(id);
    try {
      await api.post(`/returns/requests/${id}/approve`, { admin_note: note || null });
      fetchRequests();
    } catch (e: any) {
      alert(e?.message || "Duyệt thất bại");
    } finally {
      setReqActionId(null);
    }
  };

  const reject = async (id: number) => {
    const note = window.prompt("Lý do từ chối:") ?? "";
    if (note === null) return;
    setReqActionId(id);
    try {
      await api.post(`/returns/requests/${id}/reject`, { admin_note: note || null });
      fetchRequests();
    } catch (e: any) {
      alert(e?.message || "Từ chối thất bại");
    } finally {
      setReqActionId(null);
    }
  };

  const totals = React.useMemo(() => {
    const totalReturnAmount = rows.reduce((s, r) => s + (Number(r.return_amount) || 0), 0);
    const totalCommissionReturnAbs = rows.reduce(
      (s, r) => s + Math.abs(Number(r.commission_return_amount) || 0),
      0
    );
    return { totalReturnAmount, totalCommissionReturnAbs };
  }, [rows]);

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 mx-auto text-destructive/70 mb-4" />
          <p className="text-destructive font-medium">{error}</p>
          <button
            onClick={fetchData}
            className="mt-4 inline-flex items-center h-10 px-4 bg-primary text-primary-foreground rounded-md text-sm font-semibold hover:opacity-95 transition-opacity"
          >
            Thử lại
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 min-w-0">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">Đơn hoàn</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Danh sách đơn hoàn liên quan đơn hàng của bạn (chỉ xem).
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {tab === "returns" && (
            <button
              type="button"
              onClick={exportExcel}
              disabled={exporting}
              className={cn(
                "inline-flex items-center gap-2 h-10 px-3 rounded-md border text-sm font-semibold transition-colors",
                exporting
                  ? "bg-muted text-muted-foreground border-border cursor-not-allowed"
                  : "bg-background text-foreground border-border hover:bg-accent"
              )}
              title="Xuất Excel theo bộ lọc hiện tại"
            >
              {exporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
              Xuất Excel
            </button>
          )}
          <button onClick={fetchData} className="text-sm font-semibold text-muted-foreground hover:text-foreground transition-colors">
            Làm mới
          </button>
        </div>
      </div>

      {isAdmin && (
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setTab("returns")}
            className={cn(
              "h-9 px-3 rounded-md text-sm font-semibold border transition-colors",
              tab === "returns"
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-background text-foreground border-border hover:bg-accent"
            )}
          >
            Đơn hoàn
          </button>
          <button
            type="button"
            onClick={() => setTab("requests")}
            className={cn(
              "h-9 px-3 rounded-md text-sm font-semibold border inline-flex items-center gap-2 transition-colors",
              tab === "requests"
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-background text-foreground border-border hover:bg-accent"
            )}
          >
            <ShieldCheck className="w-4 h-4" />
            Yêu cầu hoàn
          </button>
        </div>
      )}

      {isAdmin && tab === "requests" && (
        <div className="space-y-4">
          <div className="bg-card border border-border rounded-xl p-5 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-semibold text-foreground">Tạo yêu cầu hoàn</p>
              <span className="text-xs text-muted-foreground">Order ID (VD: 123)</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-[160px_1fr_180px] gap-3 items-end">
              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1">Order ID</label>
                <input
                  value={orderId}
                  onChange={(e) => setOrderId(e.target.value)}
                  className="w-full h-10 px-3 border border-input bg-background rounded-md text-sm font-medium text-foreground outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                  placeholder="123"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1">Lý do (tuỳ chọn)</label>
                <input
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="w-full h-10 px-3 border border-input bg-background rounded-md text-sm font-medium text-foreground outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                  placeholder="Khách đổi size / lỗi sản phẩm..."
                />
              </div>
              <button
                disabled={!orderId || creating}
                onClick={loadOrderForRequest}
                className={cn(
                  "inline-flex items-center justify-center gap-2 h-10 px-4 rounded-md text-sm font-semibold transition-colors",
                  !orderId || creating
                    ? "bg-muted text-muted-foreground cursor-not-allowed"
                    : "bg-primary text-primary-foreground hover:opacity-95 transition-opacity"
                )}
              >
                {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                Chọn sản phẩm hoàn
              </button>
            </div>
          </div>

          {showItemsModal && (
            <>
              <div className="fixed inset-0 bg-foreground/40 z-40" onClick={() => !creating && setShowItemsModal(false)} />
              <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                <div className="w-full max-w-2xl bg-card rounded-2xl border border-border shadow-2xl overflow-hidden">
                  <div className="px-5 py-4 border-b border-border flex items-center justify-between">
                    <div>
                      <p className="text-sm font-semibold text-foreground">Chọn số lượng hoàn</p>
                      <p className="text-xs text-muted-foreground mt-0.5">Đơn #{orderId}</p>
                    </div>
                    <button
                      onClick={() => !creating && setShowItemsModal(false)}
                      className="text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors"
                    >
                      Đóng
                    </button>
                  </div>
                  <div className="p-5 space-y-3 max-h-[60vh] overflow-y-auto">
                    {orderItems.length === 0 ? (
                      <div className="text-sm text-muted-foreground text-center py-8">Không có sản phẩm</div>
                    ) : (
                      orderItems.map((it: any) => (
                        <div
                          key={it.product_id}
                          className="flex items-center justify-between gap-3 p-3 bg-muted/20 rounded-xl border border-border"
                        >
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-foreground truncate">{it.product_name}</p>
                            <p className="text-[11px] text-muted-foreground font-mono">{it.sku || `PID:${it.product_id}`}</p>
                            <p className="text-xs text-muted-foreground mt-0.5">
                              Đã mua: <span className="font-semibold">{it.qty}</span>
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-muted-foreground">Hoàn</span>
                            <input
                              type="number"
                              min={0}
                              max={it.qty}
                              step="0.001"
                              value={returnQtyByProduct[it.product_id] ?? 0}
                              onChange={(e) => {
                                const v = Math.max(0, Number(e.target.value || 0));
                                setReturnQtyByProduct((prev) => ({ ...prev, [it.product_id]: v }));
                              }}
                              className="w-28 h-10 px-3 border border-input bg-background rounded-md text-sm font-semibold text-foreground outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background text-right"
                            />
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                  <div className="px-5 py-4 border-t border-border flex items-center justify-end gap-2">
                    <button
                      onClick={() => setShowItemsModal(false)}
                      disabled={creating}
                      className="h-10 px-4 bg-background border border-border rounded-md text-sm font-semibold text-foreground hover:bg-accent transition-colors disabled:opacity-50"
                    >
                      Hủy
                    </button>
                    <button
                      onClick={submitRequest}
                      disabled={creating}
                      className="h-10 px-4 bg-primary text-primary-foreground rounded-md text-sm font-semibold hover:opacity-95 transition-opacity disabled:opacity-50 inline-flex items-center gap-2"
                    >
                      {creating && <Loader2 className="w-4 h-4 animate-spin" />}
                      Tạo yêu cầu hoàn
                    </button>
                  </div>
                </div>
              </div>
            </>
          )}

          <div className="bg-card border border-border rounded-xl overflow-hidden shadow-sm">
            <div className="px-5 py-4 border-b border-border flex items-center justify-between">
              <p className="text-sm font-semibold text-foreground">Yêu cầu hoàn</p>
              <button onClick={fetchRequests} className="text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors">
                Làm mới
              </button>
            </div>
            {reqLoading ? (
              <div className="py-12 flex items-center justify-center">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
              </div>
            ) : reqError ? (
              <div className="py-10 text-center text-sm text-destructive">{reqError}</div>
            ) : requests.length === 0 ? (
              <div className="py-12 text-center text-muted-foreground text-sm">Chưa có yêu cầu hoàn</div>
            ) : (
              <div className="divide-y divide-border">
                {requests.map((r) => (
                  <div key={r.id} className="p-5 hover:bg-muted/20 transition-colors">
                    <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-foreground">
                          Yêu cầu #{r.id} • {r.order_code}{" "}
                          <span className="text-xs font-medium text-muted-foreground">({formatDate(r.created_at)})</span>
                        </p>
                        {r.reason && <p className="text-xs text-muted-foreground mt-1">Lý do: {r.reason}</p>}
                        {r.admin_note && <p className="text-xs text-emerald-700 dark:text-emerald-300 mt-1">Admin: {r.admin_note}</p>}
                      </div>
                      <div className="flex flex-wrap items-center gap-2 shrink-0">
                        <span
                          className={cn(
                            "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold border",
                            r.status === "approved"
                              ? "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-300 dark:border-emerald-900/50"
                              : r.status === "rejected"
                                ? "bg-destructive/10 text-destructive border-destructive/30"
                                : "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/30 dark:text-amber-300 dark:border-amber-900/50"
                          )}
                        >
                          {r.status === "approved" ? (
                            <>
                              <CheckCircle2 className="w-3 h-3" /> Đã duyệt
                            </>
                          ) : r.status === "rejected" ? (
                            <>
                              <XCircle className="w-3 h-3" /> Từ chối
                            </>
                          ) : (
                            <>
                              <Clock className="w-3 h-3" /> Chờ duyệt
                            </>
                          )}
                        </span>
                        {r.status === "pending" && (
                          <>
                            <button
                              type="button"
                              disabled={reqActionId === r.id}
                              onClick={() => approve(r.id)}
                              className="h-9 px-3 rounded-md text-xs font-semibold bg-primary text-primary-foreground hover:opacity-95 transition-opacity disabled:opacity-50"
                            >
                              {reqActionId === r.id ? "..." : "Duyệt"}
                            </button>
                            <button
                              type="button"
                              disabled={reqActionId === r.id}
                              onClick={() => reject(r.id)}
                              className="h-9 px-3 rounded-md text-xs font-semibold bg-destructive/10 text-destructive border border-destructive/30 hover:bg-destructive hover:text-destructive-foreground hover:border-destructive/50 transition-colors disabled:opacity-50"
                            >
                              Từ chối
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                    <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-2">
                      {(r.items || []).map((it, idx) => (
                        <div
                          key={idx}
                          className="flex items-center justify-between px-3 py-2 bg-muted/20 rounded-xl border border-border text-xs"
                        >
                          <div className="min-w-0">
                            <p className="font-semibold text-foreground truncate">{it.product_name}</p>
                            <p className="text-[10px] text-muted-foreground font-mono">{it.sku}</p>
                          </div>
                          <span className="font-bold text-foreground">{it.qty}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {tab === "requests" ? null : (
        <>
          {/* Filter bar — y chang OrderList (bỏ status/nhóm/nhân viên) */}
          <div className="bg-card border border-border rounded-xl p-4 space-y-3">
        <div className="flex flex-wrap gap-3">
          {/* Search */}
          <div className="relative flex-1 min-w-[200px]">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              onCompositionStart={() => setIsComposing(true)}
              onCompositionEnd={(e) => {
                setIsComposing(false);
                setSearchInput((e.target as HTMLInputElement).value);
              }}
              placeholder="Mã đơn, ghi chú..."
              className="w-full h-10 pl-9 pr-4 bg-background border border-input rounded-md text-sm font-medium text-foreground outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            />
          </div>

          {/* Date preset dropdown */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowDateMenu(!showDateMenu)}
              className="flex items-center gap-2 h-10 px-3 bg-background border border-input rounded-md text-sm font-semibold text-foreground transition-colors min-w-[140px] justify-between focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            >
              <Calendar className="w-4 h-4 text-muted-foreground" />
              <span>{datePreset ? presetLabels[datePreset] : "Chọn thời gian"}</span>
              <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
            </button>
            {showDateMenu && (
              <div className="absolute top-full left-0 mt-1 w-52 bg-popover text-popover-foreground border border-border rounded-xl shadow-xl z-50 overflow-hidden">
                {(["today", "week", "month", "last_month", "last_year", "custom"] as DatePreset[]).map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => applyPreset(p)}
                    className={cn(
                      "w-full px-4 py-2.5 text-left text-sm hover:bg-accent transition-colors",
                      datePreset === p ? "bg-accent text-accent-foreground font-semibold" : "text-foreground"
                    )}
                  >
                    {presetLabels[p]}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Group filter */}
          <select
            value={groupId}
            onChange={(e) => patchListParams({ group_id: e.target.value || null }, { resetPage: true })}
            className="h-10 px-3 bg-background border border-input rounded-md text-sm font-semibold text-foreground transition-colors min-w-[140px] outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          >
            <option value="">Tất cả nhóm</option>
            {groups.map((g) => (
              <option key={g.id} value={g.id}>
                {g.name}
              </option>
            ))}
          </select>

          {/* Custom date range — chỉ hiện khi preset = custom */}
          {datePreset === "custom" && (
            <div className="flex items-center gap-2">
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => {
                  patchListParams({ from: e.target.value, preset: "custom" }, { resetPage: true });
                }}
                className="h-10 px-3 bg-background border border-input rounded-md text-sm font-medium text-foreground outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
              />
              <span className="text-muted-foreground text-xs">–</span>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => {
                  patchListParams({ to: e.target.value, preset: "custom" }, { resetPage: true });
                }}
                className="h-10 px-3 bg-background border border-input rounded-md text-sm font-medium text-foreground outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
              />
            </div>
          )}

          {/* Xóa lọc */}
          {hasActiveFilters && (
            <button
              type="button"
              onClick={() => {
                setSearchParams(new URLSearchParams(), { replace: true });
              }}
              className="flex items-center gap-1.5 h-10 px-3 text-xs font-semibold text-muted-foreground bg-background border border-border rounded-md hover:bg-accent transition-colors"
            >
              <X className="w-3.5 h-3.5" />
              Xóa lọc
            </button>
          )}
        </div>

        {/* Hiển thị range ngày đang áp dụng */}
        {(dateFrom || dateTo) && datePreset !== "custom" && (
          <p className="text-xs text-muted-foreground">
            Đang lọc: <span className="font-semibold text-foreground">{dateFrom || "..."} → {dateTo || "..."}</span>
          </p>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="bg-card border border-border rounded-xl p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-muted-foreground">Tổng số đơn hoàn</p>
            <div className="w-9 h-9 rounded-xl bg-destructive/10 flex items-center justify-center">
              <Package className="w-5 h-5 text-destructive" />
            </div>
          </div>
          <p className="mt-3 text-2xl font-semibold text-foreground tabular-nums">{total || 0}</p>
          <p className="mt-1 text-xs text-muted-foreground">Tổng số đơn hoàn theo bộ lọc hiện tại.</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-muted-foreground">Tổng doanh số hoàn</p>
            <div className="w-9 h-9 rounded-xl bg-destructive/10 flex items-center justify-center">
              <Wallet className="w-5 h-5 text-destructive" />
            </div>
          </div>
          <p className="mt-3 text-2xl font-semibold text-destructive tabular-nums">
            {formatCurrency(-Math.abs(totals.totalReturnAmount))}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">Tổng giá trị hàng hoàn (sau CK dòng), không gồm ship.</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-muted-foreground">Tổng hoa hồng hoàn</p>
            <div className="w-9 h-9 rounded-xl bg-destructive/10 flex items-center justify-center">
              <TrendingDown className="w-5 h-5 text-destructive" />
            </div>
          </div>
          <p className="mt-3 text-2xl font-semibold text-destructive tabular-nums">
            {formatCurrency(-Math.abs(totals.totalCommissionReturnAbs))}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">Tổng hoa hồng bị trừ do hoàn hàng.</p>
        </div>
      </div>

      <div className="bg-card border border-border rounded-xl overflow-hidden shadow-sm">
        {rows.length === 0 ? (
          <div className="py-16 text-center text-muted-foreground text-sm">
            <Package className="w-10 h-10 mx-auto mb-2 text-muted-foreground/50" />
            Chưa có đơn hoàn nào
          </div>
        ) : (
          <div className="divide-y divide-border">
            {rows.map((r) => (
              <div key={r.id} className="p-5 hover:bg-muted/20 transition-colors">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
                  <div>
                    <p className="text-sm font-semibold text-foreground">
                      Đơn hoàn #{r.id}{" "}
                      <span className="text-xs font-medium text-muted-foreground">
                        ({formatDate(r.created_at)})
                      </span>
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Đơn gốc:{" "}
                      <span className="font-mono font-semibold text-foreground">{r.order_code}</span>
                      {r.warehouse_name ? (
                        <> • Kho nhập: <span className="font-semibold">{r.warehouse_name}</span></>
                      ) : null}
                      {r.created_by_name ? (
                        <> • Xử lý: <span className="font-semibold">{r.created_by_name}</span></>
                      ) : null}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Doanh số hoàn:{" "}
                      <span className="font-semibold text-destructive tabular-nums">
                        {formatCurrency(-Math.abs(Number(r.return_amount) || 0))}
                      </span>
                      {" "}•{" "}
                      HH hoàn:{" "}
                      <span className="font-semibold text-destructive tabular-nums">
                        {formatCurrency(-Math.abs(Number(r.commission_return_amount) || 0))}
                      </span>
                    </p>
                    {r.note && (
                      <p className="text-xs text-muted-foreground mt-1">Ghi chú: {r.note}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 justify-end">
                    {isAdmin && (
                      <button
                        type="button"
                        disabled={deleteId === r.id}
                        onClick={() => deleteReturn(r.id)}
                        className={cn(
                          "text-xs font-semibold px-3 py-1.5 rounded-xl border transition-all",
                          deleteId === r.id
                            ? "bg-muted text-muted-foreground border-border cursor-not-allowed"
                            : "bg-background text-destructive border-destructive/30 hover:bg-destructive hover:text-destructive-foreground hover:border-destructive/50 transition-colors"
                        )}
                        title="Xóa đơn hoàn (rollback kho + hoa hồng)"
                      >
                        {deleteId === r.id ? "Đang xóa..." : "Xóa"}
                      </button>
                    )}
                    <Link
                      to={`/orders/edit/${r.order_id}`}
                      className="text-xs font-semibold text-primary hover:underline inline-flex items-center gap-1 shrink-0"
                    >
                      Xem đơn gốc <ArrowRight className="w-3 h-3" />
                    </Link>
                  </div>
                </div>
                <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-2">
                  {(r.items || []).map((it, idx) => (
                    <div
                      key={idx}
                      className={cn(
                        "flex items-center justify-between px-3 py-2 bg-muted/20 rounded-xl border border-border text-xs"
                      )}
                    >
                      <div className="min-w-0">
                        <p className="font-semibold text-foreground truncate">{it.product_name}</p>
                        <p className="text-[10px] text-muted-foreground font-mono">{it.sku}</p>
                      </div>
                      <span className="font-bold text-foreground">{it.qty}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {total > limit && (
        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground">
            Tổng: <span className="font-semibold text-foreground">{total}</span> • Trang{" "}
            <span className="font-semibold text-foreground">{page}</span>
          </p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className={cn(
                "h-10 px-3 rounded-md border text-sm font-semibold inline-flex items-center gap-1 transition-colors",
                page <= 1 ? "bg-muted text-muted-foreground border-border cursor-not-allowed" : "bg-background text-foreground border-border hover:bg-accent"
              )}
            >
              <ChevronLeft className="w-4 h-4" />
              Trước
            </button>

            <div className="hidden sm:flex items-center gap-1">
              {getVisiblePageNumbers(page, Math.ceil(total / limit), 5).map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setPage(p)}
                  className={cn(
                    "w-9 h-9 rounded-md text-sm font-semibold border transition-colors",
                    p === page ? "bg-primary text-primary-foreground border-primary" : "bg-background text-foreground border-border hover:bg-accent"
                  )}
                >
                  {p}
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={() => setPage((p) => p + 1)}
              disabled={page >= Math.ceil(total / limit)}
              className={cn(
                "h-10 px-3 rounded-md border text-sm font-semibold inline-flex items-center gap-1 transition-colors",
                page >= Math.ceil(total / limit)
                  ? "bg-muted text-muted-foreground border-border cursor-not-allowed"
                  : "bg-background text-foreground border-border hover:bg-accent"
              )}
            >
              Sau
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
