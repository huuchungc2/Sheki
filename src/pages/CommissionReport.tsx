import * as React from "react";
import { Link } from "react-router-dom";
import {
  DollarSign, TrendingUp, Users, Download,
  Loader2, AlertCircle, ChevronRight, ShoppingCart
} from "lucide-react";
import { formatCurrency, formatDate, cn } from "../lib/utils";

const API_URL = "http://localhost:3000/api";

const statusConfig: Record<string, { label: string; color: string }> = {
  pending:   { label: "Chờ duyệt", color: "bg-amber-50 text-amber-600" },
  shipping:  { label: "Đang giao", color: "bg-blue-50 text-blue-600" },
  completed: { label: "Đã giao",   color: "bg-emerald-50 text-emerald-600" },
  cancelled: { label: "Đã hủy",   color: "bg-red-50 text-red-500" },
};

export function CommissionReport() {
  const currentUser = React.useMemo(() => {
    const u = localStorage.getItem("user");
    return u ? JSON.parse(u) : null;
  }, []);
  const isAdmin = currentUser?.role === "admin";

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
    direct_commission: 0, override_commission: 0, total_commission: 0, total_orders: 0
  });

  // Admin view data (từ /reports/salary)
  const [salesData, setSalesData] = React.useState<any[]>([]);

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
    setSummary({ direct_commission: 0, override_commission: 0, total_commission: 0, total_orders: 0 });
    setOrderCommissions([]);
    try {
      const token = localStorage.getItem("token");
      const params = new URLSearchParams({ month, year });
      if (groupId) params.set("group_id", groupId);

      // 1. Fetch đơn hàng trực tiếp (type=direct)
      const orderRes = await fetch(`${API_URL}/commissions/orders?${params}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!orderRes.ok) throw new Error("Không thể tải báo cáo hoa hồng");
      const orderJson = await orderRes.json();
      setOrderCommissions(orderJson.data || []);
      const s = orderJson.summary;
      const directCommission  = parseFloat(s?.direct_commission)  || 0;
      const totalOrders       = parseInt(s?.total_orders)         || 0;

      // 2. Sales: lấy thêm HH từ CTV (override) để hiển thị đúng stat cards
      let overrideCommission = 0;
      if (!isAdmin && currentUser?.id) {
        const ctvRes = await fetch(
          `${API_URL}/users/${currentUser.id}/collaborators/commissions?month=${month}&year=${year}${groupId ? `&group_id=${groupId}` : ''}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        if (ctvRes.ok) {
          const ctvJson = await ctvRes.json();
          overrideCommission = parseFloat(ctvJson.data?.totals?.total_override_commission) || 0;
        }
      }

      setSummary({
        direct_commission:   directCommission,
        override_commission: overrideCommission,
        total_commission:    directCommission + overrideCommission,
        total_orders:        totalOrders,
      });

      // 3. Admin: fetch /reports/salary để có bảng tổng hợp nhân viên
      if (isAdmin) {
        const salaryParams = new URLSearchParams({ month, year });
        if (groupId) salaryParams.set("group_id", groupId);
        const salaryRes = await fetch(`${API_URL}/reports/salary?${salaryParams}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (salaryRes.ok) {
          const salaryJson = await salaryRes.json();
          setSalesData(salaryJson.data?.salesData || []);
        }
      }
    } catch (err: any) {
      setError(err.message || "Đã xảy ra lỗi");
    } finally {
      setLoading(false);
    }
  }, [month, year, groupId, isAdmin, currentUser?.id]);

  React.useEffect(() => { fetchReport(); }, [fetchReport]);

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

  return (
    <div className="space-y-6">
      {/* Header + Filter */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            {isAdmin ? "Báo cáo hoa hồng toàn bộ" : "Hoa hồng của tôi"}
          </h1>
          <p className="text-slate-500 text-sm mt-0.5">
            {isAdmin ? "Tổng hợp hoa hồng tất cả nhân viên." : "Xem chi tiết hoa hồng theo từng đơn hàng."}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {/* Filter nhóm */}
          <select value={groupId} onChange={(e) => setGroupId(e.target.value)}
            className="px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm font-medium text-slate-700 outline-none focus:ring-2 focus:ring-blue-100">
            <option value="">Tất cả nhóm</option>
            {groups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
          </select>
          <select value={month} onChange={(e) => setMonth(e.target.value)}
            className="px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm font-medium text-slate-700 outline-none focus:ring-2 focus:ring-blue-100">
            {Array.from({ length: 12 }, (_, i) => (
              <option key={i + 1} value={String(i + 1).padStart(2, "0")}>Tháng {i + 1}</option>
            ))}
          </select>
          <select value={year} onChange={(e) => setYear(e.target.value)}
            className="px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm font-medium text-slate-700 outline-none focus:ring-2 focus:ring-blue-100">
            {[2024, 2025, 2026, 2027].map(y => <option key={y} value={y}>{y}</option>)}
          </select>
          <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 transition-all shadow-sm">
            <Download className="w-4 h-4" /> Xuất báo cáo
          </button>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Tổng HH bán hàng (direct) */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <div className="w-9 h-9 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600 mb-3">
            <DollarSign className="w-4 h-4" />
          </div>
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">HH bán hàng</p>
          <p className="text-xl font-bold text-emerald-700 mt-1">{formatCurrency(summary.direct_commission || 0)}</p>
          <p className="text-xs text-slate-400 mt-0.5">Từ đơn tự bán</p>
        </div>

        {/* HH từ CTV (override) */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600 mb-3">
            <Users className="w-4 h-4" />
          </div>
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">HH từ CTV</p>
          <p className="text-xl font-bold text-blue-700 mt-1">{formatCurrency(summary.override_commission || 0)}</p>
          <p className="text-xs text-slate-400 mt-0.5">Từ đơn của CTV</p>
        </div>

        {/* Tổng HH = direct + override */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <div className="w-9 h-9 rounded-xl bg-purple-50 flex items-center justify-center text-purple-600 mb-3">
            <TrendingUp className="w-4 h-4" />
          </div>
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Tổng hoa hồng</p>
          <p className="text-xl font-bold text-purple-700 mt-1">
            {formatCurrency((summary.direct_commission || 0) + (summary.override_commission || 0))}
          </p>
          <p className="text-xs text-slate-400 mt-0.5">Bán hàng + CTV</p>
        </div>

        {/* Số đơn */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <div className="w-9 h-9 rounded-xl bg-amber-50 flex items-center justify-center text-amber-600 mb-3">
            <ShoppingCart className="w-4 h-4" />
          </div>
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Số đơn hàng</p>
          <p className="text-xl font-bold text-slate-900 mt-1">{summary.total_orders || 0}</p>
          <p className="text-xs text-slate-400 mt-0.5">Trong tháng {month}/{year}</p>
        </div>
      </div>

      {/* Admin: bảng tổng hợp nhân viên */}
      {isAdmin && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100">
            <h2 className="text-sm font-bold text-slate-700">Tổng hợp hoa hồng nhân viên</h2>
          </div>
          {salesData.length === 0 ? (
            <div className="py-12 text-center text-slate-400 text-sm">Chưa có dữ liệu trong tháng này</div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-sm">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-100">
                      <th className="px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Nhân viên</th>
                      <th className="px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide text-center">Số đơn</th>
                      <th className="px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide text-right">Doanh số</th>
                      <th className="px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide text-right">HH bán hàng</th>
                      <th className="px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide text-right">HH từ CTV</th>
                      <th className="px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide text-right">Tổng HH</th>
                      <th className="px-5 py-3 w-8"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {salesData.map((item: any) => (
                      <tr key={item.id} className="hover:bg-slate-50/60 transition-colors">
                        <td className="px-5 py-3">
                          <p className="font-semibold text-slate-900">{item.full_name}</p>
                          <p className="text-xs text-slate-400">{item.position || "Sales"}</p>
                        </td>
                        <td className="px-5 py-3 text-center text-slate-700">{item.total_orders || 0}</td>
                        <td className="px-5 py-3 text-right text-slate-700">{formatCurrency(item.total_sales || 0)}</td>
                        <td className="px-5 py-3 text-right font-semibold text-emerald-600">{formatCurrency(item.total_commission || 0)}</td>
                        <td className="px-5 py-3 text-right font-semibold text-blue-600">{formatCurrency(item.override_commission || 0)}</td>
                        <td className="px-5 py-3 text-right font-bold text-slate-900">
                          {formatCurrency((item.total_commission || 0) + (item.override_commission || 0))}
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
                  {/* Footer sum */}
                  <tfoot>
                    <tr className="bg-slate-800 text-white text-sm font-bold">
                      <td className="px-5 py-3">Tổng cộng</td>
                      <td className="px-5 py-3 text-center">
                        {salesData.reduce((s: number, i: any) => s + (i.total_orders || 0), 0)}
                      </td>
                      <td className="px-5 py-3 text-right">
                        {formatCurrency(salesData.reduce((s: number, i: any) => s + (i.total_sales || 0), 0))}
                      </td>
                      <td className="px-5 py-3 text-right text-emerald-400">
                        {formatCurrency(salesData.reduce((s: number, i: any) => s + (i.total_commission || 0), 0))}
                      </td>
                      <td className="px-5 py-3 text-right text-blue-300">
                        {formatCurrency(salesData.reduce((s: number, i: any) => s + (i.override_commission || 0), 0))}
                      </td>
                      <td className="px-5 py-3 text-right">
                        {formatCurrency(salesData.reduce((s: number, i: any) => s + (i.total_commission || 0) + (i.override_commission || 0), 0))}
                      </td>
                      <td className="px-5 py-3"></td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </>
          )}
        </div>
      )}

      {/* Bảng chi tiết hoa hồng theo đơn (cả sales lẫn admin đều thấy) */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100">
          <h2 className="text-sm font-bold text-slate-700">Chi tiết hoa hồng theo đơn hàng</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100">
                <th className="px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Mã đơn</th>
                {isAdmin && <th className="px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Loại HH</th>}
                <th className="px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Ngày</th>
                <th className="px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Khách hàng</th>
                <th className="px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Nhóm BH</th>
                <th className="px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide text-right">Tổng tiền</th>
                <th className="px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide text-right">Hoa hồng</th>
                <th className="px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide text-center">Trạng thái</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {orderCommissions.length === 0 ? (
                <tr>
                  <td colSpan={isAdmin ? 8 : 7} className="px-5 py-12 text-center text-slate-400">
                    Chưa có hoa hồng trong tháng {month}/{year}
                    {groupId ? ` — nhóm đã chọn` : ""}
                  </td>
                </tr>
              ) : orderCommissions.map((item: any) => {
                const st = statusConfig[item.status] || { label: item.status || "—", color: "bg-slate-50 text-slate-500" };
                return (
                  <tr key={item.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="px-5 py-3">
                      <Link to={`/orders/edit/${item.order_id}`}
                        className="font-bold text-blue-600 hover:underline font-mono">{item.order_code}</Link>
                    </td>
                    {isAdmin && (
                      <td className="px-5 py-3">
                        {item.type === "direct"
                          ? <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700">Bán hàng</span>
                          : <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700">CTV: {item.ctv_name || "?"}</span>
                        }
                      </td>
                    )}
                    <td className="px-5 py-3 text-slate-500">{formatDate(item.order_date)}</td>
                    <td className="px-5 py-3 text-slate-700">{item.customer_name || "—"}</td>
                    <td className="px-5 py-3">
                      {item.group_name
                        ? <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-600">{item.group_name}</span>
                        : <span className="text-slate-300">—</span>
                      }
                    </td>
                    <td className="px-5 py-3 text-right font-semibold text-slate-900">{formatCurrency(item.total_amount)}</td>
                    <td className="px-5 py-3 text-right font-bold text-emerald-600">{formatCurrency(item.commission_amount)}</td>
                    <td className="px-5 py-3 text-center">
                      <span className={cn("inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold", st.color)}>
                        {st.label}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
            {orderCommissions.length > 0 && (
              <tfoot>
                <tr className="bg-slate-800 text-white text-sm font-bold">
                  <td className="px-5 py-3" colSpan={isAdmin ? 5 : 4}>Tổng cộng ({orderCommissions.length} dòng)</td>
                  <td className="px-5 py-3 text-right">
                    {formatCurrency(orderCommissions.reduce((s: number, i: any) => s + i.total_amount, 0))}
                  </td>
                  <td className="px-5 py-3 text-right text-emerald-400">
                    {formatCurrency(orderCommissions.reduce((s: number, i: any) => s + i.commission_amount, 0))}
                  </td>
                  <td className="px-5 py-3"></td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>
    </div>
  );
}
