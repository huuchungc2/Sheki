import * as React from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft, Users, DollarSign, ShoppingCart,
  ChevronDown, Loader2, AlertCircle, Download, X
} from "lucide-react";
import { cn, formatCurrency, formatDate } from "../lib/utils";
import { exportCtvCommission } from "../lib/exportExcel";

const API_URL = "http://localhost:3000/api";

const STATUS_CFG: Record<string, { label: string; color: string }> = {
  pending:   { label: "Chờ duyệt", color: "bg-amber-100 text-amber-700" },
  shipping:  { label: "Đang giao", color: "bg-blue-100 text-blue-700" },
  completed: { label: "Đã giao",   color: "bg-emerald-100 text-emerald-700" },
  cancelled: { label: "Đã hủy",   color: "bg-red-100 text-red-600" },
};

function toDateStr(d: Date) { return d.toISOString().slice(0, 10); }
type Preset = "month" | "last_month" | "year" | "all";

const PRESETS: { key: Preset; label: string }[] = [
  { key: "month",      label: "Tháng này" },
  { key: "last_month", label: "Tháng trước" },
  { key: "year",       label: "Năm nay" },
  { key: "all",        label: "Tất cả" },
];

function getMonthYear(preset: Preset): { month?: string; year?: string } {
  const now = new Date();
  const y = now.getFullYear(), m = now.getMonth() + 1;
  if (preset === "month")      return { month: String(m).padStart(2,"0"), year: String(y) };
  if (preset === "last_month") return { month: String(m === 1 ? 12 : m - 1).padStart(2,"0"), year: String(m === 1 ? y - 1 : y) };
  if (preset === "year")       return { year: String(y) };
  return {};
}

export function CollaboratorsCommissionReport() {
  const navigate = useNavigate();
  const { id: paramId } = useParams(); // có khi vào từ /employees/:id/collaborators/commissions
  const currentUser = React.useMemo(() => {
    const u = localStorage.getItem("user"); return u ? JSON.parse(u) : null;
  }, []);
  // Nếu có paramId (admin xem nhân viên cụ thể) thì dùng paramId, không thì dùng user hiện tại
  const userId = paramId || currentUser?.id;

  const [preset, setPreset]       = React.useState<Preset>("month");
  const [groupId, setGroupId]     = React.useState("");
  const [groups, setGroups]       = React.useState<any[]>([]);
  const [loading, setLoading]     = React.useState(true);
  const [error, setError]         = React.useState<string | null>(null);
  const [summaryData, setSummary] = React.useState<any[]>([]);
  const [orders, setOrders]       = React.useState<any[]>([]);
  const [totals, setTotals]       = React.useState<any>({});
  const [expanded, setExpanded]   = React.useState<Set<number>>(new Set());
  const [detailOpen, setDetailOpen] = React.useState(false);
  const [detailLoading, setDetailLoading] = React.useState(false);
  const [detailError, setDetailError] = React.useState<string | null>(null);
  const [detailOrder, setDetailOrder] = React.useState<any>(null);
  const [detailOrderId, setDetailOrderId] = React.useState<number | null>(null);

  // Fetch groups của user
  React.useEffect(() => {
    const token = localStorage.getItem("token");
    fetch(`${API_URL}/groups/user/${userId}`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json()).then(j => setGroups(j.data || [])).catch(() => {});
  }, [userId]);

  const fetchData = React.useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const token = localStorage.getItem("token");
      const { month, year } = getMonthYear(preset);
      const params = new URLSearchParams();
      if (month)   params.set("month", month);
      if (year)    params.set("year", year);
      if (groupId) params.set("group_id", groupId);
      const res = await fetch(`${API_URL}/users/${userId}/collaborators/commissions?${params}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error("Không thể tải dữ liệu");
      const json = await res.json();
      setSummary(json.data?.summary || []);
      setOrders(json.data?.orders || []);
      setTotals(json.data?.totals || {});
    } catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  }, [userId, preset, groupId]);

  React.useEffect(() => { fetchData(); }, [fetchData]);

  const toggleExpand = (id: number) => {
    setExpanded(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const openOrderDetail = React.useCallback(async (orderId: number) => {
    setDetailOpen(true);
    setDetailOrderId(orderId);
    setDetailLoading(true);
    setDetailError(null);
    setDetailOrder(null);
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API_URL}/orders/${orderId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Không thể tải chi tiết đơn");
      const json = await res.json();
      setDetailOrder(json.data || null);
    } catch (e: any) {
      setDetailError(e?.message || "Không thể tải chi tiết đơn");
    } finally {
      setDetailLoading(false);
    }
  }, []);

  const closeOrderDetail = () => {
    setDetailOpen(false);
    setDetailOrderId(null);
    setDetailOrder(null);
    setDetailError(null);
  };

  // Group orders by ctv
  const ordersByCtv = React.useMemo(() => {
    const map: Record<number, any[]> = {};
    orders.forEach(o => {
      if (!map[o.collaborator_id]) map[o.collaborator_id] = [];
      map[o.collaborator_id].push(o);
    });
    return map;
  }, [orders]);

  const { month: mLabel, year: yLabel } = getMonthYear(preset);
  const periodLabel = preset === "all" ? "Tất cả thời gian"
    : preset === "year" ? `Năm ${yLabel}`
    : `Tháng ${mLabel}/${yLabel}`;

  if (loading) return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
    </div>
  );

  if (error) return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <div className="text-center">
        <AlertCircle className="w-12 h-12 mx-auto text-red-400 mb-3" />
        <p className="text-red-500 font-medium">{error}</p>
        <button onClick={fetchData} className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-xl text-sm">Thử lại</button>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Order detail modal */}
      {detailOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onMouseDown={closeOrderDetail}>
          <div
            className="w-full max-w-3xl rounded-2xl bg-white shadow-xl border border-slate-200 overflow-hidden"
            onMouseDown={(e) => e.stopPropagation()}
          >
            <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-400">Chi tiết đơn</p>
                <p className="font-bold text-slate-900">
                  {detailOrder?.code || (detailOrderId != null ? `#${detailOrderId}` : "—")}
                </p>
              </div>
              <button
                type="button"
                onClick={closeOrderDetail}
                className="p-2 rounded-lg hover:bg-slate-100 text-slate-500"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="px-5 py-4">
              {detailLoading ? (
                <div className="py-10 flex items-center justify-center">
                  <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
                </div>
              ) : detailError ? (
                <div className="py-8 text-center text-sm text-red-600">{detailError}</div>
              ) : !detailOrder ? (
                <div className="py-8 text-center text-sm text-slate-400">Không có dữ liệu</div>
              ) : (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="rounded-xl bg-slate-50 border border-slate-100 p-3">
                      <p className="text-[11px] text-slate-400">Khách hàng</p>
                      <p className="text-sm font-semibold text-slate-900">{detailOrder.customer_name || "—"}</p>
                    </div>
                    <div className="rounded-xl bg-slate-50 border border-slate-100 p-3">
                      <p className="text-[11px] text-slate-400">Tổng tiền</p>
                      <p className="text-sm font-semibold text-slate-900">{formatCurrency(detailOrder.total_amount || 0)}</p>
                    </div>
                    <div className="rounded-xl bg-slate-50 border border-slate-100 p-3">
                      <p className="text-[11px] text-slate-400">Nhóm</p>
                      <p className="text-sm font-semibold text-slate-900">{detailOrder.group_name || "—"}</p>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-slate-200 overflow-hidden">
                    <div className="px-4 py-2 bg-slate-50 border-b border-slate-200 text-xs font-bold text-slate-600">
                      Sản phẩm
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="border-b border-slate-100 bg-white">
                            <th className="px-4 py-2 text-left text-slate-500 font-semibold">Sản phẩm</th>
                            <th className="px-3 py-2 text-right text-slate-500 font-semibold">SL</th>
                            <th className="px-3 py-2 text-right text-slate-500 font-semibold">Đơn giá</th>
                            <th className="px-3 py-2 text-right text-slate-500 font-semibold">Tổng tiền dòng</th>
                            <th className="px-3 py-2 text-center text-slate-500 font-semibold">Tỷ lệ hưởng</th>
                            <th className="px-4 py-2 text-right text-slate-500 font-semibold">Tiền hưởng</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                          {(detailOrder.items || []).map((it: any, idx: number) => {
                            const net = (Number(it.unit_price) || 0) * (Number(it.qty) || 0) - (Number(it.discount_amount) || 0);
                            const bd = Array.isArray(detailOrder.override_breakdown)
                              ? detailOrder.override_breakdown.find((x: any) => String(x.product_id) === String(it.product_id))
                              : null;
                            const rateLabel =
                              bd?.override_rate != null ? `${bd.override_rate}%` : "Nhiều mức";
                            const amount = bd?.override_amount != null ? bd.override_amount : 0;
                            return (
                              <tr key={idx} className="hover:bg-slate-50/60">
                                <td className="px-4 py-2 text-slate-800 font-medium">{it.product_name || it.productName || "—"}</td>
                                <td className="px-3 py-2 text-right text-slate-700">{Number(it.qty || 0).toFixed(3).replace(/\.?0+$/, "")}</td>
                                <td className="px-3 py-2 text-right text-slate-700">{formatCurrency(it.unit_price || 0)}</td>
                                <td className="px-3 py-2 text-right text-slate-700">{formatCurrency(net)}</td>
                                <td className="px-3 py-2 text-center">
                                  <span className="inline-flex items-center rounded-full bg-emerald-50 text-emerald-700 px-2 py-0.5 font-semibold">
                                    {rateLabel}
                                  </span>
                                </td>
                                <td className="px-4 py-2 text-right text-emerald-700 font-bold">{formatCurrency(amount)}</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                  <p className="text-[11px] text-slate-400">
                    Nếu đơn có nhiều mức tier override, cột “Tỷ lệ” sẽ hiển thị “Nhiều mức”.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="p-2 hover:bg-slate-100 rounded-xl text-slate-500 transition-all">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Hoa hồng từ Cộng tác viên</h1>
            <p className="text-slate-500 text-sm mt-0.5">
              {currentUser?.full_name} • {periodLabel}{groupId ? ` • ${groups.find(g => String(g.id) === groupId)?.name || ""}` : ""}
            </p>
          </div>
        </div>
        <button
          onClick={() => exportCtvCommission({
            summaryData,
            orders,
            totals,
            userName: currentUser?.full_name || "NhanVien",
            period: periodLabel,
          })}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 transition-all shadow-sm disabled:opacity-50">
          <Download className="w-4 h-4" /> Xuất Excel
        </button>
      </div>

      {/* Filter */}
      <div className="bg-white border border-slate-200 rounded-2xl px-4 py-3 flex flex-wrap gap-3 items-center">
        {/* Preset buttons */}
        <div className="flex gap-1.5">
          {PRESETS.map(p => (
            <button key={p.key} onClick={() => setPreset(p.key)}
              className={cn("px-3 py-1.5 rounded-lg text-xs font-semibold transition-all",
                preset === p.key ? "bg-blue-600 text-white shadow-sm" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              )}>
              {p.label}
            </button>
          ))}
        </div>

        {/* Nhóm */}
        <select value={groupId} onChange={e => setGroupId(e.target.value)}
          className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium outline-none focus:border-blue-300 cursor-pointer">
          <option value="">Tất cả nhóm</option>
          {groups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
        </select>

        {groupId && (
          <button onClick={() => setGroupId("")}
            className="flex items-center gap-1 text-xs text-slate-400 hover:text-red-500 transition-colors">
            <X className="w-3.5 h-3.5" /> Xóa lọc
          </button>
        )}
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <div className="w-9 h-9 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600 mb-3">
            <DollarSign className="w-4 h-4" />
          </div>
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Tổng HH từ CTV</p>
          <p className="text-2xl font-bold text-emerald-700 mt-1">{formatCurrency(totals.total_override_commission || 0)}</p>
          <p className="text-xs text-slate-400 mt-1">{periodLabel}</p>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600 mb-3">
            <Users className="w-4 h-4" />
          </div>
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Số CTV có đơn</p>
          <p className="text-2xl font-bold text-slate-900 mt-1">
            {summaryData.filter(s => s.total_orders > 0).length}
          </p>
          <p className="text-xs text-slate-400 mt-1">Trong tổng {summaryData.length} CTV</p>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <div className="w-9 h-9 rounded-xl bg-amber-50 flex items-center justify-center text-amber-600 mb-3">
            <ShoppingCart className="w-4 h-4" />
          </div>
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Tổng đơn từ CTV</p>
          <p className="text-2xl font-bold text-slate-900 mt-1">{totals.total_orders || 0}</p>
          <p className="text-xs text-slate-400 mt-1">Doanh thu: {formatCurrency(totals.total_revenue || 0)}</p>
        </div>
      </div>

      {/* Bảng chi tiết theo từng CTV */}
      {summaryData.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-16 text-center">
          <Users className="w-10 h-10 mx-auto text-slate-200 mb-3" />
          <p className="text-slate-400 font-medium">Chưa có CTV hoặc chưa có đơn hàng trong kỳ này</p>
        </div>
      ) : (
        <div className="space-y-3">
          {summaryData.map((ctv: any) => {
            const isOpen = expanded.has(ctv.collaborator_id);
            const ctvOrders = ordersByCtv[ctv.collaborator_id] || [];
            return (
              <div key={ctv.collaborator_id} className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                {/* CTV header row */}
                <button
                  onClick={() => toggleExpand(ctv.collaborator_id)}
                  className="w-full px-5 py-4 flex items-center justify-between hover:bg-slate-50/60 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
                      {ctv.collaborator_name?.split(" ").map((n: string) => n[0]).join("").slice(0,2).toUpperCase()}
                    </div>
                    <div className="text-left">
                      <p className="font-bold text-slate-900">{ctv.collaborator_name}</p>
                       <p className="text-xs text-slate-400">
                         {ctv.total_orders} đơn •
                         DT: {formatCurrency(ctv.total_revenue)}
                       </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="text-xs text-slate-400">HH nhận được</p>
                      <p className="text-lg font-bold text-emerald-600">{formatCurrency(ctv.total_override_commission)}</p>
                    </div>
                    <ChevronDown className={cn("w-4 h-4 text-slate-400 transition-transform flex-shrink-0", isOpen && "rotate-180")} />
                  </div>
                </button>

                {/* Chi tiết đơn của CTV này */}
                {isOpen && (
                  <div className="border-t border-slate-100">
                    {ctvOrders.length === 0 ? (
                      <div className="px-5 py-6 text-center text-slate-400 text-sm">Không có đơn trong kỳ này</div>
                    ) : (
                      <table className="w-full text-sm border-collapse">
                        <thead>
                          <tr className="bg-slate-50 border-b border-slate-100">
                            <th className="px-5 py-2.5 text-xs font-semibold text-slate-500 text-left">Mã đơn</th>
                            <th className="px-5 py-2.5 text-xs font-semibold text-slate-500 text-left">Ngày</th>
                            <th className="px-5 py-2.5 text-xs font-semibold text-slate-500 text-left">Khách hàng</th>
                            <th className="px-5 py-2.5 text-xs font-semibold text-slate-500 text-left">Nhóm BH</th>
                            <th className="px-5 py-2.5 text-xs font-semibold text-slate-500 text-right">Tổng tiền</th>
                            <th className="px-5 py-2.5 text-xs font-semibold text-slate-500 text-center">Tỷ lệ</th>
                            <th className="px-5 py-2.5 text-xs font-semibold text-slate-500 text-right">HH nhận</th>
                            <th className="px-5 py-2.5 text-xs font-semibold text-slate-500 text-center">Trạng thái</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                          {ctvOrders.map((o: any) => {
                            const st = STATUS_CFG[o.status] || { label: o.status, color: "bg-slate-100 text-slate-600" };
                            return (
                              <tr key={o.order_id} className="hover:bg-slate-50/60 transition-colors">
                                <td className="px-5 py-2.5">
                                  <button
                                    type="button"
                                    onClick={() => openOrderDetail(Number(o.order_id))}
                                    className="font-bold text-blue-600 hover:underline font-mono text-xs"
                                  >
                                    {o.order_code}
                                  </button>
                                </td>
                                <td className="px-5 py-2.5 text-slate-500 text-xs">{formatDate(o.order_date)}</td>
                                <td className="px-5 py-2.5 text-slate-700">{o.customer_name || "—"}</td>
                                <td className="px-5 py-2.5">
                                  {o.group_name
                                    ? <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-600">{o.group_name}</span>
                                    : <span className="text-slate-300">—</span>}
                                </td>
                                <td className="px-5 py-2.5 text-right font-semibold text-slate-900">{formatCurrency(o.total_amount)}</td>
                                 <td className="px-5 py-2.5 text-center">
                                   <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
                                    {o.override_rate != null
                                      ? `${o.override_rate}%`
                                      : "Nhiều mức"}
                                   </span>
                                 </td>
                                <td className="px-5 py-2.5 text-right font-bold text-emerald-600">{formatCurrency(o.override_commission)}</td>
                                <td className="px-5 py-2.5 text-center">
                                  <span className={cn("px-2.5 py-0.5 rounded-full text-xs font-semibold", st.color)}>{st.label}</span>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                        <tfoot>
                          <tr className="bg-slate-800 text-white text-xs font-bold">
                            <td className="px-5 py-2.5" colSpan={4}>Tổng ({ctvOrders.length} đơn)</td>
                            <td className="px-5 py-2.5 text-right">{formatCurrency(ctvOrders.reduce((s: number, o: any) => s + o.total_amount, 0))}</td>
                            <td className="px-5 py-2.5"></td>
                            <td className="px-5 py-2.5 text-right text-emerald-400">{formatCurrency(ctvOrders.reduce((s: number, o: any) => s + o.override_commission, 0))}</td>
                            <td className="px-5 py-2.5"></td>
                          </tr>
                        </tfoot>
                      </table>
                    )}
                  </div>
                )}
              </div>
            );
          })}

          {/* Grand total */}
          <div className="bg-slate-800 text-white rounded-2xl px-5 py-4 flex items-center justify-between">
            <p className="font-bold">Tổng cộng tất cả CTV</p>
            <div className="flex items-center gap-8 text-sm">
              <div className="text-center">
                <p className="text-slate-400 text-xs">Số đơn</p>
                <p className="font-bold">{totals.total_orders || 0}</p>
              </div>
              <div className="text-center">
                <p className="text-slate-400 text-xs">Doanh thu CTV</p>
                <p className="font-bold">{formatCurrency(totals.total_revenue || 0)}</p>
              </div>
              <div className="text-center">
                <p className="text-slate-400 text-xs">HH tổng nhận</p>
                <p className="font-bold text-emerald-400 text-lg">{formatCurrency(totals.total_override_commission || 0)}</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
