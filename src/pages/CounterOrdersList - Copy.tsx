import * as React from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Search, Printer, ChevronLeft, ChevronRight, Store, Trash2, Loader2 } from "lucide-react";
import { cn, formatCurrency, formatDate } from "../lib/utils";
import { mayDeleteCounterSaleOrder, mayEditCounterSaleOrder } from "../lib/counterOrderAccess";

const API_URL = (import.meta as any)?.env?.VITE_API_URL || "/api";

function getToken() {
  return localStorage.getItem("token") || "";
}

type DatePreset = "today" | "week" | "month" | "last_month" | "last_year" | "custom" | "";

function toDateStr(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function getPresetRange(preset: DatePreset): { from: string; to: string } {
  const today = new Date();
  const y = today.getFullYear();
  const m = today.getMonth();
  const d = today.getDate();
  if (preset === "today") return { from: toDateStr(today), to: toDateStr(today) };
  if (preset === "week") {
    const dow = today.getDay(); // 0=CN, 1=T2...
    const diffMon = dow === 0 ? -6 : 1 - dow;
    const mon = new Date(y, m, d + diffMon);
    const sun = new Date(y, m, d + diffMon + 6);
    return { from: toDateStr(mon), to: toDateStr(sun) };
  }
  if (preset === "month") return { from: toDateStr(new Date(y, m, 1)), to: toDateStr(new Date(y, m + 1, 0)) };
  if (preset === "last_month")
    return { from: toDateStr(new Date(y, m - 1, 1)), to: toDateStr(new Date(y, m, 0)) };
  if (preset === "last_year") return { from: toDateStr(new Date(y - 1, 0, 1)), to: toDateStr(new Date(y - 1, 11, 31)) };
  return { from: "", to: "" };
}

function readListParams(sp: URLSearchParams) {
  const today = toDateStr(new Date());
  const page = Math.max(1, parseInt(sp.get("page") || "1", 10) || 1);
  const limit = Math.max(5, Math.min(100, parseInt(sp.get("limit") || "20", 10) || 20));
  const search = sp.get("q") ?? "";
  const product = sp.get("product") ?? "";
  const status = sp.get("status") ?? "";
  const groupId = sp.get("group") ?? "";
  const employeeId = sp.get("employee") ?? "";
  const rawPreset = sp.get("preset") as DatePreset | null;
  const datePreset: DatePreset =
    rawPreset && ["today", "week", "month", "last_month", "last_year", "custom", ""].includes(rawPreset)
      ? rawPreset || "today"
      : "today";
  const dateFrom = sp.get("from") ?? today;
  const dateTo = sp.get("to") ?? today;
  return { page, limit, search, product, status, groupId, employeeId, datePreset, dateFrom, dateTo };
}

function buildQs(sp: URLSearchParams) {
  const p = readListParams(sp);
  const q = new URLSearchParams();
  q.set("counter", "1");
  q.set("page", String(p.page));
  q.set("limit", String(p.limit));
  if (p.search.trim()) q.set("search", p.search.trim());
  if (p.product.trim()) q.set("product", p.product.trim());
  if (p.status.trim()) q.set("status", p.status.trim());
  if (p.groupId.trim()) q.set("group_id", p.groupId.trim());
  if (p.employeeId.trim()) q.set("employee", p.employeeId.trim());
  if (p.dateFrom.trim()) q.set("date_from", p.dateFrom.trim());
  if (p.dateTo.trim()) q.set("date_to", p.dateTo.trim());
  return q.toString();
}

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
  const escapeHtml = (s: string) =>
    String(s || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");

  const formatNumber = (n: number) => new Intl.NumberFormat("vi-VN").format(Math.round(n));

  const rowHtml = opts.items
    .map(
      (r) =>
        `<tr><td style="padding:4px 0;border-bottom:1px solid rgb(238 238 238)">${escapeHtml(
          r.name
        )}</td><td style="text-align:center;padding:4px 0;border-bottom:1px solid rgb(238 238 238)">${r.qty}</td><td style="text-align:right;padding:4px 0;border-bottom:1px solid rgb(238 238 238)">${formatNumber(
          r.lineTotal
        )}</td></tr>`
    )
    .join("");

  const noteBlock = opts.note.trim()
    ? `<p style="font-size:12px;margin:8px 0 0;color:rgb(85 85 85)">Ghi chú: ${escapeHtml(opts.note)}</p>`
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
    .meta { font-size: 11px; color: rgb(85 85 85); margin-bottom: 10px; line-height: 1.35; }
    table { width: 100%; border-collapse: collapse; font-size: 12px; }
    th { text-align: left; font-size: 10px; text-transform: uppercase; color: rgb(102 102 102); border-bottom: 1px solid rgb(204 204 204); padding: 4px 0; }
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
    } catch {}
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

  setTimeout(() => {
    try {
      w.focus();
      w.print();
    } finally {
      setTimeout(cleanup, 500);
    }
  }, 150);
  return true;
}

export function CounterOrdersList() {
  const [sp, setSp] = useSearchParams();
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [rows, setRows] = React.useState<any[]>([]);
  const [total, setTotal] = React.useState(0);
  const [summary, setSummary] = React.useState<{ total_orders: number; total_revenue: number } | null>(null);

  const currentUser = React.useMemo(() => {
    try {
      const u = localStorage.getItem("user");
      return u ? JSON.parse(u) : null;
    } catch {
      return null;
    }
  }, []);
  const isAdmin = currentUser?.can_access_admin === true || currentUser?.role === "admin";

  const [deletingId, setDeletingId] = React.useState<string | null>(null);
  const [listTick, setListTick] = React.useState(0);

  const handleDeleteOrder = async (id: string) => {
    if (!mayDeleteCounterSaleOrder(currentUser)) return;
    if (!confirm("Xóa đơn tại quầy này?")) return;
    try {
      setDeletingId(id);
      const res = await fetch(`${API_URL}/orders/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error || "Không xóa được đơn");
      setListTick((t) => t + 1);
    } catch (e: any) {
      alert(e?.message || "Không xóa được đơn");
    } finally {
      setDeletingId(null);
    }
  };

  const { page, limit, search, product, status, groupId, employeeId, datePreset, dateFrom, dateTo } = React.useMemo(
    () => readListParams(sp),
    [sp.toString()]
  );

  const [searchInput, setSearchInput] = React.useState(search);
  const [productInput, setProductInput] = React.useState(product);
  const [groups, setGroups] = React.useState<any[]>([]);
  const [employees, setEmployees] = React.useState<any[]>([]);

  const patchListParams = React.useCallback(
    (patch: Record<string, string | null | undefined>, opts?: { resetPage?: boolean }) => {
      setSp(
        (prev) => {
          const next = new URLSearchParams(prev);
          for (const [k, v] of Object.entries(patch)) {
            if (v === null || v === undefined || v === "") next.delete(k);
            else next.set(k, v);
          }
          if (opts?.resetPage) next.set("page", "1");
          return next;
        },
        { replace: true }
      );
    },
    [setSp]
  );

  React.useEffect(() => setSearchInput(search), [search]);
  React.useEffect(() => setProductInput(product), [product]);

  // Debounce search/product like OrderList (simple)
  React.useEffect(() => {
    const t = window.setTimeout(() => {
      patchListParams({ q: searchInput.trim() || null }, { resetPage: true });
    }, 300);
    return () => window.clearTimeout(t);
  }, [searchInput]);

  React.useEffect(() => {
    const t = window.setTimeout(() => {
      patchListParams({ product: productInput.trim() || null }, { resetPage: true });
    }, 300);
    return () => window.clearTimeout(t);
  }, [productInput]);

  React.useEffect(() => {
    const token = getToken();
    if (!token) return;
    fetch(`${API_URL}/groups`, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => setGroups(Array.isArray(j?.data) ? j.data : []))
      .catch(() => setGroups([]));
  }, []);

  React.useEffect(() => {
    if (!isAdmin) return;
    const token = getToken();
    if (!token) return;
    const qs = new URLSearchParams({ scoped: "1", limit: "200", active_only: "1" });
    fetch(`${API_URL}/users?${qs.toString()}`, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => setEmployees(Array.isArray(j?.data) ? j.data : []))
      .catch(() => setEmployees([]));
  }, [isAdmin]);

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const qs = buildQs(sp);
        const res = await fetch(`${API_URL}/orders?${qs}`, {
          headers: { Authorization: `Bearer ${getToken()}` },
        });
        const json = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(json?.error || "Không tải được đơn tại quầy");
        if (cancelled) return;
        setRows(Array.isArray(json?.data) ? json.data : []);
        setTotal(Number(json?.total) || 0);
        setSummary(json?.summary || null);
      } catch (e: any) {
        if (!cancelled) setError(e?.message || "Không tải được dữ liệu");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [sp, listTick]);

  const totalPages = Math.max(1, Math.ceil((total || 0) / limit));
  const goPage = (p: number) => {
    const next = new URLSearchParams(sp);
    next.set("page", String(Math.max(1, Math.min(totalPages, p))));
    setSp(next, { replace: true });
  };

  return (
    <div className="max-w-6xl mx-auto space-y-4 min-w-0">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-foreground flex items-center gap-2">
            <Store className="w-6 h-6 text-primary" />
            Đơn tại quầy
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">Dùng cùng bộ lọc như “Đơn hàng”, nhưng chỉ lấy đơn tại quầy.</p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            to="/orders/counter"
            className="shrink-0 inline-flex items-center justify-center h-10 px-4 rounded-md bg-primary text-primary-foreground text-sm font-semibold hover:opacity-95 transition-opacity"
          >
            Bán tại quầy
          </Link>
        </div>
      </div>

      {/* Filter bar (same shape as OrderList) */}
      <div className="bg-card border border-border rounded-xl p-4 space-y-3">
        <div className="flex flex-wrap gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Mã đơn, tên khách..."
              className="w-full h-10 pl-9 pr-4 bg-background border border-input rounded-md text-sm font-medium text-foreground outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            />
          </div>
          <div className="relative flex-1 min-w-[220px]">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              value={productInput}
              onChange={(e) => setProductInput(e.target.value)}
              placeholder="Tên/SKU sản phẩm..."
              className="w-full h-10 pl-9 pr-4 bg-background border border-input rounded-md text-sm font-medium text-foreground outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            />
          </div>

          <select
            value={status}
            onChange={(e) => patchListParams({ status: e.target.value || null }, { resetPage: true })}
            className="h-10 px-3 bg-background border border-input rounded-md text-sm font-semibold text-foreground outline-none appearance-none cursor-pointer transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background min-w-[150px]"
          >
            <option value="">Tất cả trạng thái</option>
            <option value="pending">Chờ duyệt</option>
            <option value="shipping">Đang giao</option>
            <option value="completed">Đã giao</option>
            <option value="cancelled">Đã hủy</option>
          </select>

          <select
            value={groupId}
            onChange={(e) => patchListParams({ group: e.target.value || null }, { resetPage: true })}
            className="h-10 px-3 bg-background border border-input rounded-md text-sm font-semibold text-foreground outline-none appearance-none cursor-pointer transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background min-w-[150px]"
          >
            <option value="">Tất cả nhóm</option>
            {groups.map((g: any) => (
              <option key={g.id} value={g.id}>
                {g.name}
              </option>
            ))}
          </select>

          {isAdmin ? (
            <select
              value={employeeId}
              onChange={(e) => patchListParams({ employee: e.target.value || null }, { resetPage: true })}
              className="h-10 px-3 bg-background border border-input rounded-md text-sm font-semibold text-foreground outline-none appearance-none cursor-pointer transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background min-w-[190px]"
              title="Lọc theo nhân viên"
            >
              <option value="">Tất cả nhân viên</option>
              {employees.map((u: any) => (
                <option key={u.id} value={u.id}>
                  {u.full_name || u.username || `#${u.id}`}
                </option>
              ))}
            </select>
          ) : null}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <select
            value={datePreset}
            onChange={(e) => {
              const p = (e.target.value || "today") as DatePreset;
              if (p === "custom") {
                patchListParams({ preset: "custom" }, { resetPage: true });
                return;
              }
              const { from, to } = getPresetRange(p);
              patchListParams({ preset: p, from, to }, { resetPage: true });
            }}
            className="h-10 px-3 bg-background border border-input rounded-md text-sm font-semibold text-foreground outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          >
            <option value="today">Hôm nay</option>
            <option value="week">Tuần này</option>
            <option value="month">Tháng này</option>
            <option value="last_month">Tháng trước</option>
            <option value="last_year">Năm trước</option>
            <option value="custom">Tuỳ chọn</option>
          </select>
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => patchListParams({ preset: "custom", from: e.target.value }, { resetPage: true })}
            className="h-10 px-3 bg-background border border-input rounded-md text-sm font-medium text-foreground outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          />
          <span className="text-muted-foreground text-sm">→</span>
          <input
            type="date"
            value={dateTo}
            onChange={(e) => patchListParams({ preset: "custom", to: e.target.value }, { resetPage: true })}
            className="h-10 px-3 bg-background border border-input rounded-md text-sm font-medium text-foreground outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          />
          <button
            type="button"
            onClick={() => setSp(new URLSearchParams({ preset: "today" }), { replace: true })}
            className="ml-auto h-10 px-3 rounded-md text-sm font-semibold bg-background border border-border hover:bg-accent transition-colors"
          >
            Reset lọc
          </button>
        </div>
      </div>

      {summary ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="bg-card border border-border rounded-xl p-4">
            <div className="text-[11px] font-semibold text-muted-foreground uppercase tracking-widest">Số đơn</div>
            <div className="mt-1 text-2xl font-semibold text-foreground tabular-nums">{summary.total_orders}</div>
          </div>
          <div className="bg-card border border-border rounded-xl p-4">
            <div className="text-[11px] font-semibold text-muted-foreground uppercase tracking-widest">Tổng giá trị đơn</div>
            <div className="mt-1 text-2xl font-semibold text-emerald-700 dark:text-emerald-300 tabular-nums">
              {formatCurrency(summary.total_revenue)}
            </div>
          </div>
        </div>
      ) : null}

      {error ? (
        <div className="bg-destructive/10 border border-destructive/30 rounded-xl p-4 text-sm font-semibold text-destructive">{error}</div>
      ) : null}

      <div className="bg-card border border-border rounded-xl overflow-hidden">
        {loading ? (
          <div className="p-10 text-sm text-muted-foreground">Đang tải...</div>
        ) : rows.length === 0 ? (
          <div className="p-10 text-sm text-muted-foreground">Chưa có đơn tại quầy.</div>
        ) : (
          <div className="overflow-auto">
            <table className="min-w-[1040px] w-full text-sm">
              <thead className="bg-muted/30">
                <tr>
                  <th className="text-left px-4 py-3 font-semibold text-muted-foreground border-b border-border">Mã đơn</th>
                  <th className="text-left px-4 py-3 font-semibold text-muted-foreground border-b border-border">Thời gian</th>
                  <th className="text-left px-4 py-3 font-semibold text-muted-foreground border-b border-border">Khách</th>
                  <th className="text-right px-4 py-3 font-semibold text-muted-foreground border-b border-border">Giá trị đơn</th>
                  <th className="text-right px-4 py-3 font-semibold text-muted-foreground border-b border-border">Thu khách</th>
                  <th className="text-center px-4 py-3 font-semibold text-muted-foreground border-b border-border">In</th>
                  <th className="text-center px-4 py-3 font-semibold text-muted-foreground border-b border-border w-[88px]">Xóa</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {rows.map((o) => (
                  <tr key={o.id} className="hover:bg-muted/20 transition-colors">
                    <td className="px-4 py-3 font-semibold text-foreground">
                      {mayEditCounterSaleOrder(currentUser) ? (
                        <Link to={`/orders/counter?edit=${o.id}`} className="hover:underline">
                          {o.code}
                        </Link>
                      ) : (
                        <span>{o.code}</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{formatDate(o.created_at)}</td>
                    <td className="px-4 py-3 text-foreground">
                      <div className="font-semibold">{o.customer_name || "—"}</div>
                      <div className="text-xs text-muted-foreground">{o.customer_phone || ""}</div>
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-foreground tabular-nums">
                      {formatCurrency(Number(o.subtotal) || 0)}
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-emerald-700 dark:text-emerald-300 tabular-nums">
                      {formatCurrency(Number(o.customer_collect ?? o.total_amount) || 0)}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button
                        type="button"
                        onClick={async () => {
                          try {
                            const res = await fetch(`${API_URL}/orders/${o.id}`, {
                              headers: { Authorization: `Bearer ${getToken()}` },
                            });
                            const json = await res.json().catch(() => ({}));
                            if (!res.ok) throw new Error(json?.error || "Không tải được chi tiết đơn");
                            const order = json?.data ?? json;
                            const items = Array.isArray(order?.items) ? order.items : [];
                            const mapped = items.map((it: any) => ({
                              name: it.product_name ?? it.productName ?? "",
                              qty: Number(it.qty ?? it.quantity ?? 0) || 0,
                              lineTotal:
                                Math.round(
                                  ((Number(it.unit_price ?? it.price) || 0) * (Number(it.qty ?? it.quantity) || 0) -
                                    (Number(it.discount_amount) || 0)) * 100
                                ) / 100,
                            }));
                            printHtmlViaIframe(
                              buildPrintHtml({
                              code: String(order?.code ?? ""),
                              customerName: String(order?.customer_name ?? ""),
                              customerPhone: String(order?.customer_phone ?? ""),
                              items: mapped,
                              subtotal: Number(order?.subtotal) || 0,
                              vatAmount: Number(order?.tax_amount) || 0,
                              total: Number(order?.customer_collect ?? order?.total_amount) || 0,
                              payment: String(order?.payment_method ?? ""),
                              createdAt: formatDate(order?.created_at ?? new Date().toISOString()),
                              note: String(order?.note ?? ""),
                              })
                            );
                          } catch (e: any) {
                            alert(e?.message || "Không in được bill");
                          }
                        }}
                        className={cn(
                          "inline-flex items-center justify-center w-10 h-10 rounded-md border border-border bg-background hover:bg-accent transition-colors",
                          "text-muted-foreground hover:text-foreground"
                        )}
                        aria-label="In bill"
                        title="In bill"
                      >
                        <Printer className="w-4 h-4" />
                      </button>
                    </td>
                    <td className="px-4 py-3 text-center">
                      {mayDeleteCounterSaleOrder(currentUser) ? (
                        <button
                          type="button"
                          onClick={() => handleDeleteOrder(String(o.id))}
                          disabled={deletingId === String(o.id)}
                          className="inline-flex items-center justify-center w-10 h-10 rounded-md border border-border bg-background hover:bg-destructive hover:text-destructive-foreground hover:border-destructive/50 text-muted-foreground transition-colors disabled:opacity-50"
                          aria-label="Xóa đơn tại quầy"
                        >
                          {deletingId === String(o.id) ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Trash2 className="w-4 h-4" />
                          )}
                        </button>
                      ) : (
                        <span className="text-muted-foreground/60">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="flex items-center justify-between">
        <div className="text-sm text-muted-foreground">
          Trang <span className="font-semibold text-foreground">{page}</span>/<span className="font-semibold text-foreground">{totalPages}</span> · Tổng{" "}
          <span className="font-semibold text-foreground">{total}</span> đơn
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => goPage(page - 1)}
            disabled={page <= 1}
            className="inline-flex items-center gap-1 h-10 px-3 rounded-md border border-border bg-background text-sm font-semibold text-foreground disabled:opacity-50 hover:bg-accent transition-colors"
          >
            <ChevronLeft className="w-4 h-4" /> Trước
          </button>
          <button
            type="button"
            onClick={() => goPage(page + 1)}
            disabled={page >= totalPages}
            className="inline-flex items-center gap-1 h-10 px-3 rounded-md border border-border bg-background text-sm font-semibold text-foreground disabled:opacity-50 hover:bg-accent transition-colors"
          >
            Sau <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

