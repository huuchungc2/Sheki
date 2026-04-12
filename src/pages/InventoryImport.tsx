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
  Loader2,
  AlertCircle,
  CheckCircle2
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { cn, formatCurrency } from "../lib/utils";

const API_URL =
  (import.meta as any)?.env?.VITE_API_URL ||
  "/api";

function getAuthHeaders(): HeadersInit {
  const token = localStorage.getItem("token");
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

interface WarehouseData {
  id: string;
  name: string;
}

interface ProductData {
  id: string;
  name: string;
  sku: string;
  unit: string;
  price?: number;
  cost_price?: number;
}

interface FormItem {
  id: number;
  product_id: string;
  name: string;
  sku: string;
  unit: string;
  quantity: number;
  price: number;
}

export function InventoryImport() {
  const navigate = useNavigate();
  const [warehouses, setWarehouses] = React.useState<WarehouseData[]>([]);
  const [loadingData, setLoadingData] = React.useState(true);
  const [dataError, setDataError] = React.useState<string | null>(null);
  const [submitting, setSubmitting] = React.useState(false);
  const [success, setSuccess] = React.useState(false);

  const [warehouseId, setWarehouseId] = React.useState("");
  const [date, setDate] = React.useState(new Date().toISOString().split("T")[0]);
  const [note, setNote] = React.useState("");
  const [items, setItems] = React.useState<FormItem[]>([
    { id: 1, product_id: "", name: "", sku: "", unit: "", quantity: 1, price: 0 },
  ]);

  // Product search (giống OrderForm)
  const [productQuery, setProductQuery] = React.useState("");
  const [productSuggestions, setProductSuggestions] = React.useState<ProductData[]>([]);
  const [showProductSuggestions, setShowProductSuggestions] = React.useState(false);
  const productBoxRef = React.useRef<HTMLDivElement | null>(null);

  React.useEffect(() => {
    if (!showProductSuggestions) return;
    const onDown = (e: MouseEvent) => {
      const el = productBoxRef.current;
      if (!el) return;
      if (e.target instanceof Node && !el.contains(e.target)) setShowProductSuggestions(false);
    };
    window.addEventListener('mousedown', onDown);
    return () => window.removeEventListener('mousedown', onDown);
  }, [showProductSuggestions]);

  React.useEffect(() => {
    async function fetchData() {
      setLoadingData(true);
      setDataError(null);
      try {
        const [whRes] = await Promise.all([
          fetch(`${API_URL}/warehouses`, { headers: getAuthHeaders() }),
        ]);
        if (!whRes.ok) throw new Error("Failed to load data");
        const whJson = await whRes.json();
        setWarehouses(whJson.data || []);
        if (whJson.data?.length > 0) setWarehouseId(whJson.data[0].id);
      } catch (e: any) {
        setDataError(e.message);
      } finally {
        setLoadingData(false);
      }
    }
    fetchData();
  }, []);

  React.useEffect(() => {
    if (!productQuery.trim()) {
      setProductSuggestions([]);
      return;
    }
    const t = window.setTimeout(async () => {
      try {
        const params = new URLSearchParams({
          search: productQuery.trim(),
          limit: "20",
          page: "1",
          active_only: "1",
        });
        const res = await fetch(`${API_URL}/products?${params.toString()}`, { headers: getAuthHeaders() });
        if (!res.ok) return;
        const json = await res.json();
        const data = Array.isArray(json?.data) ? json.data : [];
        setProductSuggestions(
          data.map((p: any) => ({
            id: String(p.id),
            name: String(p.name ?? ""),
            sku: String(p.sku ?? ""),
            unit: String(p.unit ?? ""),
            price: p.price !== undefined ? Number(p.price) : undefined,
            cost_price: p.cost_price !== undefined ? Number(p.cost_price) : undefined,
          }))
        );
      } catch {
        // ignore
      }
    }, 250);
    return () => window.clearTimeout(t);
  }, [productQuery]);

  const total = items.reduce((sum, item) => sum + item.quantity * item.price, 0);

  const addItem = () => {
    setItems((prev) => [
      ...prev,
      { id: Date.now(), product_id: "", name: "", sku: "", unit: "", quantity: 1, price: 0 },
    ]);
  };

  const addProduct = (product: ProductData) => {
    setItems((prev) => {
      const existing = prev.find((i) => String(i.product_id) === String(product.id));
      if (existing) {
        return prev.map((i) =>
          String(i.product_id) === String(product.id)
            ? { ...i, quantity: Number((i.quantity + 1).toFixed(3)) }
            : i
        );
      }
      const cost = Number(product.cost_price ?? 0) || 0;
      const sell = Number(product.price ?? 0) || 0;
      const defaultPrice = cost > 0 ? cost : sell;
      return [
        ...prev.filter((i) => i.product_id || prev.length > 1), // tránh giữ row trống đầu tiên
        {
          id: Date.now(),
          product_id: product.id,
          name: product.name,
          sku: product.sku,
          unit: product.unit,
          quantity: 1,
          price: defaultPrice,
        },
      ];
    });
    setProductQuery("");
    setProductSuggestions([]);
    setShowProductSuggestions(false);
  };

  const removeItem = (id: number) => {
    setItems((prev) => prev.filter((i) => i.id !== id));
  };

  const updateItem = (id: number, field: keyof FormItem, value: string | number) => {
    setItems((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item;
        const updated = { ...item, [field]: value };
        return updated;
      })
    );
  };

  const handleSubmit = async (status: "draft" | "completed") => {
    if (!warehouseId) return;
    const validItems = items.filter(i => i.product_id && i.quantity > 0);
    if (validItems.length === 0) {
      alert("Vui lòng chọn ít nhất 1 sản phẩm và nhập số lượng");
      return;
    }
    setSubmitting(true);
    try {
      const body = {
        warehouse_id: parseInt(warehouseId),
        items: validItems.map((i) => ({ product_id: parseInt(i.product_id), qty: i.quantity, price: i.price })),
        reason: note,
        status,
      };
      const res = await fetch(`${API_URL}/inventory/import`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to create import receipt");
      }
      setSuccess(true);
      setTimeout(() => navigate("/inventory"), 1500);
    } catch (e: any) {
      alert(e.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loadingData) {
    return (
      <div className="max-w-6xl mx-auto space-y-8">
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        </div>
      </div>
    );
  }

  if (dataError) {
    return (
      <div className="max-w-6xl mx-auto space-y-8">
        <div className="flex flex-col items-center justify-center py-20 text-red-500">
          <AlertCircle className="w-10 h-10 mb-3" />
          <p className="text-sm font-medium">{dataError}</p>
        </div>
      </div>
    );
  }

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
            <h1 className="text-2xl font-bold text-slate-900">Tạo phiếu nhập kho</h1>
            <p className="text-slate-500 text-sm mt-1">Nhập hàng mới vào kho hệ thống.</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={() => handleSubmit("draft")}
            disabled={submitting}
            className="px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm font-medium text-slate-700 hover:bg-slate-50 transition-all disabled:opacity-50"
          >
            Lưu nháp
          </button>
          <button 
            onClick={() => handleSubmit("completed")}
            disabled={submitting}
            className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 transition-all shadow-lg shadow-blue-600/20 disabled:opacity-50"
          >
            {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Hoàn tất nhập kho
          </button>
        </div>
      </div>

      {success && (
        <div className="flex items-center gap-3 p-4 bg-emerald-50 border border-emerald-200 rounded-2xl text-emerald-700">
          <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
          <p className="text-sm font-medium">Nhập kho thành công! Đang chuyển hướng...</p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Form: Items List */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                  <Package className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-sm font-black text-slate-900 uppercase tracking-wide">Danh sách sản phẩm</h2>
                  <p className="text-[11px] text-slate-400">Tìm kiếm và thêm sản phẩm vào phiếu</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="relative w-[320px]" ref={productBoxRef}>
                  <Search className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-slate-300" />
                  <input
                    value={productQuery}
                    onChange={(e) => {
                      setProductQuery(e.target.value);
                      setShowProductSuggestions(e.target.value.trim().length > 0);
                    }}
                    onFocus={() => productQuery.trim().length > 0 && setShowProductSuggestions(true)}
                    placeholder="Tìm sản phẩm, SKU..."
                    className="w-full pr-9 pl-4 py-2.5 bg-slate-50 border border-transparent focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 rounded-2xl text-sm outline-none transition-all"
                  />

                  {showProductSuggestions && (
                    <div className="absolute left-0 right-0 top-full mt-2 bg-white border border-slate-200 rounded-2xl shadow-xl overflow-hidden z-50">
                      <div className="max-h-64 overflow-y-auto">
                        {productSuggestions.length > 0 ? (
                          productSuggestions.map((p) => (
                            <button
                              key={p.id}
                              type="button"
                              onClick={() => addProduct(p)}
                              className="w-full px-4 py-3 flex items-center justify-between hover:bg-slate-50 transition-colors text-left border-b border-slate-100 last:border-0"
                            >
                              <div className="min-w-0">
                                <p className="text-sm font-semibold text-slate-900 truncate">{p.name}</p>
                                <p className="text-[11px] text-slate-400 font-mono uppercase tracking-wide">{p.sku} • {p.unit}</p>
                              </div>
                              <div className="text-right flex-shrink-0">
                                <p className="text-sm font-bold text-slate-900">
                                  {formatCurrency((Number(p.cost_price ?? 0) || 0) > 0 ? (Number(p.cost_price) || 0) : (Number(p.price) || 0))}
                                </p>
                                <p className="text-[10px] text-slate-400">Thêm</p>
                              </div>
                            </button>
                          ))
                        ) : (
                          <div className="px-4 py-8 text-center text-slate-400 text-sm">
                            Không tìm thấy sản phẩm
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
                <button
                  onClick={addItem}
                  className="flex items-center gap-2 px-3 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-2xl text-sm font-semibold transition-all"
                >
                  <Plus className="w-4 h-4" />
                  Thêm dòng
                </button>
              </div>
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
                  {items.filter(i => i.product_id).length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-14 text-center text-slate-400">
                        <div className="flex flex-col items-center gap-2">
                          <div className="w-12 h-12 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-300">
                            <Package className="w-6 h-6" />
                          </div>
                          <p className="text-sm font-medium">Chưa có sản phẩm.</p>
                          <p className="text-xs">Tìm và thêm bên trên.</p>
                        </div>
                      </td>
                    </tr>
                  ) : null}
                  {items.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50/30 transition-all group">
                      <td className="px-6 py-4">
                        {item.product_id ? (
                          <>
                            <p className="text-sm font-bold text-slate-900">{item.name}</p>
                            <p className="text-xs text-slate-500 font-mono mt-1">{item.sku} • {item.unit}</p>
                          </>
                        ) : (
                          <p className="text-sm text-slate-400">Chưa chọn sản phẩm (dùng ô tìm kiếm phía trên)</p>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <input 
                          type="number" 
                          value={item.quantity}
                          onChange={(e) => updateItem(item.id, "quantity", Number(e.target.value))}
                          min={0}
                          step="0.001"
                          className="w-full px-2 py-1 bg-slate-50 border-transparent focus:bg-white focus:border-blue-500 rounded-lg text-sm transition-all outline-none"
                        />
                      </td>
                      <td className="px-6 py-4">
                        <input 
                          type="number" 
                          value={item.price}
                          onChange={(e) => updateItem(item.id, "price", Number(e.target.value))}
                          min={0}
                          className="w-full px-2 py-1 bg-slate-50 border-transparent focus:bg-white focus:border-blue-500 rounded-lg text-sm transition-all outline-none"
                        />
                      </td>
                      <td className="px-6 py-4 text-sm font-bold text-slate-900">
                        {formatCurrency(item.quantity * item.price)}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button 
                          onClick={() => removeItem(item.id)}
                          className="p-2 hover:bg-red-50 hover:text-red-600 rounded-lg text-slate-400 transition-all"
                        >
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
                  <span>Tổng tiền nhập:</span>
                  <span className="text-blue-600">{formatCurrency(total)}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
            <h2 className="text-lg font-bold text-slate-900 mb-4">Ghi chú nhập kho</h2>
            <textarea 
              rows={4}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Nhập ghi chú hoặc lý do nhập kho (nếu có)..."
              className="w-full px-4 py-3 bg-slate-50 border-transparent focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 rounded-2xl text-sm transition-all outline-none resize-none"
            ></textarea>
          </div>
        </div>

        {/* Sidebar: Metadata */}
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-6">
            <div className="flex items-center gap-3 pb-4 border-b border-slate-100">
              <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600">
                <FileText className="w-4 h-4" />
              </div>
              <h2 className="text-lg font-bold text-slate-900">Thông tin chung</h2>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Mã phiếu</label>
                <input 
                  type="text" 
                  value="PNK-AUTO" 
                  disabled
                  className="w-full px-4 py-2.5 bg-slate-100 border-transparent rounded-xl text-sm font-mono transition-all outline-none"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Ngày nhập</label>
                <div className="relative">
                  <Calendar className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input 
                    type="date" 
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border-transparent focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 rounded-xl text-sm transition-all outline-none"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Kho nhập</label>
                <div className="relative">
                  <Warehouse className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <select 
                    value={warehouseId}
                    onChange={(e) => setWarehouseId(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border-transparent focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 rounded-xl text-sm transition-all outline-none"
                  >
                    {warehouses.map((wh) => (
                      <option key={wh.id} value={wh.id}>{wh.name}</option>
                    ))}
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

          <div className="bg-amber-50 p-6 rounded-3xl border border-amber-100 space-y-3">
            <h3 className="font-bold text-amber-900 flex items-center gap-2">
              <Package className="w-4 h-4" />
              Lưu ý quan trọng
            </h3>
            <p className="text-xs text-amber-700 leading-relaxed">
              Sau khi nhấn "Hoàn tất nhập kho", số lượng tồn kho của các sản phẩm trên sẽ được cộng trực tiếp vào kho đã chọn. Hành động này không thể hoàn tác.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
