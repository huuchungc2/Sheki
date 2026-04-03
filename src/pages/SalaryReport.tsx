import * as React from "react";
import { 
  BarChart3, 
  TrendingUp, 
  Users, 
  DollarSign, 
  Download, 
  Calendar,
  ChevronRight,
  ArrowUpRight
} from "lucide-react";
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Cell
} from "recharts";
import { cn, formatCurrency } from "../lib/utils";

const data = [
  { name: "Nguyễn Văn An", sales: 125000000, commission: 6250000 },
  { name: "Trần Thị Bình", sales: 98000000, commission: 4900000 },
  { name: "Hoàng Văn Em", sales: 142000000, commission: 7100000 },
  { name: "Phạm Thị Dung", sales: 85000000, commission: 4250000 },
  { name: "Lê Văn Cường", sales: 65000000, commission: 3250000 },
];

const performanceData = [...data].sort((a, b) => b.sales - a.sales);

export function SalaryReport() {
  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Báo cáo lương doanh số</h1>
          <p className="text-slate-500 text-sm mt-1">Thống kê hiệu suất bán hàng và hoa hồng nhân viên.</p>
        </div>
        <div className="flex items-center gap-3">
          <button className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm font-medium text-slate-700 hover:bg-slate-50 transition-all shadow-sm">
            <Calendar className="w-4 h-4" />
            Tháng 04/2026
          </button>
          <button className="px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 transition-all shadow-lg shadow-blue-600/20">
            Xuất báo cáo
          </button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600">
              <TrendingUp className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Tổng doanh số</p>
              <p className="text-2xl font-bold text-slate-900">515,000,000 ₫</p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-xs font-bold text-emerald-600">
            <ArrowUpRight className="w-3 h-3" />
            +15.2% so với tháng trước
          </div>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-12 h-12 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600">
              <DollarSign className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Tổng hoa hồng</p>
              <p className="text-2xl font-bold text-slate-900">25,750,000 ₫</p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-xs font-bold text-emerald-600">
            <ArrowUpRight className="w-3 h-3" />
            +8.4% so với tháng trước
          </div>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-12 h-12 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Nhân viên đạt KPI</p>
              <p className="text-2xl font-bold text-slate-900">12 / 15</p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-xs font-bold text-emerald-600">
            <ArrowUpRight className="w-3 h-3" />
            +2 nhân viên mới đạt
          </div>
        </div>
      </div>

      {/* Chart & Table */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <h2 className="text-lg font-bold text-slate-900 mb-8">Top doanh số nhân viên</h2>
          <div className="h-[300px] w-full overflow-hidden">
            <BarChart data={performanceData} layout="vertical" margin={{ left: 40 }} width={500} height={300}>
              <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#f1f5f9" />
              <XAxis type="number" hide />
              <YAxis 
                dataKey="name" 
                type="category" 
                axisLine={false} 
                tickLine={false}
                tick={{fill: '#64748b', fontSize: 12}}
              />
              <Tooltip 
                cursor={{fill: '#f8fafc'}}
                contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                formatter={(value: number) => [formatCurrency(value), 'Doanh số']}
              />
              <Bar dataKey="sales" radius={[0, 4, 4, 0]} barSize={20}>
                {performanceData.map((_, index) => (
                  <Cell key={`cell-${index}`} fill={index === 0 ? '#2563eb' : '#94a3b8'} />
                ))}
              </Bar>
            </BarChart>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-slate-100">
            <h2 className="text-lg font-bold text-slate-900">Chi tiết hoa hồng</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/50 border-b border-slate-100">
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Nhân viên</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Doanh số</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Tỷ lệ</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Hoa hồng</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data.map((item) => (
                  <tr key={item.name} className="hover:bg-slate-50/50 transition-all group">
                    <td className="px-6 py-4">
                      <p className="text-sm font-bold text-slate-900">{item.name}</p>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-sm text-slate-900">{formatCurrency(item.sales)}</p>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">5%</span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <p className="text-sm font-bold text-slate-900">{formatCurrency(item.commission)}</p>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
