import * as React from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { ArrowLeft, Users, TrendingUp, DollarSign, Package, ShoppingCart, BarChart3, Loader2, AlertCircle, Edit2, Plus } from "lucide-react";
import { cn, formatCurrency, formatDate } from "../lib/utils";

const API_URL = "http://localhost:3000/api";

const statusConfig: Record<string, { label: string; color: string }> = {
  draft: { label: "Nháp", color: "bg-slate-100 text-slate-600" },
  confirmed: { label: "Đã xác nhận", color: "bg-blue-100 text-blue-700" },
  shipping: { label: "Đang giao", color: "bg-amber-100 text-amber-700" },
  done: { label: "Hoàn thành", color: "bg-emerald-100 text-emerald-700" },
  cancelled: { label: "Đã hủy", color: "bg-red-100 text-red-600" },
};

export function EmployeeDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const currentUser = React.useMemo(() => {
    const u = localStorage.getItem("user");
    return u ? JSON.parse(u) : null;
  }, []);

  const [overview, setOverview] = React.useState<any>(null);
  const [orders, setOrders] = React.useState<any[]>([]);
  const [orderPage, setOrderPage] = React.useState(1);
  const [orderTotal, setOrderTotal] = React.useState(0);
  const [orderStatus, setOrderStatus] = React.useState("");
  const [loading, setLoading] = React.useState(true);
  const [ordersLoading, setOrdersLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const orderLimit = 10;

  React.useEffect(() => {
    const fetchOverview = async () => {
      try {
        setLoading(true);
        const token = localStorage.getItem("token");
        const res = await fetch(`${API_URL}/users/${id}/overview`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.error || "Không thể tải dữ liệu");
        }
        const json = await res.json();
        setOverview(json.data);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchOverview();
  }, [id]);

  const fetchOrders = React.useCallback(async () => {
    try {
      setOrdersLoading(true);
      const token = localStorage.getItem("token");
      const params = new URLSearchParams({ page: String(orderPage), limit: String(orderLimit) });
      if (orderStatus) params.set("status", orderStatus);
      const res = await fetch(`${API_URL}/users/${id}/orders?${params}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error("Không thể tải đơn hàng");
      const json = await res.json();
      setOrders(json.data);
      setOrderTotal(json.total);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setOrdersLoading(false);
    }
  }, [id, orderPage, orderStatus]);

  React.useEffect(() => { fetchOrders(); }, [fetchOrders]);

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (error && !overview) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 mx-auto text-red-400 mb-4" />
          <p className="text-red-500 font-medium">{error}</p>
          <button onClick={() => navigate(-1)} className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-xl text-sm">Quay lại</button>
        </div>
      </div>
    );
  }

  const { user, groups, commission, topProducts, orderStats } = overview;
  const totalOrderPages = Math.ceil(orderTotal / orderLimit);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate(-1)} className="p-2 hover:bg-slate-100 rounded-xl text-slate-500 transition-all">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Tổng quan nhân viên</h1>
            <p className="text-slate-500 text-sm mt-1">{user.full_name} • {user.position || user.role}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
        <Link to={`/employees/${id}/collaborators`} className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-xl text-sm font-medium hover:bg-emerald-700 transition-all">
            <Plus className="w-4 h-4" /> Quản lý CTV
          </Link>
          <Link to={`/employees/edit/${id}`} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 transition-all">
            <Edit2 className="w-4 h-4" /> Chỉnh sửa
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600"><DollarSign className="w-5 h-5" /></div>
          </div>
          <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Tổng hoa hồng</p>
          <p className="text-2xl font-bold text-slate-900 mt-1">{formatCurrency(commission?.total_commission || 0)}</p>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600"><TrendingUp className="w-5 h-5" /></div>
          </div>
          <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Tổng doanh thu</p>
          <p className="text-2xl font-bold text-slate-900 mt-1">{formatCurrency(commission?.total_revenue || 0)}</p>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center text-amber-600"><ShoppingCart className="w-5 h-5" /></div>
          </div>
          <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Số đơn hàng</p>
          <p className="text-2xl font-bold text-slate-900 mt-1">{commission?.total_orders || 0}</p>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-purple-50 flex items-center justify-center text-purple-600"><Package className="w-5 h-5" /></div>
          </div>
          <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Lương cơ bản</p>
          <p className="text-2xl font-bold text-slate-900 mt-1">{formatCurrency(user.salary || 0)}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-200">
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <Users className="w-4 h-4 text-blue-600" /> Thông tin nhân viên
            </h2>
          </div>
          <div className="p-6 space-y-4">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold text-xl">
                {user.full_name?.split(' ').map((n: string) => n[0]).join('').toUpperCase()}
              </div>
              <div>
                <p className="text-lg font-bold text-slate-900">{user.full_name}</p>
                <p className="text-sm text-slate-500">{user.email}</p>
                <span className={cn(
                  "inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider mt-1",
                  user.is_active ? "bg-emerald-50 text-emerald-600" : "bg-slate-100 text-slate-500"
                )}>
                  {user.is_active ? "Đang làm việc" : "Đã nghỉ"}
                </span>
              </div>
            </div>

            <div className="space-y-3 text-sm">
              <div className="flex justify-between"><span className="text-slate-500">SĐT</span><span className="font-medium">{user.phone || '-'}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">Phòng ban</span><span className="font-medium">{user.department || '-'}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">Chức vụ</span><span className="font-medium">{user.position || '-'}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">Ngày gia nhập</span><span className="font-medium">{user.join_date ? formatDate(user.join_date) : '-'}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">Tỷ lệ hoa hồng</span><span className="font-medium">{user.commission_rate}%</span></div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-200">
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <Users className="w-4 h-4 text-blue-600" /> Nhóm nhân viên
            </h2>
          </div>
          <div className="p-6">
            {groups.length === 0 ? (
              <p className="text-sm text-slate-400 text-center py-4">Chưa thuộc nhóm nào</p>
            ) : (
              <div className="space-y-2">
                {groups.map((g: any) => (
                  <div key={g.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl">
                    <div>
                      <p className="text-sm font-bold text-slate-900">{g.name}</p>
                      {g.description && <p className="text-xs text-slate-400">{g.description}</p>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-200">
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-blue-600" /> Thống kê đơn hàng
            </h2>
          </div>
          <div className="p-6 space-y-3">
            {Object.entries(orderStats || {}).map(([status, count]) => {
              const cfg = statusConfig[status] || { label: status, color: "bg-slate-100 text-slate-600" };
              return (
                <div key={status} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl">
                  <span className={cn("inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold", cfg.color)}>{cfg.label}</span>
                  <span className="text-lg font-bold text-slate-900">{count as number}</span>
                </div>
              );
            })}
            {Object.keys(orderStats || {}).length === 0 && (
              <p className="text-sm text-slate-400 text-center py-4">Chưa có đơn hàng nào</p>
            )}
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <Package className="w-4 h-4 text-blue-600" /> Top 10 sản phẩm bán chạy
          </h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/50">
                <th className="px-6 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">#</th>
                <th className="px-6 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">Sản phẩm</th>
                <th className="px-6 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">SKU</th>
                <th className="px-6 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">SL bán</th>
                <th className="px-6 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Doanh thu</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {topProducts.length === 0 ? (
                <tr><td colSpan={5} className="px-6 py-12 text-center text-slate-400">Chưa có dữ liệu</td></tr>
              ) : topProducts.map((p: any, i: number) => (
                <tr key={p.id} className="hover:bg-slate-50/50 transition-all">
                  <td className="px-6 py-4">
                    <span className={cn(
                      "inline-flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold",
                      i === 0 ? "bg-amber-100 text-amber-700" : i === 1 ? "bg-slate-200 text-slate-600" : i === 2 ? "bg-orange-100 text-orange-700" : "bg-slate-50 text-slate-500"
                    )}>{i + 1}</span>
                  </td>
                  <td className="px-6 py-4 text-sm font-bold text-slate-900">{p.name}</td>
                  <td className="px-6 py-4 text-sm text-slate-500 font-mono">{p.sku || '-'}</td>
                  <td className="px-6 py-4 text-right text-sm font-bold text-slate-900">{p.total_qty} {p.unit || ''}</td>
                  <td className="px-6 py-4 text-right text-sm font-bold text-emerald-600">{formatCurrency(p.total_revenue)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <ShoppingCart className="w-4 h-4 text-blue-600" /> Đơn hàng
          </h2>
          <select
            value={orderStatus}
            onChange={(e) => { setOrderStatus(e.target.value); setOrderPage(1); }}
            className="px-4 py-2 bg-slate-50 text-slate-600 rounded-xl text-sm font-medium outline-none focus:ring-2 focus:ring-blue-500/20"
          >
            <option value="">Tất cả trạng thái</option>
            <option value="draft">Nháp</option>
            <option value="confirmed">Đã xác nhận</option>
            <option value="shipping">Đang giao</option>
            <option value="done">Hoàn thành</option>
            <option value="cancelled">Đã hủy</option>
          </select>
        </div>

        {ordersLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/50">
                    <th className="px-6 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">Mã đơn</th>
                    <th className="px-6 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">Khách hàng</th>
                    <th className="px-6 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">Ngày tạo</th>
                    <th className="px-6 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Tổng tiền</th>
                    <th className="px-6 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Hoa hồng</th>
                    <th className="px-6 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider text-center">Trạng thái</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {orders.length === 0 ? (
                    <tr><td colSpan={6} className="px-6 py-12 text-center text-slate-400">Không có đơn hàng nào</td></tr>
                  ) : orders.map((order: any) => {
                    const cfg = statusConfig[order.status] || { label: order.status, color: "bg-slate-100 text-slate-600" };
                    return (
                      <tr key={order.id} className="hover:bg-slate-50/50 transition-all cursor-pointer" onClick={() => navigate(`/orders/edit/${order.id}`)}>
                        <td className="px-6 py-4 text-sm font-bold text-blue-600 font-mono">{order.code}</td>
                        <td className="px-6 py-4">
                          <p className="text-sm font-medium text-slate-900">{order.customer_name || '-'}</p>
                          <p className="text-xs text-slate-400">{order.customer_phone || ''}</p>
                        </td>
                        <td className="px-6 py-4 text-sm text-slate-600">{formatDate(order.created_at)}</td>
                        <td className="px-6 py-4 text-right text-sm font-bold text-slate-900">{formatCurrency(order.total_amount)}</td>
                        <td className="px-6 py-4 text-right text-sm font-bold text-emerald-600">{formatCurrency(order.commission_amount)}</td>
                        <td className="px-6 py-4 text-center">
                          <span className={cn("inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider", cfg.color)}>{cfg.label}</span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {totalOrderPages > 1 && (
              <div className="px-6 py-4 bg-slate-50/50 border-t border-slate-200 flex items-center justify-between">
                <p className="text-sm text-slate-500">Hiển thị {((orderPage - 1) * orderLimit) + 1}-{Math.min(orderPage * orderLimit, orderTotal)} trong tổng số {orderTotal} đơn</p>
                <div className="flex items-center gap-2">
                  <button onClick={() => setOrderPage(p => Math.max(1, p - 1))} disabled={orderPage === 1} className="p-2 hover:bg-white border border-transparent hover:border-slate-200 rounded-lg text-slate-400 disabled:opacity-50 transition-all">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                  </button>
                  {Array.from({ length: Math.min(5, totalOrderPages) }, (_, i) => (
                    <button key={i} onClick={() => setOrderPage(i + 1)} className={cn("w-8 h-8 flex items-center justify-center rounded-lg text-sm font-bold transition-all", orderPage === i + 1 ? "bg-blue-600 text-white shadow-sm" : "hover:bg-white border border-transparent hover:border-slate-200 text-slate-600")}>{i + 1}</button>
                  ))}
                  <button onClick={() => setOrderPage(p => Math.min(totalOrderPages, p + 1))} disabled={orderPage >= totalOrderPages} className="p-2 hover:bg-white border border-transparent hover:border-slate-200 rounded-lg text-slate-400 disabled:opacity-50 transition-all">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
