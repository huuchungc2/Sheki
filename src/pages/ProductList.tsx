import * as React from "react";
import { 
  Search, 
  Filter, 
  Plus, 
  Download, 
  ChevronLeft, 
  ChevronRight,
  Package,
  Tag,
  AlertCircle,
  MoreVertical,
  Edit2,
  Trash2,
  Eye,
  BarChart2,
  Upload
} from "lucide-react";
import { Link } from "react-router-dom";
import { cn, formatCurrency } from "../lib/utils";
import type { Product } from "../types";

const products: Product[] = [
  { id: "PROD001", name: "Áo thun Cotton Basic", sku: "TS-001", category: "Áo nam", price: 250000, costPrice: 120000, stock: 150, availableStock: 120, reservedStock: 30, status: "in_stock", image: "https://picsum.photos/seed/shirt1/200/200" },
  { id: "PROD002", name: "Quần Jean Slimfit", sku: "JN-002", category: "Quần nam", price: 550000, costPrice: 350000, stock: 8, availableStock: 5, reservedStock: 3, status: "low_stock", image: "https://picsum.photos/seed/jean1/200/200" },
  { id: "PROD003", name: "Giày Sneaker White", sku: "SH-003", category: "Giày dép", price: 1200000, costPrice: 850000, stock: 0, availableStock: 0, reservedStock: 0, status: "out_of_stock", image: "https://picsum.photos/seed/shoe1/200/200" },
  { id: "PROD004", name: "Áo khoác Bomber", sku: "JK-004", category: "Áo nam", price: 850000, costPrice: 550000, stock: 45, availableStock: 40, reservedStock: 5, status: "in_stock", image: "https://picsum.photos/seed/jacket1/200/200" },
  { id: "PROD005", name: "Thắt lưng da bò", sku: "BL-005", category: "Phụ kiện", price: 450000, costPrice: 200000, stock: 22, availableStock: 20, reservedStock: 2, status: "in_stock", image: "https://picsum.photos/seed/belt1/200/200" },
];

export function ProductList() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Danh sách sản phẩm</h1>
          <p className="text-slate-500 text-sm mt-1">Quản lý kho hàng và giá bán của bạn.</p>
        </div>
        <div className="flex items-center gap-3">
          <button className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm font-medium text-slate-700 hover:bg-slate-50 transition-all">
            <Download className="w-4 h-4" />
            Xuất Excel
          </button>
          <Link to="/products/import" className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm font-medium text-slate-700 hover:bg-slate-50 transition-all">
            <Upload className="w-4 h-4" />
            Nhập hàng loạt
          </Link>
          <Link to="/products/new" className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 transition-all shadow-lg shadow-blue-600/20">
            <Plus className="w-4 h-4" />
            Thêm sản phẩm
          </Link>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-200">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Tổng sản phẩm</p>
          <p className="text-xl font-bold text-slate-900 mt-2">1,240</p>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-slate-200">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Đang kinh doanh</p>
          <p className="text-xl font-bold text-emerald-600 mt-2">1,180</p>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-slate-200">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Sắp hết hàng</p>
          <div className="flex items-center justify-between mt-2">
            <p className="text-xl font-bold text-amber-600">12</p>
            <AlertCircle className="w-5 h-5 text-amber-500" />
          </div>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-slate-200">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Hết hàng</p>
          <div className="flex items-center justify-between mt-2">
            <p className="text-xl font-bold text-red-600">5</p>
            <AlertCircle className="w-5 h-5 text-red-500" />
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="relative w-full md:w-96">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input 
            type="text" 
            placeholder="Tìm theo tên, SKU, danh mục..." 
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border-transparent focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 rounded-xl text-sm transition-all outline-none"
          />
        </div>
        <div className="flex items-center gap-2 w-full md:w-auto">
          <button className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2 bg-slate-50 text-slate-600 rounded-xl text-sm font-medium hover:bg-slate-100 transition-all">
            <Filter className="w-4 h-4" />
            Bộ lọc
          </button>
          <select className="flex-1 md:flex-none px-4 py-2 bg-slate-50 text-slate-600 rounded-xl text-sm font-medium outline-none focus:ring-2 focus:ring-blue-500/20">
            <option>Tất cả danh mục</option>
            <option>Áo nam</option>
            <option>Quần nam</option>
            <option>Giày dép</option>
            <option>Phụ kiện</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/50 border-b border-slate-200">
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Sản phẩm</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Danh mục</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Giá bán</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Kho hàng</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Trạng thái</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {products.map((product) => (
                <tr key={product.id} className="hover:bg-slate-50/50 transition-all group">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <img src={product.image} alt={product.name} className="w-12 h-12 rounded-xl object-cover bg-slate-100 border border-slate-200 shadow-sm" />
                      <div>
                        <p className="text-sm font-bold text-slate-900">{product.name}</p>
                        <p className="text-xs text-slate-500 font-mono uppercase">{product.sku}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2 text-sm text-slate-600">
                      <Tag className="w-3 h-3 text-slate-400" />
                      {product.category}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-sm font-bold text-slate-900">{formatCurrency(product.price)}</p>
                    <p className="text-xs text-slate-400 line-through">{formatCurrency(product.price * 1.2)}</p>
                  </td>
                  <td className="px-6 py-4">
                    <div className="space-y-1.5 min-w-[140px]">
                      <div className="flex items-center justify-between gap-4">
                        <div className="flex items-center gap-1.5">
                          <div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div>
                          <span className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">CÓ THỂ BÁN</span>
                        </div>
                        <span className="text-sm font-black text-emerald-600">{product.availableStock}</span>
                      </div>
                      <div className="flex items-center justify-between gap-4">
                        <div className="flex items-center gap-1.5">
                          <div className="w-1.5 h-1.5 rounded-full bg-amber-500"></div>
                          <span className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">TẠM GIỮ</span>
                        </div>
                        <span className="text-sm font-black text-amber-600">{product.reservedStock}</span>
                      </div>
                      <div className="flex items-center justify-between gap-4 pt-1.5 border-t border-slate-100">
                        <div className="flex items-center gap-1.5">
                          <div className="w-1.5 h-1.5 rounded-full bg-slate-900"></div>
                          <span className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">TỔNG TỒN</span>
                        </div>
                        <span className="text-sm font-black text-slate-900">{product.stock}</span>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={cn(
                      "inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider",
                      product.status === "in_stock" ? "bg-emerald-50 text-emerald-600" : 
                      product.status === "low_stock" ? "bg-amber-50 text-amber-600" : 
                      "bg-red-50 text-red-600"
                    )}>
                      {product.status === "in_stock" ? "Còn hàng" : 
                       product.status === "low_stock" ? "Sắp hết" : 
                       "Hết hàng"}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button className="p-2 hover:bg-blue-50 hover:text-blue-600 rounded-lg text-slate-400 transition-all">
                        <BarChart2 className="w-4 h-4" />
                      </button>
                      <Link to={`/products/edit/${product.id}`} className="p-2 hover:bg-amber-50 hover:text-amber-600 rounded-lg text-slate-400 transition-all">
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
