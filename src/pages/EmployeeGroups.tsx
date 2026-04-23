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
    <div className="min-h-screen bg-slate-50 -m-8 p-8">
      <div className="flex items-center justify-between mb-6 gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Nhóm nhân viên</h1>
          <p className="text-sm text-slate-500 font-medium mt-1">Quản lý nhóm để phân quyền theo phạm vi “Nhóm”.</p>
        </div>
      </div>

      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-2xl flex items-center gap-3 text-red-600 text-sm font-bold">
          <AlertCircle className="w-5 h-5 shrink-0" /> {error}
        </div>
      )}
      {success && (
        <div className="mb-4 p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center gap-3 text-emerald-600 text-sm font-bold">
          <CheckCircle2 className="w-5 h-5 shrink-0" /> Thao tác thành công!
        </div>
      )}

      {loading ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-10 text-slate-500 font-medium">Đang tải...</div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-5 bg-white rounded-2xl border border-slate-200 p-6">
            <h2 className="text-lg font-black text-slate-900 mb-4">{editingGroup ? "Sửa nhóm" : "Thêm nhóm mới"}</h2>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-bold text-slate-600">Tên nhóm *</label>
                <input
                  value={groupName}
                  onChange={(e) => setGroupName(e.target.value)}
                  className="mt-1 w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white outline-none"
                  placeholder="VD: CSKH, KHO, SALES..."
                />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-600">Mô tả</label>
                <textarea
                  value={groupDesc}
                  onChange={(e) => setGroupDesc(e.target.value)}
                  rows={3}
                  className="mt-1 w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white outline-none resize-none"
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
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-slate-900 text-white text-sm font-bold disabled:opacity-50"
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
                    className="px-4 py-2 rounded-xl border border-slate-200 text-sm font-bold"
                  >
                    Hủy
                  </button>
                )}
              </div>
            </div>
          </div>

          <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-200 p-6">
            <h2 className="text-lg font-black text-slate-900 mb-4">Danh sách nhóm ({groups.length})</h2>
            {groups.length === 0 ? (
              <div className="text-sm text-slate-500">Chưa có nhóm nào</div>
            ) : (
              <div className="space-y-2">
                {groups.map((g) => (
                  <div key={g.id} className="flex items-center justify-between p-3 rounded-xl border border-slate-100 bg-slate-50">
                    <div>
                      <div className="text-sm font-bold text-slate-900">{g.name}</div>
                      {g.description ? <div className="text-xs text-slate-500 mt-0.5">{g.description}</div> : null}
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => {
                          setEditingGroup(g);
                          setGroupName(g.name || "");
                          setGroupDesc(g.description || "");
                        }}
                        className="p-2 rounded-lg text-slate-500 hover:bg-white border border-transparent hover:border-slate-200"
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
                        className="p-2 rounded-lg text-slate-500 hover:bg-white border border-transparent hover:border-slate-200"
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
