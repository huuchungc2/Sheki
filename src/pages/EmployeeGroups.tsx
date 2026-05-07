import * as React from "react";
import { AlertCircle, CheckCircle2, Edit2, Loader2, Save, Trash2 } from "lucide-react";

const API_URL = (import.meta as any)?.env?.VITE_API_URL || "/api";

export function EmployeeGroups() {
  const [groups, setGroups] = React.useState<any[]>([]);
  const [editingGroup, setEditingGroup] = React.useState<any>(null);
  const [groupName, setGroupName] = React.useState("");
  const [groupDesc, setGroupDesc] = React.useState("");

  const [saving, setSaving] = React.useState(false);
  const [success, setSuccess] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(true);

  const fetchGroups = React.useCallback(async () => {
    const token = localStorage.getItem("token");
    const res = await fetch(`${API_URL}/groups`, { headers: { Authorization: `Bearer ${token}` } });
    if (!res.ok) throw new Error("Không thể tải danh sách nhóm");
    const json = await res.json().catch(() => ({}));
    setGroups(Array.isArray(json?.data) ? json.data : []);
  }, []);

  React.useEffect(() => {
    (async () => {
      setLoading(true);
      setError(null);
      try {
        await fetchGroups();
      } catch (e: any) {
        setError(e?.message || "Không thể tải danh sách nhóm");
      } finally {
        setLoading(false);
      }
    })();
  }, [fetchGroups]);

  return (
    <div className="min-h-screen bg-background -m-8 p-8">
      <div className="flex items-center justify-between mb-6 gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">Nhóm nhân viên</h1>
          <p className="text-sm text-muted-foreground font-medium mt-1">Quản lý nhóm để phân quyền theo phạm vi “Nhóm”.</p>
        </div>
      </div>

      {error && (
        <div className="mb-4 p-4 bg-destructive/10 border border-destructive/30 rounded-xl flex items-center gap-3 text-destructive text-sm font-semibold">
          <AlertCircle className="w-5 h-5 shrink-0" /> {error}
        </div>
      )}
      {success && (
        <div className="mb-4 p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-3 text-emerald-700 text-sm font-semibold dark:bg-emerald-950/30 dark:border-emerald-900/50 dark:text-emerald-300">
          <CheckCircle2 className="w-5 h-5 shrink-0" /> Thao tác thành công!
        </div>
      )}

      {loading ? (
        <div className="bg-card rounded-xl border border-border p-10 text-muted-foreground font-medium">Đang tải...</div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-5 bg-card rounded-xl border border-border p-6">
            <h2 className="text-lg font-semibold text-foreground mb-4">{editingGroup ? "Sửa nhóm" : "Thêm nhóm mới"}</h2>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-muted-foreground">Tên nhóm *</label>
                <input
                  value={groupName}
                  onChange={(e) => setGroupName(e.target.value)}
                  className="mt-1 w-full h-10 px-3 rounded-md border border-input bg-background text-sm font-medium text-foreground outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                  placeholder="VD: CSKH, KHO, SALES..."
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-muted-foreground">Mô tả</label>
                <textarea
                  value={groupDesc}
                  onChange={(e) => setGroupDesc(e.target.value)}
                  rows={3}
                  className="mt-1 w-full px-3 py-2 rounded-md border border-input bg-background text-sm font-medium text-foreground outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background resize-none"
                  placeholder="Mô tả nhóm..."
                />
              </div>
              <div className="flex gap-2">
                <button
                  disabled={saving}
                  onClick={async () => {
                    if (!groupName.trim()) return;
                    setSaving(true);
                    setError(null);
                    try {
                      const token = localStorage.getItem("token");
                      const method = editingGroup ? "PUT" : "POST";
                      const url = editingGroup ? `${API_URL}/groups/${editingGroup.id}` : `${API_URL}/groups`;
                      const res = await fetch(url, {
                        method,
                        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
                        body: JSON.stringify({ name: groupName.trim(), description: groupDesc || "" }),
                      });
                      if (!res.ok) throw new Error("Lưu nhóm thất bại");
                      setGroupName("");
                      setGroupDesc("");
                      setEditingGroup(null);
                      await fetchGroups();
                      setSuccess(true);
                      setTimeout(() => setSuccess(false), 2500);
                    } catch (e: any) {
                      setError(e?.message || "Lưu nhóm thất bại");
                    } finally {
                      setSaving(false);
                    }
                  }}
                  className="flex-1 flex items-center justify-center gap-2 h-10 px-4 rounded-md bg-primary text-primary-foreground text-sm font-semibold disabled:opacity-50 hover:opacity-95 transition-opacity"
                >
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  {editingGroup ? "Cập nhật" : "Tạo nhóm"}
                </button>
                {editingGroup && (
                  <button
                    onClick={() => {
                      setEditingGroup(null);
                      setGroupName("");
                      setGroupDesc("");
                    }}
                    className="h-10 px-4 rounded-md border border-border bg-background text-sm font-semibold text-foreground hover:bg-accent transition-colors"
                  >
                    Hủy
                  </button>
                )}
              </div>
            </div>
          </div>

          <div className="lg:col-span-7 bg-card rounded-xl border border-border p-6">
            <h2 className="text-lg font-semibold text-foreground mb-4">Danh sách nhóm ({groups.length})</h2>
            {groups.length === 0 ? (
              <div className="text-sm text-muted-foreground">Chưa có nhóm nào</div>
            ) : (
              <div className="space-y-2">
                {groups.map((g) => (
                  <div key={g.id} className="flex items-center justify-between p-3 rounded-xl border border-border bg-muted/20">
                    <div>
                      <div className="text-sm font-semibold text-foreground">{g.name}</div>
                      {g.description ? <div className="text-xs text-muted-foreground mt-0.5">{g.description}</div> : null}
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => {
                          setEditingGroup(g);
                          setGroupName(g.name || "");
                          setGroupDesc(g.description || "");
                        }}
                        className="p-2 rounded-lg text-muted-foreground hover:bg-accent border border-transparent hover:border-border transition-colors"
                        title="Sửa"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={async () => {
                          if (!confirm("Bạn có chắc muốn xóa nhóm này?")) return;
                          setSaving(true);
                          setError(null);
                          try {
                            const token = localStorage.getItem("token");
                            const res = await fetch(`${API_URL}/groups/${g.id}`, {
                              method: "DELETE",
                              headers: { Authorization: `Bearer ${token}` },
                            });
                            if (!res.ok) throw new Error("Xóa nhóm thất bại");
                            await fetchGroups();
                            setSuccess(true);
                            setTimeout(() => setSuccess(false), 2500);
                          } catch (e: any) {
                            setError(e?.message || "Xóa nhóm thất bại");
                          } finally {
                            setSaving(false);
                          }
                        }}
                        className="p-2 rounded-lg text-muted-foreground hover:bg-destructive hover:text-destructive-foreground border border-transparent hover:border-destructive/40 transition-colors"
                        title="Xóa"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
