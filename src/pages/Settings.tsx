import * as React from "react";
import { AlertCircle, CheckCircle2, Edit2, Loader2, Save, Trash2 } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { cn } from "../lib/utils";

const API_URL = (import.meta as any)?.env?.VITE_API_URL || "/api";

type RoleRow = {
  id: number;
  code: string;
  name: string;
  is_system?: any;
  can_access_admin?: any;
};

type FeatureNode = {
  key: string;
  name: string;
  children?: FeatureNode[];
};

type ScopeTarget = { id: string; name: string };
type ScopeLevel = { id: "own" | "group" | "shop"; name: string };

const DEFAULT_SCOPE_LEVELS: ScopeLevel[] = [
  { id: "own", name: "Cá nhân" },
  { id: "group", name: "Nhóm" },
  { id: "shop", name: "Toàn shop" },
];

function flattenNodes(nodes: FeatureNode[], depth = 0): { key: string; name: string; depth: number }[] {
  const out: { key: string; name: string; depth: number }[] = [];
  for (const n of nodes) {
    if (n.key && n.key.includes(".")) out.push({ key: n.key, name: n.name, depth });
    if (Array.isArray(n.children) && n.children.length) out.push(...flattenNodes(n.children, depth + (n.key.includes(".") ? 0 : 1)));
  }
  return out;
}

export function Settings() {
  const [tab, setTab] = React.useState<"permissions" | "scopes">("permissions");
  const location = useLocation();
  const navigate = useNavigate();
  const [roles, setRoles] = React.useState<RoleRow[]>([]);
  const [features, setFeatures] = React.useState<{ key: string; name: string; depth: number }[]>([]);

  const [matrix, setMatrix] = React.useState<Record<number, Record<string, boolean>>>({});
  const [scopes, setScopes] = React.useState<Record<number, Record<string, "own" | "group" | "shop">>>({});
  const [scopeTargets, setScopeTargets] = React.useState<ScopeTarget[]>([]);
  const [scopeLevels, setScopeLevels] = React.useState<ScopeLevel[]>(DEFAULT_SCOPE_LEVELS);

  const [saving, setSaving] = React.useState(false);
  const [success, setSuccess] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(true);

  const loadAll = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem("token");
      const headers = { Authorization: `Bearer ${token}` };

      const [fm, sm] = await Promise.all([
        fetch(`${API_URL}/settings/feature-matrix`, { headers }),
        fetch(`${API_URL}/settings/scope-matrix`, { headers }),
      ]);

      const fmJson = await fm.json();
      const smJson = await sm.json();

      const r: RoleRow[] = Array.isArray(fmJson?.data?.roles) ? fmJson.data.roles : [];
      const ft: FeatureNode[] = Array.isArray(fmJson?.data?.feature_tree) ? fmJson.data.feature_tree : [];
      setRoles(r);
      setFeatures(flattenNodes(ft));
      setMatrix(fmJson?.data?.matrix || {});

      setScopes(smJson?.data?.matrix || {});
      setScopeTargets(Array.isArray(smJson?.data?.scope_targets) ? smJson.data.scope_targets : []);
      setScopeLevels(Array.isArray(smJson?.data?.scope_levels) ? smJson.data.scope_levels : DEFAULT_SCOPE_LEVELS);
    } catch (e: any) {
      setError(e?.message || "Không thể tải dữ liệu phân quyền");
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    loadAll();
  }, [loadAll]);

  React.useEffect(() => {
    const params = new URLSearchParams(location.search || "");
    const q = (params.get("tab") || "").toLowerCase();
    if (q === "permissions" || q === "scopes") {
      setTab(q as any);
    }
  }, [location.search]);

  const setTabAndSyncUrl = React.useCallback(
    (next: "permissions" | "scopes") => {
      setTab(next);
      const params = new URLSearchParams(location.search || "");
      params.set("tab", next);
      navigate({ pathname: "/settings", search: `?${params.toString()}` }, { replace: true });
    },
    [location.search, navigate]
  );

  const toggle = (roleId: number, featureKey: string) => {
    setMatrix((prev) => ({
      ...prev,
      [roleId]: {
        ...(prev[roleId] || {}),
        [featureKey]: !(prev[roleId] || {})[featureKey],
      },
    }));
  };

  const setScope = (roleId: number, target: string, value: "own" | "group" | "shop") => {
    setScopes((prev) => ({
      ...prev,
      [roleId]: {
        ...(prev[roleId] || {}),
        [target]: value,
      },
    }));
  };

  const savePermissions = async () => {
    setSaving(true);
    setError(null);
    setSuccess(false);
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API_URL}/settings/feature-matrix`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          updates: roles.map((r) => ({
            role_id: r.id,
            permissions: matrix[r.id] || {},
          })),
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error || "Lưu phân quyền thất bại");
      setSuccess(true);
      setTimeout(() => setSuccess(false), 2500);
      await loadAll();
    } catch (e: any) {
      setError(e?.message || "Lưu phân quyền thất bại");
    } finally {
      setSaving(false);
    }
  };

  const saveScopes = async () => {
    setSaving(true);
    setError(null);
    setSuccess(false);
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API_URL}/settings/scope-matrix`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          updates: roles.map((r) => ({
            role_id: r.id,
            scopes: scopes[r.id] || {},
          })),
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error || "Lưu phạm vi thất bại");
      setSuccess(true);
      setTimeout(() => setSuccess(false), 2500);
      await loadAll();
    } catch (e: any) {
      setError(e?.message || "Lưu phạm vi thất bại");
    } finally {
      setSaving(false);
    }
  };

  const seedDefaultsForAll = async () => {
    if (!confirm("Khởi tạo phân quyền mặc định cho TẤT CẢ vai trò?")) return;
    setSaving(true);
    setError(null);
    try {
      const token = localStorage.getItem("token");
      for (const r of roles) {
        await fetch(`${API_URL}/settings/feature-seed-default/${r.id}`, {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
        });
      }
      await loadAll();
      setSuccess(true);
      setTimeout(() => setSuccess(false), 2500);
    } catch (e: any) {
      setError(e?.message || "Khởi tạo mặc định thất bại");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 -m-8 p-8">
      <div className="flex items-center justify-between mb-6 gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Phân quyền</h1>
          <p className="text-sm text-slate-500 font-medium mt-1">
            Lưu ý: hệ thống sẽ lưu phân quyền ngay theo dữ liệu bạn chọn bên dưới.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {tab === "permissions" && (
            <button
              onClick={seedDefaultsForAll}
              disabled={saving || loading}
              className="px-4 py-2 rounded-xl text-sm font-bold bg-white border border-slate-200 hover:bg-slate-50 disabled:opacity-50"
            >
              Khởi tạo phân quyền mặc định
            </button>
          )}
          <button
            onClick={tab === "permissions" ? savePermissions : saveScopes}
            disabled={saving || loading}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold bg-slate-900 text-white hover:bg-slate-800 disabled:opacity-50"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {saving ? "Đang lưu..." : "Lưu"}
          </button>
        </div>
      </div>

      <div className="flex items-center gap-6 mb-4 border-b border-slate-200">
        <button
          onClick={() => setTabAndSyncUrl("permissions")}
          className={cn(
            "text-sm font-bold pb-2 border-b-2 -mb-px",
            tab === "permissions" ? "text-blue-600 border-blue-600" : "text-slate-400 border-transparent"
          )}
        >
          Phân quyền nhóm
        </button>
        <button
          onClick={() => setTabAndSyncUrl("scopes")}
          className={cn(
            "text-sm font-bold pb-2 border-b-2 -mb-px",
            tab === "scopes" ? "text-blue-600 border-blue-600" : "text-slate-400 border-transparent"
          )}
        >
          Phân quyền xem dữ liệu
        </button>
      </div>

      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-2xl flex items-center gap-3 text-red-600 text-sm font-bold">
          <AlertCircle className="w-5 h-5 shrink-0" /> {error}
        </div>
      )}
      {success && (
        <div className="mb-4 p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center gap-3 text-emerald-600 text-sm font-bold">
          <CheckCircle2 className="w-5 h-5 shrink-0" /> Lưu thành công!
        </div>
      )}

      {loading ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-10 text-slate-500 font-medium">
          Đang tải...
        </div>
      ) : tab === "permissions" ? (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
          <div className="overflow-auto">
            <table className="min-w-[980px] w-full text-sm">
              <thead className="sticky top-0 bg-slate-50 z-10">
                <tr>
                  <th className="text-left px-4 py-3 font-black text-slate-700 border-b border-slate-200 w-[320px]">
                    Chức năng
                  </th>
                  {roles.map((r) => (
                    <th key={r.id} className="px-3 py-3 font-black text-slate-700 border-b border-slate-200 text-center">
                      <div className="min-w-[110px]">
                        <p className="text-xs">{r.name}</p>
                        <p className="text-[10px] text-slate-400 font-extrabold uppercase mt-0.5">{String(r.code)}</p>
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {features.map((f) => (
                  <tr key={f.key} className="hover:bg-slate-50">
                    <td className="px-4 py-2 border-b border-slate-100">
                      <div className="flex items-center gap-2" style={{ paddingLeft: Math.min(28, f.depth * 14) }}>
                        <span className={cn("font-bold text-slate-800", f.depth ? "text-slate-700" : "text-slate-900")}>
                          {f.name}
                        </span>
                        <span className="text-[10px] text-slate-400 font-semibold">{f.key}</span>
                      </div>
                    </td>
                    {roles.map((r) => {
                      const checked = !!matrix?.[r.id]?.[f.key];
                      return (
                        <td key={r.id} className="px-3 py-2 border-b border-slate-100 text-center">
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => toggle(r.id, f.key)}
                            className="h-4 w-4 accent-blue-600"
                          />
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : tab === "scopes" ? (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
          <div className="overflow-auto">
            <table className="min-w-[980px] w-full text-sm">
              <thead className="sticky top-0 bg-slate-50 z-10">
                <tr>
                  <th className="text-left px-4 py-3 font-black text-slate-700 border-b border-slate-200 w-[320px]">
                    Dữ liệu
                  </th>
                  {roles.map((r) => (
                    <th key={r.id} className="px-3 py-3 font-black text-slate-700 border-b border-slate-200 text-center">
                      <div className="min-w-[110px]">
                        <p className="text-xs">{r.name}</p>
                        <p className="text-[10px] text-slate-400 font-extrabold uppercase mt-0.5">{String(r.code)}</p>
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {scopeTargets.map((t) => (
                  <tr key={t.id} className="hover:bg-slate-50">
                    <td className="px-4 py-2 border-b border-slate-100 font-bold text-slate-800">
                      {t.name} <span className="text-[10px] text-slate-400 font-semibold ml-2">{t.id}</span>
                    </td>
                    {roles.map((r) => {
                      const v = scopes?.[r.id]?.[t.id] || "own";
                      return (
                        <td key={r.id} className="px-3 py-2 border-b border-slate-100 text-center">
                          <select
                            value={v}
                            onChange={(e) => setScope(r.id, t.id, e.target.value as any)}
                            className="text-xs font-bold bg-white border border-slate-200 rounded-lg px-2 py-1"
                          >
                            {scopeLevels.map((sl) => (
                              <option key={sl.id} value={sl.id}>
                                {sl.name}
                              </option>
                            ))}
                          </select>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}
    </div>
  );
}
