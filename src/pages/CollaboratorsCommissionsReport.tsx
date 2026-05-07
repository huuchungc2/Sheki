import * as React from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Users, DollarSign, ShoppingCart, ChevronDown,
  Loader2, AlertCircle, Download, X, Search, TrendingUp
} from "lucide-react";
import { cn, formatCurrency, formatDate } from "../lib/utils";
import { exportAdminCommission } from "../lib/exportExcel";

const API_URL =
  (import.meta as any)?.env?.VITE_API_URL ||
  "/api";

const STATUS_CFG: Record<string, { label: string; color: string }> = {
  pending:   { label: "Chờ duyệt", color: "bg-muted text-foreground border border-border" },
  shipping:  { label: "Đang giao", color: "bg-muted text-foreground border border-border" },
  completed: { label: "Đã giao",   color: "bg-accent text-accent-foreground border border-border" },
  cancelled: { label: "Đã hủy",   color: "bg-destructive/10 text-destructive border border-destructive/30" },
};

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
  if (preset === "last_month") return { month: String(m===1?12:m-1).padStart(2,"0"), year: String(m===1?y-1:y) };
  if (preset === "year")       return { year: String(y) };
  return {};
}

export default function CollaboratorsCommissionsReport() {
  const navigate = useNavigate();

  const [preset, setPreset]     = React.useState<Preset>("month");
  const [groupId, setGroupId]   = React.useState("");
  const [salesId, setSalesId]   = React.useState("");
  const [groups, setGroups]     = React.useState<any[]>([]);
  const [employees, setEmployees] = React.useState<any[]>([]);
  const [loading, setLoading]   = React.useState(true);
  const [error, setError]       = React.useState<string | null>(null);
  const [pairs, setPairs]       = React.useState<any[]>([]);
  const [orders, setOrders]     = React.useState<any[]>([]);
  const [totals, setTotals]     = React.useState<any>({});
  const [expanded, setExpanded] = React.useState<Set<string>>(new Set());
  const [searchQ, setSearchQ]   = React.useState("");
  const [detailOpen, setDetailOpen] = React.useState(false);
  const [detailLoading, setDetailLoading] = React.useState(false);
  const [detailError, setDetailError] = React.useState<string | null>(null);
  const [detailOrder, setDetailOrder] = React.useState<any>(null);
  const [detailOrderId, setDetailOrderId] = React.useState<number | null>(null);

  // Fetch groups + employees
  React.useEffect(() => {
    const token = localStorage.getItem("token");
    fetch(`${API_URL}/groups`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json()).then(j => setGroups(j.data || [])).catch(() => {});
    fetch(`${API_URL}/users?scoped=1&limit=100&active_only=1`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json()).then(j => setEmployees(j.data || [])).catch(() => {});
  }, []);

  const fetchData = React.useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const token = localStorage.getItem("token");
      const { month, year } = getMonthYear(preset);
      const params = new URLSearchParams();
      if (month)   params.set("month", month);
      if (year)    params.set("year", year);
      if (groupId) params.set("group_id", groupId);
      if (salesId) params.set("sales_id", salesId);
      const res = await fetch(`${API_URL}/collaborators/commissions/all?${params}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error("Không thể tải dữ liệu");
      const json = await res.json();
      setPairs(json.data?.pairs || []);
      setOrders(json.data?.orders || []);
      setTotals(json.data?.totals || {});
    } catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  }, [preset, groupId, salesId]);

  React.useEffect(() => { fetchData(); }, [fetchData]);

  const toggleExpand = (key: string) => {
    setExpanded(prev => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
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

  // Group orders by sales+ctv pair
  const ordersByPair = React.useMemo(() => {
    const map: Record<string, any[]> = {};
    orders.forEach(o => {
      const key = `${o.sales_id}-${o.ctv_id}`;
      if (!map[key]) map[key] = [];
      map[key].push(o);
    });
    return map;
  }, [orders]);

  // Group pairs by sales
  const pairsBySales = React.useMemo(() => {
    const map: Record<number, any[]> = {};
    pairs.forEach(p => {
      if (!map[p.sales_id]) map[p.sales_id] = [];
      map[p.sales_id].push(p);
    });
    return map;
  }, [pairs]);

  // Filter by search
  const salesIds = React.useMemo(() => {
    const ids = Object.keys(pairsBySales).map(Number);
    if (!searchQ) return ids;
    return ids.filter(id => {
      const name = pairsBySales[id]?.[0]?.sales_name?.toLowerCase() || "";
      return name.includes(searchQ.toLowerCase());
    });
  }, [pairsBySales, searchQ]);

  const { month: mLabel, year: yLabel } = getMonthYear(preset);
  const periodLabel = preset === "all" ? "Tất cả thời gian"
    : preset === "year" ? `Năm ${yLabel}`
    : `Tháng ${mLabel}/${yLabel}`;

  if (loading) return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <Loader2 className="w-8 h-8 animate-spin text-primary" />
    </div>
  );

  if (error) return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <div className="text-center">
        <AlertCircle className="w-12 h-12 mx-auto text-destructive/80 mb-3" />
        <p className="text-destructive font-semibold">{error}</p>
        <button onClick={fetchData} className="mt-4 h-10 px-4 bg-primary text-primary-foreground rounded-md text-sm font-semibold hover:opacity-95 transition-opacity">Thử lại</button>
      </div>
    </div>
  );

  return (
    <div className="space-y-6 min-w-0 max-w-full">
      {/* Order detail modal */}
      {detailOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/40 p-4" onMouseDown={closeOrderDetail}>
          <div
            className="w-full max-w-3xl rounded-2xl bg-card shadow-xl border border-border overflow-hidden"
            onMouseDown={(e) => e.stopPropagation()}
          >
            <div className="px-5 py-4 border-b border-border flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Chi tiết đơn</p>
                <p className="font-semibold text-foreground">
                  {detailOrder?.code || (detailOrderId != null ? `#${detailOrderId}` : "—")}
                </p>
              </div>
              <button
                type="button"
                onClick={closeOrderDetail}
                className="p-2 rounded-lg hover:bg-accent text-muted-foreground transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="px-5 py-4">
              {detailLoading ? (
                <div className="py-10 flex items-center justify-center">
                  <Loader2 className="w-6 h-6 animate-spin text-primary" />
                </div>
              ) : detailError ? (
                <div className="py-8 text-center text-sm text-destructive">{detailError}</div>
              ) : !detailOrder ? (
                <div className="py-8 text-center text-sm text-muted-foreground">Không có dữ liệu</div>
              ) : (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="rounded-xl bg-muted/20 border border-border p-3">
                      <p className="text-[11px] text-muted-foreground">Khách hàng</p>
                      <p className="text-sm font-semibold text-foreground">{detailOrder.customer_name || "—"}</p>
                    </div>
                    <div className="rounded-xl bg-muted/20 border border-border p-3">
                      <p className="text-[11px] text-muted-foreground">Tổng tiền</p>
                      <p className="text-sm font-semibold text-foreground">{formatCurrency(detailOrder.total_amount || 0)}</p>
                    </div>
                    <div className="rounded-xl bg-muted/20 border border-border p-3">
                      <p className="text-[11px] text-muted-foreground">Nhóm</p>
                      <p className="text-sm font-semibold text-foreground">{detailOrder.group_name || "—"}</p>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-border overflow-hidden">
                    <div className="px-4 py-2 bg-muted/30 border-b border-border text-xs font-semibold text-muted-foreground">
                      Sản phẩm
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="border-b border-border bg-card">
                            <th className="px-4 py-2 text-left text-muted-foreground font-semibold">Sản phẩm</th>
                            <th className="px-3 py-2 text-right text-muted-foreground font-semibold">SL</th>
                            <th className="px-3 py-2 text-right text-muted-foreground font-semibold">Đơn giá</th>
                            <th className="px-3 py-2 text-right text-muted-foreground font-semibold">Tổng tiền dòng</th>
                            <th className="px-3 py-2 text-center text-muted-foreground font-semibold">Tỷ lệ hưởng</th>
                            <th className="px-4 py-2 text-right text-muted-foreground font-semibold">Tiền hưởng</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                          {(detailOrder.items || []).map((it: any, idx: number) => {
                            const net = (Number(it.unit_price) || 0) * (Number(it.qty) || 0) - (Number(it.discount_amount) || 0);
                            const bd = Array.isArray(detailOrder.override_breakdown)
                              ? detailOrder.override_breakdown.find((x: any) => String(x.product_id) === String(it.product_id))
                              : null;
                            const rateLabel =
                              bd?.override_rate != null ? `${bd.override_rate}%` : "Nhiều mức";
                            const amount = bd?.override_amount != null ? bd.override_amount : 0;
                            return (
                              <tr key={idx} className="hover:bg-muted/20 transition-colors">
                                <td className="px-4 py-2 text-foreground font-medium">{it.product_name || it.productName || "—"}</td>
                                <td className="px-3 py-2 text-right text-foreground">{Number(it.qty || 0).toFixed(3).replace(/\.?0+$/, "")}</td>
                                <td className="px-3 py-2 text-right text-foreground">{formatCurrency(it.unit_price || 0)}</td>
                                <td className="px-3 py-2 text-right text-foreground">{formatCurrency(net)}</td>
                                <td className="px-3 py-2 text-center">
                                  <span className="inline-flex items-center rounded-full bg-muted text-foreground px-2 py-0.5 font-semibold border border-border">
                                    {rateLabel}
                                  </span>
                                </td>
                                <td className="px-4 py-2 text-right text-foreground font-semibold">{formatCurrency(amount)}</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                  <p className="text-[11px] text-muted-foreground">
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
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">Báo cáo hoa hồng CTV toàn hệ thống</h1>
          <p className="text-muted-foreground text-sm mt-0.5">{periodLabel} — Hoa hồng Sales nhận từ CTV của mình</p>
        </div>
        <button
          onClick={() => {
            const { month, year } = (() => {
              const now = new Date(); const y = now.getFullYear(), m = now.getMonth() + 1;
              if (preset === "month")      return { month: String(m).padStart(2,"0"), year: String(y) };
              if (preset === "last_month") return { month: String(m===1?12:m-1).padStart(2,"0"), year: String(m===1?y-1:y) };
              if (preset === "year")       return { month: "00", year: String(y) };
              return { month: "00", year: String(y) };
            })();
            exportAdminCommission({
              salesData: [],
              orderCommissions: [],
              ctvPairs:  pairs,
              ctvOrders: orders,
              month,
              year,
              groupName: groups.find(g => String(g.id) === groupId)?.name || "",
            });
          }}
          disabled={loading}
          className="flex items-center gap-2 h-10 px-4 bg-primary text-primary-foreground rounded-md text-sm font-semibold hover:opacity-95 transition-opacity shadow-sm disabled:opacity-50">
          <Download className="w-4 h-4" /> Xuất Excel
        </button>
      </div>

      {/* Filter */}
      <div className="bg-card border border-border rounded-xl px-4 py-3 flex flex-wrap gap-3 items-center">
        <div className="flex gap-1.5">
          {PRESETS.map(p => (
            <button key={p.key} onClick={() => setPreset(p.key)}
              className={cn("px-3 py-1.5 rounded-md text-xs font-semibold transition-colors border",
                preset === p.key ? "bg-primary text-primary-foreground border-primary" : "bg-background text-foreground border-border hover:bg-accent"
              )}>
              {p.label}
            </button>
          ))}
        </div>

        <select value={groupId} onChange={e => setGroupId(e.target.value)}
          className="h-9 px-3 bg-background border border-input rounded-md text-xs font-semibold text-foreground outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background cursor-pointer">
          <option value="">Tất cả nhóm</option>
          {groups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
        </select>

        <select value={salesId} onChange={e => setSalesId(e.target.value)}
          className="h-9 px-3 bg-background border border-input rounded-md text-xs font-semibold text-foreground outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background cursor-pointer min-w-[140px]">
          <option value="">Tất cả Sales</option>
          {employees.map(e => <option key={e.id} value={e.id}>{e.full_name}</option>)}
        </select>

        {/* Search */}
        <div className="relative ml-auto">
          <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input type="text" value={searchQ} onChange={e => setSearchQ(e.target.value)}
            placeholder="Tìm nhân viên..."
            className="h-9 pl-8 pr-3 bg-background border border-input rounded-md text-xs outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background w-40 text-foreground"
          />
        </div>

        {(groupId || salesId) && (
          <button onClick={() => { setGroupId(""); setSalesId(""); }}
            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors">
            <X className="w-3.5 h-3.5" /> Xóa lọc
          </button>
        )}
      </div>

      {/* Stat cards — mobile 2 cột như Dashboard */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="bg-card p-5 rounded-xl border border-border shadow-sm">
          <div className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center text-primary mb-3">
            <DollarSign className="w-4 h-4" />
          </div>
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Tổng HH override</p>
          <p className="text-2xl font-semibold text-foreground mt-1">{formatCurrency(totals.total_override || 0)}</p>
          <p className="text-xs text-muted-foreground mt-1">{periodLabel}</p>
        </div>
        <div className="bg-card p-5 rounded-xl border border-border shadow-sm">
          <div className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center text-primary mb-3">
            <Users className="w-4 h-4" />
          </div>
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Cặp Sales-CTV</p>
          <p className="text-2xl font-semibold text-foreground mt-1">{pairs.length}</p>
          <p className="text-xs text-muted-foreground mt-1">{salesIds.length} Sales có CTV</p>
        </div>
        <div className="col-span-2 lg:col-span-1 bg-card p-5 rounded-xl border border-border shadow-sm">
          <div className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center text-primary mb-3">
            <ShoppingCart className="w-4 h-4" />
          </div>
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Tổng đơn từ CTV</p>
          <p className="text-2xl font-semibold text-foreground mt-1">{totals.total_orders || 0}</p>
        </div>
      </div>

      {/* Bảng tổng hợp — nhóm theo Sales */}
      {salesIds.length === 0 ? (
        <div className="bg-card rounded-xl border border-border p-16 text-center">
          <Users className="w-10 h-10 mx-auto text-muted-foreground/50 mb-3" />
          <p className="text-muted-foreground font-medium">Chưa có dữ liệu hoa hồng CTV trong kỳ này</p>
        </div>
      ) : (
        <div className="space-y-3">
          {salesIds.map(sid => {
            const salesPairs = pairsBySales[sid] || [];
            const salesName = salesPairs[0]?.sales_name || "—";
            const salesTotal = salesPairs.reduce((s, p) => s + p.override_commission, 0);
            const salesOrders = salesPairs.reduce((s, p) => s + p.total_orders, 0);
            const salesKey = `sales-${sid}`;
            const isSalesOpen = expanded.has(salesKey);

            return (
              <div key={sid} className="bg-card rounded-xl border border-border shadow-sm overflow-hidden">
                {/* Sales header */}
                <button
                  onClick={() => toggleExpand(salesKey)}
                  className="w-full px-5 py-4 flex items-center justify-between hover:bg-muted/20 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-primary-foreground text-sm font-bold">
                      {salesName.split(" ").map((n: string) => n[0]).join("").slice(0,2).toUpperCase()}
                    </div>
                    <div className="text-left">
                      <p className="font-semibold text-foreground">{salesName}</p>
                      <p className="text-xs text-muted-foreground">{salesPairs.length} CTV • {salesOrders} đơn</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="text-xs text-muted-foreground">Tổng HH từ CTV</p>
                      <p className="text-lg font-semibold text-foreground">{formatCurrency(salesTotal)}</p>
                    </div>
                    <Link to={`/employees/${sid}`} onClick={e => e.stopPropagation()}
                      className="text-xs text-primary hover:underline px-3 py-1 bg-accent rounded-lg flex-shrink-0">
                      Tổng quan
                    </Link>
                    <ChevronDown className={cn("w-4 h-4 text-muted-foreground transition-transform flex-shrink-0", isSalesOpen && "rotate-180")} />
                  </div>
                </button>

                {/* CTV list của Sales này */}
                {isSalesOpen && (
                  <div className="border-t border-border divide-y divide-border">
                    {salesPairs.map((pair: any) => {
                      const pairKey = `${pair.sales_id}-${pair.ctv_id}`;
                      const isPairOpen = expanded.has(pairKey);
                      const pairOrders = ordersByPair[pairKey] || [];

                      return (
                        <div key={pairKey}>
                          {/* CTV row */}
                          <button
                            onClick={() => toggleExpand(pairKey)}
                            className="w-full px-5 py-3 flex items-center justify-between bg-muted/20 hover:bg-muted/30 transition-colors"
                          >
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-primary text-xs font-bold border border-border">
                                {pair.ctv_name?.split(" ").map((n: string) => n[0]).join("").slice(0,2).toUpperCase()}
                              </div>
                              <div className="text-left">
                                <p className="text-sm font-semibold text-foreground">{pair.ctv_name}</p>
                                 <p className="text-xs text-muted-foreground">
                                   {pair.total_orders} đơn • DT: {formatCurrency(pair.total_revenue)}
                                 </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-3">
                              <p className="font-semibold text-foreground">{formatCurrency(pair.override_commission)}</p>
                              <ChevronDown className={cn("w-3.5 h-3.5 text-muted-foreground transition-transform", isPairOpen && "rotate-180")} />
                            </div>
                          </button>

                          {/* Đơn của cặp Sales-CTV */}
                          {isPairOpen && (
                            <div className="border-t border-border">
                              {pairOrders.length === 0 ? (
                                <div className="px-5 py-4 text-center text-muted-foreground text-xs">Không có đơn trong kỳ này</div>
                              ) : (
                                <table className="w-full text-xs border-collapse">
                                  <thead>
                                    <tr className="bg-muted/30 border-b border-border">
                                      <th className="px-5 py-2 text-muted-foreground font-semibold text-left">Mã đơn</th>
                                      <th className="px-5 py-2 text-muted-foreground font-semibold text-left">Ngày</th>
                                      <th className="px-5 py-2 text-muted-foreground font-semibold text-left">Khách hàng</th>
                                      <th className="px-5 py-2 text-muted-foreground font-semibold text-left">Nhóm BH</th>
                                      <th className="px-5 py-2 text-muted-foreground font-semibold text-right">Tổng tiền</th>
                                      <th className="px-5 py-2 text-muted-foreground font-semibold text-center">Tỷ lệ</th>
                                      <th className="px-5 py-2 text-muted-foreground font-semibold text-right">HH override</th>
                                      <th className="px-5 py-2 text-muted-foreground font-semibold text-center">Trạng thái</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-border">
                                    {pairOrders.map((o: any) => {
                                      const st = STATUS_CFG[o.status] || { label: o.status, color: "bg-muted text-muted-foreground border border-border" };
                                      const isAdjustment = String(o.entry_kind) === "adjustment";
                                      return (
                                        <tr key={`${o.entry_kind || "tx"}-${o.tx_id || o.order_id}-${o.order_date || ""}`} className="hover:bg-muted/20 transition-colors">
                                          <td className="px-5 py-2">
                                            <button
                                              type="button"
                                              onClick={() => openOrderDetail(Number(o.order_id))}
                                              className="font-semibold text-primary hover:underline font-mono"
                                            >
                                              {o.order_code}
                                            </button>
                                            {isAdjustment && (
                                              <span className="ml-2 inline-flex items-center rounded-full bg-destructive/10 text-destructive border border-destructive/30 px-2 py-0.5 text-[11px] font-bold">
                                                Hoàn
                                              </span>
                                            )}
                                          </td>
                                          <td className="px-5 py-2 text-muted-foreground">{formatDate(o.order_date)}</td>
                                          <td className="px-5 py-2 text-foreground">{o.customer_name || "—"}</td>
                                          <td className="px-5 py-2">
                                            {o.group_name
                                              ? <span className="px-2 py-0.5 rounded-full bg-muted text-foreground border border-border">{o.group_name}</span>
                                              : <span className="text-muted-foreground/60">—</span>}
                                          </td>
                                          <td className="px-5 py-2 text-right font-semibold text-foreground">{formatCurrency(o.total_amount)}</td>
                                          <td className="px-5 py-2 text-center">
                                            <span className="px-2 py-0.5 rounded-full bg-muted text-foreground border border-border font-semibold">
                                              {o.override_rate != null ? `${o.override_rate}%` : "Nhiều mức"}
                                            </span>
                                          </td>
                                          <td className={cn(
                                            "px-5 py-2 text-right font-bold",
                                            isAdjustment ? "text-destructive" : "text-foreground"
                                          )}>
                                            {formatCurrency(o.override_commission)}
                                          </td>
                                          <td className="px-5 py-2 text-center">
                                            <span className={cn("px-2 py-0.5 rounded-full font-semibold border", st.color)}>{st.label}</span>
                                          </td>
                                        </tr>
                                      );
                                    })}
                                  </tbody>
                                  <tfoot>
                                    <tr className="bg-muted text-foreground font-bold border-t border-border">
                                      <td className="px-5 py-2" colSpan={4}>Tổng ({pairOrders.length} đơn)</td>
                                      <td className="px-5 py-2 text-right">{formatCurrency(pairOrders.reduce((s: number, o: any) => s + o.total_amount, 0))}</td>
                                      <td className="px-5 py-2"></td>
                                      <td className="px-5 py-2 text-right">{formatCurrency(pairOrders.reduce((s: number, o: any) => s + o.override_commission, 0))}</td>
                                      <td className="px-5 py-2"></td>
                                    </tr>
                                  </tfoot>
                                </table>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}

          {/* Grand total */}
          <div className="bg-card text-foreground rounded-xl px-5 py-4 flex items-center justify-between border border-border">
            <p className="font-bold">Tổng cộng toàn hệ thống</p>
            <div className="flex items-center gap-8 text-sm">
              <div className="text-center">
                <p className="text-muted-foreground text-xs">Số đơn từ CTV</p>
                <p className="font-bold">{totals.total_orders || 0}</p>
              </div>
              <div className="text-center">
                <p className="text-muted-foreground text-xs">Tổng HH override</p>
                <p className="font-bold text-lg">{formatCurrency(totals.total_override || 0)}</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
