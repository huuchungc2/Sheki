import * as React from "react";
import { 
  Search, 
  Filter, 
  Plus, 
  MoreHorizontal, 
  Mail, 
  Phone, 
  MapPin,
  ChevronLeft,
  ChevronRight,
  Download,
  Trash2,
  Edit2,
  Eye,
  Users
} from "lucide-react";
import { Link } from "react-router-dom";
import { cn, formatDate } from "../lib/utils";
import type { Employee } from "../types";

const employees: Employee[] = [
  { id: "EMP001", name: "Nguyễn Văn An", email: "an.nv@velocity.vn", phone: "0901 234 567", role: "Quản lý cửa hàng", department: "Vận hành", status: "active", joinDate: "2024-01-15", avatar: "https://i.pravatar.cc/150?u=EMP001" },
  { id: "EMP002", name: "Trần Thị Bình", email: "binh.tt@velocity.vn", phone: "0902 345 678", role: "Nhân viên bán hàng", department: "Kinh doanh", status: "active", joinDate: "2024-02-20", avatar: "https://i.pravatar.cc/150?u=EMP002" },
  { id: "EMP003", name: "Lê Văn Cường", email: "cuong.lv@velocity.vn", phone: "0903 456 789", role: "Nhân viên kho", department: "Kho vận", status: "inactive", joinDate: "2024-03-10", avatar: "https://i.pravatar.cc/150?u=EMP003" },
  { id: "EMP004", name: "Phạm Thị Dung", email: "dung.pt@velocity.vn", phone: "0904 567 890", role: "Kế toán", department: "Tài chính", status: "active", joinDate: "2024-04-05", avatar: "https://i.pravatar.cc/150?u=EMP004" },
  { id: "EMP005", name: "Hoàng Văn Em", email: "em.hv@velocity.vn", phone: "0905 678 901", role: "Nhân viên bán hàng", department: "Kinh doanh", status: "active", joinDate: "2024-05-12", avatar: "https://i.pravatar.cc/150?u=EMP005" },
];

export function EmployeeList() {
  const [searchTerm, setSearchTerm] = React.useState("");

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Danh sách nhân viên</h1>
          <p className="text-slate-500 text-sm mt-1">Quản lý thông tin và phân quyền cho đội ngũ của bạn.</p>
        </div>
        <div className="flex items-center gap-3">
          <button className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm font-medium text-slate-700 hover:bg-slate-50 transition-all">
            <Download className="w-4 h-4" />
            Xuất Excel
          </button>
          <Link to="/employees/import" className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm font-medium text-slate-700 hover:bg-slate-50 transition-all">
            <Upload className="w-4 h-4" />
            Nhập hàng loạt
          </Link>
          <Link to="/employees/new" className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 transition-all shadow-lg shadow-blue-600/20">
            <Plus className="w-4 h-4" />
            Thêm nhân viên
          </Link>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Tổng nhân sự</p>
            <p className="text-xl font-bold text-slate-900">48</p>
          </div>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-slate-200 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600">
            <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse mr-2"></div>
            <span className="font-bold">42</span>
          </div>
          <div>
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Đang làm việc</p>
            <p className="text-xl font-bold text-slate-900">Hoạt động</p>
          </div>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-slate-200 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-amber-50 flex items-center justify-center text-amber-600">
            <Plus className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Tháng này</p>
            <p className="text-xl font-bold text-slate-900">+5 mới</p>
          </div>
        </div>
      </div>

      {/* Filters & Search */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="relative w-full md:w-96">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input 
            type="text" 
            placeholder="Tìm theo tên, email, số điện thoại..." 
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border-transparent focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 rounded-xl text-sm transition-all outline-none"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-2 w-full md:w-auto">
          <button className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2 bg-slate-50 text-slate-600 rounded-xl text-sm font-medium hover:bg-slate-100 transition-all">
            <Filter className="w-4 h-4" />
            Bộ lọc
          </button>
          <select className="flex-1 md:flex-none px-4 py-2 bg-slate-50 text-slate-600 rounded-xl text-sm font-medium outline-none focus:ring-2 focus:ring-blue-500/20">
            <option>Tất cả phòng ban</option>
            <option>Kinh doanh</option>
            <option>Kho vận</option>
            <option>Tài chính</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/50 border-b border-slate-200">
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Nhân viên</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Phòng ban / Chức vụ</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Liên hệ</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Ngày gia nhập</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Trạng thái</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {employees.map((employee) => (
                <tr key={employee.id} className="hover:bg-slate-50/50 transition-all group">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <img src={employee.avatar} alt={employee.name} className="w-10 h-10 rounded-xl object-cover ring-2 ring-white shadow-sm" />
                      <div>
                        <p className="text-sm font-bold text-slate-900">{employee.name}</p>
                        <p className="text-xs text-slate-500 font-mono uppercase">{employee.id}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-sm font-medium text-slate-900">{employee.role}</p>
                    <p className="text-xs text-slate-500">{employee.department}</p>
                  </td>
                  <td className="px-6 py-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 text-xs text-slate-500">
                        <Mail className="w-3 h-3" />
                        {employee.email}
                      </div>
                      <div className="flex items-center gap-2 text-xs text-slate-500">
                        <Phone className="w-3 h-3" />
                        {employee.phone}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-600">
                    {formatDate(employee.joinDate)}
                  </td>
                  <td className="px-6 py-4">
                    <span className={cn(
                      "inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider",
                      employee.status === "active" ? "bg-emerald-50 text-emerald-600" : "bg-slate-100 text-slate-500"
                    )}>
                      {employee.status === "active" ? "Đang làm việc" : "Đã nghỉ"}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-all">
                      <button className="p-2 hover:bg-blue-50 hover:text-blue-600 rounded-lg text-slate-400 transition-all" title="Xem chi tiết">
                        <Eye className="w-4 h-4" />
                      </button>
                      <button className="p-2 hover:bg-amber-50 hover:text-amber-600 rounded-lg text-slate-400 transition-all" title="Chỉnh sửa">
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button className="p-2 hover:bg-red-50 hover:text-red-600 rounded-lg text-slate-400 transition-all" title="Xóa">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="px-6 py-4 bg-slate-50/50 border-t border-slate-200 flex items-center justify-between">
          <p className="text-sm text-slate-500">Hiển thị 1-5 trong tổng số 48 nhân viên</p>
          <div className="flex items-center gap-2">
            <button className="p-2 hover:bg-white border border-transparent hover:border-slate-200 rounded-lg text-slate-400 disabled:opacity-50 transition-all" disabled>
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button className="w-8 h-8 flex items-center justify-center bg-blue-600 text-white rounded-lg text-sm font-bold shadow-sm">1</button>
            <button className="w-8 h-8 flex items-center justify-center hover:bg-white border border-transparent hover:border-slate-200 rounded-lg text-sm font-medium text-slate-600 transition-all">2</button>
            <button className="w-8 h-8 flex items-center justify-center hover:bg-white border border-transparent hover:border-slate-200 rounded-lg text-sm font-medium text-slate-600 transition-all">3</button>
            <button className="p-2 hover:bg-white border border-transparent hover:border-slate-200 rounded-lg text-slate-400 transition-all">
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
