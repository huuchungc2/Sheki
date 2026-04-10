import * as React from "react";
import { 
  Search, Filter, Plus, Download, ChevronLeft, ChevronRight,
  Package, Tag, AlertCircle, MoreVertical, Edit2, Trash2,
  BarChart2, Upload, Loader2
} from "lucide-react";
import { Link } from "react-router-dom";
import { cn, formatCurrency } from "../lib/utils";

const API_URL =
  (import.meta as any)?.env?.VITE_API_URL ||
  "/api";

function formatStock(qty: number | string): string {
  const num = parseFloat(String(qty));
  if (isNaN(num)) return "0";
  // If it's a whole number, show without decimals
  if (num === Math.floor(num)) return num.toString();
  // Otherwise show with up to 3 decimals, remove trailing zeros
  return num.toFixed(3).replace(/\.?0+$/, '');
}

function getProductStatus(product: any): string {
  const stock = parseFloat(product.available_stock || product.stock_qty) || 0;
  const threshold = parseFloat(product.low_stock_threshold) || 10;
  if (stock <= 0) return "out_of_stock";
  if (stock <= threshold) return "low_stock";
  return "in_stock";
}

function getStatusLabel(status: string): string {
  switch (status) {
    case "in_stock": return "Còn hàng";
    case "low_stock": return "Sắp hết";
    case "out_of_stock": return "Hết hàng";
    default: return "—";
  }
}

function getStatusClass(status: string): string {
  switch (status) {
    case "in_stock": return "bg-emerald-50 text-emerald-600";
    case "low_stock": return "bg-amber-50 text-amber-600";
    case "out_of_stock": return "bg-red-50 text-red-600";
    default: return "bg-slate-50 text-slate-500";
  }
}

export function ProductList() {
  const [products, setProducts] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [search, setSearch] = React.useState("");
  const [category, setCategory] = React.useState("");
  const [categories, setCategories] = React.useState<any[]>([]);
  const [warehouseId, setWarehouseId] = React.useState("");
  const [warehouses, setWarehouses] = React.useState<any[]>([]);
  const [page, setPage] = React.useState(1);
  const [total, setTotal] = React.useState(0);
  const limit = 20;

  const fetchProducts = React.useCallback(async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("token");
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (category) params.set("category", category);
      if (warehouseId) params.set("warehouse_id", warehouseId);
      params.set("page", String(page));
      params.set("limit", String(limit));
      const res = await fetch(`${API_URL}/products?${params}`, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (!res.ok) throw new Error("Không thể tải danh sách sản phẩm");
      const json = await res.json();
      setProducts(json.data);
      setTotal(json.total || 0);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [search, category, warehouseId, page]);

  React.useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  // Fetch categories
  React.useEffect(() => {
    const fetchCategories = async () => {
      try {
        const token = localStorage.getItem("token");
        const res = await fetch(`${API_URL}/categories`, {
          headers: { "Authorization": `Bearer ${token}` }
        });
        if (res.ok) {
          const json = await res.json();
          setCategories(json.data || []);
        }
      } catch (err) {
        console.error("Failed to fetch categories", err);
      }
    };
    fetchCategories();
  }, []);

  // Fetch warehouses for filter
  React.useEffect(() => {
    const fetchWarehouses = async () => {
      try {
        const token = localStorage.getItem("token");
        const res = await fetch(`${API_URL}/warehouses`, {
          headers: { "Authorization": `Bearer ${token}` }
        });
        if (res.ok) {
          const json = await res.json();
          setWarehouses(json.data || []);
        }
      } catch (err) {
        console.error("Failed to fetch warehouses", err);
      }
    };
    fetchWarehouses();
  }, []);
  const handleExport = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API_URL}/import/export/products`, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (!res.ok) throw new Error("Xuất dữ liệu thất bại");
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "danh_sach_san_pham.xlsx";
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Bạn có chắc muốn xóa sản phẩm này?")) return;
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API_URL}/products/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
        body: JSON.stringify({ is_active: 0 })
      });
      if (!res.ok) throw new Error("Không thể xóa sản phẩm");
      fetchProducts();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const totalPages = Math.ceil(total / limit);

  // Calculate stats
  const inStock = products.filter(p => getProductStatus(p) === "in_stock").length;
  const lowStock = products.filter(p => getProductStatus(p) === "low_stock").length;
  const outOfStock = products.filter(p => getProductStatus(p) === "out_of_stock").length;

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Danh sách sản phẩm</h1>
          <p className="text-slate-500 text-sm mt-1">Quản lý kho hàng và giá bán của bạn.</p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={handleExport} className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm font-medium text-slate-700 hover:bg-slate-50 transition-all">
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

      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-200">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Tổng sản phẩm</p>
          <p className="text-xl font-bold text-slate-900 mt-2">{total.toLocaleString()}</p>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-slate-200">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Đang kinh doanh</p>
          <p className="text-xl font-bold text-emerald-600 mt-2">{inStock}</p>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-slate-200">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Sắp hết hàng</p>
          <div className="flex items-center justify-between mt-2">
            <p className="text-xl font-bold text-amber-600">{lowStock}</p>
            <AlertCircle className="w-5 h-5 text-amber-500" />
          </div>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-slate-200">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Hết hàng</p>
          <div className="flex items-center justify-between mt-2">
            <p className="text-xl font-bold text-red-600">{outOfStock}</p>
            <AlertCircle className="w-5 h-5 text-red-500" />
          </div>
        </div>
      </div>

      <div className="bg-white p-4 rounded-2xl border border-slate-200 flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="relative w-full md:w-96">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input 
            type="text" 
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder="Tìm theo tên, SKU, danh mục..." 
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border-transparent focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 rounded-xl text-sm transition-all outline-none"
          />
        </div>
        <div className="flex items-center gap-2 w-full md:w-auto">
          <select 
            value={category}
            onChange={(e) => { setCategory(e.target.value); setPage(1); }}
            className="flex-1 md:flex-none px-4 py-2 bg-slate-50 text-slate-600 rounded-xl text-sm font-medium outline-none focus:ring-2 focus:ring-blue-500/20"
          >
            <option value="">Tất cả danh mục</option>
            {categories.map((cat: any) => (
              <option key={cat.id} value={cat.id}>{cat.name}</option>
            ))}
          </select>
          <select
            value={warehouseId}
            onChange={(e) => { setWarehouseId(e.target.value); setPage(1); }}
            className="flex-1 md:flex-none px-4 py-2 bg-slate-50 text-slate-600 rounded-xl text-sm font-medium outline-none focus:ring-2 focus:ring-blue-500/20"
          >
            <option value="">Tất cả kho</option>
            {warehouses.filter((w: any) => w.is_active).map((w: any) => (
              <option key={w.id} value={String(w.id)}>{w.name}</option>
            ))}
          </select>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">{error}</div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
        </div>
      ) : (
        <>
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
                  {products.length === 0 ? (
                    <tr><td colSpan={6} className="px-6 py-12 text-center text-slate-400">Không có sản phẩm nào</td></tr>
                  ) : products.map((product: any) => {
                    const status = getProductStatus(product);
                    const images = product.images ? (() => { try { return JSON.parse(product.images); } catch { return []; } })() : [];
                    const mainImage = images[0] || null;
                    
                    return (
                    <tr key={product.id} className="hover:bg-slate-50/50 transition-all group">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 rounded-xl bg-slate-100 border border-slate-200 shadow-sm overflow-hidden flex items-center justify-center">
                            {mainImage ? (
                              <img src={mainImage.startsWith('/') ? `${API_URL.replace('/api', '')}${mainImage}` : mainImage} alt="" className="w-full h-full object-cover" onError={(e) => { (e.target as HTMLImageElement).parentElement!.innerHTML = '<svg class="w-6 h-6 text-slate-300" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="m21 15-5-5L5 21"/></svg>'; }} />
                            ) : (
                              <Package className="w-6 h-6 text-slate-300" />
                            )}
                          </div>
                          <div>
                            <p className="text-sm font-bold text-slate-900">{product.name}</p>
                            <p className="text-xs text-slate-500 font-mono uppercase">{product.sku}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2 text-sm text-slate-600">
                          <Tag className="w-3 h-3 text-slate-400" />
                          {product.category_name || "—"}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-sm font-bold text-slate-900">{formatCurrency(product.price)}</p>
                      </td>
                      <td className="px-6 py-4">
                        <div className="space-y-1.5 min-w-[140px]">
                          <div className="flex items-center justify-between gap-4">
                            <div className="flex items-center gap-1.5">
                              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div>
                              <span className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">CÓ THỂ BÁN</span>
                            </div>
                            <span className="text-sm font-black text-emerald-600">{formatStock(product.available_stock ?? product.stock_qty)}</span>
                          </div>
                          <div className="flex items-center justify-between gap-4 pt-1.5 border-t border-slate-100">
                            <div className="flex items-center gap-1.5">
                              <div className="w-1.5 h-1.5 rounded-full bg-slate-900"></div>
                              <span className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">TỔNG TỒN</span>
                            </div>
                            <span className="text-sm font-black text-slate-900">{formatStock(product.stock_qty)}</span>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={cn(
                          "inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider",
                          getStatusClass(status)
                        )}>
                          {getStatusLabel(status)}
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
                          <button 
                            onClick={() => handleDelete(product.id)}
                            className="p-2 hover:bg-red-50 hover:text-red-600 rounded-lg text-slate-400 transition-all"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )})}
                </tbody>
              </table>
            </div>
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-between gap-4 px-4">
              <p className="text-xs font-medium text-slate-400">Hiển thị <span className="text-slate-900">{(page - 1) * limit + 1}-{Math.min(page * limit, total)}</span> trong số <span className="text-slate-900">{total}</span> sản phẩm</p>
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="p-2 text-slate-300 hover:text-blue-600 transition-colors disabled:opacity-30"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  const p = i + 1;
                  return (
                    <button 
                      key={p}
                      onClick={() => setPage(p)}
                      className={cn(
                        "w-8 h-8 rounded-lg text-xs font-bold transition-colors",
                        page === p ? "bg-blue-600 text-white shadow-lg shadow-blue-600/20" : "hover:bg-slate-100 text-slate-600"
                      )}
                    >
                      {p}
                    </button>
                  );
                })}
                <button 
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="p-2 text-slate-300 hover:text-blue-600 transition-colors disabled:opacity-30"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
