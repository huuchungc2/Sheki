import * as React from "react";
import { Link } from "react-router-dom";
import { 
  DollarSign, 
  TrendingUp, 
  Calendar, 
  ChevronRight,
  Download, 
  Loader2,
  AlertCircle
} from "lucide-react";
import { formatCurrency, formatDate } from "../lib/utils";

const API_URL = "http://localhost:3000/api";

export function CommissionReport() {
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [salesData, setSalesData] = React.useState<any[]>([]);
  const [summary, setSummary] = React.useState<any>(null);
  const [orderCommissions, setOrderCommissions] = React.useState<any[]>([]);
  const [month, setMonth] = React.useState(String(new Date().getMonth() + 1).padStart(2, '0'));
  const [year, setYear] = React.useState(String(new Date().getFullYear()));
  const [groupId, setGroupId] = React.useState("");
  const [groups, setGroups] = React.useState<any[]>([]);
  const currentUser = React.useMemo(() => {
    const u = localStorage.getItem("user");
    return u ? JSON.parse(u) : null;
  }, []);
  const isAdmin = currentUser?.role === 'admin';

  React.useEffect(() => {
    const fetchGroups = async () => {
      try {
        const token = localStorage.getItem("token");
        const res = await fetch(`${API_URL}/groups`, { headers: { Authorization: `Bearer ${token}` } });
        if (res.ok) {
          const json = await res.json();
          setGroups(json.data || []);
        }
      } catch (err) {
        console.error("Failed to fetch groups", err);
      }
    };
    fetchGroups();
  }, []);

  const fetchReport = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem("token");
      const params = new URLSearchParams({ month, year });
      if (groupId) params.set('group_id', groupId);
      const res = await fetch(
        `${API_URL}/reports/salary?${params}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (!res.ok) throw new Error("Không thể tải báo cáo");
      const json = await res.json();
      setSalesData(json.data.salesData || []);
      setSummary(json.data.summary || {});

      const orderParams = new URLSearchParams({ month, year });
      const orderRes = await fetch(
        `${API_URL}/commissions/orders?${orderParams}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (orderRes.ok) {
        const orderJson = await orderRes.json();
        setOrderCommissions(orderJson.data || []);
      }
    } catch (err: any) {
      setError(err.message || "Đã xảy ra lỗi");
    } finally {
      setLoading(false);
    }
  }, [month, year, groupId]);

  React.useEffect(() => { fetchReport(); }, [fetchReport]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-12 h-12 text-blue-600 animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <AlertCircle className="w-16 h-16 text-red-500" />
        <p className="text-lg font-bold text-slate-900">{error}</p>
        <button onClick={fetchReport} className="px-6 py-2 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 transition-all">Thử lại</button>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            {isAdmin ? 'Báo cáo hoa hồng toàn bộ nhân viên' : 'Hoa hồng của tôi'}
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            {isAdmin ? 'Xem chi tiết hoa hồng từng nhân viên.' : 'Xem chi tiết hoa hồng theo từng đơn hàng.'}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {isAdmin && (
            <select value={groupId} onChange={(e) => setGroupId(e.target.value)} className="px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm font-medium text-slate-700 outline-none focus:ring-2 focus:ring-blue-500/20">
              <option value="">Tất cả nhóm</option>
              {groups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
            </select>
          )}
          <select value={month} onChange={(e) => setMonth(e.target.value)} className="px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm font-medium text-slate-700 outline-none focus:ring-2 focus:ring-blue-500/20">
            {Array.from({ length: 12 }, (_, i) => (
              <option key={i + 1} value={String(i + 1).padStart(2, '0')}>Tháng {i + 1}</option>
            ))}
          </select>
          <select value={year} onChange={(e) => setYear(e.target.value)} className="px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm font-medium text-slate-700 outline-none focus:ring-2 focus:ring-blue-500/20">
            {[2024, 2025, 2026, 2027].map(y => <option key={y} value={y}>{y}</option>)}
          </select>
          <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 transition-all shadow-lg shadow-blue-600/20">
            <Download className="w-4 h-4" /> Xuất báo cáo
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-12 h-12 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600">
              <DollarSign className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Tổng hoa hồng</p>
              <p className="text-2xl font-bold text-slate-900">{formatCurrency(summary.totalCommission || 0)}</p>
            </div>
          </div>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600">
              <TrendingUp className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Tổng đơn hàng</p>
              <p className="text-2xl font-bold text-slate-900">{salesData.reduce((sum, s) => sum + (s.total_orders || 0), 0)}</p>
            </div>
          </div>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-12 h-12 rounded-xl bg-amber-50 flex items-center justify-center text-amber-600">
              <Calendar className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Hoa hồng trung bình</p>
              <p className="text-2xl font-bold text-slate-900">
                {formatCurrency(salesData.length > 0 ? summary.totalCommission / salesData.length : 0)}
              </p>
            </div>
          </div>
        </div>
      </div>

      {isAdmin && salesData.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-slate-100">
            <h2 className="text-lg font-bold text-slate-900">Chi tiết hoa hồng nhân viên</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/50 border-b border-slate-100">
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Nhân viên</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Đơn hàng</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Doanh số</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Hoa hồng trực tiếp</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Hoa hồng quản lý CTV</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Tổng hoa hồng</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {salesData.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/50 transition-all group">
                    <td className="px-6 py-4">
                      <p className="text-sm font-bold text-slate-900">{item.full_name}</p>
                      <p className="text-xs text-slate-500">{item.position || 'Sales'}</p>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-sm text-slate-900">{item.total_orders || 0}</p>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-sm text-slate-900">{formatCurrency(item.total_sales)}</p>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <p className="text-sm font-bold text-emerald-600">{formatCurrency(item.total_commission)}</p>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <p className="text-sm font-bold text-blue-600">{formatCurrency(item.override_commission || 0)}</p>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <p className="text-sm font-bold text-slate-900">{formatCurrency(item.total_all_commission || item.total_commission)}</p>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <Link to={`/reports/commissions/${item.id}`} className="text-xs font-bold text-blue-600 hover:underline flex items-center gap-1 justify-end">
                        Chi tiết <ChevronRight className="w-3 h-3" />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {!isAdmin && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-slate-100">
            <h2 className="text-lg font-bold text-slate-900">Chi tiết hoa hồng theo đơn hàng</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/50 border-b border-slate-100">
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Mã đơn</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Ngày</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Tổng tiền</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Hoa hồng</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Trạng thái</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {orderCommissions.length === 0 ? (
                  <tr><td colSpan={5} className="px-6 py-12 text-center text-slate-400">Chưa có hoa hồng tháng này</td></tr>
                ) : (
                  orderCommissions.map((item) => {
                    const statusLabel = item.status === 'done' ? 'Hoàn thành' : item.status === 'cancelled' ? 'Đã hủy' : item.status === 'shipping' ? 'Đang giao' : item.status === 'confirmed' ? 'Đã xác nhận' : 'Nháp';
                    const statusColor = item.status === 'done' ? 'bg-emerald-50 text-emerald-600' : item.status === 'cancelled' ? 'bg-red-50 text-red-600' : item.status === 'shipping' ? 'bg-blue-50 text-blue-600' : item.status === 'confirmed' ? 'bg-amber-50 text-amber-600' : 'bg-slate-50 text-slate-500';
                    return (
                      <tr key={item.id} className="hover:bg-slate-50/50 transition-all">
                        <td className="px-6 py-4">
                          <Link to={`/orders?search=${item.order_code}`} className="text-sm font-bold text-blue-600 hover:underline">{item.order_code}</Link>
                        </td>
                        <td className="px-6 py-4 text-sm text-slate-600">{formatDate(item.order_date)}</td>
                        <td className="px-6 py-4 text-right">
                          <p className="text-sm font-bold text-slate-900">{formatCurrency(item.total_amount)}</p>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <p className="text-sm font-bold text-emerald-600">{formatCurrency(item.commission_amount)}</p>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${statusColor}`}>
                            {statusLabel}
                          </span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {isAdmin && salesData.length === 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
          <p className="text-slate-400">Chưa có dữ liệu hoa hồng trong tháng này</p>
        </div>
      )}
    </div>
  );
}
