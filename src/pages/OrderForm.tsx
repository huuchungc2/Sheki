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
  ArrowRight
} from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import { cn, formatCurrency } from "../lib/utils";
import type { OrderItem, Order } from "../types";

export function OrderForm() {
  const navigate = useNavigate();
  const { id } = useParams();
  const [isEdit] = React.useState(!!id);
  const [searchQuery, setSearchQuery] = React.useState("");
  const [showResults, setShowResults] = React.useState(false);
  const [customerSearch, setCustomerSearch] = React.useState("Lê Hoàng");
  const [showCustomerResults, setShowCustomerResults] = React.useState(false);

  const mockCustomers = [
    { id: "C001", name: "Lê Hoàng", phone: "090 123 4567", initials: "LH", address: "123 Đường ABC, Phường 4, Quận 3, TP. Hồ Chí Minh" },
    { id: "C002", name: "Nguyễn Anh", phone: "091 999 8888", initials: "NA", address: "456 Đường XYZ, Quận 1, TP. Hồ Chí Minh" },
    { id: "C003", name: "Minh Tú", phone: "088 222 3333", initials: "MT", address: "789 Đường DEF, Quận 7, TP. Hồ Chí Minh" },
  ];

  const [selectedCustomer, setSelectedCustomer] = React.useState(mockCustomers[0]);

  const filteredCustomers = mockCustomers.filter(c => 
    c.name.toLowerCase().includes(customerSearch.toLowerCase()) || 
    c.phone.includes(customerSearch)
  );

  const selectCustomer = (customer: any) => {
    setSelectedCustomer(customer);
    setCustomerSearch(customer.name);
    setShowCustomerResults(false);
  };

  const mockProducts = [
    { id: "P003", name: "Áo Polo Nam", sku: "PL-003", price: 350000 },
    { id: "PROD001", name: "Áo thun Cotton Basic", sku: "TS-001", price: 250000 },
    { id: "PROD002", name: "Quần Jean Slimfit", sku: "JN-002", price: 550000 },
  ];

  const filteredProducts = mockProducts.filter(p => 
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    p.sku.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const addProduct = (product: any) => {
    const existing = items.find(i => i.productId === product.id);
    if (existing) {
      setItems(items.map(i => i.productId === product.id ? { ...i, quantity: i.quantity + 1 } : i));
    } else {
      setItems([...items, {
        productId: product.id,
        productName: product.name,
        sku: product.sku,
        price: product.price,
        quantity: 1,
        discountRate: 0,
        discountAmount: 0,
        commissionRate: 5,
        commissionAmount: product.price * 0.05
      }]);
    }
    setSearchQuery("");
    setShowResults(false);
  };

  const [items, setItems] = React.useState<OrderItem[]>([
    { 
      productId: "P001", 
      productName: "Áo thun Cotton Basic", 
      sku: "TS-001", 
      price: 250000, 
      quantity: 2, 
      discountRate: 0,
      discountAmount: 0,
      commissionRate: 5, 
      commissionAmount: 25000 
    },
    { 
      productId: "P002", 
      productName: "Quần Jean Slimfit", 
      sku: "JN-002", 
      price: 550000, 
      quantity: 1, 
      discountRate: 0,
      discountAmount: 0,
      commissionRate: 5, 
      commissionAmount: 27500 
    },
  ]);

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

  const subtotal = items.reduce((sum, item) => sum + (item.quantity * item.price - item.discountAmount), 0);
  const shippingFee = 30000;
  const discount = 50000;
  const tax = subtotal * 0.1;
  const total = subtotal + shippingFee + tax - discount;

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
          <button className="px-6 py-3 bg-white border border-slate-200 rounded-2xl text-sm font-bold text-slate-600 hover:bg-slate-50 transition-all shadow-sm">
            Lưu bản nháp
          </button>
          <button className="flex items-center gap-2 px-8 py-3 bg-red-600 text-white rounded-2xl text-sm font-black hover:bg-red-700 transition-all shadow-xl shadow-red-600/20">
            <Save className="w-5 h-5" />
            {isEdit ? "Cập nhật đơn hàng" : "Hoàn tất & Xuất kho"}
          </button>
        </div>
      </div>

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
              <button className="text-red-600 text-xs font-black uppercase tracking-widest hover:underline">Chọn khách hàng khác</button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-4">
                <div className="relative">
                  <Search className="w-4 h-4 absolute right-4 top-1/2 -translate-y-1/2 text-slate-300" />
                  <input 
                    type="text" 
                    placeholder="Tìm theo tên hoặc SĐT..." 
                    value={customerSearch}
                    onChange={(e) => {
                      setCustomerSearch(e.target.value);
                      setShowCustomerResults(e.target.value.length > 0);
                    }}
                    onFocus={() => customerSearch.length > 0 && setShowCustomerResults(true)}
                    className="w-full px-5 py-4 bg-slate-50 border-transparent focus:bg-white focus:border-red-200 focus:ring-4 focus:ring-red-500/5 rounded-[24px] text-sm transition-all outline-none font-medium"
                  />
                  {showCustomerResults && (
                    <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl border border-slate-100 shadow-2xl z-50 overflow-hidden">
                      <div className="max-h-60 overflow-y-auto">
                        {filteredCustomers.length > 0 ? (
                          filteredCustomers.map(customer => (
                            <button
                              key={customer.id}
                              onClick={() => selectCustomer(customer)}
                              className="w-full px-6 py-4 flex items-center gap-4 hover:bg-slate-50 transition-colors text-left border-b border-slate-50 last:border-0"
                            >
                              <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-xs font-bold text-slate-500">
                                {customer.initials}
                              </div>
                              <div>
                                <p className="text-sm font-black text-slate-900">{customer.name}</p>
                                <p className="text-[10px] font-bold text-slate-400">{customer.phone}</p>
                              </div>
                            </button>
                          ))
                        ) : (
                          <div className="px-6 py-8 text-center text-slate-400 text-sm font-bold">
                            Không tìm thấy khách hàng
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-[24px] border border-slate-100">
                  <div className="w-14 h-14 rounded-2xl bg-white shadow-sm flex items-center justify-center text-xl font-black text-slate-300">
                    {selectedCustomer.initials}
                  </div>
                  <div>
                    <p className="text-base font-black text-slate-900">{selectedCustomer.name}</p>
                    <p className="text-sm font-bold text-slate-400">{selectedCustomer.phone}</p>
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
                      value={selectedCustomer.address}
                      onChange={(e) => setSelectedCustomer({ ...selectedCustomer, address: e.target.value })}
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
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setShowResults(e.target.value.length > 0);
                  }}
                  onFocus={() => searchQuery.length > 0 && setShowResults(true)}
                  className="w-full px-5 py-3 bg-slate-50 border-transparent focus:bg-white focus:border-blue-200 focus:ring-4 focus:ring-blue-500/5 rounded-2xl text-sm transition-all outline-none font-medium"
                />

                {showResults && (
                  <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl border border-slate-100 shadow-2xl z-50 overflow-hidden">
                    <div className="max-h-60 overflow-y-auto">
                      {filteredProducts.length > 0 ? (
                        filteredProducts.map(product => (
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
                              <p className="text-sm font-black text-red-600">{formatCurrency(product.price)}</p>
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

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/50">
                    <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">SẢN PHẨM</th>
                    <th className="px-4 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">SỐ LƯỢNG</th>
                    <th className="px-4 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">ĐƠN GIÁ</th>
                    <th className="px-4 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">CHIẾT KHẤU (%)</th>
                    <th className="px-4 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">THÀNH TIỀN</th>
                    <th className="px-4 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">HOA HỒNG (%)</th>
                    <th className="px-8 py-4 w-10"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {items.map((item, index) => (
                    <tr key={item.productId} className="group">
                      <td className="px-8 py-6">
                        <div className="flex items-center gap-4">
                          <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-300">
                            <Package className="w-6 h-6" />
                          </div>
                          <div>
                            <p className="text-sm font-black text-slate-900">{item.productName}</p>
                            <p className="text-[10px] font-bold text-slate-400 tracking-tighter uppercase">{item.sku}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-6">
                        <div className="flex items-center justify-center gap-3 bg-slate-50 p-1.5 rounded-2xl w-32 mx-auto">
                          <button 
                            onClick={() => updateQuantity(item.productId, -1)}
                            className="w-8 h-8 rounded-xl bg-white shadow-sm flex items-center justify-center text-slate-400 hover:text-red-600 transition-all"
                          >
                            <Minus className="w-4 h-4" />
                          </button>
                          <span className="text-sm font-black text-slate-900">{item.quantity}</span>
                          <button 
                            onClick={() => updateQuantity(item.productId, 1)}
                            className="w-8 h-8 rounded-xl bg-white shadow-sm flex items-center justify-center text-slate-400 hover:text-red-600 transition-all"
                          >
                            <Plus className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                      <td className="px-4 py-6">
                        <p className="text-sm font-black text-slate-900">{formatCurrency(item.price)}</p>
                      </td>
                      <td className="px-4 py-6">
                        <div className="relative w-20 mx-auto">
                          <input 
                            type="number" 
                            value={item.discountRate}
                            onChange={(e) => updateDiscount(item.productId, Number(e.target.value))}
                            className="w-full px-3 py-2 bg-slate-50 border-transparent focus:bg-white focus:border-red-200 rounded-xl text-sm font-black text-center outline-none transition-all"
                          />
                          <p className="text-[10px] font-bold text-slate-400 mt-1 text-center">{formatCurrency(item.discountAmount)}</p>
                        </div>
                      </td>
                      <td className="px-4 py-6 text-right">
                        <p className="text-sm font-black text-slate-900">{formatCurrency(item.quantity * item.price - item.discountAmount)}</p>
                      </td>
                      <td className="px-4 py-6">
                        <div className="relative w-20 mx-auto">
                          <input 
                            type="number" 
                            value={item.commissionRate}
                            onChange={(e) => updateCommission(item.productId, Number(e.target.value))}
                            className="w-full px-3 py-2 bg-slate-50 border-transparent focus:bg-white focus:border-emerald-200 rounded-xl text-sm font-black text-center outline-none transition-all"
                          />
                          <p className="text-[10px] font-bold text-emerald-500 mt-1 text-center">{formatCurrency(item.commissionAmount)}</p>
                        </div>
                      </td>
                      <td className="px-8 py-6">
                        <button 
                          onClick={() => removeItem(item.productId)}
                          className="p-2 text-slate-300 hover:text-red-600 transition-colors"
                        >
                          <X className="w-5 h-5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-slate-900 text-white font-black">
                  <tr>
                    <td className="px-8 py-4 text-xs uppercase tracking-widest">TỔNG CỘNG</td>
                    <td className="px-4 py-4 text-center text-sm">
                      {items.reduce((sum, item) => sum + item.quantity, 0)}
                    </td>
                    <td className="px-4 py-4"></td>
                    <td className="px-4 py-4 text-center text-sm">
                      {formatCurrency(items.reduce((sum, item) => sum + item.discountAmount, 0))}
                    </td>
                    <td className="px-4 py-4 text-right text-sm">
                      {formatCurrency(items.reduce((sum, item) => sum + (item.quantity * item.price - item.discountAmount), 0))}
                    </td>
                    <td className="px-4 py-4 text-center text-sm text-emerald-400">
                      {formatCurrency(items.reduce((sum, item) => sum + item.commissionAmount, 0))}
                    </td>
                    <td className="px-8 py-4"></td>
                  </tr>
                </tfoot>
              </table>
            </div>
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
                      type="text" 
                      defaultValue={shippingFee}
                      className="w-24 px-3 py-1 bg-white/5 border-transparent focus:bg-white/10 rounded-lg text-right text-white outline-none transition-all"
                    />
                  </div>
                </div>
                <div className="flex items-center justify-between text-sm font-bold text-slate-400">
                  <span>Giảm giá</span>
                  <div className="flex items-center gap-2">
                    <input 
                      type="text" 
                      defaultValue={discount}
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
                    className={cn(
                      "flex flex-col items-center gap-2 p-4 rounded-2xl border-2 transition-all",
                      method.id === 'cash' 
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
              <select className="w-full px-5 py-4 bg-slate-50 border-transparent focus:bg-white focus:border-red-200 focus:ring-4 focus:ring-red-500/5 rounded-[24px] text-sm font-bold transition-all outline-none appearance-none cursor-pointer">
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
