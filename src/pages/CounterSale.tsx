import * as React from "react";
import {
  ArrowLeft,
  Search,
  Plus,
  Minus,
  Store,
  Wallet,
  ArrowRight,
  Truck,
  User,
  Info,
  Calculator,
  Loader2,
  Printer,
  AlertTriangle,
  ChevronUp,
  ChevronDown,
  Package,
  X,
} from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { cn, formatCurrency, formatDate } from "../lib/utils";
import { API_URL, api } from "../lib/api";
import type { OrderItem } from "../types";
import { computeOrderCollects, type ShipPayer } from "../lib/orderCollect";
import { coerceOrderLineBool, pickShopOrderLineBlock } from "../lib/shopOrderLine";
import { mayEditCounterSaleOrder } from "../lib/counterOrderAccess";
import vnLoc from "../lib/vietnam-locations-simple.json";

const COUNTER_ADDRESS = "Mua tại cửa hàng";

function getMainProductImage(p: any): string | null {
  const raw = p?.images;
  if (!raw) return null;
  try {
    const arr = Array.isArray(raw) ? raw : JSON.parse(raw);
    const first = Array.isArray(arr) ? arr[0] : null;
    return typeof first === "string" && first.trim() ? first.trim() : null;
  } catch {
    return null;
  }
}

function resolveImageSrc(img: string | null | undefined) {
  if (!img) return null;
  const v = String(img).trim();
  if (!v) return null;
  if (v.startsWith("/")) {
    const origin = /^https?:\/\//i.test(String(API_URL)) ? String(API_URL).replace(/\/api\/?$/i, "") : "";
    return `${origin}${v}`;
  }
  return v;
}

function paymentLabel(id: string) {
  if (id === "transfer") return "Chuyển khoản";
  if (id === "cod") return "Thu Cod";
  if (id === "cash") return "Tiền mặt";
  return id;
}

function placeholderCustomerAddress() {
  const city = Object.keys(vnLoc)[0] as keyof typeof vnLoc;
  const dists = vnLoc[city] as Record<string, string[]>;
  const district = Object.keys(dists)[0]!;
  const ward = dists[district]![0]!;
  return { city: String(city), district, ward, address: "Mua tại quầy" };
}

type CustomerMode = "search" | "quick";

function buildPrintHtml(opts: {
  code: string;
  customerName: string;
  customerPhone: string;
  items: { name: string; qty: number; lineTotal: number }[];
  subtotal: number;
  vatAmount: number;
  total: number;
  payment: string;
  createdAt: string;
  note: string;
}) {
  const rowHtml = opts.items
    .map(
      (r) =>
        `<tr><td style="padding:4px 0;border-bottom:1px solid #eee">${escapeHtml(
          r.name
        )}</td><td style="text-align:center;padding:4px 0;border-bottom:1px solid #eee">${r.qty}</td><td style="text-align:right;padding:4px 0;border-bottom:1px solid #eee">${formatNumber(
          r.lineTotal
        )}</td></tr>`
    )
    .join("");
  const noteBlock = opts.note.trim()
    ? `<p style="font-size:12px;margin:8px 0 0;color:#555">Ghi chú: ${escapeHtml(opts.note)}</p>`
    : "";
  return `<!DOCTYPE html><html><head><meta charset="utf-8"/><title>Hóa đơn ${escapeHtml(
    opts.code
  )}</title>
  <style>
    @page { size: A5; margin: 8mm; }
    html, body { height: 100%; }
    body { font-family: system-ui, sans-serif; margin: 0; padding: 0; }
    .wrap { padding: 8mm; }
    h1 { font-size: 14px; margin: 0 0 4px; }
    .meta { font-size: 11px; color: #555; margin-bottom: 10px; line-height: 1.35; }
    table { width: 100%; border-collapse: collapse; font-size: 12px; }
    th { text-align: left; font-size: 10px; text-transform: uppercase; color: #666; border-bottom: 1px solid #ccc; padding: 4px 0; }
    td { vertical-align: top; }
    .tot { display: flex; justify-content: space-between; margin-top: 8px; font-size: 13px; font-weight: 700; }
  </style></head><body>
  <div class="wrap">
    <h1>Hóa đơn bán tại quầy</h1>
    <div class="meta">
      <div><strong>${escapeHtml(opts.code)}</strong></div>
      <div>${escapeHtml(opts.createdAt)}</div>
      <div>Khách: ${escapeHtml(opts.customerName)} — ${escapeHtml(opts.customerPhone || "—")}</div>
      <div>PTTT: ${escapeHtml(opts.payment)}</div>
    </div>
    <table>
      <thead><tr><th>Sản phẩm</th><th style="text-align:center">SL</th><th style="text-align:right">T.Tiền</th></tr></thead>
      <tbody>${rowHtml}</tbody>
    </table>
    <div class="tot"><span>Tạm tính</span><span>${formatNumber(opts.subtotal)} ₫</span></div>
    <div class="tot"><span>VAT</span><span>${formatNumber(opts.vatAmount)} ₫</span></div>
    <div class="tot"><span>Thu khách</span><span>${formatNumber(opts.total)} ₫</span></div>
    ${noteBlock}
  </div>
  </body></html>`;
}

function printHtmlViaIframe(html: string) {
  const iframe = document.createElement("iframe");
  iframe.style.position = "fixed";
  iframe.style.right = "0";
  iframe.style.bottom = "0";
  iframe.style.width = "0";
  iframe.style.height = "0";
  iframe.style.border = "0";
  iframe.setAttribute("aria-hidden", "true");
  document.body.appendChild(iframe);

  const cleanup = () => {
    try {
      document.body.removeChild(iframe);
    } catch {
      // ignore
    }
  };

  const w = iframe.contentWindow;
  const d = iframe.contentDocument;
  if (!w || !d) {
    cleanup();
    return false;
  }

  d.open();
  d.write(html);
  d.close();

  // Ensure fonts/layout applied before printing
  setTimeout(() => {
    try {
      w.focus();
      w.print();
    } catch {
      // ignore
    } finally {
      setTimeout(cleanup, 500);
    }
  }, 150);
  return true;
}

function openPrintWindow(opts: Parameters<typeof buildPrintHtml>[0], existing?: Window | null) {
  const w = existing ?? window.open("", "_blank", "noopener,noreferrer");
  if (!w) return null;
  const html = buildPrintHtml(opts);
  w.document.write(html);
  w.document.close();
  w.focus();
  setTimeout(() => {
    try {
      w.print();
    } catch {
      // ignore
    }
  }, 200);
  return w;
}

function escapeHtml(s: string) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function formatNumber(n: number) {
  return new Intl.NumberFormat("vi-VN").format(Math.round(n));
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

export function CounterSale() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const editingOrderId = React.useMemo(() => {
    const raw = String(searchParams.get("edit") || "").trim();
    if (!raw || !/^\d+$/.test(raw)) return null;
    const n = parseInt(raw, 10);
    return Number.isFinite(n) && n > 0 ? n : null;
  }, [searchParams]);

  const [formError, setFormError] = React.useState("");
  const [saving, setSaving] = React.useState(false);
  const [loadingEditOrder, setLoadingEditOrder] = React.useState(false);
  const [payrollPeriodStatus, setPayrollPeriodStatus] = React.useState<string | null>(null);
  const [loadedOrderCode, setLoadedOrderCode] = React.useState<string | null>(null);
  const [baselineQtyByProduct, setBaselineQtyByProduct] = React.useState<Record<string, number>>({});
  const [baselineWarehouseId, setBaselineWarehouseId] = React.useState<number | null>(null);
  const [baselineOrderStatus, setBaselineOrderStatus] = React.useState<string>("");
  const [warehouses, setWarehouses] = React.useState<any[]>([]);
  const [selectedWarehouseId, setSelectedWarehouseId] = React.useState<number | null>(null);
  const [groups, setGroups] = React.useState<any[]>([]);
  const [selectedGroupId, setSelectedGroupId] = React.useState<number | null>(null);

  type CustomerMode2 = CustomerMode | "none";
  const [customerMode, setCustomerMode] = React.useState<CustomerMode2>("none");
  const [customerQuery, setCustomerQuery] = React.useState("");
  const [customerSuggestions, setCustomerSuggestions] = React.useState<any[]>([]);
  const [showCustomerSuggestions, setShowCustomerSuggestions] = React.useState(false);
  const [selectedCustomer, setSelectedCustomer] = React.useState<{ id: string; name: string; phone?: string } | null>(
    null
  );

  const [walkName, setWalkName] = React.useState("");
  const [walkPhone, setWalkPhone] = React.useState("");

  const [productQuery, setProductQuery] = React.useState("");
  const [productSuggestions, setProductSuggestions] = React.useState<any[]>([]);
  const [showProductSuggestions, setShowProductSuggestions] = React.useState(false);
  const productInputRef = React.useRef<HTMLInputElement | null>(null);
  const productPickerWrapRef = React.useRef<HTMLDivElement | null>(null);
  const [items, setItems] = React.useState<OrderItem[]>([]);

  // Cấu hình dòng đơn quầy: /auth/me → shop_order_line.counter
  const [orderLineShowCommission, setOrderLineShowCommission] = React.useState(true);
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

  const [paymentMethod, setPaymentMethod] = React.useState("cash");
  const [orderStatus, setOrderStatus] = React.useState<string>("completed");
  const [orderDiscountAmount, setOrderDiscountAmount] = React.useState<number>(0);
  const [vatRate, setVatRate] = React.useState<number>(0);
  const [vatRateTouched, setVatRateTouched] = React.useState(false);
  const [loadedTaxAmount, setLoadedTaxAmount] = React.useState<number>(0);
  const [shippingFee, setShippingFee] = React.useState<number>(0);
  const [shipPayer, setShipPayer] = React.useState<ShipPayer>("customer");
  const [deposit, setDeposit] = React.useState<number>(0);
  const [salespersonAbsorbedAmount, setSalespersonAbsorbedAmount] = React.useState<number>(0);
  const [note, setNote] = React.useState("");

  const [lastBill, setLastBill] = React.useState<{
    code: string;
    customerName: string;
    customerPhone: string;
    items: { name: string; qty: number; lineTotal: number }[];
    subtotal: number;
    total: number;
    payment: string;
    createdAt: string;
    note: string;
  } | null>(null);

  React.useEffect(() => {
    api
      .get("/warehouses")
      .then((res: any) => {
        const list = Array.isArray(res?.data) ? res.data : [];
        setWarehouses(list);
        const pick =
          list.find((w: any) => Boolean(w?.is_active) && Boolean(w?.is_default)) ||
          list.find((w: any) => Boolean(w?.is_active));
        if (pick?.id != null) {
          const id = Number(pick.id);
          if (Number.isFinite(id)) setSelectedWarehouseId(id);
        }
      })
      .catch(() => setWarehouses([]));
  }, []);

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res: any = await api.get("/auth/me");
        const d = res?.data ?? res;
        const counter = pickShopOrderLineBlock(d?.shop_order_line, "counter");
        if (cancelled) return;
        const dr = Number(counter?.default_commission_rate);
        if (Number.isFinite(dr)) setDefaultCommissionRate(Math.min(100, Math.max(0, dr)));
        const ddr = Number(counter?.default_discount_rate);
        if (Number.isFinite(ddr)) setDefaultDiscountRate(Math.min(100, Math.max(0, ddr)));
        if (counter) {
          setOrderLineShowCommission(coerceOrderLineBool(counter.show_commission, true));
          setOrderLineShowDiscount(coerceOrderLineBool(counter.show_discount, true));
          setQtyAllowDecimal(coerceOrderLineBool(counter.qty_allow_decimal, true));
        }
      } catch {
        // keep fallback 10
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Close product suggestions when clicking outside (desktop/laptop UX)
  React.useEffect(() => {
    const onDown = (e: MouseEvent | TouchEvent) => {
      const el = productPickerWrapRef.current;
      const target = e.target as Node | null;
      if (!el || !target) return;
      if (!el.contains(target)) setShowProductSuggestions(false);
    };
    document.addEventListener("mousedown", onDown, { capture: true });
    document.addEventListener("touchstart", onDown, { capture: true });
    return () => {
      document.removeEventListener("mousedown", onDown, { capture: true } as any);
      document.removeEventListener("touchstart", onDown, { capture: true } as any);
    };
  }, []);

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
    api
      .get(`/groups/user/${user.id}`)
      .then((res: any) => setGroups(res?.data ?? []))
      .catch(() => setGroups([]));
  }, []);

  React.useEffect(() => {
    if (selectedGroupId != null || groups.length !== 1) return;
    const id = Number(groups[0].id);
    if (Number.isFinite(id)) setSelectedGroupId(id);
  }, [groups, selectedGroupId]);

  React.useEffect(() => {
    if (!selectedWarehouseId || items.length === 0) return;
    (async () => {
      try {
        const res: any = await api.get(`/inventory/stock-by-warehouse?warehouse_id=${selectedWarehouseId}`);
        const stockData = res?.data ?? [];
        setItems((prev) =>
          prev.map((item) => {
            const ws = stockData.find((s: any) => String(s.product_id) === String(item.productId));
            const nextAvailable = ws ? Number(ws.available_stock) : 0;
            return { ...item, availableStock: nextAvailable } as OrderItem;
          })
        );
      } catch {
        // ignore
      }
    })();
  }, [selectedWarehouseId, items.map((i) => i.productId).join(",")]);

  const fetchCustomerSuggestions = async (q: string) => {
    if (!q) {
      setCustomerSuggestions([]);
      return;
    }
    try {
      const res = await api.get(`/customers/suggest?q=${encodeURIComponent(q)}`);
      const data = res?.data ?? [];
      setCustomerSuggestions(data.map((c: any) => ({ id: c.id, name: c.name, phone: c.phone })));
    } catch {
      setCustomerSuggestions([]);
    }
  };

  const pickCustomer = (c: any) => {
    setSelectedCustomer({ id: String(c.id), name: c.name, phone: c.phone });
    setCustomerQuery(c.name);
    setShowCustomerSuggestions(false);
  };

  const fetchProductSuggestions = async (q: string) => {
    if (!q) {
      setProductSuggestions([]);
      return;
    }
    try {
      const wh = selectedWarehouseId ? `&warehouse_id=${selectedWarehouseId}` : "";
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

  const addProduct = (product: any) => {
    const defaultRate = orderLineShowCommission ? defaultCommissionRate : 0;
    const existing = items.find((i) => i.productId === product.id);
    if (existing) {
      setItems(
        items.map((i) => {
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
        })
      );
    } else {
      const discR = orderLineShowDiscount ? Math.min(100, Math.max(0, defaultDiscountRate)) : 0;
      const da = orderLineShowDiscount
        ? Math.round(product.price * 1 * (discR / 100) * 100) / 100
        : 0;
      const net = product.price - da;
      const img = product.image != null ? String(product.image) : undefined;
      setItems([
        ...items,
        {
          productId: product.id,
          productName: product.name,
          sku: product.sku,
          price: product.price,
          quantity: qtyMin,
          discountRate: discR,
          discountAmount: da,
          commissionRate: defaultRate,
          commissionAmount: orderLineShowCommission ? Math.round(net * (defaultRate / 100) * 100) / 100 : 0,
          availableStock: product.available_stock ?? 0,
          ...(img ? { image: img } : {}),
        } as OrderItem & { availableStock?: number },
      ]);
    }
    setProductQuery("");
    setShowProductSuggestions(false);
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

  const subtotal = React.useMemo(
    () =>
      items.reduce((s, i) => {
        const line = i.price * i.quantity - i.discountAmount;
        return s + line;
      }, 0),
    [items]
  );

  const lineDiscountTotal = React.useMemo(() => items.reduce((sum, item) => sum + item.discountAmount, 0), [items]);

  const subtotalAfterDiscount = React.useMemo(() => {
    const d = Math.max(0, Math.round((Number(orderDiscountAmount) || 0) * 100) / 100);
    return Math.max(0, subtotal - d);
  }, [subtotal, orderDiscountAmount]);

  // VAT của đơn lưu vào `orders.tax_amount` (schema đã có).
  const vatAmount = React.useMemo(() => {
    const r = Math.max(0, Math.min(100, Math.floor(Number(vatRate) || 0)));
    return Math.round(subtotalAfterDiscount * (r / 100));
  }, [subtotalAfterDiscount, vatRate]);

  const baseForCollects = React.useMemo(
    () => Math.round((Number(subtotalAfterDiscount) + Number(vatAmount)) * 100) / 100,
    [subtotalAfterDiscount, vatAmount]
  );

  const { customerCollect, shopCollect } = React.useMemo(
    () => computeOrderCollects(baseForCollects, shippingFee, deposit, shipPayer),
    [baseForCollects, shippingFee, deposit, shipPayer]
  );

  React.useEffect(() => {
    if (vatRateTouched) return;
    const base = Number(subtotalAfterDiscount) || 0;
    const tax = Number(loadedTaxAmount) || 0;
    if (base <= 0 || tax <= 0) {
      if (tax <= 0) setVatRate(0);
      return;
    }
    const pct = Math.round((tax / base) * 100);
    setVatRate(Math.max(0, Math.min(100, pct)));
  }, [subtotalAfterDiscount, loadedTaxAmount, vatRateTouched]);

  const computeStockMeta = React.useCallback(
    (item: any) => {
      const canAddBackBaseline =
        editingOrderId != null &&
        selectedWarehouseId != null &&
        baselineWarehouseId != null &&
        String(selectedWarehouseId) === String(baselineWarehouseId);
      const avail = Number(item?.availableStock ?? 0) || 0;
      const base = canAddBackBaseline ? Number(baselineQtyByProduct[String(item.productId)] ?? 0) || 0 : 0;
      const maxAllowed = avail + base;
      const overStock = Number(item.quantity) > maxAllowed;
      return { maxAllowed, overStock };
    },
    [editingOrderId, selectedWarehouseId, baselineWarehouseId, baselineQtyByProduct]
  );

  const getShopKey = React.useCallback(() => {
    try {
      const u = JSON.parse(localStorage.getItem("user") || "{}");
      const sid = u?.shop_id != null ? Number(u.shop_id) : null;
      if (sid && Number.isFinite(sid)) return String(sid);
    } catch {
      // ignore
    }
    return "0";
  }, []);

  const ensureWalkInCustomerId = React.useCallback(async () => {
    const shopKey = getShopKey();
    const key = `counter_walkin_customer_id:${shopKey}`;
    const cached = localStorage.getItem(key);
    if (cached && String(cached).trim()) return String(cached).trim();

    const { city, district, ward, address } = placeholderCustomerAddress();
    const phone = "0900000000";
    const name = "Khách lẻ";
    const res: any = await api.post("/customers", {
      name,
      phone,
      address,
      city,
      district,
      ward,
      note: "Auto tạo từ Bán tại quầy",
    });
    const id = res?.id;
    if (!id) throw new Error("Không tạo được khách lẻ");
    localStorage.setItem(key, String(id));
    return String(id);
  }, [getShopKey]);

  React.useEffect(() => {
    if (editingOrderId != null) return;
    setFormError("");
    setPayrollPeriodStatus(null);
    setLoadedOrderCode(null);
    setBaselineQtyByProduct({});
    setBaselineWarehouseId(null);
    setBaselineOrderStatus("");
    setItems([]);
    setNote("");
    setOrderDiscountAmount(0);
    setVatRate(0);
    setVatRateTouched(false);
    setLoadedTaxAmount(0);
    setShippingFee(0);
    setShipPayer("customer");
    setDeposit(0);
    setSalespersonAbsorbedAmount(0);
    setWalkName("");
    setWalkPhone("");
    setSelectedCustomer(null);
    setCustomerQuery("");
    setCustomerMode("none");
    setLastBill(null);
    setSelectedGroupId(null);
  }, [editingOrderId]);

  React.useEffect(() => {
    if (!editingOrderId) {
      setLoadingEditOrder(false);
      return;
    }
    let cancelled = false;
    (async () => {
      setLoadingEditOrder(true);
      setFormError("");
      try {
        const [json, meJson]: any[] = await Promise.all([
          api.get(`/orders/${editingOrderId}`),
          api.get("/auth/me").catch(() => null),
        ]);
        const order = json?.data;
        if (cancelled || !order) return;
        const meD = meJson?.data ?? meJson;
        const counter = pickShopOrderLineBlock(meD?.shop_order_line, "counter");
        const discOn = coerceOrderLineBool(counter?.show_discount, true);
        const commOn = coerceOrderLineBool(counter?.show_commission, true);

        const isCounter =
          Number(order.is_counter_sale) === 1 ||
          String(order.shipping_address || "").trim() === COUNTER_ADDRESS;
        if (!isCounter) {
          navigate(`/orders/edit/${editingOrderId}`, { replace: true });
          return;
        }

        setPayrollPeriodStatus(order.payroll_period_status != null ? String(order.payroll_period_status) : null);
        setLoadedOrderCode(String(order.code || ""));

        const whId = Number(order.warehouse_id);
        setSelectedWarehouseId(Number.isFinite(whId) ? whId : null);
        const gidRaw = order.group_id != null ? Number(order.group_id) : NaN;
        setSelectedGroupId(Number.isFinite(gidRaw) ? gidRaw : null);

        setPaymentMethod(String(order.payment_method || "cash"));
        setOrderStatus(String(order.status || "completed"));
        setOrderDiscountAmount(Math.max(0, Number(order.discount) || 0));
        setLoadedTaxAmount(Math.max(0, Number(order.tax_amount) || 0));
        setVatRateTouched(false);
        setShippingFee(Math.max(0, Number(order.shipping_fee) || 0));
        setShipPayer(order.ship_payer === "shop" ? "shop" : "customer");
        setDeposit(Math.max(0, Number(order.deposit) || 0));
        setSalespersonAbsorbedAmount(Math.max(0, Number(order.salesperson_absorbed_amount) || 0));
        setNote(String(order.note || ""));

        const map: Record<string, number> = {};
        for (const it of order.items || []) {
          const pid = String(it.product_id);
          map[pid] = (map[pid] || 0) + (parseFloat(it.qty) || 0);
        }
        setBaselineQtyByProduct(map);
        setBaselineWarehouseId(Number.isFinite(whId) ? whId : null);
        setBaselineOrderStatus(String(order.status || ""));

        const cid = String(order.customer_id || "");
        const walkKey = `counter_walkin_customer_id:${getShopKey()}`;
        const walkId = localStorage.getItem(walkKey);
        if (walkId && cid === String(walkId).trim()) {
          setCustomerMode("none");
          setSelectedCustomer(null);
          setCustomerQuery("");
          setWalkName("");
          setWalkPhone("");
        } else {
          setCustomerMode("search");
          setSelectedCustomer({
            id: cid,
            name: String(order.customer_name || ""),
            phone: String(order.customer_phone || ""),
          });
          setCustomerQuery(String(order.customer_name || ""));
          setWalkName("");
          setWalkPhone("");
        }

        const mapped = (order.items || []).map(
          (it: any) =>
            ({
              productId: String(it.product_id),
              productName: String(it.product_name || ""),
              sku: it.sku,
              price: Number(it.unit_price) || 0,
              quantity: parseFloat(it.qty) || 0,
              discountRate: Number(it.discount_rate) || 0,
              discountAmount: Number(it.discount_amount) || 0,
              commissionRate: Number(it.commission_rate) || defaultCommissionRate,
              commissionAmount: Number(it.commission_amount) || 0,
              availableStock: 0,
              image: getMainProductImage({ images: it.product_images ?? it.images }) ?? undefined,
            }) as OrderItem & { availableStock?: number }
        );
        setItems(normalizeOrderLineItems(mapped, discOn, commOn));
        setLastBill(null);
      } catch (e: any) {
        if (!cancelled) setFormError(e?.message || "Không tải được đơn");
      } finally {
        if (!cancelled) setLoadingEditOrder(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [editingOrderId, getShopKey, navigate]);

  const resolveCustomerId = async (): Promise<string> => {
    if (customerMode === "none") {
      return await ensureWalkInCustomerId();
    }
    if (customerMode === "search") {
      if (!selectedCustomer?.id) throw new Error("Chọn khách hàng");
      return String(selectedCustomer.id);
    }
    const name = walkName.trim();
    const phone = walkPhone.replace(/\D/g, "");
    if (!name) throw new Error("Nhập tên khách");
    if (phone.length !== 10) throw new Error("Số điện thoại phải đủ 10 chữ số");
    const { city, district, ward, address } = placeholderCustomerAddress();
    try {
      const res: any = await api.post("/customers", {
        name,
        phone,
        address,
        city,
        district,
        ward,
      });
      const id = res?.id;
      if (!id) throw new Error("Không tạo được khách hàng");
      return String(id);
    } catch (e: any) {
      const msg = e?.message || "Không tạo được khách hàng";
      throw new Error(
        msg.includes("403") || msg.includes("quyền")
          ? "Không có quyền tạo khách — chuyển sang «Tìm khách» hoặc liên hệ Admin."
          : msg
      );
    }
  };

  const submit = async () => {
    setFormError("");
    if (editingOrderId && payrollPeriodStatus === "closed") {
      setFormError("Đơn thuộc kỳ lương đã chốt — không sửa được.");
      return;
    }
    if (!selectedWarehouseId) {
      setFormError("Chọn kho xuất");
      return;
    }
    if (!selectedGroupId) {
      setFormError("Chọn nhóm bán hàng");
      return;
    }
    if (items.length === 0) {
      setFormError("Thêm ít nhất một sản phẩm");
      return;
    }
    const disc = Math.max(0, Number(orderDiscountAmount) || 0);
    if (disc > subtotal + 1e-9) {
      setFormError("Giảm giá không được lớn hơn giá trị đơn hàng");
      return;
    }
    if ((Number(deposit) || 0) > (Number(baseForCollects) || 0)) {
      setFormError("Tiền cọc không được lớn hơn giá trị đơn hàng");
      return;
    }
    const bad = items.find((i) => !i.quantity || i.quantity <= 0);
    if (bad) {
      setFormError(`Số lượng không hợp lệ: ${bad.productName}`);
      return;
    }
    const canAddBackBaseline =
      editingOrderId != null &&
      selectedWarehouseId != null &&
      baselineWarehouseId != null &&
      String(selectedWarehouseId) === String(baselineWarehouseId);

    for (const i of items) {
      const avail = Number((i as any).availableStock ?? 0) || 0;
      const base = canAddBackBaseline ? Number(baselineQtyByProduct[String(i.productId)] ?? 0) || 0 : 0;
      if (Number(i.quantity) > avail + base) {
        const max = avail + base;
        setFormError(
          `${i.productName}: vượt tồn kho (tối đa ${max.toFixed(3).replace(/\.?0+$/, "")})`
        );
        return;
      }
    }

    let customerId: string;
    let custName: string;
    let custPhone: string;
    try {
      customerId = await resolveCustomerId();
      if (customerMode === "search" && selectedCustomer) {
        custName = selectedCustomer.name;
        custPhone = String(selectedCustomer.phone ?? "");
      } else if (customerMode === "quick") {
        custName = walkName.trim();
        custPhone = walkPhone.replace(/\D/g, "");
      } else {
        custName = "Khách lẻ";
        custPhone = "";
      }
    } catch (e: any) {
      setFormError(e?.message || "Lỗi khách hàng");
      return;
    }

    const itemsPayload = items.map((i) => {
      const lineSub = i.quantity * i.price - i.discountAmount;
      return {
        product_id: i.productId,
        qty: i.quantity,
        unit_price: i.price,
        discount_rate: i.discountRate,
        discount_amount: i.discountAmount,
        commission_rate: i.commissionRate,
        commission_amount: i.commissionAmount,
        subtotal: lineSub,
      };
    });

    setSaving(true);
    try {
      const payload: any = {
        customer_id: customerId,
        warehouse_id: selectedWarehouseId,
        group_id: selectedGroupId,
        shipping_address: COUNTER_ADDRESS,
        carrier_service: "standard",
        shipping_fee: Math.max(0, Number(shippingFee) || 0),
        ship_payer: shipPayer,
        deposit: Math.max(0, Number(deposit) || 0),
        salesperson_absorbed_amount: Math.max(0, Number(salespersonAbsorbedAmount) || 0),
        payment_method: paymentMethod,
        status: orderStatus,
        discount: Math.max(0, Number(orderDiscountAmount) || 0),
        tax_amount: Math.max(0, Number(vatAmount) || 0),
        note: note.trim() || null,
        items: itemsPayload,
      };

      const billItems = items.map((i) => ({
        name: i.productName,
        qty: i.quantity,
        lineTotal: Math.round((i.price * i.quantity - i.discountAmount) * 100) / 100,
      }));
      const bill = {
        code: "",
        customerName: custName,
        customerPhone: custPhone,
        items: billItems,
        subtotal: Math.round(subtotalAfterDiscount * 100) / 100,
        vatAmount: Math.round(vatAmount * 100) / 100,
        total: Math.round(customerCollect * 100) / 100,
        payment: paymentLabel(paymentMethod),
        createdAt: formatDate(new Date().toISOString()),
        note: note.trim(),
      };

      if (editingOrderId) {
        await api.put(`/orders/${editingOrderId}`, payload);
        printHtmlViaIframe(
          buildPrintHtml({
          ...bill,
          code: loadedOrderCode || `#${editingOrderId}`,
          })
        );
        navigate("/orders/counter-list");
      } else {
        const res: any = await api.post("/orders", { ...payload, is_counter_sale: 1 });
        const code = String(res?.code ?? "");
        const createdBill = { ...bill, code };
        setLastBill(createdBill);
        printHtmlViaIframe(buildPrintHtml(createdBill));

        setItems([]);
        setNote("");
        setWalkName("");
        setWalkPhone("");
        setSelectedCustomer(null);
        setCustomerQuery("");
        setCustomerMode("none");
      }
    } catch (e: any) {
      setFormError(e?.message || (editingOrderId ? "Không cập nhật được đơn" : "Không tạo được đơn"));
    } finally {
      setSaving(false);
    }
  };

  const printAgain = () => {
    if (lastBill) printHtmlViaIframe(buildPrintHtml(lastBill));
  };

  const currentUser = React.useMemo(() => {
    try {
      const u = localStorage.getItem("user");
      return u ? JSON.parse(u) : null;
    } catch {
      return null;
    }
  }, []);

  const mayEditCounter = mayEditCounterSaleOrder(currentUser);
  React.useEffect(() => {
    if (!editingOrderId || loadingEditOrder) return;
    if (!mayEditCounter) navigate("/orders/counter-list", { replace: true });
  }, [editingOrderId, loadingEditOrder, mayEditCounter, navigate]);

  const responsibleSalesDisplay = React.useMemo(() => {
    return currentUser?.full_name || currentUser?.username || "—";
  }, [currentUser]);

  const responsibleSalesInitials = React.useMemo(() => {
    const n = String(responsibleSalesDisplay || "").replace(/[.\s]+/g, " ").trim();
    if (!n || n === "—") return "?";
    const parts = n.split(/\s+/).filter(Boolean);
    if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase().slice(0, 2);
    return n.slice(0, 2).toUpperCase();
  }, [responsibleSalesDisplay]);

  const showCommCols = orderLineShowCommission;
  const showDiscCols = orderLineShowDiscount;
  const lineGridMinPxMobile = React.useMemo(
    () => 740 + (showDiscCols ? 90 : 0) + (showCommCols ? 90 : 0),
    [showDiscCols, showCommCols]
  );

  const counterDesktopColPercents = React.useMemo((): number[] => {
    // Columns: Product | Qty | Unit | (CK%) | (HH%) | Line total | Delete
    if (showDiscCols && showCommCols) return [36, 14, 14, 8, 8, 16, 4];
    if (showDiscCols && !showCommCols) return [40, 16, 16, 10, 14, 4];
    if (!showDiscCols && showCommCols) return [40, 16, 16, 10, 14, 4];
    return [44, 18, 18, 16, 4];
  }, [showDiscCols, showCommCols]);
  const [mobileSummaryExpanded, setMobileSummaryExpanded] = React.useState(false);

  return (
    <div className={cn("max-w-6xl mx-auto", mobileSummaryExpanded ? "pb-32" : "pb-24", "sm:pb-8 lg:pb-20")}>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigate("/orders/counter-list")}
            className="p-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50"
            aria-label="Quay lại"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
              <Store className="w-6 h-6 text-emerald-600" />
              {editingOrderId
                ? `Sửa đơn tại quầy${loadedOrderCode ? ` · ${loadedOrderCode}` : ""}`
                : "Bán tại quầy"}
            </h1>
            <p className="text-sm text-slate-500 mt-0.5">
              Đơn hoàn tất ngay — ship 0 — địa chỉ «{COUNTER_ADDRESS}»
            </p>
          </div>
        </div>
        {lastBill ? (
          <button
            type="button"
            onClick={printAgain}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-200 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            <Printer className="w-4 h-4" />
            In lại {lastBill.code}
          </button>
        ) : null}
      </div>

      {formError ? (
        <div className="flex items-center gap-2 px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          {formError}
        </div>
      ) : null}

      {loadingEditOrder ? (
        <div className="flex items-center gap-2 px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-600">
          <Loader2 className="w-4 h-4 shrink-0 animate-spin" />
          Đang tải đơn…
        </div>
      ) : null}

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-4">
        {/* LEFT */}
        <div className="bg-white border border-slate-200 rounded-2xl p-4 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="text-[11px] text-slate-400 mb-1 block">Kho xuất</label>
            <select
              value={selectedWarehouseId ?? ""}
              onChange={(e) => setSelectedWarehouseId(e.target.value ? Number(e.target.value) : null)}
              className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm bg-white"
            >
              <option value="">— Chọn —</option>
              {warehouses
                .filter((w: any) => w.is_active)
                .map((w: any) => (
                  <option key={w.id} value={w.id}>
                    {w.name}
                  </option>
                ))}
            </select>
          </div>
          <div>
            <label className="text-[11px] text-slate-400 mb-1 block">Nhóm bán hàng</label>
            <select
              value={selectedGroupId ?? ""}
              onChange={(e) => setSelectedGroupId(e.target.value ? Number(e.target.value) : null)}
              className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm bg-white"
            >
              <option value="">— Chọn —</option>
              {groups.map((g: any) => (
                <option key={g.id} value={g.id}>
                  {g.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className="text-[11px] text-slate-400 mb-2 block">Khách hàng</label>
          <div className="grid grid-cols-3 rounded-xl border border-slate-200 overflow-hidden text-xs font-semibold">
            <button
              type="button"
              onClick={() => {
                setCustomerMode("none");
                setSelectedCustomer(null);
                setCustomerQuery("");
                setWalkName("");
                setWalkPhone("");
                setShowCustomerSuggestions(false);
              }}
              className={cn(
                "py-2 px-2 transition-colors",
                customerMode === "none" ? "bg-emerald-600 text-white" : "bg-slate-50 text-slate-600"
              )}
            >
              Bỏ qua
            </button>
            <button
              type="button"
              onClick={() => setCustomerMode("search")}
              className={cn(
                "py-2 px-2 transition-colors border-l border-slate-200",
                customerMode === "search" ? "bg-emerald-600 text-white" : "bg-slate-50 text-slate-600"
              )}
            >
              Tìm khách
            </button>
            <button
              type="button"
              onClick={() => setCustomerMode("quick")}
              className={cn(
                "py-2 px-2 transition-colors border-l border-slate-200",
                customerMode === "quick" ? "bg-emerald-600 text-white" : "bg-slate-50 text-slate-600"
              )}
            >
              Khách lẻ (tạo nhanh)
            </button>
          </div>

          {customerMode === "none" ? (
            <p className="mt-2 text-[11px] text-slate-400">
              Mặc định dùng khách «Khách lẻ» để tạo đơn và in bill (không cần nhập thông tin).
            </p>
          ) : customerMode === "search" ? (
            <div className="relative mt-2">
              <Search className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-slate-300" />
              <input
                type="text"
                placeholder="Tên hoặc SĐT..."
                value={customerQuery}
                onChange={(e) => {
                  setCustomerQuery(e.target.value);
                  setShowCustomerSuggestions(true);
                  fetchCustomerSuggestions(e.target.value);
                  setSelectedCustomer(null);
                }}
                className="w-full pr-10 pl-3 py-2.5 border border-slate-200 rounded-xl text-sm"
              />
              {showCustomerSuggestions && customerQuery.trim() ? (
                <div className="absolute z-20 left-0 right-0 mt-1 bg-white border border-slate-100 rounded-xl shadow-lg max-h-48 overflow-y-auto">
                  {customerSuggestions.length ? (
                    customerSuggestions.map((c) => (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => pickCustomer(c)}
                        className="w-full text-left px-3 py-2 text-sm hover:bg-slate-50 border-b border-slate-50 last:border-0"
                      >
                        <span className="font-medium text-slate-800">{c.name}</span>
                        <span className="text-slate-400 text-xs ml-2">{c.phone}</span>
                      </button>
                    ))
                  ) : (
                    <div className="px-3 py-2 text-xs text-slate-400">Không có kết quả</div>
                  )}
                </div>
              ) : null}
              {selectedCustomer ? (
                <p className="text-xs text-emerald-700 font-semibold mt-1 flex items-center gap-1">
                  <User className="w-3.5 h-3.5" /> Đã chọn: {selectedCustomer.name}
                </p>
              ) : null}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2">
              <input
                type="text"
                placeholder="Tên khách *"
                value={walkName}
                onChange={(e) => setWalkName(e.target.value)}
                className="px-3 py-2.5 border border-slate-200 rounded-xl text-sm"
              />
              <input
                type="tel"
                inputMode="numeric"
                placeholder="SĐT 10 số *"
                value={walkPhone}
                onChange={(e) => setWalkPhone(e.target.value.replace(/\D/g, "").slice(0, 10))}
                className="px-3 py-2.5 border border-slate-200 rounded-xl text-sm"
              />
              <p className="sm:col-span-2 text-[11px] text-slate-400">
                Địa chỉ lưu hệ thống dùng phường mặc định (theo bản đồ VN) — có sửa sau trong Khách hàng.
              </p>
            </div>
          )}
        </div>

        <div ref={productPickerWrapRef}>
          {/* Desktop/tablet: ô tìm SP gọn như OrderForm (không bung full-width) */}
          <div className="hidden sm:flex items-center justify-between gap-3">
            <div className="text-[11px] text-slate-400">Thêm sản phẩm</div>
            <div className="relative w-56">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-300" />
              <input
                type="text"
                placeholder="Tìm sản phẩm, SKU..."
                value={productQuery}
                onChange={(e) => {
                  setProductQuery(e.target.value);
                  setShowProductSuggestions(e.target.value.length > 0);
                  fetchProductSuggestions(e.target.value);
                }}
                onFocus={() => productQuery.length > 0 && setShowProductSuggestions(true)}
                className="w-full pr-3 pl-9 py-1.5 border border-slate-200 rounded-lg text-sm outline-none focus:border-emerald-300 focus:ring-2 focus:ring-emerald-50"
              />
              {showProductSuggestions ? (
                <div className="absolute z-30 left-0 right-0 mt-1 bg-white border border-slate-100 rounded-lg shadow-lg overflow-hidden">
                  <div className="max-h-52 overflow-y-auto overscroll-contain">
                    {productSuggestions.length > 0 ? (
                      productSuggestions.map((p) => (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => addProduct(p)}
                          className="w-full px-4 py-3 flex items-center justify-between hover:bg-slate-50 transition-colors text-left border-b border-slate-50 last:border-0"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="w-9 h-9 rounded-lg bg-slate-100 border border-slate-200 overflow-hidden flex items-center justify-center shrink-0">
                              {resolveImageSrc(p.image) ? (
                                <img
                                  src={resolveImageSrc(p.image) as string}
                                  alt=""
                                  className="w-full h-full object-cover"
                                  loading="lazy"
                                  onError={(e) => {
                                    (e.target as HTMLImageElement).style.display = "none";
                                  }}
                                />
                              ) : (
                                <Package className="w-4 h-4 text-slate-300" />
                              )}
                            </div>
                            <div className="min-w-0">
                              <p className="text-sm font-medium text-slate-800 truncate">{p.name}</p>
                              <p className="text-[10px] text-slate-400 uppercase tracking-wide font-mono truncate">
                                {p.sku}
                              </p>
                            </div>
                          </div>
                          <div className="text-right shrink-0 pl-3">
                            <p className="text-sm font-medium text-slate-800">{formatCurrency(p.price)}</p>
                            <p className="text-[10px] text-slate-400">Thêm</p>
                          </div>
                        </button>
                      ))
                    ) : (
                      <div className="px-4 py-6 text-center text-slate-400 text-sm">Không tìm thấy sản phẩm</div>
                    )}
                  </div>
                </div>
              ) : null}
            </div>
          </div>

          <div className="sm:hidden">
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
                    setShowProductSuggestions(e.target.value.length > 0);
                    fetchProductSuggestions(e.target.value);
                  }}
                  onFocus={() => {
                    if (productQuery.length > 0) setShowProductSuggestions(true);
                  }}
                  className="w-full h-10 pl-10 pr-3 border border-slate-200 rounded-xl text-sm outline-none focus:border-emerald-300 focus:ring-2 focus:ring-emerald-50 bg-white"
                />
                {showProductSuggestions ? (
                  <div className="absolute z-30 left-0 right-0 mt-1 bg-white border border-slate-100 rounded-xl shadow-lg overflow-hidden">
                    <div className="max-h-[min(60vh,20rem)] overflow-y-auto overscroll-contain">
                      {productSuggestions.length > 0 ? (
                        productSuggestions.map((p) => (
                          <button
                            key={p.id}
                            type="button"
                            onClick={() => addProduct(p)}
                            className="w-full px-4 py-2.5 flex items-center justify-between hover:bg-slate-50 transition-colors text-left border-b border-slate-50 last:border-0"
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              <div className="w-8 h-8 rounded-lg bg-slate-100 border border-slate-200 overflow-hidden flex items-center justify-center shrink-0">
                                {resolveImageSrc(p.image) ? (
                                  <img
                                    src={resolveImageSrc(p.image) as string}
                                    alt=""
                                    className="w-full h-full object-cover"
                                    loading="lazy"
                                    onError={(e) => {
                                      (e.target as HTMLImageElement).style.display = "none";
                                    }}
                                  />
                                ) : (
                                  <Package className="w-4 h-4 text-slate-300" />
                                )}
                              </div>
                              <div className="min-w-0">
                                <p className="text-[13px] font-semibold text-slate-800 truncate leading-tight">
                                  {p.name}
                                </p>
                                <p className="text-[10px] text-slate-400 uppercase tracking-wide font-mono truncate leading-tight">
                                  {p.sku}
                                </p>
                              </div>
                            </div>
                            <div className="text-right flex-shrink-0 pl-3">
                              <p className="text-[13px] font-semibold text-slate-800 tabular-nums">
                                {formatCurrency(p.price)}
                              </p>
                            </div>
                          </button>
                        ))
                      ) : (
                        <div className="px-4 py-6 text-center text-slate-400 text-sm">Không tìm thấy sản phẩm</div>
                      )}
                    </div>
                  </div>
                ) : null}
              </div>
              <button
                type="button"
                onClick={() => {
                  productInputRef.current?.focus();
                  setShowProductSuggestions(true);
                  if (productQuery.length > 0) fetchProductSuggestions(productQuery);
                }}
                className="h-10 w-10 rounded-xl border border-slate-200 bg-white flex items-center justify-center text-emerald-700 hover:bg-emerald-50 hover:border-emerald-200 transition-colors shrink-0"
                aria-label="Mở tìm sản phẩm"
              >
                <Plus className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>

        {items.length === 0 ? (
          <div className="py-12 text-center text-slate-400">
            <Package className="w-7 h-7 mx-auto mb-2 text-slate-200" />
            <p className="text-sm">Chưa có sản phẩm. Tìm và thêm bên trên.</p>
          </div>
        ) : (
          <>
            {/* Mobile: giống OrderForm — thumbnail + cuộn ngang bảng dòng */}
            <div className="block sm:hidden">
              <div className="overflow-x-auto">
                <div className="min-w-0" style={{ minWidth: lineGridMinPxMobile }}>
                  <div className="sticky top-0 z-10 px-4 pt-3 pb-2 border-b border-slate-100 bg-slate-50">
                    <div className="flex gap-3 text-[11px] font-semibold text-slate-600 uppercase tracking-wide">
                      <div className="w-[260px]">Sản phẩm</div>
                      <div className="w-[190px] text-center">Số lượng</div>
                      <div className="w-[140px] text-right">Đơn giá</div>
                      {showDiscCols ? <div className="w-[90px] text-center">CK%</div> : null}
                      {showCommCols ? <div className="w-[90px] text-center">HH%</div> : null}
                      <div className="w-[120px] text-right">Thành tiền</div>
                      <div className="w-[30px]" />
                    </div>
                  </div>

                  <div className="px-4 py-2 divide-y divide-slate-100">
                    {items.map((it) => {
                      const lineTotal = it.price * it.quantity - it.discountAmount;
                      const { maxAllowed, overStock } = computeStockMeta(it as any);
                      return (
                        <div
                          key={it.productId}
                          className={cn("flex items-center gap-3 py-2.5", overStock ? "bg-red-50/40" : "")}
                        >
                          <div className="w-[260px] min-w-0">
                            <div className="flex items-center gap-2 min-w-0">
                              <div className="w-9 h-9 rounded-lg bg-slate-100 border border-slate-200 overflow-hidden flex items-center justify-center shrink-0">
                                {resolveImageSrc((it as any).image) ? (
                                  <img
                                    src={resolveImageSrc((it as any).image) as string}
                                    alt=""
                                    className="w-full h-full object-cover"
                                    loading="lazy"
                                    onError={(e) => {
                                      (e.target as HTMLImageElement).style.display = "none";
                                    }}
                                  />
                                ) : (
                                  <Package className="w-4 h-4 text-slate-300" />
                                )}
                              </div>
                              <div className="min-w-0">
                                <p className="text-[13px] font-semibold text-slate-800 truncate">{it.productName}</p>
                                <p className="mt-0.5 text-[10px] text-slate-400 font-mono uppercase tracking-wide truncate">
                                  {it.sku}
                                </p>
                              </div>
                            </div>
                            <p className={cn("mt-0.5 text-[10px]", overStock ? "text-red-600 font-medium" : "text-slate-500")}>
                              Có thể bán: {maxAllowed.toFixed(3).replace(/\.?0+$/, "")}
                              {overStock ? <span className="ml-1">— Vượt tồn</span> : null}
                            </p>
                          </div>

                          <div className="w-[190px]">
                            <div className="flex items-center justify-center gap-2">
                              <button
                                type="button"
                                onClick={() => {
                                  const v = roundQty(it.quantity - 1);
                                  if (!qtyAllowDecimal && v <= 1) {
                                    setItems((prev) => prev.filter((x) => x.productId !== it.productId));
                                    return;
                                  }
                                  if (qtyAllowDecimal && v <= qtyMin + 1e-9) {
                                    setItems((prev) => prev.filter((x) => x.productId !== it.productId));
                                    return;
                                  }
                                  updateItem(it.productId, { quantity: v });
                                }}
                                className="w-8 h-8 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-slate-600"
                              >
                                <Minus className="w-4 h-4" />
                              </button>
                              <input
                                type="number"
                                min={qtyMin}
                                step={qtyStep}
                                value={it.quantity}
                                onChange={(e) => {
                                  const raw = parseFloat(e.target.value);
                                  const v = Number.isFinite(raw) && raw > 0 ? raw : qtyMin;
                                  updateItem(it.productId, { quantity: roundQty(v) });
                                }}
                                className={cn(
                                  "w-24 h-8 rounded-lg border px-2 text-center text-[13px] font-semibold outline-none",
                                  overStock
                                    ? "border-red-300 bg-red-50 text-red-700"
                                    : "border-slate-200 bg-white text-slate-800"
                                )}
                              />
                              <button
                                type="button"
                                onClick={() => {
                                  const next = roundQty(it.quantity + 1);
                                  if (next > maxAllowed + 1e-9) return;
                                  updateItem(it.productId, { quantity: next });
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
                              value={it.price}
                              onChange={(e) =>
                                updateItem(it.productId, { price: Math.max(0, Number(e.target.value) || 0) })
                              }
                              className="w-full h-8 rounded-lg border border-slate-200 bg-white px-2 text-right text-[13px] font-semibold text-slate-800 outline-none"
                            />
                          </div>
                          {showDiscCols ? (
                            <div className="w-[90px] flex justify-center">
                              <input
                                type="number"
                                min={0}
                                max={100}
                                value={it.discountRate}
                                onChange={(e) =>
                                  updateItem(it.productId, {
                                    discountRate: Math.min(100, Math.max(0, Number(e.target.value) || 0)),
                                  })
                                }
                                className="w-16 h-8 rounded-lg border border-rose-200 bg-rose-50 px-2 text-center text-[13px] font-semibold text-rose-800 outline-none"
                              />
                            </div>
                          ) : null}
                          {showCommCols ? (
                            <div className="w-[90px] flex justify-center">
                              <input
                                type="number"
                                min={0}
                                max={100}
                                value={it.commissionRate}
                                onChange={(e) =>
                                  updateItem(it.productId, {
                                    commissionRate: Math.min(100, Math.max(0, Number(e.target.value) || 0)),
                                  })
                                }
                                className="w-16 h-8 rounded-lg border border-green-200 bg-green-50 px-2 text-center text-[13px] font-semibold text-green-800 outline-none"
                              />
                            </div>
                          ) : null}
                          <div className="w-[120px] text-right">
                            <p className="text-[13px] font-semibold text-slate-900">{formatCurrency(lineTotal)}</p>
                            {showCommCols ? (
                              <p className="mt-0.5 text-[10px] font-semibold text-green-700">
                                HH: {formatCurrency(it.commissionAmount)}
                              </p>
                            ) : null}
                          </div>
                          <div className="w-[30px] flex justify-end">
                            <button
                              type="button"
                              onClick={() => setItems((prev) => prev.filter((x) => x.productId !== it.productId))}
                              className="w-8 h-8 rounded-lg border border-slate-200 flex items-center justify-center text-slate-400 hover:text-red-600 hover:border-red-200 hover:bg-red-50 transition-colors"
                              aria-label="Xóa sản phẩm"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                    <div className="flex gap-3 items-center py-2.5 border-t border-slate-200 bg-slate-50 text-[11px]">
                      <div className="w-[260px] shrink-0 font-semibold text-slate-600">
                        Giá trị đơn ({items.length} SP)
                      </div>
                      <div className="w-[190px] shrink-0 text-center font-medium text-slate-700">
                        {items
                          .reduce((s, i) => s + i.quantity, 0)
                          .toFixed(qtyPrecision)
                          .replace(/\.?0+$/, "")}
                      </div>
                      <div className="w-[140px] shrink-0" />
                      {showDiscCols ? (
                        <div className="w-[90px] shrink-0 text-center text-red-600 font-medium tabular-nums">
                          {lineDiscountTotal > 0 ? `-${formatCurrency(lineDiscountTotal)}` : "—"}
                        </div>
                      ) : null}
                      {showCommCols ? <div className="w-[90px] shrink-0" /> : null}
                      <div className="w-[120px] shrink-0 text-right">
                        <p className="text-[13px] font-semibold text-slate-800">{formatCurrency(subtotal)}</p>
                        {showCommCols ? (
                          <p className="mt-0.5 text-[10px] font-semibold text-green-700">
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

            {/* Desktop/tablet */}
            <div className="hidden sm:block overflow-x-auto">
              <table className="w-full border-collapse text-xs" style={{ tableLayout: "fixed" }}>
                <colgroup>
                  {counterDesktopColPercents.map((pct, i) => (
                    <col key={i} style={{ width: `${pct}%` }} />
                  ))}
                </colgroup>
                <thead>
                  <tr className="border-b border-slate-100 text-slate-400 text-[11px] uppercase tracking-wide">
                    <th className="px-4 py-2 text-left font-medium">Sản phẩm</th>
                    <th className="px-3 py-2 text-center font-medium">Số lượng</th>
                    <th className="px-3 py-2 text-right font-medium">Đơn giá</th>
                    {showDiscCols ? <th className="px-2 py-2 text-center font-medium">CK%</th> : null}
                    {showCommCols ? <th className="px-2 py-2 text-center font-medium">HH%</th> : null}
                    <th className="px-3 py-2 text-right font-medium">Thành tiền</th>
                    <th className="px-2 py-2" />
                  </tr>
                </thead>
                <tbody>
                  {items.map((it) => {
                    const lineTotal = it.price * it.quantity - it.discountAmount;
                    const { maxAllowed, overStock } = computeStockMeta(it as any);
                    return (
                      <tr
                        key={it.productId}
                        className={cn(
                          "group border-b border-slate-50 last:border-0 transition-colors",
                          overStock ? "bg-red-50/70" : "hover:bg-slate-50/60"
                        )}
                      >
                        <td className="px-4 py-2.5">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-lg bg-slate-100 border border-slate-200 overflow-hidden flex items-center justify-center shrink-0">
                              {resolveImageSrc((it as any).image) ? (
                                <img
                                  src={resolveImageSrc((it as any).image) as string}
                                  alt=""
                                  className="w-full h-full object-cover"
                                  loading="lazy"
                                  onError={(e) => {
                                    (e.target as HTMLImageElement).style.display = "none";
                                  }}
                                />
                              ) : (
                                <Package className="w-4 h-4 text-slate-300" />
                              )}
                            </div>
                            <div className="min-w-0">
                              <p className="font-medium text-slate-800 truncate text-xs leading-tight">{it.productName}</p>
                              <p className="text-slate-400 font-mono text-[10px] leading-tight truncate">{it.sku}</p>
                              <p
                                className={cn(
                                  "text-[10px] leading-tight",
                                  overStock ? "text-red-500 font-medium" : "text-slate-400"
                                )}
                              >
                                Có thể bán: {maxAllowed.toFixed(3).replace(/\.?0+$/, "")}
                                {overStock ? <span className="ml-1">— Vượt</span> : null}
                              </p>
                            </div>
                          </div>
                        </td>

                        <td className="px-3 py-2.5">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              type="button"
                              onClick={() => {
                                  const v = roundQty(it.quantity - 1);
                                  if (!qtyAllowDecimal && v <= 1) {
                                    setItems((prev) => prev.filter((x) => x.productId !== it.productId));
                                    return;
                                  }
                                  if (qtyAllowDecimal && v <= qtyMin + 1e-9) {
                                  setItems((prev) => prev.filter((x) => x.productId !== it.productId));
                                  return;
                                }
                                updateItem(it.productId, { quantity: v });
                              }}
                              className="w-5 h-5 rounded bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 transition-colors shrink-0"
                            >
                              <Minus className="w-2.5 h-2.5" />
                            </button>
                            <input
                              type="number"
                              min={qtyMin}
                              step={qtyStep}
                              value={it.quantity}
                              onChange={(e) => {
                                const raw = parseFloat(e.target.value);
                                const v = Number.isFinite(raw) && raw > 0 ? raw : qtyMin;
                                updateItem(it.productId, { quantity: roundQty(v) });
                              }}
                              className={cn(
                                "w-20 h-6 px-1 border rounded text-center text-xs font-medium outline-none focus:ring-1 transition-colors tabular-nums",
                                overStock
                                  ? "border-red-300 bg-red-50 focus:border-red-400 focus:ring-red-100 text-red-700"
                                  : "border-slate-200 bg-white focus:border-emerald-300 focus:ring-emerald-100"
                              )}
                            />
                            <button
                              type="button"
                              onClick={() => {
                                const next = roundQty(it.quantity + 1);
                                if (next > maxAllowed + 1e-9) return;
                                updateItem(it.productId, { quantity: next });
                              }}
                              className="w-5 h-5 rounded bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 transition-colors shrink-0"
                            >
                              <Plus className="w-2.5 h-2.5" />
                            </button>
                          </div>
                        </td>

                        <td className="px-3 py-2.5">
                          <input
                            type="number"
                            min={0}
                            value={it.price}
                            onChange={(e) =>
                              updateItem(it.productId, { price: Math.max(0, Number(e.target.value) || 0) })
                            }
                            className="w-full h-6 px-2 bg-transparent border border-transparent hover:border-slate-200 focus:bg-white focus:border-emerald-300 rounded text-right text-xs font-medium text-slate-700 outline-none focus:ring-1 focus:ring-emerald-100 transition-colors tabular-nums"
                          />
                        </td>

                        {showDiscCols ? (
                          <td className="px-2 py-2.5">
                            <div className="flex items-center justify-center gap-1">
                              <input
                                type="number"
                                min={0}
                                max={100}
                                value={it.discountRate}
                                onChange={(e) =>
                                  updateItem(it.productId, {
                                    discountRate: Math.min(100, Math.max(0, Number(e.target.value) || 0)),
                                  })
                                }
                                className="w-14 h-6 px-1.5 bg-rose-50 border border-transparent hover:border-rose-200 focus:bg-white focus:border-rose-400 rounded text-center text-xs font-semibold text-rose-800 outline-none focus:ring-1 focus:ring-rose-100 transition-colors tabular-nums"
                              />
                              <span className="text-rose-500 text-[10px] font-semibold">%</span>
                            </div>
                          </td>
                        ) : null}

                        {showCommCols ? (
                          <td className="px-2 py-2.5">
                            <div className="flex flex-col items-center gap-0.5">
                              <div className="flex items-center gap-1 justify-center">
                                <input
                                  type="number"
                                  min={0}
                                  max={100}
                                  value={it.commissionRate}
                                  onChange={(e) =>
                                    updateItem(it.productId, {
                                      commissionRate: Math.min(100, Math.max(0, Number(e.target.value) || 0)),
                                    })
                                  }
                                  className="w-14 h-6 px-1.5 bg-green-50 border border-transparent hover:border-green-200 focus:bg-white focus:border-green-400 rounded text-center text-xs font-semibold text-green-700 outline-none focus:ring-1 focus:ring-green-100 transition-colors tabular-nums"
                                />
                                <span className="text-green-600 text-[10px] font-semibold">%</span>
                              </div>
                              <span className="text-green-600 text-[10px] font-semibold tabular-nums">
                                {formatCurrency(it.commissionAmount)}
                              </span>
                            </div>
                          </td>
                        ) : null}

                        <td className="px-3 py-2.5 text-right">
                          <span className="font-medium text-slate-900 text-xs tabular-nums">
                            {formatCurrency(lineTotal)}
                          </span>
                        </td>

                        <td className="px-2 py-2.5 text-center">
                          <button
                            type="button"
                            onClick={() => setItems((prev) => prev.filter((x) => x.productId !== it.productId))}
                            className="w-6 h-6 rounded flex items-center justify-center text-slate-300 hover:text-red-500 hover:bg-red-50 transition-colors opacity-0 group-hover:opacity-100"
                            aria-label="Xóa sản phẩm"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}
        </div>

        {/* RIGHT */}
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
                  {!editingOrderId ? (
                    <p className="text-[10px] text-slate-400 mt-0.5 leading-tight">Lưu đơn để tạo mã</p>
                  ) : null}
                </div>
                <span className="font-medium text-slate-800">{editingOrderId ? (loadedOrderCode || `#${editingOrderId}`) : "—"}</span>
              </div>
              <div className="flex items-center justify-between py-1.5 border-b border-slate-50 text-sm gap-2">
                <span className="text-slate-400 shrink-0">Giảm giá</span>
                <MoneyAmountField value={Math.max(0, Number(orderDiscountAmount) || 0)} onChange={setOrderDiscountAmount} className="text-sm" />
              </div>
              <div className="flex items-center justify-between py-2 border-b border-slate-100">
                <div>
                  <span className="text-sm font-semibold text-slate-700">Giá trị đơn</span>
                  <p className="text-[10px] text-slate-400 mt-0.5">Tổng sau chiết khấu dòng</p>
                </div>
                <span className="text-xl font-semibold text-red-600 tabular-nums">{formatCurrency(subtotalAfterDiscount)}</span>
              </div>
              <div className="flex items-center justify-between py-1.5 border-b border-slate-50 text-sm gap-2">
                <span className="text-slate-400 shrink-0">VAT</span>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min={0}
                    max={100}
                    step={1}
                    value={Math.max(0, Math.min(100, Math.floor(Number(vatRate) || 0)))}
                    onChange={(e) => {
                      const v = Math.floor(Number(e.target.value) || 0);
                      setVatRateTouched(true);
                      setVatRate(Math.max(0, Math.min(100, v)));
                    }}
                    className="w-20 h-8 rounded-lg border border-slate-200 bg-white px-2 text-right text-[13px] font-semibold text-slate-800 outline-none focus:border-blue-300 focus:ring-2 focus:ring-blue-50 tabular-nums"
                    aria-label="VAT %"
                  />
                  <span className="text-[11px] text-slate-400 font-semibold">%</span>
                  <span className="min-w-[7rem] text-right font-semibold text-slate-800 tabular-nums">
                    {vatAmount > 0 ? formatCurrency(vatAmount) : "—"}
                  </span>
                </div>
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
              {/* Tiền NV chịu: tạm ẩn trên Bán tại quầy */}
              <div className="flex items-center justify-between py-1.5 border-b border-slate-50 text-sm">
                <span className="text-slate-400">Thu khách</span>
                <span className="font-medium text-slate-800">{formatCurrency(customerCollect)}</span>
              </div>
              <div className="flex items-center justify-between py-1.5 border-b border-slate-50 text-sm">
                <span className="text-slate-400">Shop thu</span>
                <span className="font-medium text-indigo-700">{formatCurrency(shopCollect)}</span>
              </div>
            </div>
            {showCommCols ? (
              <div className="mt-3 flex items-center justify-between px-3 py-2 bg-green-50 rounded-lg">
                <span className="text-xs text-green-700">Tổng hoa hồng</span>
                <span className="text-sm font-semibold text-green-800">
                  {formatCurrency(items.reduce((sum, item) => sum + item.commissionAmount, 0))}
                </span>
              </div>
            ) : null}
          </div>

          {/* Cài đặt đơn hàng */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-4">
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
                  { id: "transfer", label: "Chuyển khoản", icon: ArrowRight },
                  { id: "cod", label: "Thu Cod", icon: Truck },
                  { id: "cash", label: "Tiền mặt", icon: Wallet },
                ].map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setPaymentMethod(m.id)}
                    className={cn(
                      "flex-1 flex flex-col items-center gap-1 py-2 border rounded-lg text-[10px] font-medium transition-all",
                      paymentMethod === m.id
                        ? "border-emerald-400 bg-emerald-50 text-emerald-700"
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
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:border-emerald-300 focus:ring-2 focus:ring-emerald-50 transition-all bg-white"
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
                <div className="w-7 h-7 rounded-full bg-emerald-50 flex items-center justify-center text-[10px] font-semibold text-emerald-700 flex-shrink-0">
                  {responsibleSalesInitials}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-800 truncate">{responsibleSalesDisplay}</p>
                  <p className="text-[10px] text-slate-400">Nhân viên bán hàng (sales) — người lên đơn</p>
                </div>
              </div>
            </div>

            <div>
              <label className="text-[11px] text-slate-400 mb-1.5 block">Ghi chú (tuỳ chọn)</label>
              <input
                type="text"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Ghi chú đơn / in kèm bill"
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
              />
            </div>
          </div>

          <button
            type="button"
            disabled={saving || loadingEditOrder}
            onClick={submit}
            className="hidden lg:inline-flex w-full items-center justify-center gap-2 py-3 rounded-xl bg-emerald-600 text-white font-bold text-sm hover:bg-emerald-700 disabled:opacity-50"
          >
            {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Printer className="w-5 h-5" />}
            {editingOrderId ? "Cập nhật & in bill" : "Thanh toán & in bill"}
          </button>
        </div>
      </div>

      {/* Mobile sticky summary */}
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
                <div className="text-[9px] text-slate-400 mt-0.5">
                  {showDiscCols || showCommCols ? (
                    <>
                      Chạm để xem{" "}
                      {[showDiscCols ? "CK" : null, showCommCols ? "HH" : null].filter(Boolean).join(", ")}…
                    </>
                  ) : (
                    <>Chạm để xem chi tiết…</>
                  )}
                </div>
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
                disabled={saving || loadingEditOrder}
                onClick={submit}
                className="shrink-0 flex flex-col items-center justify-center gap-0.5 px-4 py-2 bg-emerald-600 text-white rounded-lg text-xs font-semibold hover:bg-emerald-700 transition-all min-w-[5.5rem] disabled:opacity-50"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Printer className="w-4 h-4" />}
                {editingOrderId ? "Lưu" : "In bill"}
              </button>
            </div>
          ) : (
            <div className="rounded-xl border border-slate-200 bg-white/95 backdrop-blur shadow-lg max-h-[min(70vh,520px)] overflow-y-auto">
              <div className="flex items-center justify-between px-3 py-2 border-b border-slate-100 bg-slate-50/80">
                <span className="text-xs font-semibold text-slate-600">Tổng kết</span>
                <button
                  type="button"
                  onClick={() => setMobileSummaryExpanded(false)}
                  className="flex items-center gap-1 text-[11px] text-slate-500 hover:text-slate-800 py-1 px-2 rounded-lg hover:bg-slate-100"
                >
                  <ChevronDown className="w-4 h-4" />
                  Thu gọn
                </button>
              </div>
              <div className="px-3 py-2 space-y-2">
                <div className="flex items-center justify-between text-[10px]">
                  <span className="text-slate-500">Mã ĐH</span>
                  <span className="font-semibold text-slate-800">
                    {editingOrderId ? (loadedOrderCode || `#${editingOrderId}`) : "—"}
                  </span>
                </div>
                <div className="flex items-center justify-between text-[10px] gap-2">
                  <span className="text-slate-500 shrink-0">Giảm giá</span>
                  <MoneyAmountField
                    value={Math.max(0, Number(orderDiscountAmount) || 0)}
                    onChange={setOrderDiscountAmount}
                    className="text-[11px]"
                    inputClassName="text-[11px] py-1"
                  />
                </div>
                <div className="flex items-center justify-between text-[10px]">
                  <span className="text-slate-500">Giá trị đơn</span>
                  <span className="font-semibold text-emerald-700">{formatCurrency(subtotalAfterDiscount)}</span>
                </div>
                <div className="flex items-center justify-between text-[10px] gap-2">
                  <span className="text-slate-500 shrink-0">VAT</span>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="number"
                      min={0}
                      max={100}
                      step={1}
                      value={Math.max(0, Math.min(100, Math.floor(Number(vatRate) || 0)))}
                      onChange={(e) => {
                        const v = Math.floor(Number(e.target.value) || 0);
                        setVatRateTouched(true);
                        setVatRate(Math.max(0, Math.min(100, v)));
                      }}
                      className="w-14 h-7 rounded-md border border-slate-200 bg-white px-2 text-right text-[11px] font-semibold text-slate-800 outline-none focus:border-blue-300 focus:ring-1 focus:ring-blue-50 tabular-nums"
                      aria-label="VAT %"
                    />
                    <span className="text-[10px] text-slate-400 font-semibold">%</span>
                    <span className="min-w-[5.5rem] text-right font-semibold text-slate-800 tabular-nums">
                      {vatAmount > 0 ? formatCurrency(vatAmount) : "—"}
                    </span>
                  </div>
                </div>
                <div className="flex items-center justify-between text-[10px] gap-2">
                  <span className="text-slate-500 shrink-0">Phí vận chuyển</span>
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
                <div className="flex items-center justify-between text-[10px] gap-2">
                  <span className="text-slate-500 shrink-0">Đặt cọc</span>
                  <MoneyAmountField
                    value={deposit}
                    onChange={setDeposit}
                    className="text-[11px]"
                    inputClassName="text-[11px] py-1"
                  />
                </div>
                {/* Tiền NV chịu: tạm ẩn trên Bán tại quầy */}
                <div className="flex items-center justify-between text-[10px]">
                  <span className="text-slate-500">Thu khách</span>
                  <span className="font-semibold text-slate-800">{formatCurrency(customerCollect)}</span>
                </div>
                <div className="flex items-center justify-between text-[10px]">
                  <span className="text-slate-500">Shop thu</span>
                  <span className="font-semibold text-indigo-700">{formatCurrency(shopCollect)}</span>
                </div>
                {showCommCols ? (
                  <div className="flex items-center justify-between text-[10px]">
                    <span className="text-slate-500">Hoa hồng</span>
                    <span className="font-semibold text-green-700">
                      {formatCurrency(items.reduce((s, i) => s + i.commissionAmount, 0))}
                    </span>
                  </div>
                ) : null}
              </div>
              <div className="p-3">
                <button
                  type="button"
                  disabled={saving || loadingEditOrder}
                  onClick={submit}
                  className="w-full flex items-center justify-center gap-2 py-3 bg-emerald-600 text-white rounded-lg text-sm font-semibold hover:bg-emerald-700 transition-all disabled:opacity-50"
                >
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Printer className="w-4 h-4" />}
                  {editingOrderId ? "Cập nhật & in bill" : "Thanh toán & in bill"}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
