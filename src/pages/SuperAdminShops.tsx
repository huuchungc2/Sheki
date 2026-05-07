import * as React from "react";
import {
  Building2,
  Info,
  KeyRound,
  Loader2,
  Pencil,
  Plus,
  Shield,
  Trash2,
  UserPlus,
  X,
} from "lucide-react";
import { cn } from "../lib/utils";

const API_URL =
  (import.meta as any)?.env?.VITE_API_URL ||
  "/api";

type ShopAdminBrief = {
  user_id: number;
  full_name: string;
  username: string;
  email: string;
  is_active: boolean;
};

type ShopRow = {
  id: number;
  name: string;
  code: string;
  is_active: number;
  valid_until?: string | null;
  shop_expired?: boolean;
  admins?: ShopAdminBrief[];
  created_at?: string;
};

type MemberRow = {
  user_id: number;
  full_name: string;
  username: string;
  email: string;
  is_active: number;
  role_id: number;
  role: string;
  role_name: string;
};

type AdminDraft = {
  key: string;
  full_name: string;
  username: string;
  email: string;
  password: string;
};

type CreatedAdmin = {
  id: number;
  full_name: string;
  username: string;
  email: string;
  role_code?: string;
  role_id?: number;
};

/** Đồng bộ với backend `rowUserIsActive` — tránh !!\"0\" === true */
function userActiveFromApi(v: unknown): boolean {
  if (v === true || v === 1) return true;
  if (v === false || v === 0 || v == null) return false;
  if (typeof v === "string") {
    const t = v.trim().toLowerCase();
    return t === "1" || t === "true";
  }
  return Number(v) === 1;
}

function newKey() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function emptyAdminRow(): AdminDraft {
  return { key: newKey(), full_name: "", username: "", email: "", password: "" };
}

function rowHasAny(a: AdminDraft) {
  return !!(a.full_name.trim() || a.username.trim() || a.email.trim() || a.password);
}

function rowComplete(a: AdminDraft) {
  return !!(a.full_name.trim() && a.username.trim() && a.email.trim() && a.password);
}

/** Chuẩn hoá gửi API: bỏ dòng trống hoàn toàn; dòng có nhập phải đủ 4 field (validate trước khi gọi) */
function buildAdminsPayload(rows: AdminDraft[]): AdminDraft[] | null {
  const partial = rows.filter((r) => rowHasAny(r) && !rowComplete(r));
  if (partial.length) return null;
  return rows.filter(rowComplete).map((r) => ({
    key: r.key,
    full_name: r.full_name.trim(),
    username: r.username.trim().toLowerCase(),
    email: r.email.trim().toLowerCase(),
    password: r.password,
  }));
}

export function SuperAdminShops() {
  const token = React.useMemo(() => localStorage.getItem("token"), []);
  const [rows, setRows] = React.useState<ShopRow[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const [showCreate, setShowCreate] = React.useState(false);
  const [createName, setCreateName] = React.useState("");
  const [createCode, setCreateCode] = React.useState("");
  const [createValidUntil, setCreateValidUntil] = React.useState("");
  const [createAdminRows, setCreateAdminRows] = React.useState<AdminDraft[]>([emptyAdminRow()]);
  /** Mặc định false = bắt buộc ít nhất 1 tài khoản quản trị (admin) khi tạo shop */
  const [createSkipAdmins, setCreateSkipAdmins] = React.useState(false);
  const [creating, setCreating] = React.useState(false);
  const [createSuccess, setCreateSuccess] = React.useState<{ shop: ShopRow; admins: CreatedAdmin[] } | null>(null);

  const [editRow, setEditRow] = React.useState<ShopRow | null>(null);
  const [editName, setEditName] = React.useState("");
  const [editCode, setEditCode] = React.useState("");
  const [editActive, setEditActive] = React.useState(true);
  const [editValidUntil, setEditValidUntil] = React.useState("");
  const [savingEdit, setSavingEdit] = React.useState(false);
  const [togglingAdmin, setTogglingAdmin] = React.useState<string | null>(null);

  /** Đặt lại mật khẩu admin shop (super admin) */
  const [resetPw, setResetPw] = React.useState<{ shopId: number; admin: ShopAdminBrief } | null>(null);
  const [resetPwNew, setResetPwNew] = React.useState("");
  const [resetPwConfirm, setResetPwConfirm] = React.useState("");
  const [resetPwLoading, setResetPwLoading] = React.useState(false);

  /** Thêm tài khoản admin cho shop đã có */
  const [addAdminShop, setAddAdminShop] = React.useState<ShopRow | null>(null);
  const [addAdminRows, setAddAdminRows] = React.useState<AdminDraft[]>([emptyAdminRow()]);
  const [addAdminLoading, setAddAdminLoading] = React.useState(false);
  const [shopAdmins, setShopAdmins] = React.useState<MemberRow[]>([]);
  const [shopAdminsLoading, setShopAdminsLoading] = React.useState(false);
  const [addSuccess, setAddSuccess] = React.useState<CreatedAdmin[] | null>(null);

  const authHeaders = React.useCallback(
    () => ({
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    }),
    [token]
  );

  const loadShops = React.useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(`${API_URL}/shops`, { headers: { Authorization: `Bearer ${token}` } });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body?.error || "Không tải được danh sách shop");
      setRows(Array.isArray(body?.data) ? body.data : []);
    } catch (e: any) {
      setError(e?.message || "Lỗi tải shop");
    } finally {
      setLoading(false);
    }
  }, [token]);

  React.useEffect(() => {
    loadShops();
  }, [loadShops]);

  React.useEffect(() => {
    if (!addAdminShop) return;
    let cancelled = false;
    (async () => {
      try {
        setShopAdminsLoading(true);
        const res = await fetch(`${API_URL}/shops/${addAdminShop.id}/users`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const body = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(body?.error || "Không tải danh sách");
        const list = (Array.isArray(body?.data) ? body.data : []) as MemberRow[];
        if (!cancelled) setShopAdmins(list.filter((m) => m.role === "admin"));
      } catch {
        if (!cancelled) setShopAdmins([]);
      } finally {
        if (!cancelled) setShopAdminsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [addAdminShop, token]);

  const openCreate = () => {
    setCreateName("");
    setCreateCode("");
    setCreateValidUntil("");
    setCreateAdminRows([emptyAdminRow()]);
    setCreateSkipAdmins(false);
    setCreateSuccess(null);
    setShowCreate(true);
  };

  const submitCreate = async () => {
    const name = createName.trim();
    const code = createCode.trim().toLowerCase();
    if (!name || !code) {
      setError("Nhập đủ tên shop và mã shop");
      return;
    }
    const payload = buildAdminsPayload(createAdminRows);
    if (payload === null) {
      setError("Mỗi dòng quản trị: nhập đủ họ tên, tên đăng nhập, email và mật khẩu (hoặc xoá hết ô trên dòng đó).");
      return;
    }
    if (!createSkipAdmins && payload.length === 0) {
      setError("Thêm ít nhất một tài khoản quản trị (admin) cho shop, hoặc tick «Chỉ tạo shop không kèm quản trị».");
      return;
    }
    try {
      setCreating(true);
      setError(null);
      const adminsOut = createSkipAdmins
        ? []
        : payload.map(({ full_name, username, email, password }) => ({
            full_name,
            username,
            email,
            password,
          }));
      const body: Record<string, unknown> = {
        name,
        code,
        admins: adminsOut,
      };
      if (createValidUntil.trim()) {
        body.valid_until = createValidUntil.trim().slice(0, 10);
      } else {
        body.valid_until = null;
      }

      const res = await fetch(`${API_URL}/shops`, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify(body),
      });
      const out = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(out?.error || "Tạo shop thất bại");
      setShowCreate(false);
      setCreateSuccess({
        shop: out.data as ShopRow,
        admins: Array.isArray(out.admins_created) ? out.admins_created : [],
      });
      await loadShops();
    } catch (e: any) {
      setError(e?.message || "Tạo shop thất bại");
    } finally {
      setCreating(false);
    }
  };

  const openAddAdmins = (s: ShopRow) => {
    setAddAdminShop(s);
    setAddAdminRows([emptyAdminRow()]);
    setAddSuccess(null);
  };

  const submitAddAdmins = async () => {
    if (!addAdminShop) return;
    const payload = buildAdminsPayload(addAdminRows);
    if (payload === null) {
      setError("Mỗi dòng admin: nhập đủ họ tên, tên đăng nhập, email và mật khẩu (hoặc xoá hết ô trên dòng đó).");
      return;
    }
    if (payload.length === 0) {
      setError("Thêm ít nhất một tài khoản admin (đủ các ô).");
      return;
    }
    try {
      setAddAdminLoading(true);
      setError(null);
      const res = await fetch(`${API_URL}/shops/${addAdminShop.id}/admins`, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({
          admins: payload.map(({ full_name, username, email, password }) => ({
            full_name,
            username,
            email,
            password,
          })),
        }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body?.error || "Tạo tài khoản thất bại");
      const created = Array.isArray(body.admins_created) ? body.admins_created : [];
      setAddSuccess(created);
      setAddAdminRows([emptyAdminRow()]);
      const memRes = await fetch(`${API_URL}/shops/${addAdminShop.id}/users`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const memBody = await memRes.json().catch(() => ({}));
      if (memRes.ok && Array.isArray(memBody?.data)) {
        setShopAdmins((memBody.data as MemberRow[]).filter((m) => m.role === "admin"));
      }
    } catch (e: any) {
      setError(e?.message || "Tạo tài khoản thất bại");
    } finally {
      setAddAdminLoading(false);
    }
  };

  const openEdit = (s: ShopRow) => {
    setEditRow(s);
    setEditName(s.name);
    setEditCode(s.code);
    setEditActive(userActiveFromApi(s.is_active));
    const vu = s.valid_until ? String(s.valid_until).slice(0, 10) : "";
    setEditValidUntil(vu);
  };

  const submitEdit = async () => {
    if (!editRow) return;
    const name = editName.trim();
    const code = editCode.trim().toLowerCase();
    if (!name || !code) {
      setError("Tên và mã shop không được để trống");
      return;
    }
    try {
      setSavingEdit(true);
      setError(null);
      const res = await fetch(`${API_URL}/shops/${editRow.id}`, {
        method: "PUT",
        headers: authHeaders(),
        body: JSON.stringify({
          name,
          code,
          is_active: editActive,
          valid_until: editValidUntil.trim() ? editValidUntil.trim().slice(0, 10) : null,
        }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body?.error || "Lưu thất bại");
      setEditRow(null);
      await loadShops();
    } catch (e: any) {
      setError(e?.message || "Lưu thất bại");
    } finally {
      setSavingEdit(false);
    }
  };

  const toggleAdminActive = async (shopId: number, admin: ShopAdminBrief) => {
    const key = `${shopId}-${admin.user_id}`;
    try {
      setTogglingAdmin(key);
      setError(null);
      const res = await fetch(`${API_URL}/shops/${shopId}/admins/${admin.user_id}`, {
        method: "PATCH",
        headers: authHeaders(),
        body: JSON.stringify({ is_active: !userActiveFromApi(admin.is_active) }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body?.error || "Không cập nhật được");
      await loadShops();
    } catch (e: any) {
      setError(e?.message || "Không cập nhật được trạng thái admin");
    } finally {
      setTogglingAdmin(null);
    }
  };

  const submitResetPassword = async () => {
    if (!resetPw) return;
    if (resetPwNew !== resetPwConfirm) {
      setError("Mật khẩu mới không khớp");
      return;
    }
    if (resetPwNew.length < 6) {
      setError("Mật khẩu tối thiểu 6 ký tự");
      return;
    }
    try {
      setResetPwLoading(true);
      setError(null);
      const res = await fetch(
        `${API_URL}/shops/${resetPw.shopId}/admins/${resetPw.admin.user_id}/password`,
        {
          method: "PATCH",
          headers: authHeaders(),
          body: JSON.stringify({ newPassword: resetPwNew }),
        }
      );
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body?.error || "Không đặt lại được mật khẩu");
      setResetPw(null);
      setResetPwNew("");
      setResetPwConfirm("");
    } catch (e: any) {
      setError(e?.message || "Đặt lại mật khẩu thất bại");
    } finally {
      setResetPwLoading(false);
    }
  };

  const renderAdminForm = (
    rows: AdminDraft[],
    setRows: React.Dispatch<React.SetStateAction<AdminDraft[]>>,
    idPrefix: string
  ) => (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest flex items-center gap-1.5">
          <Shield className="w-3.5 h-3.5 text-primary" aria-hidden />
          Quản trị viên (role Admin)
        </p>
        <button
          type="button"
          onClick={() => setRows((prev) => [...prev, emptyAdminRow()])}
          className="text-xs font-semibold text-primary hover:underline shrink-0"
        >
          + Thêm dòng
        </button>
      </div>
      <p className="text-xs text-muted-foreground leading-relaxed">
        Các tài khoản tạo ở đây được ghi vào DB với vai trò{" "}
        <strong className="text-foreground">Admin</strong> (cả <code className="text-[11px] bg-muted px-1 rounded">users.role_id</code> và{" "}
        <code className="text-[11px] bg-muted px-1 rounded">user_shops.role_id</code>). Nhân viên{" "}
        <strong>Sales</strong> chỉ do quản trị shop thêm ở màn Nhân viên — không phải luồng này. Để trống cả dòng = bỏ qua dòng đó.
      </p>
      {rows.map((row, idx) => (
        <div key={row.key} className="p-4 rounded-xl border border-border bg-muted/20 space-y-3 relative">
          {rows.length > 1 && (
            <button
              type="button"
              className="absolute top-2 right-2 p-1.5 rounded-lg text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
              onClick={() => setRows((prev) => prev.filter((r) => r.key !== row.key))}
              aria-label="Xoá dòng"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
          <p className="text-[10px] font-semibold text-muted-foreground">Quản trị #{idx + 1}</p>
          <input
            id={`${idPrefix}-name-${row.key}`}
            className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm font-medium text-foreground outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            placeholder="Họ và tên"
            value={row.full_name}
            onChange={(e) =>
              setRows((prev) => prev.map((r) => (r.key === row.key ? { ...r, full_name: e.target.value } : r)))
            }
          />
          <input
            className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm font-medium text-foreground outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            placeholder="Tên đăng nhập"
            autoComplete="off"
            value={row.username}
            onChange={(e) =>
              setRows((prev) => prev.map((r) => (r.key === row.key ? { ...r, username: e.target.value } : r)))
            }
          />
          <input
            className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm font-medium text-foreground outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            placeholder="Email"
            type="email"
            autoComplete="off"
            value={row.email}
            onChange={(e) =>
              setRows((prev) => prev.map((r) => (r.key === row.key ? { ...r, email: e.target.value } : r)))
            }
          />
          <input
            className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm font-medium text-foreground outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            placeholder="Mật khẩu (≥6 ký tự)"
            type="password"
            autoComplete="new-password"
            value={row.password}
            onChange={(e) =>
              setRows((prev) => prev.map((r) => (r.key === row.key ? { ...r, password: e.target.value } : r)))
            }
          />
        </div>
      ))}
    </div>
  );

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 min-w-0">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-primary flex items-center justify-center text-primary-foreground shadow-lg">
            <Building2 className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">Quản lý shop</h1>
            <p className="text-sm text-muted-foreground font-medium mt-0.5">
              Tạo shop và tạo một hoặc nhiều tài khoản admin cho shop đó. Admin shop đăng nhập và quản lý nhân viên như shop Sheki.
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={openCreate}
          className="inline-flex items-center justify-center gap-2 h-10 px-5 rounded-md bg-primary text-primary-foreground text-sm font-semibold hover:opacity-95 transition-opacity shadow-sm"
        >
          <Plus className="w-4 h-4" />
          Thêm shop
        </button>
      </div>

      {error && (
        <div className="mb-6 p-4 rounded-xl bg-destructive/10 border border-destructive/30 text-destructive text-sm font-semibold">{error}</div>
      )}

      <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-20 text-muted-foreground gap-2">
            <Loader2 className="w-6 h-6 animate-spin" />
            <span className="font-bold text-sm">Đang tải…</span>
          </div>
        ) : rows.length === 0 ? (
          <div className="py-16 text-center text-muted-foreground font-medium text-sm">Chưa có shop nào.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[900px]">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="text-left py-4 px-4 font-semibold text-muted-foreground text-[10px] uppercase tracking-widest">ID</th>
                  <th className="text-left py-4 px-3 font-semibold text-muted-foreground text-[10px] uppercase tracking-widest">Tên / Mã</th>
                  <th className="text-left py-4 px-3 font-semibold text-muted-foreground text-[10px] uppercase tracking-widest">Shop</th>
                  <th className="text-left py-4 px-3 font-semibold text-muted-foreground text-[10px] uppercase tracking-widest">Hạn dùng</th>
                  <th className="text-left py-4 px-3 font-semibold text-muted-foreground text-[10px] uppercase tracking-widest">Admin</th>
                  <th className="text-right py-4 px-4 font-semibold text-muted-foreground text-[10px] uppercase tracking-widest">Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((s) => (
                  <tr key={s.id} className="border-b border-border hover:bg-muted/20 transition-colors align-top">
                    <td className="py-4 px-4 font-mono text-muted-foreground">{s.id}</td>
                    <td className="py-4 px-3">
                      <p className="font-semibold text-foreground">{s.name}</p>
                      <p className="text-xs text-muted-foreground font-mono">{s.code}</p>
                    </td>
                    <td className="py-4 px-3">
                      <span
                        className={cn(
                          "inline-flex px-2.5 py-1 rounded-md text-xs font-semibold border",
                          userActiveFromApi(s.is_active)
                            ? "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-300 dark:border-emerald-900/50"
                            : "bg-muted text-muted-foreground border-border"
                        )}
                      >
                        {userActiveFromApi(s.is_active) ? "Hoạt động" : "Tắt"}
                      </span>
                      {s.shop_expired && (
                        <span className="ml-1 inline-flex px-2 py-1 rounded-md text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-200 dark:bg-amber-950/30 dark:text-amber-200 dark:border-amber-900/50">
                          Hết hạn
                        </span>
                      )}
                    </td>
                    <td className="py-4 px-3 text-foreground text-xs">
                      {s.valid_until
                        ? new Date(`${String(s.valid_until).slice(0, 10)}T12:00:00`).toLocaleDateString("vi-VN")
                        : "Không giới hạn"}
                    </td>
                    <td className="py-4 px-3 max-w-[280px]">
                      {(s.admins || []).length === 0 ? (
                        <span className="text-muted-foreground text-xs">Chưa có admin</span>
                      ) : (
                        <ul className="space-y-2">
                          {(s.admins || []).map((a) => (
                            <li key={a.user_id} className="flex flex-wrap items-center gap-2 text-xs">
                              <span className="font-semibold text-foreground truncate max-w-[120px]" title={a.full_name}>
                                {a.full_name}
                              </span>
                              <span className="text-muted-foreground truncate max-w-[100px]" title={a.username}>
                                @{a.username}
                              </span>
                              <span
                                className={cn(
                                  "shrink-0 px-1.5 py-0.5 rounded text-[10px] font-semibold border",
                                  userActiveFromApi(a.is_active)
                                    ? "bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-200 dark:border-emerald-900/50"
                                    : "bg-muted text-muted-foreground border-border"
                                )}
                              >
                                {userActiveFromApi(a.is_active) ? "Active" : "Khoá"}
                              </span>
                              <button
                                type="button"
                                disabled={togglingAdmin === `${s.id}-${a.user_id}`}
                                onClick={() => toggleAdminActive(s.id, a)}
                                className="shrink-0 text-[10px] font-semibold text-primary hover:underline disabled:opacity-50"
                              >
                                {togglingAdmin === `${s.id}-${a.user_id}` ? "…" : userActiveFromApi(a.is_active) ? "Khoá" : "Mở"}
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setResetPw({ shopId: s.id, admin: a });
                                  setResetPwNew("");
                                  setResetPwConfirm("");
                                  setError(null);
                                }}
                                className="shrink-0 text-[10px] font-semibold text-amber-800 hover:underline"
                                title="Đặt lại mật khẩu (không cần mật khẩu cũ)"
                              >
                                Đặt lại MK
                              </button>
                            </li>
                          ))}
                        </ul>
                      )}
                    </td>
                    <td className="py-4 px-4 text-right space-x-2 whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => openAddAdmins(s)}
                        className="inline-flex items-center gap-1.5 h-10 px-3 rounded-md bg-muted text-foreground text-xs font-semibold hover:bg-accent transition-colors"
                      >
                        <UserPlus className="w-3.5 h-3.5" />
                        Thêm admin
                      </button>
                      <button
                        type="button"
                        onClick={() => openEdit(s)}
                        className="inline-flex items-center gap-1.5 h-10 px-3 rounded-md bg-accent text-accent-foreground text-xs font-semibold hover:opacity-95 transition-opacity"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                        Sửa
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showCreate && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-foreground/50 backdrop-blur-sm overflow-y-auto" role="dialog">
          <div className="bg-card rounded-2xl shadow-2xl max-w-2xl w-full border border-border relative my-6 max-h-[calc(100vh-3rem)] flex flex-col">
            <div className="shrink-0 flex items-start justify-between gap-4 p-6 pb-4 border-b border-border">
              <div>
                <p className="text-[10px] font-semibold text-primary uppercase tracking-widest mb-1">Super Admin</p>
                <h2 className="text-xl font-semibold tracking-tight text-foreground">Tạo shop mới</h2>
                <p className="text-sm text-muted-foreground mt-1">Hai bước: thông tin shop → tài khoản quản trị (Admin).</p>
              </div>
              <button
                type="button"
                className="p-2 rounded-lg hover:bg-accent text-muted-foreground shrink-0 transition-colors"
                onClick={() => setShowCreate(false)}
                aria-label="Đóng"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-8">
              <section className="rounded-xl border border-border bg-muted/20 p-5">
                <div className="flex items-center gap-2 mb-4">
                  <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary text-primary-foreground text-xs font-bold">1</span>
                  <h3 className="text-sm font-semibold text-foreground">Thông tin shop</h3>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="sm:col-span-2">
                    <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">Tên shop</label>
                    <input
                      className="mt-1 w-full h-11 px-4 rounded-xl border border-input bg-background text-sm font-medium text-foreground outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                      value={createName}
                      onChange={(e) => setCreateName(e.target.value)}
                      placeholder="VD: Sheki Hà Nội"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">Mã shop</label>
                    <input
                      className="mt-1 w-full h-11 px-4 rounded-xl border border-input bg-background text-sm font-mono text-foreground outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                      value={createCode}
                      onChange={(e) => setCreateCode(e.target.value)}
                      placeholder="sheki-hn (không dấu, chữ thường)"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">Hạn dùng (tuỳ chọn)</label>
                    <input
                      type="date"
                      className="mt-1 w-full h-11 px-4 rounded-xl border border-input bg-background text-sm font-medium text-foreground outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                      value={createValidUntil}
                      onChange={(e) => setCreateValidUntil(e.target.value)}
                    />
                    <p className="text-[11px] text-muted-foreground mt-1.5">Để trống = không giới hạn.</p>
                  </div>
                </div>
              </section>

              <section className="rounded-xl border border-border bg-muted/10 p-5">
                <div className="flex items-center gap-2 mb-3">
                  <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary text-primary-foreground text-xs font-bold">2</span>
                  <h3 className="text-sm font-semibold text-foreground">Quản trị viên (Admin)</h3>
                </div>
                <div className="flex gap-3 rounded-xl bg-card border border-border p-3 mb-4 text-xs text-foreground">
                  <Info className="w-4 h-4 text-primary shrink-0 mt-0.5" aria-hidden />
                  <p>
                    Luồng này <strong>luôn gán role Admin</strong> trong database. Nếu sau này thấy user là Sales, đó là do{" "}
                    <strong>đã thêm ở màn Nhân viên</strong> hoặc đổi role — không phải do bước tạo shop này.
                  </p>
                </div>

                <label className="flex items-start gap-3 cursor-pointer rounded-xl border border-border bg-card p-3 mb-4">
                  <input
                    type="checkbox"
                    checked={createSkipAdmins}
                    onChange={(e) => {
                      setCreateSkipAdmins(e.target.checked);
                      setError(null);
                    }}
                    className="mt-0.5 rounded border-input w-4 h-4 text-primary"
                  />
                  <span className="text-sm text-foreground">
                    <span className="font-semibold text-foreground">Chỉ tạo shop, không tạo tài khoản quản trị</span>
                    <span className="block text-xs text-muted-foreground mt-0.5">
                      Dùng khi tạo shell shop; sau đó dùng «Thêm admin» trên bảng hoặc gán user thủ công.
                    </span>
                  </span>
                </label>

                {!createSkipAdmins ? (
                  renderAdminForm(createAdminRows, setCreateAdminRows, "create")
                ) : (
                  <p className="text-sm text-muted-foreground italic">Bỏ qua bước nhập tài khoản — request gửi danh sách admin rỗng.</p>
                )}
              </section>
            </div>

            <div className="shrink-0 flex flex-wrap justify-end gap-3 p-6 pt-4 border-t border-border bg-muted/20 rounded-b-2xl">
              <button
                type="button"
                className="h-10 px-5 rounded-md text-sm font-semibold text-foreground hover:bg-accent border border-transparent hover:border-border transition-colors"
                onClick={() => setShowCreate(false)}
              >
                Huỷ
              </button>
              <button
                type="button"
                disabled={creating}
                onClick={submitCreate}
                className="h-10 px-6 rounded-md bg-primary text-primary-foreground text-sm font-semibold hover:opacity-95 disabled:opacity-50 inline-flex items-center gap-2 shadow-sm transition-opacity"
              >
                {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                Tạo shop
              </button>
            </div>
          </div>
        </div>
      )}

      {createSuccess && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-foreground/50" role="dialog">
          <div className="bg-card rounded-2xl shadow-2xl max-w-md w-full p-8 border border-border relative">
            <button
              type="button"
              className="absolute top-4 right-4 p-2 rounded-lg hover:bg-accent text-muted-foreground transition-colors"
              onClick={() => setCreateSuccess(null)}
            >
              <X className="w-5 h-5" />
            </button>
            <h2 className="text-lg font-semibold text-foreground mb-2">Đã tạo shop</h2>
            <p className="text-sm text-muted-foreground mb-4">
              {createSuccess.shop.name} ({createSuccess.shop.code}) — ID {createSuccess.shop.id}
            </p>
            {createSuccess.admins.length > 0 ? (
              <>
                <p className="text-sm font-semibold text-foreground mb-2">Tài khoản quản trị đã tạo ({createSuccess.admins.length}):</p>
                <ul className="text-sm text-foreground space-y-2 mb-4">
                  {createSuccess.admins.map((a) => (
                    <li key={a.id} className="flex flex-wrap items-center gap-x-2 gap-y-1">
                      <span className="font-medium">{a.full_name}</span>
                      <span className="text-muted-foreground">—</span>
                      <span className="font-mono text-xs">{a.username}</span>
                      <span className="inline-flex items-center rounded-md bg-muted px-1.5 py-0.5 text-[10px] font-semibold uppercase text-primary border border-border">
                        {a.role_code || "admin"}
                      </span>
                    </li>
                  ))}
                </ul>
                <p className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-xl p-3 dark:bg-amber-950/30 dark:border-amber-900/50 dark:text-amber-200">
                  Lưu mật khẩu đã nhập ở bước trước — hệ thống không hiển thị lại mật khẩu.
                </p>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">Chưa tạo tài khoản admin (chỉ tạo shop). Có thể dùng &quot;Thêm admin&quot; trên bảng.</p>
            )}
            <button
              type="button"
              className="mt-6 w-full h-10 rounded-md bg-primary text-primary-foreground text-sm font-semibold"
              onClick={() => setCreateSuccess(null)}
            >
              Đóng
            </button>
          </div>
        </div>
      )}

      {editRow && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-foreground/50" role="dialog">
          <div className="bg-card rounded-2xl shadow-2xl max-w-md w-full p-8 border border-border relative">
            <button
              type="button"
              className="absolute top-4 right-4 p-2 rounded-lg hover:bg-accent text-muted-foreground transition-colors"
              onClick={() => setEditRow(null)}
            >
              <X className="w-5 h-5" />
            </button>
            <h2 className="text-lg font-semibold text-foreground mb-6">Sửa shop #{editRow.id}</h2>
            <div className="space-y-4">
              <div>
                <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">Tên shop</label>
                <input
                  className="mt-1 w-full h-11 px-4 rounded-xl border border-input bg-background text-sm font-medium text-foreground outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                />
              </div>
              <div>
                <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">Mã shop</label>
                <input
                  className="mt-1 w-full h-11 px-4 rounded-xl border border-input bg-background text-sm font-medium text-foreground outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                  value={editCode}
                  onChange={(e) => setEditCode(e.target.value)}
                />
              </div>
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={editActive}
                  onChange={(e) => setEditActive(e.target.checked)}
                  className="rounded border-input w-4 h-4 text-primary"
                />
                <span className="text-sm font-semibold text-foreground">Shop đang hoạt động</span>
              </label>
              <div>
                <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">Hạn sử dụng</label>
                <input
                  type="date"
                  className="mt-1 w-full h-11 px-4 rounded-xl border border-input bg-background text-sm font-medium text-foreground outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                  value={editValidUntil}
                  onChange={(e) => setEditValidUntil(e.target.value)}
                />
                <p className="text-[11px] text-muted-foreground mt-1">Xoá ngày trong ô (để trống) rồi Lưu = không giới hạn.</p>
              </div>
            </div>
            <div className="mt-8 flex justify-end gap-3">
              <button type="button" className="h-10 px-5 rounded-md text-sm font-semibold text-foreground hover:bg-accent transition-colors" onClick={() => setEditRow(null)}>
                Huỷ
              </button>
              <button
                type="button"
                disabled={savingEdit}
                onClick={submitEdit}
                className="h-10 px-6 rounded-md bg-primary text-primary-foreground text-sm font-semibold hover:opacity-95 disabled:opacity-50 inline-flex items-center gap-2 transition-opacity"
              >
                {savingEdit ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                Lưu
              </button>
            </div>
          </div>
        </div>
      )}

      {addAdminShop && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-foreground/50 overflow-y-auto" role="dialog">
          <div className="bg-card rounded-2xl shadow-2xl max-w-lg w-full p-8 border border-border relative my-8 max-h-[calc(100vh-4rem)] overflow-y-auto">
            <button
              type="button"
              className="absolute top-4 right-4 p-2 rounded-lg hover:bg-accent text-muted-foreground transition-colors"
              onClick={() => {
                setAddAdminShop(null);
                setAddSuccess(null);
              }}
            >
              <X className="w-5 h-5" />
            </button>
            <h2 className="text-lg font-semibold text-foreground mb-1">Thêm tài khoản admin</h2>
            <p className="text-sm text-muted-foreground mb-3">
              Shop: {addAdminShop.name} ({addAdminShop.code})
            </p>
            <div className="flex gap-3 rounded-xl bg-muted/20 border border-border p-3 mb-4 text-xs text-foreground">
              <Info className="w-4 h-4 text-primary shrink-0 mt-0.5" aria-hidden />
              <p>
                Tài khoản tạo ở đây được gán <strong>Admin</strong> trong DB. Nhân viên Sales thêm tại màn Nhân viên của shop.
              </p>
            </div>

            <div className="mb-6 p-4 rounded-xl bg-muted/20 border border-border">
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest mb-2">Admin shop hiện có</p>
              {shopAdminsLoading ? (
                <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
              ) : shopAdmins.length === 0 ? (
                <p className="text-sm text-muted-foreground">Chưa có admin nào.</p>
              ) : (
                <ul className="text-sm space-y-1">
                  {shopAdmins.map((m) => (
                    <li key={m.user_id}>
                      {m.full_name} <span className="text-muted-foreground">(@{m.username})</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {addSuccess && addSuccess.length > 0 && (
              <div className="mb-4 p-3 rounded-2xl bg-emerald-50 border border-emerald-100 text-sm text-emerald-900">
                Đã tạo {addSuccess.length} tài khoản: {addSuccess.map((a) => a.username).join(", ")}
              </div>
            )}

            {renderAdminForm(addAdminRows, setAddAdminRows, "add")}

            <div className="mt-8 flex justify-end gap-3">
              <button
                type="button"
                className="h-10 px-5 rounded-md text-sm font-semibold text-foreground hover:bg-accent transition-colors"
                onClick={() => {
                  setAddAdminShop(null);
                  setAddSuccess(null);
                }}
              >
                Đóng
              </button>
              <button
                type="button"
                disabled={addAdminLoading}
                onClick={submitAddAdmins}
                className="h-10 px-6 rounded-md bg-primary text-primary-foreground text-sm font-semibold hover:opacity-95 disabled:opacity-50 inline-flex items-center gap-2 transition-opacity"
              >
                {addAdminLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                Tạo tài khoản
              </button>
            </div>
          </div>
        </div>
      )}

      {resetPw && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-foreground/50" role="dialog">
          <div className="bg-card rounded-2xl shadow-2xl max-w-md w-full p-8 border border-border relative">
            <button
              type="button"
              className="absolute top-4 right-4 p-2 rounded-lg hover:bg-accent text-muted-foreground transition-colors"
              onClick={() => setResetPw(null)}
              aria-label="Đóng"
            >
              <X className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2 mb-2">
              <KeyRound className="w-5 h-5 text-amber-700" />
              <h2 className="text-lg font-semibold text-foreground">Đặt lại mật khẩu admin shop</h2>
            </div>
            <p className="text-sm text-muted-foreground mb-4">
              {resetPw.admin.full_name} <span className="text-muted-foreground">(@{resetPw.admin.username})</span>
            </p>
            <div className="space-y-3">
              <div>
                <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">Mật khẩu mới</label>
                <input
                  type="password"
                  autoComplete="new-password"
                  className="mt-1 w-full h-11 px-4 rounded-xl border border-input bg-background text-sm font-medium text-foreground outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                  value={resetPwNew}
                  onChange={(e) => setResetPwNew(e.target.value)}
                  placeholder="Tối thiểu 6 ký tự"
                />
              </div>
              <div>
                <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">Nhập lại</label>
                <input
                  type="password"
                  autoComplete="new-password"
                  className="mt-1 w-full h-11 px-4 rounded-xl border border-input bg-background text-sm font-medium text-foreground outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                  value={resetPwConfirm}
                  onChange={(e) => setResetPwConfirm(e.target.value)}
                />
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                className="h-10 px-5 rounded-md text-sm font-semibold text-foreground hover:bg-accent transition-colors"
                onClick={() => setResetPw(null)}
              >
                Huỷ
              </button>
              <button
                type="button"
                disabled={resetPwLoading}
                onClick={() => void submitResetPassword()}
                className="h-10 px-6 rounded-md bg-primary text-primary-foreground text-sm font-semibold hover:opacity-95 disabled:opacity-50 inline-flex items-center gap-2 transition-opacity"
              >
                {resetPwLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                Lưu mật khẩu
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
