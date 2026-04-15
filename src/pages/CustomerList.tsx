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
  Silver: "bg-slate-100 text-slate-600",
  Gold: "bg-amber-100 text-amber-700",
  Platinum: "bg-blue-100 text-blue-700",
  Diamond: "bg-indigo-100 text-indigo-700",
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
          <h1 className="text-2xl font-bold text-slate-900">Quản lý khách hàng</h1>
          <p className="text-slate-500 text-sm mt-1">Theo dõi hành vi mua sắm và hạng thành viên.</p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={handleExport} className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm font-medium text-slate-700 hover:bg-slate-50 transition-all">
            <Download className="w-4 h-4" />
            Xuất dữ liệu
          </button>
          <Link to="/customers/import" className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm font-medium text-slate-700 hover:bg-slate-50 transition-all">
            <Upload className="w-4 h-4" />
            Nhập hàng loạt
          </Link>
          <Link to="/customers/new" state={{ customersListReturn }} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 transition-all shadow-lg shadow-blue-600/20">
            <Plus className="w-4 h-4" />
            Thêm khách hàng
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-200">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Tổng khách hàng</p>
          <p className="text-xl font-bold text-slate-900 mt-2">{total.toLocaleString()}</p>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-slate-200">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Khách hàng mới (Tháng)</p>
          <p className="text-xl font-bold text-blue-600 mt-2">—</p>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-slate-200">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Tỷ lệ quay lại</p>
          <p className="text-xl font-bold text-emerald-600 mt-2">—</p>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-slate-200">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Hạng Diamond</p>
          <p className="text-xl font-bold text-indigo-600 mt-2">{customers.filter((c: any) => c.tier === "Diamond").length}</p>
        </div>
      </div>

      <div className="bg-white p-4 rounded-2xl border border-slate-200 flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="relative w-full md:w-96">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
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
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border-transparent focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 rounded-xl text-sm transition-all outline-none"
          />
        </div>
        <div className="flex items-center gap-2 w-full md:w-auto">
          <button className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2 bg-slate-50 text-slate-600 rounded-xl text-sm font-medium hover:bg-slate-100 transition-all">
            <Filter className="w-4 h-4" />
            Bộ lọc
          </button>
          <select
            value={tier}
            onChange={(e) => { patchListParams({ tier: e.target.value || null }, { resetPage: true }); }}
            className="flex-1 md:flex-none px-4 py-2 bg-slate-50 text-slate-600 rounded-xl text-sm font-medium outline-none focus:ring-2 focus:ring-blue-500/20"
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
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
          <button
            onClick={fetchCustomers}
            className="flex items-center gap-1 text-red-600 hover:text-red-800 text-xs font-medium flex-shrink-0"
          >
            <RefreshCw className="w-3 h-3" />
            Thử lại
          </button>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
        </div>
      ) : (
        <>
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/50 border-b border-slate-200">
                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Khách hàng</th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Liên hệ</th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Hạng</th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Tổng chi tiêu</th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Lần cuối</th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {customers.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-12 text-center text-slate-400">
                        Không có khách hàng nào
                      </td>
                    </tr>
                  ) : (
                    customers.map((customer: any) => (
                      <tr key={customer.id} className="hover:bg-slate-50/50 transition-all group">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-600 font-bold group-hover:bg-blue-50 group-hover:text-blue-600 transition-all">
                              {(customer.name || "U").split(' ').map((n: string) => n[0]).join('').slice(0, 2)}
                            </div>
                            <div>
                              <p className="text-sm font-bold text-slate-900">{customer.name}</p>
                              <p className="text-xs text-slate-500 font-mono uppercase">{customer.id}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2 text-xs text-slate-500">
                              <Phone className="w-3 h-3" />
                              {customer.phone || "—"}
                            </div>
                            <div className="flex items-center gap-2 text-xs text-slate-500">
                              <Mail className="w-3 h-3" />
                              {customer.email || "—"}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className={cn(
                            "inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider",
                            tierColors[customer.tier] || "bg-slate-100 text-slate-600"
                          )}>
                            <Star className="w-3 h-3 fill-current" />
                            {customer.tier || "—"}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <p className="text-sm font-bold text-slate-900">{formatCurrency(customer.total_spent || 0)}</p>
                        </td>
                        <td className="px-6 py-4 text-sm text-slate-600">
                          {customer.last_visit ? formatDate(customer.last_visit) : "—"}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button className="p-2 hover:bg-blue-50 hover:text-blue-600 rounded-lg text-slate-400 transition-all">
                              <History className="w-4 h-4" />
                            </button>
                            <Link to={`/customers/edit/${customer.id}`} state={{ customersListReturn }} className="p-2 hover:bg-amber-50 hover:text-amber-600 rounded-lg text-slate-400 transition-all">
                              <Edit2 className="w-4 h-4" />
                            </Link>
                            {admin && (
                              <button
                                onClick={() => handleDelete(customer.id)}
                                disabled={deletingId === customer.id}
                                className="p-2 hover:bg-red-50 hover:text-red-600 rounded-lg text-slate-400 transition-all disabled:opacity-50"
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
              <p className="text-xs font-medium text-slate-400">
                Hiển thị <span className="text-slate-900">{(page - 1) * limit + 1}-{Math.min(page * limit, total)}</span> trong số <span className="text-slate-900">{total}</span> khách hàng
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="p-2 text-slate-300 hover:text-blue-600 transition-colors disabled:opacity-30"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                {getVisiblePageNumbers(page, totalPages, 5).map((pn) => (
                  <button
                    key={pn}
                    onClick={() => setPage(pn)}
                    className={cn(
                      "w-8 h-8 rounded-lg text-xs font-bold transition-colors",
                      page === pn
                        ? "bg-blue-600 text-white shadow-lg shadow-blue-600/20"
                        : "hover:bg-slate-100 text-slate-600"
                    )}
                  >
                    {pn}
                  </button>
                ))}
                <button
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="p-2 text-slate-300 hover:text-blue-600 transition-colors disabled:opacity-30"
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
