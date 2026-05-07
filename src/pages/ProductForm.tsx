import * as React from "react";
import { 
  ArrowLeft, Save, Package, Image as ImageIcon, Plus, Trash2,
  Tag, DollarSign, Box, Truck, Info, Loader2, X, AlertCircle, CheckCircle2
} from "lucide-react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import { cn } from "../lib/utils";

const API_URL =
  (import.meta as any)?.env?.VITE_API_URL ||
  "/api";

export function ProductForm() {
  const navigate = useNavigate();
  const location = useLocation();
  const { id } = useParams();
  const isEdit = Boolean(id);

  const [formData, setFormData] = React.useState({
    name: "",
    sku: "",
    category_id: "",
    unit: "Cái",
    price: 0,
    cost_price: 0,
    stock_qty: 0,
    weight: 0,
    description: "",
  });
  const [images, setImages] = React.useState<string[]>([]);
  const [newImageUrl, setNewImageUrl] = React.useState("");
  const [categories, setCategories] = React.useState<any[]>([]);
  const [warehouses, setWarehouses] = React.useState<any[]>([]);
  const [warehouseId, setWarehouseId] = React.useState<string>("");
  const [isLoading, setIsLoading] = React.useState(false);
  const [fetchLoading, setFetchLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [success, setSuccess] = React.useState(false);
  const [errors, setErrors] = React.useState<{ name?: string; sku?: string; price?: string; warehouse_id?: string }>({});

  // Prefill SKU on create (server-authoritative sequence)
  React.useEffect(() => {
    if (isEdit) return;
    if (formData.sku.trim()) return;
    const token = localStorage.getItem("token");
    if (!token) return;

    fetch(`${API_URL}/products/next-sku`, {
      headers: { "Authorization": `Bearer ${token}` }
    })
      .then(r => r.json())
      .then(j => {
        const sku = j?.data?.sku;
        if (typeof sku === "string" && sku.trim()) {
          setFormData(prev => prev.sku.trim() ? prev : ({ ...prev, sku }));
        }
      })
      .catch(() => {});
  }, [isEdit, formData.sku]);

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

  React.useEffect(() => {
    const fetchWarehouses = async () => {
      try {
        const token = localStorage.getItem("token");
        const res = await fetch(`${API_URL}/warehouses`, {
          headers: { "Authorization": `Bearer ${token}` },
        });
        if (!res.ok) return;
        const json = await res.json();
        const list = (json.data || []).filter((w: any) => w.is_active);
        setWarehouses(list);
        // Preselect default warehouse if none chosen yet
        setWarehouseId((prev) => {
          if (prev) return prev;
          const def = list.find((w: any) => w.is_default) || list[0];
          return def ? String(def.id) : "";
        });
      } catch (err) {
        console.error("Failed to fetch warehouses", err);
      }
    };
    fetchWarehouses();
  }, []);

  React.useEffect(() => {
    if (isEdit && id) {
      const fetchProduct = async () => {
        try {
          setFetchLoading(true);
          const token = localStorage.getItem("token");
          const res = await fetch(`${API_URL}/products/${id}`, {
            headers: { "Authorization": `Bearer ${token}` }
          });
          if (!res.ok) throw new Error("Không thể tải thông tin sản phẩm");
          const json = await res.json();
          const p = json.data;
          setFormData({
            name: p.name || "",
            sku: p.sku || "",
            category_id: p.category_id || "",
            unit: p.unit || "Cái",
            price: p.price || 0,
            cost_price: p.cost_price || 0,
            stock_qty: 0,
            weight: p.weight || 0,
            description: p.description || "",
          });
          if (p.images) {
            try {
              const parsed = typeof p.images === 'string' ? JSON.parse(p.images) : p.images;
              setImages(Array.isArray(parsed) ? parsed : []);
            } catch {
              setImages([]);
            }
          }
        } catch (err: any) {
          setError(err.message);
        } finally {
          setFetchLoading(false);
        }
      };
      fetchProduct();
    } else {
      setFetchLoading(false);
    }
  }, [id, isEdit]);

  // When editing, load per-warehouse stock into stock_qty based on selected warehouse
  React.useEffect(() => {
    if (!isEdit || !id) return;
    if (!warehouseId) return;
    const token = localStorage.getItem("token");
    if (!token) return;

    const run = async () => {
      try {
        const params = new URLSearchParams();
        params.set("warehouse_id", warehouseId);
        params.set("product_id", String(id));
        const res = await fetch(`${API_URL}/inventory/stock-by-warehouse?${params.toString()}`, {
          headers: { "Authorization": `Bearer ${token}` },
        });
        if (!res.ok) return;
        const json = await res.json();
        const row = (json?.data || [])?.[0];
        const stockQty = row?.stock_qty ?? 0;
        setFormData((prev) => ({ ...prev, stock_qty: Number(stockQty) || 0 }));
      } catch {
        // ignore
      }
    };
    run();
  }, [isEdit, id, warehouseId]);

  const handleChange = (field: string, value: string | number) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error khi user bắt đầu sửa field
    if (errors[field as keyof typeof errors]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  const validateForm = (): boolean => {
    const newErrors: { name?: string; sku?: string; price?: string; warehouse_id?: string } = {};

    if (!formData.name.trim()) {
      newErrors.name = "Vui lòng nhập tên sản phẩm";
    }
    // SKU: allow auto-generate on create
    if (isEdit && !formData.sku.trim()) {
      newErrors.sku = "Vui lòng nhập mã SKU";
    }
    if (!formData.price || formData.price <= 0) {
      newErrors.price = "Giá bán phải lớn hơn 0";
    }
    if (!warehouseId) {
      newErrors.warehouse_id = "Vui lòng chọn kho";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const getImageUrl = (img: string) => {
    if (img.startsWith('http')) return img;
    const origin =
      typeof window !== 'undefined' && window.location?.origin
        ? window.location.origin
        : '';
    // Dev: VITE_API_URL=/api → ảnh /uploads cùng origin (Vite proxy /uploads → BE)
    const apiBase =
      API_URL.startsWith('http')
        ? API_URL.replace(/\/api\/?$/, '')
        : origin;
    if (img.startsWith('/api')) return `${apiBase}${img}`;
    if (img.startsWith('/uploads')) return `${apiBase}${img}`;
    return img;
  };

  const addImage = () => {
    if (newImageUrl.trim()) {
      setImages([...images, newImageUrl.trim()]);
      setNewImageUrl("");
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setError(null);

    for (const file of Array.from(files)) {
      const formData = new FormData();
      formData.append('image', file as unknown as Blob);

      try {
        const token = localStorage.getItem("token");
        const res = await fetch(`${API_URL}/uploads`, {
          method: "POST",
          headers: { "Authorization": `Bearer ${token}` },
          body: formData
        });
        if (!res.ok) {
          let msg = "Upload thất bại";
          const ct = res.headers.get("content-type") || "";
          try {
            if (ct.includes("application/json")) {
              const j = await res.json();
              msg = j.error || j.message || msg;
            } else {
              const txt = await res.text();
              msg = (txt && txt.slice(0, 240)) || msg;
            }
          } catch {
            msg = `Lỗi ${res.status}`;
          }
          throw new Error(msg);
        }
        const data = await res.json();
        if (data?.url) setImages(prev => [...prev, data.url]);
      } catch (err: any) {
        console.error("Upload failed", err);
        setError(err?.message || "Tải ảnh lên thất bại. Thử ảnh nhỏ hơn hoặc định dạng JPG/PNG.");
      }
    }
    // Reset input
    e.target.value = "";
  };

  const removeImage = async (index: number) => {
    const imgUrl = images[index];
    // If it's a local upload, delete from server
    if (imgUrl.startsWith('/uploads/')) {
      try {
        const token = localStorage.getItem("token");
        const filename = imgUrl.split('/').pop();
        await fetch(`${API_URL}/uploads/${filename}`, {
          method: "DELETE",
          headers: { "Authorization": `Bearer ${token}` }
        });
      } catch (err) {
        console.error("Delete failed", err);
      }
    }
    setImages(images.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;
    setIsLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem("token");
      const method = isEdit ? "PUT" : "POST";
      const url = isEdit ? `${API_URL}/products/${id}` : `${API_URL}/products`;
      const finalSku = formData.sku.trim();
      const body = {
        ...formData,
        // Backend sẽ tự sinh SKU nếu create và sku rỗng
        sku: finalSku || undefined,
        category_id: formData.category_id ? parseInt(formData.category_id) : null,
        images: images.length > 0 ? images : null,
        warehouse_id: warehouseId ? parseInt(warehouseId) : undefined,
      };
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
        body: JSON.stringify(body)
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Thao tác thất bại");
      }
      // If backend auto-generated SKU, reflect it immediately
      try {
        const okJson = await res.json();
        if (!isEdit && okJson?.sku && !formData.sku.trim()) {
          setFormData(prev => ({ ...prev, sku: okJson.sku }));
        }
      } catch {}
      setSuccess(true);
      const back =
        (location.state as { productsListReturn?: string } | null)?.productsListReturn || "/products";
      setTimeout(() => navigate(back), 1000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  if (fetchLoading) {
    return (
      <div className="max-w-5xl mx-auto flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 text-muted-foreground animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate(-1)}
            className="h-9 w-9 rounded-md border border-border bg-background text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
            aria-label="Quay lại"
          >
            <ArrowLeft className="w-4 h-4 mx-auto" />
          </button>
          <div>
            <h1 className="text-xl font-semibold tracking-tight">
              {isEdit ? `Chỉnh sửa sản phẩm: ${formData.name || id}` : "Thêm sản phẩm mới"}
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              {isEdit ? "Cập nhật thông tin chi tiết của sản phẩm." : "Tạo sản phẩm mới để bắt đầu kinh doanh."}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="h-10 px-4 rounded-md bg-background border border-border text-sm font-semibold text-foreground hover:bg-accent transition-colors"
          >
            Hủy bỏ
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isLoading}
            className="h-10 px-4 rounded-md bg-primary text-primary-foreground text-sm font-semibold hover:opacity-95 transition-opacity disabled:opacity-50 inline-flex items-center gap-2"
          >
            {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
            <Save className="w-4 h-4" />
            {isLoading ? "Đang lưu..." : "Lưu sản phẩm"}
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/10 text-destructive px-4 py-3 text-sm flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" /> {error}
        </div>
      )}
      {success && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/50 dark:bg-emerald-950/30 dark:text-emerald-300 px-4 py-3 text-sm flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" /> Đã lưu thành công!
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="space-y-6">
            {/* Image Section */}
            <div className="bg-card p-6 rounded-xl border border-border shadow-sm">
              <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">
                <ImageIcon className="w-4 h-4 text-primary" />
                Hình ảnh sản phẩm
              </h3>
              
              {/* Image previews */}
              {images.length > 0 && (
                <div className="grid grid-cols-2 gap-3 mb-4">
                  {images.map((img, i) => (
                    <div key={i} className="relative aspect-square rounded-lg overflow-hidden bg-muted/30 border border-border group">
                      <img src={getImageUrl(img)} alt="" className="w-full h-full object-cover" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                      <button type="button" onClick={() => removeImage(i)} className="absolute top-1 right-1 w-7 h-7 bg-destructive text-destructive-foreground rounded-full flex items-center justify-center hover:opacity-95 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity" aria-label="Xóa ảnh">
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
              
              {/* Upload: input phủ vùng (opacity 0) — iOS/Android hay không mở picker khi input display:none + label htmlFor */}
              <label className="relative flex flex-col items-center justify-center aspect-square rounded-xl bg-muted/30 border-2 border-dashed border-border hover:bg-accent/40 hover:border-primary/30 cursor-pointer transition-all group mb-3 overflow-hidden">
                <span className="pointer-events-none flex flex-col items-center">
                  <span className="w-12 h-12 rounded-lg bg-background border border-border shadow-sm flex items-center justify-center mb-3 group-hover:scale-110 transition-all">
                    <Plus className="w-6 h-6 text-muted-foreground group-hover:text-primary" />
                  </span>
                  <span className="text-sm font-medium text-foreground">Tải ảnh lên</span>
                  <span className="text-xs text-muted-foreground mt-1 text-center px-2">Chọn thư viện hoặc chụp ảnh (điện thoại)</span>
                </span>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleImageUpload}
                  className="absolute inset-0 z-10 h-full w-full cursor-pointer opacity-0"
                  aria-label="Chọn hoặc chụp ảnh sản phẩm"
                />
              </label>
              
              {/* Or paste URL */}
              <div className="flex gap-2 mt-3">
                <input
                  type="url"
                  value={newImageUrl}
                  onChange={(e) => setNewImageUrl(e.target.value)}
                  placeholder="Hoặc dán URL hình ảnh..."
                  className="flex-1 h-10 px-3 bg-background border border-input rounded-md text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                  onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addImage())}
                />
                <button type="button" onClick={addImage} className="h-10 px-3 bg-primary text-primary-foreground rounded-md text-sm font-semibold hover:opacity-95">
                  Thêm
                </button>
              </div>
            </div>

            {/* Shipping */}
            <div className="bg-card p-6 rounded-xl border border-border shadow-sm">
              <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">
                <Truck className="w-4 h-4 text-primary" />
                Vận chuyển & Kho
              </h3>
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-xs font-medium text-muted-foreground">Kho <span className="text-destructive ml-0.5">*</span></label>
                  <select
                    value={warehouseId}
                    onChange={(e) => {
                      setWarehouseId(e.target.value);
                      if (errors.warehouse_id) setErrors((prev) => ({ ...prev, warehouse_id: undefined }));
                    }}
                    className={cn(
                      "h-10 w-full px-3 bg-background border rounded-md text-sm outline-none",
                      "focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
                      errors.warehouse_id ? "border-destructive/50" : "border-input"
                    )}
                  >
                    <option value="">Chọn kho</option>
                    {warehouses.map((w: any) => (
                      <option key={w.id} value={String(w.id)}>
                        {w.name}{w.is_default ? " (mặc định)" : ""}
                      </option>
                    ))}
                  </select>
                  {errors.warehouse_id && <p className="text-xs text-destructive font-medium">{errors.warehouse_id}</p>}
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-medium text-muted-foreground">Cảnh báo hết hàng</label>
                  <input type="number" placeholder="10" className="h-10 w-full px-3 bg-background border border-input rounded-md text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background" />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-medium text-muted-foreground">Khối lượng (kg)</label>
                  <input
                    type="number"
                    step="0.001"
                    min="0"
                    value={formData.weight ?? ""}
                    onChange={(e) => handleChange("weight", Number(e.target.value))}
                    placeholder="0"
                    className="h-10 w-full px-3 bg-background border border-input rounded-md text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background tabular-nums"
                  />
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <div className="space-y-2">
                    <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">Dài (cm)</label>
                    <input type="number" placeholder="0" className="h-10 w-full px-2 bg-background border border-input rounded-md text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background tabular-nums" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">Rộng (cm)</label>
                    <input type="number" placeholder="0" className="h-10 w-full px-2 bg-background border border-input rounded-md text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background tabular-nums" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">Cao (cm)</label>
                    <input type="number" placeholder="0" className="h-10 w-full px-2 bg-background border border-input rounded-md text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background tabular-nums" />
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="lg:col-span-2 space-y-6">
            <div className="bg-card p-8 rounded-xl border border-border shadow-sm">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center text-primary"><Package className="w-4 h-4" /></div>
                <h2 className="text-lg font-semibold text-foreground">Thông tin chung</h2>
              </div>
              
              <div className="space-y-6">
                <div className="space-y-2">
                  <label className="text-xs font-medium text-muted-foreground">Tên sản phẩm <span className="text-destructive ml-0.5">*</span></label>
                  <input type="text" value={formData.name} onChange={(e) => handleChange("name", e.target.value)} placeholder="VD: Áo thun Cotton Basic" className={cn("w-full h-10 px-3 bg-background border rounded-md text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background", errors.name ? "border-destructive/50" : "border-input")} />
                  {errors.name && <p className="text-xs text-destructive font-medium">{errors.name}</p>}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-xs font-medium text-muted-foreground">Mã SKU <span className="text-destructive ml-0.5">*</span></label>
                    <input type="text" value={formData.sku} onChange={(e) => handleChange("sku", e.target.value)} placeholder="VD: TS-001" className={cn("w-full h-10 px-3 bg-background border rounded-md text-sm font-mono outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background", errors.sku ? "border-destructive/50" : "border-input")} />
                    {errors.sku && <p className="text-xs text-destructive font-medium">{errors.sku}</p>}
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-medium text-muted-foreground">Danh mục</label>
                    <select value={formData.category_id} onChange={(e) => handleChange("category_id", e.target.value)} className="h-10 w-full px-3 bg-background border border-input rounded-md text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background">
                      <option value="">Chọn danh mục</option>
                      {categories.map((cat: any) => (
                        <option key={cat.id} value={cat.id}>{cat.name}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-medium text-muted-foreground">Mô tả sản phẩm</label>
                  <textarea rows={4} value={formData.description} onChange={(e) => handleChange("description", e.target.value)} placeholder="Nhập mô tả chi tiết về sản phẩm..." className="w-full px-3 py-3 bg-background border border-input rounded-md text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background resize-none"></textarea>
                </div>
              </div>
            </div>

            <div className="bg-card p-8 rounded-xl border border-border shadow-sm">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center text-primary"><DollarSign className="w-4 h-4" /></div>
                <h2 className="text-lg font-semibold text-foreground">Giá bán &amp; Tồn kho</h2>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-xs font-medium text-muted-foreground">Giá bán lẻ <span className="text-destructive ml-0.5">*</span></label>
                  <div className="relative">
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-xs font-semibold">VNĐ</span>
                    <input type="number" value={formData.price || ""} onChange={(e) => handleChange("price", Number(e.target.value))} placeholder="0" className={cn("w-full h-10 px-3 pr-12 bg-background border rounded-md text-sm outline-none tabular-nums focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background", errors.price ? "border-destructive/50" : "border-input")} />
                  </div>
                  {errors.price && <p className="text-xs text-destructive font-medium">{errors.price}</p>}
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-medium text-muted-foreground">Giá vốn</label>
                  <div className="relative">
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-xs font-semibold">VNĐ</span>
                    <input type="number" value={formData.cost_price || ""} onChange={(e) => handleChange("cost_price", Number(e.target.value))} placeholder="0" className="w-full h-10 px-3 pr-12 bg-background border border-input rounded-md text-sm outline-none tabular-nums focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background" />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-medium text-muted-foreground">Tồn kho theo kho đã chọn</label>
                  <input type="number" step="0.001" min="0" value={formData.stock_qty || ""} onChange={(e) => handleChange("stock_qty", Number(e.target.value))} placeholder="0" className="w-full h-10 px-3 bg-background border border-input rounded-md text-sm outline-none tabular-nums focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background" />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-medium text-muted-foreground">Đơn vị tính</label>
                  <input type="text" value={formData.unit} onChange={(e) => handleChange("unit", e.target.value)} placeholder="VD: Cái, Hộp, Kg" className="w-full h-10 px-3 bg-background border border-input rounded-md text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
