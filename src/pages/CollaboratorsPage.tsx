import * as React from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { ArrowLeft, Users, Plus, Search, Loader2, AlertCircle, Trash2, CheckCircle2 } from "lucide-react";
import { cn } from "../lib/utils";
import { BarChart3 as BarChart } from "lucide-react";

const API_URL = "http://localhost:3000/api";

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
        fetch(`${API_URL}/users?scoped=1&limit=100`, { headers }),
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
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (error && !user) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 mx-auto text-red-400 mb-4" />
          <p className="text-red-500 font-medium">{error}</p>
          <button onClick={() => navigate(-1)} className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-xl text-sm">Quay lại</button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate(-1)} className="p-2 hover:bg-slate-100 rounded-xl text-slate-500 transition-all">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Cộng tác viên</h1>
            <p className="text-slate-500 text-sm mt-1">Quản lý cộng tác viên của {user?.full_name}</p>
          </div>
        </div>
        <button
          onClick={() => { setShowAddModal(true); fetchAvailableUsers(); }}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 transition-all"
        >
          <Plus className="w-4 h-4" /> Thêm CTV
        </button>
        <Link to={`/employees/${id}/collaborators/commissions`} className="flex items-center gap-2 px-3 py-2 bg-green-600 text-white rounded-xl text-sm font-medium ml-2 hover:bg-green-700 transition-all">
          <BarChart className="w-4 h-4" /> Báo cáo CTV
        </Link>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" /> {error}
        </div>
      )}
      {success && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 px-4 py-3 rounded-xl text-sm flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" /> {success}
        </div>
      )}

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <Users className="w-4 h-4 text-blue-600" /> Danh sách cộng tác viên
          </h2>
          <span className="text-sm text-slate-500">{collaborators.length} người</span>
        </div>

        {collaborators.length === 0 ? (
          <div className="px-6 py-12 text-center text-slate-400">
            <Users className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p className="font-medium">Chưa có cộng tác viên nào</p>
            <p className="text-sm mt-1">Nhấn "Thêm CTV" để bắt đầu</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/50">
                  <th className="px-6 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">Nhân viên</th>
                  <th className="px-6 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">Liên hệ</th>
                  <th className="px-6 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">Phòng ban / Chức vụ</th>
                  <th className="px-6 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Hoa hồng (%)</th>
                  <th className="px-6 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider text-center">Trạng thái</th>
                  <th className="px-6 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {collaborators.map((collab) => (
                  <tr key={collab.id} className="hover:bg-slate-50/50 transition-all group">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white font-bold text-sm">
                          {collab.full_name?.split(' ').map((n: string) => n[0]).join('').toUpperCase()}
                        </div>
                        <div>
                          <p className="text-sm font-bold text-slate-900">{collab.full_name}</p>
                          <p className="text-xs text-slate-500 font-mono uppercase">{collab.role}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="space-y-1">
                        <p className="text-xs text-slate-500">{collab.email}</p>
                        <p className="text-xs text-slate-500">{collab.phone || '-'}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-sm text-slate-900">{collab.position || '-'}</p>
                      <p className="text-xs text-slate-500">{collab.department || '-'}</p>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <span className="text-sm font-bold text-emerald-600">{collab.commission_rate}%</span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className={cn(
                        "inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider",
                        collab.is_active ? "bg-emerald-50 text-emerald-600" : "bg-slate-100 text-slate-500"
                      )}>
                        {collab.is_active ? "Đang làm việc" : "Đã nghỉ"}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => handleDelete(collab.collaborator_id)}
                        disabled={deleting === collab.collaborator_id}
                        className="inline-flex items-center gap-1 px-3 py-1.5 bg-slate-100 text-slate-600 rounded-lg text-[10px] font-bold uppercase tracking-wider hover:bg-red-600 hover:text-white transition-all opacity-0 group-hover:opacity-100 disabled:opacity-50"
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
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowAddModal(false)}>
          <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full max-h-[80vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-900">Thêm cộng tác viên</h2>
              <button onClick={() => setShowAddModal(false)} className="p-2 hover:bg-slate-100 rounded-xl text-slate-400 transition-all">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>

            <div className="p-6 flex-1 overflow-y-auto">
              <div className="relative mb-4">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Tìm theo tên, email, SĐT..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border-transparent focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 rounded-xl text-sm transition-all outline-none"
                />
              </div>

              <div className="space-y-2 mb-4">
                {filteredAvailable.length === 0 ? (
                  <p className="text-sm text-slate-400 text-center py-4">Không tìm thấy nhân viên nào</p>
                ) : (
                  filteredAvailable.map(u => (
                    <label
                      key={u.id}
                      className={cn(
                        "flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all",
                        selectedCollabId === u.id ? "bg-blue-50 border-blue-200" : "bg-slate-50 border-slate-200 hover:border-blue-200"
                      )}
                    >
                      <input
                        type="radio"
                        name="collaborator"
                        checked={selectedCollabId === u.id}
                        onChange={() => setSelectedCollabId(u.id)}
                        className="w-4 h-4 border-slate-300 text-blue-600 focus:ring-blue-500"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-slate-900 truncate">{u.full_name}</p>
                        <p className="text-xs text-slate-400">{u.email} • {u.phone || '-'}</p>
                      </div>
                      <span className={cn(
                        "text-xs font-bold px-2 py-0.5 rounded-full",
                        u.role === 'admin' ? "bg-purple-100 text-purple-600" : "bg-blue-100 text-blue-600"
                      )}>{u.role}</span>
                    </label>
                  ))
                )}
              </div>

              <div className="space-y-2">
                <div>
                  <label className="text-sm font-medium text-slate-700 block mb-1">Sale quản lý</label>
                  <select
                    value={selectedSalesId}
                    onChange={(e) => setSelectedSalesId(e.target.value)}
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-md text-sm focus:ring-2 focus:ring-blue-500/20"
                  >
                    <option value="">-- Chọn Sale --</option>
                    {salesUsers.map((s) => (
                      <option key={s.id} value={String(s.id)}>{s.full_name} - {s.email}</option>
                    ))}
                  </select>
                </div>
                <label className="text-sm font-bold text-slate-700">Tỷ lệ hoa hồng (%)</label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="0.5"
                  value={commissionRate}
                  onChange={(e) => setCommissionRate(Number(e.target.value))}
                  placeholder="0"
                  className="w-full px-4 py-2.5 bg-slate-50 border-transparent focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 rounded-xl text-sm transition-all outline-none"
                />
                <p className="text-xs text-slate-400">Để sau tính hoa hồng, mặc định 0%</p>
              </div>
            </div>

            <div className="px-6 py-4 border-t border-slate-200 flex items-center justify-end gap-3">
              <button onClick={() => setShowAddModal(false)} className="px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm font-medium text-slate-700 hover:bg-slate-50 transition-all">Hủy</button>
              <button
                onClick={handleAdd}
                disabled={!selectedCollabId || adding}
                className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 transition-all disabled:opacity-50"
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
