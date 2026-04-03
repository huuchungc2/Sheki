import * as React from "react";
import { 
  ArrowLeft, 
  Camera, 
  Save, 
  X,
  User,
  Mail,
  Phone,
  Briefcase,
  Calendar,
  CreditCard,
  MapPin,
  Shield
} from "lucide-react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { cn } from "../lib/utils";

export function EmployeeForm() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = Boolean(id);

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => navigate(-1)}
            className="p-2 hover:bg-slate-100 rounded-xl text-slate-500 transition-all"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">
              {isEdit ? `Chỉnh sửa nhân viên: ${id}` : "Thêm nhân viên mới"}
            </h1>
            <p className="text-slate-500 text-sm mt-1">
              {isEdit ? "Cập nhật thông tin hồ sơ nhân sự." : "Điền đầy đủ thông tin để tạo hồ sơ nhân sự."}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={() => navigate(-1)}
            className="px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm font-medium text-slate-700 hover:bg-slate-50 transition-all"
          >
            Hủy bỏ
          </button>
          <button className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 transition-all shadow-lg shadow-blue-600/20">
            <Save className="w-4 h-4" />
            Lưu hồ sơ
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Avatar & Quick Info */}
        <div className="space-y-6">
          <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm flex flex-col items-center text-center">
            <div className="relative group">
              <div className="w-32 h-32 rounded-full bg-slate-100 border-4 border-white shadow-xl overflow-hidden flex items-center justify-center">
                <User className="w-12 h-12 text-slate-300" />
              </div>
              <button className="absolute bottom-0 right-0 p-2 bg-blue-600 text-white rounded-full shadow-lg hover:bg-blue-700 transition-all">
                <Camera className="w-4 h-4" />
              </button>
            </div>
            <h3 className="mt-4 font-bold text-slate-900">Ảnh đại diện</h3>
            <p className="text-xs text-slate-500 mt-1">Định dạng JPG, PNG. Tối đa 2MB.</p>
            
            <div className="w-full h-px bg-slate-100 my-6"></div>
            
            <div className="w-full space-y-4">
              <div className="text-left">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Trạng thái</label>
                <div className="mt-2 flex items-center gap-2 p-2 bg-emerald-50 rounded-xl border border-emerald-100">
                  <div className="w-2 h-2 bg-emerald-500 rounded-full"></div>
                  <span className="text-sm font-bold text-emerald-700">Đang hoạt động</span>
                </div>
              </div>
              <div className="text-left">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Phân quyền</label>
                <select className="mt-2 w-full px-4 py-2 bg-slate-50 border-none rounded-xl text-sm font-medium outline-none focus:ring-2 focus:ring-blue-500/20">
                  <option>Nhân viên</option>
                  <option>Quản lý</option>
                  <option>Quản trị viên</option>
                </select>
              </div>
            </div>
          </div>

          <div className="bg-blue-600 p-6 rounded-3xl text-white shadow-xl shadow-blue-600/20 relative overflow-hidden">
            <Shield className="w-24 h-24 absolute -right-4 -bottom-4 text-white/10 rotate-12" />
            <h3 className="font-bold text-lg relative z-10">Bảo mật tài khoản</h3>
            <p className="text-blue-100 text-sm mt-1 relative z-10">Mật khẩu mặc định sẽ được gửi qua email nhân viên sau khi tạo hồ sơ.</p>
          </div>
        </div>

        {/* Right Column: Main Form */}
        <div className="lg:col-span-2 space-y-6">
          {/* Personal Info */}
          <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600">
                <User className="w-4 h-4" />
              </div>
              <h2 className="text-lg font-bold text-slate-900">Thông tin cá nhân</h2>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700">Họ và tên <span className="text-red-500">*</span></label>
                <input 
                  type="text" 
                  placeholder="VD: Nguyễn Văn An" 
                  className="w-full px-4 py-2.5 bg-slate-50 border-transparent focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 rounded-xl text-sm transition-all outline-none"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700">Mã nhân viên</label>
                <input 
                  type="text" 
                  placeholder="Tự động tạo" 
                  disabled
                  className="w-full px-4 py-2.5 bg-slate-100 border-transparent rounded-xl text-sm transition-all outline-none cursor-not-allowed"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700">Email công việc <span className="text-red-500">*</span></label>
                <div className="relative">
                  <Mail className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input 
                    type="email" 
                    placeholder="an.nv@velocity.vn" 
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border-transparent focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 rounded-xl text-sm transition-all outline-none"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700">Số điện thoại <span className="text-red-500">*</span></label>
                <div className="relative">
                  <Phone className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input 
                    type="tel" 
                    placeholder="0901 234 567" 
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border-transparent focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 rounded-xl text-sm transition-all outline-none"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Employment Info */}
          <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-600">
                <Briefcase className="w-4 h-4" />
              </div>
              <h2 className="text-lg font-bold text-slate-900">Thông tin công việc</h2>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700">Phòng ban</label>
                <select className="w-full px-4 py-2.5 bg-slate-50 border-transparent focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 rounded-xl text-sm transition-all outline-none">
                  <option>Kinh doanh</option>
                  <option>Kho vận</option>
                  <option>Tài chính</option>
                  <option>Marketing</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700">Chức vụ</label>
                <input 
                  type="text" 
                  placeholder="VD: Nhân viên bán hàng" 
                  className="w-full px-4 py-2.5 bg-slate-50 border-transparent focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 rounded-xl text-sm transition-all outline-none"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700">Ngày bắt đầu</label>
                <div className="relative">
                  <Calendar className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input 
                    type="date" 
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border-transparent focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 rounded-xl text-sm transition-all outline-none"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700">Lương cơ bản</label>
                <div className="relative">
                  <CreditCard className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input 
                    type="number" 
                    placeholder="VD: 8,000,000" 
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border-transparent focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 rounded-xl text-sm transition-all outline-none"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Address */}
          <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center text-amber-600">
                <MapPin className="w-4 h-4" />
              </div>
              <h2 className="text-lg font-bold text-slate-900">Địa chỉ liên hệ</h2>
            </div>
            
            <div className="space-y-6">
              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700">Địa chỉ thường trú</label>
                <input 
                  type="text" 
                  placeholder="Số nhà, tên đường, phường/xã..." 
                  className="w-full px-4 py-2.5 bg-slate-50 border-transparent focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 rounded-xl text-sm transition-all outline-none"
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700">Tỉnh / Thành phố</label>
                  <select className="w-full px-4 py-2.5 bg-slate-50 border-transparent focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 rounded-xl text-sm transition-all outline-none">
                    <option>Hà Nội</option>
                    <option>TP. Hồ Chí Minh</option>
                    <option>Đà Nẵng</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700">Quận / Huyện</label>
                  <select className="w-full px-4 py-2.5 bg-slate-50 border-transparent focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 rounded-xl text-sm transition-all outline-none">
                    <option>Cầu Giấy</option>
                    <option>Hoàn Kiếm</option>
                    <option>Đống Đa</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700">Mã bưu điện</label>
                  <input 
                    type="text" 
                    placeholder="100000" 
                    className="w-full px-4 py-2.5 bg-slate-50 border-transparent focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 rounded-xl text-sm transition-all outline-none"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
