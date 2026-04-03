import * as React from "react";
import { 
  ArrowLeft, 
  Save, 
  Package, 
  Image as ImageIcon, 
  Plus, 
  Trash2,
  Tag,
  DollarSign,
  Box,
  Truck,
  Info
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { cn } from "../lib/utils";

export function ProductForm() {
  const navigate = useNavigate();

  return (
    <div className="max-w-5xl mx-auto space-y-8">
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
            <h1 className="text-2xl font-bold text-slate-900">Thêm sản phẩm mới</h1>
            <p className="text-slate-500 text-sm mt-1">Tạo sản phẩm mới để bắt đầu kinh doanh.</p>
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
            Lưu sản phẩm
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Media & Logistics */}
        <div className="space-y-6">
          {/* Media */}
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
            <h3 className="font-bold text-slate-900 mb-4 flex items-center gap-2">
              <ImageIcon className="w-4 h-4 text-blue-600" />
              Hình ảnh sản phẩm
            </h3>
            <div className="aspect-square rounded-2xl bg-slate-50 border-2 border-dashed border-slate-200 flex flex-col items-center justify-center text-slate-400 hover:bg-slate-100 hover:border-blue-400 cursor-pointer transition-all group">
              <div className="w-12 h-12 rounded-xl bg-white shadow-sm flex items-center justify-center mb-3 group-hover:scale-110 transition-all">
                <Plus className="w-6 h-6 text-slate-400 group-hover:text-blue-600" />
              </div>
              <p className="text-sm font-medium">Tải ảnh lên</p>
              <p className="text-xs mt-1">Kéo thả hoặc nhấn để chọn</p>
            </div>
            <div className="grid grid-cols-4 gap-2 mt-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="aspect-square rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-center text-slate-300">
                  <ImageIcon className="w-4 h-4" />
                </div>
              ))}
            </div>
          </div>

          {/* Logistics */}
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
            <h3 className="font-bold text-slate-900 mb-4 flex items-center gap-2">
              <Truck className="w-4 h-4 text-blue-600" />
              Vận chuyển & Kho
            </h3>
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700">Cân nặng (gram)</label>
                <input 
                  type="number" 
                  placeholder="0" 
                  className="w-full px-4 py-2 bg-slate-50 border-transparent focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 rounded-xl text-sm transition-all outline-none"
                />
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Dài</label>
                  <input type="number" placeholder="cm" className="w-full px-2 py-2 bg-slate-50 border-transparent focus:bg-white focus:border-blue-500 rounded-lg text-sm outline-none" />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Rộng</label>
                  <input type="number" placeholder="cm" className="w-full px-2 py-2 bg-slate-50 border-transparent focus:bg-white focus:border-blue-500 rounded-lg text-sm outline-none" />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Cao</label>
                  <input type="number" placeholder="cm" className="w-full px-2 py-2 bg-slate-50 border-transparent focus:bg-white focus:border-blue-500 rounded-lg text-sm outline-none" />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Main Form */}
        <div className="lg:col-span-2 space-y-6">
          {/* General Info */}
          <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600">
                <Package className="w-4 h-4" />
              </div>
              <h2 className="text-lg font-bold text-slate-900">Thông tin chung</h2>
            </div>
            
            <div className="space-y-6">
              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700">Tên sản phẩm <span className="text-red-500">*</span></label>
                <input 
                  type="text" 
                  placeholder="VD: Áo thun Cotton Basic" 
                  className="w-full px-4 py-2.5 bg-slate-50 border-transparent focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 rounded-xl text-sm transition-all outline-none"
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700">Mã SKU <span className="text-red-500">*</span></label>
                  <input 
                    type="text" 
                    placeholder="VD: TS-001" 
                    className="w-full px-4 py-2.5 bg-slate-50 border-transparent focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 rounded-xl text-sm font-mono transition-all outline-none"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700">Danh mục</label>
                  <select className="w-full px-4 py-2.5 bg-slate-50 border-transparent focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 rounded-xl text-sm transition-all outline-none">
                    <option>Áo nam</option>
                    <option>Quần nam</option>
                    <option>Giày dép</option>
                    <option>Phụ kiện</option>
                  </select>
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700">Mô tả sản phẩm</label>
                <textarea 
                  rows={4}
                  placeholder="Nhập mô tả chi tiết về sản phẩm..."
                  className="w-full px-4 py-3 bg-slate-50 border-transparent focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 rounded-2xl text-sm transition-all outline-none resize-none"
                ></textarea>
              </div>
            </div>
          </div>

          {/* Pricing & Inventory */}
          <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-600">
                <DollarSign className="w-4 h-4" />
              </div>
              <h2 className="text-lg font-bold text-slate-900">Giá bán & Tồn kho</h2>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700">Giá bán lẻ</label>
                <div className="relative">
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 text-xs font-bold">VNĐ</span>
                  <input 
                    type="number" 
                    placeholder="0" 
                    className="w-full px-4 py-2.5 bg-slate-50 border-transparent focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 rounded-xl text-sm transition-all outline-none"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700">Giá vốn</label>
                <div className="relative">
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 text-xs font-bold">VNĐ</span>
                  <input 
                    type="number" 
                    placeholder="0" 
                    className="w-full px-4 py-2.5 bg-slate-50 border-transparent focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 rounded-xl text-sm transition-all outline-none"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700">Tồn kho ban đầu</label>
                <input 
                  type="number" 
                  placeholder="0" 
                  className="w-full px-4 py-2.5 bg-slate-50 border-transparent focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 rounded-xl text-sm transition-all outline-none"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700">Cảnh báo hết hàng</label>
                <input 
                  type="number" 
                  placeholder="VD: 10" 
                  className="w-full px-4 py-2.5 bg-slate-50 border-transparent focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 rounded-xl text-sm transition-all outline-none"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
