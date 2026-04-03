import * as React from "react";
import { 
  ArrowLeft, 
  Search, 
  Plus, 
  Trash2, 
  Save, 
  User, 
  Phone, 
  CreditCard, 
  Truck, 
  Package,
  ShoppingCart,
  ChevronRight,
  MapPin,
  Tag,
  Minus,
  DollarSign,
  Warehouse
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { cn, formatCurrency } from "../lib/utils";

export function OrderForm() {
  const navigate = useNavigate();
  const [items, setItems] = React.useState([
    { id: 1, name: "Áo thun Cotton Basic", sku: "TS-001", quantity: 2, price: 250000 },
    { id: 2, name: "Quần Jean Slimfit", sku: "JN-002", quantity: 1, price: 550000 },
  ]);

  const subtotal = items.reduce((sum, item) => sum + item.quantity * item.price, 0);
  const shipping = 30000;
  const discount = 50000;
  const total = subtotal + shipping - discount;

  return (
    <div className="max-w-7xl mx-auto space-y-8">
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
            <h1 className="text-2xl font-bold text-slate-900">Tạo đơn hàng mới</h1>
            <p className="text-slate-500 text-sm mt-1">Tạo đơn hàng nhanh chóng cho khách hàng.</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button className="px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm font-medium text-slate-700 hover:bg-slate-50 transition-all">
            Lưu nháp
          </button>
          <button className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 transition-all shadow-lg shadow-blue-600/20">
            <Save className="w-4 h-4" />
            Hoàn tất đơn hàng
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Content: Product Selection */}
        <div className="lg:col-span-2 space-y-6">
          {/* Product Search */}
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
            <div className="relative">
              <Search className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
              <input 
                type="text" 
                placeholder="Tìm sản phẩm theo tên, SKU hoặc quét mã vạch..." 
                className="w-full pl-12 pr-4 py-3 bg-slate-50 border-transparent focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 rounded-2xl text-sm transition-all outline-none"
              />
            </div>
          </div>

          {/* Cart Items */}
          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <ShoppingCart className="w-5 h-5 text-blue-600" />
                Giỏ hàng ({items.length})
              </h2>
            </div>
            
            <div className="divide-y divide-slate-100">
              {items.map((item) => (
                <div key={item.id} className="p-6 flex items-center gap-4 hover:bg-slate-50/50 transition-all group">
                  <div className="w-16 h-16 rounded-xl bg-slate-100 flex items-center justify-center text-slate-400">
                    <Package className="w-8 h-8" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-bold text-slate-900">{item.name}</p>
                    <p className="text-xs text-slate-500 font-mono">{item.sku}</p>
                    <p className="text-sm font-bold text-blue-600 mt-1">{formatCurrency(item.price)}</p>
                  </div>
                  <div className="flex items-center gap-3 bg-slate-100 p-1 rounded-xl">
                    <button className="w-8 h-8 rounded-lg bg-white shadow-sm flex items-center justify-center text-slate-600 hover:text-blue-600 transition-all">
                      <Minus className="w-4 h-4" />
                    </button>
                    <span className="w-8 text-center font-bold text-slate-900">{item.quantity}</span>
                    <button className="w-8 h-8 rounded-lg bg-white shadow-sm flex items-center justify-center text-slate-600 hover:text-blue-600 transition-all">
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="text-right w-32">
                    <p className="text-sm font-bold text-slate-900">{formatCurrency(item.quantity * item.price)}</p>
                  </div>
                  <button className="p-2 hover:bg-red-50 hover:text-red-600 rounded-lg text-slate-400 transition-all">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>

            {items.length === 0 && (
              <div className="p-12 text-center">
                <div className="w-16 h-16 rounded-full bg-slate-50 flex items-center justify-center mx-auto mb-4">
                  <ShoppingCart className="w-8 h-8 text-slate-300" />
                </div>
                <p className="text-slate-500 font-medium">Giỏ hàng đang trống</p>
              </div>
            )}
          </div>

          {/* Payment & Shipping Method */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
              <h3 className="font-bold text-slate-900 mb-4 flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-blue-600" />
                Thanh toán
              </h3>
              <div className="grid grid-cols-2 gap-3">
                <button className="p-3 rounded-2xl border-2 border-blue-600 bg-blue-50 text-blue-600 font-bold text-xs flex flex-col items-center gap-2">
                  <DollarSign className="w-5 h-5" />
                  Tiền mặt
                </button>
                <button className="p-3 rounded-2xl border-2 border-transparent bg-slate-50 text-slate-600 font-bold text-xs flex flex-col items-center gap-2 hover:border-slate-200 transition-all">
                  <CreditCard className="w-5 h-5" />
                  Chuyển khoản
                </button>
              </div>
            </div>
            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
              <h3 className="font-bold text-slate-900 mb-4 flex items-center gap-2">
                <Truck className="w-4 h-4 text-blue-600" />
                Vận chuyển
              </h3>
              <div className="grid grid-cols-2 gap-3">
                <button className="p-3 rounded-2xl border-2 border-blue-600 bg-blue-50 text-blue-600 font-bold text-xs flex flex-col items-center gap-2">
                  <Warehouse className="w-5 h-5" />
                  Tại quầy
                </button>
                <button className="p-3 rounded-2xl border-2 border-transparent bg-slate-50 text-slate-600 font-bold text-xs flex flex-col items-center gap-2 hover:border-slate-200 transition-all">
                  <Truck className="w-5 h-5" />
                  Giao hàng
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Sidebar: Customer & Summary */}
        <div className="space-y-6">
          {/* Customer Info */}
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-6">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <User className="w-5 h-5 text-blue-600" />
                Khách hàng
              </h2>
              <button className="text-blue-600 text-xs font-bold hover:underline">Thay đổi</button>
            </div>

            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600 font-bold">
                  NA
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-900">Nguyễn Văn An</p>
                  <p className="text-xs text-slate-500">0901 234 567</p>
                </div>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl space-y-2">
                <div className="flex items-center gap-2 text-xs text-slate-600">
                  <MapPin className="w-3 h-3" />
                  123 Đường ABC, Quận 1, TP. HCM
                </div>
                <div className="flex items-center gap-2 text-xs text-slate-600">
                  <Tag className="w-3 h-3" />
                  Hạng: <span className="font-bold text-indigo-600">Diamond</span>
                </div>
              </div>
            </div>
          </div>

          {/* Order Summary */}
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
            <h2 className="text-lg font-bold text-slate-900 mb-4">Tổng kết đơn hàng</h2>
            <div className="space-y-3">
              <div className="flex items-center justify-between text-sm text-slate-500">
                <span>Tạm tính</span>
                <span className="font-medium text-slate-900">{formatCurrency(subtotal)}</span>
              </div>
              <div className="flex items-center justify-between text-sm text-slate-500">
                <span>Phí vận chuyển</span>
                <span className="font-medium text-slate-900">{formatCurrency(shipping)}</span>
              </div>
              <div className="flex items-center justify-between text-sm text-slate-500">
                <span>Giảm giá</span>
                <span className="font-medium text-red-600">-{formatCurrency(discount)}</span>
              </div>
              <div className="h-px bg-slate-100 my-2"></div>
              <div className="flex items-center justify-between text-xl font-bold text-slate-900">
                <span>Tổng cộng</span>
                <span className="text-blue-600">{formatCurrency(total)}</span>
              </div>
            </div>
            
            <div className="pt-4 space-y-3">
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Mã giảm giá</label>
                <div className="flex gap-2">
                  <input 
                    type="text" 
                    placeholder="Nhập mã..." 
                    className="flex-1 px-4 py-2 bg-slate-50 border-transparent focus:bg-white focus:border-blue-500 rounded-xl text-sm outline-none"
                  />
                  <button className="px-4 py-2 bg-slate-900 text-white rounded-xl text-sm font-bold hover:bg-slate-800 transition-all">Áp dụng</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
