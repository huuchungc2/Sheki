import * as React from "react";
import { 
  Shield, Users, Package, ShoppingCart, Warehouse, BarChart3, UserCircle,
  Lock, Check, X, Save, Loader2, AlertCircle, CheckCircle2, Plus, Trash2, Edit2
} from "lucide-react";
import { cn } from "../lib/utils";

const API_URL =
  (import.meta as any)?.env?.VITE_API_URL ||
  "/api";

const ROLE_CONFIG = [
  { id: "admin", name: "Quản trị viên", description: "Toàn quyền hệ thống, cấu hình và bảo mật.", icon: Shield },
  { id: "sales", name: "Nhân viên bán hàng", description: "Tạo đơn hàng, quản lý khách hàng, xem hoa hồng cá nhân.", icon: ShoppingCart },
];

const MODULES = [
  { id: "dashboard", name: "Tổng quan", icon: BarChart3 },
  { id: "employees", name: "Nhân viên", icon: Users },
  { id: "products", name: "Sản phẩm", icon: Package },
  { id: "customers", name: "Khách hàng", icon: UserCircle },
  { id: "orders", name: "Đơn hàng", icon: ShoppingCart },
  { id: "inventory", name: "Kho bãi", icon: Warehouse },
  { id: "reports", name: "Báo cáo", icon: BarChart3 },
  { id: "settings", name: "Cài đặt", icon: Shield },
];

const ACTIONS = [
  { id: "view", name: "Xem" },
  { id: "create", name: "Thêm" },
  { id: "edit", name: "Sửa" },
  { id: "delete", name: "Xóa" },
];

function getDefaultPermissions(role) {
  const permissions = [];
  MODULES.forEach(mod => {
    ACTIONS.forEach(act => {
      let allowed = false;
      if (role === "admin") allowed = true;
      else if (role === "sales") {
        if (mod.id === "dashboard" && act.id === "view") allowed = true;
        if (mod.id === "orders" && ["view", "create", "edit"].includes(act.id)) allowed = true;
        if (mod.id === "customers" && ["view", "create", "edit"].includes(act.id)) allowed = true;
        if (mod.id === "reports" && act.id === "view") allowed = true;
        if (mod.id === "products" && act.id === "view") allowed = true;
      }
      permissions.push({ module: mod.id, action: act.id, allowed });
    });
  });
  return permissions;
}

export function Settings() {
  const [tab, setTab] = React.useState<"roles" | "groups">("roles");
  const [selectedRoleId, setSelectedRoleId] = React.useState("admin");
  const [permissions, setPermissions] = React.useState([]);
  const [saving, setSaving] = React.useState(false);
  const [success, setSuccess] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  // Groups state
  const [groups, setGroups] = React.useState<any[]>([]);
  const [editingGroup, setEditingGroup] = React.useState<any>(null);
  const [groupName, setGroupName] = React.useState("");
  const [groupDesc, setGroupDesc] = React.useState("");

  React.useEffect(() => {
    fetchPermissions();
    fetchGroups();
  }, [selectedRoleId]);

  const fetchPermissions = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API_URL}/settings/${selectedRoleId}/permissions`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const json = await res.json();
        setPermissions(json.data || getDefaultPermissions(selectedRoleId));
      } else {
        setPermissions(getDefaultPermissions(selectedRoleId));
      }
    } catch (err) {
      setPermissions(getDefaultPermissions(selectedRoleId));
    }
  };

  const fetchGroups = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API_URL}/groups`, { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) {
        const json = await res.json();
        setGroups(json.data || []);
      }
    } catch (err) {
      console.error("Failed to fetch groups", err);
    }
  };

  const handleSavePermissions = async () => {
    setSaving(true);
    setError(null);
    setSuccess(false);
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API_URL}/settings/${selectedRoleId}/permissions`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ permissions })
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Lưu thất bại");
      }
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const togglePermission = (module: string, action: string) => {
    setPermissions(prev => prev.map(p => 
      p.module === module && p.action === action ? { ...p, allowed: !p.allowed } : p
    ));
  };

  const handleSaveGroup = async () => {
    if (!groupName.trim()) return;
    try {
      const token = localStorage.getItem("token");
      const method = editingGroup ? "PUT" : "POST";
      const url = editingGroup ? `${API_URL}/groups/${editingGroup.id}` : `${API_URL}/groups`;
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ name: groupName, description: groupDesc })
      });
      if (!res.ok) throw new Error("Lưu nhóm thất bại");
      setGroupName("");
      setGroupDesc("");
      setEditingGroup(null);
      fetchGroups();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleDeleteGroup = async (id: number) => {
    if (!confirm("Bạn có chắc muốn xóa nhóm này?")) return;
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API_URL}/groups/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error("Xóa nhóm thất bại");
      fetchGroups();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const selectedRole = ROLE_CONFIG.find(r => r.id === selectedRoleId) || ROLE_CONFIG[0];
  const allowedCount = permissions.filter(p => p.allowed).length;
  const totalCount = permissions.length;

  return (
    <div className="min-h-screen bg-[#FFF5F5] -m-8 p-8">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-12">
          <h1 className="text-2xl font-black text-slate-900 tracking-tight uppercase">Quản lý hệ thống</h1>
          <nav className="flex items-center gap-8">
            <button onClick={() => setTab("roles")} className={cn("text-sm font-bold pb-1 border-b-2 transition-all", tab === "roles" ? "text-red-600 border-red-600" : "text-slate-400 border-transparent hover:text-slate-900")}>Vai trò & Phân quyền</button>
            <button onClick={() => setTab("groups")} className={cn("text-sm font-bold pb-1 border-b-2 transition-all", tab === "groups" ? "text-red-600 border-red-600" : "text-slate-400 border-transparent hover:text-slate-900")}>Nhóm nhân viên</button>
          </nav>
        </div>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-2xl flex items-center gap-3 text-red-600 text-sm font-bold">
          <AlertCircle className="w-5 h-5 shrink-0" /> {error}
        </div>
      )}
      {success && (
        <div className="mb-6 p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center gap-3 text-emerald-600 text-sm font-bold">
          <CheckCircle2 className="w-5 h-5 shrink-0" /> Lưu thành công!
        </div>
      )}

      {tab === "roles" ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
          <div className="lg:col-span-4 space-y-8">
            <div className="flex items-center justify-between">
              <h2 className="text-3xl font-black text-slate-900 tracking-tight">Vai trò hệ thống</h2>
              <span className="px-3 py-1 bg-red-100 text-red-600 text-[10px] font-black rounded-full uppercase tracking-widest">{ROLE_CONFIG.length} Vai trò</span>
            </div>
            <div className="space-y-4">
              {ROLE_CONFIG.map((role) => {
                const Icon = role.icon;
                return (
                  <button key={role.id} onClick={() => setSelectedRoleId(role.id)} className={cn("w-full p-8 rounded-[32px] text-left transition-all relative group", selectedRoleId === role.id ? "bg-white shadow-2xl shadow-red-200/50 border-l-4 border-red-600" : "bg-white/50 hover:bg-white border-l-4 border-transparent")}>
                    <div className="flex items-center gap-3 mb-4">
                      <Icon className={cn("w-5 h-5", selectedRoleId === role.id ? "text-red-600" : "text-slate-400")} />
                      <span className={cn("text-xl font-black tracking-tight", selectedRoleId === role.id ? "text-red-600" : "text-slate-900")}>{role.name}</span>
                    </div>
                    <p className="text-sm font-medium text-slate-500 leading-relaxed">{role.description}</p>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="lg:col-span-8 bg-white rounded-[48px] p-12 shadow-sm">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h2 className="text-3xl font-black text-slate-900 tracking-tight">{selectedRole.name}</h2>
                <p className="text-slate-500 font-medium mt-1">{selectedRole.description}</p>
              </div>
              <div className="flex items-center gap-4">
                <span className="text-sm font-bold text-slate-400">{allowedCount}/{totalCount} quyền</span>
                <button onClick={handleSavePermissions} disabled={saving} className="flex items-center gap-2 px-6 py-3 bg-red-600 text-white rounded-2xl text-sm font-bold hover:bg-red-700 transition-all shadow-lg shadow-red-600/20 disabled:opacity-50">
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  {saving ? "Đang lưu..." : "Lưu phân quyền"}
                </button>
              </div>
            </div>

            <div className="space-y-6">
              {MODULES.map(mod => {
                const Icon = mod.icon;
                const modPerms = permissions.filter(p => p.module === mod.id);
                return (
                  <div key={mod.id} className="bg-slate-50 rounded-3xl p-6">
                    <div className="flex items-center gap-3 mb-4">
                      <Icon className="w-5 h-5 text-red-600" />
                      <h3 className="text-lg font-black text-slate-900">{mod.name}</h3>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      {modPerms.map(perm => (
                        <button key={`${perm.module}-${perm.action}`} onClick={() => togglePermission(perm.module, perm.action)} className={cn("flex items-center gap-2 px-4 py-3 rounded-2xl text-sm font-bold transition-all", perm.allowed ? "bg-red-600 text-white shadow-md shadow-red-600/20" : "bg-white text-slate-400 border border-slate-200 hover:border-red-200 hover:text-red-600")}>
                          {perm.allowed ? <Check className="w-4 h-4" /> : <X className="w-4 h-4" />}
                          {ACTIONS.find(a => a.id === perm.action)?.name}
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
          <div className="lg:col-span-5 space-y-8">
            <div className="bg-white rounded-[48px] p-12 shadow-sm">
              <h2 className="text-2xl font-black text-slate-900 mb-6">{editingGroup ? "Sửa nhóm" : "Thêm nhóm mới"}</h2>
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700">Tên nhóm *</label>
                  <input type="text" value={groupName} onChange={(e) => setGroupName(e.target.value)} placeholder="VD: TNK, SHEKI, KHA..." className="w-full px-4 py-3 bg-slate-50 border-transparent focus:bg-white focus:border-blue-500 rounded-xl text-sm outline-none" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700">Mô tả</label>
                  <textarea value={groupDesc} onChange={(e) => setGroupDesc(e.target.value)} placeholder="Mô tả nhóm..." rows={3} className="w-full px-4 py-3 bg-slate-50 border-transparent focus:bg-white focus:border-blue-500 rounded-xl text-sm outline-none resize-none" />
                </div>
                <div className="flex gap-3">
                  <button onClick={handleSaveGroup} className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-xl text-sm font-bold hover:bg-blue-700 transition-all">
                    <Save className="w-4 h-4" /> {editingGroup ? "Cập nhật" : "Tạo nhóm"}
                  </button>
                  {editingGroup && (
                    <button onClick={() => { setEditingGroup(null); setGroupName(""); setGroupDesc(""); }} className="px-6 py-3 bg-slate-100 text-slate-600 rounded-xl text-sm font-bold hover:bg-slate-200">
                      Hủy
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="lg:col-span-7 bg-white rounded-[48px] p-12 shadow-sm">
            <h2 className="text-2xl font-black text-slate-900 mb-6">Danh sách nhóm ({groups.length})</h2>
            {groups.length === 0 ? (
              <p className="text-center text-slate-400 py-12">Chưa có nhóm nào</p>
            ) : (
              <div className="space-y-3">
                {groups.map(group => (
                  <div key={group.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100">
                    <div>
                      <p className="text-sm font-bold text-slate-900">{group.name}</p>
                      {group.description && <p className="text-xs text-slate-400 mt-1">{group.description}</p>}
                    </div>
                    <div className="flex items-center gap-2">
                      <button onClick={() => { setEditingGroup(group); setGroupName(group.name); setGroupDesc(group.description || ""); }} className="p-2 hover:bg-amber-50 hover:text-amber-600 rounded-lg text-slate-400 transition-all">
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button onClick={() => handleDeleteGroup(group.id)} className="p-2 hover:bg-red-50 hover:text-red-600 rounded-lg text-slate-400 transition-all">
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
