import * as React from "react";
import { 
  ArrowLeft, Save, User, Mail, Phone, Briefcase, Calendar,
  CreditCard, MapPin, Shield, Loader2, AlertCircle, CheckCircle2, Users
} from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import { cn } from "../lib/utils";

const API_URL = "http://localhost:3000/api";

export function EmployeeForm() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = Boolean(id);

  const [formData, setFormData] = React.useState({
    full_name: "",
    email: "",
    password: "",
    phone: "",
    role: "sales",
    department: "",
    position: "",
    commission_rate: 5,
    salary: 0,
    join_date: "",
    address: "",
    city: "",
    is_active: 1,
  });
  const [groupIds, setGroupIds] = React.useState<number[]>([]);
  const [groups, setGroups] = React.useState<any[]>([]);
  const [isLoading, setIsLoading] = React.useState(isEdit);
  const [isSaving, setIsSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [success, setSuccess] = React.useState(false);

  React.useEffect(() => {
    const fetchGroups = async () => {
      try {
        const token = localStorage.getItem("token");
        const res = await fetch(`${API_URL}/groups`, {
          headers: { "Authorization": `Bearer ${token}` }
        });
        if (res.ok) {
          const json = await res.json();
          setGroups(json.data || []);
        }
      } catch (err) {
        console.error("Failed to fetch groups", err);
      }
    };
    fetchGroups();
  }, []);

  React.useEffect(() => {
    if (isEdit && id) {
      const fetchEmployee = async () => {
        try {
          const token = localStorage.getItem("token");
          const [empRes, groupsRes] = await Promise.all([
            fetch(`${API_URL}/users/${id}`, { headers: { "Authorization": `Bearer ${token}` } }),
            fetch(`${API_URL}/groups/user/${id}`, { headers: { "Authorization": `Bearer ${token}` } }),
          ]);
          if (!empRes.ok) {
            const err = await empRes.json();
            throw new Error(err.error || "Không thể tải thông tin nhân viên");
          }
          const json = await empRes.json();
          const emp = json.data;
          setFormData({
            full_name: emp.full_name || "",
            email: emp.email || "",
            password: "",
            phone: emp.phone || "",
            role: emp.role || "sales",
            department: emp.department || "",
            position: emp.position || "",
            commission_rate: emp.commission_rate || 5,
            salary: emp.salary || 0,
            join_date: emp.join_date ? emp.join_date.split('T')[0] : "",
            address: emp.address || "",
            city: emp.city || "",
            is_active: emp.is_active !== undefined ? emp.is_active : 1,
          });
          if (groupsRes.ok) {
            const gjson = await groupsRes.json();
            setGroupIds((gjson.data || []).map((g: any) => g.id));
          }
        } catch (err: any) {
          setError(err.message);
        } finally {
          setIsLoading(false);
        }
      };
      fetchEmployee();
    } else {
      setIsLoading(false);
    }
  }, [id, isEdit]);

  const handleChange = (field: string, value: string | number) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const toggleGroup = (groupId: number) => {
    setGroupIds(prev => 
      prev.includes(groupId) ? prev.filter(id => id !== groupId) : [...prev, groupId]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setError(null);
    try {
      const token = localStorage.getItem("token");
      const method = isEdit ? "PUT" : "POST";
      const url = isEdit ? `${API_URL}/users/${id}` : `${API_URL}/users`;
      if (!isEdit && !formData.password) {
        throw new Error("Vui lòng nhập mật khẩu");
      }
      const body: any = { ...formData };
      if (isEdit && !formData.password) {
        delete body.password;
      }
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
        body: JSON.stringify(body)
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Thao tác thất bại");
      }
      
      // Save groups if editing
      if (isEdit) {
        await fetch(`${API_URL}/groups/user/${id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
          body: JSON.stringify({ group_ids: groupIds })
        });
      }
      
      setSuccess(true);
      setTimeout(() => navigate("/employees"), 1000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
      </div>
    );
  }

  if (error && isEdit && !formData.full_name) {
    return (
      <div className="max-w-4xl mx-auto space-y-8">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate(-1)} className="p-2 hover:bg-slate-100 rounded-xl text-slate-500 transition-all"><ArrowLeft className="w-5 h-5" /></button>
          <div><h1 className="text-2xl font-bold text-slate-900">Lỗi tải dữ liệu</h1></div>
        </div>
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" /> {error}
        </div>
        <button onClick={() => navigate("/employees")} className="px-6 py-3 bg-blue-600 text-white rounded-xl text-sm font-bold">Quay lại danh sách</button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate(-1)} className="p-2 hover:bg-slate-100 rounded-xl text-slate-500 transition-all">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">
              {isEdit ? `Chỉnh sửa nhân viên: ${formData.full_name || id}` : "Thêm nhân viên mới"}
            </h1>
            <p className="text-slate-500 text-sm mt-1">
              {isEdit ? "Cập nhật thông tin hồ sơ nhân sự." : "Điền đầy đủ thông tin để tạo hồ sơ nhân sự."}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button type="button" onClick={() => navigate(-1)} className="px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm font-medium text-slate-700 hover:bg-slate-50 transition-all">Hủy bỏ</button>
          <button type="button" onClick={handleSubmit} disabled={isSaving} className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 transition-all shadow-lg shadow-blue-600/20 disabled:opacity-50">
            {isSaving && <Loader2 className="w-4 h-4 animate-spin" />}
            <Save className="w-4 h-4" />
            {isSaving ? "Đang lưu..." : "Lưu hồ sơ"}
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" /> {error}
        </div>
      )}
      {success && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 px-4 py-3 rounded-xl text-sm flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" /> Đã lưu thành công!
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="space-y-6">
            <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm flex flex-col items-center text-center">
              <div className="w-24 h-24 rounded-full bg-blue-100 flex items-center justify-center text-blue-400 mb-4">
                <User className="w-12 h-12" />
              </div>
              <h3 className="font-bold text-slate-900">Vai trò hệ thống</h3>
              <div className="mt-4 w-full space-y-4">
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 text-left">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Vai trò</span>
                  </div>
                  <select value={formData.role} onChange={(e) => handleChange("role", e.target.value)} className="w-full text-lg font-bold text-slate-900 bg-transparent outline-none cursor-pointer">
                    <option value="sales">Nhân viên bán hàng</option>
                    <option value="admin">Quản trị viên</option>
                  </select>
                </div>

                {isEdit && (
                  <div className="space-y-2 text-left">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Đặt lại mật khẩu</label>
                    <div className="relative">
                      <input type="password" value={formData.password} onChange={(e) => handleChange("password", e.target.value)} placeholder="Để trống nếu không đổi" className="w-full px-4 py-3 bg-slate-50 border-transparent focus:bg-white focus:border-blue-500 rounded-xl text-sm outline-none" />
                    </div>
                  </div>
                )}

                <div className="space-y-2 text-left">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Trạng thái</label>
                  <select value={formData.is_active} onChange={(e) => handleChange("is_active", Number(e.target.value))} className="w-full text-sm font-bold text-slate-900 bg-transparent outline-none cursor-pointer">
                    <option value={1}>Đang làm việc</option>
                    <option value={0}>Đã nghỉ</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Groups Selection */}
            <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm">
              <h3 className="font-bold text-slate-900 mb-4 flex items-center gap-2">
                <Users className="w-4 h-4 text-blue-600" />
                Nhóm nhân viên
              </h3>
              {groups.length === 0 ? (
                <p className="text-sm text-slate-400 text-center py-4">Chưa có nhóm nào. Tạo nhóm trong Cài đặt.</p>
              ) : (
                <div className="space-y-2">
                  {groups.map(group => (
                    <label key={group.id} className={cn(
                      "flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all",
                      groupIds.includes(group.id) ? "bg-blue-50 border-blue-200" : "bg-slate-50 border-slate-200 hover:border-blue-200"
                    )}>
                      <input
                        type="checkbox"
                        checked={groupIds.includes(group.id)}
                        onChange={() => toggleGroup(group.id)}
                        className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                      />
                      <div>
                        <p className="text-sm font-bold text-slate-900">{group.name}</p>
                        {group.description && <p className="text-xs text-slate-400">{group.description}</p>}
                      </div>
                    </label>
                  ))}
                </div>
              )}
            </div>

            <div className="bg-blue-600 p-6 rounded-3xl text-white shadow-xl shadow-blue-600/20">
              <h3 className="font-bold text-lg">Bảo mật tài khoản</h3>
              <p className="text-blue-100 text-sm mt-1">{isEdit ? 'Để trống mật khẩu nếu không muốn đổi.' : 'Mật khẩu mặc định sẽ được gửi qua email nhân viên sau khi tạo hồ sơ.'}</p>
            </div>
          </div>

          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600"><User className="w-4 h-4" /></div>
                <h2 className="text-lg font-bold text-slate-900">Thông tin cá nhân</h2>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700">Họ và tên <span className="text-red-500">*</span></label>
                  <input type="text" value={formData.full_name} onChange={(e) => handleChange("full_name", e.target.value)} placeholder="VD: Nguyễn Văn An" required className="w-full px-4 py-2.5 bg-slate-50 border-transparent focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 rounded-xl text-sm transition-all outline-none" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700">Email công việc <span className="text-red-500">*</span></label>
                  <div className="relative">
                    <Mail className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input type="email" value={formData.email} onChange={(e) => handleChange("email", e.target.value)} placeholder="email@company.com" required className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border-transparent focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 rounded-xl text-sm transition-all outline-none" />
                  </div>
                </div>
                {!isEdit && (
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-slate-700">Mật khẩu <span className="text-red-500">*</span></label>
                    <div className="relative">
                      <Shield className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input type="password" value={formData.password} onChange={(e) => handleChange("password", e.target.value)} placeholder="Tối thiểu 6 ký tự" required className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border-transparent focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 rounded-xl text-sm transition-all outline-none" />
                    </div>
                  </div>
                )}
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700">Số điện thoại</label>
                  <div className="relative">
                    <Phone className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input type="tel" value={formData.phone} onChange={(e) => handleChange("phone", e.target.value)} placeholder="090 123 4567" className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border-transparent focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 rounded-xl text-sm transition-all outline-none" />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700">Phòng ban</label>
                  <div className="relative">
                    <Briefcase className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input type="text" value={formData.department} onChange={(e) => handleChange("department", e.target.value)} placeholder="VD: Kinh doanh" className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border-transparent focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 rounded-xl text-sm transition-all outline-none" />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700">Chức vụ</label>
                  <div className="relative">
                    <User className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input type="text" value={formData.position} onChange={(e) => handleChange("position", e.target.value)} placeholder="VD: Nhân viên" className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border-transparent focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 rounded-xl text-sm transition-all outline-none" />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700">Ngày gia nhập</label>
                  <div className="relative">
                    <Calendar className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input type="date" value={formData.join_date} onChange={(e) => handleChange("join_date", e.target.value)} className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border-transparent focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 rounded-xl text-sm transition-all outline-none" />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700">Tỉnh / Thành phố</label>
                  <div className="relative">
                    <MapPin className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input type="text" value={formData.city} onChange={(e) => handleChange("city", e.target.value)} placeholder="VD: Hà Nội" className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border-transparent focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 rounded-xl text-sm transition-all outline-none" />
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-600"><CreditCard className="w-4 h-4" /></div>
                <h2 className="text-lg font-bold text-slate-900">Lương & Hoa hồng</h2>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700">Lương cơ bản (VNĐ)</label>
                  <input type="number" value={formData.salary || ""} onChange={(e) => handleChange("salary", Number(e.target.value))} placeholder="0" className="w-full px-4 py-2.5 bg-slate-50 border-transparent focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 rounded-xl text-sm transition-all outline-none" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700">Tỷ lệ hoa hồng (%)</label>
                  <input type="number" value={formData.commission_rate || ""} onChange={(e) => handleChange("commission_rate", Number(e.target.value))} placeholder="5" className="w-full px-4 py-2.5 bg-slate-50 border-transparent focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 rounded-xl text-sm transition-all outline-none" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
