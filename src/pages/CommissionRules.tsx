import * as React from "react";
import { api } from "../lib/api";
import { cn, formatCurrency } from "../lib/utils";
import { Plus, Trash2, Edit2, Users, Percent, Save, X, AlertCircle } from "lucide-react";
import { formatCtvRate, calculateLineCommissions } from "../lib/commissionUtils";

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
        api.get("/commission-tiers"),
        api.get("/collaborators"),
        api.get("/users?scoped=1&limit=100&active_only=1"),
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
        await api.put(`/commission-tiers/${editingTier.id}`, payload);
      } else {
        await api.post("/commission-tiers", payload);
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
      await api.delete(`/commission-tiers/${id}`);
      fetchData();
    } catch (err: any) {
      alert(err.message || "Có lỗi xảy ra");
    }
  };

  const fetchAvailableCtvs = async (salesId: number) => {
    try {
      const res = await api.get(`/collaborators/available-ctvs?sales_id=${salesId}`);
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
      await api.post("/collaborators", { sales_id: parseInt(selectedSalesId), ctv_id: parseInt(selectedCtvId) });
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
      await api.delete(`/collaborators/${salesId}/${ctvId}`);
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
    return <div className="text-center py-12 text-muted-foreground">Đang tải...</div>;
  }

  return (
    <div className="space-y-6 min-w-0">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">Quy tắc hoa hồng</h1>
        <p className="text-sm text-muted-foreground mt-1">Quản lý mức hoa hồng Sale quản lý hưởng từ CTV</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6">
        <button
          onClick={() => setActiveTab("tiers")}
          className={cn(
            "h-10 px-4 rounded-md text-sm font-semibold transition-colors border",
            activeTab === "tiers"
              ? "bg-primary text-primary-foreground border-primary"
              : "bg-background text-foreground border-border hover:bg-accent"
          )}
        >
          <Percent className="w-4 h-4 inline mr-2" />
          Mức hoa hồng
        </button>
        <button
          onClick={() => setActiveTab("collaborators")}
          className={cn(
            "h-10 px-4 rounded-md text-sm font-semibold transition-colors border",
            activeTab === "collaborators"
              ? "bg-primary text-primary-foreground border-primary"
              : "bg-background text-foreground border-border hover:bg-accent"
          )}
        >
          <Users className="w-4 h-4 inline mr-2" />
          Gán CTV cho Sale
        </button>
      </div>

      {activeTab === "tiers" && (
        <div>
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold text-foreground">Bảng mức hoa hồng</h2>
            <button
              onClick={() => openTierForm()}
              className="inline-flex items-center gap-2 h-10 px-4 bg-primary text-primary-foreground rounded-md text-sm font-semibold hover:opacity-95 transition-opacity"
            >
              <Plus className="w-4 h-4" />
              Thêm mức
            </button>
          </div>

          {/* Tier form */}
          {showTierForm && (
            <div className="bg-card rounded-xl border border-border p-4 mb-4">
              <h3 className="text-sm font-semibold text-foreground mb-3">
                {editingTier ? "Sửa mức hoa hồng" : "Thêm mức hoa hồng mới"}
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1">Hoa hồng CTV từ (%)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={tierForm.ctv_rate_min}
                    onChange={(e) => setTierForm({ ...tierForm, ctv_rate_min: e.target.value })}
                    className="w-full h-10 px-3 border border-input bg-background rounded-md text-sm font-medium text-foreground outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                    placeholder="VD: 10"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1">Đến (%) — để trống nếu không giới hạn</label>
                  <input
                    type="number"
                    step="0.01"
                    value={tierForm.ctv_rate_max}
                    onChange={(e) => setTierForm({ ...tierForm, ctv_rate_max: e.target.value })}
                    className="w-full h-10 px-3 border border-input bg-background rounded-md text-sm font-medium text-foreground outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                    placeholder="VD: 15"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1">Sale hưởng (%)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={tierForm.sales_override_rate}
                    onChange={(e) => setTierForm({ ...tierForm, sales_override_rate: e.target.value })}
                    className="w-full h-10 px-3 border border-input bg-background rounded-md text-sm font-medium text-foreground outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                    placeholder="VD: 3"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1">Ghi chú</label>
                  <input
                    type="text"
                    value={tierForm.note}
                    onChange={(e) => setTierForm({ ...tierForm, note: e.target.value })}
                    className="w-full h-10 px-3 border border-input bg-background rounded-md text-sm font-medium text-foreground outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                    placeholder="VD: CTV cao cấp"
                  />
                </div>
              </div>
              <div className="flex gap-2 mt-3 justify-end">
                <button onClick={() => { setShowTierForm(false); resetTierForm(); }} className="inline-flex items-center gap-1 h-10 px-4 text-sm font-semibold text-foreground hover:bg-accent border border-border rounded-md transition-colors">
                  <X className="w-4 h-4" /> Hủy
                </button>
                <button onClick={saveTier} className="inline-flex items-center gap-1 h-10 px-4 text-sm font-semibold bg-primary text-primary-foreground rounded-md hover:opacity-95 transition-opacity">
                  <Save className="w-4 h-4" /> Lưu
                </button>
              </div>
            </div>
          )}

          {/* Tiers table */}
          {tiers.length === 0 ? (
            <div className="bg-card rounded-xl border border-border p-8 text-center text-muted-foreground">
              Chưa có quy tắc nào. Nhấn "Thêm mức" để bắt đầu.
            </div>
          ) : (
            <div className="bg-card rounded-xl border border-border overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-muted/30 border-b border-border">
                    <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Mức hoa hồng CTV</th>
                    <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Sale quản lý hưởng</th>
                    <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Ghi chú</th>
                    <th className="text-right px-4 py-3 font-semibold text-muted-foreground">Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {tiers.map((tier) => (
                    <tr key={tier.id} className="border-b border-border hover:bg-muted/20 transition-colors">
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center px-2 py-1 rounded-md bg-muted text-foreground font-medium text-xs border border-border">
                        {formatCtvRate(tier.ctv_rate_min, tier.ctv_rate_max)}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center px-2 py-1 rounded-md bg-accent text-accent-foreground font-medium text-xs border border-border">
                          {tier.sales_override_rate}%
                        </span>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">{tier.note || "—"}</td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex gap-1 justify-end">
                          <button onClick={() => openTierForm(tier)} className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-accent rounded transition-colors">
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button onClick={() => deleteTier(tier.id)} className="p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded transition-colors">
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
          <div className="mt-4 bg-muted/20 border border-border rounded-xl p-4">
            <div className="flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
              <div className="text-sm text-foreground">
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
            <h2 className="text-lg font-semibold text-foreground">Gán CTV cho Sale quản lý</h2>
          </div>

          {/* Add collaborator form */}
          <div className="bg-card rounded-xl border border-border p-4 mb-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-end">
              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1">Sale quản lý</label>
                <select
                  value={selectedSalesId}
                  onChange={(e) => handleSalesChange(e.target.value)}
                  className="w-full h-10 px-3 border border-input bg-background rounded-md text-sm font-semibold text-foreground outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                >
                  <option value="">-- Chọn Sale --</option>
                  {salesUsers.map((u) => (
                    <option key={u.id} value={u.id}>{u.full_name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1">Cộng tác viên</label>
                <select
                  value={selectedCtvId}
                  onChange={(e) => setSelectedCtvId(e.target.value)}
                  disabled={!selectedSalesId}
                  className="w-full h-10 px-3 border border-input bg-background rounded-md text-sm font-semibold text-foreground outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:bg-muted disabled:text-muted-foreground"
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
                  className="w-full inline-flex items-center justify-center gap-2 h-10 px-3 bg-primary text-primary-foreground rounded-md text-sm font-semibold hover:opacity-95 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Plus className="w-4 h-4" />
                  Gán CTV
                </button>
              </div>
            </div>
            {collabError && (
              <p className="mt-2 text-sm text-destructive flex items-center gap-1">
                <AlertCircle className="w-4 h-4" /> {collabError}
              </p>
            )}
          </div>

          {/* Collaborators table */}
          {collaborators.length === 0 ? (
            <div className="bg-card rounded-xl border border-border p-8 text-center text-muted-foreground">
              Chưa có CTV nào được gán.
            </div>
          ) : (
            <div className="bg-card rounded-xl border border-border overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-muted/30 border-b border-border">
                    <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Sale quản lý</th>
                    <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Cộng tác viên</th>
                    <th className="text-left px-4 py-3 font-semibold text-muted-foreground">SĐT CTV</th>
                    <th className="text-right px-4 py-3 font-semibold text-muted-foreground">Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {collaborators.map((c) => (
                    <tr key={`${c.sales_id}-${c.ctv_id}`} className="border-b border-border hover:bg-muted/20 transition-colors">
                      <td className="px-4 py-3">
                        <div>
                          <p className="font-medium text-foreground">{c.sales_name}</p>
                          <p className="text-xs text-muted-foreground">{c.sales_email}</p>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div>
                          <p className="font-medium text-foreground">{c.ctv_name}</p>
                          <p className="text-xs text-muted-foreground">{c.ctv_email}</p>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">{c.ctv_phone || "—"}</td>
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => removeCollaborator(c.sales_id, c.ctv_id)}
                          className="p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded transition-colors"
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
