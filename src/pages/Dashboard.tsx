import * as React from "react";
import { Link } from "react-router-dom";
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
  ChevronRight,
  Loader2,
  AlertCircle
} from "lucide-react";
import { 
  AreaChart, 
  Area,
  BarChart,
  Bar,
  Cell, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer
} from "recharts";
import { cn, formatCurrency } from "../lib/utils";

const API_URL = "http://localhost:3000/api";

export function Dashboard() {
  const [dashboardData, setDashboardData] = React.useState<any>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const currentUser = React.useMemo(() => {
    const u = localStorage.getItem("user");
    return u ? JSON.parse(u) : null;
  }, []);

  React.useEffect(() => {
    const fetchDashboard = async () => {
      try {
        const token = localStorage.getItem("token");
        const res = await fetch(`${API_URL}/reports/dashboard`, {
          headers: { "Authorization": `Bearer ${token}` }
        });
        if (!res.ok) throw new Error("Không thể tải dữ liệu");
        const json = await res.json();
        setDashboardData(json.data);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchDashboard();
  }, []);

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto text-blue-600 mb-4" />
          <p className="text-slate-500">Đang tải dữ liệu...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 mx-auto text-red-400 mb-4" />
          <p className="text-red-500 font-medium">{error}</p>
          <button onClick={() => window.location.reload()} className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-xl text-sm">Thử lại</button>
        </div>
      </div>
    );
  }

  const stats = [
    { 
      name: "Doanh thu tháng này", 
      value: formatCurrency(dashboardData?.orders?.revenue || 0), 
      change: "+12.5%", 
      trend: "up", 
      icon: DollarSign,
      color: "bg-blue-500"
    },
    { 
      name: "Đơn hàng tháng này", 
      value: String(dashboardData?.orders?.total || 0), 
      change: "+8.2%", 
      trend: "up", 
      icon: ShoppingCart,
      color: "bg-emerald-500"
    },
    { 
      name: "Khách hàng mới", 
      value: String(dashboardData?.customers?.total || 0), 
      change: "-3.1%", 
      trend: "down", 
      icon: Users,
      color: "bg-indigo-500"
    },
    { 
      name: "Sản phẩm đang bán", 
      value: String(dashboardData?.products?.total || 0), 
      change: "+24.3%", 
      trend: "up", 
      icon: Package,
      color: "bg-amber-500"
    },
  ];

  const recentOrders = dashboardData?.recentOrders || [];
  const topProducts = dashboardData?.topProducts || [];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Chào buổi sáng, {currentUser?.full_name || 'Admin'}!</h1>
          <p className="text-slate-500 mt-1">Dưới đây là những gì đang diễn ra với cửa hàng của bạn hôm nay.</p>
        </div>
        <div className="flex items-center gap-3">
          <button className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm font-medium text-slate-700 hover:bg-slate-50 transition-all shadow-sm">
            <Calendar className="w-4 h-4" />
            Hôm nay: {new Date().toLocaleDateString('vi-VN')}
          </button>
          <Link to="/reports" className="px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 transition-all shadow-lg shadow-blue-600/20">
            Xem báo cáo
          </Link>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat) => (
            <div key={stat.name} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-all group">
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
          </div>
        ))}
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-lg font-bold text-slate-900">Top sản phẩm bán chạy</h2>
              <p className="text-sm text-slate-500">Thống kê trong tháng này</p>
            </div>
          </div>
          {topProducts.length > 0 ? (
            <div className="h-[300px] w-full overflow-hidden">
              <BarChart data={topProducts} width={600} height={300}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 11}} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} />
                <Tooltip formatter={(value: number) => [formatCurrency(value), 'Doanh thu']} contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }} />
                <Bar dataKey="revenue" radius={[8, 8, 0, 0]} barSize={40}>
                  {topProducts.map((_: any, index: number) => (
                    <Cell key={`cell-${index}`} fill={index === 0 ? '#2563eb' : '#94a3b8'} />
                  ))}
                </Bar>
              </BarChart>
            </div>
          ) : (
            <div className="h-[300px] flex items-center justify-center text-slate-400">Chưa có dữ liệu</div>
          )}
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <h2 className="text-lg font-bold text-slate-900 mb-6">Đơn hàng gần đây</h2>
          {recentOrders.length > 0 ? (
            <div className="space-y-6">
              {recentOrders.slice(0, 5).map((order: any) => (
                <Link key={order.id} to={`/orders`} className="flex items-center justify-between group cursor-pointer">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-600 font-bold text-xs group-hover:bg-blue-50 group-hover:text-blue-600 transition-all">
                      {(order.customer_name || 'KH').split(' ').map((n: string) => n[0]).join('')}
                    </div>
                    <div>
                      <p className="text-sm font-bold text-slate-900">{order.customer_name || 'Khách lẻ'}</p>
                      <p className="text-xs text-slate-500">{order.code} • {new Date(order.created_at).toLocaleDateString('vi-VN')}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-slate-900">{formatCurrency(order.total_amount)}</p>
                    <p className={cn(
                      "text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full mt-1 inline-block",
                      order.status === "done" ? "bg-emerald-50 text-emerald-600" :
                      order.status === "draft" ? "bg-slate-100 text-slate-500" :
                      order.status === "confirmed" ? "bg-amber-50 text-amber-600" :
                      order.status === "shipping" ? "bg-blue-50 text-blue-600" :
                      "bg-red-50 text-red-600"
                    )}>
                      {order.status === "done" ? "Hoàn tất" : order.status === "draft" ? "Nháp" : order.status === "confirmed" ? "Đã xác nhận" : order.status === "shipping" ? "Đang giao" : "Đã hủy"}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-slate-400">Chưa có đơn hàng nào</div>
          )}
          <Link to="/orders" className="w-full mt-8 py-3 bg-slate-50 text-slate-600 rounded-xl text-sm font-bold hover:bg-slate-100 transition-all flex items-center justify-center gap-2">
            Xem tất cả đơn hàng
            <ChevronRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </div>
  );
}
