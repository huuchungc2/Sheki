import * as React from "react";
import { Link } from "react-router-dom";
import { api } from "../lib/api";
import { formatCurrency, formatDate, cn } from "../lib/utils";
import {
  Loader2,
  AlertCircle,
  Plus,
  CheckCircle2,
  XCircle,
  Clock,
  ArrowRight,
  ShieldCheck,
} from "lucide-react";

type ReqItem = { product_id: number; product_name: string; sku: string; qty: number };

export function AdminReturns() {
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [requests, setRequests] = React.useState<any[]>([]);

  const [creating, setCreating] = React.useState(false);
  const [orderId, setOrderId] = React.useState("");
  const [reason, setReason] = React.useState("");
  const [orderItems, setOrderItems] = React.useState<any[]>([]);
  const [returnQtyByProduct, setReturnQtyByProduct] = React.useState<Record<number, number>>({});
  const [showItemsModal, setShowItemsModal] = React.useState(false);

  const [actionId, setActionId] = React.useState<number | null>(null);

  const fetchData = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res: any = await api.get(`/returns/requests?limit=100`);
      setRequests(res?.data ?? []);
    } catch (e: any) {
      setError(e?.message || "Không thể tải dữ liệu");
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    fetchData();
  }, [fetchData]);

  const loadOrderForRequest = async () => {
    setCreating(true);
    try {
      const orderRes: any = await api.get(`/orders/${orderId}`);
      const items = (orderRes?.data?.items ?? []).map((it: any) => ({
        product_id: it.product_id,
        product_name: it.product_name || it.name || `#${it.product_id}`,
        sku: it.sku || "",
        qty: Number(it.qty) || 0,
      }));

      // Get already-returned qty per product by calling returns list for admin (small scope)
      const retRes: any = await api.get(`/returns?limit=200`);
      const rows = retRes?.data ?? [];
      const returned: Record<number, number> = {};
      rows
        .filter((r: any) => Number(r.order_id) === Number(orderId))
        .forEach((r: any) => {
          (r.items || []).forEach((x: any) => {
            const pid = Number(x.product_id);
            returned[pid] = (returned[pid] || 0) + (Number(x.qty) || 0);
          });
        });

      setOrderItems(items);
      const defaults: Record<number, number> = {};
      items.forEach((it: any) => {
        const already = returned[it.product_id] || 0;
        defaults[it.product_id] = Math.max(0, (Number(it.qty) || 0) - already);
      });
      setReturnQtyByProduct(defaults);
      setShowItemsModal(true);
    } catch (e: any) {
      alert(e?.message || "Tạo yêu cầu hoàn thất bại");
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
      fetchData();
    } catch (e: any) {
      alert(e?.message || "Tạo yêu cầu hoàn thất bại");
    } finally {
      setCreating(false);
    }
  };

  const approve = async (id: number) => {
    const note = window.prompt("Ghi chú admin (tuỳ chọn):") ?? "";
    setActionId(id);
    try {
      await api.post(`/returns/requests/${id}/approve`, { admin_note: note || null });
      fetchData();
    } catch (e: any) {
      alert(e?.message || "Duyệt thất bại");
    } finally {
      setActionId(null);
    }
  };

  const reject = async (id: number) => {
    const note = window.prompt("Lý do từ chối:") ?? "";
    if (note === null) return;
    setActionId(id);
    try {
      await api.post(`/returns/requests/${id}/reject`, { admin_note: note || null });
      fetchData();
    } catch (e: any) {
      alert(e?.message || "Từ chối thất bại");
    } finally {
      setActionId(null);
    }
  };

  const statusPill = (st: string) => {
    if (st === "approved")
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700">
          <CheckCircle2 className="w-3 h-3" /> Đã duyệt
        </span>
      );
    if (st === "rejected")
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-rose-50 text-rose-700">
          <XCircle className="w-3 h-3" /> Từ chối
        </span>
      );
    if (st === "cancelled")
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-600">
          Đã hủy
        </span>
      );
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700">
        <Clock className="w-3 h-3" /> Chờ duyệt
      </span>
    );
  };

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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <ShieldCheck className="w-7 h-7 text-blue-600" />
            Quản lý hoàn hàng
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Tạo yêu cầu hoàn, duyệt / từ chối, tạo đơn hoàn và điều chỉnh hoa hồng.
          </p>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm font-bold text-slate-800">Tạo yêu cầu hoàn (full hoặc từng phần)</p>
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
                  <p className="text-xs text-slate-500 mt-0.5">Đơn #{orderId} — nhập số lượng hoàn theo từng sản phẩm</p>
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
                    <div key={it.product_id} className="flex items-center justify-between gap-3 p-3 bg-slate-50 rounded-xl border border-slate-100">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-slate-800 truncate">{it.product_name}</p>
                        <p className="text-[11px] text-slate-400 font-mono">{it.sku || `PID:${it.product_id}`}</p>
                        <p className="text-xs text-slate-500 mt-0.5">Đã mua: <span className="font-semibold">{it.qty}</span></p>
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
          <button
            onClick={fetchData}
            className="text-xs font-semibold text-slate-500 hover:text-slate-700"
          >
            Làm mới
          </button>
        </div>
        {requests.length === 0 ? (
          <div className="py-12 text-center text-slate-400 text-sm">Chưa có yêu cầu hoàn</div>
        ) : (
          <div className="divide-y divide-slate-50">
            {requests.map((r) => (
              <div key={r.id} className="p-5 hover:bg-slate-50/50">
                <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-slate-900">
                      Yêu cầu #{r.id} • {r.order_code}{" "}
                      <span className="text-xs font-medium text-slate-400">
                        ({formatDate(r.created_at)})
                      </span>
                    </p>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Tổng tiền đơn:{" "}
                      <span className="font-semibold">{formatCurrency(r.total_amount || 0)}</span>
                      {r.requested_by_name ? (
                        <>
                          {" "}
                          • Người tạo:{" "}
                          <span className="font-semibold">{r.requested_by_name}</span>
                        </>
                      ) : null}
                    </p>
                    {r.reason && <p className="text-xs text-slate-500 mt-1">Lý do: {r.reason}</p>}
                    {r.admin_note && (
                      <p className="text-xs text-emerald-700 mt-1">Admin: {r.admin_note}</p>
                    )}
                  </div>
                  <div className="flex flex-wrap items-center gap-2 shrink-0">
                    {statusPill(r.status)}
                    <Link
                      to={`/orders/edit/${r.order_id}`}
                      className="text-xs font-semibold text-blue-600 hover:underline inline-flex items-center gap-1"
                    >
                      Mở đơn <ArrowRight className="w-3 h-3" />
                    </Link>
                    {r.status === "pending" && (
                      <>
                        <button
                          type="button"
                          disabled={actionId === r.id}
                          onClick={() => approve(r.id)}
                          className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50"
                        >
                          {actionId === r.id ? "..." : "Duyệt"}
                        </button>
                        <button
                          type="button"
                          disabled={actionId === r.id}
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
                  {(r.items as ReqItem[] | undefined)?.map((it, idx) => (
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
  );
}
