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
  Warehouse,
  Percent,
  Calculator,
  Info,
  X,
  Wallet,
  ArrowRight,
  Eye,
  AlertTriangle
} from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import { cn, formatCurrency } from "../lib/utils";
import { api } from "../lib/api";
import type { OrderItem } from "../types";

type CustomerLite = { id: string; name: string; phone?: string; address?: string };
type ProductLite = { id: string; name: string; sku: string; price: number };

export function OrderForm() {
  const navigate = useNavigate();
  const { id } = useParams();
  const [isEdit] = React.useState(!!id);
  const [searchQuery, setSearchQuery] = React.useState("");
  const [showResults, setShowResults] = React.useState(false);
  const [customerSearch, setCustomerSearch] = React.useState("Lê Hoàng");
  const [showCustomerResults, setShowCustomerResults] = React.useState(false);

  // Customer search with DB-backed suggestions
  const [customerQuery, setCustomerQuery] = React.useState("");
  const [customerSuggestions, setCustomerSuggestions] = React.useState<any[]>([]);
  const [selectedCustomer, setSelectedCustomer] = React.useState<any>(null);
  const [showCustomerSuggestions, setShowCustomerSuggestions] = React.useState(false);

  const fetchCustomerSuggestions = async (q: string) => {
    if (!q) { setCustomerSuggestions([]); return; }
    try {
      const res = await api.get(`/customers/suggest?q=${encodeURIComponent(q)}`);
      const data = res?.data ?? [];
      setCustomerSuggestions(data.map((c: any) => ({ id: c.id, name: c.name, phone: c.phone, address: c.address })));
    } catch {
      setCustomerSuggestions([]);
    }
  };

  const selectCustomer = (customer: any) => {
    setSelectedCustomer(customer);
    setCustomerQuery(customer.name);
    setShowCustomerSuggestions(false);
  };

  const addProduct = (product: any) => {
    const existing = items.find(i => i.productId === product.id);
    if (existing) {
      setItems(items.map(i => i.productId === product.id ? { ...i, quantity: parseFloat((i.quantity + 1).toFixed(1)) } : i));
    } else {
      setItems([...items, {
        productId: product.id,
        productName: product.name,
        sku: product.sku,
        price: product.price,
        availableStock: product.available_stock ?? 0,
        quantity: 1,
        discountRate: 0,
        discountAmount: 0,
        commissionRate: 10,
        commissionAmount: product.price * 0.10
      }]);
    }
    setSearchQuery("");
    setShowResults(false);
    setProductQuery("");
  };

  const [items, setItems] = React.useState<OrderItem[]>([]);
  const [shipmentAddress, setShipmentAddress] = React.useState<string>("");
  const [shippingFee, setShippingFee] = React.useState<number>(0);
  const [orderDiscount, setOrderDiscount] = React.useState<number>(0);
  const [paymentMethod, setPaymentMethod] = React.useState<string>("cash");
  const [orderStatus, setOrderStatus] = React.useState<string>("pending");
  const [note, setNote] = React.useState<string>("");
  const [formError, setFormError] = React.useState<string>("");
  const [selectedGroupId, setSelectedGroupId] = React.useState<number | null>(null);
  const [groups, setGroups] = React.useState<any[]>([]);

  // Warehouse state
  const [selectedWarehouseId, setSelectedWarehouseId] = React.useState<number | null>(null);
  const [warehouses, setWarehouses] = React.useState<any[]>([]);

  // Edit-mode baseline for stock validation (because current order may already be reserved)
  const [baselineWarehouseId, setBaselineWarehouseId] = React.useState<number | null>(null);
  const [baselineStatus, setBaselineStatus] = React.useState<string>("");
  const [baselineQtyByProduct, setBaselineQtyByProduct] = React.useState<Record<string, number>>({});

  // Fetch danh sách kho
  React.useEffect(() => {
    api.get('/warehouses').then((res: any) => {
      const data = res?.data ?? res ?? [];
      setWarehouses(Array.isArray(data) ? data : []);
    }).catch(() => setWarehouses([]));
  }, []);

  // Khi chọn kho → sync available_stock theo kho
  React.useEffect(() => {
    if (!selectedWarehouseId || items.length === 0) return;
    (async () => {
      try {
        const res: any = await api.get(`/inventory/stock-by-warehouse?warehouse_id=${selectedWarehouseId}`);
        const stockData = res?.data ?? [];
        setItems(prev => {
          let changed = false;
          const next = prev.map(item => {
            const ws = stockData.find((s: any) => String(s.product_id) === String(item.productId));
            const nextAvailable = ws ? Number(ws.available_stock) : 0;
            if (Number((item as any).availableStock ?? 0) !== nextAvailable) changed = true;
            return { ...item, availableStock: nextAvailable };
          });
          return changed ? next : prev;
        });
      } catch {}
    })();
  }, [selectedWarehouseId, items.map(i => i.productId).join(',')]);

  // Fetch groups
  React.useEffect(() => {
    const userStr = localStorage.getItem('user');
    const user = userStr ? JSON.parse(userStr) : null;
    if (!user?.id) return;
    const endpoint = user?.can_access_admin || user?.role === "admin" ? "/groups" : `/groups/user/${user.id}`;
    api.get(endpoint).then((res: any) => {
      setGroups(res?.data ?? []);
    }).catch(() => setGroups([]));
  }, []);

  // Product suggestions
  const [productQuery, setProductQuery] = React.useState("");
  const [productSuggestions, setProductSuggestions] = React.useState<any[]>([]);
  const fetchProductSuggestions = async (q: string) => {
    if (!q) { setProductSuggestions([]); return; }
    try {
      const wh = selectedWarehouseId ? `&warehouse_id=${selectedWarehouseId}` : '';
      const res: any = await api.get(`/products?search=${encodeURIComponent(q)}&limit=50${wh}`);
      const data = res?.data ?? [];
      setProductSuggestions(data.map((p: any) => ({ id: p.id, name: p.name, sku: p.sku, price: Number(p.price) || 0, available_stock: Number(p.available_stock) || 0 })));
    } catch {
      setProductSuggestions([]);
    }
  };

  // Load existing order khi edit
  React.useEffect(() => {
    if (!id) return;
    (async () => {
      try {
        const res: any = await api.get(`/orders/${id}`);
        const order = res?.data ?? res;
        const cust = {
          id: order?.customer_id ?? order?.customerId ?? '',
          name: order?.customer_name ?? order?.customerName ?? '',
          phone: order?.customer_phone ?? order?.customerPhone ?? '',
          address: order?.shipping_address ?? ''
        };
        setSelectedCustomer(cust as any);
        setCustomerQuery(cust.name);

        const itemsData = (order?.items ?? []).map((it: any) => ({
          productId: it.product_id ?? it.productId ?? '',
          productName: it.product_name ?? it.productName ?? '',
          sku: it.sku ?? '',
          price: Number(it.unit_price ?? it.price ?? 0),
          // available_stock sẽ được sync lại theo kho qua /inventory/stock-by-warehouse
          availableStock: Number(it.available_stock ?? 0),
          quantity: Number(it.qty ?? it.quantity ?? 1),
          discountRate: Number(it.discount_rate ?? 0),
          discountAmount: Number(it.discount_amount ?? 0),
          commissionRate: Number(it.commission_rate ?? 10),
          commissionAmount: Number(it.commission_amount ?? 0),
        }));
        if (itemsData.length) setItems(itemsData as any);

        setShipmentAddress(order?.shipping_address ?? '');
        setShippingFee(Number(order?.shipping_fee ?? 0));
        setOrderDiscount(Number(order?.discount ?? 0));
        setPaymentMethod(order?.payment_method ?? 'cash');
        setOrderStatus(order?.status ?? 'pending');
        setSelectedGroupId(order?.group_id ?? null);
        setSelectedWarehouseId(order?.warehouse_id ?? null);
        setBaselineWarehouseId(order?.warehouse_id ?? null);
        setBaselineStatus(order?.status ?? '');
        setBaselineQtyByProduct(
          (order?.items ?? []).reduce((acc: any, it: any) => {
            const pid = String(it.product_id ?? it.productId ?? '');
            const q = Number(it.qty ?? it.quantity ?? 0) || 0;
            if (pid) acc[pid] = (acc[pid] || 0) + q;
            return acc;
          }, {} as Record<string, number>)
        );
        setNote(order?.note ?? '');
      } catch (e) {
        console.error('Load order error', e);
      }
    })();
  }, [id]);

  // Submit
  const submitOrder = async () => {
    setFormError("");

    if (!selectedCustomer?.id) {
      setFormError('Vui lòng chọn khách hàng');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    if (!selectedWarehouseId) {
      setFormError('Vui lòng chọn kho xuất hàng');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    if (!selectedGroupId) {
      setFormError('Vui lòng chọn nhóm bán hàng');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    if (items.length === 0) {
      setFormError('Vui lòng thêm ít nhất 1 sản phẩm');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    const zeroQtyItem = items.find(i => !i.quantity || i.quantity <= 0);
    if (zeroQtyItem) {
      setFormError(`Sản phẩm "${zeroQtyItem.productName}" phải có số lượng lớn hơn 0`);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    // Enforce: qty <= available_stock in selected warehouse
    // Note (edit): available_stock may already exclude this order's reserved qty (pending/shipping),
    // so allow using baseline qty when editing within same warehouse & reserved statuses.
    const canAddBackBaseline =
      Boolean(id) &&
      selectedWarehouseId != null &&
      baselineWarehouseId != null &&
      String(selectedWarehouseId) === String(baselineWarehouseId) &&
      ['pending', 'shipping'].includes(String(baselineStatus || orderStatus));

    const overStockItem = items.find((i: any) => {
      const avail = Number(i.availableStock ?? 0) || 0;
      const base = canAddBackBaseline ? (Number(baselineQtyByProduct[String(i.productId)] ?? 0) || 0) : 0;
      return Number(i.quantity) > (avail + base);
    });
    if (overStockItem) {
      const avail = Number((overStockItem as any).availableStock ?? 0) || 0;
      const base = canAddBackBaseline ? (Number(baselineQtyByProduct[String(overStockItem.productId)] ?? 0) || 0) : 0;
      setFormError(
        `Sản phẩm "${overStockItem.productName}" vượt tồn kho có thể bán của kho đã chọn (tối đa: ${(avail + base).toFixed(3).replace(/\.?0+$/, '')})`
      );
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    const shippingAddr = selectedCustomer?.address?.trim() || '';
    if (!shippingAddr) {
      setFormError('Vui lòng nhập địa chỉ giao hàng');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    if (!paymentMethod) {
      setFormError('Vui lòng chọn phương thức thanh toán');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    const itemsPayload = items.map(i => ({
      product_id: i.productId,
      qty: i.quantity,
      unit_price: i.price,
      discount_rate: i.discountRate,
      discount_amount: i.discountAmount,
      commission_rate: i.commissionRate,
      commission_amount: i.commissionAmount,
      subtotal: i.subtotal
    }));
    const payload: any = {
      customer_id: selectedCustomer.id,
      warehouse_id: selectedWarehouseId,
      group_id: selectedGroupId,
      shipping_address: shippingAddr,
      carrier_service: 'standard',
      shipping_fee: shippingFee,
      payment_method: paymentMethod,
      status: orderStatus,
      discount: orderDiscount,
      note: note,
      items: itemsPayload
    };
    try {
      let res: any;
      if (id) {
        res = await api.put(`/orders/${id}`, payload);
      } else {
        res = await api.post('/orders', payload);
      }
      if (res?.id) {
        navigate(`/orders/edit/${res.id}`);
      } else {
        navigate('/orders');
      }
    } catch (e: any) {
      setFormError(e?.message || 'Lỗi khi lưu đơn hàng. Vui lòng thử lại.');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const removeItem = (productId: string) => {
    setItems(items.filter(item => item.productId !== productId));
  };

  const subtotal = items.reduce((sum, item) => sum + (item.quantity * item.price - item.discountAmount), 0);
  const tax = subtotal * 0.1;
  const total = Math.max(0, subtotal + shippingFee + tax - orderDiscount);

  return (
    <div className="max-w-6xl mx-auto pb-20">

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="w-8 h-8 flex items-center justify-center border border-slate-200 rounded-lg text-slate-400 hover:text-slate-700 hover:border-slate-300 transition-all"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <h1 className="text-lg font-semibold text-slate-900">
              {isEdit ? `Chỉnh sửa đơn #${id}` : 'Tạo đơn hàng mới'}
            </h1>
            <p className="text-xs text-slate-400">
              {isEdit ? 'Cập nhật thông tin đơn hàng và trạng thái vận chuyển.' : 'Thiết lập đơn hàng và chỉ định nhân viên phụ trách.'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="px-4 py-2 border border-slate-200 rounded-lg text-sm text-slate-500 hover:bg-slate-50 transition-all"
          >
            Hủy
          </button>
          <button
            type="button"
            onClick={submitOrder}
            className="flex items-center gap-2 px-5 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 transition-all"
          >
            <Save className="w-4 h-4" />
            {isEdit ? 'Cập nhật đơn hàng' : 'Hoàn tất & Xuất kho'}
          </button>
        </div>
      </div>

      {/* Error banner */}
      {formError && (
        <div className="flex items-center gap-3 mb-4 px-4 py-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
          <AlertTriangle className="w-4 h-4 flex-shrink-0" />
          <span className="font-medium">{formError}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-4">

        {/* LEFT COLUMN */}
        <div className="flex flex-col gap-4">

          {/* Card: Khách hàng */}
          <div className="bg-white border border-slate-100 rounded-xl p-5">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-6 h-6 rounded-md bg-blue-50 flex items-center justify-center">
                <User className="w-3.5 h-3.5 text-blue-600" />
              </div>
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Thông tin khách hàng</span>
            </div>

            {/* Kho + Nhóm — 2 cột */}
            <div className="grid grid-cols-2 gap-3 mb-4">
              <div>
                <label className="text-[11px] text-slate-400 mb-1 flex items-center gap-1">
                  Kho xuất hàng
                  <span className="bg-amber-100 text-amber-700 text-[10px] px-1.5 py-0.5 rounded font-medium">bắt buộc</span>
                </label>
                <select
                  value={selectedWarehouseId ?? ""}
                  onChange={(e) => setSelectedWarehouseId(e.target.value ? Number(e.target.value) : null)}
                  className={cn(
                    "w-full px-3 py-2 border rounded-lg text-sm outline-none transition-all bg-white",
                    !selectedWarehouseId
                      ? "border-amber-300 focus:border-amber-400 focus:ring-2 focus:ring-amber-100"
                      : "border-slate-200 focus:border-blue-300 focus:ring-2 focus:ring-blue-50"
                  )}
                >
                  <option value="">— Chọn kho xuất hàng —</option>
                  {warehouses.filter((w: any) => w.is_active).map((w: any) => (
                    <option key={w.id} value={w.id}>{w.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-[11px] text-slate-400 mb-1 flex items-center gap-1">
                  Nhóm bán hàng
                  <span className="bg-amber-100 text-amber-700 text-[10px] px-1.5 py-0.5 rounded font-medium">bắt buộc</span>
                </label>
                <select
                  value={selectedGroupId ?? ""}
                  onChange={(e) => setSelectedGroupId(e.target.value ? Number(e.target.value) : null)}
                  className={cn(
                    "w-full px-3 py-2 border rounded-lg text-sm outline-none transition-all bg-white",
                    !selectedGroupId
                      ? "border-amber-300 focus:border-amber-400 focus:ring-2 focus:ring-amber-100"
                      : "border-slate-200 focus:border-blue-300 focus:ring-2 focus:ring-blue-50"
                  )}
                >
                  <option value="">— Chọn nhóm bán hàng —</option>
                  {groups.map((g: any) => (
                    <option key={g.id} value={g.id}>{g.name}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Tìm khách hàng + Địa chỉ — 2 cột */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] text-slate-400 mb-1 block">Tìm khách hàng</label>
                <div className="relative">
                  <Search className="w-3.5 h-3.5 absolute right-3 top-1/2 -translate-y-1/2 text-slate-300" />
                  <input
                    type="text"
                    placeholder="Tìm theo tên hoặc SĐT..."
                    value={customerQuery}
                    onChange={(e) => {
                      setCustomerQuery(e.target.value);
                      setShowCustomerSuggestions(e.target.value.length > 0);
                      fetchCustomerSuggestions(e.target.value);
                    }}
                    onFocus={() => customerQuery.length > 0 && setShowCustomerSuggestions(true)}
                    className="w-full pr-9 pl-3 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:border-blue-300 focus:ring-2 focus:ring-blue-50 transition-all"
                  />
                  {showCustomerSuggestions && (
                    <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-100 rounded-lg shadow-lg z-50 overflow-hidden">
                      <div className="max-h-52 overflow-y-auto">
                        {customerSuggestions.length > 0 ? (
                          customerSuggestions.map(customer => (
                            <button
                              key={customer.id}
                              onClick={() => selectCustomer(customer)}
                              className="w-full px-4 py-3 flex items-center gap-3 hover:bg-slate-50 transition-colors text-left border-b border-slate-50 last:border-0"
                            >
                              <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center text-[11px] font-semibold text-blue-600 flex-shrink-0">
                                {(customer.name || '').split(' ').map((n: string) => n[0]).slice(0, 2).join('')}
                              </div>
                              <div>
                                <p className="text-sm font-medium text-slate-800">{customer.name}</p>
                                <p className="text-[11px] text-slate-400">{customer.phone || ''}</p>
                              </div>
                            </button>
                          ))
                        ) : (
                          <div className="px-4 py-6 text-center text-slate-400 text-sm">Không tìm thấy khách hàng</div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
                {selectedCustomer && (
                  <div className="mt-2 flex items-center gap-2 px-3 py-2 bg-slate-50 rounded-lg border border-slate-100">
                    <div className="w-7 h-7 rounded-full bg-blue-50 flex items-center justify-center text-[10px] font-semibold text-blue-600 flex-shrink-0">
                      {selectedCustomer.name?.split(' ').map((n: string) => n[0]).slice(0, 2).join('') || '?'}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-slate-800 truncate">{selectedCustomer.name || 'Chưa chọn'}</p>
                      <p className="text-[11px] text-slate-400">{selectedCustomer.phone || ''}</p>
                    </div>
                  </div>
                )}
              </div>

              <div>
                <label className="text-[11px] text-slate-400 mb-1 block">Địa chỉ giao hàng</label>
                <div className="relative">
                  <MapPin className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-300" />
                  <textarea
                    placeholder="Nhập địa chỉ chi tiết..."
                    value={selectedCustomer?.address ?? ''}
                    onChange={(e) => setSelectedCustomer((prev: any) => prev ? { ...prev, address: e.target.value } : prev)}
                    className="w-full pl-8 pr-3 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:border-blue-300 focus:ring-2 focus:ring-blue-50 transition-all resize-none"
                    rows={3}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Card: Sản phẩm */}
          <div className="bg-white border border-slate-100 rounded-xl overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-md bg-green-50 flex items-center justify-center">
                  <Package className="w-3.5 h-3.5 text-green-600" />
                </div>
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Danh sách sản phẩm</span>
              </div>
              <div className="relative w-56">
                <Search className="w-3.5 h-3.5 absolute right-3 top-1/2 -translate-y-1/2 text-slate-300" />
                <input
                  type="text"
                  placeholder="Tìm sản phẩm, SKU..."
                  value={productQuery}
                  onChange={(e) => {
                    setProductQuery(e.target.value);
                    setShowResults(e.target.value.length > 0);
                    fetchProductSuggestions(e.target.value);
                  }}
                  onFocus={() => productQuery.length > 0 && setShowResults(true)}
                  className="w-full pr-9 pl-3 py-1.5 border border-slate-200 rounded-lg text-sm outline-none focus:border-blue-300 focus:ring-2 focus:ring-blue-50 transition-all"
                />
                {showResults && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-100 rounded-lg shadow-lg z-50 overflow-hidden">
                    <div className="max-h-52 overflow-y-auto">
                      {productSuggestions.length > 0 ? (
                        productSuggestions.map(product => (
                          <button
                            key={product.id}
                            onClick={() => addProduct(product)}
                            className="w-full px-4 py-3 flex items-center justify-between hover:bg-slate-50 transition-colors text-left border-b border-slate-50 last:border-0"
                          >
                            <div>
                              <p className="text-sm font-medium text-slate-800">{product.name}</p>
                              <p className="text-[10px] text-slate-400 uppercase tracking-wide font-mono">{product.sku}</p>
                            </div>
                            <div className="text-right">
                              <p className="text-sm font-medium text-slate-800">{formatCurrency(product.price)}</p>
                              <p className="text-[10px] text-slate-400">Thêm</p>
                            </div>
                          </button>
                        ))
                      ) : (
                        <div className="px-4 py-6 text-center text-slate-400 text-sm">Không tìm thấy sản phẩm</div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {items.length === 0 ? (
              <div className="py-12 text-center text-slate-400">
                <Package className="w-7 h-7 mx-auto mb-2 text-slate-200" />
                <p className="text-sm">Chưa có sản phẩm. Tìm và thêm bên trên.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-xs" style={{ tableLayout: 'fixed' }}>
                  <colgroup>
                    <col style={{ width: '34%' }} />
                    <col style={{ width: '13%' }} />
                    <col style={{ width: '13%' }} />
                    <col style={{ width: '9%' }} />
                    <col style={{ width: '14%' }} />
                    <col style={{ width: '13%' }} />
                    <col style={{ width: '4%' }} />
                  </colgroup>
                  <thead>
                    <tr className="border-b border-slate-100 text-slate-400 text-[11px] uppercase tracking-wide">
                      <th className="px-4 py-2 text-left font-medium">Sản phẩm</th>
                      <th className="px-3 py-2 text-center font-medium">Số lượng</th>
                      <th className="px-3 py-2 text-right font-medium">Đơn giá</th>
                      <th className="px-2 py-2 text-center font-medium">CK%</th>
                      <th className="px-3 py-2 text-right font-medium">Thành tiền</th>
                      <th className="px-3 py-2 text-center font-medium">Hoa hồng</th>
                      <th className="px-2 py-2"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((item) => {
                      const lineTotal = item.quantity * item.price - item.discountAmount;
                      const canAddBackBaseline =
                        Boolean(id) &&
                        selectedWarehouseId != null &&
                        baselineWarehouseId != null &&
                        String(selectedWarehouseId) === String(baselineWarehouseId) &&
                        ['pending', 'shipping'].includes(String(baselineStatus || orderStatus));
                      const avail = Number((item as any).availableStock ?? 0) || 0;
                      const base = canAddBackBaseline ? (Number(baselineQtyByProduct[String(item.productId)] ?? 0) || 0) : 0;
                      const maxAllowed = avail + base;
                      const overStock = Number(item.quantity) > maxAllowed;
                      return (
                        <tr
                          key={item.productId}
                          className={cn(
                            "group border-b border-slate-50 last:border-0 transition-colors",
                            overStock ? "bg-red-50/70" : "hover:bg-slate-50/60"
                          )}
                        >
                          <td className="px-4 py-2.5">
                            <div className="flex items-center gap-2">
                              <div className="w-6 h-6 rounded bg-slate-100 flex items-center justify-center text-slate-300 flex-shrink-0">
                                <Package className="w-3 h-3" />
                              </div>
                              <div className="min-w-0">
                                <p className="font-medium text-slate-800 truncate text-xs leading-tight">{item.productName}</p>
                                <p className="text-slate-400 font-mono text-[10px] leading-tight">{item.sku}</p>
                                <p className={cn("text-[10px] leading-tight", overStock ? "text-red-500 font-medium" : "text-slate-400")}>
                                  Có thể bán: {maxAllowed.toFixed(3).replace(/\.?0+$/, '')}
                                  {overStock && <span className="ml-1">⚠ Vượt!</span>}
                                </p>
                              </div>
                            </div>
                          </td>
                          <td className="px-3 py-2.5">
                            <div className="flex items-center justify-center gap-1">
                              <button
                                type="button"
                                onClick={() => {
                                  const v = Math.max(0.1, parseFloat((item.quantity - 1).toFixed(1)));
                                  setItems(items.map(it => it.productId === item.productId ? { ...it, quantity: v, commissionAmount: (v * it.price - it.discountAmount) * (it.commissionRate / 100) } : it));
                                }}
                                className="w-5 h-5 rounded bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 transition-colors flex-shrink-0"
                              >
                                <Minus className="w-2.5 h-2.5" />
                              </button>
                              <input
                                type="number" min={0.1} step={0.1}
                                value={item.quantity}
                                onChange={(e) => {
                                  const raw = parseFloat(parseFloat(e.target.value).toFixed(1));
                                  const v = Number.isFinite(raw) && raw > 0 ? raw : 0.1;
                                  setItems(items.map(it => it.productId === item.productId ? { ...it, quantity: v, commissionAmount: (v * it.price - it.discountAmount) * (it.commissionRate / 100) } : it));
                                }}
                                className={cn(
                                  "w-11 h-6 px-1 border rounded text-center text-xs font-medium outline-none focus:ring-1 transition-colors",
                                  overStock
                                    ? "border-red-300 bg-red-50 focus:border-red-400 focus:ring-red-100 text-red-700"
                                    : "border-slate-200 bg-white focus:border-blue-300 focus:ring-blue-100"
                                )}
                              />
                              <button
                                type="button"
                                onClick={() => {
                                  const v = parseFloat((item.quantity + 1).toFixed(1));
                                  setItems(items.map(it => it.productId === item.productId ? { ...it, quantity: v, commissionAmount: (v * it.price - it.discountAmount) * (it.commissionRate / 100) } : it));
                                }}
                                className="w-5 h-5 rounded bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 transition-colors flex-shrink-0"
                              >
                                <Plus className="w-2.5 h-2.5" />
                              </button>
                            </div>
                          </td>
                          <td className="px-3 py-2.5">
                            <input
                              type="number" min={0}
                              value={item.price}
                              onChange={(e) => {
                                const p = Math.max(0, Number(e.target.value) || 0);
                                const da = p * item.quantity * (item.discountRate / 100);
                                setItems(items.map(it => it.productId === item.productId ? { ...it, price: p, discountAmount: da, commissionAmount: (p * it.quantity - da) * (it.commissionRate / 100) } : it));
                              }}
                              className="w-full h-6 px-2 bg-transparent border border-transparent hover:border-slate-200 focus:bg-white focus:border-blue-300 rounded text-right text-xs font-medium text-slate-700 outline-none focus:ring-1 focus:ring-blue-100 transition-colors"
                            />
                          </td>
                          <td className="px-2 py-2.5">
                            <div className="flex items-center justify-center gap-0.5">
                              <input
                                type="number" min={0} max={100}
                                value={item.discountRate}
                                onChange={(e) => {
                                  const r = Math.min(100, Math.max(0, Number(e.target.value) || 0));
                                  const da = item.price * item.quantity * (r / 100);
                                  setItems(items.map(it => it.productId === item.productId ? { ...it, discountRate: r, discountAmount: da, commissionAmount: (it.price * it.quantity - da) * (it.commissionRate / 100) } : it));
                                }}
                                className="w-9 h-6 px-1 bg-transparent border border-transparent hover:border-slate-200 focus:bg-white focus:border-blue-300 rounded text-center text-xs font-medium outline-none focus:ring-1 focus:ring-blue-100 transition-colors"
                              />
                              <span className="text-slate-400 text-[10px]">%</span>
                            </div>
                          </td>
                          <td className="px-3 py-2.5 text-right">
                            <span className="font-medium text-slate-900 text-xs">{formatCurrency(lineTotal)}</span>
                          </td>
                          <td className="px-3 py-2.5">
                            <div className="flex flex-col items-center gap-0.5">
                              <div className="flex items-center gap-0.5 justify-center">
                                <input
                                  type="number" min={0} max={100}
                                  value={item.commissionRate}
                                  onChange={(e) => {
                                    const r = Math.min(100, Math.max(0, Number(e.target.value) || 0));
                                    setItems(items.map(it => it.productId === item.productId ? { ...it, commissionRate: r, commissionAmount: (it.price * it.quantity - it.discountAmount) * (r / 100) } : it));
                                  }}
                                  className="w-9 h-5 px-1 bg-green-50 border border-transparent hover:border-green-200 focus:bg-white focus:border-green-400 rounded text-center text-xs font-semibold text-green-700 outline-none focus:ring-1 focus:ring-green-100 transition-colors"
                                />
                                <span className="text-green-600 text-[10px] font-semibold">%</span>
                              </div>
                              <span className="text-green-600 text-[10px] font-medium">{formatCurrency(item.commissionAmount)}</span>
                            </div>
                          </td>
                          <td className="px-2 py-2.5 text-center">
                            <button
                              type="button"
                              onClick={() => removeItem(item.productId)}
                              className="w-5 h-5 rounded flex items-center justify-center text-slate-300 hover:text-red-500 hover:bg-red-50 transition-colors opacity-0 group-hover:opacity-100"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot>
                    <tr className="bg-slate-50 border-t border-slate-100 text-xs">
                      <td className="px-4 py-2 text-slate-500 font-medium">Tổng cộng ({items.length} SP)</td>
                      <td className="px-3 py-2 text-center font-medium text-slate-700">
                        {items.reduce((s, i) => s + i.quantity, 0).toFixed(1).replace(/\.0$/, '')}
                      </td>
                      <td className="px-3 py-2"></td>
                      <td className="px-2 py-2 text-center text-red-500 text-[10px]">
                        {items.some(i => i.discountAmount > 0) ? `-${formatCurrency(items.reduce((s, i) => s + i.discountAmount, 0))}` : '—'}
                      </td>
                      <td className="px-3 py-2 text-right font-medium text-slate-700">
                        {formatCurrency(items.reduce((s, i) => s + (i.quantity * i.price - i.discountAmount), 0))}
                      </td>
                      <td className="px-3 py-2 text-center">
                        <span className="inline-block bg-green-50 text-green-700 text-[10px] font-semibold px-2 py-0.5 rounded-full">
                          {formatCurrency(items.reduce((s, i) => s + i.commissionAmount, 0))}
                        </span>
                      </td>
                      <td></td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* RIGHT COLUMN */}
        <div className="flex flex-col gap-4">

          {/* Tổng kết */}
          <div className="bg-white border border-slate-100 rounded-xl p-5">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-6 h-6 rounded-md bg-red-50 flex items-center justify-center">
                <Calculator className="w-3.5 h-3.5 text-red-500" />
              </div>
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Tổng kết đơn hàng</span>
            </div>
            <div className="space-y-1">
              <div className="flex items-center justify-between py-1.5 border-b border-slate-50 text-sm">
                <span className="text-slate-400">Tạm tính</span>
                <span className="font-medium text-slate-700">{formatCurrency(subtotal)}</span>
              </div>
              <div className="flex items-center justify-between py-1.5 border-b border-slate-50 text-sm">
                <span className="text-slate-400">VAT 10%</span>
                <span className="font-medium text-slate-700">{formatCurrency(tax)}</span>
              </div>
              <div className="flex items-center justify-between py-1.5 border-b border-slate-50 text-sm">
                <span className="text-slate-400">Phí vận chuyển</span>
                <input
                  type="number" min="0"
                  value={shippingFee}
                  onChange={(e) => setShippingFee(Number(e.target.value) || 0)}
                  className="w-24 px-2 py-0.5 border border-slate-200 rounded text-right text-sm font-medium text-slate-700 outline-none focus:border-blue-300 focus:ring-1 focus:ring-blue-100 transition-colors"
                />
              </div>
              <div className="flex items-center justify-between py-1.5 border-b border-slate-50 text-sm">
                <span className="text-slate-400">Giảm giá</span>
                <input
                  type="number" min="0"
                  value={orderDiscount}
                  onChange={(e) => setOrderDiscount(Number(e.target.value) || 0)}
                  className="w-24 px-2 py-0.5 border border-slate-200 rounded text-right text-sm font-medium text-red-500 outline-none focus:border-blue-300 focus:ring-1 focus:ring-blue-100 transition-colors"
                />
              </div>
              <div className="flex items-center justify-between pt-3 mt-1">
                <span className="text-sm font-semibold text-slate-700">Tổng cộng</span>
                <span className="text-xl font-semibold text-red-600">{formatCurrency(total)}</span>
              </div>
            </div>
            <div className="mt-3 flex items-center justify-between px-3 py-2 bg-green-50 rounded-lg">
              <span className="text-xs text-green-700">Tổng hoa hồng</span>
              <span className="text-sm font-semibold text-green-800">
                {formatCurrency(items.reduce((sum, item) => sum + item.commissionAmount, 0))}
              </span>
            </div>
          </div>

          {/* Cài đặt */}
          <div className="bg-white border border-slate-100 rounded-xl p-5 space-y-4">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-md bg-slate-100 flex items-center justify-center">
                <Info className="w-3.5 h-3.5 text-slate-500" />
              </div>
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Cài đặt đơn hàng</span>
            </div>

            <div>
              <label className="text-[11px] text-slate-400 mb-1.5 block">Phương thức thanh toán</label>
              <div className="flex gap-2">
                {[
                  { id: 'cash', label: 'Tiền mặt', icon: Wallet },
                  { id: 'card', label: 'Thẻ ATM', icon: CreditCard },
                  { id: 'transfer', label: 'Chuyển khoản', icon: ArrowRight },
                ].map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setPaymentMethod(m.id)}
                    className={cn(
                      "flex-1 flex flex-col items-center gap-1 py-2 border rounded-lg text-[10px] font-medium transition-all",
                      paymentMethod === m.id
                        ? "border-blue-400 bg-blue-50 text-blue-700"
                        : "border-slate-100 bg-slate-50 text-slate-400 hover:border-slate-200"
                    )}
                  >
                    <m.icon className="w-3.5 h-3.5" />
                    {m.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-[11px] text-slate-400 mb-1.5 block">Trạng thái đơn hàng</label>
              <select
                value={orderStatus}
                onChange={(e) => setOrderStatus(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:border-blue-300 focus:ring-2 focus:ring-blue-50 transition-all bg-white"
              >
                <option value="pending">Chờ duyệt</option>
                <option value="shipping">Đang giao</option>
                <option value="completed">Đã giao</option>
                <option value="cancelled">Đã hủy</option>
              </select>
            </div>

            <div>
              <label className="text-[11px] text-slate-400 mb-1.5 block">Nhân viên phụ trách</label>
              <div className="flex items-center gap-2 px-3 py-2 bg-slate-50 rounded-lg border border-slate-100">
                <div className="w-7 h-7 rounded-full bg-blue-50 flex items-center justify-center text-[10px] font-semibold text-blue-600 flex-shrink-0">AD</div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-800">Admin</p>
                  <p className="text-[10px] text-slate-400">Quản trị viên</p>
                </div>
                <button type="button" className="text-[11px] text-blue-600 font-medium hover:underline flex-shrink-0">Đổi</button>
              </div>
            </div>

            <div>
              <label className="text-[11px] text-slate-400 mb-1.5 block">Ghi chú đơn hàng</label>
              <textarea
                rows={3}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Ghi chú thêm về đơn hàng, yêu cầu đặc biệt..."
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:border-blue-300 focus:ring-2 focus:ring-blue-50 transition-all resize-none"
              />
            </div>

            <div className="flex items-start gap-2 px-3 py-2 bg-blue-50 rounded-lg">
              <Info className="w-3.5 h-3.5 text-blue-500 flex-shrink-0 mt-0.5" />
              <p className="text-[11px] text-blue-600 leading-relaxed">
                Đơn hàng tự động vào báo cáo doanh thu sau khi chuyển sang "Đã giao".
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={submitOrder}
            className="w-full flex items-center justify-center gap-2 py-2.5 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 transition-all"
          >
            <Save className="w-4 h-4" />
            {isEdit ? 'Cập nhật đơn hàng' : 'Hoàn tất & Xuất kho'}
          </button>
        </div>
      </div>
    </div>
  );
}
