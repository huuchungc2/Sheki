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
  Users,
  Upload,
  Loader2,
  AlertCircle
} from "lucide-react";
import { Link } from "react-router-dom";
import { cn, formatDate } from "../lib/utils";

const API_URL = "http://localhost:3000/api";

export function EmployeeList() {
  const [employees, setEmployees] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [searchTerm, setSearchTerm] = React.useState("");
  const [page, setPage] = React.useState(1);
  const [total, setTotal] = React.useState(0);
  const limit = 20;
  const currentUser = React.useMemo(() => {
    const u = localStorage.getItem("user");
    return u ? JSON.parse(u) : null;
  }, []);

  const fetchEmployees = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("token");
      const params = new URLSearchParams({ page: String(page), limit: String(limit), search: searchTerm });
      const res = await fetch(`${API_URL}/users?${params}`, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (!res.ok) throw new Error("Không thể tải dữ liệu");
      const json = await res.json();
      setEmployees(json.data);
      setTotal(json.total);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => { fetchEmployees(); }, [page, searchTerm]);

  const handleExport = async (entity: string) => {
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API_URL}/import/export/${entity}`, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (!res.ok) throw new Error("Xuất dữ liệu thất bại");
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `danh_sach_${entity}.xlsx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Bạn có chắc muốn vô hiệu hóa nhân viên này?")) return;
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API_URL}/users/${id}`, {
        method: "DELETE",
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (!res.ok) throw new Error("Xóa thất bại");
      fetchEmployees();
    } catch (err: any) {
      alert(err.message);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 mx-auto text-red-400 mb-4" />
          <p className="text-red-500 font-medium">{error}</p>
          <button onClick={fetchEmployees} className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-xl text-sm">Thử lại</button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Danh sách nhân viên</h1>
          <p className="text-slate-500 text-sm mt-1">Quản lý thông tin và phân quyền cho đội ngũ của bạn.</p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={() => handleExport('employees')} className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm font-medium text-slate-700 hover:bg-slate-50 transition-all">
            <Download className="w-4 h-4" /> Xuất Excel
          </button>
          <Link to="/employees/import" className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm font-medium text-slate-700 hover:bg-slate-50 transition-all">
            <Upload className="w-4 h-4" /> Nhập hàng loạt
          </Link>
          <Link to="/employees/new" className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 transition-all shadow-lg shadow-blue-600/20">
            <Plus className="w-4 h-4" /> Thêm nhân viên
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Tổng nhân sự</p>
            <p className="text-xl font-bold text-slate-900">{total}</p>
          </div>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-slate-200 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600">
            <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse mr-2"></div>
            <span className="font-bold">{employees.filter(e => e.is_active).length}</span>
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
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Trang {page}</p>
            <p className="text-xl font-bold text-slate-900">{Math.ceil(total / limit)} trang</p>
          </div>
        </div>
      </div>

      <div className="bg-white p-4 rounded-2xl border border-slate-200 flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="relative w-full md:w-96">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input type="text" placeholder="Tìm theo tên, email, số điện thoại..." className="w-full pl-10 pr-4 py-2 bg-slate-50 border-transparent focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 rounded-xl text-sm transition-all outline-none" value={searchTerm} onChange={(e) => { setSearchTerm(e.target.value); setPage(1); }} />
        </div>
        <div className="flex items-center gap-2 w-full md:w-auto">
          <button className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2 bg-slate-50 text-slate-600 rounded-xl text-sm font-medium hover:bg-slate-100 transition-all">
            <Filter className="w-4 h-4" /> Bộ lọc
          </button>
          <select className="flex-1 md:flex-none px-4 py-2 bg-slate-50 text-slate-600 rounded-xl text-sm font-medium outline-none focus:ring-2 focus:ring-blue-500/20">
            <option>Tất cả phòng ban</option>
            <option>Kinh doanh</option>
            <option>Kho vận</option>
            <option>Tài chính</option>
          </select>
        </div>
      </div>

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
              {employees.length === 0 ? (
                <tr><td colSpan={6} className="px-6 py-12 text-center text-slate-400">Không có nhân viên nào</td></tr>
              ) : (
                employees.map((employee) => (
                  <tr key={employee.id} className="hover:bg-slate-50/50 transition-all group">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold text-sm">
                          {employee.full_name?.split(' ').map((n: string) => n[0]).join('').toUpperCase()}
                        </div>
                        <div>
                          <Link to={`/employees/${employee.id}`} className="text-sm font-bold text-slate-900 hover:text-blue-600 transition-colors">{employee.full_name}</Link>
                          <p className="text-xs text-slate-500 font-mono uppercase">{employee.role}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-sm font-medium text-slate-900">{employee.position || '-'}</p>
                      <p className="text-xs text-slate-500">{employee.department || '-'}</p>
                    </td>
                    <td className="px-6 py-4">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 text-xs text-slate-500">
                          <Mail className="w-3 h-3" /> {employee.email}
                        </div>
                        <div className="flex items-center gap-2 text-xs text-slate-500">
                          <Phone className="w-3 h-3" /> {employee.phone || '-'}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600">
                      {employee.join_date ? formatDate(employee.join_date) : '-'}
                    </td>
                    <td className="px-6 py-4">
                      <span className={cn(
                        "inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider",
                        employee.is_active ? "bg-emerald-50 text-emerald-600" : "bg-slate-100 text-slate-500"
                      )}>
                        {employee.is_active ? "Đang làm việc" : "Đã nghỉ"}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-all">
                        <Link to={`/employees/edit/${employee.id}`} className="p-2 hover:bg-amber-50 hover:text-amber-600 rounded-lg text-slate-400 transition-all" title="Chỉnh sửa">
                          <Edit2 className="w-4 h-4" />
                        </Link>
                        {currentUser?.role === 'admin' && (
                          <button onClick={() => handleDelete(employee.id)} className="p-2 hover:bg-red-50 hover:text-red-600 rounded-lg text-slate-400 transition-all" title="Xóa">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="px-6 py-4 bg-slate-50/50 border-t border-slate-200 flex items-center justify-between">
          <p className="text-sm text-slate-500">Hiển thị {((page - 1) * limit) + 1}-{Math.min(page * limit, total)} trong tổng số {total} nhân viên</p>
          <div className="flex items-center gap-2">
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="p-2 hover:bg-white border border-transparent hover:border-slate-200 rounded-lg text-slate-400 disabled:opacity-50 transition-all">
              <ChevronLeft className="w-4 h-4" />
            </button>
            {Array.from({ length: Math.min(5, Math.ceil(total / limit)) }, (_, i) => (
              <button key={i} onClick={() => setPage(i + 1)} className={cn("w-8 h-8 flex items-center justify-center rounded-lg text-sm font-bold transition-all", page === i + 1 ? "bg-blue-600 text-white shadow-sm" : "hover:bg-white border border-transparent hover:border-slate-200 text-slate-600")}>
                {i + 1}
              </button>
            ))}
            <button onClick={() => setPage(p => Math.min(Math.ceil(total / limit), p + 1))} disabled={page >= Math.ceil(total / limit)} className="p-2 hover:bg-white border border-transparent hover:border-slate-200 rounded-lg text-slate-400 disabled:opacity-50 transition-all">
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
