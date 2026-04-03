import * as React from "react";
import { Search, Calendar, Filter, ArrowRight } from "lucide-react";
import { cn, formatCurrency } from "../lib/utils";

// Mock data for orders
const mockOrders = [
  { id: "ORD-001", customer: "Nguyễn Văn A", date: "2026-04-03", total: 1250000, status: "Hoàn tất" },
  { id: "ORD-002", customer: "Trần Thị B", date: "2026-04-02", total: 890000, status: "Đang xử lý" },
  { id: "ORD-003", customer: "Lê Văn C", date: "2026-03-28", total: 2100000, status: "Đang giao" },
  { id: "ORD-004", customer: "Phạm Thị D", date: "2026-01-15", total: 450000, status: "Đã hủy" },
  { id: "ORD-005", customer: "Hoàng Văn E", date: "2025-12-20", total: 3200000, status: "Hoàn tất" },
  { id: "ORD-006", customer: "Vũ Thị F", date: "2026-04-03", total: 750000, status: "Hoàn tất" },
  { id: "ORD-007", customer: "Đặng Văn G", date: "2026-04-01", total: 1500000, status: "Đang giao" },
  { id: "ORD-008", customer: "Bùi Thị H", date: "2026-03-15", total: 920000, status: "Hoàn tất" },
];

interface OrderSearchProps {
  title: string;
  description: string;
  type: "day" | "month" | "year" | "range";
}

function OrderSearchBase({ title, description, type }: OrderSearchProps) {
  const [results] = React.useState(mockOrders);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">{title}</h1>
          <p className="text-slate-500 mt-1">{description}</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="px-4 py-2 bg-blue-50 text-blue-600 rounded-xl text-xs font-bold uppercase tracking-wider">
            Chế độ: {type === "day" ? "Ngày" : type === "month" ? "Tháng" : type === "year" ? "Năm" : "Khoảng thời gian"}
          </div>
        </div>
      </div>

      {/* Search Controls */}
      <div className="bg-white p-8 rounded-[2rem] border border-slate-200 shadow-sm space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-end">
          {type === "day" && (
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Chọn ngày</label>
              <div className="relative">
                <Calendar className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                <input 
                  type="date" 
                  defaultValue="2026-04-03"
                  className="w-full pl-12 pr-4 py-3 bg-slate-50 border-transparent focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 rounded-2xl text-sm transition-all outline-none"
                />
              </div>
            </div>
          )}

          {type === "month" && (
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Chọn tháng</label>
              <div className="relative">
                <Calendar className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                <input 
                  type="month" 
                  defaultValue="2026-04"
                  className="w-full pl-12 pr-4 py-3 bg-slate-50 border-transparent focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 rounded-2xl text-sm transition-all outline-none"
                />
              </div>
            </div>
          )}

          {type === "year" && (
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Chọn năm</label>
              <select className="w-full px-4 py-3 bg-slate-50 border-transparent focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 rounded-2xl text-sm transition-all outline-none">
                <option>2026</option>
                <option>2025</option>
                <option>2024</option>
              </select>
            </div>
          )}

          {type === "range" && (
            <>
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Từ ngày</label>
                <input 
                  type="date" 
                  className="w-full px-4 py-3 bg-slate-50 border-transparent focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 rounded-2xl text-sm transition-all outline-none"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Đến ngày</label>
                <input 
                  type="date" 
                  className="w-full px-4 py-3 bg-slate-50 border-transparent focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 rounded-2xl text-sm transition-all outline-none"
                />
              </div>
            </>
          )}

          <button className="flex items-center justify-center gap-2 px-8 py-3 bg-blue-600 text-white rounded-2xl text-sm font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-600/20">
            <Search className="w-4 h-4" />
            Tìm kiếm
          </button>
        </div>
      </div>

      {/* Results */}
      <div className="bg-white rounded-[2rem] border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <h2 className="text-lg font-bold text-slate-900">Kết quả tìm kiếm ({results.length})</h2>
          <button className="flex items-center gap-2 text-slate-500 text-sm font-bold hover:text-slate-700 transition-all">
            <Filter className="w-4 h-4" />
            Bộ lọc nâng cao
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-100">
                <th className="px-8 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Mã đơn hàng</th>
                <th className="px-8 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Khách hàng</th>
                <th className="px-8 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Ngày đặt</th>
                <th className="px-8 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Tổng tiền</th>
                <th className="px-8 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Trạng thái</th>
                <th className="px-8 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {results.map((order, index) => (
                <tr 
                  key={order.id}
                  className="hover:bg-slate-50/50 transition-all group"
                >
                  <td className="px-8 py-5">
                    <span className="text-sm font-mono font-bold text-blue-600">{order.id}</span>
                  </td>
                  <td className="px-8 py-5">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 text-xs font-bold">
                        {order.customer.charAt(0)}
                      </div>
                      <span className="text-sm font-bold text-slate-900">{order.customer}</span>
                    </div>
                  </td>
                  <td className="px-8 py-5 text-sm text-slate-500">
                    {order.date}
                  </td>
                  <td className="px-8 py-5 text-sm font-bold text-slate-900">
                    {formatCurrency(order.total)}
                  </td>
                  <td className="px-8 py-5">
                    <span className={cn(
                      "text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full",
                      order.status === "Hoàn tất" ? "bg-emerald-50 text-emerald-600" :
                      order.status === "Đang xử lý" ? "bg-amber-50 text-amber-600" :
                      order.status === "Đang giao" ? "bg-blue-50 text-blue-600" :
                      "bg-red-50 text-red-600"
                    )}>
                      {order.status}
                    </span>
                  </td>
                  <td className="px-8 py-5 text-right">
                    <button className="p-2 hover:bg-slate-100 rounded-xl text-slate-400 hover:text-blue-600 transition-all">
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export function OrderSearchDay() {
  return <OrderSearchBase title="Tìm kiếm theo ngày" description="Tra cứu các đơn hàng phát sinh trong một ngày cụ thể." type="day" />;
}

export function OrderSearchMonth() {
  return <OrderSearchBase title="Tìm kiếm theo tháng" description="Tra cứu các đơn hàng phát sinh trong một tháng cụ thể." type="month" />;
}

export function OrderSearchYear() {
  return <OrderSearchBase title="Tìm kiếm theo năm" description="Tra cứu các đơn hàng phát sinh trong một năm cụ thể." type="year" />;
}

export function OrderSearchRange() {
  return <OrderSearchBase title="Tìm kiếm theo khoảng thời gian" description="Tra cứu các đơn hàng phát sinh trong một khoảng thời gian tùy chọn." type="range" />;
}
