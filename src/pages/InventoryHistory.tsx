import * as React from "react";
import { 
  Search, 
  Filter, 
  ArrowUpRight, 
  ArrowDownRight, 
  Calendar, 
  Download,
  ChevronLeft,
  ChevronRight,
  Eye,
  FileText,
  Warehouse,
  User,
  Tag
} from "lucide-react";
import { Link } from "react-router-dom";
import { cn, formatDate, formatCurrency } from "../lib/utils";
import type { InventoryTransaction } from "../types";

const transactions: (InventoryTransaction & { totalValue: number })[] = [
  { id: "PNK-001", type: "import", date: "2026-04-03T08:30:00", warehouse: "Kho trung tâm", staff: "Nguyễn Văn An", totalItems: 80, status: "completed", totalValue: 15400000 },
  { id: "PXK-001", type: "export", date: "2026-04-02T14:20:00", warehouse: "Kho trung tâm", staff: "Trần Thị Bình", totalItems: 12, status: "completed", totalValue: 4200000 },
  { id: "PNK-002", type: "import", date: "2026-04-01T10:15:00", warehouse: "Kho chi nhánh 1", staff: "Lê Văn Cường", totalItems: 45, status: "completed", totalValue: 8900000 },
  { id: "PXK-002", type: "export", date: "2026-03-31T16:45:00", warehouse: "Kho trung tâm", staff: "Nguyễn Văn An", totalItems: 5, status: "draft", totalValue: 1250000 },
  { id: "PNK-003", type: "import", date: "2026-03-30T09:00:00", warehouse: "Kho trung tâm", staff: "Phạm Thị Dung", totalItems: 120, status: "completed", totalValue:  24500000 },
];

export function InventoryHistory() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Lịch sử Nhập Xuất Kho</h1>
          <p className="text-slate-500 text-sm mt-1">Theo dõi biến động hàng hóa trong kho của bạn.</p>
        </div>
        <div className="flex items-center gap-3">
          <button className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm font-medium text-slate-700 hover:bg-slate-50 transition-all">
            <Download className="w-4 h-4" />
            Xuất báo cáo
          </button>
          <div className="flex bg-white border border-slate-200 rounded-xl p-1 shadow-sm">
            <Link to="/inventory/import" className="px-4 py-1.5 bg-blue-600 text-white rounded-lg text-sm font-bold shadow-sm flex items-center gap-2">
              <ArrowDownRight className="w-4 h-4" />
              Nhập kho
            </Link>
            <Link to="/inventory/export" className="px-4 py-1.5 text-slate-600 hover:bg-slate-50 rounded-lg text-sm font-bold flex items-center gap-2 transition-all">
              <ArrowUpRight className="w-4 h-4" />
              Xuất kho
            </Link>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-200">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Tổng nhập tháng này</p>
          <div className="flex items-center justify-between mt-2">
            <p className="text-xl font-bold text-slate-900">482,000,000 ₫</p>
            <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">+12%</span>
          </div>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-slate-200">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Tổng xuất tháng này</p>
          <div className="flex items-center justify-between mt-2">
            <p className="text-xl font-bold text-slate-900">156,000,000 ₫</p>
            <span className="text-[10px] font-bold text-red-600 bg-red-50 px-2 py-0.5 rounded-full">-5%</span>
          </div>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-slate-200">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Số phiếu nhập</p>
          <p className="text-xl font-bold text-slate-900 mt-2">24 phiếu</p>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-slate-200">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Số phiếu xuất</p>
          <p className="text-xl font-bold text-slate-900 mt-2">18 phiếu</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="relative w-full md:w-96">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input 
            type="text" 
            placeholder="Tìm theo mã phiếu, người lập..." 
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border-transparent focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 rounded-xl text-sm transition-all outline-none"
          />
        </div>
        <div className="flex items-center gap-2 w-full md:w-auto">
          <button className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2 bg-slate-50 text-slate-600 rounded-xl text-sm font-medium hover:bg-slate-100 transition-all">
            <Calendar className="w-4 h-4" />
            Thời gian
          </button>
          <select className="flex-1 md:flex-none px-4 py-2 bg-slate-50 text-slate-600 rounded-xl text-sm font-medium outline-none focus:ring-2 focus:ring-blue-500/20">
            <option>Tất cả loại phiếu</option>
            <option>Nhập kho</option>
            <option>Xuất kho</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/50 border-b border-slate-200">
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Mã phiếu</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Loại</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Thời gian</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Kho / Người lập</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Số lượng</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Giá trị</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Trạng thái</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {transactions.map((tx) => (
                <tr key={tx.id} className="hover:bg-slate-50/50 transition-all group">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        "w-8 h-8 rounded-lg flex items-center justify-center",
                        tx.type === "import" ? "bg-blue-50 text-blue-600" : "bg-amber-50 text-amber-600"
                      )}>
                        <FileText className="w-4 h-4" />
                      </div>
                      <span className="text-sm font-bold text-slate-900 font-mono">{tx.id}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={cn(
                      "text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full",
                      tx.type === "import" ? "bg-blue-50 text-blue-600" : "bg-amber-50 text-amber-600"
                    )}>
                      {tx.type === "import" ? "Nhập kho" : "Xuất kho"}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-sm text-slate-900">{formatDate(tx.date)}</p>
                    <p className="text-xs text-slate-500">{new Date(tx.date).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}</p>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2 text-sm text-slate-900">
                      <Warehouse className="w-3 h-3 text-slate-400" />
                      {tx.warehouse}
                    </div>
                    <div className="flex items-center gap-2 text-xs text-slate-500 mt-1">
                      <User className="w-3 h-3 text-slate-400" />
                      {tx.staff}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm font-medium text-slate-900">
                    {tx.totalItems} SP
                  </td>
                  <td className="px-6 py-4 text-sm font-bold text-slate-900">
                    {formatCurrency(tx.totalValue)}
                  </td>
                  <td className="px-6 py-4">
                    <span className={cn(
                      "inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider",
                      tx.status === "completed" ? "bg-emerald-50 text-emerald-600" : "bg-slate-100 text-slate-500"
                    )}>
                      {tx.status === "completed" ? "Hoàn tất" : "Lưu nháp"}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button className="p-2 hover:bg-slate-100 rounded-lg text-slate-400 transition-all">
                      <Eye className="w-4 h-4" />
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
