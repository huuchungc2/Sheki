import * as React from "react";
import { 
  Plus, 
  Search, 
  Warehouse, 
  User, 
  Trash2, 
  Save, 
  ArrowLeft,
  Package,
  ChevronRight,
  FileText,
  Truck,
  Loader2,
  AlertCircle,
  CheckCircle2
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { cn, formatCurrency, localTodayIsoDate } from "../lib/utils";
import { GregorianDateSelect } from "../components/GregorianDateSelect";

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

export function InventoryExport() {
  const navigate = useNavigate();
  const [warehouses, setWarehouses] = React.useState<WarehouseData[]>([]);
  const [loadingData, setLoadingData] = React.useState(true);
  const [dataError, setDataError] = React.useState<string | null>(null);
  const [submitting, setSubmitting] = React.useState(false);
  const [success, setSuccess] = React.useState(false);

  const [warehouseId, setWarehouseId] = React.useState("");
  const [toWarehouseId, setToWarehouseId] = React.useState("");
  const [date, setDate] = React.useState(localTodayIsoDate());
  const [reason, setReason] = React.useState("export_sale");
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
          ...(warehouseId ? { warehouse_id: warehouseId } : {}),
          ...(warehouseId ? { available_only: "1" } : {}),
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
          }))
        );
      } catch {
        // ignore
      }
    }, 250);
    return () => window.clearTimeout(t);
  }, [productQuery, warehouseId]);

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
      const defaultPrice = Number(product.price ?? 0) || 0;
      return [
        ...prev.filter((i) => i.product_id || prev.length > 1),
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
    if (reason === 'export_transfer' && (!toWarehouseId || String(toWarehouseId) === String(warehouseId))) {
      alert("Vui lòng chọn kho nhận khác kho xuất");
      return;
    }
    const validItems = items.filter(i => i.product_id && i.quantity > 0);
    if (validItems.length === 0) {
      alert("Vui lòng chọn ít nhất 1 sản phẩm và nhập số lượng");
      return;
    }
    setSubmitting(true);
    try {
      const body = {
        warehouse_id: parseInt(warehouseId),
        destination_warehouse_id: reason === 'export_transfer' ? (toWarehouseId ? parseInt(toWarehouseId) : null) : null,
        items: validItems.map((i) => ({ product_id: parseInt(i.product_id), qty: i.quantity, price: i.price })),
        reason: reason,
        status,
      };
      const res = await fetch(`${API_URL}/inventory/export`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to create export receipt");
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
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  if (dataError) {
    return (
      <div className="max-w-6xl mx-auto space-y-8">
        <div className="flex flex-col items-center justify-center py-20 text-destructive">
          <AlertCircle className="w-10 h-10 mb-3" />
          <p className="text-sm font-medium">{dataError}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-8 min-w-0">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => navigate(-1)}
            className="p-2 hover:bg-accent rounded-lg text-muted-foreground transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">Tạo phiếu xuất kho</h1>
            <p className="text-muted-foreground text-sm mt-1">Xuất hàng hóa ra khỏi kho hệ thống.</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={() => handleSubmit("draft")}
            disabled={submitting}
            className="h-10 px-4 bg-background border border-border rounded-md text-sm font-semibold text-foreground hover:bg-accent transition-colors disabled:opacity-50"
          >
            Lưu nháp
          </button>
          <button 
            onClick={() => handleSubmit("completed")}
            disabled={submitting}
            className="flex items-center gap-2 h-10 px-6 bg-primary text-primary-foreground rounded-md text-sm font-semibold hover:opacity-95 transition-opacity shadow-sm disabled:opacity-50"
          >
            {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Hoàn tất xuất kho
          </button>
        </div>
      </div>

      {success && (
        <div className="flex items-center gap-3 p-4 bg-accent border border-border rounded-xl text-accent-foreground">
          <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
          <p className="text-sm font-medium">Xuất kho thành công! Đang chuyển hướng...</p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Form: Items List */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
            <div className="p-6 border-b border-border flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-muted text-primary flex items-center justify-center">
                  <Package className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-sm font-semibold text-foreground uppercase tracking-wide">Danh sách sản phẩm</h2>
                  <p className="text-[11px] text-muted-foreground">Tìm kiếm và thêm sản phẩm vào phiếu</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="relative w-[320px]" ref={productBoxRef}>
                  <Search className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <input
                    value={productQuery}
                    onChange={(e) => {
                      setProductQuery(e.target.value);
                      setShowProductSuggestions(e.target.value.trim().length > 0);
                    }}
                    onFocus={() => productQuery.trim().length > 0 && setShowProductSuggestions(true)}
                    placeholder="Tìm sản phẩm, SKU..."
                    className="w-full h-11 pr-9 pl-4 bg-background border border-input rounded-md text-sm font-medium text-foreground outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                  />

                  {showProductSuggestions && (
                    <div className="absolute left-0 right-0 top-full mt-2 bg-popover text-popover-foreground border border-border rounded-xl shadow-xl overflow-hidden z-50">
                      <div className="max-h-64 overflow-y-auto">
                        {productSuggestions.length > 0 ? (
                          productSuggestions.map((p) => (
                            <button
                              key={p.id}
                              type="button"
                              onClick={() => addProduct(p)}
                              className="w-full px-4 py-3 flex items-center justify-between hover:bg-accent transition-colors text-left border-b border-border last:border-0"
                            >
                              <div className="min-w-0">
                                <p className="text-sm font-semibold text-foreground truncate">{p.name}</p>
                                <p className="text-[11px] text-muted-foreground font-mono uppercase tracking-wide">{p.sku} • {p.unit}</p>
                              </div>
                              <div className="text-right flex-shrink-0">
                                <p className="text-sm font-semibold text-foreground">
                                  {formatCurrency(Number(p.price ?? 0) || 0)}
                                </p>
                                <p className="text-[10px] text-muted-foreground">Thêm</p>
                              </div>
                            </button>
                          ))
                        ) : (
                          <div className="px-4 py-8 text-center text-muted-foreground text-sm">
                            Không tìm thấy sản phẩm
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
                <button
                  onClick={addItem}
                  className="flex items-center gap-2 h-11 px-3 bg-background border border-border hover:bg-accent text-foreground rounded-md text-sm font-semibold transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  Thêm dòng
                </button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-muted/30 border-b border-border">
                    <th className="px-6 py-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Sản phẩm</th>
                    <th className="px-6 py-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider w-24">SL</th>
                    <th className="px-6 py-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Đơn giá</th>
                    <th className="px-6 py-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Thành tiền</th>
                    <th className="px-6 py-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider text-right"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {items.filter(i => i.product_id).length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-14 text-center text-muted-foreground">
                        <div className="flex flex-col items-center gap-2">
                          <div className="w-12 h-12 rounded-2xl bg-muted/20 border border-border flex items-center justify-center text-muted-foreground/60">
                            <Package className="w-6 h-6" />
                          </div>
                          <p className="text-sm font-medium">Chưa có sản phẩm.</p>
                          <p className="text-xs">Tìm và thêm bên trên.</p>
                        </div>
                      </td>
                    </tr>
                  ) : null}
                  {items.map((item) => (
                    <tr key={item.id} className="hover:bg-muted/20 transition-colors group">
                      <td className="px-6 py-4">
                        {item.product_id ? (
                          <>
                            <p className="text-sm font-semibold text-foreground">{item.name}</p>
                            <p className="text-xs text-muted-foreground font-mono mt-1">{item.sku} • {item.unit}</p>
                          </>
                        ) : (
                          <p className="text-sm text-muted-foreground">Chưa chọn sản phẩm (dùng ô tìm kiếm phía trên)</p>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <input 
                          type="number" 
                          value={item.quantity}
                          onChange={(e) => updateItem(item.id, "quantity", Number(e.target.value))}
                          min={0}
                          step="0.001"
                          className="w-full h-9 px-2 py-1 bg-background border border-input rounded-md text-sm font-medium text-foreground outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                        />
                      </td>
                      <td className="px-6 py-4">
                        <input 
                          type="number" 
                          value={item.price}
                          onChange={(e) => updateItem(item.id, "price", Number(e.target.value))}
                          min={0}
                          className="w-full h-9 px-2 py-1 bg-background border border-input rounded-md text-sm font-medium text-foreground outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                        />
                      </td>
                      <td className="px-6 py-4 text-sm font-semibold text-foreground">
                        {formatCurrency(item.quantity * item.price)}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button 
                          onClick={() => removeItem(item.id)}
                          className="p-2 hover:bg-destructive hover:text-destructive-foreground rounded-lg text-muted-foreground transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            
            <div className="p-6 bg-muted/20 border-t border-border">
              <div className="flex flex-col items-end gap-2">
                <div className="flex items-center gap-8 text-sm text-muted-foreground">
                  <span>Tổng số lượng:</span>
                  <span className="font-semibold text-foreground">{items.reduce((s, i) => s + i.quantity, 0)}</span>
                </div>
                <div className="flex items-center gap-8 text-lg font-semibold text-foreground">
                  <span>Tổng giá trị xuất:</span>
                  <span className="text-primary">{formatCurrency(total)}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-card p-6 rounded-2xl border border-border shadow-sm">
            <h2 className="text-lg font-semibold text-foreground mb-4">Lý do xuất kho</h2>
            <select 
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full h-11 px-4 bg-background border border-input rounded-md text-sm font-semibold text-foreground outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background mb-4"
            >
              <option value="export_sale">Xuất bán hàng</option>
              <option value="export_transfer">Xuất chuyển kho</option>
              <option value="export_adjustment">Xuất điều chỉnh</option>
              <option value="export_return">Xuất trả hàng nhà cung cấp</option>
              <option value="export_destroy">Xuất tiêu hủy / Hư hỏng</option>
            </select>
            {reason === 'export_transfer' && (
              <div className="mb-4">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Kho nhận (xuất đi đâu)</label>
                <select
                  value={toWarehouseId}
                  onChange={(e) => setToWarehouseId(e.target.value)}
                  className="mt-2 w-full h-11 px-4 bg-background border border-input rounded-md text-sm font-semibold text-foreground outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                >
                  <option value="">— Chọn kho nhận —</option>
                  {warehouses.filter(w => String(w.id) !== String(warehouseId)).map((wh) => (
                    <option key={wh.id} value={wh.id}>{wh.name}</option>
                  ))}
                </select>
                <p className="mt-2 text-[11px] text-muted-foreground">
                  Khi “Hoàn tất”, hệ thống sẽ trừ kho xuất và cộng kho nhận.
                </p>
              </div>
            )}
            <textarea 
              rows={4}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Nhập ghi chú chi tiết..."
              className="w-full px-4 py-3 bg-background border border-input rounded-md text-sm font-medium text-foreground outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background resize-none"
            ></textarea>
          </div>
        </div>

        {/* Sidebar: Metadata */}
        <div className="space-y-6">
          <div className="bg-card p-6 rounded-2xl border border-border shadow-sm space-y-6">
            <div className="flex items-center gap-3 pb-4 border-b border-border">
              <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center text-primary">
                <FileText className="w-4 h-4" />
              </div>
              <h2 className="text-lg font-semibold text-foreground">Thông tin chung</h2>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Mã phiếu</label>
                <input 
                  type="text" 
                  value="PXK-AUTO" 
                  disabled
                  className="w-full h-10 px-4 bg-muted border border-border rounded-md text-sm font-mono text-muted-foreground outline-none"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Ngày xuất</label>
                <GregorianDateSelect value={date} onChange={setDate} />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Kho xuất</label>
                <div className="relative">
                  <Warehouse className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <select 
                    value={warehouseId}
                    onChange={(e) => setWarehouseId(e.target.value)}
                    className="w-full h-10 pl-10 pr-4 bg-background border border-input rounded-md text-sm font-semibold text-foreground outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                  >
                    {warehouses.map((wh) => (
                      <option key={wh.id} value={wh.id}>{wh.name}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Người lập phiếu</label>
                <div className="relative">
                  <User className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <input 
                    type="text" 
                    value="Admin Sheki" 
                    disabled
                    className="w-full h-10 pl-10 pr-4 bg-muted border border-border rounded-md text-sm text-muted-foreground outline-none"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="bg-muted/20 p-6 rounded-2xl border border-border space-y-3">
            <h3 className="font-semibold text-foreground flex items-center gap-2">
              <Truck className="w-4 h-4" />
              Thông tin giao hàng
            </h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Nếu xuất kho để giao hàng, vui lòng đảm bảo mã vận đơn đã được cập nhật chính xác trong hệ thống.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
