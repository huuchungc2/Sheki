import * as React from "react";
import { 
  Search, Filter, Plus, Download, ChevronLeft, ChevronRight,
  Package, Tag, AlertCircle, MoreVertical, Edit2, Trash2,
  BarChart2, Upload, Loader2
} from "lucide-react";
import { Link, useSearchParams, useLocation } from "react-router-dom";
import { cn, formatCurrency } from "../lib/utils";
import { parseListPage, getVisiblePageNumbers } from "../lib/listUrl";

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
    default: return "bg-muted text-muted-foreground border border-border";
  }
}

function readProductListParams(sp: URLSearchParams) {
  return {
    page: parseListPage(sp),
    search: sp.get("q") ?? "",
    category: sp.get("category") ?? "",
    warehouseId: sp.get("warehouse") ?? "",
  };
}

export function ProductList() {
  const [searchParams, setSearchParams] = useSearchParams();
  const location = useLocation();
  const productsListReturn = `${location.pathname}${location.search}`;

  const { page, search, category, warehouseId } = React.useMemo(
    () => readProductListParams(searchParams),
    [searchParams.toString()]
  );

  const [products, setProducts] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [categories, setCategories] = React.useState<any[]>([]);
  const [warehouses, setWarehouses] = React.useState<any[]>([]);
  const [total, setTotal] = React.useState(0);
  const [searchInput, setSearchInput] = React.useState("");
  const [isComposing, setIsComposing] = React.useState(false);
  const limit = 20;

  // Bulk select
  const [selectedIds, setSelectedIds] = React.useState<Set<number>>(() => new Set());
  const [bulkCategoryId, setBulkCategoryId] = React.useState<string>("");
  const [bulkApplying, setBulkApplying] = React.useState(false);

  const selectedCount = selectedIds.size;

  const patchListParams = React.useCallback(
    (patch: Record<string, string | null | undefined>, opts?: { resetPage?: boolean }) => {
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          for (const [k, v] of Object.entries(patch)) {
            if (v === null || v === undefined || v === "") next.delete(k);
            else next.set(k, v);
          }
          if (opts?.resetPage) next.set("page", "1");
          return next;
        },
        { replace: true }
      );
    },
    [setSearchParams]
  );

  const setPage = React.useCallback(
    (p: number | ((prev: number) => number)) => {
      const current = parseListPage(searchParams);
      const nextPage = typeof p === "function" ? p(current) : p;
      patchListParams({ page: String(Math.max(1, nextPage)) });
    },
    [searchParams, patchListParams]
  );

  React.useEffect(() => {
    setSearchInput(search);
  }, [search]);

  React.useEffect(() => {
    if (isComposing) return;
    const t = window.setTimeout(() => {
      const next = searchInput;
      if (next === search) return;
      const hasMeaningful = next.trim().length > 0;
      patchListParams({ q: hasMeaningful ? next : null }, { resetPage: true });
    }, 350);
    return () => window.clearTimeout(t);
  }, [searchInput, search, patchListParams, isComposing]);

  const fetchProducts = React.useCallback(async () => {
    const { page: p, search: q, category: cat, warehouseId: wh } = readProductListParams(searchParams);
    try {
      setLoading(true);
      const token = localStorage.getItem("token");
      const params = new URLSearchParams();
      if (q) params.set("search", q);
      if (cat) params.set("category", cat);
      if (wh) params.set("warehouse_id", wh);
      params.set("page", String(p));
      params.set("limit", String(limit));
      params.set("active_only", "1");
      const res = await fetch(`${API_URL}/products?${params}`, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (!res.ok) throw new Error("Không thể tải danh sách sản phẩm");
      const json = await res.json();
      const newTotal = json.total || 0;
      setProducts(json.data);
      setTotal(newTotal);
      // drop selections that are not visible anymore (filters/page changed)
      setSelectedIds((prev) => {
        if (!prev.size) return prev;
        const visible = new Set<number>((json.data || []).map((p: any) => Number(p.id)));
        const next = new Set<number>();
        prev.forEach((id) => { if (visible.has(id)) next.add(id); });
        return next;
      });
      const totalPages = Math.ceil(newTotal / limit);
      if (totalPages > 0 && p > totalPages) {
        patchListParams({ page: String(totalPages) });
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [searchParams.toString(), patchListParams]);

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

  const [currentUser, setCurrentUser] = React.useState<any>(() => {
    const u = localStorage.getItem("user");
    return u ? JSON.parse(u) : null;
  });
  React.useEffect(() => {
    const sync = () => {
      const u = localStorage.getItem("user");
      setCurrentUser(u ? JSON.parse(u) : null);
    };
    const onAuthChange = () => sync();
    const onStorage = (e: StorageEvent) => {
      if (e.key === "user") sync();
    };
    window.addEventListener("auth-change", onAuthChange as any);
    window.addEventListener("storage", onStorage);
    return () => {
      window.removeEventListener("auth-change", onAuthChange as any);
      window.removeEventListener("storage", onStorage);
    };
  }, []);
  const canAdmin = currentUser?.can_access_admin === true || currentUser?.role === "admin";

  const pageIds = React.useMemo(() => products.map((p) => Number(p.id)).filter((n) => Number.isFinite(n)), [products]);
  const allPageSelected = React.useMemo(() => pageIds.length > 0 && pageIds.every((id) => selectedIds.has(id)), [pageIds, selectedIds]);

  const toggleSelectAllPage = React.useCallback(() => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (allPageSelected) {
        pageIds.forEach((id) => next.delete(id));
      } else {
        pageIds.forEach((id) => next.add(id));
      }
      return next;
    });
  }, [allPageSelected, pageIds]);

  const toggleRow = React.useCallback((id: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const applyBulkCategory = React.useCallback(async () => {
    if (!canAdmin) return;
    if (selectedIds.size === 0) return;
    const token = localStorage.getItem("token");
    if (!token) return;
    try {
      setBulkApplying(true);
      setError(null);
      const category_id =
        bulkCategoryId === ""
          ? undefined
          : bulkCategoryId === "__none__"
            ? null
            : parseInt(bulkCategoryId, 10);
      if (category_id === undefined) {
        throw new Error("Chọn danh mục để gán (hoặc chọn 'Bỏ danh mục').");
      }
      const res = await fetch(`${API_URL}/products/bulk/category`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ product_ids: Array.from(selectedIds), category_id }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body?.error || "Không cập nhật được danh mục");
      setSelectedIds(new Set());
      setBulkCategoryId("");
      await fetchProducts();
    } catch (e: any) {
      setError(e?.message || "Không cập nhật được danh mục");
    } finally {
      setBulkApplying(false);
    }
  }, [API_URL, bulkCategoryId, canAdmin, fetchProducts, selectedIds]);

  const handleDelete = async (id: string) => {
    if (!canAdmin) {
      return;
    }
    if (!confirm("Vô hiệu hóa sản phẩm này? (Không hiển thị trong danh sách mặc định)")) return;
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API_URL}/products/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error || "Không thể xóa sản phẩm");
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
          <h1 className="text-xl font-semibold tracking-tight">Danh sách sản phẩm</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Quản lý kho hàng và giá bán của bạn.</p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={handleExport} className="flex items-center gap-2 h-10 px-4 bg-background border border-border rounded-md text-sm font-semibold text-foreground hover:bg-accent transition-colors">
            <Download className="w-4 h-4" />
            Xuất Excel
          </button>
          <Link to="/products/import" className="flex items-center gap-2 h-10 px-4 bg-background border border-border rounded-md text-sm font-semibold text-foreground hover:bg-accent transition-colors">
            <Upload className="w-4 h-4" />
            Nhập hàng loạt
          </Link>
          <Link to="/products/new" state={{ productsListReturn }} className="flex items-center gap-2 h-10 px-4 bg-primary text-primary-foreground rounded-md text-sm font-semibold hover:opacity-95 transition-opacity">
            <Plus className="w-4 h-4" />
            Thêm sản phẩm
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="bg-card p-4 rounded-lg border border-border">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Tổng sản phẩm</p>
          <p className="text-xl font-semibold text-foreground mt-2 tabular-nums">{total.toLocaleString()}</p>
        </div>
        <div className="bg-card p-4 rounded-lg border border-border">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Đang kinh doanh</p>
          <p className="text-xl font-semibold text-foreground mt-2 tabular-nums">{inStock}</p>
        </div>
        <div className="bg-card p-4 rounded-lg border border-border">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Sắp hết hàng</p>
          <div className="flex items-center justify-between mt-2">
            <p className="text-xl font-semibold text-foreground tabular-nums">{lowStock}</p>
            <AlertCircle className="w-5 h-5 text-muted-foreground" />
          </div>
        </div>
        <div className="bg-card p-4 rounded-lg border border-border">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Hết hàng</p>
          <div className="flex items-center justify-between mt-2">
            <p className="text-xl font-semibold text-foreground tabular-nums">{outOfStock}</p>
            <AlertCircle className="w-5 h-5 text-muted-foreground" />
          </div>
        </div>
      </div>

      <div className="bg-card p-4 rounded-lg border border-border flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="relative w-full md:w-96">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input 
            type="text" 
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onCompositionStart={() => setIsComposing(true)}
            onCompositionEnd={(e) => {
              setIsComposing(false);
              setSearchInput((e.target as HTMLInputElement).value);
            }}
            placeholder="Tìm theo tên, SKU, danh mục..." 
            className="w-full h-10 pl-9 pr-3 bg-background border border-input rounded-md text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          />
        </div>
        <div className="flex items-center gap-2 w-full md:w-auto">
          <select 
            value={category}
            onChange={(e) => { patchListParams({ category: e.target.value || null }, { resetPage: true }); }}
            className="flex-1 md:flex-none h-10 px-3 bg-background text-foreground border border-input rounded-md text-sm font-medium outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          >
            <option value="">Tất cả danh mục</option>
            {categories.map((cat: any) => (
              <option key={cat.id} value={cat.id}>{cat.name}</option>
            ))}
          </select>
          <select
            value={warehouseId}
            onChange={(e) => { patchListParams({ warehouse: e.target.value || null }, { resetPage: true }); }}
            className="flex-1 md:flex-none h-10 px-3 bg-background text-foreground border border-input rounded-md text-sm font-medium outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          >
            <option value="">Tất cả kho</option>
            {warehouses.filter((w: any) => w.is_active).map((w: any) => (
              <option key={w.id} value={String(w.id)}>{w.name}</option>
            ))}
          </select>
        </div>
      </div>

      {canAdmin && selectedCount > 0 && (
        <div className="bg-card border border-border rounded-lg p-4 flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="text-sm font-semibold text-foreground">
            Đã chọn {selectedCount} sản phẩm (trên trang này).
          </div>
          <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
            <select
              value={bulkCategoryId}
              onChange={(e) => setBulkCategoryId(e.target.value)}
              className="h-10 px-3 bg-background border border-input text-foreground rounded-md text-sm font-medium outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            >
              <option value="">Chọn danh mục…</option>
              <option value="__none__">Bỏ danh mục</option>
              {categories.map((cat: any) => (
                <option key={cat.id} value={String(cat.id)}>
                  {cat.name}
                </option>
              ))}
            </select>
            <button
              type="button"
              disabled={bulkApplying || bulkCategoryId === ""}
              onClick={applyBulkCategory}
              className={cn(
                "h-10 px-4 rounded-md text-sm font-semibold transition-colors inline-flex items-center gap-2",
                bulkApplying || bulkCategoryId === ""
                  ? "bg-muted text-muted-foreground cursor-not-allowed"
                  : "bg-primary text-primary-foreground hover:opacity-95"
              )}
            >
              {bulkApplying ? <Loader2 className="w-4 h-4 animate-spin" /> : <Tag className="w-4 h-4" />}
              Gán danh mục
            </button>
            <button
              type="button"
              onClick={() => setSelectedIds(new Set())}
              className="h-10 px-4 rounded-md text-sm font-semibold text-muted-foreground hover:text-foreground hover:bg-accent border border-transparent hover:border-border transition-colors"
            >
              Bỏ chọn
            </button>
          </div>
        </div>
      )}

      {error && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/10 text-destructive px-4 py-3 text-sm">{error}</div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 text-muted-foreground animate-spin" />
        </div>
      ) : (
        <>
          <div className="bg-card rounded-lg border border-border overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-muted border-b border-border">
                    {canAdmin && (
                      <th className="px-4 py-4 w-10">
                        <input
                          type="checkbox"
                          checked={allPageSelected}
                          onChange={toggleSelectAllPage}
                          className="w-4 h-4 rounded border-input accent-primary"
                          aria-label="Chọn tất cả trên trang"
                        />
                      </th>
                    )}
                    <th className="px-6 py-4 text-xs font-medium text-muted-foreground uppercase tracking-wide">Sản phẩm</th>
                    <th className="px-6 py-4 text-xs font-medium text-muted-foreground uppercase tracking-wide">Danh mục</th>
                    <th className="px-6 py-4 text-xs font-medium text-muted-foreground uppercase tracking-wide">Giá bán</th>
                    <th className="px-6 py-4 text-xs font-medium text-muted-foreground uppercase tracking-wide">Kho hàng</th>
                    <th className="px-6 py-4 text-xs font-medium text-muted-foreground uppercase tracking-wide">Trạng thái</th>
                    <th className="px-6 py-4 text-xs font-medium text-muted-foreground uppercase tracking-wide text-right"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {products.length === 0 ? (
                    <tr><td colSpan={canAdmin ? 7 : 6} className="px-6 py-12 text-center text-muted-foreground">Không có sản phẩm nào</td></tr>
                  ) : products.map((product: any) => {
                    const status = getProductStatus(product);
                    const images = product.images ? (() => { try { return JSON.parse(product.images); } catch { return []; } })() : [];
                    const mainImage = images[0] || null;
                    const pid = Number(product.id);
                    const checked = canAdmin && Number.isFinite(pid) ? selectedIds.has(pid) : false;
                    
                    return (
                    <tr key={product.id} className="hover:bg-accent/30 transition-colors group">
                      {canAdmin && (
                        <td className="px-4 py-4 align-middle">
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => toggleRow(pid)}
                            className="w-4 h-4 rounded border-input accent-primary"
                            aria-label={`Chọn sản phẩm ${product.name}`}
                          />
                        </td>
                      )}
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 rounded-lg bg-muted border border-border shadow-sm overflow-hidden flex items-center justify-center">
                            {mainImage ? (
                              <img src={mainImage.startsWith('/') ? `${API_URL.replace('/api', '')}${mainImage}` : mainImage} alt="" className="w-full h-full object-cover" onError={(e) => { (e.target as HTMLImageElement).parentElement!.innerHTML = '<svg class=\"w-6 h-6 text-muted-foreground/60\" xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\"><rect x=\"3\" y=\"3\" width=\"18\" height=\"18\" rx=\"2\"/><circle cx=\"8.5\" cy=\"8.5\" r=\"1.5\"/><path d=\"m21 15-5-5L5 21\"/></svg>'; }} />
                            ) : (
                              <Package className="w-6 h-6 text-muted-foreground/60" />
                            )}
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-foreground">{product.name}</p>
                            <p className="text-xs text-muted-foreground font-mono uppercase">{product.sku}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Tag className="w-3 h-3 text-muted-foreground" />
                          {product.category_name || "—"}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-sm font-semibold text-foreground tabular-nums">{formatCurrency(product.price)}</p>
                      </td>
                      <td className="px-6 py-4">
                        <div className="space-y-1.5 min-w-[140px]">
                          <div className="flex items-center justify-between gap-4">
                            <div className="flex items-center gap-1.5">
                              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div>
                              <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">CÓ THỂ BÁN</span>
                            </div>
                            <span className="text-sm font-semibold text-foreground tabular-nums">{formatStock(product.available_stock ?? product.stock_qty)}</span>
                          </div>
                          <div className="flex items-center justify-between gap-4 pt-1.5 border-t border-border">
                            <div className="flex items-center gap-1.5">
                              <div className="w-1.5 h-1.5 rounded-full bg-foreground/70"></div>
                              <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">TỔNG TỒN</span>
                            </div>
                            <span className="text-sm font-semibold text-foreground tabular-nums">{formatStock(product.stock_qty)}</span>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={cn(
                          "inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wide",
                          getStatusClass(status)
                        )}>
                          {getStatusLabel(status)}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button className="h-9 w-9 inline-flex items-center justify-center rounded-md border border-border bg-background text-muted-foreground hover:bg-accent hover:text-foreground transition-colors">
                            <BarChart2 className="w-4 h-4" />
                          </button>
                          <Link to={`/products/edit/${product.id}`} state={{ productsListReturn }} className="h-9 w-9 inline-flex items-center justify-center rounded-md border border-border bg-background text-muted-foreground hover:bg-accent hover:text-foreground transition-colors">
                            <Edit2 className="w-4 h-4" />
                          </Link>
                          {canAdmin && (
                            <button
                              type="button"
                              onClick={() => handleDelete(product.id)}
                              className="h-9 w-9 inline-flex items-center justify-center rounded-md border border-border bg-background text-muted-foreground hover:bg-destructive hover:text-destructive-foreground hover:border-destructive transition-colors"
                              title="Vô hiệu hóa sản phẩm"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
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
              <p className="text-xs font-medium text-muted-foreground">
                Hiển thị <span className="text-foreground tabular-nums">{(page - 1) * limit + 1}-{Math.min(page * limit, total)}</span> trong số <span className="text-foreground tabular-nums">{total}</span> sản phẩm
              </p>
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="h-9 w-9 rounded-md border border-border bg-background text-muted-foreground hover:bg-accent hover:text-foreground transition-colors disabled:opacity-30"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                {getVisiblePageNumbers(page, totalPages, 5).map((pn) => (
                  <button
                    key={pn}
                    onClick={() => setPage(pn)}
                    className={cn(
                      "h-9 w-9 rounded-md text-xs font-semibold tabular-nums border transition-colors",
                      page === pn ? "bg-primary text-primary-foreground border-primary" : "bg-background border-border hover:bg-accent text-foreground"
                    )}
                  >
                    {pn}
                  </button>
                ))}
                <button 
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="h-9 w-9 rounded-md border border-border bg-background text-muted-foreground hover:bg-accent hover:text-foreground transition-colors disabled:opacity-30"
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
