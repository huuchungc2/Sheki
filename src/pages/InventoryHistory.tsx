import * as React from "react";
import { createPortal } from "react-dom";
import { 
  Search, 
  ArrowUpRight, 
  ArrowDownRight, 
  Calendar, 
  Download,
  ChevronLeft,
  ChevronRight,
  Eye,
  FileText,
  Warehouse,
  User,
  Tag,
  Loader2,
  AlertCircle
} from "lucide-react";
import { Link } from "react-router-dom";
import { cn, formatDate, formatCurrency } from "../lib/utils";
import { GregorianDateSelect } from "../components/GregorianDateSelect";
import { api } from "../lib/api";

type ApiStockMovementRow = {
  id: number;
  warehouse_id: number;
  warehouse_name: string | null;
  product_id: number;
  product_name: string | null;
  sku: string | null;
  type: "import" | "export";
  qty: string | number;
  reason: string | null;
  status: "completed" | "draft" | string;
  total_value: string | number | null;
  staff_name: string | null;
  created_at: string;
};

type UiMovementRow = {
  id: number;
  type: "import" | "export";
  date: string;
  warehouseName: string;
  staffName: string;
  productName: string;
  sku: string;
  qty: number;
  totalValue: number;
  reason: string;
  status: string;
};

function parseApiDate(input: string): Date {
  // MySQL DATETIME thường về dạng "YYYY-MM-DD HH:mm:ss" (không timezone)
  // new Date("YYYY-MM-DD HH:mm:ss") có thể parse lệch/Invalid tùy browser → parse thủ công theo local time
  const s = String(input || "").trim();
  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})(?:[ T](\d{2}):(\d{2})(?::(\d{2}))?)?/);
  if (m) {
    const y = Number(m[1]);
    const mo = Number(m[2]) - 1;
    const d = Number(m[3]);
    const hh = Number(m[4] || 0);
    const mm = Number(m[5] || 0);
    const ss = Number(m[6] || 0);
    return new Date(y, mo, d, hh, mm, ss);
  }
  const dt = new Date(s);
  return Number.isNaN(dt.getTime()) ? new Date() : dt;
}

export function InventoryHistory() {
  const [transactions, setTransactions] = React.useState<UiMovementRow[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [summary, setSummary] = React.useState<{
    importTotalValue: number;
    exportTotalValue: number;
    importCount: number;
    exportCount: number;
  } | null>(null);
  const [search, setSearch] = React.useState("");
  const [type, setType] = React.useState("");
  const [status, setStatus] = React.useState("");
  const [warehouseId, setWarehouseId] = React.useState<string>("");
  const [warehouses, setWarehouses] = React.useState<any[]>([]);
  const [dateFrom, setDateFrom] = React.useState<string>("");
  const [dateTo, setDateTo] = React.useState<string>("");
  const [isDateOpen, setIsDateOpen] = React.useState(false);
  const dateTriggerRef = React.useRef<HTMLButtonElement | null>(null);
  const datePanelRef = React.useRef<HTMLDivElement | null>(null);
  const [datePopoverStyle, setDatePopoverStyle] = React.useState<React.CSSProperties>({});
  const [page, setPage] = React.useState(1);
  const [total, setTotal] = React.useState(0);
  const limit = 10;

  // Load warehouses for filter dropdown
  React.useEffect(() => {
    api.get('/warehouses')
      .then((res: any) => {
        const data = res?.data ?? res ?? [];
        setWarehouses(Array.isArray(data) ? data : []);
      })
      .catch(() => setWarehouses([]));
  }, []);

  // Đặt popup fixed + portal — tránh bị header (z-40) hoặc overflow che
  React.useLayoutEffect(() => {
    if (!isDateOpen) return;
    const update = () => {
      const btn = dateTriggerRef.current;
      if (!btn) return;
      const rect = btn.getBoundingClientRect();
      const w = Math.min(260, window.innerWidth - 16);
      let left = rect.left;
      left = Math.max(8, Math.min(left, window.innerWidth - w - 8));
      const top = rect.bottom + 6;
      setDatePopoverStyle({
        position: "fixed",
        top,
        left,
        width: w,
        zIndex: 200,
      });
    };
    update();
    window.addEventListener("scroll", update, true);
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("scroll", update, true);
      window.removeEventListener("resize", update);
    };
  }, [isDateOpen]);

  // Đóng khi bấm ra ngoài (panel render qua portal — không còn trong cùng node với nút)
  React.useEffect(() => {
    if (!isDateOpen) return;
    const onDown = (e: MouseEvent | TouchEvent) => {
      const t = e.target;
      if (!(t instanceof Node)) return;
      if (dateTriggerRef.current?.contains(t)) return;
      if (datePanelRef.current?.contains(t)) return;
      setIsDateOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("touchstart", onDown, { passive: true });
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("touchstart", onDown);
    };
  }, [isDateOpen]);

  const fetchTransactions = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (type) params.set("type", type);
      if (status) params.set("status", status);
      if (warehouseId) params.set("warehouse_id", warehouseId);
      if (dateFrom) params.set("date_from", dateFrom);
      if (dateTo) params.set("date_to", dateTo);
      params.set("page", String(page));
      params.set("limit", String(limit));

      const json: any = await api.get(`/inventory?${params.toString()}`);
      const rows: ApiStockMovementRow[] = (json?.data ?? []) as any[];

      setTransactions(
        rows.map((r) => ({
          id: Number(r.id),
          type: r.type,
          // backend có thể trả `created_at` (snake) hoặc `createdAt` (camel) tùy driver/transform
          date: String((r as any).created_at ?? (r as any).createdAt ?? ""),
          warehouseName: r.warehouse_name || `Kho #${r.warehouse_id}`,
          staffName: r.staff_name || "—",
          productName: r.product_name || `SP #${r.product_id}`,
          sku: r.sku || "—",
          qty: Math.abs(Number(r.qty) || 0),
          totalValue: Number(r.total_value) || 0,
          reason: r.reason || "—",
          status: r.status || "draft",
        }))
      );
      setTotal(Number(json?.total) || 0);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [search, type, status, warehouseId, dateFrom, dateTo, page]);

  const fetchSummary = React.useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (warehouseId) params.set("warehouse_id", warehouseId);
      if (dateFrom) params.set("date_from", dateFrom);
      if (dateTo) params.set("date_to", dateTo);
      const json: any = await api.get(`/inventory/summary?${params.toString()}`);
      const d = json?.data ?? {};
      setSummary({
        importTotalValue: Number(d.import_total_value) || 0,
        exportTotalValue: Number(d.export_total_value) || 0,
        importCount: Number(d.import_count) || 0,
        exportCount: Number(d.export_count) || 0,
      });
    } catch {
      setSummary(null);
    }
  }, [warehouseId, dateFrom, dateTo]);

  React.useEffect(() => {
    fetchTransactions();
  }, [fetchTransactions]);

  React.useEffect(() => {
    fetchSummary();
  }, [fetchSummary]);

  const totalPages = Math.ceil(total / limit);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Lịch sử Nhập Xuất Kho</h1>
          <p className="text-slate-500 text-sm mt-1">Theo dõi biến động hàng hóa trong kho của bạn.</p>
        </div>
        <div className="flex items-center gap-3">
          <button className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm font-medium text-slate-700 hover:bg-slate-50 transition-all">
            <Download className="w-4 h-4" />
            Xuất báo cáo
          </button>
          <div className="flex bg-white border border-slate-200 rounded-xl p-1 shadow-sm">
            <Link to="/inventory/import" className="px-4 py-1.5 bg-blue-600 text-white rounded-lg text-sm font-bold shadow-sm flex items-center gap-2">
              <ArrowDownRight className="w-4 h-4" />
              Nhập kho
            </Link>
            <Link to="/inventory/export" className="px-4 py-1.5 text-slate-600 hover:bg-slate-50 rounded-lg text-sm font-bold flex items-center gap-2 transition-all">
              <ArrowUpRight className="w-4 h-4" />
              Xuất kho
            </Link>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-200">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Tổng nhập tháng này</p>
          <div className="flex items-center justify-between mt-2">
            <p className="text-xl font-bold text-slate-900">
              {formatCurrency(summary?.importTotalValue ?? 0)}
            </p>
            <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">+12%</span>
          </div>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-slate-200">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Tổng xuất tháng này</p>
          <div className="flex items-center justify-between mt-2">
            <p className="text-xl font-bold text-slate-900">
              {formatCurrency(summary?.exportTotalValue ?? 0)}
            </p>
            <span className="text-[10px] font-bold text-red-600 bg-red-50 px-2 py-0.5 rounded-full">-5%</span>
          </div>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-slate-200">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Số phiếu nhập</p>
          <p className="text-xl font-bold text-slate-900 mt-2">{(summary?.importCount ?? 0)} phiếu</p>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-slate-200">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Số phiếu xuất</p>
          <p className="text-xl font-bold text-slate-900 mt-2">{(summary?.exportCount ?? 0)} phiếu</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="relative w-full md:w-96">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input 
            type="text" 
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder="Tìm theo mã phiếu, người lập..." 
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border-transparent focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 rounded-xl text-sm transition-all outline-none"
          />
        </div>
        <div className="flex flex-wrap items-stretch gap-2 w-full md:w-auto min-w-0">
          <div className="relative flex-1 min-w-[8rem] md:flex-none md:min-w-0">
            <button
              ref={dateTriggerRef}
              type="button"
              onClick={() => setIsDateOpen((v) => !v)}
              className="w-full min-w-0 flex items-center justify-center gap-2 px-3 py-2 bg-slate-50 text-slate-600 rounded-xl text-sm font-medium hover:bg-slate-100 transition-all"
            >
              <Calendar className="w-4 h-4 shrink-0" />
              <span className="truncate min-w-0">
                {dateFrom || dateTo ? `${dateFrom || "…"} → ${dateTo || "…"}` : "Thời gian"}
              </span>
            </button>
            {isDateOpen &&
              createPortal(
                <div
                  ref={datePanelRef}
                  style={datePopoverStyle}
                  className="rounded-xl border border-slate-200 bg-white p-3 shadow-xl max-h-[min(60vh,420px)] flex flex-col"
                >
                  <div className="grid min-h-0 flex-1 grid-cols-1 gap-2.5 overflow-y-auto">
                    <div className="min-w-0">
                      <label className="text-[10px] font-medium uppercase tracking-wide text-slate-400 mb-0.5 block">
                        Từ ngày
                      </label>
                      <GregorianDateSelect
                        allowEmpty
                        hideIcon
                        stacked
                        monthNumericOptions
                        value={dateFrom}
                        onChange={(v) => {
                          setDateFrom(v);
                          setPage(1);
                        }}
                        selectClassName="px-2 py-1.5 bg-slate-50 border border-slate-200 focus:ring-1 focus:ring-blue-500/25 rounded-lg text-xs"
                      />
                    </div>
                    <div className="min-w-0">
                      <label className="text-[10px] font-medium uppercase tracking-wide text-slate-400 mb-0.5 block">
                        Đến ngày
                      </label>
                      <GregorianDateSelect
                        allowEmpty
                        hideIcon
                        stacked
                        monthNumericOptions
                        value={dateTo}
                        onChange={(v) => {
                          setDateTo(v);
                          setPage(1);
                        }}
                        selectClassName="px-2 py-1.5 bg-slate-50 border border-slate-200 focus:ring-1 focus:ring-blue-500/25 rounded-lg text-xs"
                      />
                    </div>
                  </div>
                  <div className="mt-2.5 flex shrink-0 items-center justify-end gap-1.5 border-t border-slate-100 pt-2.5">
                    <button
                      type="button"
                      onClick={() => {
                        setDateFrom("");
                        setDateTo("");
                        setPage(1);
                        setIsDateOpen(false);
                      }}
                      className="px-2.5 py-1.5 rounded-lg text-xs font-medium text-slate-600 hover:bg-slate-50 border border-slate-200"
                    >
                      Xoá lọc
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsDateOpen(false)}
                      className="px-2.5 py-1.5 rounded-lg text-xs font-medium text-white bg-blue-600 hover:bg-blue-700"
                    >
                      Áp dụng
                    </button>
                  </div>
                </div>,
                document.body
              )}
          </div>
          <select 
            value={type}
            onChange={(e) => { setType(e.target.value); setPage(1); }}
            className="flex-1 md:flex-none px-4 py-2 bg-slate-50 text-slate-600 rounded-xl text-sm font-medium outline-none focus:ring-2 focus:ring-blue-500/20"
          >
            <option value="">Tất cả loại phiếu</option>
            <option value="import">Nhập kho</option>
            <option value="export">Xuất kho</option>
          </select>
          <select
            value={warehouseId}
            onChange={(e) => { setWarehouseId(e.target.value); setPage(1); }}
            className="flex-1 md:flex-none px-4 py-2 bg-slate-50 text-slate-600 rounded-xl text-sm font-medium outline-none focus:ring-2 focus:ring-blue-500/20"
          >
            <option value="">Tất cả kho</option>
            {warehouses.filter((w: any) => w.is_active).map((w: any) => (
              <option key={w.id} value={String(w.id)}>{w.name}</option>
            ))}
          </select>
          <select 
            value={status}
            onChange={(e) => { setStatus(e.target.value); setPage(1); }}
            className="flex-1 md:flex-none px-4 py-2 bg-slate-50 text-slate-600 rounded-xl text-sm font-medium outline-none focus:ring-2 focus:ring-blue-500/20"
          >
            <option value="">Tất cả trạng thái</option>
            <option value="completed">Hoàn tất</option>
            <option value="draft">Lưu nháp</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-20 text-red-500">
            <AlertCircle className="w-10 h-10 mb-3" />
            <p className="text-sm font-medium">{error}</p>
            <button onClick={fetchTransactions} className="mt-3 text-sm text-blue-600 hover:underline">Thử lại</button>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/50 border-b border-slate-200">
                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Mã phiếu</th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Loại</th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Thời gian</th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Kho / Người lập</th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Sản phẩm</th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Số lượng</th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Giá trị</th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Trạng thái</th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {transactions.map((tx) => (
                    <tr key={tx.id} className="hover:bg-slate-50/50 transition-all group">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className={cn(
                            "w-8 h-8 rounded-lg flex items-center justify-center",
                            tx.type === "import" ? "bg-blue-50 text-blue-600" : "bg-amber-50 text-amber-600"
                          )}>
                            <FileText className="w-4 h-4" />
                          </div>
                          <span className="text-sm font-bold text-slate-900 font-mono">{tx.id}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={cn(
                          "text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full",
                          tx.type === "import" ? "bg-blue-50 text-blue-600" : "bg-amber-50 text-amber-600"
                        )}>
                          {tx.type === "import" ? "Nhập kho" : "Xuất kho"}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        {tx.date ? (
                          (() => {
                            const dt = parseApiDate(tx.date);
                            return (
                              <>
                                <p className="text-sm text-slate-900">{formatDate(dt)}</p>
                                <p className="text-xs text-slate-500">
                                  {dt.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                                </p>
                              </>
                            );
                          })()
                        ) : (
                          <p className="text-sm text-slate-400">—</p>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2 text-sm text-slate-900">
                          <Warehouse className="w-3 h-3 text-slate-400" />
                          {tx.warehouseName}
                        </div>
                        <div className="flex items-center gap-2 text-xs text-slate-500 mt-1">
                          <User className="w-3 h-3 text-slate-400" />
                          {tx.staffName}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-start gap-2">
                          <Tag className="w-3 h-3 text-slate-400 mt-0.5" />
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-slate-900 truncate">{tx.productName}</p>
                            <p className="text-[10px] text-slate-400 font-mono uppercase tracking-wide">{tx.sku}</p>
                            {tx.reason !== "—" && (
                              <p className="text-[11px] text-slate-500 truncate">{tx.reason}</p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm font-medium text-slate-900">
                        {tx.qty}
                      </td>
                      <td className="px-6 py-4 text-sm font-bold text-slate-900">
                        {formatCurrency(tx.totalValue)}
                      </td>
                      <td className="px-6 py-4">
                        <span className={cn(
                          "inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider",
                          tx.status === "completed" ? "bg-emerald-50 text-emerald-600" : "bg-slate-100 text-slate-500"
                        )}>
                          {tx.status === "completed" ? "Hoàn tất" : "Lưu nháp"}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button className="p-2 hover:bg-slate-100 rounded-lg text-slate-400 transition-all">
                          <Eye className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-6 py-4 border-t border-slate-100">
                <p className="text-sm text-slate-500">Hiển thị {(page - 1) * limit + 1}–{Math.min(page * limit, total)} của {total} kết quả</p>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="p-2 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                    <button
                      key={p}
                      onClick={() => setPage(p)}
                      className={cn(
                        "w-8 h-8 rounded-lg text-sm font-medium transition-all",
                        p === page
                          ? "bg-blue-600 text-white"
                          : "text-slate-600 hover:bg-slate-50"
                      )}
                    >
                      {p}
                    </button>
                  ))}
                  <button
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                    className="p-2 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
