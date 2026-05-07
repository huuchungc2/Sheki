import * as React from "react";
import { Plus, Save, Trash2, Loader2, Tag, X } from "lucide-react";
import { cn } from "../lib/utils";

const API_URL =
  (import.meta as any)?.env?.VITE_API_URL ||
  "/api";

type CategoryRow = {
  id: number;
  name: string;
  parent_id?: number | null;
  is_active: 0 | 1;
};

export function Categories() {
  const [rows, setRows] = React.useState<CategoryRow[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const [creating, setCreating] = React.useState(false);
  const [newName, setNewName] = React.useState("");

  const [savingId, setSavingId] = React.useState<number | null>(null);
  const [draftById, setDraftById] = React.useState<Record<string, { name: string; is_active: 0 | 1 }>>({});
  const [deletingId, setDeletingId] = React.useState<number | null>(null);

  // Token/user có thể đổi sau login/switch-shop; không memoize một lần.
  const [token, setToken] = React.useState<string | null>(() => localStorage.getItem("token"));

  React.useEffect(() => {
    const sync = () => setToken(localStorage.getItem("token"));
    const onAuthChange = () => sync();
    const onStorage = (e: StorageEvent) => {
      if (e.key === "token") sync();
    };
    window.addEventListener("auth-change", onAuthChange as any);
    window.addEventListener("storage", onStorage);
    return () => {
      window.removeEventListener("auth-change", onAuthChange as any);
      window.removeEventListener("storage", onStorage);
    };
  }, []);

  const fetchAll = React.useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(`${API_URL}/categories?all=1`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body?.error || "Không thể tải danh mục");
      const list = (body?.data || []) as CategoryRow[];
      setRows(list);
      const initDraft: Record<string, { name: string; is_active: 0 | 1 }> = {};
      for (const c of list) {
        initDraft[String(c.id)] = { name: c.name || "", is_active: (c.is_active ? 1 : 0) as 0 | 1 };
      }
      setDraftById(initDraft);
    } catch (e: any) {
      setError(e?.message || "Không thể tải danh mục");
    } finally {
      setLoading(false);
    }
  }, [token]);

  React.useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const createCategory = async () => {
    const name = newName.trim();
    if (!name) {
      setError("Nhập tên danh mục trước khi thêm");
      return;
    }
    try {
      setCreating(true);
      setError(null);
      const res = await fetch(`${API_URL}/categories`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ name }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body?.error || "Tạo danh mục thất bại");
      setNewName("");
      await fetchAll();
    } catch (e: any) {
      setError(e?.message || "Tạo danh mục thất bại");
    } finally {
      setCreating(false);
    }
  };

  const saveRow = async (id: number) => {
    const d = draftById[String(id)];
    if (!d) return;
    const name = (d.name || "").trim();
    if (!name) {
      setError("Tên danh mục không được để trống");
      return;
    }
    try {
      setSavingId(id);
      setError(null);
      const res = await fetch(`${API_URL}/categories/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ name, is_active: d.is_active }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body?.error || "Cập nhật thất bại");
      await fetchAll();
    } catch (e: any) {
      setError(e?.message || "Cập nhật thất bại");
    } finally {
      setSavingId(null);
    }
  };

  const hideRow = async (id: number) => {
    if (!confirm("Ẩn danh mục này? (Sản phẩm vẫn giữ, chỉ không còn dùng để chọn)")) return;
    try {
      setDeletingId(id);
      setError(null);
      const res = await fetch(`${API_URL}/categories/${id}`, {
        method: "DELETE",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body?.error || "Ẩn danh mục thất bại");
      await fetchAll();
    } catch (e: any) {
      setError(e?.message || "Ẩn danh mục thất bại");
    } finally {
      setDeletingId(null);
    }
  };

  const activeCount = rows.filter((r) => r.is_active).length;
  const inactiveCount = rows.length - activeCount;

  return (
    <div className="space-y-6 min-w-0">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">Danh mục</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Quản lý danh mục để phân loại sản phẩm.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-muted-foreground bg-card border border-border rounded-xl px-3 py-2">
            Đang dùng: <span className="text-foreground tabular-nums">{activeCount}</span>
            {" • "}
            Đã ẩn: <span className="text-foreground tabular-nums">{inactiveCount}</span>
          </span>
        </div>
      </div>

      <div className="bg-card border border-border rounded-xl p-4">
        <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
          <div className="flex-1">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Thêm danh mục
            </label>
            <div className="mt-2 flex gap-2">
              <div className="relative flex-1">
                <Tag className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="VD: Mỹ phẩm, Thực phẩm..."
                  className="w-full h-10 pl-9 pr-3 bg-background border border-input rounded-md text-sm font-medium text-foreground outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                />
              </div>
              <button
                type="button"
                onClick={createCategory}
                disabled={creating || !newName.trim()}
                className={cn(
                  "inline-flex items-center gap-1.5 h-10 px-4 rounded-md text-sm font-semibold transition-colors",
                  creating || !newName.trim()
                    ? "bg-muted text-muted-foreground cursor-not-allowed"
                    : "bg-primary text-primary-foreground hover:opacity-95 shadow-sm"
                )}
              >
                {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                Thêm
              </button>
            </div>
          </div>
        </div>
        {error && (
          <div className="mt-3 bg-destructive/10 border border-destructive/30 text-destructive px-4 py-3 rounded-xl text-sm flex items-start gap-2">
            <X className="w-4 h-4 mt-0.5 shrink-0" />
            <span>{error}</span>
          </div>
        )}
      </div>

      <div className="bg-card rounded-xl border border-border overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 text-primary animate-spin" />
          </div>
        ) : rows.length === 0 ? (
          <div className="py-16 text-center text-muted-foreground text-sm">Chưa có danh mục</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="bg-muted/30 border-b border-border">
                  <th className="px-6 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Tên danh mục
                  </th>
                  <th className="px-6 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Trạng thái
                  </th>
                  <th className="px-6 py-3 w-40"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {rows.map((r) => {
                  const d = draftById[String(r.id)] || { name: r.name || "", is_active: r.is_active };
                  const dirty = d.name !== r.name || d.is_active !== r.is_active;
                  const saving = savingId === r.id;
                  const deleting = deletingId === r.id;
                  return (
                    <tr key={r.id} className="hover:bg-muted/20 transition-colors">
                      <td className="px-6 py-4">
                        <input
                          value={d.name}
                          onChange={(e) =>
                            setDraftById((prev) => ({
                              ...prev,
                              [String(r.id)]: { ...d, name: e.target.value },
                            }))
                          }
                          className="w-full max-w-[520px] h-10 px-3 bg-background border border-input rounded-md text-sm font-medium text-foreground outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                        />
                      </td>
                      <td className="px-6 py-4">
                        <button
                          type="button"
                          onClick={() =>
                            setDraftById((prev) => ({
                              ...prev,
                              [String(r.id)]: { ...d, is_active: d.is_active ? 0 : 1 },
                            }))
                          }
                          className={cn(
                            "inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold",
                            d.is_active
                              ? "bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-300 dark:border-emerald-900/50"
                              : "bg-muted text-muted-foreground border border-border"
                          )}
                          title="Bấm để bật/tắt"
                        >
                          {d.is_active ? "Đang dùng" : "Đã ẩn"}
                        </button>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => saveRow(r.id)}
                            disabled={!dirty || saving}
                            className={cn(
                              "inline-flex items-center gap-1.5 h-10 px-3 rounded-md text-xs font-bold transition-colors",
                              !dirty || saving
                                ? "bg-muted text-muted-foreground cursor-not-allowed"
                                : "bg-primary text-primary-foreground hover:opacity-95"
                            )}
                          >
                            {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                            Lưu
                          </button>
                          <button
                            type="button"
                            onClick={() => hideRow(r.id)}
                            disabled={deleting}
                            className={cn(
                              "inline-flex items-center gap-1.5 h-10 px-3 rounded-md text-xs font-bold transition-colors",
                              deleting
                                ? "bg-muted text-muted-foreground cursor-not-allowed"
                                : "bg-background border border-border text-foreground hover:bg-destructive hover:text-destructive-foreground hover:border-destructive/50"
                            )}
                            title="Ẩn danh mục"
                          >
                            {deleting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                            Ẩn
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

