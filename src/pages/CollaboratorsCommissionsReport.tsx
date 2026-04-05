import * as React from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Users, DollarSign, ShoppingCart, ChevronDown,
  Loader2, AlertCircle, Download, X, Search, TrendingUp
} from "lucide-react";
import { cn, formatCurrency, formatDate } from "../lib/utils";
import { exportAdminCommission } from "../lib/exportExcel";

const API_URL = "http://localhost:3000/api";

const STATUS_CFG: Record<string, { label: string; color: string }> = {
  pending:   { label: "Chờ duyệt", color: "bg-amber-100 text-amber-700" },
  shipping:  { label: "Đang giao", color: "bg-blue-100 text-blue-700" },
  completed: { label: "Đã giao",   color: "bg-emerald-100 text-emerald-700" },
  cancelled: { label: "Đã hủy",   color: "bg-red-100 text-red-600" },
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

  // Fetch groups + employees
  React.useEffect(() => {
    const token = localStorage.getItem("token");
    fetch(`${API_URL}/groups`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json()).then(j => setGroups(j.data || [])).catch(() => {});
    fetch(`${API_URL}/users?role=sales&limit=100`, { headers: { Authorization: `Bearer ${token}` } })
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
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Báo cáo hoa hồng CTV toàn hệ thống</h1>
          <p className="text-slate-500 text-sm mt-0.5">{periodLabel} — Hoa hồng Sales nhận từ CTV của mình</p>
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
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 transition-all shadow-sm disabled:opacity-50">
          <Download className="w-4 h-4" /> Xuất Excel
        </button>
      </div>

      {/* Filter */}
      <div className="bg-white border border-slate-200 rounded-2xl px-4 py-3 flex flex-wrap gap-3 items-center">
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

        <select value={groupId} onChange={e => setGroupId(e.target.value)}
          className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium outline-none focus:border-blue-300 cursor-pointer">
          <option value="">Tất cả nhóm</option>
          {groups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
        </select>

        <select value={salesId} onChange={e => setSalesId(e.target.value)}
          className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium outline-none focus:border-blue-300 cursor-pointer min-w-[140px]">
          <option value="">Tất cả Sales</option>
          {employees.map(e => <option key={e.id} value={e.id}>{e.full_name}</option>)}
        </select>

        {/* Search */}
        <div className="relative ml-auto">
          <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input type="text" value={searchQ} onChange={e => setSearchQ(e.target.value)}
            placeholder="Tìm nhân viên..."
            className="pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs outline-none focus:border-blue-300 w-40"
          />
        </div>

        {(groupId || salesId) && (
          <button onClick={() => { setGroupId(""); setSalesId(""); }}
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
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Tổng HH override</p>
          <p className="text-2xl font-bold text-emerald-700 mt-1">{formatCurrency(totals.total_override || 0)}</p>
          <p className="text-xs text-slate-400 mt-1">{periodLabel}</p>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600 mb-3">
            <Users className="w-4 h-4" />
          </div>
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Cặp Sales-CTV</p>
          <p className="text-2xl font-bold text-slate-900 mt-1">{pairs.length}</p>
          <p className="text-xs text-slate-400 mt-1">{salesIds.length} Sales có CTV</p>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <div className="w-9 h-9 rounded-xl bg-amber-50 flex items-center justify-center text-amber-600 mb-3">
            <ShoppingCart className="w-4 h-4" />
          </div>
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Tổng đơn từ CTV</p>
          <p className="text-2xl font-bold text-slate-900 mt-1">{totals.total_orders || 0}</p>
        </div>
      </div>

      {/* Bảng tổng hợp — nhóm theo Sales */}
      {salesIds.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-16 text-center">
          <Users className="w-10 h-10 mx-auto text-slate-200 mb-3" />
          <p className="text-slate-400 font-medium">Chưa có dữ liệu hoa hồng CTV trong kỳ này</p>
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
              <div key={sid} className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                {/* Sales header */}
                <button
                  onClick={() => toggleExpand(salesKey)}
                  className="w-full px-5 py-4 flex items-center justify-between hover:bg-slate-50/60 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-sm font-bold">
                      {salesName.split(" ").map((n: string) => n[0]).join("").slice(0,2).toUpperCase()}
                    </div>
                    <div className="text-left">
                      <p className="font-bold text-slate-900">{salesName}</p>
                      <p className="text-xs text-slate-400">{salesPairs.length} CTV • {salesOrders} đơn</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="text-xs text-slate-400">Tổng HH từ CTV</p>
                      <p className="text-lg font-bold text-emerald-600">{formatCurrency(salesTotal)}</p>
                    </div>
                    <Link to={`/employees/${sid}`} onClick={e => e.stopPropagation()}
                      className="text-xs text-blue-600 hover:underline px-3 py-1 bg-blue-50 rounded-lg flex-shrink-0">
                      Tổng quan
                    </Link>
                    <ChevronDown className={cn("w-4 h-4 text-slate-400 transition-transform flex-shrink-0", isSalesOpen && "rotate-180")} />
                  </div>
                </button>

                {/* CTV list của Sales này */}
                {isSalesOpen && (
                  <div className="border-t border-slate-100 divide-y divide-slate-50">
                    {salesPairs.map((pair: any) => {
                      const pairKey = `${pair.sales_id}-${pair.ctv_id}`;
                      const isPairOpen = expanded.has(pairKey);
                      const pairOrders = ordersByPair[pairKey] || [];

                      return (
                        <div key={pairKey}>
                          {/* CTV row */}
                          <button
                            onClick={() => toggleExpand(pairKey)}
                            className="w-full px-5 py-3 flex items-center justify-between bg-slate-50/40 hover:bg-slate-50 transition-colors"
                          >
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 text-xs font-bold">
                                {pair.ctv_name?.split(" ").map((n: string) => n[0]).join("").slice(0,2).toUpperCase()}
                              </div>
                              <div className="text-left">
                                <p className="text-sm font-semibold text-slate-800">{pair.ctv_name}</p>
                                <p className="text-xs text-slate-400">
                                  HH rate: {pair.ctv_rate}% • {pair.total_orders} đơn • DT: {formatCurrency(pair.total_revenue)}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-3">
                              <p className="font-bold text-emerald-600">{formatCurrency(pair.override_commission)}</p>
                              <ChevronDown className={cn("w-3.5 h-3.5 text-slate-400 transition-transform", isPairOpen && "rotate-180")} />
                            </div>
                          </button>

                          {/* Đơn của cặp Sales-CTV */}
                          {isPairOpen && (
                            <div className="border-t border-slate-100">
                              {pairOrders.length === 0 ? (
                                <div className="px-5 py-4 text-center text-slate-400 text-xs">Không có đơn trong kỳ này</div>
                              ) : (
                                <table className="w-full text-xs border-collapse">
                                  <thead>
                                    <tr className="bg-slate-50 border-b border-slate-100">
                                      <th className="px-5 py-2 text-slate-500 font-semibold text-left">Mã đơn</th>
                                      <th className="px-5 py-2 text-slate-500 font-semibold text-left">Ngày</th>
                                      <th className="px-5 py-2 text-slate-500 font-semibold text-left">Khách hàng</th>
                                      <th className="px-5 py-2 text-slate-500 font-semibold text-left">Nhóm BH</th>
                                      <th className="px-5 py-2 text-slate-500 font-semibold text-right">Tổng tiền</th>
                                      <th className="px-5 py-2 text-slate-500 font-semibold text-right">HH override</th>
                                      <th className="px-5 py-2 text-slate-500 font-semibold text-center">Trạng thái</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-slate-50">
                                    {pairOrders.map((o: any) => {
                                      const st = STATUS_CFG[o.status] || { label: o.status, color: "bg-slate-100 text-slate-600" };
                                      return (
                                        <tr key={o.order_id} className="hover:bg-slate-50/60">
                                          <td className="px-5 py-2">
                                            <Link to={`/orders/edit/${o.order_id}`}
                                              className="font-bold text-blue-600 hover:underline font-mono">{o.order_code}</Link>
                                          </td>
                                          <td className="px-5 py-2 text-slate-500">{formatDate(o.order_date)}</td>
                                          <td className="px-5 py-2 text-slate-700">{o.customer_name || "—"}</td>
                                          <td className="px-5 py-2">
                                            {o.group_name
                                              ? <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">{o.group_name}</span>
                                              : <span className="text-slate-300">—</span>}
                                          </td>
                                          <td className="px-5 py-2 text-right font-semibold text-slate-900">{formatCurrency(o.total_amount)}</td>
                                          <td className="px-5 py-2 text-right font-bold text-emerald-600">{formatCurrency(o.override_commission)}</td>
                                          <td className="px-5 py-2 text-center">
                                            <span className={cn("px-2 py-0.5 rounded-full font-semibold", st.color)}>{st.label}</span>
                                          </td>
                                        </tr>
                                      );
                                    })}
                                  </tbody>
                                  <tfoot>
                                    <tr className="bg-slate-700 text-white font-bold">
                                      <td className="px-5 py-2" colSpan={4}>Tổng ({pairOrders.length} đơn)</td>
                                      <td className="px-5 py-2 text-right">{formatCurrency(pairOrders.reduce((s: number, o: any) => s + o.total_amount, 0))}</td>
                                      <td className="px-5 py-2 text-right text-emerald-400">{formatCurrency(pairOrders.reduce((s: number, o: any) => s + o.override_commission, 0))}</td>
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
          <div className="bg-slate-800 text-white rounded-2xl px-5 py-4 flex items-center justify-between">
            <p className="font-bold">Tổng cộng toàn hệ thống</p>
            <div className="flex items-center gap-8 text-sm">
              <div className="text-center">
                <p className="text-slate-400 text-xs">Số đơn từ CTV</p>
                <p className="font-bold">{totals.total_orders || 0}</p>
              </div>
              <div className="text-center">
                <p className="text-slate-400 text-xs">Tổng HH override</p>
                <p className="font-bold text-emerald-400 text-lg">{formatCurrency(totals.total_override || 0)}</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
