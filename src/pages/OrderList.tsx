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
  CheckCircle2,
  Clock,
  XCircle,
  Package,
  Wallet,
  ArrowRight
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { cn, formatCurrency, formatDate } from "../lib/utils";
import type { Order } from "../types";

const orders: any[] = [
  { id: "ORD-8829", customerName: "Lê Hoàng", customerPhone: "090 123 4567", initials: "LH", date: "2026-04-03T14:20:00", total: 2450000, status: "pending", paymentMethod: "card" },
  { id: "ORD-8828", customerName: "Nguyễn Anh", customerPhone: "091 999 8888", initials: "NA", date: "2026-04-03T13:45:00", total: 12800000, status: "completed", paymentMethod: "cash" },
  { id: "ORD-8827", customerName: "Minh Tú", customerPhone: "088 222 3333", initials: "MT", date: "2026-04-03T12:10:00", total: 5400000, status: "shipping", paymentMethod: "transfer" },
  { id: "ORD-8826", customerName: "Thanh Hà", customerPhone: "093 444 5555", initials: "TH", date: "2026-04-02T21:30:00", total: 850000, status: "cancelled", paymentMethod: "cash" },
];

const statusConfig = {
  pending: { label: "CHỜ DUYỆT", color: "bg-amber-100 text-amber-700", icon: Clock },
  completed: { label: "ĐÃ GIAO", color: "bg-emerald-100 text-emerald-700", icon: CheckCircle2 },
  cancelled: { label: "ĐÃ HỦY", color: "bg-red-100 text-red-700", icon: XCircle },
  shipping: { label: "ĐANG GIAO", color: "bg-blue-100 text-blue-700", icon: Truck },
};

const paymentConfig = {
  cash: { label: "Tiền mặt", icon: Wallet },
  transfer: { label: "Chuyển khoản", icon: ArrowRight },
  card: { label: "Thẻ ATM", icon: CreditCard },
};

export function OrderList() {
  const navigate = useNavigate();

  return (
    <div className="space-y-8">
      {/* Header */}
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

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm relative overflow-hidden group">
          <div className="relative z-10">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">TỔNG SỐ ĐƠN</p>
            <p className="text-4xl font-black text-slate-900 mt-2">1,284</p>
            <div className="flex items-center gap-1 text-emerald-500 text-xs font-bold mt-2">
              <Plus className="w-3 h-3" />
              <span>12.5% so với hôm qua</span>
            </div>
          </div>
          <div className="absolute -right-4 -bottom-4 opacity-5 group-hover:opacity-10 transition-opacity">
            <ShoppingCart className="w-32 h-32" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm relative overflow-hidden group">
          <div className="relative z-10">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">DOANH THU NGÀY</p>
            <p className="text-4xl font-black text-red-600 mt-2">82.4M</p>
            <div className="flex items-center gap-1 text-slate-400 text-xs font-bold mt-2 uppercase tracking-tighter">
              <Wallet className="w-3 h-3" />
              <span>VNĐ</span>
            </div>
          </div>
          <div className="absolute -right-4 -bottom-4 opacity-5 group-hover:opacity-10 transition-opacity">
            <CreditCard className="w-32 h-32" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm relative overflow-hidden group">
          <div className="relative z-10">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">ĐƠN ĐANG GIAO</p>
            <p className="text-4xl font-black text-blue-600 mt-2">42</p>
            <div className="flex items-center -space-x-2 mt-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="w-8 h-8 rounded-full border-2 border-white bg-slate-100 flex items-center justify-center text-[10px] font-bold text-slate-600">
                  U{i}
                </div>
              ))}
              <div className="w-8 h-8 rounded-full border-2 border-white bg-blue-50 flex items-center justify-center text-[10px] font-bold text-blue-600">
                +15
              </div>
            </div>
          </div>
          <div className="absolute -right-4 -bottom-4 opacity-5 group-hover:opacity-10 transition-opacity">
            <Truck className="w-32 h-32" />
          </div>
        </div>
      </div>

      {/* Filters Section */}
      <div className="bg-red-50/30 p-6 rounded-[32px] border border-red-100/50">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="space-y-2">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider ml-1">TÌM KIẾM</label>
            <div className="relative">
              <Search className="w-4 h-4 absolute right-4 top-1/2 -translate-y-1/2 text-slate-400" />
              <input 
                type="text" 
                placeholder="Mã đơn, tên khách, SĐT..." 
                className="w-full px-4 py-3 bg-white border-transparent focus:border-red-200 focus:ring-4 focus:ring-red-500/5 rounded-2xl text-sm transition-all outline-none shadow-sm"
              />
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider ml-1">TRẠNG THÁI</label>
            <select className="w-full px-4 py-3 bg-white border-transparent focus:border-red-200 focus:ring-4 focus:ring-red-500/5 rounded-2xl text-sm transition-all outline-none shadow-sm appearance-none cursor-pointer">
              <option>Tất cả trạng thái</option>
              <option>Chờ duyệt</option>
              <option>Đã giao</option>
              <option>Đang giao</option>
              <option>Đã hủy</option>
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
              <option>Nguyễn Văn An</option>
              <option>Trần Thị Bình</option>
            </select>
          </div>
        </div>
        <div className="mt-4">
          <button className="p-3 bg-white text-slate-400 rounded-xl border border-slate-100 shadow-sm hover:text-red-600 transition-colors">
            <Filter className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Table Section */}
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
              {orders.map((order) => {
                const status = statusConfig[order.status as keyof typeof statusConfig];
                const payment = paymentConfig[order.paymentMethod as keyof typeof paymentConfig];
                return (
                  <tr 
                    key={order.id} 
                    className="hover:bg-slate-50/50 transition-all group cursor-pointer" 
                    onClick={() => navigate(`/orders/edit/${order.id}`)}
                  >
                    <td className="px-8 py-6">
                      <span className="text-sm font-black text-red-600 font-mono tracking-tighter">{order.id}</span>
                    </td>
                    <td className="px-8 py-6">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-xs font-bold text-slate-500">
                          {order.initials}
                        </div>
                        <div>
                          <p className="text-sm font-bold text-slate-900">{order.customerName}</p>
                          <p className="text-[10px] text-slate-400 font-medium">{order.customerPhone}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-8 py-6">
                      <p className="text-sm font-medium text-slate-900">
                        {new Date(order.date).toLocaleDateString('vi-VN') === new Date().toLocaleDateString('vi-VN') ? 'Hôm nay' : 'Hôm qua'},
                      </p>
                      <p className="text-sm font-medium text-slate-900">
                        {new Date(order.date).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </td>
                    <td className="px-8 py-6">
                      <p className="text-sm font-black text-slate-900">{formatCurrency(order.total)}</p>
                    </td>
                    <td className="px-8 py-6">
                      <p className="text-sm font-bold text-emerald-600">{formatCurrency(order.total * 0.05)}</p>
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
                      <Link 
                        to={`/orders/edit/${order.id}`}
                        onClick={(e) => e.stopPropagation()}
                        className="inline-flex items-center gap-2 px-3 py-1.5 bg-slate-100 text-slate-600 rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-red-600 hover:text-white transition-all shadow-sm"
                      >
                        <Edit2 className="w-3 h-3" />
                        Sửa
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-4 px-4">
        <p className="text-xs font-medium text-slate-400">Hiển thị <span className="text-slate-900">1-10</span> trong số <span className="text-slate-900">1,284</span> đơn hàng</p>
        <div className="flex items-center gap-2">
          <button className="p-2 text-slate-300 hover:text-red-600 transition-colors">
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button className="w-8 h-8 rounded-lg bg-red-600 text-white text-xs font-bold shadow-lg shadow-red-600/20">1</button>
          <button className="w-8 h-8 rounded-lg hover:bg-slate-100 text-slate-600 text-xs font-bold transition-colors">2</button>
          <button className="w-8 h-8 rounded-lg hover:bg-slate-100 text-slate-600 text-xs font-bold transition-colors">3</button>
          <span className="text-slate-300 px-1">...</span>
          <button className="w-8 h-8 rounded-lg hover:bg-slate-100 text-slate-600 text-xs font-bold transition-colors">128</button>
          <button className="p-2 text-slate-300 hover:text-red-600 transition-colors">
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
