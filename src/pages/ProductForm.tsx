import * as React from "react";
import { 
  ArrowLeft, Save, Package, Image as ImageIcon, Plus, Trash2,
  Tag, DollarSign, Box, Truck, Info, Loader2, X, AlertCircle, CheckCircle2
} from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import { cn } from "../lib/utils";

const API_URL = "http://localhost:3000/api";

export function ProductForm() {
  const navigate = useNavigate();
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
  const [isLoading, setIsLoading] = React.useState(false);
  const [fetchLoading, setFetchLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [success, setSuccess] = React.useState(false);
  const [errors, setErrors] = React.useState<{ name?: string; sku?: string; price?: string }>({});

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
            stock_qty: p.stock_qty || 0,
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

  const handleChange = (field: string, value: string | number) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error khi user bắt đầu sửa field
    if (errors[field as keyof typeof errors]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  const validateForm = (): boolean => {
    const newErrors: { name?: string; sku?: string; price?: string } = {};

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

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const getImageUrl = (img: string) => {
    if (img.startsWith('http')) return img;
    if (img.startsWith('/api')) return `${API_URL.replace('/api', '')}${img}`;
    if (img.startsWith('/uploads')) return `${API_URL.replace('/api', '')}${img}`;
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
          const txt = await res.text();
          throw new Error(txt || "Upload thất bại");
        }
        const data = await res.json();
        if (data?.url) setImages(prev => [...prev, data.url]);
      } catch (err) {
        console.error("Upload failed", err);
        setError("Tải ảnh lên thất bại. Vui lòng thử lại hoặc kiểm tra định dạng/kích thước ảnh.");
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
      setTimeout(() => navigate("/products"), 1000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  if (fetchLoading) {
    return (
      <div className="max-w-5xl mx-auto flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate(-1)} className="p-2 hover:bg-slate-100 rounded-xl text-slate-500 transition-all">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">
              {isEdit ? `Chỉnh sửa sản phẩm: ${formData.name || id}` : "Thêm sản phẩm mới"}
            </h1>
            <p className="text-slate-500 text-sm mt-1">
              {isEdit ? "Cập nhật thông tin chi tiết của sản phẩm." : "Tạo sản phẩm mới để bắt đầu kinh doanh."}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button type="button" onClick={() => navigate(-1)} className="px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm font-medium text-slate-700 hover:bg-slate-50 transition-all">Hủy bỏ</button>
          <button type="button" onClick={handleSubmit} disabled={isLoading} className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 transition-all shadow-lg shadow-blue-600/20 disabled:opacity-50">
            {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
            <Save className="w-4 h-4" />
            {isLoading ? "Đang lưu..." : "Lưu sản phẩm"}
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
            {/* Image Section */}
            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
              <h3 className="font-bold text-slate-900 mb-4 flex items-center gap-2">
                <ImageIcon className="w-4 h-4 text-blue-600" />
                Hình ảnh sản phẩm
              </h3>
              
              {/* Hidden file input */}
              <input
                type="file"
                id="product-images"
                accept="image/*"
                multiple
                onChange={handleImageUpload}
                className="hidden"
              />
              
              {/* Image previews */}
              {images.length > 0 && (
                <div className="grid grid-cols-2 gap-3 mb-4">
                  {images.map((img, i) => (
                    <div key={i} className="relative aspect-square rounded-xl overflow-hidden bg-slate-50 border border-slate-200 group">
                      <img src={getImageUrl(img)} alt="" className="w-full h-full object-cover" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                      <button type="button" onClick={() => removeImage(i)} className="absolute top-1 right-1 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600 opacity-0 group-hover:opacity-100 transition-opacity">
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
              
              {/* Upload button */}
              <label
                htmlFor="product-images"
                className="flex flex-col items-center justify-center aspect-square rounded-2xl bg-slate-50 border-2 border-dashed border-slate-200 hover:bg-slate-100 hover:border-blue-400 cursor-pointer transition-all group mb-3"
              >
                <div className="w-12 h-12 rounded-xl bg-white shadow-sm flex items-center justify-center mb-3 group-hover:scale-110 transition-all">
                  <Plus className="w-6 h-6 text-slate-400 group-hover:text-blue-600" />
                </div>
                <p className="text-sm font-medium text-slate-600">Tải ảnh lên</p>
                <p className="text-xs text-slate-400 mt-1">Nhấn để chọn từ máy tính</p>
              </label>
              
              {/* Or paste URL */}
              <div className="flex gap-2 mt-3">
                <input
                  type="url"
                  value={newImageUrl}
                  onChange={(e) => setNewImageUrl(e.target.value)}
                  placeholder="Hoặc dán URL hình ảnh..."
                  className="flex-1 px-3 py-2 bg-slate-50 border-transparent focus:bg-white focus:border-blue-500 rounded-xl text-sm outline-none"
                  onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addImage())}
                />
                <button type="button" onClick={addImage} className="px-3 py-2 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700">
                  Thêm
                </button>
              </div>
            </div>

            {/* Shipping */}
            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
              <h3 className="font-bold text-slate-900 mb-4 flex items-center gap-2">
                <Truck className="w-4 h-4 text-blue-600" />
                Vận chuyển & Kho
              </h3>
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700">Cảnh báo hết hàng</label>
                  <input type="number" placeholder="10" className="w-full px-4 py-2 bg-slate-50 border-transparent focus:bg-white focus:border-blue-500 rounded-xl text-sm outline-none" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700">Khối lượng (kg)</label>
                  <input
                    type="number"
                    step="0.001"
                    min="0"
                    value={formData.weight ?? ""}
                    onChange={(e) => handleChange("weight", Number(e.target.value))}
                    placeholder="0"
                    className="w-full px-4 py-2 bg-slate-50 border-transparent focus:bg-white focus:border-blue-500 rounded-xl text-sm outline-none"
                  />
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Dài (cm)</label>
                    <input type="number" placeholder="0" className="w-full px-2 py-2 bg-slate-50 border-transparent focus:bg-white focus:border-blue-500 rounded-lg text-sm outline-none" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Rộng (cm)</label>
                    <input type="number" placeholder="0" className="w-full px-2 py-2 bg-slate-50 border-transparent focus:bg-white focus:border-blue-500 rounded-lg text-sm outline-none" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Cao (cm)</label>
                    <input type="number" placeholder="0" className="w-full px-2 py-2 bg-slate-50 border-transparent focus:bg-white focus:border-blue-500 rounded-lg text-sm outline-none" />
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600"><Package className="w-4 h-4" /></div>
                <h2 className="text-lg font-bold text-slate-900">Thông tin chung</h2>
              </div>
              
              <div className="space-y-6">
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700">Tên sản phẩm <span className="text-red-500">*</span></label>
                  <input type="text" value={formData.name} onChange={(e) => handleChange("name", e.target.value)} placeholder="VD: Áo thun Cotton Basic" className={cn("w-full px-4 py-2.5 bg-slate-50 border focus:bg-white focus:ring-4 rounded-xl text-sm transition-all outline-none", errors.name ? "border-red-300 focus:border-red-500 focus:ring-red-500/10 bg-red-50" : "border-transparent focus:border-blue-500 focus:ring-blue-500/10")} />
                  {errors.name && <p className="text-xs text-red-500 font-medium">{errors.name}</p>}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-slate-700">Mã SKU <span className="text-red-500">*</span></label>
                    <input type="text" value={formData.sku} onChange={(e) => handleChange("sku", e.target.value)} placeholder="VD: TS-001" className={cn("w-full px-4 py-2.5 bg-slate-50 border focus:bg-white focus:ring-4 rounded-xl text-sm font-mono transition-all outline-none", errors.sku ? "border-red-300 focus:border-red-500 focus:ring-red-500/10 bg-red-50" : "border-transparent focus:border-blue-500 focus:ring-blue-500/10")} />
                    {errors.sku && <p className="text-xs text-red-500 font-medium">{errors.sku}</p>}
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-slate-700">Danh mục</label>
                    <select value={formData.category_id} onChange={(e) => handleChange("category_id", e.target.value)} className="w-full px-4 py-2.5 bg-slate-50 border-transparent focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 rounded-xl text-sm transition-all outline-none">
                      <option value="">Chọn danh mục</option>
                      {categories.map((cat: any) => (
                        <option key={cat.id} value={cat.id}>{cat.name}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700">Mô tả sản phẩm</label>
                  <textarea rows={4} value={formData.description} onChange={(e) => handleChange("description", e.target.value)} placeholder="Nhập mô tả chi tiết về sản phẩm..." className="w-full px-4 py-3 bg-slate-50 border-transparent focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 rounded-2xl text-sm transition-all outline-none resize-none"></textarea>
                </div>
              </div>
            </div>

            <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-600"><DollarSign className="w-4 h-4" /></div>
                <h2 className="text-lg font-bold text-slate-900">Giá bán & Tồn kho</h2>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700">Giá bán lẻ <span className="text-red-500">*</span></label>
                  <div className="relative">
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 text-xs font-bold">VNĐ</span>
                    <input type="number" value={formData.price || ""} onChange={(e) => handleChange("price", Number(e.target.value))} placeholder="0" className={cn("w-full px-4 py-2.5 bg-slate-50 border focus:bg-white focus:ring-4 rounded-xl text-sm transition-all outline-none", errors.price ? "border-red-300 focus:border-red-500 focus:ring-red-500/10 bg-red-50" : "border-transparent focus:border-blue-500 focus:ring-blue-500/10")} />
                  </div>
                  {errors.price && <p className="text-xs text-red-500 font-medium">{errors.price}</p>}
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700">Giá vốn</label>
                  <div className="relative">
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 text-xs font-bold">VNĐ</span>
                    <input type="number" value={formData.cost_price || ""} onChange={(e) => handleChange("cost_price", Number(e.target.value))} placeholder="0" className="w-full px-4 py-2.5 bg-slate-50 border-transparent focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 rounded-xl text-sm transition-all outline-none" />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700">Tổng tồn kho</label>
                  <input type="number" step="0.001" min="0" value={formData.stock_qty || ""} onChange={(e) => handleChange("stock_qty", Number(e.target.value))} placeholder="0" className="w-full px-4 py-2.5 bg-slate-50 border-transparent focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 rounded-xl text-sm transition-all outline-none" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700">Đơn vị tính</label>
                  <input type="text" value={formData.unit} onChange={(e) => handleChange("unit", e.target.value)} placeholder="VD: Cái, Hộp, Kg" className="w-full px-4 py-2.5 bg-slate-50 border-transparent focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 rounded-xl text-sm transition-all outline-none" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
