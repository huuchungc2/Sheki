import * as React from "react";
import { useParams, Link } from "react-router-dom";
import { ArrowLeft, TrendingUp, DollarSign, Calendar, Loader2, AlertCircle } from "lucide-react";
import { formatCurrency, formatDate } from "../lib/utils";

const API_URL = "http://localhost:3000/api";

export function CommissionDetail() {
  const { userId } = useParams();
  const [commissions, setCommissions] = React.useState<any[]>([]);
  const [summary, setSummary] = React.useState<any>(null);
  const [user, setUser] = React.useState<any>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const currentUser = React.useMemo(() => {
    const u = localStorage.getItem("user");
    return u ? JSON.parse(u) : null;
  }, []);

  React.useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const token = localStorage.getItem("token");
        const headers = { Authorization: `Bearer ${token}` };
        const targetUserId = userId || currentUser?.id;
        const [commRes, sumRes, userRes] = await Promise.all([
          fetch(`${API_URL}/commissions?user_id=${targetUserId}&limit=100`, { headers }),
          fetch(`${API_URL}/commissions/summary?user_id=${targetUserId}`, { headers }),
          fetch(`${API_URL}/users/${targetUserId}`, { headers }),
        ]);
        if (!commRes.ok || !sumRes.ok) throw new Error("Không thể tải dữ liệu");
        const commData = await commRes.json();
        const sumData = await sumRes.json();
        const userData = await userRes.json();
        setCommissions(commData.data);
        setSummary(sumData.data);
        setUser(userData.data);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [userId, currentUser?.id]);

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
          <Link to="/reports/commissions" className="mt-4 inline-block px-4 py-2 bg-blue-600 text-white rounded-xl text-sm">Quay lại</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link to="/reports/commissions" className="p-2 hover:bg-slate-100 rounded-xl text-slate-500 transition-all">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            Chi tiết hoa hồng: {user?.full_name || 'Nhân viên'}
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            {user?.position || 'Sales'} • Tỷ lệ hoa hồng: {user?.commission_rate || 5}%
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600">
              <DollarSign className="w-5 h-5" />
            </div>
          </div>
          <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Tổng hoa hồng</p>
          <p className="text-2xl font-bold text-slate-900 mt-1">{formatCurrency(summary?.total_commission || 0)}</p>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600">
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>
          <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Số đơn hàng</p>
          <p className="text-2xl font-bold text-slate-900 mt-1">{summary?.total_orders || 0}</p>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center text-amber-600">
              <Calendar className="w-5 h-5" />
            </div>
          </div>
          <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Lương cơ bản</p>
          <p className="text-2xl font-bold text-slate-900 mt-1">{formatCurrency(user?.salary || 0)}</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
        <div className="px-6 py-4 border-b border-slate-200">
          <h2 className="text-lg font-bold text-slate-900">Danh sách đơn hàng có hoa hồng</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
                <tr className="bg-slate-50/50">
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Mã đơn</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Loại</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Ngày tạo</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Tổng tiền</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Hoa hồng</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Trạng thái</th>
                </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {commissions.length === 0 ? (
                <tr><td colSpan={6} className="px-6 py-12 text-center text-slate-400">Chưa có hoa hồng nào</td></tr>
              ) : (
                commissions.map((comm) => {
                  const statusLabel = comm.status === 'done' ? 'Hoàn thành' : comm.status === 'cancelled' ? 'Đã hủy' : comm.status === 'shipping' ? 'Đang giao' : comm.status === 'confirmed' ? 'Đã xác nhận' : 'Nháp';
                  const statusColor = comm.status === 'done' ? 'bg-emerald-50 text-emerald-600' : comm.status === 'cancelled' ? 'bg-red-50 text-red-600' : comm.status === 'shipping' ? 'bg-blue-50 text-blue-600' : comm.status === 'confirmed' ? 'bg-amber-50 text-amber-600' : 'bg-slate-50 text-slate-500';
                  const isOverride = comm.type === 'override';
                  return (
                    <tr key={comm.id} className={`hover:bg-slate-50/50 transition-all ${isOverride ? 'bg-blue-50/30' : ''}`}>
                      <td className="px-6 py-4">
                        <Link to={`/reports/commissions/${userId}/order/${comm.order_id}`} className="text-sm font-bold text-blue-600 hover:underline">
                          {comm.order_code}
                        </Link>
                      </td>
                      <td className="px-6 py-4">
                        {isOverride ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-blue-100 text-blue-700 text-xs font-medium">
                            Quản lý CTV: {comm.ctv_name || '?'}
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-700 text-xs font-medium">
                            Trực tiếp
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-600">
                        {formatDate(comm.created_at)}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <p className="text-sm font-bold text-slate-900">{formatCurrency(comm.total_amount || 0)}</p>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <p className={`text-sm font-bold ${isOverride ? 'text-blue-600' : 'text-emerald-600'}`}>{formatCurrency(comm.commission_amount)}</p>
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
    </div>
  );
}
