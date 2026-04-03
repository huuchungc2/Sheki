import * as React from "react";
import { 
  TrendingUp, 
  TrendingDown, 
  Users, 
  Package, 
  ShoppingCart, 
  DollarSign,
  ArrowUpRight,
  ArrowDownRight,
  Calendar,
  ChevronRight
} from "lucide-react";
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell
} from "recharts";
import { motion } from "framer-motion";
import { cn, formatCurrency } from "../lib/utils";

const data = [
  { name: "T2", sales: 4000, revenue: 2400 },
  { name: "T3", sales: 3000, revenue: 1398 },
  { name: "T4", sales: 2000, revenue: 9800 },
  { name: "T5", sales: 2780, revenue: 3908 },
  { name: "T6", sales: 1890, revenue: 4800 },
  { name: "T7", sales: 2390, revenue: 3800 },
  { name: "CN", sales: 3490, revenue: 4300 },
];

const stats = [
  { 
    name: "Tổng doanh thu", 
    value: "1,280,000,000 ₫", 
    change: "+12.5%", 
    trend: "up", 
    icon: DollarSign,
    color: "bg-blue-500"
  },
  { 
    name: "Đơn hàng mới", 
    value: "156", 
    change: "+8.2%", 
    trend: "up", 
    icon: ShoppingCart,
    color: "bg-emerald-500"
  },
  { 
    name: "Khách hàng mới", 
    value: "42", 
    change: "-3.1%", 
    trend: "down", 
    icon: Users,
    color: "bg-indigo-500"
  },
  { 
    name: "Sản phẩm bán chạy", 
    value: "892", 
    change: "+24.3%", 
    trend: "up", 
    icon: Package,
    color: "bg-amber-500"
  },
];

const recentOrders = [
  { id: "#ORD-7281", customer: "Nguyễn Văn A", date: "2 phút trước", total: 1250000, status: "Hoàn tất" },
  { id: "#ORD-7282", customer: "Trần Thị B", date: "15 phút trước", total: 890000, status: "Đang xử lý" },
  { id: "#ORD-7283", customer: "Lê Văn C", date: "1 giờ trước", total: 2100000, status: "Đang giao" },
  { id: "#ORD-7284", customer: "Phạm Thị D", date: "3 giờ trước", total: 450000, status: "Đã hủy" },
];

export function Dashboard() {
  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Chào buổi sáng, Admin!</h1>
          <p className="text-slate-500 mt-1">Dưới đây là những gì đang diễn ra với cửa hàng của bạn hôm nay.</p>
        </div>
        <div className="flex items-center gap-3">
          <button className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm font-medium text-slate-700 hover:bg-slate-50 transition-all shadow-sm">
            <Calendar className="w-4 h-4" />
            Hôm nay: 03/04/2026
          </button>
          <button className="px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 transition-all shadow-lg shadow-blue-600/20">
            Xuất báo cáo
          </button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, index) => (
          <motion.div 
            key={stat.name}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-all group"
          >
            <div className="flex items-center justify-between mb-4">
              <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center text-white shadow-lg", stat.color)}>
                <stat.icon className="w-6 h-6" />
              </div>
              <div className={cn(
                "flex items-center gap-1 text-xs font-bold px-2 py-1 rounded-full",
                stat.trend === "up" ? "bg-emerald-50 text-emerald-600" : "bg-red-50 text-red-600"
              )}>
                {stat.trend === "up" ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                {stat.change}
              </div>
            </div>
            <p className="text-sm font-medium text-slate-500">{stat.name}</p>
            <p className="text-2xl font-bold text-slate-900 mt-1">{stat.value}</p>
          </motion.div>
        ))}
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-lg font-bold text-slate-900">Doanh thu & Lợi nhuận</h2>
              <p className="text-sm text-slate-500">Thống kê trong 7 ngày qua</p>
            </div>
            <select className="bg-slate-50 border-none text-sm font-medium rounded-lg px-3 py-1.5 outline-none focus:ring-2 focus:ring-blue-500/20">
              <option>7 ngày qua</option>
              <option>30 ngày qua</option>
              <option>Tháng này</option>
            </select>
          </div>
          <div className="h-[300px] w-full overflow-hidden">
            <AreaChart data={data} width={800} height={300}>
              <defs>
                <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#2563eb" stopOpacity={0.1}/>
                  <stop offset="95%" stopColor="#2563eb" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis 
                dataKey="name" 
                axisLine={false} 
                tickLine={false} 
                tick={{fill: '#64748b', fontSize: 12}}
                dy={10}
              />
              <YAxis 
                axisLine={false} 
                tickLine={false} 
                tick={{fill: '#64748b', fontSize: 12}}
                tickFormatter={(value) => `${value/1000000}M`}
              />
              <Tooltip 
                contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                formatter={(value: number) => [formatCurrency(value), 'Doanh thu']}
              />
              <Area 
                type="monotone" 
                dataKey="revenue" 
                stroke="#2563eb" 
                strokeWidth={3}
                fillOpacity={1} 
                fill="url(#colorRevenue)" 
              />
            </AreaChart>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <h2 className="text-lg font-bold text-slate-900 mb-6">Đơn hàng gần đây</h2>
          <div className="space-y-6">
            {recentOrders.map((order, index) => (
              <motion.div 
                key={order.id}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 + 0.5 }}
                className="flex items-center justify-between group cursor-pointer"
              >
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-600 font-bold text-xs group-hover:bg-blue-50 group-hover:text-blue-600 transition-all">
                    {order.customer.split(' ').map(n => n[0]).join('')}
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-900">{order.customer}</p>
                    <p className="text-xs text-slate-500">{order.id} • {order.date}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-slate-900">{formatCurrency(order.total)}</p>
                  <p className={cn(
                    "text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full mt-1 inline-block",
                    order.status === "Hoàn tất" ? "bg-emerald-50 text-emerald-600" :
                    order.status === "Đang xử lý" ? "bg-amber-50 text-amber-600" :
                    order.status === "Đang giao" ? "bg-blue-50 text-blue-600" :
                    "bg-red-50 text-red-600"
                  )}>
                    {order.status}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>
          <button className="w-full mt-8 py-3 bg-slate-50 text-slate-600 rounded-xl text-sm font-bold hover:bg-slate-100 transition-all flex items-center justify-center gap-2">
            Xem tất cả đơn hàng
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
