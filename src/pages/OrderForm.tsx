import * as React from "react";
import { 
  ArrowLeft, 
  Search, 
  Plus, 
  Save, 
  User, 
  Package,
  Truck,
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
import { API_URL, api } from "../lib/api";
import type { OrderItem } from "../types";
import { computeOrderCollects, type ShipPayer } from "../lib/orderCollect";
import { coerceOrderLineBool, pickShopOrderLineBlock } from "../lib/shopOrderLine";

type CustomerLite = { id: string; name: string; phone?: string; address?: string };
type ProductLite = { id: string; name: string; sku: string; price: number };

function joinAddressParts(parts: Array<string | null | undefined>) {
  return parts
    .map((p) => (p ?? "").trim())
    .filter(Boolean)
    .join(", ");
}

function normalizeOrderLineItems(
  list: OrderItem[],
  orderLineShowDiscount: boolean,
  orderLineShowCommission: boolean
): OrderItem[] {
  return list.map((it) => {
    const rate = orderLineShowDiscount ? Math.min(100, Math.max(0, Number(it.discountRate) || 0)) : 0;
    const da = orderLineShowDiscount ? Math.round(it.price * it.quantity * (rate / 100) * 100) / 100 : 0;
    const net = it.price * it.quantity - da;
    const r = orderLineShowCommission ? Math.min(100, Math.max(0, Number(it.commissionRate) || 0)) : 0;
    return {
      ...it,
      discountRate: rate,
      discountAmount: da,
      commissionRate: r,
      commissionAmount: orderLineShowCommission ? Math.round(net * (r / 100) * 100) / 100 : 0,
    };
  });
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
          "min-w-[7rem] max-w-[12rem] px-2 py-0.5 border border-input rounded-md bg-background text-right font-medium text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background tabular-nums",
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
        "max-w-[12rem] text-right font-medium text-foreground tabular-nums rounded px-1 py-0.5 -mr-1 hover:bg-accent/50",
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

  const [items, setItems] = React.useState<OrderItem[]>([]);
  /** Theo cấu hình shop: hiển thị cột HH + % mặc định dòng mới */
  const [orderLineShowCommission, setOrderLineShowCommission] = React.useState(true);
  /** Theo cấu hình shop: hiển thị cột CK% trên dòng đơn */
  const [orderLineShowDiscount, setOrderLineShowDiscount] = React.useState(true);
  const [defaultCommissionRate, setDefaultCommissionRate] = React.useState(10);
  const [defaultDiscountRate, setDefaultDiscountRate] = React.useState(0);
  const [qtyAllowDecimal, setQtyAllowDecimal] = React.useState(true);

  const qtyStep = qtyAllowDecimal ? 0.1 : 1;
  const qtyMin = qtyAllowDecimal ? 0.1 : 1;
  const qtyPrecision = qtyAllowDecimal ? 1 : 0;
  const roundQty = React.useCallback(
    (n: number) => {
      const x = Number(n) || 0;
      if (!qtyAllowDecimal) return Math.max(qtyMin, Math.round(x));
      return Math.max(qtyMin, parseFloat(x.toFixed(qtyPrecision)));
    },
    [qtyAllowDecimal, qtyMin, qtyPrecision]
  );

  const addProduct = (product: any) => {
    const existing = items.find(i => i.productId === product.id);
    const defaultRate = orderLineShowCommission ? defaultCommissionRate : 0;
    if (existing) {
      setItems(items.map(i => {
        if (i.productId !== product.id) return i;
        const q = roundQty(i.quantity + 1);
        const rate = orderLineShowDiscount ? Math.min(100, Math.max(0, Number(i.discountRate) || 0)) : 0;
        const da = orderLineShowDiscount ? Math.round(i.price * q * (rate / 100) * 100) / 100 : 0;
        const net = i.price * q - da;
        const cr = orderLineShowCommission ? Math.min(100, Math.max(0, Number(i.commissionRate) || 0)) : 0;
        return {
          ...i,
          quantity: q,
          discountRate: rate,
          discountAmount: da,
          commissionRate: cr,
          commissionAmount: orderLineShowCommission ? Math.round(net * (cr / 100) * 100) / 100 : 0,
        };
      }));
    } else {
      const discR = orderLineShowDiscount ? Math.min(100, Math.max(0, defaultDiscountRate)) : 0;
      const da = orderLineShowDiscount
        ? Math.round(product.price * 1 * (discR / 100) * 100) / 100
        : 0;
      const net = product.price - da;
      setItems([...items, {
        productId: product.id,
        productName: product.name,
        sku: product.sku,
        image: product.image ?? null,
        price: product.price,
        availableStock: product.available_stock ?? 0,
        quantity: 1,
        discountRate: discR,
        discountAmount: da,
        commissionRate: defaultRate,
        commissionAmount: orderLineShowCommission ? Math.round(net * (defaultRate / 100) * 100) / 100 : 0,
      }]);
    }
    setSearchQuery("");
    setShowResults(false);
    setProductQuery("");
  };

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
  const [payrollPeriodStatus, setPayrollPeriodStatus] = React.useState<string | null>(null);

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

  const apiOrigin = React.useMemo(() => {
    if (typeof API_URL !== "string") return "";
    // When API_URL is absolute (e.g. http://host:3000/api) -> need origin for /uploads/*
    if (/^https?:\/\//i.test(API_URL)) return API_URL.replace(/\/api\/?$/i, "");
    // When API_URL is relative (/api) -> uploads are same-origin
    return "";
  }, []);

  const getMainProductImage = React.useCallback((p: any): string | null => {
    const raw = p?.images;
    if (!raw) return null;
    try {
      const arr = Array.isArray(raw) ? raw : JSON.parse(raw);
      const first = Array.isArray(arr) ? arr[0] : null;
      return typeof first === "string" && first.trim() ? first.trim() : null;
    } catch {
      return null;
    }
  }, []);

  const resolveImageSrc = React.useCallback(
    (img: string | null | undefined) => {
      if (!img) return null;
      const v = String(img).trim();
      if (!v) return null;
      if (v.startsWith("/")) return `${apiOrigin}${v}`;
      return v;
    },
    [apiOrigin]
  );

  const applyLinesCommission = React.useCallback(
    (list: { id: number; commission_rate?: number }[], managerId: number | null) => {
      if (!orderLineShowCommission) {
        setItems((prev) =>
          prev.map((it) => ({
            ...it,
            commissionRate: 0,
            commissionAmount: 0,
          }))
        );
        return;
      }
      setItems((prev) =>
        prev.map((it) => {
          const net = it.price * it.quantity - it.discountAmount;
          const defR = defaultCommissionRate;
          if (managerId == null) {
            const r = Number(it.commissionRate) || defR;
            return {
              ...it,
              commissionRate: r,
              commissionAmount: Math.round(net * (r / 100) * 100) / 100,
            };
          }
          // Khi chọn quản lý: hoa hồng direct vẫn thuộc về người lên đơn (CTV),
          // nên giữ nguyên commissionRate từng dòng; chỉ đảm bảo tính lại commissionAmount.
          const r = Number(it.commissionRate) || defR;
          return {
            ...it,
            commissionRate: r,
            commissionAmount: Math.round(net * (r / 100) * 100) / 100,
          };
        })
      );
    },
    [defaultCommissionRate, orderLineShowCommission]
  );

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res: any = await api.get("/auth/me");
        const d = res?.data ?? res;
        const delivery = pickShopOrderLineBlock(d?.shop_order_line, "delivery");
        if (cancelled) return;
        if (delivery) {
          setOrderLineShowCommission(coerceOrderLineBool(delivery.show_commission, true));
          setOrderLineShowDiscount(coerceOrderLineBool(delivery.show_discount, true));
          setQtyAllowDecimal(coerceOrderLineBool(delivery.qty_allow_decimal, true));
          const dr = Number(delivery.default_commission_rate);
          if (Number.isFinite(dr)) {
            setDefaultCommissionRate(Math.min(100, Math.max(0, dr)));
          }
          const ddr = Number(delivery.default_discount_rate);
          if (Number.isFinite(ddr)) {
            setDefaultDiscountRate(Math.min(100, Math.max(0, ddr)));
          }
        }
      } catch {
        // giữ mặc định
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

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
      commission_rate: Number(m.commission_rate) || defaultCommissionRate,
    }));
  }, [myManagers, defaultCommissionRate]);

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
      setProductSuggestions(
        data.map((p: any) => ({
          id: p.id,
          name: p.name,
          sku: p.sku,
          price: Number(p.price) || 0,
          available_stock: Number(p.available_stock) || 0,
          image: getMainProductImage(p),
        }))
      );
    } catch {
      setProductSuggestions([]);
    }
  };

  // Load existing order khi edit
  React.useEffect(() => {
    if (!id) return;
    (async () => {
      try {
        const [res, meJson]: any[] = await Promise.all([
          api.get(`/orders/${id}`),
          api.get("/auth/me").catch(() => null),
        ]);
        const order = res?.data ?? res;
        const meD = meJson?.data ?? meJson;
        const delivery = pickShopOrderLineBlock(meD?.shop_order_line, "delivery");
        const discOn = coerceOrderLineBool(delivery?.show_discount, true);
        const commOn = coerceOrderLineBool(delivery?.show_commission, true);
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
          image: getMainProductImage({ images: it.product_images ?? it.images }),
          price: Number(it.unit_price ?? it.price ?? 0),
          // available_stock sẽ được sync lại theo kho qua /inventory/stock-by-warehouse
          availableStock: Number(it.available_stock ?? 0),
          quantity: Number(it.qty ?? it.quantity ?? 1),
          discountRate: Number(it.discount_rate ?? 0),
          discountAmount: Number(it.discount_amount ?? 0),
          commissionRate: Number(it.commission_rate ?? 10),
          commissionAmount: Number(it.commission_amount ?? 0),
        }));
        if (itemsData.length) {
          setItems(normalizeOrderLineItems(itemsData as OrderItem[], discOn, commOn) as any);
        }

        setShipmentAddress(order?.shipping_address ?? '');
        setShipmentAddressTouched(Boolean(String(order?.shipping_address ?? '').trim()));
        setShippingFee(Number(order?.shipping_fee ?? 0));
        setShipPayer(order?.ship_payer === "shop" ? "shop" : "customer");
        setDeposit(Number(order?.deposit ?? 0));
        setSalespersonAbsorbedAmount(Number(order?.salesperson_absorbed_amount ?? 0));
        {
          const pm = String(order?.payment_method ?? "cash");
          const ok = ["cash", "transfer", "cod"].includes(pm);
          setPaymentMethod(ok ? pm : pm === "card" ? "transfer" : "cash");
        }
        setOrderStatus(order?.status ?? 'pending');
        setPayrollPeriodStatus(order?.payroll_period_status ?? null);
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

  // Note: đơn thuộc kỳ lương đã chốt không được hủy/xóa. Nếu cần xử lý, hãy tạo đơn hoàn (returns).

  // Submit
  const submitOrder = async () => {
    setFormError("");

    if (isEdit && payrollPeriodStatus === "closed") {
      setFormError("Đơn thuộc kỳ lương đã chốt: không được sửa/hủy/xóa. Vui lòng tạo đơn hoàn (returns).");
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }

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
        const rate = orderLineShowDiscount ? Math.min(100, Math.max(0, Number(next.discountRate) || 0)) : 0;
        const da = orderLineShowDiscount ? Math.round(next.price * next.quantity * (rate / 100) * 100) / 100 : 0;
        const withDisc = { ...next, discountRate: rate, discountAmount: da };
        const net = withDisc.price * withDisc.quantity - withDisc.discountAmount;
        const r = orderLineShowCommission ? Math.min(100, Math.max(0, Number(withDisc.commissionRate) || 0)) : 0;
        return {
          ...withDisc,
          commissionRate: r,
          commissionAmount: orderLineShowCommission ? Math.round(net * (r / 100) * 100) / 100 : 0,
        };
      })
    );
  }, [orderLineShowDiscount, orderLineShowCommission]);

  React.useEffect(() => {
    setItems((prev) => normalizeOrderLineItems(prev, orderLineShowDiscount, orderLineShowCommission));
  }, [orderLineShowDiscount, orderLineShowCommission]);

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

  const showCommCols = orderLineShowCommission;
  const showDiscCols = orderLineShowDiscount;
  const lineGridMinPx = React.useMemo(
    () => 260 + 190 + 140 + 120 + 30 + (showDiscCols ? 90 : 0) + (showCommCols ? 90 : 0),
    [showDiscCols, showCommCols]
  );
  const orderDesktopColPercents = React.useMemo((): number[] => {
    if (showDiscCols && showCommCols) return [34, 13, 13, 9, 14, 13, 4];
    if (showDiscCols && !showCommCols) return [38, 14, 14, 10, 20, 4];
    if (!showDiscCols && showCommCols) return [36, 14, 14, 22, 10, 4];
    return [44, 18, 18, 16, 4];
  }, [showDiscCols, showCommCols]);

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
            className="w-9 h-9 flex items-center justify-center border border-border rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <h1 className="text-xl font-semibold tracking-tight">
              {isEdit ? `Chỉnh sửa đơn #${id}` : 'Tạo đơn hàng mới'}
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">
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
            className="flex-1 sm:flex-none h-10 px-4 border border-border rounded-md text-sm font-semibold text-foreground hover:bg-accent transition-colors"
          >
            Hủy
          </button>
          <button
            type="button"
            onClick={submitOrder}
            disabled={isEdit && payrollPeriodStatus === "closed"}
            className="hidden sm:flex items-center gap-2 h-10 px-5 bg-primary text-primary-foreground rounded-md text-sm font-semibold hover:opacity-95 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Save className="w-4 h-4" />
            {isEdit ? 'Cập nhật đơn hàng' : 'Hoàn tất & Xuất kho'}
          </button>
        </div>
      </div>

      {/* Error banner */}
      {formError && (
        <div className="flex items-center gap-3 mb-4 px-4 py-3 rounded-lg border border-destructive/30 bg-destructive/10 text-sm text-destructive">
          <AlertTriangle className="w-4 h-4 flex-shrink-0" />
          <span className="font-medium">{formError}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-4">

        {/* LEFT COLUMN */}
        <div className="flex flex-col gap-4">

          {/* Card: Khách hàng */}
          <div className="bg-card border border-border rounded-xl p-5">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-6 h-6 rounded-md bg-muted flex items-center justify-center">
                <User className="w-3.5 h-3.5 text-primary" />
              </div>
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Thông tin khách hàng</span>
            </div>

            {/* Kho + Nhóm — 2 cột */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
              <div className="hidden sm:block">
                <label className="text-[11px] text-muted-foreground mb-1 flex items-center gap-1">
                  Kho xuất hàng
                  <span className="bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950/30 dark:text-amber-300 dark:border-amber-900/50 text-[10px] px-1.5 py-0.5 rounded font-medium">bắt buộc</span>
                </label>
                <select
                  value={selectedWarehouseId ?? ""}
                  onChange={(e) => setSelectedWarehouseId(e.target.value ? Number(e.target.value) : null)}
                  className={cn(
                    "w-full h-10 px-3 py-2 border rounded-md text-sm outline-none transition-colors bg-background",
                    "focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
                    !selectedWarehouseId
                      ? "border-amber-300"
                      : "border-input"
                  )}
                >
                  <option value="">— Chọn kho xuất hàng —</option>
                  {warehouses.filter((w: any) => w.is_active).map((w: any) => (
                    <option key={w.id} value={w.id}>{w.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-[11px] text-muted-foreground mb-1 flex items-center gap-1">
                  Nhóm bán hàng
                  <span className="bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950/30 dark:text-amber-300 dark:border-amber-900/50 text-[10px] px-1.5 py-0.5 rounded font-medium">bắt buộc</span>
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
                    "w-full h-10 px-3 py-2 border rounded-md text-sm outline-none transition-colors bg-background",
                    "focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
                    !selectedGroupId
                      ? "border-amber-300"
                      : "border-input"
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
                <label className="text-[11px] text-muted-foreground mb-1 block">Tìm khách hàng</label>
                <div className="relative">
                  <Search className="w-3.5 h-3.5 absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
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
                    className="w-full h-10 pr-9 pl-3 py-2 border border-input rounded-md text-sm outline-none transition-colors bg-background focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                  />
                  {showCustomerSuggestions && (
                    <div className="absolute top-full left-0 right-0 mt-1 bg-popover text-popover-foreground border border-border rounded-lg shadow-lg z-50 overflow-hidden">
                      <div className="max-h-52 overflow-y-auto">
                        {customerSuggestions.length > 0 ? (
                          customerSuggestions.map(customer => (
                            <button
                              key={customer.id}
                              onClick={() => selectCustomer(customer)}
                              className="w-full px-4 py-3 flex items-center gap-3 hover:bg-accent/50 transition-colors text-left border-b border-border last:border-0"
                            >
                              <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-[11px] font-semibold text-primary flex-shrink-0">
                                {(customer.name || '').split(' ').map((n: string) => n[0]).slice(0, 2).join('')}
                              </div>
                              <div>
                                <p className="text-sm font-medium text-foreground">{customer.name}</p>
                                <p className="text-[11px] text-muted-foreground">{customer.phone || ''}</p>
                              </div>
                            </button>
                          ))
                        ) : (
                          <div className="px-4 py-6 text-center text-muted-foreground text-sm">Không tìm thấy khách hàng</div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
                {selectedCustomer && (
                  <div className="mt-2 flex items-center gap-2 px-3 py-2 bg-muted/30 rounded-lg border border-border">
                    <div className="w-7 h-7 rounded-full bg-muted flex items-center justify-center text-[10px] font-semibold text-primary flex-shrink-0">
                      {selectedCustomer.name?.split(' ').map((n: string) => n[0]).slice(0, 2).join('') || '?'}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{selectedCustomer.name || 'Chưa chọn'}</p>
                      <p className="text-[11px] text-muted-foreground">{selectedCustomer.phone || ''}</p>
                    </div>
                  </div>
                )}
              </div>

              <div>
                <label className="text-[11px] text-muted-foreground mb-1 block">Địa chỉ giao hàng</label>
                <div className="relative">
                  <MapPin className="w-3.5 h-3.5 absolute left-3 top-2.5 text-muted-foreground" />
                  <textarea
                    placeholder="Nhập địa chỉ chi tiết..."
                    value={shipmentAddress}
                    onChange={(e) => {
                      setShipmentAddressTouched(true);
                      setShipmentAddress(e.target.value);
                    }}
                    className="w-full pl-8 pr-3 py-2 border border-input rounded-md text-sm outline-none transition-colors bg-background focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background resize-none"
                    rows={3}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Card: Sản phẩm */}
          <div className="bg-card border border-border rounded-xl overflow-hidden">
            <div className="px-5 py-4 border-b border-border flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-md bg-muted flex items-center justify-center">
                  <Package className="w-3.5 h-3.5 text-primary" />
                </div>
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Danh sách sản phẩm</span>
              </div>
              <div className="relative hidden sm:block w-56">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
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
                  className="w-full h-10 pr-3 pl-9 py-1.5 border border-input rounded-md text-sm outline-none transition-colors bg-background focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                />
                {showResults && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-popover text-popover-foreground border border-border rounded-lg shadow-lg z-50 overflow-hidden">
                    <div className="max-h-52 overflow-y-auto">
                      {productSuggestions.length > 0 ? (
                        productSuggestions.map(product => (
                          <button
                            key={product.id}
                            onClick={() => addProduct(product)}
                            className="w-full px-4 py-3 flex items-center justify-between hover:bg-accent/50 transition-colors text-left border-b border-border last:border-0"
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              <div className="w-9 h-9 rounded-lg bg-muted border border-border overflow-hidden flex items-center justify-center flex-shrink-0">
                                {resolveImageSrc(product.image) ? (
                                  <img
                                    src={resolveImageSrc(product.image) as string}
                                    alt=""
                                    className="w-full h-full object-cover"
                                    loading="lazy"
                                    onError={(e) => {
                                      (e.target as HTMLImageElement).style.display = "none";
                                    }}
                                  />
                                ) : (
                                  <Package className="w-4 h-4 text-muted-foreground/60" />
                                )}
                              </div>
                              <div className="min-w-0">
                                <p className="text-sm font-medium text-foreground truncate">{product.name}</p>
                                <p className="text-[10px] text-muted-foreground uppercase tracking-wide font-mono truncate">{product.sku}</p>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="text-sm font-medium text-foreground tabular-nums">{formatCurrency(product.price)}</p>
                              <p className="text-[10px] text-muted-foreground">Thêm</p>
                            </div>
                          </button>
                        ))
                      ) : (
                        <div className="px-4 py-6 text-center text-muted-foreground text-sm">Không tìm thấy sản phẩm</div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Mobile: Kho xuất hàng nằm cùng khu vực chọn sản phẩm */}
            <div className="sm:hidden px-4 py-3 border-b border-border bg-card">
              <label className="text-[11px] text-muted-foreground mb-1 flex items-center gap-1">
                Kho xuất hàng
                <span className="bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950/30 dark:text-amber-300 dark:border-amber-900/50 text-[10px] px-1.5 py-0.5 rounded font-medium">bắt buộc</span>
              </label>
              <select
                value={selectedWarehouseId ?? ""}
                onChange={(e) => setSelectedWarehouseId(e.target.value ? Number(e.target.value) : null)}
                className={cn(
                  "w-full h-10 px-3 border rounded-md text-sm outline-none transition-colors bg-background",
                  "focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
                  !selectedWarehouseId
                    ? "border-amber-300"
                    : "border-input"
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
            <div className="sm:hidden px-4 py-3 border-b border-border bg-card">
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
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
                    className="w-full h-10 pl-10 pr-3 border border-input rounded-md text-sm outline-none transition-colors bg-background focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                  />
                  {showResults && (
                    <div className="absolute top-full left-0 right-0 mt-1 bg-popover text-popover-foreground border border-border rounded-lg shadow-lg z-50 overflow-hidden">
                      <div className="max-h-64 overflow-y-auto">
                        {productSuggestions.length > 0 ? (
                          productSuggestions.map((product) => (
                            <button
                              key={product.id}
                              onClick={() => addProduct(product)}
                              className="w-full px-4 py-3 flex items-center justify-between hover:bg-accent/50 transition-colors text-left border-b border-border last:border-0"
                            >
                              <div className="flex items-center gap-3 min-w-0">
                                <div className="w-9 h-9 rounded-lg bg-muted border border-border overflow-hidden flex items-center justify-center flex-shrink-0">
                                  {resolveImageSrc(product.image) ? (
                                    <img
                                      src={resolveImageSrc(product.image) as string}
                                      alt=""
                                      className="w-full h-full object-cover"
                                      loading="lazy"
                                      onError={(e) => {
                                        (e.target as HTMLImageElement).style.display = "none";
                                      }}
                                    />
                                  ) : (
                                    <Package className="w-4 h-4 text-muted-foreground/60" />
                                  )}
                                </div>
                                <div className="min-w-0">
                                  <p className="text-sm font-medium text-foreground truncate">{product.name}</p>
                                  <p className="text-[10px] text-muted-foreground uppercase tracking-wide font-mono truncate">{product.sku}</p>
                                </div>
                              </div>
                              <div className="text-right flex-shrink-0 pl-3">
                                <p className="text-sm font-semibold text-foreground tabular-nums">{formatCurrency(product.price)}</p>
                                <p className="text-[10px] text-muted-foreground">Thêm</p>
                              </div>
                            </button>
                          ))
                        ) : (
                          <div className="px-4 py-6 text-center text-muted-foreground text-sm">Không tìm thấy sản phẩm</div>
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
                  className="h-10 w-10 rounded-md border border-border bg-background flex items-center justify-center text-primary hover:bg-accent transition-colors"
                  aria-label="Mở tìm sản phẩm"
                >
                  <Plus className="w-5 h-5" />
                </button>
              </div>
            </div>

            {!isAdmin && (
              <div className="px-5 py-3 border-b border-border bg-muted/20">
                <label className="mb-1.5 block text-[11px] font-medium text-muted-foreground">
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
                  className="w-full max-w-md h-10 rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                >
                  <option value="">— Tôi nhận HH (người tạo đơn) —</option>
                  {managerOptions.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.full_name}
                    </option>
                  ))}
                </select>
                <p className="mt-1.5 text-[10px] text-muted-foreground leading-relaxed">
                  Mặc định: quản lý trực tiếp đầu tiên trong danh sách. Để trống “Tôi nhận HH”: đơn bán trực tiếp (HH thuộc người tạo đơn). Chọn quản lý: đơn ghi nhận quản lý là người bán (HH trực tiếp thuộc quản lý).
                </p>
              </div>
            )}

            {items.length === 0 ? (
              <div className="py-12 text-center text-muted-foreground">
                <Package className="w-7 h-7 mx-auto mb-2 text-muted-foreground/40" />
                <p className="text-sm">Chưa có sản phẩm. Tìm và thêm bên trên.</p>
              </div>
            ) : (
              <>
                {/* Mobile: 1 dòng / 1 sản phẩm (dạng bảng, cuộn ngang nếu cần) */}
                <div className="block sm:hidden">
                  <div className="overflow-x-auto">
                    <div className="min-w-0" style={{ minWidth: lineGridMinPx }}>
                      <div className="sticky top-0 z-10 px-4 pt-3 pb-2 border-b border-border bg-muted/30">
                        <div className="flex gap-3 text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">
                          <div className="w-[260px]">Sản phẩm</div>
                          <div className="w-[190px] text-center">Số lượng</div>
                          <div className="w-[140px] text-right">Đơn giá</div>
                          {showDiscCols ? <div className="w-[90px] text-center">CK%</div> : null}
                          {showCommCols ? <div className="w-[90px] text-center">HH%</div> : null}
                          <div className="w-[120px] text-right">Thành tiền</div>
                          <div className="w-[30px]"></div>
                        </div>
                      </div>

                      <div className="px-4 py-2 divide-y divide-border">
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
                              <div className="flex items-center gap-2 min-w-0">
                                <div className="w-9 h-9 rounded-lg bg-muted border border-border overflow-hidden flex items-center justify-center flex-shrink-0">
                                  {resolveImageSrc((item as any).image) ? (
                                    <img
                                      src={resolveImageSrc((item as any).image) as string}
                                      alt=""
                                      className="w-full h-full object-cover"
                                      loading="lazy"
                                      onError={(e) => {
                                        (e.target as HTMLImageElement).style.display = "none";
                                      }}
                                    />
                                  ) : (
                                    <Package className="w-4 h-4 text-muted-foreground/60" />
                                  )}
                                </div>
                                <div className="min-w-0">
                                  <p className="text-[13px] font-semibold text-foreground truncate">{item.productName}</p>
                                  <p className="mt-0.5 text-[10px] text-muted-foreground font-mono uppercase tracking-wide truncate">{item.sku}</p>
                                </div>
                              </div>
                              <p className={cn("mt-0.5 text-[10px]", overStock ? "text-destructive font-medium" : "text-muted-foreground")}>
                                Có thể bán: {maxAllowed.toFixed(3).replace(/\.?0+$/, "")}
                                {overStock && <span className="ml-1">— Vượt tồn</span>}
                              </p>
                            </div>

                            <div className="w-[190px]">
                              <div className="flex items-center justify-center gap-2">
                                <button
                                  type="button"
                                  onClick={() => {
                                    const v = roundQty(item.quantity - 1);
                                    updateItem(item.productId, { quantity: v });
                                  }}
                                  className="w-8 h-8 rounded-md bg-background border border-border flex items-center justify-center text-muted-foreground hover:bg-accent transition-colors"
                                >
                                  <Minus className="w-4 h-4" />
                                </button>
                                <input
                                  type="number"
                                  min={qtyMin}
                                  step={qtyStep}
                                  value={item.quantity}
                                  onChange={(e) => {
                                    const raw = parseFloat(e.target.value);
                                    const v = Number.isFinite(raw) && raw > 0 ? raw : qtyMin;
                                    updateItem(item.productId, { quantity: roundQty(v) });
                                  }}
                                  className={cn(
                                    "w-20 h-8 rounded-lg border px-2 text-center text-[13px] font-semibold outline-none",
                                    overStock
                                      ? "border-destructive/40 bg-destructive/10 text-destructive focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                                      : "border-input bg-background text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                                  )}
                                />
                                <button
                                  type="button"
                                  onClick={() => {
                                    const v = roundQty(item.quantity + 1);
                                    updateItem(item.productId, { quantity: v });
                                  }}
                                  className="w-8 h-8 rounded-md bg-background border border-border flex items-center justify-center text-muted-foreground hover:bg-accent transition-colors"
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
                                className="w-full h-8 rounded-md border border-input bg-background px-2 text-right text-[13px] font-semibold text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                              />
                            </div>

                            {showDiscCols ? (
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
                            ) : null}

                            {showCommCols ? (
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
                                  className="w-16 h-8 rounded-lg border border-input bg-background px-2 text-center text-[13px] font-semibold text-foreground outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                                />
                              </div>
                            ) : null}

                            <div className="w-[120px] text-right">
                              <p className="text-[13px] font-semibold text-foreground">{formatCurrency(lineTotal)}</p>
                              {showCommCols ? (
                                <p className="mt-0.5 text-[10px] font-semibold text-emerald-700 dark:text-emerald-300">
                                  HH: {formatCurrency(item.commissionAmount)}
                                </p>
                              ) : null}
                            </div>

                            <div className="w-[30px] flex justify-end">
                              <button
                                type="button"
                                onClick={() => removeItem(item.productId)}
                                className="w-8 h-8 rounded-md border border-border flex items-center justify-center text-muted-foreground hover:text-destructive hover:border-destructive/40 hover:bg-destructive/10 transition-colors"
                                aria-label="Xóa sản phẩm"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                      {/* Mobile: tổng dòng (khớp desktop tfoot — có tổng CK, không VAT) */}
                      <div className="flex gap-3 items-center py-2.5 border-t border-border bg-muted/30 text-[11px]">
                        <div className="w-[260px] shrink-0 font-semibold text-muted-foreground">
                          Giá trị đơn ({items.length} SP)
                        </div>
                        <div className="w-[190px] shrink-0 text-center font-medium text-foreground">
                          {items
                            .reduce((s, i) => s + i.quantity, 0)
                            .toFixed(qtyPrecision)
                            .replace(/\.?0+$/, "")}
                        </div>
                        <div className="w-[140px] shrink-0" />
                        {showDiscCols ? (
                          <div className="w-[90px] shrink-0 text-center text-destructive font-medium tabular-nums">
                            {lineDiscountTotal > 0 ? `-${formatCurrency(lineDiscountTotal)}` : "—"}
                          </div>
                        ) : null}
                        {showCommCols ? <div className="w-[90px] shrink-0" /> : null}
                        <div className="w-[120px] shrink-0 text-right">
                          <p className="text-[13px] font-semibold text-foreground">{formatCurrency(subtotal)}</p>
                          {showCommCols ? (
                            <p className="mt-0.5 text-[10px] font-semibold text-emerald-700 dark:text-emerald-300">
                              HH: {formatCurrency(items.reduce((s, i) => s + i.commissionAmount, 0))}
                            </p>
                          ) : null}
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
                    {orderDesktopColPercents.map((pct, i) => (
                      <col key={i} style={{ width: `${pct}%` }} />
                    ))}
                  </colgroup>
                  <thead>
                    <tr className="border-b border-border text-muted-foreground text-[11px] uppercase tracking-wide">
                      <th className="px-4 py-2 text-left font-semibold">Sản phẩm</th>
                      <th className="px-3 py-2 text-center font-semibold">Số lượng</th>
                      <th className="px-3 py-2 text-right font-semibold">Đơn giá</th>
                      {showDiscCols ? (
                        <th className="px-2 py-2 text-center font-semibold">CK%</th>
                      ) : null}
                      <th className="px-3 py-2 text-right font-semibold">Thành tiền</th>
                      {showCommCols ? (
                        <th className="px-3 py-2 text-center font-semibold">Hoa hồng</th>
                      ) : null}
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
                            "group border-b border-border last:border-0 transition-colors",
                            overStock ? "bg-destructive/10" : "hover:bg-muted/30"
                          )}
                        >
                          <td className="px-4 py-2.5">
                            <div className="flex items-center gap-2">
                              <div className="w-8 h-8 rounded-lg bg-muted border border-border overflow-hidden flex items-center justify-center flex-shrink-0">
                                {resolveImageSrc((item as any).image) ? (
                                  <img
                                    src={resolveImageSrc((item as any).image) as string}
                                    alt=""
                                    className="w-full h-full object-cover"
                                    loading="lazy"
                                    onError={(e) => {
                                      (e.target as HTMLImageElement).style.display = "none";
                                    }}
                                  />
                                ) : (
                                  <Package className="w-4 h-4 text-muted-foreground/60" />
                                )}
                              </div>
                              <div className="min-w-0">
                                <p className="font-medium text-foreground truncate text-xs leading-tight">{item.productName}</p>
                                <p className="text-muted-foreground font-mono text-[10px] leading-tight">{item.sku}</p>
                                <p className={cn("text-[10px] leading-tight", overStock ? "text-destructive font-medium" : "text-muted-foreground")}>
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
                                  const v = roundQty(item.quantity - 1);
                                  updateItem(item.productId, { quantity: v });
                                }}
                                className="w-6 h-6 rounded-md bg-muted hover:bg-accent flex items-center justify-center text-muted-foreground transition-colors flex-shrink-0"
                              >
                                <Minus className="w-2.5 h-2.5" />
                              </button>
                              <input
                                type="number" min={qtyMin} step={qtyStep}
                                value={item.quantity}
                                onChange={(e) => {
                                  const raw = parseFloat(e.target.value);
                                  const v = Number.isFinite(raw) && raw > 0 ? raw : qtyMin;
                                  updateItem(item.productId, { quantity: roundQty(v) });
                                }}
                                className={cn(
                                  "w-11 h-6 px-1 border rounded text-center text-xs font-medium outline-none focus:ring-1 transition-colors",
                                  overStock
                                      ? "border-destructive/40 bg-destructive/10 focus-visible:ring-ring text-destructive"
                                      : "border-input bg-background focus-visible:ring-ring text-foreground"
                                )}
                              />
                              <button
                                type="button"
                                onClick={() => {
                                  const v = roundQty(item.quantity + 1);
                                  updateItem(item.productId, { quantity: v });
                                }}
                                className="w-6 h-6 rounded-md bg-muted hover:bg-accent flex items-center justify-center text-muted-foreground transition-colors flex-shrink-0"
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
                              className="w-full h-6 px-2 bg-transparent border border-transparent hover:border-border focus:bg-background focus:border-input rounded-md text-right text-xs font-medium text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background transition-colors"
                            />
                          </td>
                          {showDiscCols ? (
                            <td className="px-2 py-2.5">
                              <div className="flex items-center justify-center gap-1">
                                <input
                                  type="number" min={0} max={100}
                                  value={item.discountRate}
                                  onChange={(e) => {
                                    const r = Math.min(100, Math.max(0, Number(e.target.value) || 0));
                                    updateItem(item.productId, { discountRate: r });
                                  }}
                                  className="w-14 h-8 min-w-[3.5rem] px-1.5 bg-muted/30 border border-transparent hover:border-border focus:bg-background focus:border-input rounded-md text-center text-sm font-semibold text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background transition-colors"
                                />
                                <span className="text-muted-foreground text-xs font-semibold">%</span>
                              </div>
                            </td>
                          ) : null}
                          <td className="px-3 py-2.5 text-right">
                            <span className="font-medium text-foreground text-xs tabular-nums">{formatCurrency(lineTotal)}</span>
                          </td>
                          {showCommCols ? (
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
                                      className="w-14 h-8 min-w-[3.5rem] px-1.5 bg-muted/30 border border-transparent hover:border-border focus:bg-background focus:border-input rounded-md text-center text-sm font-semibold text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background transition-colors"
                                    />
                                    <span className="text-muted-foreground text-xs font-semibold">%</span>
                                  </div>
                                  <span className="text-emerald-700 dark:text-emerald-300 text-[10px] font-semibold tabular-nums">{formatCurrency(item.commissionAmount)}</span>
                                </>
                              </div>
                            </td>
                          ) : null}
                          <td className="px-2 py-2.5 text-center">
                            <button
                              type="button"
                              onClick={() => removeItem(item.productId)}
                              className="w-6 h-6 rounded-md flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors opacity-0 group-hover:opacity-100"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot>
                    <tr className="bg-muted/30 border-t border-border text-xs">
                      <td className="px-4 py-2 text-muted-foreground font-medium">Giá trị đơn ({items.length} SP)</td>
                      <td className="px-3 py-2 text-center font-medium text-foreground">
                        {items
                          .reduce((s, i) => s + i.quantity, 0)
                          .toFixed(qtyPrecision)
                          .replace(/\.?0+$/, "")}
                      </td>
                      <td className="px-3 py-2"></td>
                      {showDiscCols ? (
                        <td className="px-2 py-2 text-center text-destructive text-[10px]">
                          {items.some(i => i.discountAmount > 0) ? `-${formatCurrency(items.reduce((s, i) => s + i.discountAmount, 0))}` : '—'}
                        </td>
                      ) : null}
                      <td className="px-3 py-2 text-right font-medium text-foreground tabular-nums">
                        {formatCurrency(items.reduce((s, i) => s + (i.quantity * i.price - i.discountAmount), 0))}
                      </td>
                      {showCommCols ? (
                        <td className="px-3 py-2 text-center">
                          <span className="inline-block bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-300 dark:border-emerald-900/50 text-[10px] font-semibold px-2 py-0.5 rounded-full tabular-nums">
                            {formatCurrency(items.reduce((s, i) => s + i.commissionAmount, 0))}
                          </span>
                        </td>
                      ) : null}
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
          <div className="bg-card border border-border rounded-xl p-5">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-6 h-6 rounded-md bg-muted flex items-center justify-center">
                <Calculator className="w-3.5 h-3.5 text-primary" />
              </div>
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Tổng kết đơn hàng</span>
            </div>
            <div className="space-y-1">
              <div className="flex items-center justify-between py-1.5 border-b border-border text-sm">
                <div className="min-w-0 pr-2">
                  <span className="text-muted-foreground">Mã ĐH</span>
                  {!isEdit && (
                    <p className="text-[10px] text-muted-foreground mt-0.5 leading-tight">Lưu đơn để tạo mã</p>
                  )}
                </div>
                <span className="font-semibold text-foreground">{isEdit ? (orderCode || `#${id}`) : "—"}</span>
              </div>
              {showDiscCols ? (
                <div className="flex items-center justify-between py-1.5 border-b border-border text-sm">
                  <span className="text-muted-foreground">Tổng CK</span>
                  <span className="font-semibold text-destructive">
                    {lineDiscountTotal > 0 ? `-${formatCurrency(lineDiscountTotal)}` : "—"}
                  </span>
                </div>
              ) : null}
              <div className="flex items-center justify-between py-2 border-b border-border">
                <div>
                  <span className="text-sm font-semibold text-foreground">Giá trị đơn</span>
                  <p className="text-[10px] text-muted-foreground mt-0.5">Tổng sau chiết khấu dòng</p>
                </div>
                <span className="text-xl font-semibold text-primary tabular-nums">{formatCurrency(subtotal)}</span>
              </div>
              <div className="flex items-center justify-between py-1.5 border-b border-border text-sm gap-2">
                <span className="text-muted-foreground shrink-0">Phí vận chuyển</span>
                <MoneyAmountField value={shippingFee} onChange={setShippingFee} className="text-sm" />
              </div>
              <div className="py-1.5 border-b border-border">
                <span className="text-muted-foreground text-sm block mb-1.5">Phí ship do</span>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setShipPayer("shop")}
                    className={cn(
                      "py-2 rounded-md text-xs font-semibold border transition-colors",
                      shipPayer === "shop"
                        ? "border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-200"
                        : "border-border bg-muted/30 text-muted-foreground hover:bg-accent/50"
                    )}
                  >
                    Shop trả
                  </button>
                  <button
                    type="button"
                    onClick={() => setShipPayer("customer")}
                    className={cn(
                      "py-2 rounded-md text-xs font-semibold border transition-colors",
                      shipPayer === "customer"
                        ? "border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-200"
                        : "border-border bg-muted/30 text-muted-foreground hover:bg-accent/50"
                    )}
                  >
                    Khách trả
                  </button>
                </div>
              </div>
              <div className="flex items-center justify-between py-1.5 border-b border-border text-sm gap-2">
                <span className="text-muted-foreground shrink-0">Đặt cọc</span>
                <MoneyAmountField value={deposit} onChange={setDeposit} className="text-sm" />
              </div>
              <div className="flex items-center justify-between py-1.5 border-b border-border text-sm gap-2">
                <div className="min-w-0 pr-2">
                  <span className="text-muted-foreground">Tiền NV chịu</span>
                  <p className="text-[10px] text-muted-foreground mt-0.5 leading-tight">NV tự bỏ ra, trừ vào Lương</p>
                </div>
                <MoneyAmountField value={salespersonAbsorbedAmount} onChange={setSalespersonAbsorbedAmount} className="text-sm" />
              </div>
              <div className="flex items-center justify-between py-1.5 border-b border-border text-sm">
                <span className="text-muted-foreground">Thu khách</span>
                <span className="font-semibold text-foreground tabular-nums">{formatCurrency(customerCollect)}</span>
              </div>
              <div className="flex items-center justify-between py-1.5 border-b border-border text-sm">
                <span className="text-muted-foreground">Shop thu</span>
                <span className="font-semibold text-foreground tabular-nums">{formatCurrency(shopCollect)}</span>
              </div>
            </div>
            {showCommCols ? (
              <div className="mt-3 flex items-center justify-between px-3 py-2 bg-emerald-50 border border-emerald-200 dark:bg-emerald-950/30 dark:border-emerald-900/50 rounded-lg">
                <span className="text-xs text-emerald-700 dark:text-emerald-300 font-semibold">Tổng hoa hồng</span>
                <span className="text-sm font-semibold text-emerald-800 dark:text-emerald-200 tabular-nums">
                  {formatCurrency(items.reduce((sum, item) => sum + item.commissionAmount, 0))}
                </span>
              </div>
            ) : null}
          </div>

          {/* Cài đặt */}
          <div className="bg-card border border-border rounded-xl p-5 space-y-4">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-md bg-muted flex items-center justify-center">
                <Info className="w-3.5 h-3.5 text-primary" />
              </div>
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Cài đặt đơn hàng</span>
            </div>

            <div>
              <label className="text-[11px] text-muted-foreground mb-1.5 block">Phương thức thanh toán</label>
              <div className="flex gap-2">
                {[
                  { id: "transfer", label: "Chuyển khoản", icon: ArrowRight },
                  { id: "cod", label: "Thu Cod", icon: Truck },
                  { id: "cash", label: "Tiền mặt", icon: Wallet },
                ].map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setPaymentMethod(m.id)}
                    className={cn(
                      "flex-1 flex flex-col items-center gap-1 py-2 border rounded-md text-[10px] font-semibold transition-colors",
                      paymentMethod === m.id
                        ? "border-border bg-accent text-accent-foreground"
                        : "border-border bg-muted/30 text-muted-foreground hover:bg-accent/50"
                    )}
                  >
                    <m.icon className="w-3.5 h-3.5" />
                    {m.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-[11px] text-muted-foreground mb-1.5 block">Trạng thái đơn hàng</label>
              <select
                value={orderStatus}
                onChange={(e) => setOrderStatus(e.target.value)}
                className="w-full h-10 px-3 py-2 border border-input rounded-md text-sm outline-none transition-colors bg-background focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
              >
                <option value="pending">Chờ duyệt</option>
                <option value="shipping">Đang giao</option>
                <option value="completed">Đã giao</option>
                <option value="cancelled">Đã hủy</option>
              </select>
              {isEdit && isAdmin && payrollPeriodStatus === "closed" ? (
                <div className="mt-2 w-full px-3 py-2 rounded-lg border border-amber-200 bg-amber-50 text-amber-800 text-xs font-semibold">
                  Đơn thuộc kỳ lương đã chốt: không được hủy/xóa. Nếu cần, hãy tạo đơn hoàn (returns).
                </div>
              ) : null}
            </div>

            <div>
              <label className="text-[11px] text-muted-foreground mb-1.5 block">Nhân viên phụ trách</label>
              <div className="flex items-center gap-2 px-3 py-2 bg-muted/30 rounded-lg border border-border">
                <div className="w-7 h-7 rounded-full bg-muted flex items-center justify-center text-[10px] font-semibold text-primary flex-shrink-0">
                  {responsibleSalesInitials}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-foreground truncate">{responsibleSalesDisplay}</p>
                  <p className="text-[10px] text-muted-foreground">Nhân viên bán hàng (sales) — người lên đơn</p>
                </div>
              </div>
            </div>

            <div>
              <label className="text-[11px] text-muted-foreground mb-1.5 block">Ghi chú đơn hàng</label>
              <textarea
                rows={3}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Ghi chú thêm về đơn hàng, yêu cầu đặc biệt..."
                className="w-full px-3 py-2 border border-input rounded-md text-sm outline-none transition-colors bg-background focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background resize-none"
              />
            </div>

            <div className="flex items-start gap-2 px-3 py-2 bg-muted/30 rounded-lg border border-border">
              <Info className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0 mt-0.5" />
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                Đơn hàng tự động vào báo cáo doanh thu sau khi chuyển sang "Đã giao".
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={submitOrder}
            disabled={isEdit && payrollPeriodStatus === "closed"}
            className="hidden lg:flex w-full items-center justify-center gap-2 py-2.5 bg-primary text-primary-foreground rounded-md text-sm font-semibold hover:opacity-95 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
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
            <div className="rounded-xl border border-border bg-background/95 backdrop-blur shadow-md flex items-stretch gap-2 px-2 py-2">
              <button
                type="button"
                onClick={() => setMobileSummaryExpanded(true)}
                className="flex-1 min-w-0 text-left pl-1 py-0.5 rounded-lg hover:bg-accent/50 transition-colors"
              >
                <div className="text-[10px] text-muted-foreground">Thu khách</div>
                <div className="text-base font-semibold text-foreground tabular-nums leading-tight">
                  {formatCurrency(customerCollect)}
                </div>
                <div className="text-[9px] text-muted-foreground mt-0.5">
                  Chạm để xem phí ship, cọc
                  {showDiscCols ? ", CK" : ""}
                  {showCommCols ? ", HH" : ""}…
                </div>
              </button>
              <button
                type="button"
                onClick={() => setMobileSummaryExpanded(true)}
                className="shrink-0 w-10 flex items-center justify-center rounded-lg border border-border bg-muted/30 text-muted-foreground hover:bg-accent/50"
                aria-label="Mở tổng kết chi tiết"
              >
                <ChevronUp className="w-5 h-5" />
              </button>
              <button
                type="button"
                onClick={submitOrder}
                className="shrink-0 flex flex-col items-center justify-center gap-0.5 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-xs font-semibold hover:opacity-95 transition-opacity min-w-[5.5rem]"
              >
                <Save className="w-4 h-4" />
                {isEdit ? "Lưu" : "Lưu đơn"}
              </button>
            </div>
          ) : (
            <div className="rounded-xl border border-border bg-background/95 backdrop-blur shadow-lg max-h-[min(70vh,520px)] overflow-y-auto">
              <div className="flex items-center justify-between px-3 py-2 border-b border-border bg-muted/30">
                <span className="text-xs font-semibold text-foreground">Tổng kết đơn</span>
                <button
                  type="button"
                  onClick={() => setMobileSummaryExpanded(false)}
                  className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground py-1 px-2 rounded-lg hover:bg-accent/50"
                >
                  <ChevronDown className="w-4 h-4" />
                  Thu gọn
                </button>
              </div>
              <div className="px-3 py-2 border-b border-border space-y-1.5">
                <div className="flex items-center justify-between text-[10px]">
                  <span className="text-muted-foreground">Mã ĐH</span>
                  <span className="font-semibold text-foreground">{isEdit ? (orderCode || `#${id}`) : "—"}</span>
                </div>
                {!isEdit && <div className="text-[9px] text-muted-foreground -mt-0.5">Lưu đơn để tạo mã</div>}
                {showDiscCols ? (
                  <div className="flex items-center justify-between text-[10px]">
                    <span className="text-muted-foreground">Tổng CK</span>
                    <span className="font-semibold text-destructive">
                      {lineDiscountTotal > 0 ? `-${formatCurrency(lineDiscountTotal)}` : "—"}
                    </span>
                  </div>
                ) : null}
                <div className="flex items-center justify-between gap-2 pt-0.5 border-b border-border pb-1.5">
                  <div>
                    <span className="text-[10px] font-semibold text-foreground">Giá trị đơn</span>
                    <p className="text-[9px] text-muted-foreground">Sau CK dòng</p>
                  </div>
                  <span className="text-base font-semibold text-primary tabular-nums">{formatCurrency(subtotal)}</span>
                </div>
                <div className="flex items-center justify-between gap-2 text-[10px]">
                  <span className="text-muted-foreground shrink-0">Phí ship</span>
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
                        ? "border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-200"
                        : "border-border bg-muted/30 text-muted-foreground"
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
                        ? "border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-200"
                        : "border-border bg-muted/30 text-muted-foreground"
                    )}
                  >
                    Khách trả ship
                  </button>
                </div>
                <div className="flex items-center justify-between gap-2 text-[10px]">
                  <span className="text-muted-foreground shrink-0">Đặt cọc</span>
                  <MoneyAmountField
                    value={deposit}
                    onChange={setDeposit}
                    className="text-[11px]"
                    inputClassName="text-[11px] py-1"
                  />
                </div>
                <div className="flex items-center justify-between gap-2 text-[10px]">
                  <span className="text-muted-foreground shrink-0">Tiền NV chịu</span>
                  <MoneyAmountField
                    value={salespersonAbsorbedAmount}
                    onChange={setSalespersonAbsorbedAmount}
                    className="text-[11px]"
                    inputClassName="text-[11px] py-1"
                  />
                </div>
                <div className="flex items-center justify-between text-[10px]">
                  <span className="text-muted-foreground">Thu khách</span>
                  <span className="font-semibold text-foreground tabular-nums">{formatCurrency(customerCollect)}</span>
                </div>
                <div className="flex items-center justify-between text-[10px]">
                  <span className="text-muted-foreground">Shop thu</span>
                  <span className="font-semibold text-foreground tabular-nums">{formatCurrency(shopCollect)}</span>
                </div>
                {showCommCols ? (
                  <div className="flex items-center justify-between text-[10px] pb-0.5">
                    <span className="text-muted-foreground">Hoa hồng</span>
                    <span className="font-semibold text-emerald-700 dark:text-emerald-300 tabular-nums">
                      {formatCurrency(items.reduce((sum, item) => sum + item.commissionAmount, 0))}
                    </span>
                  </div>
                ) : null}
              </div>
              <div className="p-3">
                <button
                  type="button"
                  onClick={submitOrder}
                  className="w-full flex items-center justify-center gap-2 py-3 bg-primary text-primary-foreground rounded-lg text-sm font-semibold hover:opacity-95 transition-opacity"
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
