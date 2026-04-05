import * as React from "react";
import { api } from "../lib/api";
import { cn, formatCurrency } from "../lib/utils";
import { Plus, Trash2, Edit2, Users, Percent, Save, X, AlertCircle } from "lucide-react";
import { formatCtvRate } from "../lib/commissionUtils";

interface CommissionTier {
  id: number;
  ctv_rate_min: number;
  ctv_rate_max: number | null;
  sales_override_rate: number;
  note: string | null;
}

interface Collaborator {
  sales_id: number;
  ctv_id: number;
  sales_name: string;
  sales_email: string;
  ctv_name: string;
  ctv_email: string;
  ctv_phone: string | null;
}

interface SalesUser {
  id: number;
  full_name: string;
  email: string;
  phone: string | null;
}

export default function CommissionRules() {
  const [tiers, setTiers] = React.useState<CommissionTier[]>([]);
  const [collaborators, setCollaborators] = React.useState<Collaborator[]>([]);
  const [salesUsers, setSalesUsers] = React.useState<SalesUser[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [activeTab, setActiveTab] = React.useState<"tiers" | "collaborators">("tiers");

  // Tier form
  const [editingTier, setEditingTier] = React.useState<CommissionTier | null>(null);
  const [tierForm, setTierForm] = React.useState({ ctv_rate_min: "", ctv_rate_max: "", sales_override_rate: "", note: "" });
  const [showTierForm, setShowTierForm] = React.useState(false);

  // Collaborator form
  const [selectedSalesId, setSelectedSalesId] = React.useState("");
  const [selectedCtvId, setSelectedCtvId] = React.useState("");
  const [availableCtvs, setAvailableCtvs] = React.useState<SalesUser[]>([]);
  const [collabError, setCollabError] = React.useState("");

  React.useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [tiersRes, collabRes, salesRes] = await Promise.all([
        api.get("/api/commission-tiers"),
        api.get("/api/collaborators"),
        api.get("/api/users?role=sales&limit=100"),
      ]);
      setTiers(tiersRes.data || []);
      setCollaborators(collabRes.data || []);
      setSalesUsers(salesRes.data || []);
    } catch (err) {
      console.error("Failed to fetch data:", err);
    } finally {
      setLoading(false);
    }
  };

  const resetTierForm = () => {
    setTierForm({ ctv_rate_min: "", ctv_rate_max: "", sales_override_rate: "", note: "" });
    setEditingTier(null);
  };

  const openTierForm = (tier?: CommissionTier) => {
    if (tier) {
      setEditingTier(tier);
      setTierForm({
        ctv_rate_min: String(tier.ctv_rate_min),
        ctv_rate_max: tier.ctv_rate_max ? String(tier.ctv_rate_max) : "",
        sales_override_rate: String(tier.sales_override_rate),
        note: tier.note || "",
      });
    } else {
      resetTierForm();
    }
    setShowTierForm(true);
  };

  const saveTier = async () => {
    if (!tierForm.ctv_rate_min || !tierForm.sales_override_rate) return;
    try {
      const payload = {
        ctv_rate_min: parseFloat(tierForm.ctv_rate_min),
        ctv_rate_max: tierForm.ctv_rate_max ? parseFloat(tierForm.ctv_rate_max) : null,
        sales_override_rate: parseFloat(tierForm.sales_override_rate),
        note: tierForm.note || null,
      };
      if (editingTier) {
        await api.put(`/api/commission-tiers/${editingTier.id}`, payload);
      } else {
        await api.post("/api/commission-tiers", payload);
      }
      setShowTierForm(false);
      resetTierForm();
      fetchData();
    } catch (err: any) {
      alert(err.message || "Có lỗi xảy ra");
    }
  };

  const deleteTier = async (id: number) => {
    if (!confirm("Xóa quy tắc này?")) return;
    try {
      await api.delete(`/api/commission-tiers/${id}`);
      fetchData();
    } catch (err: any) {
      alert(err.message || "Có lỗi xảy ra");
    }
  };

  const fetchAvailableCtvs = async (salesId: number) => {
    try {
      const res = await api.get(`/api/collaborators/available-ctvs?sales_id=${salesId}`);
      setAvailableCtvs(res.data || []);
    } catch (err) {
      console.error("Failed to fetch available CTVs:", err);
    }
  };

  const addCollaborator = async () => {
    setCollabError("");
    if (!selectedSalesId || !selectedCtvId) {
      setCollabError("Vui lòng chọn cả Sale và CTV");
      return;
    }
    try {
      await api.post("/api/collaborators", { sales_id: parseInt(selectedSalesId), ctv_id: parseInt(selectedCtvId) });
      setSelectedSalesId("");
      setSelectedCtvId("");
      setAvailableCtvs([]);
      fetchData();
    } catch (err: any) {
      setCollabError(err.message || "Có lỗi xảy ra");
    }
  };

  const removeCollaborator = async (salesId: number, ctvId: number) => {
    if (!confirm("Bỏ gán CTV này?")) return;
    try {
      await api.delete(`/api/collaborators/${salesId}/${ctvId}`);
      fetchData();
    } catch (err: any) {
      alert(err.message || "Có lỗi xảy ra");
    }
  };

  const handleSalesChange = (salesId: string) => {
    setSelectedSalesId(salesId);
    setSelectedCtvId("");
    if (salesId) {
      fetchAvailableCtvs(parseInt(salesId));
    } else {
      setAvailableCtvs([]);
    }
  };

  // formatCtvRate moved to src/lib/commissionUtils

  if (loading) {
    return <div className="text-center py-12 text-slate-400">Đang tải...</div>;
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Quy tắc hoa hồng</h1>
        <p className="text-sm text-slate-500 mt-1">Quản lý mức hoa hồng Sale quản lý hưởng từ CTV</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6">
        <button
          onClick={() => setActiveTab("tiers")}
          className={cn(
            "px-4 py-2 rounded-lg text-sm font-medium transition-all",
            activeTab === "tiers" ? "bg-blue-600 text-white" : "bg-white text-slate-600 hover:bg-slate-50"
          )}
        >
          <Percent className="w-4 h-4 inline mr-2" />
          Mức hoa hồng
        </button>
        <button
          onClick={() => setActiveTab("collaborators")}
          className={cn(
            "px-4 py-2 rounded-lg text-sm font-medium transition-all",
            activeTab === "collaborators" ? "bg-blue-600 text-white" : "bg-white text-slate-600 hover:bg-slate-50"
          )}
        >
          <Users className="w-4 h-4 inline mr-2" />
          Gán CTV cho Sale
        </button>
      </div>

      {activeTab === "tiers" && (
        <div>
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold text-slate-900">Bảng mức hoa hồng</h2>
            <button
              onClick={() => openTierForm()}
              className="flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 transition-all"
            >
              <Plus className="w-4 h-4" />
              Thêm mức
            </button>
          </div>

          {/* Tier form */}
          {showTierForm && (
            <div className="bg-white rounded-xl border border-slate-200 p-4 mb-4">
              <h3 className="text-sm font-semibold text-slate-900 mb-3">
                {editingTier ? "Sửa mức hoa hồng" : "Thêm mức hoa hồng mới"}
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">Hoa hồng CTV từ (%)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={tierForm.ctv_rate_min}
                    onChange={(e) => setTierForm({ ...tierForm, ctv_rate_min: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none"
                    placeholder="VD: 10"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">Đến (%) — để trống nếu không giới hạn</label>
                  <input
                    type="number"
                    step="0.01"
                    value={tierForm.ctv_rate_max}
                    onChange={(e) => setTierForm({ ...tierForm, ctv_rate_max: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none"
                    placeholder="VD: 15"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">Sale hưởng (%)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={tierForm.sales_override_rate}
                    onChange={(e) => setTierForm({ ...tierForm, sales_override_rate: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none"
                    placeholder="VD: 3"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">Ghi chú</label>
                  <input
                    type="text"
                    value={tierForm.note}
                    onChange={(e) => setTierForm({ ...tierForm, note: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none"
                    placeholder="VD: CTV cao cấp"
                  />
                </div>
              </div>
              <div className="flex gap-2 mt-3 justify-end">
                <button onClick={() => { setShowTierForm(false); resetTierForm(); }} className="flex items-center gap-1 px-3 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg transition-all">
                  <X className="w-4 h-4" /> Hủy
                </button>
                <button onClick={saveTier} className="flex items-center gap-1 px-3 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all">
                  <Save className="w-4 h-4" /> Lưu
                </button>
              </div>
            </div>
          )}

          {/* Tiers table */}
          {tiers.length === 0 ? (
            <div className="bg-white rounded-xl border border-slate-200 p-8 text-center text-slate-400">
              Chưa có quy tắc nào. Nhấn "Thêm mức" để bắt đầu.
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200">
                    <th className="text-left px-4 py-3 font-semibold text-slate-600">Mức hoa hồng CTV</th>
                    <th className="text-left px-4 py-3 font-semibold text-slate-600">Sale quản lý hưởng</th>
                    <th className="text-left px-4 py-3 font-semibold text-slate-600">Ghi chú</th>
                    <th className="text-right px-4 py-3 font-semibold text-slate-600">Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {tiers.map((tier) => (
                    <tr key={tier.id} className="border-b border-slate-100 hover:bg-slate-50">
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center px-2 py-1 rounded-md bg-blue-50 text-blue-700 font-medium text-xs">
                        {formatCtvRate(tier.ctv_rate_min, tier.ctv_rate_max)}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center px-2 py-1 rounded-md bg-green-50 text-green-700 font-medium text-xs">
                          {tier.sales_override_rate}%
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-500">{tier.note || "—"}</td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex gap-1 justify-end">
                          <button onClick={() => openTierForm(tier)} className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-all">
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button onClick={() => deleteTier(tier.id)} className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-all">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Example */}
          <div className="mt-4 bg-amber-50 border border-amber-200 rounded-xl p-4">
            <div className="flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
              <div className="text-sm text-amber-800">
                <p className="font-semibold mb-1">Ví dụ cách tính:</p>
                <p>CTV Lan có hoa hồng 10% trên đơn hàng 1.000.000đ → Lan hưởng 100.000đ.</p>
                <p>Nếu Sale A quản lý Lan và tier ≥10% → Sale hưởng 3% trên 100.000đ = <strong>3.000đ</strong>.</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === "collaborators" && (
        <div>
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold text-slate-900">Gán CTV cho Sale quản lý</h2>
          </div>

          {/* Add collaborator form */}
          <div className="bg-white rounded-xl border border-slate-200 p-4 mb-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-end">
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Sale quản lý</label>
                <select
                  value={selectedSalesId}
                  onChange={(e) => handleSalesChange(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none"
                >
                  <option value="">-- Chọn Sale --</option>
                  {salesUsers.map((u) => (
                    <option key={u.id} value={u.id}>{u.full_name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Cộng tác viên</label>
                <select
                  value={selectedCtvId}
                  onChange={(e) => setSelectedCtvId(e.target.value)}
                  disabled={!selectedSalesId}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none disabled:bg-slate-100 disabled:text-slate-400"
                >
                  <option value="">-- Chọn CTV --</option>
                  {availableCtvs.map((u) => (
                    <option key={u.id} value={u.id}>{u.full_name}</option>
                  ))}
                </select>
              </div>
              <div>
                <button
                  onClick={addCollaborator}
                  disabled={!selectedSalesId || !selectedCtvId}
                  className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Plus className="w-4 h-4" />
                  Gán CTV
                </button>
              </div>
            </div>
            {collabError && (
              <p className="mt-2 text-sm text-red-600 flex items-center gap-1">
                <AlertCircle className="w-4 h-4" /> {collabError}
              </p>
            )}
          </div>

          {/* Collaborators table */}
          {collaborators.length === 0 ? (
            <div className="bg-white rounded-xl border border-slate-200 p-8 text-center text-slate-400">
              Chưa có CTV nào được gán.
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200">
                    <th className="text-left px-4 py-3 font-semibold text-slate-600">Sale quản lý</th>
                    <th className="text-left px-4 py-3 font-semibold text-slate-600">Cộng tác viên</th>
                    <th className="text-left px-4 py-3 font-semibold text-slate-600">SĐT CTV</th>
                    <th className="text-right px-4 py-3 font-semibold text-slate-600">Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {collaborators.map((c) => (
                    <tr key={`${c.sales_id}-${c.ctv_id}`} className="border-b border-slate-100 hover:bg-slate-50">
                      <td className="px-4 py-3">
                        <div>
                          <p className="font-medium text-slate-900">{c.sales_name}</p>
                          <p className="text-xs text-slate-400">{c.sales_email}</p>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div>
                          <p className="font-medium text-slate-900">{c.ctv_name}</p>
                          <p className="text-xs text-slate-400">{c.ctv_email}</p>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-slate-500">{c.ctv_phone || "—"}</td>
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => removeCollaborator(c.sales_id, c.ctv_id)}
                          className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-all"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
