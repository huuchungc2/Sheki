import * as React from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { ArrowLeft, Users, Plus, Search, Loader2, AlertCircle, Trash2, CheckCircle2 } from "lucide-react";
import { cn } from "../lib/utils";
import { BarChart3 as BarChart } from "lucide-react";

const API_URL =
  (import.meta as any)?.env?.VITE_API_URL ||
  "/api";

export function CollaboratorsPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [user, setUser] = React.useState<any>(null);
  const [collaborators, setCollaborators] = React.useState<any[]>([]);
  const [availableUsers, setAvailableUsers] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [success, setSuccess] = React.useState<string | null>(null);

  const [showAddModal, setShowAddModal] = React.useState(false);
  // Sales users for selecting a manager when assigning CTV
  interface SalesUser {
    id: number;
    full_name: string;
    email: string;
    phone: string | null;
  }
  const [salesUsers, setSalesUsers] = React.useState<SalesUser[]>([]);
  const [selectedSalesId, setSelectedSalesId] = React.useState<string>("");
  const [searchTerm, setSearchTerm] = React.useState("");
  const [selectedCollabId, setSelectedCollabId] = React.useState<number | null>(null);
  const [commissionRate, setCommissionRate] = React.useState(0);
  const [adding, setAdding] = React.useState(false);
  const [deleting, setDeleting] = React.useState<number | null>(null);

  const fetchData = React.useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const token = localStorage.getItem("token");
      if (!token) {
        setError("Không có token");
        navigate("/login");
        setLoading(false);
        return;
      }
      const headers = { Authorization: `Bearer ${token}` };

  const [userRes, collabRes, salesRes] = await Promise.all([
        fetch(`${API_URL}/users/${id}`, { headers }),
        fetch(`${API_URL}/users/${id}/collaborators`, { headers }),
        fetch(`${API_URL}/users?scoped=1&limit=100&active_only=1`, { headers }),
      ]);

      // Helper to parse JSON safely or throw with HTML/text error
      const readJsonOrText = async (r: Response) => {
        const ct = r.headers.get("content-type") || "";
        if (ct.includes("application/json")) {
          return await r.json();
        }
        const t = await r.text();
        throw new Error(t || "Invalid JSON response");
      };

      if (!userRes.ok) {
        const msg = await userRes.text().catch(() => "Không thể tải thông tin nhân viên");
        throw new Error(msg);
      }
      if (!collabRes.ok) {
        const msg = await collabRes.text().catch(() => "Không thể tải danh sách cộng tác viên");
        throw new Error(msg);
      }

      const userData = await readJsonOrText(userRes);
      const collabData = await readJsonOrText(collabRes);
      setUser(userData.data);
      setCollaborators(collabData.data);
      if (salesRes && salesRes.ok) {
        try {
          const salesJson = await salesRes.json();
          setSalesUsers(salesJson?.data ?? []);
        } catch {
          // ignore non-JSON
        }
      }
    } catch (err: any) {
      console.error("Collaborators fetch error", err);
      setError(err?.message ?? "Không thể tải danh sách cộng tác viên");
    } finally {
      setLoading(false);
    }
  }, [id]);

  React.useEffect(() => { fetchData(); }, [fetchData]);

  const fetchAvailableUsers = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API_URL}/users/available/collaborators?exclude_id=${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const json = await res.json();
        setAvailableUsers(json.data);
      }
    } catch (err) {
      console.error("Failed to fetch available users", err);
    }
  };

  const handleAdd = async () => {
    if (selectedCollabId == null) return;
    try {
      setAdding(true);
      setError(null);
      const token = localStorage.getItem("token");
      const res = await fetch(`${API_URL}/users/${id}/collaborators`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ collaborator_id: selectedCollabId, commission_rate: commissionRate })
      });
      if (!res.ok) {
        let errObj: any = {};
        try {
          errObj = await res.json();
        } catch {
          errObj = {};
        }
        // If body is not JSON, fallback to text
        if (!errObj?.error) {
          const text = await res.text().catch(() => "Thêm thất bại");
          throw new Error(text || "Thêm thất bại");
        }
        throw new Error(errObj?.error || "Thêm thất bại");
      }
      setSuccess("Thêm cộng tác viên thành công");
      setShowAddModal(false);
      setSelectedCollabId(null);
      setCommissionRate(0);
      fetchData();
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      console.error("Failed to add collaborator", err);
      const msg = err?.message ?? "Có lỗi xảy ra khi thêm cộng tác viên";
      setError(msg);
    } finally {
      setAdding(false);
    }
  };

  const handleDelete = async (collaboratorId: number) => {
    if (!confirm("Bạn có chắc muốn xóa cộng tác viên này?")) return;
    try {
      setDeleting(collaboratorId);
      const token = localStorage.getItem("token");
      const res = await fetch(`${API_URL}/users/${id}/collaborators/${collaboratorId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) {
        let errObj: any = {};
        try { errObj = await res.json(); } catch { errObj = {}; }
        if (!errObj?.error) {
          const text = await res.text().catch(() => "Xóa thất bại");
          throw new Error(text || "Xóa thất bại");
        }
        throw new Error(errObj?.error || "Xóa thất bại");
      }
      setSuccess("Xóa cộng tác viên thành công");
      fetchData();
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      console.error("Failed to delete collaborator", err);
      const msg = err?.message ?? "Có lỗi xảy ra khi xóa cộng tác viên";
      setError(msg);
    } finally {
      setDeleting(null);
    }
  };

  const filteredAvailable = availableUsers.filter(u =>
    u.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (u.phone && u.phone.includes(searchTerm))
  );

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error && !user) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 mx-auto text-destructive/70 mb-4" />
          <p className="text-destructive font-medium">{error}</p>
          <button onClick={() => navigate(-1)} className="mt-4 h-10 px-4 bg-primary text-primary-foreground rounded-md text-sm font-semibold hover:opacity-95 transition-opacity">Quay lại</button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 min-w-0">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 min-w-0">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate(-1)} className="p-2 hover:bg-accent rounded-lg text-muted-foreground transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">Cộng tác viên</h1>
            <p className="text-muted-foreground text-sm mt-1">Quản lý cộng tác viên của {user?.full_name}</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center justify-start sm:justify-end gap-2">
          <button
            onClick={() => { setShowAddModal(true); fetchAvailableUsers(); }}
            className="inline-flex items-center gap-2 h-10 px-4 bg-primary text-primary-foreground rounded-md text-sm font-semibold hover:opacity-95 transition-opacity"
          >
            <Plus className="w-4 h-4" /> Thêm CTV
          </button>
          <Link
            to={`/employees/${id}/collaborators/commissions`}
            className="inline-flex items-center gap-2 h-10 px-4 border border-border bg-background text-foreground rounded-md text-sm font-semibold hover:bg-accent transition-colors"
          >
            <BarChart className="w-4 h-4" /> Báo cáo CTV
          </Link>
        </div>
      </div>

      {error && (
        <div className="bg-destructive/10 border border-destructive/30 text-destructive px-4 py-3 rounded-xl text-sm flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" /> {error}
        </div>
      )}
      {success && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 px-4 py-3 rounded-xl text-sm flex items-center gap-2 dark:bg-emerald-950/30 dark:border-emerald-900/50 dark:text-emerald-300">
          <CheckCircle2 className="w-4 h-4 shrink-0" /> {success}
        </div>
      )}

      <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-border flex items-center justify-between">
          <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <Users className="w-4 h-4 text-primary" /> Danh sách cộng tác viên
          </h2>
          <span className="text-sm text-muted-foreground">{collaborators.length} người</span>
        </div>

        {collaborators.length === 0 ? (
          <div className="px-6 py-12 text-center text-muted-foreground">
            <Users className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p className="font-medium">Chưa có cộng tác viên nào</p>
            <p className="text-sm mt-1">Nhấn "Thêm CTV" để bắt đầu</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-muted/30">
                  <th className="px-6 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Nhân viên</th>
                  <th className="px-6 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Liên hệ</th>
                  <th className="px-6 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Phòng ban / Chức vụ</th>
                  <th className="px-6 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider text-right">Hoa hồng (%)</th>
                  <th className="px-6 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider text-center">Trạng thái</th>
                  <th className="px-6 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {collaborators.map((collab) => (
                  <tr key={collab.id} className="hover:bg-muted/20 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center text-primary-foreground font-bold text-sm">
                          {collab.full_name?.split(' ').map((n: string) => n[0]).join('').toUpperCase()}
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-foreground">{collab.full_name}</p>
                          <p className="text-xs text-muted-foreground font-mono uppercase">{collab.role}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="space-y-1">
                        <p className="text-xs text-muted-foreground">{collab.email}</p>
                        <p className="text-xs text-muted-foreground">{collab.phone || '-'}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-sm text-foreground">{collab.position || '-'}</p>
                      <p className="text-xs text-muted-foreground">{collab.department || '-'}</p>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <span className="text-sm font-bold text-emerald-600">{collab.commission_rate}%</span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className={cn(
                        "inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider",
                        collab.is_active
                          ? "bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-300 dark:border-emerald-900/50"
                          : "bg-muted text-muted-foreground border border-border"
                      )}>
                        {collab.is_active ? "Đang làm việc" : "Đã nghỉ"}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => handleDelete(collab.collaborator_id)}
                        disabled={deleting === collab.collaborator_id}
                        className="inline-flex items-center gap-1 px-3 py-1.5 bg-muted text-muted-foreground rounded-md text-[10px] font-bold uppercase tracking-wider hover:bg-destructive hover:text-destructive-foreground transition-colors opacity-0 group-hover:opacity-100 disabled:opacity-50"
                      >
                        {deleting === collab.collaborator_id ? (
                          <Loader2 className="w-3 h-3 animate-spin" />
                        ) : (
                          <Trash2 className="w-3 h-3" />
                        )}
                        Xóa
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showAddModal && (
        <div className="fixed inset-0 bg-foreground/50 flex items-center justify-center z-50 p-4" onClick={() => setShowAddModal(false)}>
          <div className="bg-card rounded-2xl shadow-xl max-w-lg w-full max-h-[80vh] flex flex-col border border-border" onClick={(e) => e.stopPropagation()}>
            <div className="px-6 py-4 border-b border-border flex items-center justify-between">
              <h2 className="text-lg font-semibold text-foreground">Thêm cộng tác viên</h2>
              <button onClick={() => setShowAddModal(false)} className="p-2 hover:bg-accent rounded-xl text-muted-foreground transition-colors">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>

            <div className="p-6 flex-1 overflow-y-auto">
              <div className="relative mb-4">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Tìm theo tên, email, SĐT..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-background border border-input rounded-md text-sm font-medium text-foreground shadow-sm outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                />
              </div>

              <div className="space-y-2 mb-4">
                {filteredAvailable.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">Không tìm thấy nhân viên nào</p>
                ) : (
                  filteredAvailable.map(u => (
                    <label
                      key={u.id}
                      className={cn(
                        "flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all",
                        selectedCollabId === u.id
                          ? "bg-accent border-border"
                          : "bg-muted/20 border-border hover:bg-muted/30"
                      )}
                    >
                      <input
                        type="radio"
                        name="collaborator"
                        checked={selectedCollabId === u.id}
                        onChange={() => setSelectedCollabId(u.id)}
                        className="w-4 h-4 border-input text-primary focus:ring-ring"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-foreground truncate">{u.full_name}</p>
                        <p className="text-xs text-muted-foreground">{u.email} • {u.phone || '-'}</p>
                      </div>
                      <span className={cn(
                        "text-xs font-bold px-2 py-0.5 rounded-full",
                        u.role === 'admin'
                          ? "bg-violet-50 text-violet-700 border border-violet-200 dark:bg-violet-950/30 dark:text-violet-300 dark:border-violet-900/50"
                          : "bg-muted text-primary border border-border"
                      )}>{u.role}</span>
                    </label>
                  ))
                )}
              </div>

              <div className="space-y-2">
                <div>
                  <label className="text-sm font-medium text-foreground block mb-1">Sale quản lý</label>
                  <select
                    value={selectedSalesId}
                    onChange={(e) => setSelectedSalesId(e.target.value)}
                    className="w-full px-4 py-2 bg-background border border-input rounded-md text-sm font-medium text-foreground shadow-sm outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                  >
                    <option value="">-- Chọn Sale --</option>
                    {salesUsers.map((s) => (
                      <option key={s.id} value={String(s.id)}>{s.full_name} - {s.email}</option>
                    ))}
                  </select>
                </div>
                <label className="text-sm font-semibold text-foreground">Tỷ lệ hoa hồng (%)</label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="0.5"
                  value={commissionRate}
                  onChange={(e) => setCommissionRate(Number(e.target.value))}
                  placeholder="0"
                  className="w-full px-4 py-2.5 bg-background border border-input rounded-md text-sm font-medium text-foreground shadow-sm outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                />
                <p className="text-xs text-muted-foreground">Để sau tính hoa hồng, mặc định 0%</p>
              </div>
            </div>

            <div className="px-6 py-4 border-t border-border flex items-center justify-end gap-3">
              <button onClick={() => setShowAddModal(false)} className="h-10 px-4 bg-background border border-border rounded-md text-sm font-semibold text-foreground hover:bg-accent transition-colors">Hủy</button>
              <button
                onClick={handleAdd}
                disabled={!selectedCollabId || adding}
                className="inline-flex items-center gap-2 h-10 px-6 bg-primary text-primary-foreground rounded-md text-sm font-semibold hover:opacity-95 transition-opacity disabled:opacity-50"
              >
                {adding && <Loader2 className="w-4 h-4 animate-spin" />}
                <Plus className="w-4 h-4" /> Thêm
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
