import * as React from "react";
import {
  Loader2,
  AlertCircle,
  Trash2,
  Plus,
  ChevronLeft,
  ChevronRight,
  Search,
  Download,
} from "lucide-react";
import { api } from "../lib/api";
import { cn, formatCurrency, isAdminUser } from "../lib/utils";
import { exportCashTransactions } from "../lib/exportExcel";

type EmployeeRow = {
  id: number;
  full_name: string;
  username: string;
  email?: string;
  phone?: string | null;
};

type CurrentUserLite = {
  id: number;
  full_name?: string;
  username?: string;
  email?: string;
  phone?: string | null;
  can_access_admin?: any;
  role?: any;
  role_name?: any;
  scope_own_data?: any;
  is_super_admin?: any;
};

/** Nhập/sửa số tiền VNĐ: chỉ số nguyên, hiển thị theo locale vi-VN */
function formatVndInput(n: number): string {
  if (!Number.isFinite(n) || n < 0) return "";
  return new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 0 }).format(Math.floor(n));
}

function parseVndDigits(s: string): number {
  const digits = s.replace(/\D/g, "");
  if (!digits) return NaN;
  const n = parseInt(digits, 10);
  return Number.isFinite(n) ? n : NaN;
}

function employeeMatches(e: EmployeeRow, q: string) {
  const s = q.trim().toLowerCase();
  if (!s) return true;
  const phone = String(e.phone || "").replace(/\s/g, "");
  const qDigits = s.replace(/\D/g, "");
  return (
    (e.full_name && e.full_name.toLowerCase().includes(s)) ||
    (e.username && e.username.toLowerCase().includes(s)) ||
    (e.email && e.email.toLowerCase().includes(s)) ||
    (qDigits.length >= 3 && phone.includes(qDigits))
  );
}

/** Gõ tìm nhân viên — dùng cho form và lọc danh sách */
function EmployeeSearchCombo({
  employees,
  valueId,
  onChangeId,
  placeholder,
  resetSignal,
  className,
}: {
  employees: EmployeeRow[];
  valueId: string;
  onChangeId: (id: string) => void;
  placeholder?: string;
  /** Tăng sau khi reset form (vd. lưu phiếu xong) để xóa ô tìm */
  resetSignal?: number;
  className?: string;
}) {
  const [q, setQ] = React.useState("");
  const [open, setOpen] = React.useState(false);
  const wrapRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    setQ("");
  }, [resetSignal]);

  React.useEffect(() => {
    if (!valueId) return;
    const e = employees.find((x) => String(x.id) === valueId);
    if (e) setQ(`${e.full_name} (${e.username})`);
  }, [valueId, employees]);

  const filtered = React.useMemo(() => {
    const s = q.trim();
    const list = s ? employees.filter((e) => employeeMatches(e, s)) : employees;
    return list.slice(0, 80);
  }, [employees, q]);

  React.useEffect(() => {
    const onDoc = (ev: MouseEvent) => {
      if (!wrapRef.current?.contains(ev.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const pick = (e: EmployeeRow) => {
    onChangeId(String(e.id));
    setQ(`${e.full_name} (${e.username})`);
    setOpen(false);
  };

  const clear = () => {
    onChangeId("");
    setQ("");
    setOpen(false);
  };

  return (
    <div ref={wrapRef} className={cn("relative", className)}>
      <div className="relative w-full">
        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
        <input
          type="text"
          value={q}
          onChange={(e) => {
            const v = e.target.value;
            setQ(v);
            setOpen(true);
            if (valueId) onChangeId("");
          }}
          onFocus={() => setOpen(true)}
          placeholder={placeholder || "Gõ tên, username, email, SĐT..."}
          autoComplete="off"
          className="w-full rounded-lg border border-slate-200 pl-9 pr-9 py-2.5 sm:py-2 text-sm outline-none focus:ring-2 focus:ring-[#E31837]/20 focus:border-[#E31837] min-h-[44px] sm:min-h-0"
        />
        {q ? (
          <button
            type="button"
            onClick={clear}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100 text-lg leading-none"
            aria-label="Xóa"
          >
            ×
          </button>
        ) : null}
      </div>
      {open && (
        <div className="absolute z-50 mt-1 w-full max-h-56 overflow-y-auto rounded-lg border border-slate-200 bg-white shadow-lg">
          {filtered.length === 0 ? (
            <div className="px-3 py-2.5 text-sm text-slate-500">Không tìm thấy nhân viên</div>
          ) : (
            filtered.map((e) => (
              <button
                key={e.id}
                type="button"
                onMouseDown={(ev) => ev.preventDefault()}
                onClick={() => pick(e)}
                className="w-full text-left px-3 py-2 text-sm hover:bg-slate-50 border-b border-slate-50 last:border-0"
              >
                <div className="font-medium text-slate-900">{e.full_name}</div>
                <div className="text-xs text-slate-500">
                  {e.username}
                  {e.phone ? ` · ${e.phone}` : ""}
                </div>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}

type GroupRow = { id: number; name: string };

type TxRow = {
  id: number;
  user_id: number;
  group_id: number | null;
  kind: "income" | "expense";
  amount: string | number;
  note: string | null;
  created_at: string;
  user_full_name: string;
  user_username: string;
  group_name: string | null;
  created_by_name: string;
};

const KIND_LABEL: Record<string, string> = {
  income: "Thu",
  expense: "Chi",
};

function formatDateTime(iso: string) {
  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}

export function CashTransactions() {
  const [loading, setLoading] = React.useState(true);
  const [listLoading, setListLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [employees, setEmployees] = React.useState<EmployeeRow[]>([]);
  const [userGroups, setUserGroups] = React.useState<GroupRow[]>([]);
  const [rows, setRows] = React.useState<TxRow[]>([]);
  const [total, setTotal] = React.useState(0);
  const [page, setPage] = React.useState(1);
  const limit = 20;

  const [filterUserId, setFilterUserId] = React.useState("");
  const [filterKind, setFilterKind] = React.useState("");
  const nowInit = React.useMemo(() => new Date(), []);
  const [filterYear, setFilterYear] = React.useState(String(nowInit.getFullYear()));
  const [filterMonth, setFilterMonth] = React.useState(String(nowInit.getMonth() + 1));
  const [exporting, setExporting] = React.useState(false);

  const [userId, setUserId] = React.useState("");
  /** Tăng sau lưu phiếu để reset ô tìm nhân viên */
  const [empSearchReset, setEmpSearchReset] = React.useState(0);
  const [groupId, setGroupId] = React.useState("");
  const [kind, setKind] = React.useState<"income" | "expense">("income");
  const [amount, setAmount] = React.useState("");
  const [note, setNote] = React.useState("");
  const [submitting, setSubmitting] = React.useState(false);

  const [currentUser, setCurrentUser] = React.useState<CurrentUserLite | null>(null);
  const isAdmin = React.useMemo(() => isAdminUser(currentUser), [currentUser]);

  const loadMe = React.useCallback(async () => {
    // Prefer API truth; fallback to localStorage for robustness
    try {
      const res: any = await api.get("/auth/me");
      const me = res?.data as CurrentUserLite | undefined;
      if (me?.id) {
        setCurrentUser(me);
        return me;
      }
    } catch {
      // ignore; fallback below
    }
    try {
      const raw = localStorage.getItem("user");
      const u = raw ? (JSON.parse(raw) as CurrentUserLite) : null;
      if (u?.id) setCurrentUser(u);
      return u;
    } catch {
      setCurrentUser(null);
      return null;
    }
  }, []);

  const loadEmployees = React.useCallback(async () => {
    try {
      const res: any = await api.get("/users?limit=500&active_only=1");
      const data = res?.data;
      setEmployees(Array.isArray(data) ? data : []);
    } catch (e: any) {
      setError(e?.message || "Không tải được danh sách nhân viên");
    }
  }, []);

  const loadGroupsForUser = React.useCallback(async (uid: string) => {
    setUserGroups([]);
    setGroupId("");
    if (!uid) return;
    try {
      const res: any = await api.get(`/groups/user/${uid}`);
      const data = res?.data;
      setUserGroups(Array.isArray(data) ? data : []);
    } catch {
      setUserGroups([]);
    }
  }, []);

  const fetchList = React.useCallback(async () => {
    setListLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: String(limit),
      });
      if (filterUserId) params.set("user_id", filterUserId);
      if (filterKind === "income" || filterKind === "expense") params.set("kind", filterKind);
      params.set("year", filterYear);
      params.set("month", filterMonth);
      const res: any = await api.get(`/cash-transactions?${params}`);
      setRows(Array.isArray(res?.data) ? res.data : []);
      setTotal(typeof res?.total === "number" ? res.total : 0);
    } catch (e: any) {
      setError(e?.message || "Không tải được danh sách thu chi");
    } finally {
      setListLoading(false);
    }
  }, [page, filterUserId, filterKind, filterYear, filterMonth]);

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const me = await loadMe();
      const admin = isAdminUser(me);
      if (!admin) {
        // Nhân viên: mặc định xem/ghi thu chi của chính mình
        const myId = me?.id ? String(me.id) : "";
        if (myId) {
          setUserId(myId);
          setFilterUserId(myId);
        }
        // Không cần load toàn bộ nhân viên (thường bị giới hạn quyền / không cần thiết)
        if (myId) {
          setEmployees([
            {
              id: Number(myId),
              full_name: me?.full_name || "—",
              username: me?.username || "",
              email: me?.email,
              phone: me?.phone ?? null,
            },
          ]);
        } else {
          setEmployees([]);
        }
      } else {
        await loadEmployees();
      }
      if (!cancelled) setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [loadEmployees, loadMe]);

  React.useEffect(() => {
    if (loading) return;
    fetchList();
  }, [loading, fetchList]);

  // Nếu là nhân viên: khóa filter theo chính mình (tránh state bị clear do UI)
  React.useEffect(() => {
    if (loading) return;
    if (isAdmin) return;
    const myId = currentUser?.id ? String(currentUser.id) : "";
    if (!myId) return;
    if (filterUserId !== myId) setFilterUserId(myId);
    if (userId !== myId) setUserId(myId);
  }, [loading, isAdmin, currentUser?.id, filterUserId, userId]);

  React.useEffect(() => {
    loadGroupsForUser(userId);
  }, [userId, loadGroupsForUser]);

  const totalPages = Math.max(1, Math.ceil(total / limit));

  const submit = async () => {
    if (!userId) {
      setError("Chọn nhân viên");
      return;
    }
    const n = parseVndDigits(amount);
    if (!Number.isFinite(n) || n <= 0) {
      setError("Nhập số tiền hợp lệ (> 0)");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await api.post("/cash-transactions", {
        user_id: parseInt(userId, 10),
        group_id: groupId ? parseInt(groupId, 10) : null,
        kind,
        amount: n,
        note: note.trim() || null,
      });
      setAmount("");
      setNote("");
      if (isAdmin) {
        setUserId("");
        setEmpSearchReset((k) => k + 1);
      }
      setPage(1);
      await fetchList();
    } catch (e: any) {
      setError(e?.message || "Không lưu được");
    } finally {
      setSubmitting(false);
    }
  };

  const yearOptions = React.useMemo(() => {
    const y = new Date().getFullYear();
    const list: number[] = [];
    for (let i = y - 5; i <= y + 1; i++) list.push(i);
    return list;
  }, []);

  const handleExportExcel = async () => {
    setExporting(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (filterUserId) params.set("user_id", filterUserId);
      if (filterKind === "income" || filterKind === "expense") params.set("kind", filterKind);
      params.set("year", filterYear);
      params.set("month", filterMonth);
      const res: any = await api.get(`/cash-transactions/export?${params}`);
      const data = Array.isArray(res?.data) ? res.data : [];
      exportCashTransactions({ rows: data, year: filterYear, month: filterMonth });
    } catch (e: any) {
      setError(e?.message || "Không xuất được Excel");
    } finally {
      setExporting(false);
    }
  };

  const remove = async (id: number) => {
    if (!window.confirm("Xóa bản ghi thu chi này?")) return;
    try {
      await api.delete(`/cash-transactions/${id}`);
      await fetchList();
    } catch (e: any) {
      setError(e?.message || "Không xóa được");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <Loader2 className="w-8 h-8 animate-spin text-[#E31837]" />
      </div>
    );
  }

  return (
    <div className="space-y-6 px-1 sm:px-0">
      <div>
        <h1 className="text-xl font-bold text-slate-900">Thu chi</h1>
        <p className="text-slate-500 text-sm mt-1">
          {isAdmin
            ? "Ghi nhận thu/chi theo nhân viên và nhóm bán hàng."
            : "Thu chi của bạn (mặc định theo tài khoản đăng nhập)."}
        </p>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          <AlertCircle className="w-4 h-4 shrink-0" />
          {error}
        </div>
      )}

      <div className="bg-white rounded-2xl border border-slate-200 p-4 md:p-6 space-y-4">
        <h2 className="text-sm font-semibold text-slate-800 flex items-center gap-2">
          <Plus className="w-4 h-4 text-[#E31837]" />
          Thêm phiếu
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="md:col-span-2 lg:col-span-1">
            <label className="block text-xs font-medium text-slate-600 mb-1">Nhân viên *</label>
            {isAdmin ? (
              <EmployeeSearchCombo
                employees={employees}
                valueId={userId}
                onChangeId={setUserId}
                resetSignal={empSearchReset}
                placeholder="Gõ tên, username, email, SĐT..."
              />
            ) : (
              <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 sm:py-2 text-sm min-h-[44px] flex items-center">
                <div className="min-w-0">
                  <div className="font-medium text-slate-900 truncate">
                    {currentUser?.full_name || "—"}
                  </div>
                  <div className="text-xs text-slate-500 truncate">{currentUser?.username || ""}</div>
                </div>
              </div>
            )}
            {userId ? (
              <div className="mt-2">
                {userGroups.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5 items-center">
                    <span className="text-[11px] font-medium text-slate-500 shrink-0">Nhóm BH:</span>
                    {userGroups.map((g) => (
                      <span
                        key={g.id}
                        className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold bg-indigo-50 text-indigo-800 border border-indigo-100"
                      >
                        {g.name}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-[11px] text-amber-700">Chưa gán nhóm bán hàng cho nhân viên này.</p>
                )}
              </div>
            ) : null}
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Loại *</label>
            <select
              value={kind}
              onChange={(e) => setKind(e.target.value as "income" | "expense")}
              className="w-full rounded-lg border border-slate-200 px-3 py-2.5 sm:py-2 text-sm outline-none focus:ring-2 focus:ring-[#E31837]/20 focus:border-[#E31837] min-h-[44px] sm:min-h-0"
            >
              <option value="income">Thu</option>
              <option value="expense">Chi</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Nhóm bán hàng</label>
            <select
              value={groupId}
              onChange={(e) => setGroupId(e.target.value)}
              disabled={!userId}
              className="w-full rounded-lg border border-slate-200 px-3 py-2.5 sm:py-2 text-sm outline-none focus:ring-2 focus:ring-[#E31837]/20 focus:border-[#E31837] disabled:bg-slate-50 disabled:text-slate-400 min-h-[44px] sm:min-h-0"
            >
              <option value="">— Không gắn nhóm —</option>
              {userGroups.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Số tiền (VNĐ) *</label>
            <input
              type="text"
              inputMode="numeric"
              value={amount}
              onChange={(e) => {
                const v = e.target.value;
                if (v === "") {
                  setAmount("");
                  return;
                }
                const n = parseVndDigits(v);
                if (!Number.isFinite(n)) return;
                setAmount(formatVndInput(n));
              }}
              placeholder={formatVndInput(500000)}
              className="w-full rounded-lg border border-slate-200 px-3 py-2.5 sm:py-2 text-base sm:text-sm outline-none focus:ring-2 focus:ring-[#E31837]/20 focus:border-[#E31837] min-h-[44px] sm:min-h-0 tabular-nums"
            />
          </div>
          <div className="md:col-span-2">
            <label className="block text-xs font-medium text-slate-600 mb-1">Ghi chú</label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={2}
              placeholder="Nội dung ghi chú..."
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#E31837]/20 focus:border-[#E31837] resize-y min-h-[72px]"
            />
          </div>
        </div>
        <button
          type="button"
          onClick={submit}
          disabled={submitting}
          className={cn(
            "w-full sm:w-auto justify-center inline-flex items-center gap-2 rounded-lg px-4 py-2.5 sm:py-2 text-sm font-medium text-white min-h-[44px] sm:min-h-0",
            "bg-[#E31837] hover:bg-[#C41230] disabled:opacity-50 active:opacity-90"
          )}
        >
          {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
          Lưu phiếu
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
            <h2 className="text-sm font-semibold text-slate-800">Danh sách</h2>
            <button
              type="button"
              onClick={handleExportExcel}
              disabled={exporting}
              className={cn(
                "inline-flex items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 min-h-[44px] sm:min-h-0",
                "hover:bg-slate-50 hover:border-slate-300 disabled:opacity-50"
              )}
            >
              {exporting ? (
                <Loader2 className="w-4 h-4 animate-spin shrink-0" />
              ) : (
                <Download className="w-4 h-4 shrink-0 text-[#E31837]" />
              )}
              Xuất Excel
            </button>
          </div>
          <div className="flex flex-col sm:flex-row flex-wrap gap-2 items-stretch sm:items-center">
            {isAdmin ? (
              <div className="w-full sm:w-auto sm:min-w-[240px]">
                <EmployeeSearchCombo
                  employees={employees}
                  valueId={filterUserId}
                  onChangeId={(id) => {
                    setFilterUserId(id);
                    setPage(1);
                  }}
                  placeholder="Lọc theo nhân viên..."
                />
              </div>
            ) : null}
            <select
              value={filterKind}
              onChange={(e) => {
                setFilterKind(e.target.value);
                setPage(1);
              }}
              className="w-full sm:w-auto rounded-lg border border-slate-200 px-3 py-2 sm:py-1.5 text-sm min-h-[44px] sm:min-h-0"
            >
              <option value="">Thu / Chi</option>
              <option value="income">Thu</option>
              <option value="expense">Chi</option>
            </select>
            <div className="flex gap-2 items-center w-full sm:w-auto">
              <select
                value={filterMonth}
                onChange={(e) => {
                  setFilterMonth(e.target.value);
                  setPage(1);
                }}
                className="flex-1 sm:flex-initial rounded-lg border border-slate-200 px-2 py-2 sm:py-1.5 text-sm min-h-[44px] sm:min-h-0"
                aria-label="Tháng"
              >
                {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                  <option key={m} value={m}>
                    Tháng {m}
                  </option>
                ))}
              </select>
              <select
                value={filterYear}
                onChange={(e) => {
                  setFilterYear(e.target.value);
                  setPage(1);
                }}
                className="flex-1 sm:flex-initial rounded-lg border border-slate-200 px-2 py-2 sm:py-1.5 text-sm min-h-[44px] sm:min-h-0"
                aria-label="Năm"
              >
                {yearOptions.map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Mobile: thẻ dọc, không cần cuộn ngang */}
        <div className="md:hidden p-3 space-y-3">
          {listLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-[#E31837]" />
            </div>
          ) : rows.length === 0 ? (
            <p className="text-center text-slate-500 py-8 text-sm">Chưa có dữ liệu.</p>
          ) : (
            rows.map((r) => (
              <div
                key={r.id}
                className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm space-y-2"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-xs text-slate-500">{formatDateTime(r.created_at)}</p>
                    <p className="font-semibold text-slate-900 text-sm mt-0.5">{r.user_full_name}</p>
                    <p className="text-xs text-slate-500">{r.user_username}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span
                      className={cn(
                        "inline-flex rounded-md px-2 py-0.5 text-xs font-medium",
                        r.kind === "income"
                          ? "bg-emerald-100 text-emerald-800"
                          : "bg-rose-100 text-rose-800"
                      )}
                    >
                      {KIND_LABEL[r.kind] || r.kind}
                    </span>
                    <button
                      type="button"
                      onClick={() => remove(r.id)}
                      className="p-2 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 min-w-[44px] min-h-[44px] flex items-center justify-center"
                      title="Xóa"
                      aria-label="Xóa"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                <div className="text-[11px] text-slate-600 pt-1 border-t border-slate-100 space-y-1">
                  <p>
                    <span className="text-slate-500">Nhóm:</span> {r.group_name || "—"}
                  </p>
                  <p>
                    <span className="text-slate-500">Người tạo:</span> {r.created_by_name}
                  </p>
                  {r.note ? (
                    <p className="break-words">
                      <span className="text-slate-500">Ghi chú:</span> {r.note}
                    </p>
                  ) : null}
                </div>
                <p
                  className={cn(
                    "text-base font-bold tabular-nums text-right",
                    r.kind === "income" ? "text-emerald-700" : "text-rose-700"
                  )}
                >
                  {r.kind === "expense" ? "−" : "+"}
                  {formatCurrency(Number(r.amount))}
                </p>
              </div>
            ))
          )}
        </div>

        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-sm min-w-[720px]">
            <thead>
              <tr className="bg-slate-50 text-left text-slate-600">
                <th className="px-4 py-3 font-medium whitespace-nowrap">Thời gian</th>
                <th className="px-4 py-3 font-medium whitespace-nowrap">Nhân viên</th>
                <th className="px-4 py-3 font-medium whitespace-nowrap">Loại</th>
                <th className="px-4 py-3 font-medium whitespace-nowrap">Nhóm</th>
                <th className="px-4 py-3 font-medium text-right whitespace-nowrap">Số tiền</th>
                <th className="px-4 py-3 font-medium">Ghi chú</th>
                <th className="px-4 py-3 font-medium whitespace-nowrap">Người tạo</th>
                <th className="px-4 py-3 w-12" />
              </tr>
            </thead>
            <tbody>
              {listLoading ? (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-slate-500">
                    <Loader2 className="w-6 h-6 animate-spin inline text-[#E31837]" />
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-slate-500">
                    Chưa có dữ liệu.
                  </td>
                </tr>
              ) : (
                rows.map((r) => (
                  <tr key={r.id} className="border-t border-slate-100 hover:bg-slate-50/80">
                    <td className="px-4 py-2.5 whitespace-nowrap text-slate-700">
                      {formatDateTime(r.created_at)}
                    </td>
                    <td className="px-4 py-2.5">
                      <div className="font-medium text-slate-900">{r.user_full_name}</div>
                      <div className="text-xs text-slate-500">{r.user_username}</div>
                    </td>
                    <td className="px-4 py-2.5">
                      <span
                        className={cn(
                          "inline-flex rounded-md px-2 py-0.5 text-xs font-medium",
                          r.kind === "income"
                            ? "bg-emerald-100 text-emerald-800"
                            : "bg-rose-100 text-rose-800"
                        )}
                      >
                        {KIND_LABEL[r.kind] || r.kind}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-slate-700">
                      {r.group_name || "—"}
                    </td>
                    <td
                      className={cn(
                        "px-4 py-2.5 text-right font-medium tabular-nums",
                        r.kind === "income" ? "text-emerald-700" : "text-rose-700"
                      )}
                    >
                      {r.kind === "expense" ? "−" : "+"}
                      {formatCurrency(Number(r.amount))}
                    </td>
                    <td className="px-4 py-2.5 text-slate-600 max-w-[200px] truncate" title={r.note || ""}>
                      {r.note || "—"}
                    </td>
                    <td className="px-4 py-2.5 text-slate-600 whitespace-nowrap">
                      {r.created_by_name}
                    </td>
                    <td className="px-4 py-2.5">
                      <button
                        type="button"
                        onClick={() => remove(r.id)}
                        className="p-2 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 min-w-[40px] min-h-[40px] inline-flex items-center justify-center"
                        title="Xóa"
                        aria-label="Xóa"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {total > limit && (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-4 py-3 border-t border-slate-100 bg-slate-50/50">
            <p className="text-xs text-slate-500 text-center sm:text-left">
              {total} bản ghi — trang {page}/{totalPages}
            </p>
            <div className="flex gap-2 justify-center">
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="p-3 sm:p-2 rounded-lg border border-slate-200 disabled:opacity-40 min-w-[44px] min-h-[44px] sm:min-w-0 sm:min-h-0 flex items-center justify-center"
                aria-label="Trang trước"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                type="button"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
                className="p-3 sm:p-2 rounded-lg border border-slate-200 disabled:opacity-40 min-w-[44px] min-h-[44px] sm:min-w-0 sm:min-h-0 flex items-center justify-center"
                aria-label="Trang sau"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
