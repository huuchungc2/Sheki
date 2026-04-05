import * as React from "react";
import { 
  Search, 
  Filter, 
  Plus, 
  Download, 
  ChevronLeft, 
  ChevronRight,
  ShoppingCart,
  Calendar,
  User,
  CreditCard,
  Truck,
  MoreVertical,
  Eye,
  Edit2,
  Trash2,
  CheckCircle2,
  Clock,
  XCircle,
  Package,
  Wallet,
  ArrowRight,
  Loader2
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { cn, formatCurrency, formatDate } from "../lib/utils";

const API_URL = "http://localhost:3000/api";

const statusConfig: Record<string, { label: string; color: string; icon: any }> = {
  draft: { label: "NHÁP", color: "bg-slate-100 text-slate-700", icon: Clock },
  confirmed: { label: "ĐÃ XÁC NHẬN", color: "bg-blue-100 text-blue-700", icon: CheckCircle2 },
  shipping: { label: "ĐANG GIAO", color: "bg-amber-100 text-amber-700", icon: Truck },
  done: { label: "HOÀN THÀNH", color: "bg-emerald-100 text-emerald-700", icon: CheckCircle2 },
  cancelled: { label: "ĐÃ HỦY", color: "bg-red-100 text-red-700", icon: XCircle },
  pending: { label: "CHỜ DUYỆT", color: "bg-amber-100 text-amber-700", icon: Clock },
  completed: { label: "HOÀN THÀNH", color: "bg-emerald-100 text-emerald-700", icon: CheckCircle2 },
};

const paymentConfig: Record<string, { label: string; icon: any }> = {
  cash: { label: "Tiền mặt", icon: Wallet },
  transfer: { label: "Chuyển khoản", icon: ArrowRight },
  card: { label: "Thẻ ATM", icon: CreditCard },
};

export function OrderList() {
  const navigate = useNavigate();
  const [orders, setOrders] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [search, setSearch] = React.useState("");
  const [status, setStatus] = React.useState("");
  const [page, setPage] = React.useState(1);
  const [total, setTotal] = React.useState(0);
  const [deleting, setDeleting] = React.useState<string | null>(null);
  const limit = 20;

  const fetchOrders = React.useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const token = localStorage.getItem("token");
      const params = new URLSearchParams({
        search,
        status,
        page: String(page),
        limit: String(limit),
      });
      const res = await fetch(`${API_URL}/orders?${params}`, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (!res.ok) throw new Error("Không thể tải danh sách đơn hàng");
      const json = await res.json();
      setOrders(json.data);
      setTotal(json.total || 0);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [search, status, page]);

  React.useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  const handleDelete = async (id: string) => {
    if (!confirm("Bạn có chắc muốn xóa đơn hàng này?")) return;
    try {
      setDeleting(id);
      setError(null);
      const token = localStorage.getItem("token");
      const res = await fetch(`${API_URL}/orders/${id}`, {
        method: "DELETE",
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (!res.ok) throw new Error("Không thể xóa đơn hàng");
      fetchOrders();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setDeleting(null);
    }
  };

  const totalPages = Math.ceil(total / limit);

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Quản lý đơn hàng</h1>
          <p className="text-slate-500 text-sm mt-1">Theo dõi và quản lý các giao dịch bán lẻ của bạn trong thời gian thực.</p>
        </div>
        <Link to="/orders/new" className="flex items-center gap-2 px-6 py-3 bg-red-600 text-white rounded-xl text-sm font-bold hover:bg-red-700 transition-all shadow-lg shadow-red-600/20">
          <Plus className="w-5 h-5" />
          Thêm đơn mới
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm relative overflow-hidden group">
          <div className="relative z-10">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">TỔNG SỐ ĐƠN</p>
            <p className="text-4xl font-black text-slate-900 mt-2">{total.toLocaleString()}</p>
          </div>
          <div className="absolute -right-4 -bottom-4 opacity-5 group-hover:opacity-10 transition-opacity">
            <ShoppingCart className="w-32 h-32" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm relative overflow-hidden group">
          <div className="relative z-10">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">DOANH THU NGÀY</p>
            <p className="text-4xl font-black text-red-600 mt-2">—</p>
          </div>
          <div className="absolute -right-4 -bottom-4 opacity-5 group-hover:opacity-10 transition-opacity">
            <CreditCard className="w-32 h-32" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm relative overflow-hidden group">
          <div className="relative z-10">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">ĐƠN ĐANG GIAO</p>
            <p className="text-4xl font-black text-blue-600 mt-2">{orders.filter((o: any) => o.status === "shipping").length}</p>
          </div>
          <div className="absolute -right-4 -bottom-4 opacity-5 group-hover:opacity-10 transition-opacity">
            <Truck className="w-32 h-32" />
          </div>
        </div>
      </div>

      <div className="bg-red-50/30 p-6 rounded-[32px] border border-red-100/50">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="space-y-2">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider ml-1">TÌM KIẾM</label>
            <div className="relative">
              <Search className="w-4 h-4 absolute right-4 top-1/2 -translate-y-1/2 text-slate-400" />
              <input 
                type="text" 
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                placeholder="Mã đơn, tên khách, SĐT..." 
                className="w-full px-4 py-3 bg-white border-transparent focus:border-red-200 focus:ring-4 focus:ring-red-500/5 rounded-2xl text-sm transition-all outline-none shadow-sm"
              />
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider ml-1">TRẠNG THÁI</label>
            <select 
              value={status}
              onChange={(e) => { setStatus(e.target.value); setPage(1); }}
              className="w-full px-4 py-3 bg-white border-transparent focus:border-red-200 focus:ring-4 focus:ring-red-500/5 rounded-2xl text-sm transition-all outline-none shadow-sm appearance-none cursor-pointer"
            >
              <option value="">Tất cả trạng thái</option>
              <option value="pending">Chờ duyệt</option>
              <option value="completed">Đã giao</option>
              <option value="shipping">Đang giao</option>
              <option value="cancelled">Đã hủy</option>
            </select>
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider ml-1">THỜI GIAN</label>
            <div className="relative">
              <Calendar className="w-4 h-4 absolute right-4 top-1/2 -translate-y-1/2 text-slate-400" />
              <input 
                type="text" 
                placeholder="mm/dd/yyyy" 
                className="w-full px-4 py-3 bg-white border-transparent focus:border-red-200 focus:ring-4 focus:ring-red-500/5 rounded-2xl text-sm transition-all outline-none shadow-sm"
              />
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider ml-1">NHÂN VIÊN</label>
            <select className="w-full px-4 py-3 bg-white border-transparent focus:border-red-200 focus:ring-4 focus:ring-red-500/5 rounded-2xl text-sm transition-all outline-none shadow-sm appearance-none cursor-pointer">
              <option>Tất cả nhân viên</option>
            </select>
          </div>
        </div>
        <div className="mt-4">
          <button onClick={fetchOrders} className="p-3 bg-white text-slate-400 rounded-xl border border-slate-100 shadow-sm hover:text-red-600 transition-colors">
            <Filter className="w-5 h-5" />
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">{error}</div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 text-red-600 animate-spin" />
        </div>
      ) : (
        <>
          <div className="bg-white rounded-[32px] border border-slate-100 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-red-50/20 border-b border-slate-100">
                    <th className="px-8 py-6 text-[10px] font-bold text-slate-400 uppercase tracking-widest">MÃ ĐƠN</th>
                    <th className="px-8 py-6 text-[10px] font-bold text-slate-400 uppercase tracking-widest">KHÁCH HÀNG</th>
                    <th className="px-8 py-6 text-[10px] font-bold text-slate-400 uppercase tracking-widest">THỜI GIAN</th>
                    <th className="px-8 py-6 text-[10px] font-bold text-slate-400 uppercase tracking-widest">TỔNG TIỀN</th>
                    <th className="px-8 py-6 text-[10px] font-bold text-slate-400 uppercase tracking-widest">HOA HỒNG</th>
                    <th className="px-8 py-6 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-center">TRẠNG THÁI</th>
                    <th className="px-8 py-6 text-[10px] font-bold text-slate-400 uppercase tracking-widest">THANH TOÁN</th>
                    <th className="px-8 py-6 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-right">THAO TÁC</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {orders.length === 0 ? (
                    <tr><td colSpan={8} className="px-8 py-12 text-center text-slate-400">Không có đơn hàng nào</td></tr>
                  ) : orders.map((order: any) => {
                    const status = statusConfig[order.status] || { label: order.status, color: "bg-slate-100 text-slate-600", icon: Clock };
                    const payment = paymentConfig[order.payment_method] || { label: order.payment_method || "—", icon: Wallet };
                    const initials = (order.customer_name || "U").split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase();
                    return (
                      <tr 
                        key={order.id} 
                        className="hover:bg-slate-50/50 transition-all group cursor-pointer" 
                        onClick={() => navigate(`/orders/edit/${order.id}`)}
                      >
                        <td className="px-8 py-6">
                          <span className="text-sm font-black text-red-600 font-mono tracking-tighter">{order.code || `#${order.id}`}</span>
                        </td>
                        <td className="px-8 py-6">
                          <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-xs font-bold text-slate-500">
                              {initials}
                            </div>
                            <div>
                              <p className="text-sm font-bold text-slate-900">{order.customer_name || "—"}</p>
                              <p className="text-[10px] text-slate-400 font-medium">{order.customer_phone || ""}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-8 py-6">
                          <p className="text-sm font-medium text-slate-900">
                            {order.created_at ? (new Date(order.created_at).toLocaleDateString('vi-VN') === new Date().toLocaleDateString('vi-VN') ? 'Hôm nay' : formatDate(order.created_at)) : "—"}
                          </p>
                          <p className="text-sm font-medium text-slate-900">
                            {order.created_at ? new Date(order.created_at).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) : ""}
                          </p>
                        </td>
                        <td className="px-8 py-6">
                          <p className="text-sm font-black text-slate-900">{formatCurrency(order.total_amount || 0)}</p>
                        </td>
                        <td className="px-8 py-6">
                          <p className="text-sm font-bold text-emerald-600">{formatCurrency((order.total_amount || 0) * 0.10)}</p>
                        </td>
                        <td className="px-8 py-6 text-center">
                          <span className={cn(
                            "inline-flex flex-col items-center justify-center px-4 py-1.5 rounded-full text-[9px] font-black tracking-widest leading-tight",
                            status.color
                          )}>
                            <span>{status.label.split(' ')[0]}</span>
                            {status.label.split(' ')[1] && <span>{status.label.split(' ')[1]}</span>}
                          </span>
                        </td>
                        <td className="px-8 py-6">
                          <div className="flex items-center gap-3 text-xs text-slate-500 font-medium">
                            <payment.icon className="w-4 h-4 text-slate-300" />
                            {payment.label}
                          </div>
                        </td>
                        <td className="px-8 py-6 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Link 
                              to={`/orders/edit/${order.id}`}
                              onClick={(e) => e.stopPropagation()}
                              className="inline-flex items-center gap-2 px-3 py-1.5 bg-slate-100 text-slate-600 rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-red-600 hover:text-white transition-all shadow-sm"
                            >
                              <Edit2 className="w-3 h-3" />
                              Sửa
                            </Link>
                            <button 
                              onClick={(e) => { e.stopPropagation(); handleDelete(order.id); }}
                              disabled={deleting === order.id}
                              className="inline-flex items-center gap-2 px-3 py-1.5 bg-slate-100 text-slate-600 rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-red-600 hover:text-white transition-all shadow-sm disabled:opacity-50"
                            >
                              {deleting === order.id ? (
                                <Loader2 className="w-3 h-3 animate-spin" />
                              ) : (
                                <Trash2 className="w-3 h-3" />
                              )}
                              Xóa
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {totalPages > 1 && (
            <div className="flex flex-col md:flex-row items-center justify-between gap-4 px-4">
              <p className="text-xs font-medium text-slate-400">Hiển thị <span className="text-slate-900">{(page - 1) * limit + 1}-{Math.min(page * limit, total)}</span> trong số <span className="text-slate-900">{total}</span> đơn hàng</p>
              <div className="flex items-center gap-2">
                <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="p-2 text-slate-300 hover:text-red-600 transition-colors disabled:opacity-30">
                  <ChevronLeft className="w-4 h-4" />
                </button>
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  const p = i + 1;
                  return (
                    <button key={p} onClick={() => setPage(p)} className={cn("w-8 h-8 rounded-lg text-xs font-bold transition-colors", page === p ? "bg-red-600 text-white shadow-lg shadow-red-600/20" : "hover:bg-slate-100 text-slate-600")}>{p}</button>
                  );
                })}
                <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="p-2 text-slate-300 hover:text-red-600 transition-colors disabled:opacity-30">
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
