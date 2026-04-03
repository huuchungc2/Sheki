import * as React from "react";
import { 
  Plus, 
  Search, 
  Calendar, 
  Warehouse, 
  User, 
  Trash2, 
  Save, 
  ArrowLeft,
  Package,
  ChevronRight,
  FileText,
  Truck
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { cn, formatCurrency } from "../lib/utils";

export function InventoryExport() {
  const navigate = useNavigate();
  const [items, setItems] = React.useState([
    { id: 1, name: "Áo thun Cotton Basic", sku: "TS-001", unit: "Cái", quantity: 5, price: 250000 },
    { id: 2, name: "Quần Jean Slimfit", sku: "JN-002", unit: "Cái", quantity: 2, price: 550000 },
  ]);

  const total = items.reduce((sum, item) => sum + item.quantity * item.price, 0);

  return (
    <div className="max-w-6xl mx-auto space-y-8">
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
            <h1 className="text-2xl font-bold text-slate-900">Tạo phiếu xuất kho</h1>
            <p className="text-slate-500 text-sm mt-1">Xuất hàng hóa ra khỏi kho hệ thống.</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button className="px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm font-medium text-slate-700 hover:bg-slate-50 transition-all">
            Lưu nháp
          </button>
          <button className="flex items-center gap-2 px-6 py-2 bg-amber-600 text-white rounded-xl text-sm font-medium hover:bg-amber-700 transition-all shadow-lg shadow-amber-600/20">
            <Save className="w-4 h-4" />
            Hoàn tất xuất kho
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Form: Items List */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-900">Danh sách sản phẩm xuất</h2>
              <button className="flex items-center gap-2 text-blue-600 text-sm font-bold hover:text-blue-700 transition-all">
                <Plus className="w-4 h-4" />
                Thêm sản phẩm
              </button>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/50 border-b border-slate-100">
                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Sản phẩm</th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider w-24">SL</th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Đơn giá</th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Thành tiền</th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {items.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50/30 transition-all group">
                      <td className="px-6 py-4">
                        <p className="text-sm font-bold text-slate-900">{item.name}</p>
                        <p className="text-xs text-slate-500 font-mono">{item.sku} • {item.unit}</p>
                      </td>
                      <td className="px-6 py-4">
                        <input 
                          type="number" 
                          value={item.quantity}
                          className="w-full px-2 py-1 bg-slate-50 border-transparent focus:bg-white focus:border-blue-500 rounded-lg text-sm transition-all outline-none"
                        />
                      </td>
                      <td className="px-6 py-4">
                        <input 
                          type="number" 
                          value={item.price}
                          className="w-full px-2 py-1 bg-slate-50 border-transparent focus:bg-white focus:border-blue-500 rounded-lg text-sm transition-all outline-none"
                        />
                      </td>
                      <td className="px-6 py-4 text-sm font-bold text-slate-900">
                        {formatCurrency(item.quantity * item.price)}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button className="p-2 hover:bg-red-50 hover:text-red-600 rounded-lg text-slate-400 transition-all">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            
            <div className="p-6 bg-slate-50/50 border-t border-slate-100">
              <div className="flex flex-col items-end gap-2">
                <div className="flex items-center gap-8 text-sm text-slate-500">
                  <span>Tổng số lượng:</span>
                  <span className="font-bold text-slate-900">{items.reduce((s, i) => s + i.quantity, 0)}</span>
                </div>
                <div className="flex items-center gap-8 text-lg font-bold text-slate-900">
                  <span>Tổng giá trị xuất:</span>
                  <span className="text-amber-600">{formatCurrency(total)}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
            <h2 className="text-lg font-bold text-slate-900 mb-4">Lý do xuất kho</h2>
            <select className="w-full px-4 py-3 bg-slate-50 border-transparent focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 rounded-2xl text-sm transition-all outline-none mb-4">
              <option>Xuất bán hàng</option>
              <option>Xuất chuyển kho</option>
              <option>Xuất trả hàng nhà cung cấp</option>
              <option>Xuất tiêu hủy / Hư hỏng</option>
            </select>
            <textarea 
              rows={4}
              placeholder="Nhập ghi chú chi tiết..."
              className="w-full px-4 py-3 bg-slate-50 border-transparent focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 rounded-2xl text-sm transition-all outline-none resize-none"
            ></textarea>
          </div>
        </div>

        {/* Sidebar: Metadata */}
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-6">
            <div className="flex items-center gap-3 pb-4 border-b border-slate-100">
              <div className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center text-amber-600">
                <FileText className="w-4 h-4" />
              </div>
              <h2 className="text-lg font-bold text-slate-900">Thông tin chung</h2>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Mã phiếu</label>
                <input 
                  type="text" 
                  value="PXK-20260403-001" 
                  disabled
                  className="w-full px-4 py-2.5 bg-slate-100 border-transparent rounded-xl text-sm font-mono transition-all outline-none"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Ngày xuất</label>
                <div className="relative">
                  <Calendar className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input 
                    type="date" 
                    defaultValue="2026-04-03"
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border-transparent focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 rounded-xl text-sm transition-all outline-none"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Kho xuất</label>
                <div className="relative">
                  <Warehouse className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <select className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border-transparent focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 rounded-xl text-sm transition-all outline-none">
                    <option>Kho trung tâm</option>
                    <option>Kho chi nhánh 1</option>
                    <option>Kho chi nhánh 2</option>
                  </select>
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Người lập phiếu</label>
                <div className="relative">
                  <User className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input 
                    type="text" 
                    value="Admin Velocity" 
                    disabled
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-100 border-transparent rounded-xl text-sm transition-all outline-none"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="bg-blue-50 p-6 rounded-3xl border border-blue-100 space-y-3">
            <h3 className="font-bold text-blue-900 flex items-center gap-2">
              <Truck className="w-4 h-4" />
              Thông tin giao hàng
            </h3>
            <p className="text-xs text-blue-700 leading-relaxed">
              Nếu xuất kho để giao hàng, vui lòng đảm bảo mã vận đơn đã được cập nhật chính xác trong hệ thống.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
