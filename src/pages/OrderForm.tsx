import * as React from "react";
import { 
  ArrowLeft, 
  Search, 
  Plus, 
  Save, 
  User, 
  CreditCard, 
  Package,
  MapPin,
  Minus,
  Calculator,
  Info,
  X,
  Wallet,
  ArrowRight,
  AlertTriangle,
  ChevronUp,
  ChevronDown
} from "lucide-react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import { cn, formatCurrency, isAdminUser } from "../lib/utils";
import { api } from "../lib/api";
import type { OrderItem } from "../types";
import { computeOrderCollects, type ShipPayer } from "../lib/orderCollect";

type CustomerLite = { id: string; name: string; phone?: string; address?: string };
type ProductLite = { id: string; name: string; sku: string; price: number };

function joinAddressParts(parts: Array<string | null | undefined>) {
  return parts
    .map((p) => (p ?? "").trim())
    .filter(Boolean)
    .join(", ");
}

/** Phí ship / cọc: hiển thị như các dòng tiền (formatCurrency), click để nhập số */
function MoneyAmountField({
  value,
  onChange,
  className,
  inputClassName,
}: {
  value: number;
  onChange: (n: number) => void;
  className?: string;
  inputClassName?: string;
}) {
  const [editing, setEditing] = React.useState(false);
  const [draft, setDraft] = React.useState("");

  const openEdit = () => {
    setDraft(value <= 0 ? "" : String(Math.round(value)));
    setEditing(true);
  };

  if (editing) {
    return (
      <input
        type="text"
        inputMode="numeric"
        autoComplete="off"
        autoFocus
        value={draft}
        onChange={(e) => setDraft(e.target.value.replace(/\D/g, ""))}
        onBlur={() => {
          const d = draft.replace(/\D/g, "");
          onChange(d === "" ? 0 : parseInt(d, 10));
          setEditing(false);
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter") (e.target as HTMLInputElement).blur();
        }}
        className={cn(
          "min-w-[7rem] max-w-[12rem] px-2 py-0.5 border border-blue-300 rounded text-right font-medium text-slate-800 outline-none focus:ring-2 focus:ring-blue-100 tabular-nums",
          inputClassName
        )}
      />
    );
  }

  return (
    <button
      type="button"
      onClick={openEdit}
      className={cn(
        "max-w-[12rem] text-right font-medium text-slate-700 tabular-nums hover:text-slate-900 rounded px-1 py-0.5 -mr-1 hover:bg-slate-50",
        className
      )}
    >
      {formatCurrency(value)}
    </button>
  );
}

export function OrderForm() {
  const navigate = useNavigate();
  const location = useLocation();
  const { id } = useParams();
  const isEdit = Boolean(id);
  const [orderCode, setOrderCode] = React.useState<string>("");
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
      const extra = id ? `&order_id=${encodeURIComponent(String(id))}` : "";
      const res = await api.get(`/customers/suggest?q=${encodeURIComponent(q)}${extra}`);
      const data = res?.data ?? [];
      setCustomerSuggestions(data.map((c: any) => ({ id: c.id, name: c.name, phone: c.phone, address: c.address })));
    } catch {
      setCustomerSuggestions([]);
    }
  };

  const selectCustomer = async (customer: any) => {
    // Set nhanh để UI phản hồi ngay
    setSelectedCustomer(customer);
    setCustomerQuery(customer.name);
    setShowCustomerSuggestions(false);

    // Fetch đầy đủ địa chỉ để hiển thị shipping address full (số nhà + phường + quận + tỉnh)
    try {
      const extra = id ? `?order_id=${encodeURIComponent(String(id))}` : "";
      const res: any = await api.get(`/customers/${customer.id}${extra}`);
      const c = res?.data ?? res;
      const full = joinAddressParts([c?.address, c?.ward, c?.district, c?.city]);
      setSelectedCustomer((prev: any) => {
        if (!prev) return prev;
        return { ...prev, address: full || prev.address };
      });
      if (!shipmentAddressTouched) {
        setShipmentAddress(full || String(customer.address ?? "").trim() || "");
      }
    } catch {
      // ignore: giữ address lite từ suggest
    }
  };

  const addProduct = (product: any) => {
    const existing = items.find(i => i.productId === product.id);
    const defaultRate = 10;
    if (existing) {
      setItems(items.map(i => {
        if (i.productId !== product.id) return i;
        const q = parseFloat((i.quantity + 1).toFixed(1));
        const rate = Math.min(100, Math.max(0, Number(i.discountRate) || 0));
        const da = Math.round(i.price * q * (rate / 100) * 100) / 100;
        const net = i.price * q - da;
        return { ...i, quantity: q, discountAmount: da, commissionAmount: Math.round(net * (i.commissionRate / 100) * 100) / 100 };
      }));
    } else {
      const net = product.price - 0;
      setItems([...items, {
        productId: product.id,
        productName: product.name,
        sku: product.sku,
        price: product.price,
        availableStock: product.available_stock ?? 0,
        quantity: 1,
        discountRate: 0,
        discountAmount: 0,
        commissionRate: defaultRate,
        commissionAmount: Math.round(net * (defaultRate / 100) * 100) / 100
      }]);
    }
    setSearchQuery("");
    setShowResults(false);
    setProductQuery("");
  };

  const [items, setItems] = React.useState<OrderItem[]>([]);
  const [shipmentAddress, setShipmentAddress] = React.useState<string>("");
  const [shipmentAddressTouched, setShipmentAddressTouched] = React.useState(false);
  const [shippingFee, setShippingFee] = React.useState<number>(0);
  /** shop = shop trả ship (mặc định); customer = khách trả ship */
  const [shipPayer, setShipPayer] = React.useState<ShipPayer>("customer");
  const [deposit, setDeposit] = React.useState<number>(0);
  /** Tiền NV chịu — NV tự bỏ ra (không đổi công thức thu khách); API/DB: salesperson_absorbed_amount */
  const [salespersonAbsorbedAmount, setSalespersonAbsorbedAmount] = React.useState<number>(0);
  const [paymentMethod, setPaymentMethod] = React.useState<string>("cash");
  const [orderStatus, setOrderStatus] = React.useState<string>("pending");
  const [note, setNote] = React.useState<string>("");
  const [formError, setFormError] = React.useState<string>("");
  const [selectedGroupId, setSelectedGroupId] = React.useState<number | null>(null);
  const [groups, setGroups] = React.useState<any[]>([]);
  /** Tên NV bán trên đơn (`salesperson_id`) — từ API khi sửa; đơn mới = người đang đăng nhập */
  const [orderSalespersonName, setOrderSalespersonName] = React.useState<string | null>(null);

  const currentUser = React.useMemo(() => {
    const u = localStorage.getItem("user");
    return u ? JSON.parse(u) : null;
  }, []);

  /** null = HH cho người tạo đơn; có id = HH trực tiếp cho quản lý đó (source_type collaborator) */
  const [directManagerId, setDirectManagerId] = React.useState<number | null>(null);
  const [myManagers, setMyManagers] = React.useState<any[]>([]);
  /** Khi sửa đơn collaborator: đảm bảo quản lý hiện tại có trong list (kể cả ngoài nhóm — backend include_user_ids) */
  const [editIncludeManagerId, setEditIncludeManagerId] = React.useState<number | null>(null);
  const isAdmin = isAdminUser(currentUser);

  const applyLinesCommission = React.useCallback(
    (list: { id: number; commission_rate?: number }[], managerId: number | null) => {
      setItems((prev) =>
        prev.map((it) => {
          const net = it.price * it.quantity - it.discountAmount;
          if (managerId == null) {
            const r = Number(it.commissionRate) || 10;
            return {
              ...it,
              commissionRate: r,
              commissionAmount: Math.round(net * (r / 100) * 100) / 100,
            };
          }
          // Khi chọn quản lý: hoa hồng direct vẫn thuộc về người lên đơn (CTV),
          // nên giữ nguyên commissionRate từng dòng; chỉ đảm bảo tính lại commissionAmount.
          const r = Number(it.commissionRate) || 10;
          return {
            ...it,
            commissionRate: r,
            commissionAmount: Math.round(net * (r / 100) * 100) / 100,
          };
        })
      );
    },
    []
  );

  React.useEffect(() => {
    if (!id) {
      setEditIncludeManagerId(null);
      setOrderSalespersonName(null);
    }
  }, [id]);

  // Load managers:
  // - Create mode: theo user login (CTV) như cũ
  // - Edit mode: theo salesperson của đơn đang sửa (backend suy ra từ order_id)
  React.useEffect(() => {
    if (isAdmin || !selectedGroupId) {
      setMyManagers([]);
      return;
    }

    // Edit mode: bám theo order đang sửa
    if (id) {
      const qs = new URLSearchParams({ group_id: String(selectedGroupId) });
      if (editIncludeManagerId != null) {
        qs.set("include_user_ids", String(editIncludeManagerId));
      }
      api
        .get(`/orders/${id}/edit-context?${qs.toString()}`)
        .then((res: any) => {
          const data = res?.data ?? {};
          const list: any[] = Array.isArray(data?.managers) ? data.managers : [];
          setMyManagers(list);
        })
        .catch(() => setMyManagers([]));
      return;
    }

    // Create mode: theo user login
    const qs = new URLSearchParams({ group_id: String(selectedGroupId) });
    if (editIncludeManagerId != null) {
      qs.set("include_user_ids", String(editIncludeManagerId));
    }
    api
      .get(`/collaborators/my-managers?${qs.toString()}`)
      .then((res: any) => {
        const list: any[] = Array.isArray(res?.data) ? res.data : [];
        setMyManagers(list);
        if (!id) {
          const pick = list.length ? list[0].id : null;
          setDirectManagerId(pick);
          applyLinesCommission(list, pick);
        }
      })
      .catch(() => setMyManagers([]));
  }, [isAdmin, selectedGroupId, editIncludeManagerId, id, applyLinesCommission]);

  const managerOptions = React.useMemo(() => {
    return myManagers.map((m: any) => ({
      id: m.id,
      full_name: m.full_name,
      commission_rate: Number(m.commission_rate) || 10,
    }));
  }, [myManagers]);

  const applyCommissionForManager = React.useCallback(
    (mid: number | null) => {
      applyLinesCommission(managerOptions, mid);
    },
    [applyLinesCommission, managerOptions]
  );

  const [initialOrderSourceType, setInitialOrderSourceType] = React.useState<string | null>(null);

  // Warehouse state
  const [selectedWarehouseId, setSelectedWarehouseId] = React.useState<number | null>(null);
  const [warehouses, setWarehouses] = React.useState<any[]>([]);

  // Edit-mode baseline for stock validation (because current order may already be reserved)
  const [baselineWarehouseId, setBaselineWarehouseId] = React.useState<number | null>(null);
  const [baselineStatus, setBaselineStatus] = React.useState<string>("");
  const [baselineQtyByProduct, setBaselineQtyByProduct] = React.useState<Record<string, number>>({});

  // Fetch danh sách kho
  React.useEffect(() => {
    api
      .get("/warehouses")
      .then((res: any) => {
        const data = res?.data ?? res ?? [];
        const list = Array.isArray(data) ? data : [];
        setWarehouses(list);

        // Tạo mới: auto pick kho mặc định ngay khi load danh sách kho
        if (!id) {
          const pick =
            list.find((w: any) => Boolean(w?.is_active) && Boolean(w?.is_default)) ||
            list.find((w: any) => Boolean(w?.is_active));
          if (pick?.id != null) {
            const pickId = Number(pick.id);
            if (Number.isFinite(pickId)) {
              setSelectedWarehouseId((prev) => (prev == null ? pickId : prev));
            }
          }
        }
      })
      .catch(() => setWarehouses([]));
  }, [id]);

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

  // Fetch groups:
  // - Create mode: theo user login như cũ
  // - Edit mode: theo salesperson của đơn đang sửa (backend suy ra từ order_id)
  React.useEffect(() => {
    const userStr = localStorage.getItem("user");
    const user = userStr ? JSON.parse(userStr) : null;
    if (!user?.id) return;

    if (user?.can_access_admin || user?.role === "admin") {
      api
        .get("/groups")
        .then((res: any) => setGroups(res?.data ?? []))
        .catch(() => setGroups([]));
      return;
    }

    // Edit mode: lấy groups của salesperson_id của đơn
    if (id) {
      api
        .get(`/orders/${id}/edit-context`)
        .then((res: any) => {
          const data = res?.data ?? {};
          setGroups(Array.isArray(data?.groups) ? data.groups : []);
        })
        .catch(() => setGroups([]));
      return;
    }

    // Create mode: groups của user login
    api
      .get(`/groups/user/${user.id}`)
      .then((res: any) => setGroups(res?.data ?? []))
      .catch(() => setGroups([]));
  }, [id]);

  // Product suggestions
  const [productQuery, setProductQuery] = React.useState("");
  const [productSuggestions, setProductSuggestions] = React.useState<any[]>([]);
  const productInputRef = React.useRef<HTMLInputElement | null>(null);
  const fetchProductSuggestions = async (q: string) => {
    if (!q) { setProductSuggestions([]); return; }
    try {
      const wh = selectedWarehouseId ? `&warehouse_id=${selectedWarehouseId}` : '';
      const res: any = await api.get(`/products?search=${encodeURIComponent(q)}&limit=50${wh}&active_only=1`);
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
        const st = String(order?.status ?? "");
        const salesScoped = !isAdmin && currentUser?.scope_own_data !== false;
        if (salesScoped && (st === "shipping" || st === "completed")) {
          const listReturn = (location.state as { ordersListReturn?: string } | null)?.ordersListReturn;
          navigate(listReturn || "/orders", { replace: true });
          return;
        }
        const cust = {
          id: order?.customer_id ?? order?.customerId ?? '',
          name: order?.customer_name ?? order?.customerName ?? '',
          phone: order?.customer_phone ?? order?.customerPhone ?? '',
          address: order?.shipping_address ?? ''
        };
        const code = String(order?.code ?? order?.order_code ?? order?.orderCode ?? "").trim();
        setOrderCode(code);
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
        setShipmentAddressTouched(Boolean(String(order?.shipping_address ?? '').trim()));
        setShippingFee(Number(order?.shipping_fee ?? 0));
        setShipPayer(order?.ship_payer === "shop" ? "shop" : "customer");
        setDeposit(Number(order?.deposit ?? 0));
        setSalespersonAbsorbedAmount(Number(order?.salesperson_absorbed_amount ?? 0));
        setPaymentMethod(order?.payment_method ?? 'cash');
        setOrderStatus(order?.status ?? 'pending');
        setSelectedGroupId(order?.group_id ?? null);
        setInitialOrderSourceType(order?.source_type ?? "sales");
        // NEW semantics: source_type=collaborator => collaborator_user_id là quản lý được chọn
        if (!isAdmin && order?.source_type === "collaborator" && order?.collaborator_user_id != null) {
          const mid = Number(order.collaborator_user_id);
          setDirectManagerId(Number.isFinite(mid) ? mid : null);
          setEditIncludeManagerId(Number.isFinite(mid) ? mid : null);
        } else {
          setDirectManagerId(null);
          setEditIncludeManagerId(null);
        }
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
        setOrderSalespersonName(order?.salesperson_name ?? null);
      } catch (e) {
        console.error('Load order error', e);
      }
    })();
  }, [id, isAdmin, currentUser?.scope_own_data, navigate, location.state]);

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
    const shippingAddr = shipmentAddress.trim();
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

    // Cọc không được lớn hơn giá trị đơn (tạm tính sau CK dòng)
    if ((Number(deposit) || 0) > (Number(subtotal) || 0)) {
      setFormError("Tiền cọc không được lớn hơn giá trị đơn hàng");
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }

    if (!isAdmin && directManagerId != null) {
      const ok = managerOptions.some((o) => o.id === directManagerId);
      if (!ok) {
        setFormError("Quản lý nhận HH không hợp lệ — chọn lại trong danh sách");
        window.scrollTo({ top: 0, behavior: "smooth" });
        return;
      }
    }

    const itemsPayload = items.map(i => {
      const lineSub = i.quantity * i.price - i.discountAmount;
      return {
        product_id: i.productId,
        qty: i.quantity,
        unit_price: i.price,
        discount_rate: i.discountRate,
        discount_amount: i.discountAmount,
        commission_rate: i.commissionRate,
        commission_amount: i.commissionAmount,
        subtotal: i.subtotal ?? lineSub,
      };
    });
    const payload: any = {
      customer_id: selectedCustomer.id,
      warehouse_id: selectedWarehouseId,
      group_id: selectedGroupId,
      shipping_address: shippingAddr,
      carrier_service: 'standard',
      shipping_fee: shippingFee,
      ship_payer: shipPayer,
      deposit: deposit,
      salesperson_absorbed_amount: salespersonAbsorbedAmount,
      payment_method: paymentMethod,
      status: orderStatus,
      discount: 0,
      note: note,
      items: itemsPayload
    };

    if (!isAdmin) {
      payload.source_type = directManagerId != null ? "collaborator" : "sales";
      if (directManagerId != null) {
        payload.manager_salesperson_id = Number(directManagerId);
      }
    }
    try {
      let res: any;
      if (id) {
        res = await api.put(`/orders/${id}`, payload);
      } else {
        res = await api.post('/orders', payload);
      }
      const listReturn = (location.state as { ordersListReturn?: string } | null)?.ordersListReturn;
      if (res?.id && !id) {
        // Sau khi tạo mới, điều hướng sang edit để có mã đơn hàng + load lại đầy đủ dữ liệu
        navigate(`/orders/edit/${res.id}`, { state: location.state, replace: true });
      } else if (id && listReturn) {
        navigate(listReturn);
      } else {
        navigate("/orders");
      }
    } catch (e: any) {
      setFormError(e?.message || 'Lỗi khi lưu đơn hàng. Vui lòng thử lại.');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const removeItem = (productId: string) => {
    setItems(items.filter(item => item.productId !== productId));
  };

  const updateItem = React.useCallback((productId: string, patch: Partial<OrderItem>) => {
    setItems((prev) =>
      prev.map((it) => {
        if (it.productId !== productId) return it;
        const next = { ...it, ...patch } as OrderItem;
        const rate = Math.min(100, Math.max(0, Number(next.discountRate) || 0));
        const da = Math.round(next.price * next.quantity * (rate / 100) * 100) / 100;
        const withDisc = { ...next, discountRate: rate, discountAmount: da };
        const net = withDisc.price * withDisc.quantity - withDisc.discountAmount;
        const r = Number(withDisc.commissionRate) || 0;
        return {
          ...withDisc,
          commissionAmount: Math.round(net * (r / 100) * 100) / 100,
        };
      })
    );
  }, []);

  const computeStockMeta = React.useCallback(
    (item: any) => {
      const canAddBackBaseline =
        Boolean(id) &&
        selectedWarehouseId != null &&
        baselineWarehouseId != null &&
        String(selectedWarehouseId) === String(baselineWarehouseId) &&
        ["pending", "shipping"].includes(String(baselineStatus || orderStatus));
      const avail = Number(item?.availableStock ?? 0) || 0;
      const base = canAddBackBaseline ? Number(baselineQtyByProduct[String(item.productId)] ?? 0) || 0 : 0;
      const maxAllowed = avail + base;
      const overStock = Number(item.quantity) > maxAllowed;
      return { maxAllowed, overStock };
    },
    [id, selectedWarehouseId, baselineWarehouseId, baselineStatus, orderStatus, baselineQtyByProduct]
  );

  const subtotal = items.reduce((sum, item) => sum + (item.quantity * item.price - item.discountAmount), 0);
  const lineDiscountTotal = items.reduce((sum, item) => sum + item.discountAmount, 0);
  const { customerCollect, shopCollect } = React.useMemo(
    () => computeOrderCollects(subtotal, shippingFee, deposit, shipPayer),
    [subtotal, shippingFee, deposit, shipPayer]
  );

  const responsibleSalesDisplay = React.useMemo(() => {
    if (!id) {
      return currentUser?.full_name || currentUser?.username || "—";
    }
    return orderSalespersonName?.trim() || "…";
  }, [id, currentUser, orderSalespersonName]);

  const responsibleSalesInitials = React.useMemo(() => {
    const n = responsibleSalesDisplay.replace(/[.\s]+/g, " ").trim();
    if (!n || n === "…") return "?";
    const parts = n.split(/\s+/).filter(Boolean);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase().slice(0, 2);
    }
    return n.slice(0, 2).toUpperCase();
  }, [responsibleSalesDisplay]);

  /** Mobile: thanh dưới mặc định thu gọn — tránh “popup” che màn hình khi vừa vào trang */
  const [mobileSummaryExpanded, setMobileSummaryExpanded] = React.useState(false);

  return (
    <div
      className={cn(
        "max-w-6xl mx-auto",
        mobileSummaryExpanded ? "pb-32" : "pb-24",
        "sm:pb-8 lg:pb-20"
      )}
    >

      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-4 sm:mb-6">
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
              {isEdit
                ? 'Cập nhật thông tin đơn hàng và trạng thái vận chuyển.'
                : 'Đơn ghi nhận nhân viên bán hàng (sales) là người đang đăng nhập.'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 sm:justify-end">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="flex-1 sm:flex-none px-4 py-2 border border-slate-200 rounded-lg text-sm text-slate-500 hover:bg-slate-50 transition-all"
          >
            Hủy
          </button>
          <button
            type="button"
            onClick={submitOrder}
            className="hidden sm:flex items-center gap-2 px-5 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 transition-all"
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
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
              <div className="hidden sm:block">
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
                  onChange={(e) => {
                    const v = e.target.value ? Number(e.target.value) : null;
                    setSelectedGroupId(v);
                    // Khi sửa đơn: giữ include_user_ids để dropdown vẫn render quản lý đang chọn
                    if (id && directManagerId != null) setEditIncludeManagerId(directManagerId);
                  }}
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
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
                    value={shipmentAddress}
                    onChange={(e) => {
                      setShipmentAddressTouched(true);
                      setShipmentAddress(e.target.value);
                    }}
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
              <div className="relative hidden sm:block w-56">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-300" />
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
                  className="w-full pr-3 pl-9 py-1.5 border border-slate-200 rounded-lg text-sm outline-none focus:border-blue-300 focus:ring-2 focus:ring-blue-50 transition-all"
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

            {/* Mobile: Kho xuất hàng nằm cùng khu vực chọn sản phẩm */}
            <div className="sm:hidden px-4 py-3 border-b border-slate-100 bg-white">
              <label className="text-[11px] text-slate-500 mb-1 flex items-center gap-1">
                Kho xuất hàng
                <span className="bg-amber-100 text-amber-700 text-[10px] px-1.5 py-0.5 rounded font-medium">bắt buộc</span>
              </label>
              <select
                value={selectedWarehouseId ?? ""}
                onChange={(e) => setSelectedWarehouseId(e.target.value ? Number(e.target.value) : null)}
                className={cn(
                  "w-full h-10 px-3 border rounded-lg text-sm outline-none transition-all bg-white",
                  !selectedWarehouseId
                    ? "border-amber-300 focus:border-amber-400 focus:ring-2 focus:ring-amber-100"
                    : "border-slate-200 focus:border-blue-300 focus:ring-2 focus:ring-blue-50"
                )}
              >
                <option value="">— Chọn kho xuất hàng —</option>
                {warehouses.filter((w: any) => w.is_active).map((w: any) => (
                  <option key={w.id} value={w.id}>
                    {w.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Mobile product picker: 1 hàng ngang (input + nút) */}
            <div className="sm:hidden px-4 py-3 border-b border-slate-100 bg-white">
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-300" />
                  <input
                    ref={productInputRef}
                    type="text"
                    placeholder="Tìm sản phẩm..."
                    value={productQuery}
                    onChange={(e) => {
                      setProductQuery(e.target.value);
                      setShowResults(e.target.value.length > 0);
                      fetchProductSuggestions(e.target.value);
                    }}
                    onFocus={() => {
                      if (productQuery.length > 0) setShowResults(true);
                    }}
                    className="w-full h-10 pl-10 pr-3 border border-slate-200 rounded-lg text-sm outline-none focus:border-blue-300 focus:ring-2 focus:ring-blue-50 transition-all bg-white"
                  />
                  {showResults && (
                    <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-100 rounded-lg shadow-lg z-50 overflow-hidden">
                      <div className="max-h-64 overflow-y-auto">
                        {productSuggestions.length > 0 ? (
                          productSuggestions.map((product) => (
                            <button
                              key={product.id}
                              onClick={() => addProduct(product)}
                              className="w-full px-4 py-3 flex items-center justify-between hover:bg-slate-50 transition-colors text-left border-b border-slate-50 last:border-0"
                            >
                              <div className="min-w-0">
                                <p className="text-sm font-medium text-slate-800 truncate">{product.name}</p>
                                <p className="text-[10px] text-slate-400 uppercase tracking-wide font-mono">{product.sku}</p>
                              </div>
                              <div className="text-right flex-shrink-0 pl-3">
                                <p className="text-sm font-semibold text-slate-800">{formatCurrency(product.price)}</p>
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

                <button
                  type="button"
                  onClick={() => {
                    productInputRef.current?.focus();
                    setShowResults(true);
                    if (productQuery.length > 0) fetchProductSuggestions(productQuery);
                  }}
                  className="h-10 w-10 rounded-lg border border-slate-200 bg-white flex items-center justify-center text-green-700 hover:bg-green-50 hover:border-green-200 transition-colors"
                  aria-label="Mở tìm sản phẩm"
                >
                  <Plus className="w-5 h-5" />
                </button>
              </div>
            </div>

            {!isAdmin && (
              <div className="px-5 py-3 border-b border-slate-100 bg-slate-50/70">
                <label className="mb-1.5 block text-[11px] font-medium text-slate-600">
                  Quản lý (nhận HH trực tiếp)
                </label>
                <select
                  value={directManagerId ?? ""}
                  onChange={(e) => {
                    const raw = e.target.value;
                    const mid = raw === "" ? null : Number(raw);
                    setDirectManagerId(mid);
                    if (id) setEditIncludeManagerId(mid);
                    applyCommissionForManager(mid);
                  }}
                  className="w-full max-w-md rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none focus:border-green-400 focus:ring-2 focus:ring-green-50"
                >
                  <option value="">— Tôi nhận HH (người tạo đơn) —</option>
                  {managerOptions.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.full_name}
                    </option>
                  ))}
                </select>
                <p className="mt-1.5 text-[10px] text-slate-400 leading-relaxed">
                  Mặc định: quản lý trực tiếp đầu tiên trong danh sách. Để trống “Tôi nhận HH”: đơn bán trực tiếp (HH thuộc người tạo đơn). Chọn quản lý: đơn ghi nhận quản lý là người bán (HH trực tiếp thuộc quản lý).
                </p>
              </div>
            )}

            {items.length === 0 ? (
              <div className="py-12 text-center text-slate-400">
                <Package className="w-7 h-7 mx-auto mb-2 text-slate-200" />
                <p className="text-sm">Chưa có sản phẩm. Tìm và thêm bên trên.</p>
              </div>
            ) : (
              <>
                {/* Mobile: 1 dòng / 1 sản phẩm (dạng bảng, cuộn ngang nếu cần) */}
                <div className="block sm:hidden">
                  <div className="overflow-x-auto">
                    <div className="min-w-[920px]">
                      <div className="sticky top-0 z-10 px-4 pt-3 pb-2 border-b border-slate-100 bg-slate-50">
                        <div className="flex gap-3 text-[11px] font-semibold text-slate-600 uppercase tracking-wide">
                          <div className="w-[260px]">Sản phẩm</div>
                          <div className="w-[190px] text-center">Số lượng</div>
                          <div className="w-[140px] text-right">Đơn giá</div>
                          <div className="w-[90px] text-center">CK%</div>
                          <div className="w-[90px] text-center">HH%</div>
                          <div className="w-[120px] text-right">Thành tiền</div>
                          <div className="w-[30px]"></div>
                        </div>
                      </div>

                      <div className="px-4 py-2 divide-y divide-slate-100">
                      {items.map((item) => {
                        const { maxAllowed, overStock } = computeStockMeta(item as any);
                        const lineTotal = item.quantity * item.price - item.discountAmount;
                        return (
                          <div
                            key={item.productId}
                            className={cn(
                              "flex items-center gap-3 py-2.5",
                              overStock ? "bg-red-50/40" : ""
                            )}
                          >
                            <div className="w-[260px] min-w-0">
                              <p className="text-[13px] font-semibold text-slate-800 truncate">{item.productName}</p>
                              <p className="mt-0.5 text-[10px] text-slate-400 font-mono uppercase tracking-wide truncate">{item.sku}</p>
                              <p className={cn("mt-0.5 text-[10px]", overStock ? "text-red-600 font-medium" : "text-slate-500")}>
                                Có thể bán: {maxAllowed.toFixed(3).replace(/\.?0+$/, "")}
                                {overStock && <span className="ml-1">— Vượt tồn</span>}
                              </p>
                            </div>

                            <div className="w-[190px]">
                              <div className="flex items-center justify-center gap-2">
                                <button
                                  type="button"
                                  onClick={() => {
                                    const v = Math.max(0.1, parseFloat((item.quantity - 1).toFixed(1)));
                                    updateItem(item.productId, { quantity: v });
                                  }}
                                  className="w-8 h-8 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-slate-600"
                                >
                                  <Minus className="w-4 h-4" />
                                </button>
                                <input
                                  type="number"
                                  min={0.1}
                                  step={0.1}
                                  value={item.quantity}
                                  onChange={(e) => {
                                    const raw = parseFloat(parseFloat(e.target.value).toFixed(1));
                                    const v = Number.isFinite(raw) && raw > 0 ? raw : 0.1;
                                    updateItem(item.productId, { quantity: v });
                                  }}
                                  className={cn(
                                    "w-20 h-8 rounded-lg border px-2 text-center text-[13px] font-semibold outline-none",
                                    overStock
                                      ? "border-red-300 bg-red-50 text-red-700 focus:ring-2 focus:ring-red-100"
                                      : "border-slate-200 bg-white text-slate-800 focus:ring-2 focus:ring-blue-50"
                                  )}
                                />
                                <button
                                  type="button"
                                  onClick={() => {
                                    const v = parseFloat((item.quantity + 1).toFixed(1));
                                    updateItem(item.productId, { quantity: v });
                                  }}
                                  className="w-8 h-8 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-slate-600"
                                >
                                  <Plus className="w-4 h-4" />
                                </button>
                              </div>
                            </div>

                            <div className="w-[140px]">
                              <input
                                type="number"
                                min={0}
                                value={item.price}
                                onChange={(e) => {
                                  const p = Math.max(0, Number(e.target.value) || 0);
                                  updateItem(item.productId, { price: p });
                                }}
                                className="w-full h-8 rounded-lg border border-slate-200 bg-white px-2 text-right text-[13px] font-semibold text-slate-800 outline-none focus:ring-2 focus:ring-blue-50"
                              />
                            </div>

                            <div className="w-[90px] flex justify-center">
                              <input
                                type="number"
                                min={0}
                                max={100}
                                value={item.discountRate}
                                onChange={(e) => {
                                  const r = Math.min(100, Math.max(0, Number(e.target.value) || 0));
                                  updateItem(item.productId, { discountRate: r });
                                }}
                                className="w-16 h-8 rounded-lg border border-rose-200 bg-rose-50 px-2 text-center text-[13px] font-semibold text-rose-800 outline-none focus:ring-2 focus:ring-rose-100"
                              />
                            </div>

                            <div className="w-[90px] flex justify-center">
                              <input
                                type="number"
                                min={0}
                                max={100}
                                value={item.commissionRate}
                                onChange={(e) => {
                                  const r = Math.min(100, Math.max(0, Number(e.target.value) || 0));
                                  updateItem(item.productId, { commissionRate: r });
                                }}
                                className="w-16 h-8 rounded-lg border border-green-200 bg-green-50 px-2 text-center text-[13px] font-semibold text-green-800 outline-none focus:ring-2 focus:ring-green-100"
                              />
                            </div>

                            <div className="w-[120px] text-right">
                              <p className="text-[13px] font-semibold text-slate-900">{formatCurrency(lineTotal)}</p>
                              <p className="mt-0.5 text-[10px] font-semibold text-green-700">
                                HH: {formatCurrency(item.commissionAmount)}
                              </p>
                            </div>

                            <div className="w-[30px] flex justify-end">
                              <button
                                type="button"
                                onClick={() => removeItem(item.productId)}
                                className="w-8 h-8 rounded-lg border border-slate-200 flex items-center justify-center text-slate-400 hover:text-red-600 hover:border-red-200 hover:bg-red-50 transition-colors"
                                aria-label="Xóa sản phẩm"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                      {/* Mobile: tổng dòng (khớp desktop tfoot — có tổng CK, không VAT) */}
                      <div className="flex gap-3 items-center py-2.5 border-t border-slate-200 bg-slate-50 text-[11px]">
                        <div className="w-[260px] shrink-0 font-semibold text-slate-600">
                          Giá trị đơn ({items.length} SP)
                        </div>
                        <div className="w-[190px] shrink-0 text-center font-medium text-slate-700">
                          {items.reduce((s, i) => s + i.quantity, 0).toFixed(1).replace(/\.0$/, "")}
                        </div>
                        <div className="w-[140px] shrink-0" />
                        <div className="w-[90px] shrink-0 text-center text-red-600 font-medium tabular-nums">
                          {lineDiscountTotal > 0 ? `-${formatCurrency(lineDiscountTotal)}` : "—"}
                        </div>
                        <div className="w-[90px] shrink-0" />
                        <div className="w-[120px] shrink-0 text-right">
                          <p className="text-[13px] font-semibold text-slate-800">{formatCurrency(subtotal)}</p>
                          <p className="mt-0.5 text-[10px] font-semibold text-green-700">
                            HH: {formatCurrency(items.reduce((s, i) => s + i.commissionAmount, 0))}
                          </p>
                        </div>
                        <div className="w-[30px] shrink-0" />
                      </div>
                    </div>
                  </div>
                </div>
                </div>

                {/* Desktop/tablet: table như cũ */}
                <div className="hidden sm:block overflow-x-auto">
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
                      const { maxAllowed, overStock } = computeStockMeta(item as any);
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
                                  updateItem(item.productId, { quantity: v });
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
                                  updateItem(item.productId, { quantity: v });
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
                                  updateItem(item.productId, { quantity: v });
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
                                updateItem(item.productId, { price: p });
                              }}
                              className="w-full h-6 px-2 bg-transparent border border-transparent hover:border-slate-200 focus:bg-white focus:border-blue-300 rounded text-right text-xs font-medium text-slate-700 outline-none focus:ring-1 focus:ring-blue-100 transition-colors"
                            />
                          </td>
                          <td className="px-2 py-2.5">
                            <div className="flex items-center justify-center gap-1">
                              <input
                                type="number" min={0} max={100}
                                value={item.discountRate}
                                onChange={(e) => {
                                  const r = Math.min(100, Math.max(0, Number(e.target.value) || 0));
                                  updateItem(item.productId, { discountRate: r });
                                }}
                                className="w-14 h-8 min-w-[3.5rem] px-1.5 bg-rose-50 border border-transparent hover:border-rose-200 focus:bg-white focus:border-rose-400 rounded-md text-center text-sm font-semibold text-rose-800 outline-none focus:ring-2 focus:ring-rose-100 transition-colors"
                              />
                              <span className="text-rose-500 text-xs font-semibold">%</span>
                            </div>
                          </td>
                          <td className="px-3 py-2.5 text-right">
                            <span className="font-medium text-slate-900 text-xs">{formatCurrency(lineTotal)}</span>
                          </td>
                          <td className="px-3 py-2.5">
                            <div className="flex flex-col items-center gap-0.5">
                              <>
                                <div className="flex items-center gap-1 justify-center">
                                  <input
                                    type="number" min={0} max={100}
                                    value={item.commissionRate}
                                    onChange={(e) => {
                                      const r = Math.min(100, Math.max(0, Number(e.target.value) || 0));
                                      updateItem(item.productId, { commissionRate: r });
                                    }}
                                    className="w-14 h-8 min-w-[3.5rem] px-1.5 bg-green-50 border border-transparent hover:border-green-200 focus:bg-white focus:border-green-400 rounded-md text-center text-sm font-semibold text-green-700 outline-none focus:ring-2 focus:ring-green-100 transition-colors"
                                  />
                                  <span className="text-green-600 text-xs font-semibold">%</span>
                                </div>
                                <span className="text-green-600 text-[10px] font-medium">{formatCurrency(item.commissionAmount)}</span>
                              </>
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
                      <td className="px-4 py-2 text-slate-500 font-medium">Giá trị đơn ({items.length} SP)</td>
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
              </>
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
                <div className="min-w-0 pr-2">
                  <span className="text-slate-400">Mã ĐH</span>
                  {!isEdit && (
                    <p className="text-[10px] text-slate-400 mt-0.5 leading-tight">Lưu đơn để tạo mã</p>
                  )}
                </div>
                <span className="font-medium text-slate-800">{isEdit ? (orderCode || `#${id}`) : "—"}</span>
              </div>
              <div className="flex items-center justify-between py-1.5 border-b border-slate-50 text-sm">
                <span className="text-slate-400">Tổng CK</span>
                <span className="font-medium text-red-600">
                  {lineDiscountTotal > 0 ? `-${formatCurrency(lineDiscountTotal)}` : "—"}
                </span>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-slate-100">
                <div>
                  <span className="text-sm font-semibold text-slate-700">Giá trị đơn</span>
                  <p className="text-[10px] text-slate-400 mt-0.5">Tổng sau chiết khấu dòng</p>
                </div>
                <span className="text-xl font-semibold text-red-600 tabular-nums">{formatCurrency(subtotal)}</span>
              </div>
              <div className="flex items-center justify-between py-1.5 border-b border-slate-50 text-sm gap-2">
                <span className="text-slate-400 shrink-0">Phí vận chuyển</span>
                <MoneyAmountField value={shippingFee} onChange={setShippingFee} className="text-sm" />
              </div>
              <div className="py-1.5 border-b border-slate-50">
                <span className="text-slate-400 text-sm block mb-1.5">Phí ship do</span>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setShipPayer("shop")}
                    className={cn(
                      "py-2 rounded-lg text-xs font-medium border transition-colors",
                      shipPayer === "shop"
                        ? "border-amber-400 bg-amber-50 text-amber-900"
                        : "border-slate-200 bg-slate-50 text-slate-600 hover:border-slate-300"
                    )}
                  >
                    Shop trả
                  </button>
                  <button
                    type="button"
                    onClick={() => setShipPayer("customer")}
                    className={cn(
                      "py-2 rounded-lg text-xs font-medium border transition-colors",
                      shipPayer === "customer"
                        ? "border-amber-400 bg-amber-50 text-amber-900"
                        : "border-slate-200 bg-slate-50 text-slate-600 hover:border-slate-300"
                    )}
                  >
                    Khách trả
                  </button>
                </div>
              </div>
              <div className="flex items-center justify-between py-1.5 border-b border-slate-50 text-sm gap-2">
                <span className="text-slate-400 shrink-0">Đặt cọc</span>
                <MoneyAmountField value={deposit} onChange={setDeposit} className="text-sm" />
              </div>
              <div className="flex items-center justify-between py-1.5 border-b border-slate-50 text-sm gap-2">
                <div className="min-w-0 pr-2">
                  <span className="text-slate-400">Tiền NV chịu</span>
                  <p className="text-[10px] text-slate-400 mt-0.5 leading-tight">NV tự bỏ ra, trừ vào Lương</p>
                </div>
                <MoneyAmountField value={salespersonAbsorbedAmount} onChange={setSalespersonAbsorbedAmount} className="text-sm" />
              </div>
              <div className="flex items-center justify-between py-1.5 border-b border-slate-50 text-sm">
                <span className="text-slate-400">Thu khách</span>
                <span className="font-medium text-slate-800">{formatCurrency(customerCollect)}</span>
              </div>
              <div className="flex items-center justify-between py-1.5 border-b border-slate-50 text-sm">
                <span className="text-slate-400">Shop thu</span>
                <span className="font-medium text-indigo-700">{formatCurrency(shopCollect)}</span>
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
                <div className="w-7 h-7 rounded-full bg-blue-50 flex items-center justify-center text-[10px] font-semibold text-blue-600 flex-shrink-0">
                  {responsibleSalesInitials}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-800 truncate">{responsibleSalesDisplay}</p>
                  <p className="text-[10px] text-slate-400">Nhân viên bán hàng (sales) — người lên đơn</p>
                </div>
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
            className="hidden lg:flex w-full items-center justify-center gap-2 py-2.5 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 transition-all"
          >
            <Save className="w-4 h-4" />
            {isEdit ? 'Cập nhật đơn hàng' : 'Hoàn tất & Xuất kho'}
          </button>
        </div>
      </div>

      {/* Mobile sticky: mặc định 1 dòng — bấm mở mới thấy đủ ship/cọc/NV chịu (tránh khối lớn như popup khi load) */}
      <div className="fixed bottom-0 left-0 right-0 z-40 sm:hidden pb-[env(safe-area-inset-bottom,0px)]">
        <div className="mx-auto max-w-6xl px-3 pb-3">
          {!mobileSummaryExpanded ? (
            <div className="rounded-xl border border-slate-200 bg-white/95 backdrop-blur shadow-md flex items-stretch gap-2 px-2 py-2">
              <button
                type="button"
                onClick={() => setMobileSummaryExpanded(true)}
                className="flex-1 min-w-0 text-left pl-1 py-0.5 rounded-lg hover:bg-slate-50 transition-colors"
              >
                <div className="text-[10px] text-slate-500">Thu khách</div>
                <div className="text-base font-semibold text-slate-900 tabular-nums leading-tight">
                  {formatCurrency(customerCollect)}
                </div>
                <div className="text-[9px] text-slate-400 mt-0.5">Chạm để xem phí ship, cọc, HH…</div>
              </button>
              <button
                type="button"
                onClick={() => setMobileSummaryExpanded(true)}
                className="shrink-0 w-10 flex items-center justify-center rounded-lg border border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100"
                aria-label="Mở tổng kết chi tiết"
              >
                <ChevronUp className="w-5 h-5" />
              </button>
              <button
                type="button"
                onClick={submitOrder}
                className="shrink-0 flex flex-col items-center justify-center gap-0.5 px-4 py-2 bg-red-600 text-white rounded-lg text-xs font-semibold hover:bg-red-700 transition-all min-w-[5.5rem]"
              >
                <Save className="w-4 h-4" />
                {isEdit ? "Lưu" : "Lưu đơn"}
              </button>
            </div>
          ) : (
            <div className="rounded-xl border border-slate-200 bg-white/95 backdrop-blur shadow-lg max-h-[min(70vh,520px)] overflow-y-auto">
              <div className="flex items-center justify-between px-3 py-2 border-b border-slate-100 bg-slate-50/80">
                <span className="text-xs font-semibold text-slate-600">Tổng kết đơn</span>
                <button
                  type="button"
                  onClick={() => setMobileSummaryExpanded(false)}
                  className="flex items-center gap-1 text-[11px] text-slate-500 hover:text-slate-800 py-1 px-2 rounded-lg hover:bg-slate-100"
                >
                  <ChevronDown className="w-4 h-4" />
                  Thu gọn
                </button>
              </div>
              <div className="px-3 py-2 border-b border-slate-100 space-y-1.5">
                <div className="flex items-center justify-between text-[10px]">
                  <span className="text-slate-500">Mã ĐH</span>
                  <span className="font-medium text-slate-800">{isEdit ? (orderCode || `#${id}`) : "—"}</span>
                </div>
                {!isEdit && <div className="text-[9px] text-slate-400 -mt-0.5">Lưu đơn để tạo mã</div>}
                <div className="flex items-center justify-between text-[10px]">
                  <span className="text-slate-500">Tổng CK</span>
                  <span className="font-medium text-red-600">
                    {lineDiscountTotal > 0 ? `-${formatCurrency(lineDiscountTotal)}` : "—"}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-2 pt-0.5 border-b border-slate-50 pb-1.5">
                  <div>
                    <span className="text-[10px] font-semibold text-slate-700">Giá trị đơn</span>
                    <p className="text-[9px] text-slate-400">Sau CK dòng</p>
                  </div>
                  <span className="text-base font-semibold text-red-600 tabular-nums">{formatCurrency(subtotal)}</span>
                </div>
                <div className="flex items-center justify-between gap-2 text-[10px]">
                  <span className="text-slate-500 shrink-0">Phí ship</span>
                  <MoneyAmountField
                    value={shippingFee}
                    onChange={setShippingFee}
                    className="text-[11px]"
                    inputClassName="text-[11px] py-1"
                  />
                </div>
                <div className="grid grid-cols-2 gap-1.5">
                  <button
                    type="button"
                    onClick={() => setShipPayer("shop")}
                    className={cn(
                      "py-1.5 rounded-lg text-[10px] font-medium border",
                      shipPayer === "shop"
                        ? "border-amber-400 bg-amber-50 text-amber-900"
                        : "border-slate-200 bg-slate-50 text-slate-600"
                    )}
                  >
                    Shop trả ship
                  </button>
                  <button
                    type="button"
                    onClick={() => setShipPayer("customer")}
                    className={cn(
                      "py-1.5 rounded-lg text-[10px] font-medium border",
                      shipPayer === "customer"
                        ? "border-amber-400 bg-amber-50 text-amber-900"
                        : "border-slate-200 bg-slate-50 text-slate-600"
                    )}
                  >
                    Khách trả ship
                  </button>
                </div>
                <div className="flex items-center justify-between gap-2 text-[10px]">
                  <span className="text-slate-500 shrink-0">Đặt cọc</span>
                  <MoneyAmountField
                    value={deposit}
                    onChange={setDeposit}
                    className="text-[11px]"
                    inputClassName="text-[11px] py-1"
                  />
                </div>
                <div className="flex items-center justify-between gap-2 text-[10px]">
                  <span className="text-slate-500 shrink-0">Tiền NV chịu</span>
                  <MoneyAmountField
                    value={salespersonAbsorbedAmount}
                    onChange={setSalespersonAbsorbedAmount}
                    className="text-[11px]"
                    inputClassName="text-[11px] py-1"
                  />
                </div>
                <div className="flex items-center justify-between text-[10px]">
                  <span className="text-slate-500">Thu khách</span>
                  <span className="font-semibold text-slate-800">{formatCurrency(customerCollect)}</span>
                </div>
                <div className="flex items-center justify-between text-[10px]">
                  <span className="text-slate-500">Shop thu</span>
                  <span className="font-semibold text-indigo-700">{formatCurrency(shopCollect)}</span>
                </div>
                <div className="flex items-center justify-between text-[10px] pb-0.5">
                  <span className="text-slate-500">Hoa hồng</span>
                  <span className="font-semibold text-green-700">
                    {formatCurrency(items.reduce((sum, item) => sum + item.commissionAmount, 0))}
                  </span>
                </div>
              </div>
              <div className="p-3">
                <button
                  type="button"
                  onClick={submitOrder}
                  className="w-full flex items-center justify-center gap-2 py-3 bg-red-600 text-white rounded-lg text-sm font-semibold hover:bg-red-700 transition-all"
                >
                  <Save className="w-4 h-4" />
                  {isEdit ? "Cập nhật đơn hàng" : "Hoàn tất & Xuất kho"}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
