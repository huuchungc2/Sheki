import * as React from "react";
import { 
  Search, 
  Filter, 
  Plus, 
  Download, 
  ChevronLeft, 
  ChevronRight,
  UserCircle,
  Phone,
  Mail,
  Star,
  MoreVertical,
  Edit2,
  Trash2,
  Eye,
  History,
  Upload
} from "lucide-react";
import { Link } from "react-router-dom";
import { cn, formatCurrency, formatDate } from "../lib/utils";
import type { Customer } from "../types";

const customers: Customer[] = [
  { id: "CUST001", name: "Nguyễn Thị Lan", phone: "0912 345 678", email: "lan.nt@gmail.com", tier: "Diamond", totalSpent: 45000000, lastVisit: "2026-04-01", status: "active" },
  { id: "CUST002", name: "Trần Văn Hùng", phone: "0923 456 789", email: "hung.tv@gmail.com", tier: "Gold", totalSpent: 12500000, lastVisit: "2026-03-28", status: "active" },
  { id: "CUST003", name: "Lê Thị Mai", phone: "0934 567 890", email: "mai.lt@gmail.com", tier: "Platinum", totalSpent: 28000000, lastVisit: "2026-03-15", status: "active" },
  { id: "CUST004", name: "Phạm Minh Tuấn", phone: "0945 678 901", email: "tuan.pm@gmail.com", tier: "Silver", totalSpent: 3500000, lastVisit: "2026-02-10", status: "inactive" },
  { id: "CUST005", name: "Hoàng Bảo Ngọc", phone: "0956 789 012", email: "ngoc.hb@gmail.com", tier: "Gold", totalSpent: 15800000, lastVisit: "2026-03-30", status: "active" },
];

const tierColors = {
  Silver: "bg-slate-100 text-slate-600",
  Gold: "bg-amber-100 text-amber-700",
  Platinum: "bg-blue-100 text-blue-700",
  Diamond: "bg-indigo-100 text-indigo-700",
};

export function CustomerList() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Quản lý khách hàng</h1>
          <p className="text-slate-500 text-sm mt-1">Theo dõi hành vi mua sắm và hạng thành viên.</p>
        </div>
        <div className="flex items-center gap-3">
          <button className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm font-medium text-slate-700 hover:bg-slate-50 transition-all">
            <Download className="w-4 h-4" />
            Xuất dữ liệu
          </button>
          <Link to="/customers/import" className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm font-medium text-slate-700 hover:bg-slate-50 transition-all">
            <Upload className="w-4 h-4" />
            Nhập hàng loạt
          </Link>
          <Link to="/customers/new" className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 transition-all shadow-lg shadow-blue-600/20">
            <Plus className="w-4 h-4" />
            Thêm khách hàng
          </Link>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-200">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Tổng khách hàng</p>
          <p className="text-xl font-bold text-slate-900 mt-2">2,840</p>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-slate-200">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Khách hàng mới (Tháng)</p>
          <p className="text-xl font-bold text-blue-600 mt-2">+124</p>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-slate-200">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Tỷ lệ quay lại</p>
          <p className="text-xl font-bold text-emerald-600 mt-2">68.5%</p>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-slate-200">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Hạng Diamond</p>
          <p className="text-xl font-bold text-indigo-600 mt-2">42</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="relative w-full md:w-96">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input 
            type="text" 
            placeholder="Tìm theo tên, SĐT, email..." 
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border-transparent focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 rounded-xl text-sm transition-all outline-none"
          />
        </div>
        <div className="flex items-center gap-2 w-full md:w-auto">
          <button className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2 bg-slate-50 text-slate-600 rounded-xl text-sm font-medium hover:bg-slate-100 transition-all">
            <Filter className="w-4 h-4" />
            Bộ lọc
          </button>
          <select className="flex-1 md:flex-none px-4 py-2 bg-slate-50 text-slate-600 rounded-xl text-sm font-medium outline-none focus:ring-2 focus:ring-blue-500/20">
            <option>Tất cả hạng</option>
            <option>Diamond</option>
            <option>Platinum</option>
            <option>Gold</option>
            <option>Silver</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/50 border-b border-slate-200">
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Khách hàng</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Liên hệ</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Hạng</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Tổng chi tiêu</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Lần cuối</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {customers.map((customer) => (
                <tr key={customer.id} className="hover:bg-slate-50/50 transition-all group">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-600 font-bold group-hover:bg-blue-50 group-hover:text-blue-600 transition-all">
                        {customer.name.split(' ').map(n => n[0]).join('')}
                      </div>
                      <div>
                        <p className="text-sm font-bold text-slate-900">{customer.name}</p>
                        <p className="text-xs text-slate-500 font-mono uppercase">{customer.id}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 text-xs text-slate-500">
                        <Phone className="w-3 h-3" />
                        {customer.phone}
                      </div>
                      <div className="flex items-center gap-2 text-xs text-slate-500">
                        <Mail className="w-3 h-3" />
                        {customer.email}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={cn(
                      "inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider",
                      tierColors[customer.tier]
                    )}>
                      <Star className="w-3 h-3 fill-current" />
                      {customer.tier}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-sm font-bold text-slate-900">{formatCurrency(customer.totalSpent)}</p>
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-600">
                    {formatDate(customer.lastVisit)}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button className="p-2 hover:bg-blue-50 hover:text-blue-600 rounded-lg text-slate-400 transition-all">
                        <History className="w-4 h-4" />
                      </button>
                      <Link to={`/customers/edit/${customer.id}`} className="p-2 hover:bg-amber-50 hover:text-amber-600 rounded-lg text-slate-400 transition-all">
                        <Edit2 className="w-4 h-4" />
                      </Link>
                      <button className="p-2 hover:bg-red-50 hover:text-red-600 rounded-lg text-slate-400 transition-all">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
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
