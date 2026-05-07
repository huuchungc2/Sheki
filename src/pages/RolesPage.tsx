import * as React from "react";
import { Shield, Plus, Pencil, Trash2, Loader2, AlertCircle } from "lucide-react";
import { cn } from "../lib/utils";

const API_URL =
  (import.meta as any)?.env?.VITE_API_URL ||
  "/api";

type Role = {
  id: number;
  code: string;
  name: string;
  description: string | null;
  can_access_admin: number;
  scope_own_data: number;
  is_system: number;
};

export function RolesPage() {
  const [rows, setRows] = React.useState<Role[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [saving, setSaving] = React.useState(false);
  const [editing, setEditing] = React.useState<Role | null>(null);
  const [form, setForm] = React.useState({
    code: "",
    name: "",
    description: "",
    can_access_admin: false,
    scope_own_data: true,
  });

  const token = () => localStorage.getItem("token");

  const load = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_URL}/roles`, {
        headers: { Authorization: `Bearer ${token()}` },
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error || "Không tải được");
      setRows(j.data || []);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    load();
  }, [load]);

  const resetForm = () => {
    setEditing(null);
    setForm({
      code: "",
      name: "",
      description: "",
      can_access_admin: false,
      scope_own_data: true,
    });
  };

  const startEdit = (r: Role) => {
    setEditing(r);
    setForm({
      code: r.code,
      name: r.name,
      description: r.description || "",
      can_access_admin: !!r.can_access_admin,
      scope_own_data: !!r.scope_own_data,
    });
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const body = {
        code: form.code.trim().toLowerCase(),
        name: form.name.trim(),
        description: form.description.trim() || null,
        can_access_admin: form.can_access_admin,
        scope_own_data: form.can_access_admin ? false : form.scope_own_data,
      };
      const url = editing ? `${API_URL}/roles/${editing.id}` : `${API_URL}/roles`;
      const res = await fetch(url, {
        method: editing ? "PUT" : "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token()}`,
        },
        body: JSON.stringify(body),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error || "Lưu thất bại");
      resetForm();
      load();
    } catch (e: any) {
      alert(e.message);
    } finally {
      setSaving(false);
    }
  };

  const remove = async (r: Role) => {
    if (r.is_system) {
      alert("Không xóa được vai trò hệ thống");
      return;
    }
    if (!confirm(`Xóa vai trò "${r.name}"?`)) return;
    try {
      const res = await fetch(`${API_URL}/roles/${r.id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token()}` },
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error || "Xóa thất bại");
      load();
    } catch (e: any) {
      alert(e.message);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl min-w-0">
      <div className="flex items-center gap-3">
        <Shield className="w-8 h-8 text-primary" />
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">Vai trò (Roles)</h1>
          <p className="text-sm text-muted-foreground">Định nghĩa vai trò và gán cho nhân viên ở form nhân viên.</p>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 text-destructive text-sm bg-destructive/10 border border-destructive/30 rounded-xl px-4 py-3">
          <AlertCircle className="w-4 h-4 shrink-0" />
          {error}
        </div>
      )}

      <div className="bg-card border border-border rounded-xl p-6 shadow-sm">
        <h2 className="text-sm font-semibold text-foreground mb-4">{editing ? "Sửa vai trò" : "Thêm vai trò"}</h2>
        <form onSubmit={submit} className="space-y-4">
          {!editing && (
            <div>
              <label className="text-xs font-semibold text-muted-foreground">Mã (slug)</label>
              <input
                value={form.code}
                onChange={(e) => setForm({ ...form, code: e.target.value })}
                placeholder="vd: nhan_vien_ban_hang"
                className="w-full mt-1 h-10 px-3 border border-input bg-background rounded-md text-sm font-medium text-foreground outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                required={!editing}
                disabled={!!editing}
              />
            </div>
          )}
          <div>
            <label className="text-xs font-semibold text-muted-foreground">Tên hiển thị</label>
            <input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="w-full mt-1 h-10 px-3 border border-input bg-background rounded-md text-sm font-medium text-foreground outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
              required
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-muted-foreground">Mô tả</label>
            <input
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              className="w-full mt-1 h-10 px-3 border border-input bg-background rounded-md text-sm font-medium text-foreground outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            />
          </div>
          <label className="flex items-center gap-2 text-sm text-foreground">
            <input
              type="checkbox"
              checked={form.can_access_admin}
              onChange={(e) =>
                setForm({
                  ...form,
                  can_access_admin: e.target.checked,
                  scope_own_data: e.target.checked ? false : true,
                })
              }
            />
            Quyền quản trị (menu &amp; API admin)
          </label>
          {!form.can_access_admin && (
            <label className="flex items-center gap-2 text-sm text-foreground">
              <input
                type="checkbox"
                checked={form.scope_own_data}
                onChange={(e) => setForm({ ...form, scope_own_data: e.target.checked })}
              />
              Chỉ thấy đơn/KH của mình (kiểu kinh doanh)
            </label>
          )}
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={saving}
              className={cn(
                "inline-flex items-center gap-2 h-10 px-4 rounded-md text-sm font-semibold text-primary-foreground bg-primary hover:opacity-95 transition-opacity",
                saving && "opacity-60"
              )}
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
              {editing ? "Cập nhật" : "Tạo mới"}
            </button>
            {editing && (
              <button type="button" onClick={resetForm} className="h-10 px-4 rounded-md text-sm font-semibold border border-border bg-background text-foreground hover:bg-accent transition-colors">
                Hủy
              </button>
            )}
          </div>
        </form>
      </div>

      <div className="bg-card border border-border rounded-xl overflow-hidden shadow-sm">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-muted/30 border-b border-border text-left text-xs font-semibold text-muted-foreground uppercase">
              <th className="px-4 py-3">Mã</th>
              <th className="px-4 py-3">Tên</th>
              <th className="px-4 py-3">Quyền</th>
              <th className="px-4 py-3 text-right">Thao tác</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {rows.map((r) => (
              <tr key={r.id} className="hover:bg-muted/20 transition-colors">
                <td className="px-4 py-3 font-mono text-xs">{r.code}</td>
                <td className="px-4 py-3 font-medium text-foreground">{r.name}</td>
                <td className="px-4 py-3 text-xs text-muted-foreground">
                  {r.can_access_admin ? "Quản trị" : r.scope_own_data ? "Phạm vi cá nhân" : "Toàn hệ thống (đọc)"}
                </td>
                <td className="px-4 py-3 text-right">
                  <button type="button" onClick={() => startEdit(r)} className="p-1.5 text-muted-foreground hover:text-primary transition-colors">
                    <Pencil className="w-4 h-4" />
                  </button>
                  {!r.is_system && (
                    <button type="button" onClick={() => remove(r)} className="p-1.5 text-muted-foreground hover:text-destructive transition-colors">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
