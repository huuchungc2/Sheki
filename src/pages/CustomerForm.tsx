import * as React from "react";
import { 
  ArrowLeft, 
  Save, 
  User, 
  Phone, 
  Mail, 
  MapPin, 
  Calendar, 
  Star,
  Info,
  CreditCard,
  History
} from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import { cn } from "../lib/utils";

export function CustomerForm() {
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
              {isEdit ? `Chỉnh sửa khách hàng: ${id}` : "Thêm khách hàng mới"}
            </h1>
            <p className="text-slate-500 text-sm mt-1">
              {isEdit ? "Cập nhật thông tin chi tiết của khách hàng." : "Thu thập thông tin khách hàng để chăm sóc tốt hơn."}
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
            Lưu khách hàng
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Loyalty & Stats */}
        <div className="space-y-6">
          <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm flex flex-col items-center text-center">
            <div className="w-24 h-24 rounded-full bg-slate-100 flex items-center justify-center text-slate-300 mb-4">
              <User className="w-12 h-12" />
            </div>
            <h3 className="font-bold text-slate-900">Hạng thành viên</h3>
            <div className="mt-4 w-full space-y-4">
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 text-left">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Hạng hiện tại</span>
                  <span className="text-[10px] font-bold text-slate-600 bg-slate-200 px-2 py-0.5 rounded-full">MỚI</span>
                </div>
                <p className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  <Star className="w-5 h-5 text-slate-400 fill-current" />
                  Silver Member
                </p>
              </div>
              
              <div className="space-y-2 text-left">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Ghi chú đặc biệt</label>
                <textarea 
                  rows={3}
                  placeholder="Sở thích, lưu ý khi phục vụ..."
                  className="w-full px-4 py-3 bg-slate-50 border-transparent focus:bg-white focus:border-blue-500 rounded-xl text-sm outline-none resize-none"
                ></textarea>
              </div>
            </div>
          </div>

          <div className="bg-indigo-600 p-6 rounded-3xl text-white shadow-xl shadow-indigo-600/20">
            <h3 className="font-bold text-lg">Tích lũy điểm</h3>
            <p className="text-indigo-100 text-sm mt-1">Khách hàng sẽ nhận được 1 điểm cho mỗi 10,000 ₫ chi tiêu.</p>
            <div className="mt-6 flex items-center justify-between">
              <div className="text-center">
                <p className="text-2xl font-bold">0</p>
                <p className="text-[10px] uppercase font-bold text-indigo-200">Điểm hiện có</p>
              </div>
              <div className="h-8 w-px bg-indigo-500"></div>
              <div className="text-center">
                <p className="text-2xl font-bold">0 ₫</p>
                <p className="text-[10px] uppercase font-bold text-indigo-200">Tổng chi tiêu</p>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Main Form */}
        <div className="lg:col-span-2 space-y-6">
          {/* Basic Info */}
          <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600">
                <User className="w-4 h-4" />
              </div>
              <h2 className="text-lg font-bold text-slate-900">Thông tin cơ bản</h2>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700">Họ và tên <span className="text-red-500">*</span></label>
                <input 
                  type="text" 
                  placeholder="VD: Nguyễn Thị Lan" 
                  className="w-full px-4 py-2.5 bg-slate-50 border-transparent focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 rounded-xl text-sm transition-all outline-none"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700">Số điện thoại <span className="text-red-500">*</span></label>
                <div className="relative">
                  <Phone className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input 
                    type="tel" 
                    placeholder="0912 345 678" 
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border-transparent focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 rounded-xl text-sm transition-all outline-none"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700">Email</label>
                <div className="relative">
                  <Mail className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input 
                    type="email" 
                    placeholder="lan.nt@gmail.com" 
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border-transparent focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 rounded-xl text-sm transition-all outline-none"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700">Ngày sinh</label>
                <div className="relative">
                  <Calendar className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input 
                    type="date" 
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border-transparent focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 rounded-xl text-sm transition-all outline-none"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Address & More */}
          <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center text-amber-600">
                <MapPin className="w-4 h-4" />
              </div>
              <h2 className="text-lg font-bold text-slate-900">Địa chỉ & Liên hệ</h2>
            </div>
            
            <div className="space-y-6">
              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700">Địa chỉ chi tiết</label>
                <input 
                  type="text" 
                  placeholder="Số nhà, tên đường, phường/xã..." 
                  className="w-full px-4 py-2.5 bg-slate-50 border-transparent focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 rounded-xl text-sm transition-all outline-none"
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700">Tỉnh / Thành phố</label>
                  <select className="w-full px-4 py-2.5 bg-slate-50 border-transparent focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 rounded-xl text-sm transition-all outline-none">
                    <option>Hà Nội</option>
                    <option>TP. Hồ Chí Minh</option>
                    <option>Đà Nẵng</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700">Nhân viên phụ trách</label>
                  <select className="w-full px-4 py-2.5 bg-slate-50 border-transparent focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 rounded-xl text-sm transition-all outline-none">
                    <option value="">Không có</option>
                    <option value="EMP001">Nguyễn Văn An</option>
                    <option value="EMP002">Trần Thị Bình</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700">Nguồn khách hàng</label>
                  <select className="w-full px-4 py-2.5 bg-slate-50 border-transparent focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 rounded-xl text-sm transition-all outline-none">
                    <option>Tại cửa hàng</option>
                    <option>Facebook</option>
                    <option>Website</option>
                    <option>Người quen giới thiệu</option>
                  </select>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
