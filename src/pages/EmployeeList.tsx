import * as React from "react";
import { 
  Search, 
  Filter, 
  Plus, 
  MoreHorizontal, 
  Mail, 
  Phone, 
  MapPin,
  ChevronLeft,
  ChevronRight,
  Download,
  Trash2,
  Edit2,
  Eye,
  Users,
  Upload,
  Loader2,
  AlertCircle,
  Shield
} from "lucide-react";
import { Link, useSearchParams, useLocation } from "react-router-dom";
import { cn, formatDate } from "../lib/utils";
import { parseListPage, getVisiblePageNumbers } from "../lib/listUrl";

const API_URL =
  (import.meta as any)?.env?.VITE_API_URL ||
  "/api";

type StatusFilter = "active" | "all" | "inactive";

function readEmployeeListParams(sp: URLSearchParams) {
  const raw = sp.get("status") || "active";
  const status: StatusFilter = ["active", "all", "inactive"].includes(raw) ? (raw as StatusFilter) : "active";
  return {
    page: parseListPage(sp),
    q: sp.get("q") ?? "",
    department: sp.get("department") ?? "",
    roleCode: sp.get("role") ?? "",
    statusFilter: status,
  };
}

export function EmployeeList() {
  const [searchParams, setSearchParams] = useSearchParams();
  const location = useLocation();
  const employeesListReturn = `${location.pathname}${location.search}`;

  const { page, q, department, roleCode, statusFilter } = React.useMemo(
    () => readEmployeeListParams(searchParams),
    [searchParams.toString()]
  );

  const [employees, setEmployees] = React.useState<any[]>([]);
  const [roles, setRoles] = React.useState<{ id: number; code: string; name: string }[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [searchInput, setSearchInput] = React.useState("");
  const [isComposing, setIsComposing] = React.useState(false);
  const [total, setTotal] = React.useState(0);
  const limit = 20;
  const [selected, setSelected] = React.useState<Set<number>>(new Set());
  const [bulkRoleId, setBulkRoleId] = React.useState<number | "">("");
  const [bulkLoading, setBulkLoading] = React.useState(false);

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
    setSearchInput(q);
  }, [q]);

  const currentUser = React.useMemo(() => {
    const u = localStorage.getItem("user");
    return u ? JSON.parse(u) : null;
  }, []);

  // Hooks MUST be called unconditionally (before any early returns)
  const departmentOptions = React.useMemo(() => {
    const set = new Set<string>();
    employees.forEach((e) => {
      const d = String(e?.department || "").trim();
      if (d) set.add(d);
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b, "vi"));
  }, [employees]);

  const hasAnyFilter = Boolean(
    searchInput.trim() || department || roleCode || statusFilter !== "active" || page > 1
  );

  React.useEffect(() => {
    const fetchRoles = async () => {
      try {
        const token = localStorage.getItem("token");
        const res = await fetch(`${API_URL}/roles`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const json = await res.json();
          setRoles(json.data || []);
        }
      } catch {
        // silent
      }
    };
    fetchRoles();
  }, []);

  // Debounce ô tìm → ghi URL `q` (đồng bộ với các danh sách khác)
  React.useEffect(() => {
    if (isComposing) return;
    const t = window.setTimeout(() => {
      const next = searchInput;
      if (next === q) return;
      const hasMeaningful = next.trim().length > 0;
      patchListParams({ q: hasMeaningful ? next : null }, { resetPage: true });
    }, 350);
    return () => window.clearTimeout(t);
  }, [searchInput, q, patchListParams, isComposing]);

  const fetchEmployees = React.useCallback(async () => {
    const { page: p, q: searchTerm, department: dep, roleCode: role, statusFilter: st } =
      readEmployeeListParams(searchParams);
    try {
      setLoading(true);
      setError(null);
      const token = localStorage.getItem("token");
      const params = new URLSearchParams({ page: String(p), limit: String(limit) });
      if (searchTerm) params.set("search", searchTerm);
      if (dep) params.set("department", dep);
      if (role) params.set("role", role);
      if (st === "active") params.set("active_only", "1");
      else if (st === "inactive") params.set("active_only", "0");
      else if (st === "all") params.set("active_only", "all");
      const res = await fetch(`${API_URL}/users?${params}`, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (!res.ok) throw new Error("Không thể tải dữ liệu");
      const json = await res.json();
      const newTotal = json.total ?? 0;
      setEmployees(Array.isArray(json.data) ? json.data : []);
      setTotal(newTotal);
      setSelected(new Set());
      const totalPages = Math.ceil(newTotal / limit) || 1;
      if (totalPages > 0 && p > totalPages) {
        patchListParams({ page: String(totalPages) });
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [searchParams.toString(), patchListParams]);

  React.useEffect(() => {
    fetchEmployees();
  }, [fetchEmployees]);

  const handleExport = async (entity: string) => {
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API_URL}/import/export/${entity}`, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (!res.ok) throw new Error("Xuất dữ liệu thất bại");
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `danh_sach_${entity}.xlsx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Bạn có chắc muốn vô hiệu hóa nhân viên này?")) return;
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API_URL}/users/${id}`, {
        method: "DELETE",
        headers: { "Authorization": `Bearer ${token}` }
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error || "Xóa thất bại");
      fetchEmployees();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const toggleAll = () => {
    if (employees.length === 0) return;
    if (selected.size === employees.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(employees.map((e) => e.id)));
    }
  };

  const toggleOne = (id: number) => {
    const next = new Set(selected);
    next.has(id) ? next.delete(id) : next.add(id);
    setSelected(next);
  };

  const handleBulkRole = async () => {
    if (!bulkRoleId || selected.size === 0) return;
    const role = roles.find((r) => r.id === bulkRoleId);
    if (!confirm(`Gán vai trò "${role?.name || bulkRoleId}" cho ${selected.size} nhân viên?`)) return;
    setBulkLoading(true);
    try {
      const token = localStorage.getItem("token");
      await Promise.all(
        [...selected].map((id) =>
          fetch(`${API_URL}/users/${id}/role`, {
            method: "PUT",
            headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
            body: JSON.stringify({ role_id: bulkRoleId }),
          })
        )
      );
      setBulkRoleId("");
      fetchEmployees();
    } catch (err: any) {
      alert(err?.message || "Gán vai trò thất bại");
    } finally {
      setBulkLoading(false);
    }
  };

  if (loading && employees.length === 0 && !error) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error && employees.length === 0) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 mx-auto text-destructive/70 mb-4" />
          <p className="text-destructive font-semibold">{error}</p>
          <button onClick={() => fetchEmployees()} className="mt-4 h-10 px-4 bg-primary text-primary-foreground rounded-md text-sm font-semibold hover:opacity-95 transition-opacity">Thử lại</button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {error && employees.length > 0 && (
        <div className="bg-destructive/10 border border-destructive/30 text-destructive px-4 py-3 rounded-lg text-sm flex flex-wrap items-center justify-between gap-2">
          <span>{error}</span>
          <button type="button" onClick={() => fetchEmployees()} className="text-xs font-semibold underline hover:no-underline">
            Thử lại
          </button>
        </div>
      )}
      {loading && employees.length > 0 && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Loader2 className="w-4 h-4 animate-spin text-primary" />
          Đang cập nhật…
        </div>
      )}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">Danh sách nhân viên</h1>
          <p className="text-muted-foreground text-sm mt-1">Quản lý thông tin và phân quyền cho đội ngũ của bạn.</p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={() => handleExport('employees')} className="flex items-center gap-2 h-10 px-4 bg-background border border-border rounded-md text-sm font-semibold text-foreground hover:bg-accent transition-colors">
            <Download className="w-4 h-4" /> Xuất Excel
          </button>
          <Link to="/employees/import" className="flex items-center gap-2 h-10 px-4 bg-background border border-border rounded-md text-sm font-semibold text-foreground hover:bg-accent transition-colors">
            <Upload className="w-4 h-4" /> Nhập hàng loạt
          </Link>
          <Link to="/employees/new" state={{ employeesListReturn }} className="flex items-center gap-2 h-10 px-4 bg-primary text-primary-foreground rounded-md text-sm font-semibold hover:opacity-95 transition-opacity">
            <Plus className="w-4 h-4" /> Thêm nhân viên
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-card p-4 rounded-xl border border-border flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center text-primary">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Tổng nhân sự</p>
            <p className="text-xl font-semibold text-foreground tabular-nums">{total}</p>
          </div>
        </div>
        <div className="bg-card p-4 rounded-xl border border-border flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Trạng thái</p>
            <p className="text-sm text-muted-foreground mt-1">
              <span className="inline-flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                <span className="font-semibold text-foreground tabular-nums">{employees.filter(e => e.is_active).length}</span> đang làm
              </span>
              <span className="text-muted-foreground/40 mx-2">•</span>
              <span className="inline-flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-muted-foreground/40" />
                <span className="font-semibold text-foreground tabular-nums">{employees.filter(e => !e.is_active).length}</span> đã nghỉ
              </span>
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Trang</p>
            <p className="text-sm font-semibold text-foreground mt-1 tabular-nums">{page}/{Math.max(1, Math.ceil(total / limit))}</p>
          </div>
        </div>
        <div className="bg-card p-4 rounded-xl border border-border flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center text-primary">
            <Plus className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Trang {page}</p>
            <p className="text-xl font-semibold text-foreground tabular-nums">{Math.ceil(total / limit)} trang</p>
          </div>
        </div>
      </div>

      {/* Search + Filter + Bulk action (same row/area) */}
      <div className="bg-card p-4 rounded-xl border border-border space-y-3">
        <div className="flex flex-col lg:flex-row gap-3 lg:items-center lg:justify-between">
          <div className="relative w-full lg:max-w-md">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Tìm theo tên, tên đăng nhập, email, SĐT..."
              className="w-full h-10 pl-10 pr-4 py-2 bg-background border border-input rounded-md text-sm transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              onCompositionStart={() => setIsComposing(true)}
              onCompositionEnd={(e) => {
                setIsComposing(false);
                setSearchInput((e.target as HTMLInputElement).value);
              }}
            />
          </div>

          <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto">
            <div className="flex items-center gap-2 px-3 py-2 bg-muted/30 border border-border rounded-xl">
              <Filter className="w-4 h-4 text-muted-foreground" />
              <select
                value={department}
                onChange={(e) => { patchListParams({ department: e.target.value || null }, { resetPage: true }); }}
                className="bg-transparent text-sm font-semibold text-foreground outline-none cursor-pointer"
              >
                <option value="">Tất cả phòng ban</option>
                {departmentOptions.map((d) => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
              <div className="w-px h-5 bg-border" />
              <select
                value={roleCode}
                onChange={(e) => { patchListParams({ role: e.target.value || null }, { resetPage: true }); }}
                className="bg-transparent text-sm font-semibold text-foreground outline-none cursor-pointer"
              >
                <option value="">Tất cả vai trò</option>
                {roles.map((r) => (
                  <option key={r.id} value={r.code}>
                    {r.name} ({r.code})
                  </option>
                ))}
              </select>
              <div className="w-px h-5 bg-border" />
              <select
                value={statusFilter}
                onChange={(e) => {
                  patchListParams({ status: e.target.value }, { resetPage: true });
                }}
                className="bg-transparent text-sm font-semibold text-foreground outline-none cursor-pointer"
                title="Trạng thái làm việc"
              >
                <option value="active">Đang làm việc</option>
                <option value="all">Tất cả</option>
                <option value="inactive">Đã nghỉ</option>
              </select>
            </div>

            {hasAnyFilter && (
              <button
                onClick={() => {
                  setSearchInput("");
                  setSearchParams(new URLSearchParams(), { replace: true });
                }}
                className="h-10 px-3 bg-background border border-border rounded-md text-xs font-semibold text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
              >
                Xóa lọc
              </button>
            )}

            {selected.size > 0 && (
              <div className="flex flex-wrap items-center gap-2 px-3 py-2 bg-muted/30 border border-border rounded-xl">
                <span className="text-sm font-semibold text-foreground">Đã chọn {selected.size}</span>
                <div className="flex items-center gap-2">
                  <Shield className="w-4 h-4 text-muted-foreground" />
                  <select
                    value={bulkRoleId}
                    onChange={(e) => setBulkRoleId(e.target.value ? Number(e.target.value) : "")}
                    className="h-9 px-3 border border-input bg-background rounded-md text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background cursor-pointer"
                  >
                    <option value="">Gán vai trò...</option>
                    {roles.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.name} ({r.code})
                      </option>
                    ))}
                  </select>
                  <button
                    onClick={handleBulkRole}
                    disabled={!bulkRoleId || bulkLoading}
                    className="flex items-center gap-1.5 h-9 px-3 bg-primary text-primary-foreground rounded-md text-sm font-semibold hover:opacity-95 disabled:opacity-50 transition-opacity"
                  >
                    {bulkLoading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                    Áp dụng
                  </button>
                  <button
                    onClick={() => { setSelected(new Set()); setBulkRoleId(""); }}
                    className="px-2 py-1.5 text-sm text-muted-foreground hover:text-foreground"
                  >
                    Bỏ chọn
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {(department || roleCode) && (
          <p className="text-xs text-muted-foreground">
            Đang lọc:
            {department && <span className="font-semibold text-foreground"> phòng ban “{department}”</span>}
            {department && roleCode && <span className="text-muted-foreground/50"> · </span>}
            {roleCode && <span className="font-semibold text-foreground"> vai trò “{roleCode}”</span>}
          </p>
        )}
      </div>

      <div className="bg-card rounded-xl border border-border overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-muted/30 border-b border-border">
                <th className="px-6 py-4 w-10">
                  <input
                    type="checkbox"
                    checked={employees.length > 0 && selected.size === employees.length}
                    onChange={toggleAll}
                    className="w-4 h-4 rounded border-input cursor-pointer"
                  />
                </th>
                <th className="px-6 py-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Nhân viên</th>
                <th className="px-6 py-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Phòng ban / Chức vụ</th>
                <th className="px-6 py-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Liên hệ</th>
                <th className="px-6 py-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Phân quyền</th>
                <th className="px-6 py-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Ngày gia nhập</th>
                <th className="px-6 py-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Trạng thái</th>
                <th className="px-6 py-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {employees.length === 0 ? (
                <tr><td colSpan={8} className="px-6 py-12 text-center text-muted-foreground">Không có nhân viên nào</td></tr>
              ) : (
                employees.map((employee) => (
                  <tr key={employee.id} className="hover:bg-muted/30 transition-colors group">
                    <td className="px-6 py-4" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={selected.has(employee.id)}
                        onChange={() => toggleOne(employee.id)}
                        className="w-4 h-4 rounded border-input cursor-pointer"
                      />
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center text-foreground font-bold text-sm">
                          {(String(employee.full_name || "?").trim().split(/\s+/).filter(Boolean).map((n: string) => n[0]).join("") || "?").slice(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <Link to={`/employees/${employee.id}`} state={{ employeesListReturn }} className="text-sm font-semibold text-foreground hover:text-primary transition-colors">{employee.full_name}</Link>
                          <p className="text-xs text-muted-foreground font-mono">{employee.username}</p>
                          <p className="text-xs text-muted-foreground font-mono uppercase">{employee.role_name || employee.role}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-sm font-medium text-foreground">{employee.position || '-'}</p>
                      <p className="text-xs text-muted-foreground">{employee.department || '-'}</p>
                    </td>
                    <td className="px-6 py-4">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Mail className="w-3 h-3" /> {employee.email}
                        </div>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Phone className="w-3 h-3" /> {employee.phone || '-'}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-muted/30 text-foreground border border-border">
                        {employee.role_name || employee.role || "—"}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-muted-foreground">
                      {employee.join_date ? formatDate(employee.join_date) : '-'}
                    </td>
                    <td className="px-6 py-4">
                      <span className={cn(
                        "inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider",
                        employee.is_active
                          ? "bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-300 dark:border-emerald-900/50"
                          : "bg-muted/30 text-muted-foreground border border-border"
                      )}>
                        {employee.is_active ? "Đang làm việc" : "Đã nghỉ"}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Link to={`/employees/edit/${employee.id}`} state={{ employeesListReturn }} className="p-2 hover:bg-accent hover:text-foreground rounded-lg text-muted-foreground transition-colors" title="Chỉnh sửa">
                          <Edit2 className="w-4 h-4" />
                        </Link>
                        {(currentUser?.can_access_admin || currentUser?.role === "admin") && (
                          <button
                            type="button"
                            onClick={() => handleDelete(employee.id)}
                            className="p-2 hover:bg-destructive/10 hover:text-destructive rounded-lg text-muted-foreground transition-colors"
                            title="Vô hiệu hóa nhân viên"
                          >
                            <Trash2 className="w-4 h-4" />
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

        <div className="px-6 py-4 bg-muted/30 border-t border-border flex items-center justify-between">
          <p className="text-sm text-muted-foreground">Hiển thị {((page - 1) * limit) + 1}-{Math.min(page * limit, total)} trong tổng số {total} nhân viên</p>
          <div className="flex items-center gap-2">
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="p-2 hover:bg-accent border border-transparent hover:border-border rounded-md text-muted-foreground disabled:opacity-50 transition-colors">
              <ChevronLeft className="w-4 h-4" />
            </button>
            {getVisiblePageNumbers(page, Math.max(1, Math.ceil(total / limit)), 5).map((pn) => (
              <button key={pn} onClick={() => setPage(pn)} className={cn("w-8 h-8 flex items-center justify-center rounded-md text-sm font-semibold transition-colors", page === pn ? "bg-primary text-primary-foreground" : "hover:bg-accent border border-transparent hover:border-border text-foreground")}>
                {pn}
              </button>
            ))}
            <button onClick={() => setPage(p => Math.min(Math.ceil(total / limit), p + 1))} disabled={page >= Math.ceil(total / limit)} className="p-2 hover:bg-accent border border-transparent hover:border-border rounded-md text-muted-foreground disabled:opacity-50 transition-colors">
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
