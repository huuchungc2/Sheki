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

  // Product data now sourced from DB; mock data removed

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

  // Fetch groups — chỉ lấy nhóm của nhân viên đang login
  React.useEffect(() => {
    const userStr = localStorage.getItem('user');
    const user = userStr ? JSON.parse(userStr) : null;
    if (!user?.id) return;
    // Admin xem tất cả nhóm, sales chỉ xem nhóm của mình
    const endpoint = user.role === 'admin' ? '/groups' : `/groups/user/${user.id}`;
    api.get(endpoint).then((res: any) => {
      setGroups(res?.data ?? []);
    }).catch(() => setGroups([]));
  }, []);

  // Product suggestions (DB-backed)
  const [productQuery, setProductQuery] = React.useState("");
  const [productSuggestions, setProductSuggestions] = React.useState<any[]>([]);
  const fetchProductSuggestions = async (q: string) => {
    if (!q) { setProductSuggestions([]); return; }
    try {
      const res: any = await api.get(`/products?search=${encodeURIComponent(q)}&limit=50&active_only=1`);
      const data = res?.data ?? [];
      setProductSuggestions(data.map((p: any) => ({ id: p.id, name: p.name, sku: p.sku, price: Number(p.price) || 0, available_stock: Number(p.available_stock) || 0 })));
    } catch {
      setProductSuggestions([]);
    }
  };

  // Load existing order data when editing
  React.useEffect(() => {
    if (!id) return;
    (async () => {
      try {
        const res: any = await api.get(`/orders/${id}`);
        const order = res?.data ?? res;
        // Customer
        const cust = {
          id: order?.customer_id ?? order?.customerId ?? '',
          name: order?.customer_name ?? order?.customerName ?? '',
          phone: order?.customer_phone ?? order?.customerPhone ?? '',
          address: order?.shipping_address ?? ''
        };
        setSelectedCustomer(cust as any);
        setCustomerQuery(cust.name);

        // Items
        const itemsData = (order?.items ?? []).map((it: any) => ({
          productId: it.product_id ?? it.productId ?? '',
          productName: it.product_name ?? it.productName ?? '',
          sku: it.sku ?? '',
          price: Number(it.unit_price ?? it.price ?? 0),
          availableStock: Number(it.available_stock ?? 999),
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
        setNote(order?.note ?? '');
      } catch (e) {
        console.error('Load order error', e);
      }
    })();
  }, [id]);

  // Submit order to backend
  const submitOrder = async () => {
    setFormError("");

    // Validation
    if (!selectedCustomer?.id) {
      setFormError('Vui lòng chọn khách hàng');
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
      warehouse_id: 1,
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

  const updateQuantity = (productId: string, delta: number) => {
    setItems(items.map(item => {
      if (item.productId === productId) {
        const newQty = Math.max(1, item.quantity + delta);
        return { 
          ...item, 
          quantity: newQty,
          commissionAmount: (item.price * newQty - item.discountAmount) * (item.commissionRate / 100)
        };
      }
      return item;
    }));
  };

  const removeItem = (productId: string) => {
    setItems(items.filter(item => item.productId !== productId));
  };

  const updateDiscount = (productId: string, rate: number) => {
    setItems(items.map(item => {
      if (item.productId === productId) {
        const discountAmount = (item.price * item.quantity) * (rate / 100);
        return { 
          ...item, 
          discountRate: rate,
          discountAmount,
          commissionAmount: (item.price * item.quantity - discountAmount) * (item.commissionRate / 100)
        };
      }
      return item;
    }));
  };

  const updateCommission = (productId: string, rate: number) => {
    setItems(items.map(item => {
      if (item.productId === productId) {
        return { 
          ...item, 
          commissionRate: rate,
          commissionAmount: (item.price * item.quantity - item.discountAmount) * (rate / 100)
        };
      }
      return item;
    }));
  };

  // Helper: ensure odd integer >= 1
  const clampToOdd = (n: number) => {
    let v = Math.floor(n);
    if (!Number.isFinite(v)) v = 1;
    if (v < 1) v = 1;
    if (v % 2 === 0) v = v - 1 >= 1 ? v - 1 : 1;
    // ensure odd
    return v;
  };

  const subtotal = items.reduce((sum, item) => sum + (item.quantity * item.price - item.discountAmount), 0);
  const tax = subtotal * 0.1;
  const total = Math.max(0, subtotal + shippingFee + tax - orderDiscount);

  return (
    <div className="max-w-7xl mx-auto space-y-8 pb-20">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => navigate(-1)}
            className="w-12 h-12 flex items-center justify-center bg-white border border-slate-100 rounded-2xl text-slate-400 hover:text-red-600 hover:border-red-100 transition-all shadow-sm"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-3xl font-black text-slate-900 tracking-tight">
              {isEdit ? `Chỉnh sửa #${id}` : "Tạo đơn hàng mới"}
            </h1>
            <p className="text-slate-400 text-sm font-medium">
              {isEdit ? "Cập nhật thông tin đơn hàng và trạng thái vận chuyển." : "Thiết lập đơn hàng mới và chỉ định nhân viên phụ trách."}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button type="button" onClick={() => navigate(-1)} className="px-6 py-3 bg-white border border-slate-200 rounded-2xl text-sm font-bold text-slate-600 hover:bg-slate-50 transition-all shadow-sm">
            Hủy bỏ
          </button>
          <button type="button" onClick={submitOrder} className="flex items-center gap-2 px-8 py-3 bg-red-600 text-white rounded-2xl text-sm font-black hover:bg-red-700 transition-all shadow-xl shadow-red-600/20">
            <Save className="w-5 h-5" />
            {isEdit ? "Cập nhật đơn hàng" : "Hoàn tất & Xuất kho"}
          </button>
        </div>
      </div>

      {/* Form error banner */}
      {formError && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-5 py-4 rounded-2xl text-sm flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 flex-shrink-0" />
          <span className="font-bold">{formError}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Customer & Products */}
        <div className="lg:col-span-8 space-y-8">
          
          {/* Customer Selection */}
          <div className="bg-white p-8 rounded-[40px] border border-slate-100 shadow-sm space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-black text-slate-900 flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-red-50 flex items-center justify-center text-red-600">
                  <User className="w-5 h-5" />
                </div>
                Thông tin khách hàng
              </h2>
            </div>

            {/* Group selector */}
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                NHÓM BÁN HÀNG <span className="text-red-500">*</span>
              </label>
              <select
                value={selectedGroupId ?? ""}
                onChange={(e) => setSelectedGroupId(e.target.value ? Number(e.target.value) : null)}
                className={cn(
                  "w-full px-5 py-3 bg-slate-50 border rounded-[24px] text-sm font-bold transition-all outline-none",
                  !selectedGroupId ? "border-amber-300 focus:border-amber-500 focus:ring-4 focus:ring-amber-500/10" : "border-transparent focus:border-red-200 focus:ring-4 focus:ring-red-500/5"
                )}
              >
                <option value="">-- Chọn nhóm bán hàng --</option>
                {groups.map((g: any) => (
                  <option key={g.id} value={g.id}>{g.name}</option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-4">
                <div className="relative">
                  <Search className="w-4 h-4 absolute right-4 top-1/2 -translate-y-1/2 text-slate-300" />
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
                    className="w-full px-5 py-4 bg-slate-50 border-transparent focus:bg-white focus:border-red-200 focus:ring-4 focus:ring-red-500/5 rounded-[24px] text-sm transition-all outline-none font-medium"
                  />
                  {showCustomerSuggestions && (
                    <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl border border-slate-100 shadow-2xl z-50 overflow-hidden">
                      <div className="max-h-60 overflow-y-auto">
                        {customerSuggestions.length > 0 ? (
                          customerSuggestions.map(customer => (
                            <button
                              key={customer.id}
                              onClick={() => selectCustomer(customer)}
                              className="w-full px-6 py-4 flex items-center gap-4 hover:bg-slate-50 transition-colors text-left border-b border-slate-50 last:border-0"
                            >
                              <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-xs font-bold text-slate-500">
                                {(customer.name || '').split(' ').map((n: string) => n[0]).slice(0,2).join('')}
                              </div>
                              <div>
                                <p className="text-sm font-black text-slate-900">{customer.name}</p>
                                <p className="text-[10px] font-bold text-slate-400">{customer.phone || ''}</p>
                              </div>
                            </button>
                          ))
                        ) : (
                          <div className="px-6 py-8 text-center text-slate-400 text-sm font-bold">Không tìm thấy khách hàng</div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-[24px] border border-slate-100">
                  <div className="w-14 h-14 rounded-2xl bg-white shadow-sm flex items-center justify-center text-xl font-black text-slate-300">
                    {selectedCustomer?.name ? selectedCustomer.name.split(' ').map(n => n[0]).slice(0,2).join('') : ''}
                  </div>
                  <div>
                    <p className="text-base font-black text-slate-900">{selectedCustomer?.name || 'Chưa chọn'}</p>
                    <p className="text-sm font-bold text-slate-400">{selectedCustomer?.phone || ''}</p>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">ĐỊA CHỈ GIAO HÀNG</label>
                  <div className="relative">
                    <MapPin className="w-4 h-4 absolute left-4 top-4 text-slate-300" />
                    <textarea 
                      placeholder="Nhập địa chỉ chi tiết..." 
                      value={selectedCustomer?.address ?? ''}
                      onChange={(e) => setSelectedCustomer(prev => prev ? { ...prev, address: e.target.value } : prev)}
                      className="w-full pl-12 pr-5 py-4 bg-slate-50 border-transparent focus:bg-white focus:border-red-200 focus:ring-4 focus:ring-red-500/5 rounded-[24px] text-sm transition-all outline-none font-medium min-h-[100px] resize-none"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Product Selection */}
          <div className="bg-white rounded-[40px] border border-slate-100 shadow-sm overflow-hidden">
            <div className="p-8 border-b border-slate-50 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <h2 className="text-xl font-black text-slate-900 flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-blue-50 flex items-center justify-center text-blue-600">
                  <Package className="w-5 h-5" />
                </div>
                Danh sách sản phẩm
              </h2>
              <div className="relative w-full md:w-80">
                <Search className="w-4 h-4 absolute right-4 top-1/2 -translate-y-1/2 text-slate-300" />
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
                  className="w-full px-5 py-3 bg-slate-50 border-transparent focus:bg-white focus:border-blue-200 focus:ring-4 focus:ring-blue-500/5 rounded-2xl text-sm transition-all outline-none font-medium"
                />

                {showResults && (
                  <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl border border-slate-100 shadow-2xl z-50 overflow-hidden">
                    <div className="max-h-60 overflow-y-auto">
                      {productSuggestions.length > 0 ? (
                        productSuggestions.map(product => (
                          <button
                            key={product.id}
                            onClick={() => addProduct(product)}
                            className="w-full px-6 py-4 flex items-center justify-between hover:bg-slate-50 transition-colors text-left border-b border-slate-50 last:border-0"
                          >
                            <div>
                              <p className="text-sm font-black text-slate-900">{product.name}</p>
                              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{product.sku}</p>
                            </div>
                            <div className="text-right">
                              <p className="text-sm font-black text-slate-900">{formatCurrency(product.price)}</p>
                              <p className="text-[10px] font-bold text-slate-400">Chọn để thêm</p>
                            </div>
                          </button>
                        ))
                      ) : (
                        <div className="px-6 py-8 text-center">
                          <Package className="w-8 h-8 text-slate-200 mx-auto mb-2" />
                          <p className="text-sm font-bold text-slate-400">Không tìm thấy sản phẩm</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {items.length === 0 ? (
              <div className="py-12 text-center text-slate-400">
                <Package className="w-8 h-8 mx-auto mb-2 text-slate-200" />
                <p className="text-sm">Chưa có sản phẩm. Tìm và thêm bên trên.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50 border-y border-slate-100 text-slate-400 font-semibold uppercase tracking-wide">
                      <th className="px-4 py-2 text-left">Sản phẩm</th>
                      <th className="px-3 py-2 text-center w-32">Số lượng</th>
                      <th className="px-3 py-2 text-right w-28">Đơn giá</th>
                      <th className="px-3 py-2 text-center w-20">CK%</th>
                      <th className="px-3 py-2 text-right w-28">Thành tiền</th>
                      <th className="px-3 py-2 text-center w-24">Hoa hồng%</th>
                      <th className="px-2 py-2 w-7"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((item) => {
                      const lineTotal = item.quantity * item.price - item.discountAmount;
                      const overStock = item.quantity > (item as any).availableStock;
                      return (
                        <tr key={item.productId} className={cn("group border-b border-slate-50 last:border-0 transition-colors", overStock ? "bg-red-50/60" : "hover:bg-slate-50/60")}>
                          {/* Sản phẩm + có thể bán */}
                          <td className="px-4 py-2">
                            <div className="flex items-center gap-2">
                              <div className="w-7 h-7 rounded-lg bg-slate-100 flex items-center justify-center text-slate-300 flex-shrink-0">
                                <Package className="w-3.5 h-3.5" />
                              </div>
                              <div className="min-w-0">
                                <p className="font-semibold text-slate-800 truncate text-xs leading-tight">{item.productName}</p>
                                <p className="text-slate-400 font-mono leading-tight">{item.sku}</p>
                                <p className={cn("leading-tight font-medium", overStock ? "text-red-500" : "text-slate-400")}>
                                  Có thể bán: <span className="font-bold">{(item as any).availableStock ?? 0}</span>
                                  {overStock && <span className="ml-1 text-red-500">⚠ Vượt tồn!</span>}
                                </p>
                              </div>
                            </div>
                          </td>
                          {/* Số lượng */}
                          <td className="px-3 py-2">
                            <div className="flex items-center justify-center gap-1">
                              <button type="button"
                                onClick={() => {
                                  const v = Math.max(0.1, parseFloat((item.quantity - 1).toFixed(1)));
                                  setItems(items.map(it => it.productId === item.productId ? { ...it, quantity: v, commissionAmount: (v * it.price - it.discountAmount) * (it.commissionRate / 100) } : it));
                                }}
                                className="w-5 h-5 rounded bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 transition-colors flex-shrink-0">
                                <Minus className="w-2.5 h-2.5" />
                              </button>
                              <input type="number" min={0.1} step={0.1}
                                value={item.quantity}
                                onChange={(e) => {
                                  const raw = parseFloat(parseFloat(e.target.value).toFixed(1));
                                  const v = Number.isFinite(raw) && raw > 0 ? raw : 0.1;
                                  setItems(items.map(it => it.productId === item.productId ? { ...it, quantity: v, commissionAmount: (v * it.price - it.discountAmount) * (it.commissionRate / 100) } : it));
                                }}
                                className={cn("w-12 h-6 px-1 border rounded text-center text-xs font-semibold outline-none focus:ring-1", overStock ? "border-red-300 bg-red-50 focus:border-red-400 focus:ring-red-200" : "border-slate-200 bg-white focus:border-blue-300 focus:ring-blue-100")}
                              />
                              <button type="button"
                                onClick={() => {
                                  const v = parseFloat((item.quantity + 1).toFixed(1));
                                  setItems(items.map(it => it.productId === item.productId ? { ...it, quantity: v, commissionAmount: (v * it.price - it.discountAmount) * (it.commissionRate / 100) } : it));
                                }}
                                className="w-5 h-5 rounded bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 transition-colors flex-shrink-0">
                                <Plus className="w-2.5 h-2.5" />
                              </button>
                            </div>
                          </td>
                          {/* Đơn giá */}
                          <td className="px-3 py-2">
                            <input type="number" min={0}
                              value={item.price}
                              onChange={(e) => {
                                const p = Math.max(0, Number(e.target.value) || 0);
                                const da = p * item.quantity * (item.discountRate / 100);
                                setItems(items.map(it => it.productId === item.productId ? { ...it, price: p, discountAmount: da, commissionAmount: (p * it.quantity - da) * (it.commissionRate / 100) } : it));
                              }}
                              className="w-full h-6 px-2 bg-transparent border border-transparent hover:border-slate-200 focus:bg-white focus:border-blue-300 rounded text-right text-xs font-semibold text-slate-700 outline-none focus:ring-1 focus:ring-blue-100 transition-colors"
                            />
                          </td>
                          {/* Chiết khấu % */}
                          <td className="px-3 py-2">
                            <div className="flex items-center gap-0.5 justify-center">
                              <input type="number" min={0} max={100}
                                value={item.discountRate}
                                onChange={(e) => {
                                  const r = Math.min(100, Math.max(0, Number(e.target.value) || 0));
                                  const da = item.price * item.quantity * (r / 100);
                                  setItems(items.map(it => it.productId === item.productId ? { ...it, discountRate: r, discountAmount: da, commissionAmount: (it.price * it.quantity - da) * (it.commissionRate / 100) } : it));
                                }}
                                className="w-10 h-6 px-1 bg-transparent border border-transparent hover:border-slate-200 focus:bg-white focus:border-blue-300 rounded text-center text-xs font-semibold outline-none focus:ring-1 focus:ring-blue-100 transition-colors"
                              />
                              <span className="text-slate-400">%</span>
                            </div>
                          </td>
                          {/* Thành tiền */}
                          <td className="px-3 py-2 text-right">
                            <span className="font-semibold text-slate-900 text-xs">{formatCurrency(lineTotal)}</span>
                          </td>
                          {/* Hoa hồng % — chỉnh được */}
                          <td className="px-3 py-2">
                            <div className="flex flex-col items-center gap-0.5">
                              <div className="flex items-center gap-0.5 justify-center">
                                <input type="number" min={0} max={100}
                                  value={item.commissionRate}
                                  onChange={(e) => {
                                    const r = Math.min(100, Math.max(0, Number(e.target.value) || 0));
                                    setItems(items.map(it => it.productId === item.productId ? { ...it, commissionRate: r, commissionAmount: (it.price * it.quantity - it.discountAmount) * (r / 100) } : it));
                                  }}
                                  className="w-10 h-5 px-1 bg-emerald-50 border border-transparent hover:border-emerald-200 focus:bg-white focus:border-emerald-400 rounded text-center text-xs font-bold text-emerald-700 outline-none focus:ring-1 focus:ring-emerald-100 transition-colors"
                                />
                                <span className="text-emerald-600 text-xs font-bold">%</span>
                              </div>
                              <span className="text-emerald-600 font-semibold">{formatCurrency(item.commissionAmount)}</span>
                            </div>
                          </td>
                          {/* Xoá */}
                          <td className="px-2 py-2 text-center">
                            <button type="button" onClick={() => removeItem(item.productId)}
                              className="w-6 h-6 rounded flex items-center justify-center text-slate-300 hover:text-red-500 hover:bg-red-50 transition-colors opacity-0 group-hover:opacity-100">
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot>
                    <tr className="bg-slate-800 text-white text-xs font-bold">
                      <td className="px-4 py-2.5 uppercase tracking-wide">Tổng cộng ({items.length} SP)</td>
                      <td className="px-3 py-2.5 text-center">
                        {items.reduce((s, i) => s + i.quantity, 0).toFixed(1).replace(/\.0$/, '')}
                      </td>
                      <td className="px-3 py-2.5"></td>
                      <td className="px-3 py-2.5 text-center text-red-300">
                        {items.some(i => i.discountAmount > 0) ? `-${formatCurrency(items.reduce((s, i) => s + i.discountAmount, 0))}` : '—'}
                      </td>
                      <td className="px-3 py-2.5 text-right">
                        {formatCurrency(items.reduce((s, i) => s + (i.quantity * i.price - i.discountAmount), 0))}
                      </td>
                      <td className="px-3 py-2.5 text-center text-emerald-400">
                        {formatCurrency(items.reduce((s, i) => s + i.commissionAmount, 0))}
                      </td>
                      <td className="px-2 py-2.5"></td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Summary & Settings */}
        <div className="lg:col-span-4 space-y-8">
          
          {/* Order Summary */}
          <div className="bg-slate-900 p-8 rounded-[40px] text-white shadow-2xl shadow-slate-900/20 relative overflow-hidden">
            <div className="relative z-10 space-y-6">
              <h2 className="text-xl font-black flex items-center gap-3">
                <Calculator className="w-6 h-6 text-red-500" />
                Tổng kết đơn hàng
              </h2>

              <div className="space-y-4">
                <div className="flex items-center justify-between text-sm font-bold text-slate-400">
                  <span>Tạm tính</span>
                  <span className="text-white">{formatCurrency(subtotal)}</span>
                </div>
                <div className="flex items-center justify-between text-sm font-bold text-slate-400">
                  <span>Phí vận chuyển</span>
                  <div className="flex items-center gap-2">
                    <input 
                      type="number"
                      min="0"
                      value={shippingFee}
                      onChange={(e) => setShippingFee(Number(e.target.value) || 0)}
                      className="w-24 px-3 py-1 bg-white/5 border-transparent focus:bg-white/10 rounded-lg text-right text-white outline-none transition-all"
                    />
                  </div>
                </div>
                <div className="flex items-center justify-between text-sm font-bold text-slate-400">
                  <span>Giảm giá</span>
                  <div className="flex items-center gap-2">
                    <input 
                      type="number"
                      min="0"
                      value={orderDiscount}
                      onChange={(e) => setOrderDiscount(Number(e.target.value) || 0)}
                      className="w-24 px-3 py-1 bg-white/5 border-transparent focus:bg-white/10 rounded-lg text-right text-red-400 outline-none transition-all"
                    />
                  </div>
                </div>
                <div className="flex items-center justify-between text-sm font-bold text-slate-400">
                  <span>Thuế (VAT 10%)</span>
                  <span className="text-white">{formatCurrency(tax)}</span>
                </div>

                <div className="flex items-center justify-between text-sm font-bold text-emerald-400 pt-2 border-t border-white/10">
                  <span>TỔNG HOA HỒNG</span>
                  <span className="font-black">{formatCurrency(items.reduce((sum, item) => sum + item.commissionAmount, 0))}</span>
                </div>
                
                <div className="h-px bg-white/10 my-6"></div>
                
                <div className="flex items-center justify-between">
                  <span className="text-lg font-black text-slate-400">TỔNG CỘNG</span>
                  <span className="text-3xl font-black text-red-500">{formatCurrency(total)}</span>
                </div>
              </div>
            </div>
            <div className="absolute -right-10 -bottom-10 opacity-10">
              <ShoppingCart className="w-48 h-48" />
            </div>
          </div>

          {/* Settings */}
          <div className="bg-white p-8 rounded-[40px] border border-slate-100 shadow-sm space-y-8">
            <div className="space-y-4">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">PHƯƠNG THỨC THANH TOÁN</label>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { id: 'cash', label: 'Tiền mặt', icon: Wallet },
                  { id: 'card', label: 'Thẻ ATM', icon: CreditCard },
                  { id: 'transfer', label: 'Chuyển khoản', icon: ArrowRight }
                ].map((method) => (
                  <button 
                    key={method.id}
                    type="button"
                    onClick={() => setPaymentMethod(method.id)}
                    className={cn(
                      "flex flex-col items-center gap-2 p-4 rounded-2xl border-2 transition-all",
                      paymentMethod === method.id
                        ? "border-red-600 bg-red-50 text-red-600" 
                        : "border-slate-50 bg-slate-50 text-slate-400 hover:border-slate-200"
                    )}
                  >
                    <method.icon className="w-5 h-5" />
                    <span className="text-[10px] font-black uppercase tracking-tighter">{method.label}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-4">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">TRẠNG THÁI ĐƠN HÀNG</label>
              <select value={orderStatus} onChange={(e) => setOrderStatus(e.target.value)} className="w-full px-5 py-4 bg-slate-50 border-transparent focus:bg-white focus:border-red-200 focus:ring-4 focus:ring-red-500/5 rounded-[24px] text-sm font-bold transition-all outline-none appearance-none cursor-pointer">
                <option value="pending">CHỜ DUYỆT</option>
                <option value="shipping">ĐANG GIAO</option>
                <option value="completed">ĐÃ GIAO</option>
                <option value="cancelled">ĐÃ HỦY</option>
              </select>
            </div>

            <div className="space-y-4">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">NHÂN VIÊN PHỤ TRÁCH</label>
              <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-[24px] border border-slate-100">
                <div className="w-10 h-10 rounded-xl bg-white shadow-sm flex items-center justify-center text-xs font-black text-slate-300">
                  AD
                </div>
                <div className="flex-1">
                  <p className="text-sm font-black text-slate-900">Admin</p>
                  <p className="text-[10px] font-bold text-slate-400">Quản trị viên</p>
                </div>
                <button className="text-red-600 text-[10px] font-black uppercase tracking-widest hover:underline">Thay đổi</button>
              </div>
            </div>

            <div className="space-y-4">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">GHI CHÚ ĐƠN HÀNG</label>
              <textarea
                rows={3}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Ghi chú thêm về đơn hàng, yêu cầu đặc biệt..."
                className="w-full px-5 py-4 bg-slate-50 border-transparent focus:bg-white focus:border-red-200 focus:ring-4 focus:ring-red-500/5 rounded-2xl text-sm font-medium transition-all outline-none resize-none"
              />
            </div>

            <div className="p-4 bg-blue-50 rounded-2xl flex gap-3">
              <Info className="w-5 h-5 text-blue-600 shrink-0" />
              <p className="text-[10px] font-bold text-blue-700 leading-relaxed">
                Đơn hàng sẽ được tự động cập nhật vào báo cáo doanh thu sau khi trạng thái chuyển sang "ĐÃ GIAO".
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
