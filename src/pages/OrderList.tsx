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
  CheckCircle2,
  Clock,
  XCircle,
  Package
} from "lucide-react";
import { Link } from "react-router-dom";
import { cn, formatCurrency, formatDate } from "../lib/utils";
import type { Order } from "../types";

const orders: Order[] = [
  { id: "ORD-7281", customerName: "Nguyễn Văn An", date: "2026-04-03T08:20:00", total: 1250000, status: "completed", paymentMethod: "Tiền mặt" },
  { id: "ORD-7282", customerName: "Trần Thị Bình", date: "2026-04-03T07:45:00", total: 890000, status: "pending", paymentMethod: "Chuyển khoản" },
  { id: "ORD-7283", customerName: "Lê Văn Cường", date: "2026-04-02T16:30:00", total: 2100000, status: "shipping", paymentMethod: "Thẻ ATM" },
  { id: "ORD-7284", customerName: "Phạm Thị Dung", date: "2026-04-02T14:15:00", total: 450000, status: "cancelled", paymentMethod: "Tiền mặt" },
  { id: "ORD-7285", customerName: "Hoàng Văn Em", date: "2026-04-02T11:00:00", total: 3200000, status: "completed", paymentMethod: "Chuyển khoản" },
];

const statusConfig = {
  pending: { label: "Chờ xử lý", color: "bg-amber-50 text-amber-600", icon: Clock },
  completed: { label: "Hoàn tất", color: "bg-emerald-50 text-emerald-600", icon: CheckCircle2 },
  cancelled: { label: "Đã hủy", color: "bg-red-50 text-red-600", icon: XCircle },
  shipping: { label: "Đang giao", color: "bg-blue-50 text-blue-600", icon: Truck },
};

export function OrderList() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Quản lý đơn hàng</h1>
          <p className="text-slate-500 text-sm mt-1">Theo dõi và xử lý đơn hàng từ khách hàng.</p>
        </div>
        <div className="flex items-center gap-3">
          <button className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm font-medium text-slate-700 hover:bg-slate-50 transition-all">
            <Download className="w-4 h-4" />
            Xuất báo cáo
          </button>
          <Link to="/orders/new" className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 transition-all shadow-lg shadow-blue-600/20">
            <Plus className="w-4 h-4" />
            Tạo đơn hàng
          </Link>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-200">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Tổng đơn hôm nay</p>
          <p className="text-xl font-bold text-slate-900 mt-2">156</p>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-slate-200">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Doanh thu hôm nay</p>
          <p className="text-xl font-bold text-blue-600 mt-2">42,500,000 ₫</p>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-slate-200">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Chờ xử lý</p>
          <p className="text-xl font-bold text-amber-600 mt-2">12</p>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-slate-200">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Đang giao hàng</p>
          <p className="text-xl font-bold text-indigo-600 mt-2">8</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="relative w-full md:w-96">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input 
            type="text" 
            placeholder="Tìm theo mã đơn, tên khách hàng..." 
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border-transparent focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 rounded-xl text-sm transition-all outline-none"
          />
        </div>
        <div className="flex items-center gap-2 w-full md:w-auto">
          <button className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2 bg-slate-50 text-slate-600 rounded-xl text-sm font-medium hover:bg-slate-100 transition-all">
            <Calendar className="w-4 h-4" />
            Thời gian
          </button>
          <select className="flex-1 md:flex-none px-4 py-2 bg-slate-50 text-slate-600 rounded-xl text-sm font-medium outline-none focus:ring-2 focus:ring-blue-500/20">
            <option>Tất cả trạng thái</option>
            <option>Hoàn tất</option>
            <option>Đang xử lý</option>
            <option>Đang giao</option>
            <option>Đã hủy</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/50 border-b border-slate-200">
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Mã đơn hàng</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Khách hàng</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Thời gian</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Tổng tiền</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Thanh toán</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Trạng thái</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {orders.map((order) => {
                const config = statusConfig[order.status];
                return (
                  <tr key={order.id} className="hover:bg-slate-50/50 transition-all group">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600">
                          <ShoppingCart className="w-4 h-4" />
                        </div>
                        <span className="text-sm font-bold text-slate-900 font-mono">{order.id}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2 text-sm text-slate-900 font-medium">
                        <User className="w-3 h-3 text-slate-400" />
                        {order.customerName}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-sm text-slate-900">{formatDate(order.date)}</p>
                      <p className="text-xs text-slate-500">{new Date(order.date).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}</p>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-sm font-bold text-slate-900">{formatCurrency(order.total)}</p>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2 text-xs text-slate-600">
                        <CreditCard className="w-3 h-3 text-slate-400" />
                        {order.paymentMethod}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={cn(
                        "inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider",
                        config.color
                      )}>
                        <config.icon className="w-3 h-3" />
                        {config.label}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button className="p-2 hover:bg-slate-100 rounded-lg text-slate-400 transition-all">
                        <Eye className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
