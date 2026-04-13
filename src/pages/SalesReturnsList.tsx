import * as React from "react";
import { Link, useSearchParams } from "react-router-dom";
import { api } from "../lib/api";
import { formatCurrency, formatDate, cn, isAdminUser } from "../lib/utils";
import { parseListPage, getVisiblePageNumbers } from "../lib/listUrl";
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
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 mx-auto text-red-400 mb-4" />
          <p className="text-red-500 font-medium">{error}</p>
          <button
            onClick={fetchData}
            className="mt-4 inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-semibold"
          >
            Thử lại
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Đơn hoàn</h1>
          <p className="text-sm text-slate-500 mt-1">
            Danh sách đơn hoàn liên quan đơn hàng của bạn (chỉ xem).
          </p>
        </div>
        <button onClick={fetchData} className="text-sm font-semibold text-slate-500 hover:text-slate-700 shrink-0">
          Làm mới
        </button>
      </div>

      {isAdmin && (
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setTab("returns")}
            className={cn(
              "px-3 py-1.5 rounded-xl text-sm font-semibold border",
              tab === "returns"
                ? "bg-blue-600 text-white border-blue-600"
                : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
            )}
          >
            Đơn hoàn
          </button>
          <button
            type="button"
            onClick={() => setTab("requests")}
            className={cn(
              "px-3 py-1.5 rounded-xl text-sm font-semibold border inline-flex items-center gap-2",
              tab === "requests"
                ? "bg-blue-600 text-white border-blue-600"
                : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
            )}
          >
            <ShieldCheck className="w-4 h-4" />
            Yêu cầu hoàn
          </button>
        </div>
      )}

      {isAdmin && tab === "requests" && (
        <div className="space-y-4">
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-bold text-slate-800">Tạo yêu cầu hoàn</p>
              <span className="text-xs text-slate-400">Order ID (VD: 123)</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-[160px_1fr_180px] gap-3 items-end">
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">Order ID</label>
                <input
                  value={orderId}
                  onChange={(e) => setOrderId(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-300"
                  placeholder="123"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">Lý do (tuỳ chọn)</label>
                <input
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-300"
                  placeholder="Khách đổi size / lỗi sản phẩm..."
                />
              </div>
              <button
                disabled={!orderId || creating}
                onClick={loadOrderForRequest}
                className={cn(
                  "inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all",
                  !orderId || creating
                    ? "bg-slate-100 text-slate-400 cursor-not-allowed"
                    : "bg-blue-600 text-white hover:bg-blue-700"
                )}
              >
                {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                Chọn sản phẩm hoàn
              </button>
            </div>
          </div>

          {showItemsModal && (
            <>
              <div className="fixed inset-0 bg-black/30 z-40" onClick={() => !creating && setShowItemsModal(false)} />
              <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                <div className="w-full max-w-2xl bg-white rounded-2xl border border-slate-200 shadow-2xl overflow-hidden">
                  <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
                    <div>
                      <p className="text-sm font-bold text-slate-900">Chọn số lượng hoàn</p>
                      <p className="text-xs text-slate-500 mt-0.5">Đơn #{orderId}</p>
                    </div>
                    <button
                      onClick={() => !creating && setShowItemsModal(false)}
                      className="text-xs font-semibold text-slate-500 hover:text-slate-700"
                    >
                      Đóng
                    </button>
                  </div>
                  <div className="p-5 space-y-3 max-h-[60vh] overflow-y-auto">
                    {orderItems.length === 0 ? (
                      <div className="text-sm text-slate-400 text-center py-8">Không có sản phẩm</div>
                    ) : (
                      orderItems.map((it: any) => (
                        <div
                          key={it.product_id}
                          className="flex items-center justify-between gap-3 p-3 bg-slate-50 rounded-xl border border-slate-100"
                        >
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-slate-800 truncate">{it.product_name}</p>
                            <p className="text-[11px] text-slate-400 font-mono">{it.sku || `PID:${it.product_id}`}</p>
                            <p className="text-xs text-slate-500 mt-0.5">
                              Đã mua: <span className="font-semibold">{it.qty}</span>
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-slate-500">Hoàn</span>
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
                              className="w-28 px-3 py-2 border border-slate-200 rounded-xl text-sm font-bold text-slate-800 outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-300 text-right"
                            />
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                  <div className="px-5 py-4 border-t border-slate-100 flex items-center justify-end gap-2">
                    <button
                      onClick={() => setShowItemsModal(false)}
                      disabled={creating}
                      className="px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                    >
                      Hủy
                    </button>
                    <button
                      onClick={submitRequest}
                      disabled={creating}
                      className="px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700 disabled:opacity-50 inline-flex items-center gap-2"
                    >
                      {creating && <Loader2 className="w-4 h-4 animate-spin" />}
                      Tạo yêu cầu hoàn
                    </button>
                  </div>
                </div>
              </div>
            </>
          )}

          <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
              <p className="text-sm font-bold text-slate-700">Yêu cầu hoàn</p>
              <button onClick={fetchRequests} className="text-xs font-semibold text-slate-500 hover:text-slate-700">
                Làm mới
              </button>
            </div>
            {reqLoading ? (
              <div className="py-12 flex items-center justify-center">
                <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
              </div>
            ) : reqError ? (
              <div className="py-10 text-center text-sm text-rose-700">{reqError}</div>
            ) : requests.length === 0 ? (
              <div className="py-12 text-center text-slate-400 text-sm">Chưa có yêu cầu hoàn</div>
            ) : (
              <div className="divide-y divide-slate-50">
                {requests.map((r) => (
                  <div key={r.id} className="p-5 hover:bg-slate-50/50">
                    <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-slate-900">
                          Yêu cầu #{r.id} • {r.order_code}{" "}
                          <span className="text-xs font-medium text-slate-400">({formatDate(r.created_at)})</span>
                        </p>
                        {r.reason && <p className="text-xs text-slate-500 mt-1">Lý do: {r.reason}</p>}
                        {r.admin_note && <p className="text-xs text-emerald-700 mt-1">Admin: {r.admin_note}</p>}
                      </div>
                      <div className="flex flex-wrap items-center gap-2 shrink-0">
                        <span
                          className={cn(
                            "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold",
                            r.status === "approved"
                              ? "bg-emerald-50 text-emerald-700"
                              : r.status === "rejected"
                                ? "bg-rose-50 text-rose-700"
                                : "bg-amber-50 text-amber-700"
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
                              className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50"
                            >
                              {reqActionId === r.id ? "..." : "Duyệt"}
                            </button>
                            <button
                              type="button"
                              disabled={reqActionId === r.id}
                              onClick={() => reject(r.id)}
                              className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-rose-100 text-rose-700 hover:bg-rose-200 disabled:opacity-50"
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
                          className="flex items-center justify-between px-3 py-2 bg-slate-50 rounded-xl border border-slate-100 text-xs"
                        >
                          <div className="min-w-0">
                            <p className="font-semibold text-slate-700 truncate">{it.product_name}</p>
                            <p className="text-[10px] text-slate-400 font-mono">{it.sku}</p>
                          </div>
                          <span className="font-bold text-slate-800">{it.qty}</span>
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
          <div className="bg-white border border-slate-200 rounded-2xl p-4 space-y-3">
        <div className="flex flex-wrap gap-3">
          {/* Search */}
          <div className="relative flex-1 min-w-[200px]">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => {
                patchListParams({ q: e.target.value || null }, { resetPage: true });
              }}
              placeholder="Mã đơn, ghi chú..."
              className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 focus:border-red-300 focus:bg-white focus:ring-2 focus:ring-red-100 rounded-xl text-sm outline-none transition-all"
            />
          </div>

          {/* Date preset dropdown */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowDateMenu(!showDateMenu)}
              className="flex items-center gap-2 px-3 py-2 bg-slate-50 border border-slate-200 hover:border-red-300 rounded-xl text-sm font-medium text-slate-700 transition-all min-w-[140px] justify-between"
            >
              <Calendar className="w-4 h-4 text-slate-400" />
              <span>{datePreset ? presetLabels[datePreset] : "Chọn thời gian"}</span>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
            </button>
            {showDateMenu && (
              <div className="absolute top-full left-0 mt-1 w-52 bg-white border border-slate-200 rounded-xl shadow-xl z-50 overflow-hidden">
                {(["today", "week", "month", "last_month", "last_year", "custom"] as DatePreset[]).map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => applyPreset(p)}
                    className={cn(
                      "w-full px-4 py-2.5 text-left text-sm hover:bg-slate-50 transition-colors",
                      datePreset === p ? "bg-red-50 text-red-600 font-semibold" : "text-slate-700"
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
            className="px-3 py-2 bg-slate-50 border border-slate-200 hover:border-red-300 rounded-xl text-sm font-medium text-slate-700 transition-all min-w-[140px]"
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
                className="px-3 py-2 bg-slate-50 border border-slate-200 focus:border-red-300 rounded-xl text-sm outline-none focus:ring-2 focus:ring-red-100"
              />
              <span className="text-slate-400 text-xs">–</span>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => {
                  patchListParams({ to: e.target.value, preset: "custom" }, { resetPage: true });
                }}
                className="px-3 py-2 bg-slate-50 border border-slate-200 focus:border-red-300 rounded-xl text-sm outline-none focus:ring-2 focus:ring-red-100"
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

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-slate-500">Tổng số đơn hoàn</p>
            <div className="w-9 h-9 rounded-xl bg-rose-50 flex items-center justify-center">
              <Package className="w-5 h-5 text-rose-600" />
            </div>
          </div>
          <p className="mt-3 text-2xl font-extrabold text-slate-900 tabular-nums">{total || 0}</p>
          <p className="mt-1 text-xs text-slate-500">Tổng số đơn hoàn theo bộ lọc hiện tại.</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-slate-500">Tổng doanh số hoàn</p>
            <div className="w-9 h-9 rounded-xl bg-rose-50 flex items-center justify-center">
              <Wallet className="w-5 h-5 text-rose-600" />
            </div>
          </div>
          <p className="mt-3 text-2xl font-extrabold text-rose-700 tabular-nums">
            {formatCurrency(-Math.abs(totals.totalReturnAmount))}
          </p>
          <p className="mt-1 text-xs text-slate-500">Tổng giá trị hàng hoàn (sau CK dòng), không gồm ship.</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-slate-500">Tổng hoa hồng hoàn</p>
            <div className="w-9 h-9 rounded-xl bg-rose-50 flex items-center justify-center">
              <TrendingDown className="w-5 h-5 text-rose-600" />
            </div>
          </div>
          <p className="mt-3 text-2xl font-extrabold text-rose-700 tabular-nums">
            {formatCurrency(-Math.abs(totals.totalCommissionReturnAbs))}
          </p>
          <p className="mt-1 text-xs text-slate-500">Tổng hoa hồng bị trừ do hoàn hàng.</p>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
        {rows.length === 0 ? (
          <div className="py-16 text-center text-slate-400 text-sm">
            <Package className="w-10 h-10 mx-auto mb-2 text-slate-200" />
            Chưa có đơn hoàn nào
          </div>
        ) : (
          <div className="divide-y divide-slate-50">
            {rows.map((r) => (
              <div key={r.id} className="p-5 hover:bg-slate-50/50">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
                  <div>
                    <p className="text-sm font-bold text-slate-900">
                      Đơn hoàn #{r.id}{" "}
                      <span className="text-xs font-medium text-slate-400">
                        ({formatDate(r.created_at)})
                      </span>
                    </p>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Đơn gốc:{" "}
                      <span className="font-mono font-semibold text-slate-700">{r.order_code}</span>
                      {r.warehouse_name ? (
                        <> • Kho nhập: <span className="font-semibold">{r.warehouse_name}</span></>
                      ) : null}
                      {r.created_by_name ? (
                        <> • Xử lý: <span className="font-semibold">{r.created_by_name}</span></>
                      ) : null}
                    </p>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Doanh số hoàn:{" "}
                      <span className="font-extrabold text-rose-700 tabular-nums">
                        {formatCurrency(-Math.abs(Number(r.return_amount) || 0))}
                      </span>
                      {" "}•{" "}
                      HH hoàn:{" "}
                      <span className="font-extrabold text-rose-700 tabular-nums">
                        {formatCurrency(-Math.abs(Number(r.commission_return_amount) || 0))}
                      </span>
                    </p>
                    {r.note && (
                      <p className="text-xs text-slate-500 mt-1">Ghi chú: {r.note}</p>
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
                            ? "bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed"
                            : "bg-white text-rose-700 border-rose-200 hover:bg-rose-50"
                        )}
                        title="Xóa đơn hoàn (rollback kho + hoa hồng)"
                      >
                        {deleteId === r.id ? "Đang xóa..." : "Xóa"}
                      </button>
                    )}
                    <Link
                      to={`/orders/edit/${r.order_id}`}
                      className="text-xs font-semibold text-blue-600 hover:underline inline-flex items-center gap-1 shrink-0"
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
                        "flex items-center justify-between px-3 py-2 bg-slate-50 rounded-xl border border-slate-100 text-xs"
                      )}
                    >
                      <div className="min-w-0">
                        <p className="font-semibold text-slate-700 truncate">{it.product_name}</p>
                        <p className="text-[10px] text-slate-400 font-mono">{it.sku}</p>
                      </div>
                      <span className="font-bold text-slate-800">{it.qty}</span>
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
          <p className="text-xs text-slate-500">
            Tổng: <span className="font-bold text-slate-700">{total}</span> • Trang{" "}
            <span className="font-bold text-slate-700">{page}</span>
          </p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className={cn(
                "px-3 py-2 rounded-xl border text-sm font-semibold inline-flex items-center gap-1",
                page <= 1 ? "bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed" : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
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
                    "w-9 h-9 rounded-xl text-sm font-semibold border",
                    p === page ? "bg-blue-600 text-white border-blue-600" : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
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
                "px-3 py-2 rounded-xl border text-sm font-semibold inline-flex items-center gap-1",
                page >= Math.ceil(total / limit)
                  ? "bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed"
                  : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
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
