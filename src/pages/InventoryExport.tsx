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
  Truck,
  Loader2,
  AlertCircle,
  CheckCircle2
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { cn, formatCurrency } from "../lib/utils";

const API_BASE = "http://localhost:3000/api";

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
  const [products, setProducts] = React.useState<ProductData[]>([]);
  const [loadingData, setLoadingData] = React.useState(true);
  const [dataError, setDataError] = React.useState<string | null>(null);
  const [submitting, setSubmitting] = React.useState(false);
  const [success, setSuccess] = React.useState(false);

  const [warehouseId, setWarehouseId] = React.useState("");
  const [date, setDate] = React.useState(new Date().toISOString().split("T")[0]);
  const [reason, setReason] = React.useState("export_sale");
  const [note, setNote] = React.useState("");
  const [items, setItems] = React.useState<FormItem[]>([
    { id: 1, product_id: "", name: "", sku: "", unit: "", quantity: 1, price: 0 },
  ]);

  React.useEffect(() => {
    async function fetchData() {
      setLoadingData(true);
      setDataError(null);
      try {
        const [whRes, prodRes] = await Promise.all([
          fetch(`${API_BASE}/warehouses`, { headers: getAuthHeaders() }),
          fetch(`${API_BASE}/products`, { headers: getAuthHeaders() }),
        ]);
        if (!whRes.ok || !prodRes.ok) throw new Error("Failed to load data");
        const whJson = await whRes.json();
        const prodJson = await prodRes.json();
        setWarehouses(whJson.data || []);
        setProducts(prodJson.data || []);
        if (whJson.data?.length > 0) setWarehouseId(whJson.data[0].id);
      } catch (e: any) {
        setDataError(e.message);
      } finally {
        setLoadingData(false);
      }
    }
    fetchData();
  }, []);

  const total = items.reduce((sum, item) => sum + item.quantity * item.price, 0);

  const addItem = () => {
    setItems((prev) => [
      ...prev,
      { id: Date.now(), product_id: "", name: "", sku: "", unit: "", quantity: 1, price: 0 },
    ]);
  };

  const removeItem = (id: number) => {
    setItems((prev) => prev.filter((i) => i.id !== id));
  };

  const updateItem = (id: number, field: keyof FormItem, value: string | number) => {
    setItems((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item;
        const updated = { ...item, [field]: value };
        if (field === "product_id") {
          const product = products.find((p) => p.id === value);
          if (product) {
            updated.name = product.name;
            updated.sku = product.sku;
            updated.unit = product.unit;
          }
        }
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
        reason: reason,
        status,
      };
      const res = await fetch(`${API_BASE}/inventory/export`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to create export receipt");
      }
      setSuccess(true);
      setTimeout(() => navigate("/inventory/history"), 1500);
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
          <Loader2 className="w-8 h-8 animate-spin text-amber-600" />
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
            <h1 className="text-2xl font-bold text-slate-900">Tạo phiếu xuất kho</h1>
            <p className="text-slate-500 text-sm mt-1">Xuất hàng hóa ra khỏi kho hệ thống.</p>
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
            className="flex items-center gap-2 px-6 py-2 bg-amber-600 text-white rounded-xl text-sm font-medium hover:bg-amber-700 transition-all shadow-lg shadow-amber-600/20 disabled:opacity-50"
          >
            {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Hoàn tất xuất kho
          </button>
        </div>
      </div>

      {success && (
        <div className="flex items-center gap-3 p-4 bg-emerald-50 border border-emerald-200 rounded-2xl text-emerald-700">
          <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
          <p className="text-sm font-medium">Xuất kho thành công! Đang chuyển hướng...</p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Form: Items List */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-900">Danh sách sản phẩm xuất</h2>
              <button 
                onClick={addItem}
                className="flex items-center gap-2 text-blue-600 text-sm font-bold hover:text-blue-700 transition-all"
              >
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
                        <select
                          value={item.product_id}
                          onChange={(e) => updateItem(item.id, "product_id", e.target.value)}
                          className="w-full px-2 py-1 bg-slate-50 border-transparent focus:bg-white focus:border-blue-500 rounded-lg text-sm transition-all outline-none"
                        >
                          <option value="">Chọn sản phẩm</option>
                          {products.map((p) => (
                            <option key={p.id} value={p.id}>{p.name} ({p.sku})</option>
                          ))}
                        </select>
                        {item.name && (
                          <p className="text-xs text-slate-500 font-mono mt-1">{item.sku} • {item.unit}</p>
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
                  <span>Tổng giá trị xuất:</span>
                  <span className="text-amber-600">{formatCurrency(total)}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
            <h2 className="text-lg font-bold text-slate-900 mb-4">Lý do xuất kho</h2>
            <select 
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full px-4 py-3 bg-slate-50 border-transparent focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 rounded-2xl text-sm transition-all outline-none mb-4"
            >
              <option value="export_sale">Xuất bán hàng</option>
              <option value="export_transfer">Xuất chuyển kho</option>
              <option value="export_return">Xuất trả hàng nhà cung cấp</option>
              <option value="export_destroy">Xuất tiêu hủy / Hư hỏng</option>
            </select>
            <textarea 
              rows={4}
              value={note}
              onChange={(e) => setNote(e.target.value)}
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
                  value="PXK-AUTO" 
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
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border-transparent focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 rounded-xl text-sm transition-all outline-none"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Kho xuất</label>
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
