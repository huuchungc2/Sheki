import * as React from "react";
import {
  Search,
  Filter,
  Plus,
  Download,
  ChevronLeft,
  ChevronRight,
  UserCircle,
  Phone,
  Mail,
  Star,
  MoreVertical,
  Edit2,
  Trash2,
  Eye,
  History,
  Upload,
  Loader2,
  AlertTriangle,
  RefreshCw
} from "lucide-react";
import { Link, useSearchParams, useLocation } from "react-router-dom";
import { cn, formatCurrency, formatDate } from "../lib/utils";
import { parseListPage, getVisiblePageNumbers } from "../lib/listUrl";

const API_URL =
  (import.meta as any)?.env?.VITE_API_URL ||
  "/api";

const tierColors: Record<string, string> = {
  Silver: "bg-muted text-muted-foreground border border-border",
  Gold: "bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950/30 dark:text-amber-300 dark:border-amber-900/50",
  Platinum: "bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-950/30 dark:text-blue-300 dark:border-blue-900/50",
  Diamond: "bg-indigo-50 text-indigo-700 border border-indigo-200 dark:bg-indigo-950/30 dark:text-indigo-300 dark:border-indigo-900/50",
};

function getAuthToken(): string | null {
  return localStorage.getItem("token");
}

function isAdmin(): boolean {
  try {
    const user = JSON.parse(localStorage.getItem("user") || "{}");
    return user?.can_access_admin === true || user?.role === "admin";
  } catch {
    return false;
  }
}

function readCustomerListParams(sp: URLSearchParams) {
  return {
    page: parseListPage(sp),
    search: sp.get("q") ?? "",
    tier: sp.get("tier") ?? "",
  };
}

export function CustomerList() {
  const [searchParams, setSearchParams] = useSearchParams();
  const location = useLocation();
  const customersListReturn = `${location.pathname}${location.search}`;

  const { page, search, tier } = React.useMemo(
    () => readCustomerListParams(searchParams),
    [searchParams.toString()]
  );

  const [customers, setCustomers] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [total, setTotal] = React.useState(0);
  const [deletingId, setDeletingId] = React.useState<string | null>(null);
  const [searchInput, setSearchInput] = React.useState("");
  const [isComposing, setIsComposing] = React.useState(false);
  const limit = 20;
  const admin = isAdmin();

  const patchListParams = React.useCallback(
    (patch: Record<string, string | null | undefined>, opts?: { resetPage?: boolean }) => {
      setSearchParams(
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
    [setSearchParams]
  );

  const setPage = React.useCallback(
    (p: number | ((prev: number) => number)) => {
      const current = parseListPage(searchParams);
      const nextPage = typeof p === "function" ? p(current) : p;
      patchListParams({ page: String(Math.max(1, nextPage)) });
    },
    [searchParams, patchListParams]
  );

  React.useEffect(() => {
    setSearchInput(search);
  }, [search]);

  React.useEffect(() => {
    if (isComposing) return;
    const t = window.setTimeout(() => {
      const next = searchInput;
      if (next === search) return;
      const hasMeaningful = next.trim().length > 0;
      patchListParams({ q: hasMeaningful ? next : null }, { resetPage: true });
    }, 350);
    return () => window.clearTimeout(t);
  }, [searchInput, search, patchListParams, isComposing]);

  const fetchCustomers = React.useCallback(async () => {
    const { page: p, search: q, tier: t } = readCustomerListParams(searchParams);
    try {
      setLoading(true);
      setError(null);
      const token = getAuthToken();
      const params = new URLSearchParams({
        search: q,
        tier: t,
        page: String(p),
        limit: String(limit),
      });
      const res = await fetch(`${API_URL}/customers?${params}`, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (!res.ok) {
        if (res.status === 401) throw new Error("Phiên đăng nhập hết hạn. Vui lòng đăng nhập lại.");
        if (res.status === 403) throw new Error("Bạn không có quyền truy cập.");
        throw new Error("Không thể tải danh sách khách hàng");
      }
      const json = await res.json();
      const newTotal = json.total || 0;
      setCustomers(json.data || []);
      setTotal(newTotal);
      const totalPages = Math.ceil(newTotal / limit);
      if (totalPages > 0 && p > totalPages) {
        patchListParams({ page: String(totalPages) });
      }
    } catch (err: any) {
      setError(err.message);
      setCustomers([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [searchParams.toString(), patchListParams]);

  React.useEffect(() => {
    fetchCustomers();
  }, [fetchCustomers]);

  const handleExport = async () => {
    try {
      const token = getAuthToken();
      const res = await fetch(`${API_URL}/import/export/customers`, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (!res.ok) throw new Error("Xuất dữ liệu thất bại");
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "danh_sach_khach_hang.xlsx";
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleDelete = async (id: string) => {
    if (!admin) {
      setError("Chỉ quản trị viên mới được xóa khách hàng.");
      return;
    }
    if (!confirm("Bạn có chắc muốn xóa khách hàng này?")) return;
    try {
      setDeletingId(id);
      setError(null);
      const token = getAuthToken();
      const res = await fetch(`${API_URL}/customers/${id}`, {
        method: "DELETE",
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (!res.ok) {
        if (res.status === 403) throw new Error("Bạn không có quyền xóa.");
        throw new Error("Không thể xóa khách hàng");
      }
      fetchCustomers();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setDeletingId(null);
    }
  };

  const totalPages = Math.ceil(total / limit);

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Quản lý khách hàng</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Theo dõi hành vi mua sắm và hạng thành viên.</p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={handleExport} className="flex items-center gap-2 h-10 px-4 bg-background border border-border rounded-md text-sm font-semibold text-foreground hover:bg-accent transition-colors">
            <Download className="w-4 h-4" />
            Xuất dữ liệu
          </button>
          <Link to="/customers/import" className="flex items-center gap-2 h-10 px-4 bg-background border border-border rounded-md text-sm font-semibold text-foreground hover:bg-accent transition-colors">
            <Upload className="w-4 h-4" />
            Nhập hàng loạt
          </Link>
          <Link to="/customers/new" state={{ customersListReturn }} className="flex items-center gap-2 h-10 px-4 bg-primary text-primary-foreground rounded-md text-sm font-semibold hover:opacity-95 transition-opacity">
            <Plus className="w-4 h-4" />
            Thêm khách hàng
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="bg-card p-4 rounded-lg border border-border">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Tổng khách hàng</p>
          <p className="text-xl font-semibold text-foreground mt-2 tabular-nums">{total.toLocaleString()}</p>
        </div>
        <div className="bg-card p-4 rounded-lg border border-border">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Khách hàng mới (Tháng)</p>
          <p className="text-xl font-semibold text-foreground mt-2">—</p>
        </div>
        <div className="bg-card p-4 rounded-lg border border-border">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Tỷ lệ quay lại</p>
          <p className="text-xl font-semibold text-foreground mt-2">—</p>
        </div>
        <div className="bg-card p-4 rounded-lg border border-border">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Hạng Diamond</p>
          <p className="text-xl font-semibold text-foreground mt-2 tabular-nums">{customers.filter((c: any) => c.tier === "Diamond").length}</p>
        </div>
      </div>

      <div className="bg-card p-4 rounded-lg border border-border flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="relative w-full md:w-96">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onCompositionStart={() => setIsComposing(true)}
            onCompositionEnd={(e) => {
              setIsComposing(false);
              setSearchInput((e.target as HTMLInputElement).value);
            }}
            placeholder="Tìm theo tên, SĐT, email..."
            className="w-full h-10 pl-9 pr-3 bg-background border border-input rounded-md text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          />
        </div>
        <div className="flex items-center gap-2 w-full md:w-auto">
          <button className="flex-1 md:flex-none flex items-center justify-center gap-2 h-10 px-4 bg-background border border-border text-foreground rounded-md text-sm font-semibold hover:bg-accent transition-colors">
            <Filter className="w-4 h-4" />
            Bộ lọc
          </button>
          <select
            value={tier}
            onChange={(e) => { patchListParams({ tier: e.target.value || null }, { resetPage: true }); }}
            className="flex-1 md:flex-none h-10 px-3 bg-background border border-input text-foreground rounded-md text-sm font-medium outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          >
            <option value="">Tất cả hạng</option>
            <option value="Diamond">Diamond</option>
            <option value="Platinum">Platinum</option>
            <option value="Gold">Gold</option>
            <option value="Silver">Silver</option>
          </select>
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/10 text-destructive px-4 py-3 text-sm flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
          <button
            onClick={fetchCustomers}
            className="flex items-center gap-1 text-destructive hover:opacity-80 text-xs font-medium flex-shrink-0"
          >
            <RefreshCw className="w-3 h-3" />
            Thử lại
          </button>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 text-muted-foreground animate-spin" />
        </div>
      ) : (
        <>
          <div className="bg-card rounded-lg border border-border overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-muted border-b border-border">
                    <th className="px-6 py-4 text-xs font-medium text-muted-foreground uppercase tracking-wide">Khách hàng</th>
                    <th className="px-6 py-4 text-xs font-medium text-muted-foreground uppercase tracking-wide">Liên hệ</th>
                    <th className="px-6 py-4 text-xs font-medium text-muted-foreground uppercase tracking-wide">Hạng</th>
                    <th className="px-6 py-4 text-xs font-medium text-muted-foreground uppercase tracking-wide">Tổng chi tiêu</th>
                    <th className="px-6 py-4 text-xs font-medium text-muted-foreground uppercase tracking-wide">Lần cuối</th>
                    <th className="px-6 py-4 text-xs font-medium text-muted-foreground uppercase tracking-wide text-right"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {customers.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-12 text-center text-muted-foreground">
                        Không có khách hàng nào
                      </td>
                    </tr>
                  ) : (
                    customers.map((customer: any) => (
                      <tr key={customer.id} className="hover:bg-accent/30 transition-colors group">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center text-muted-foreground font-semibold group-hover:bg-accent group-hover:text-foreground transition-colors">
                              {(customer.name || "U").split(' ').map((n: string) => n[0]).join('').slice(0, 2)}
                            </div>
                            <div>
                              <p className="text-sm font-semibold text-foreground">{customer.name}</p>
                              <p className="text-xs text-muted-foreground font-mono uppercase tabular-nums">{customer.id}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              <Phone className="w-3 h-3" />
                              {customer.phone || "—"}
                            </div>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              <Mail className="w-3 h-3" />
                              {customer.email || "—"}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className={cn(
                            "inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wide",
                            tierColors[customer.tier] || "bg-muted text-muted-foreground border border-border"
                          )}>
                            <Star className="w-3 h-3 fill-current" />
                            {customer.tier || "—"}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <p className="text-sm font-semibold text-foreground tabular-nums">{formatCurrency(customer.total_spent || 0)}</p>
                        </td>
                        <td className="px-6 py-4 text-sm text-muted-foreground tabular-nums">
                          {customer.last_visit ? formatDate(customer.last_visit) : "—"}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button className="h-9 w-9 inline-flex items-center justify-center rounded-md border border-border bg-background text-muted-foreground hover:bg-accent hover:text-foreground transition-colors">
                              <History className="w-4 h-4" />
                            </button>
                            <Link to={`/customers/edit/${customer.id}`} state={{ customersListReturn }} className="h-9 w-9 inline-flex items-center justify-center rounded-md border border-border bg-background text-muted-foreground hover:bg-accent hover:text-foreground transition-colors">
                              <Edit2 className="w-4 h-4" />
                            </Link>
                            {admin && (
                              <button
                                onClick={() => handleDelete(customer.id)}
                                disabled={deletingId === customer.id}
                                className="h-9 w-9 inline-flex items-center justify-center rounded-md border border-border bg-background text-muted-foreground hover:bg-destructive hover:text-destructive-foreground hover:border-destructive transition-colors disabled:opacity-50"
                              >
                                {deletingId === customer.id ? (
                                  <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                  <Trash2 className="w-4 h-4" />
                                )}
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-between gap-4 px-4">
              <p className="text-xs font-medium text-muted-foreground">
                Hiển thị <span className="text-foreground tabular-nums">{(page - 1) * limit + 1}-{Math.min(page * limit, total)}</span> trong số <span className="text-foreground tabular-nums">{total}</span> khách hàng
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="h-9 w-9 rounded-md border border-border bg-background text-muted-foreground hover:bg-accent hover:text-foreground transition-colors disabled:opacity-30"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                {getVisiblePageNumbers(page, totalPages, 5).map((pn) => (
                  <button
                    key={pn}
                    onClick={() => setPage(pn)}
                    className={cn(
                      "h-9 w-9 rounded-md text-xs font-semibold tabular-nums border transition-colors",
                      page === pn ? "bg-primary text-primary-foreground border-primary" : "bg-background border-border hover:bg-accent text-foreground"
                    )}
                  >
                    {pn}
                  </button>
                ))}
                <button
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="h-9 w-9 rounded-md border border-border bg-background text-muted-foreground hover:bg-accent hover:text-foreground transition-colors disabled:opacity-30"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
