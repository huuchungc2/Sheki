import * as React from "react";
import { AlertCircle, CheckCircle2, Info, Loader2, Package, Save, Store } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { coerceOrderLineBool, pickShopOrderLineBlock } from "../lib/shopOrderLine";
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

type OrderLineBlockForm = {
  show_discount: boolean;
  show_commission: boolean;
  qty_allow_decimal: boolean;
  default_commission_rate: number;
  default_discount_rate: number;
};

const defaultOrderLineBlock = (): OrderLineBlockForm => ({
  show_discount: true,
  show_commission: true,
  qty_allow_decimal: true,
  default_commission_rate: 10,
  default_discount_rate: 0,
});

function blockFromApi(b: unknown): OrderLineBlockForm {
  const o = b && typeof b === "object" ? (b as Record<string, unknown>) : {};
  const dr = Number(o.default_commission_rate);
  const ddr = Number(o.default_discount_rate);
  return {
    show_discount: coerceOrderLineBool(o.show_discount, true),
    show_commission: coerceOrderLineBool(o.show_commission, true),
    qty_allow_decimal: coerceOrderLineBool(o.qty_allow_decimal, true),
    default_commission_rate: Number.isFinite(dr) ? Math.min(100, Math.max(0, dr)) : 10,
    default_discount_rate: Number.isFinite(ddr) ? Math.min(100, Math.max(0, ddr)) : 0,
  };
}

function OrderLinePanel(props: {
  icon: React.ReactNode;
  heading: string;
  subheading: string;
  state: OrderLineBlockForm;
  setState: React.Dispatch<React.SetStateAction<OrderLineBlockForm>>;
}) {
  const { icon, heading, subheading, state, setState } = props;

  const rowClass = (active: boolean) =>
    cn(
      "flex flex-col gap-3 rounded-xl border px-4 py-3.5 transition-colors sm:flex-row sm:items-center sm:justify-between sm:gap-4",
      active
        ? "border-blue-200/80 bg-blue-50/40 shadow-[inset_0_0_0_1px_rgba(59,130,246,0.06)]"
        : "border-slate-100 bg-slate-50/25"
    );

  const pctInputClass = (enabled: boolean) =>
    cn(
      "w-full rounded-lg border px-3 py-2.5 pr-8 text-sm font-bold shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 sm:max-w-[7.5rem]",
      enabled
        ? "border-slate-200 bg-white text-slate-900 focus:border-blue-300"
        : "border-slate-100 bg-slate-100/80 text-slate-400 cursor-not-allowed"
    );

  return (
    <div className="flex flex-col rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden min-h-0">
      <div className="flex items-start gap-3 px-5 py-4 border-b border-slate-100 bg-gradient-to-br from-slate-50 to-white">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white border border-slate-200/80 text-blue-600 shadow-sm">
          {icon}
        </div>
        <div className="min-w-0 pt-0.5">
          <h3 className="text-sm font-black text-slate-900 tracking-tight">{heading}</h3>
          <p className="text-xs text-slate-500 font-medium mt-0.5">{subheading}</p>
        </div>
      </div>
      <div className="p-5 flex flex-col gap-2.5">
        <div className={rowClass(state.show_discount)}>
          <label className="flex cursor-pointer items-start gap-3 min-w-0 sm:flex-1">
            <input
              type="checkbox"
              checked={state.show_discount}
              onChange={(e) => setState((s) => ({ ...s, show_discount: e.target.checked }))}
              className="mt-0.5 h-4 w-4 shrink-0 rounded border-slate-300 accent-blue-600"
            />
            <span className="min-w-0">
              <span className="text-sm font-bold text-slate-900">CK — Chiết khấu</span>
              <span className="block text-xs text-slate-500 mt-0.5 leading-snug">Hiện cột chiết khấu trên bảng dòng.</span>
            </span>
          </label>
          <div className="shrink-0 w-full sm:w-auto sm:min-w-[7.5rem]">
            <span className="block text-[10px] font-bold uppercase tracking-wide text-slate-500 mb-1">% CK mặc định</span>
            <div className="relative">
              <input
                type="number"
                min={0}
                max={100}
                step={0.1}
                disabled={!state.show_discount}
                className={pctInputClass(state.show_discount)}
                value={state.default_discount_rate}
                onChange={(e) => {
                  const n = Number(e.target.value);
                  setState((s) => ({
                    ...s,
                    default_discount_rate: Number.isFinite(n) ? Math.min(100, Math.max(0, n)) : s.default_discount_rate,
                  }));
                }}
              />
              <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">%</span>
            </div>
          </div>
        </div>

        <div className={rowClass(state.show_commission)}>
          <label className="flex cursor-pointer items-start gap-3 min-w-0 sm:flex-1">
            <input
              type="checkbox"
              checked={state.show_commission}
              onChange={(e) => setState((s) => ({ ...s, show_commission: e.target.checked }))}
              className="mt-0.5 h-4 w-4 shrink-0 rounded border-slate-300 accent-blue-600"
            />
            <span className="min-w-0">
              <span className="text-sm font-bold text-slate-900">HH — Hoa hồng</span>
              <span className="block text-xs text-slate-500 mt-0.5 leading-snug">Hiện cột hoa hồng trên bảng dòng.</span>
            </span>
          </label>
          <div className="shrink-0 w-full sm:w-auto sm:min-w-[7.5rem]">
            <span className="block text-[10px] font-bold uppercase tracking-wide text-slate-500 mb-1">% HH mặc định</span>
            <div className="relative">
              <input
                type="number"
                min={0}
                max={100}
                step={0.1}
                disabled={!state.show_commission}
                className={pctInputClass(state.show_commission)}
                value={state.default_commission_rate}
                onChange={(e) => {
                  const n = Number(e.target.value);
                  setState((s) => ({
                    ...s,
                    default_commission_rate: Number.isFinite(n) ? Math.min(100, Math.max(0, n)) : s.default_commission_rate,
                  }));
                }}
              />
              <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">%</span>
            </div>
          </div>
        </div>

        <div className={rowClass(state.qty_allow_decimal)}>
          <label className="flex cursor-pointer items-start gap-3 min-w-0 flex-1">
            <input
              type="checkbox"
              checked={state.qty_allow_decimal}
              onChange={(e) => setState((s) => ({ ...s, qty_allow_decimal: e.target.checked }))}
              className="mt-0.5 h-4 w-4 shrink-0 rounded border-slate-300 accent-blue-600"
            />
            <span className="min-w-0">
              <span className="text-sm font-bold text-slate-900">SL — Số lượng</span>
              <span className="block text-xs text-slate-500 mt-0.5 leading-snug">Cho phép nhập số lượng lẻ (thập phân), không chỉ số nguyên.</span>
            </span>
          </label>
          <div className="hidden sm:flex shrink-0 w-[7.5rem] items-center justify-end text-xs font-semibold text-slate-400 tabular-nums">
            —
          </div>
        </div>
      </div>
    </div>
  );
}

type PermissionRow = { key: string; name: string; depth: number };
type PermissionGroup = { groupKey: string; groupName: string; rows: PermissionRow[] };

/** Giữ cùng quy tắc thụt dòng như flatten toàn cây, nhưng tách theo từng nhánh gốc (module). */
function flattenGroupNodes(nodes: FeatureNode[], depth = 0): PermissionRow[] {
  const out: PermissionRow[] = [];
  for (const n of nodes) {
    if (n.key && n.key.includes(".")) out.push({ key: n.key, name: n.name, depth });
    if (Array.isArray(n.children) && n.children.length) {
      out.push(...flattenGroupNodes(n.children, depth + (n.key.includes(".") ? 0 : 1)));
    }
  }
  return out;
}

function permissionGroupsFromTree(tree: FeatureNode[]): PermissionGroup[] {
  const groups: PermissionGroup[] = [];
  for (const root of tree) {
    const rows: PermissionRow[] = [];
    if (root.key?.includes(".")) rows.push({ key: root.key, name: root.name, depth: 0 });
    if (Array.isArray(root.children) && root.children.length) {
      rows.push(...flattenGroupNodes(root.children, 0));
    }
    if (rows.length) {
      groups.push({
        groupKey: root.key || `grp-${groups.length}`,
        groupName: root.name,
        rows,
      });
    }
  }
  return groups;
}

type SettingsTab = "permissions" | "scopes" | "order-line";

export function Settings() {
  const [tab, setTab] = React.useState<SettingsTab>("permissions");
  const location = useLocation();
  const navigate = useNavigate();
  const [roles, setRoles] = React.useState<RoleRow[]>([]);
  const [featureTree, setFeatureTree] = React.useState<FeatureNode[]>([]);

  const [matrix, setMatrix] = React.useState<Record<number, Record<string, boolean>>>({});
  const [scopes, setScopes] = React.useState<Record<number, Record<string, "own" | "group" | "shop">>>({});
  const [scopeTargets, setScopeTargets] = React.useState<ScopeTarget[]>([]);
  const [scopeLevels, setScopeLevels] = React.useState<ScopeLevel[]>(DEFAULT_SCOPE_LEVELS);

  const [deliveryLine, setDeliveryLine] = React.useState<OrderLineBlockForm>(() => defaultOrderLineBlock());
  const [counterLine, setCounterLine] = React.useState<OrderLineBlockForm>(() => defaultOrderLineBlock());
  const [orderLineLoading, setOrderLineLoading] = React.useState(true);

  const [saving, setSaving] = React.useState(false);
  const [success, setSuccess] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [matrixLoading, setMatrixLoading] = React.useState(true);

  const loadAll = React.useCallback(async () => {
    setMatrixLoading(true);
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
      setFeatureTree(ft);
      setMatrix(fmJson?.data?.matrix || {});

      setScopes(smJson?.data?.matrix || {});
      setScopeTargets(Array.isArray(smJson?.data?.scope_targets) ? smJson.data.scope_targets : []);
      setScopeLevels(Array.isArray(smJson?.data?.scope_levels) ? smJson.data.scope_levels : DEFAULT_SCOPE_LEVELS);
    } catch (e: any) {
      setError(e?.message || "Không thể tải dữ liệu phân quyền");
    } finally {
      setMatrixLoading(false);
    }
  }, []);

  const loadOrderLine = React.useCallback(async () => {
    setOrderLineLoading(true);
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API_URL}/auth/me`, { headers: { Authorization: `Bearer ${token}` } });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.message || json?.error || "Không tải được cấu hình dòng đơn");
      const d = json?.data ?? json;
      const sol = d?.shop_order_line;
      const del = pickShopOrderLineBlock(sol, "delivery");
      const cnt = pickShopOrderLineBlock(sol, "counter");
      setDeliveryLine(blockFromApi(del));
      setCounterLine(blockFromApi(cnt));
    } catch (e: any) {
      setError(e?.message || "Không tải được cấu hình dòng đơn");
    } finally {
      setOrderLineLoading(false);
    }
  }, []);

  React.useEffect(() => {
    loadAll();
  }, [loadAll]);

  React.useEffect(() => {
    loadOrderLine();
  }, [loadOrderLine]);

  React.useEffect(() => {
    const params = new URLSearchParams(location.search || "");
    const q = (params.get("tab") || "").toLowerCase();
    if (q === "permissions" || q === "scopes" || q === "order-line") {
      setTab(q as SettingsTab);
    }
  }, [location.search]);

  const setTabAndSyncUrl = React.useCallback(
    (next: SettingsTab) => {
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

  const saveOrderLine = async () => {
    setSaving(true);
    setError(null);
    setSuccess(false);
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API_URL}/shops/me/order-line`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          order_line_show_discount: deliveryLine.show_discount,
          order_line_show_commission: deliveryLine.show_commission,
          order_qty_allow_decimal: deliveryLine.qty_allow_decimal,
          order_default_commission_rate: deliveryLine.default_commission_rate,
          order_default_discount_rate: deliveryLine.default_discount_rate,
          counter_order_line_show_discount: counterLine.show_discount,
          counter_order_line_show_commission: counterLine.show_commission,
          counter_order_qty_allow_decimal: counterLine.qty_allow_decimal,
          counter_order_default_commission_rate: counterLine.default_commission_rate,
          counter_order_default_discount_rate: counterLine.default_discount_rate,
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error || json?.message || "Lưu cấu hình dòng đơn thất bại");
      setSuccess(true);
      setTimeout(() => setSuccess(false), 2500);
      await loadOrderLine();
    } catch (e: any) {
      setError(e?.message || "Lưu cấu hình dòng đơn thất bại");
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

  const permissionGroups = React.useMemo(() => permissionGroupsFromTree(featureTree), [featureTree]);

  const tabSave =
    tab === "permissions" ? savePermissions : tab === "scopes" ? saveScopes : saveOrderLine;
  const tabSaveDisabled =
    saving ||
    (tab === "permissions" || tab === "scopes" ? matrixLoading : orderLineLoading);

  return (
    <div className="min-h-screen bg-slate-50 -m-8 p-8">
      <div className="flex items-center justify-between mb-6 gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            {tab === "order-line" ? "Cài đặt" : "Phân quyền"}
          </h1>
          <p className="text-sm text-slate-500 font-medium mt-1">
            {tab === "order-line"
              ? "Hiển thị cột số lượng / chiết khấu / hoa hồng và % mặc định cho form đơn giao và bán tại quầy (theo shop hiện tại)."
              : "Lưu ý: hệ thống sẽ lưu phân quyền ngay theo dữ liệu bạn chọn bên dưới."}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {tab === "permissions" && (
            <button
              onClick={seedDefaultsForAll}
              disabled={saving || matrixLoading}
              className="px-4 py-2 rounded-xl text-sm font-bold bg-white border border-slate-200 hover:bg-slate-50 disabled:opacity-50"
            >
              Khởi tạo phân quyền mặc định
            </button>
          )}
          <button
            onClick={tabSave}
            disabled={tabSaveDisabled}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold bg-slate-900 text-white hover:bg-slate-800 disabled:opacity-50"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {saving ? "Đang lưu..." : "Lưu"}
          </button>
        </div>
      </div>

      <div className="flex items-center gap-6 mb-4 border-b border-slate-200 flex-wrap">
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
        <button
          onClick={() => setTabAndSyncUrl("order-line")}
          className={cn(
            "text-sm font-bold pb-2 border-b-2 -mb-px",
            tab === "order-line" ? "text-blue-600 border-blue-600" : "text-slate-400 border-transparent"
          )}
        >
          Form đơn &amp; quầy
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

      {tab === "permissions" && matrixLoading ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-10 text-slate-500 font-medium">
          Đang tải...
        </div>
      ) : tab === "permissions" ? (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
          <div className="overflow-auto max-h-[min(70vh,calc(100vh-12rem))]">
            <table className="min-w-[720px] w-full text-xs">
              <thead className="sticky top-0 z-20 bg-slate-100 shadow-[0_1px_0_0_rgb(226,232,240)]">
                <tr>
                  <th className="text-left px-3 py-2 font-black text-slate-700 w-[min(40vw,280px)] border-b border-slate-200">
                    Chức năng
                  </th>
                  {roles.map((r) => (
                    <th
                      key={r.id}
                      className="px-2 py-2 font-black text-slate-700 border-b border-slate-200 text-center align-bottom"
                    >
                      <div className="min-w-[92px] mx-auto">
                        <p className="text-[11px] font-bold text-slate-800 leading-tight line-clamp-2">{r.name}</p>
                        <p className="text-[9px] text-slate-400 font-extrabold uppercase mt-0.5 tracking-wide">
                          {String(r.code)}
                        </p>
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              {permissionGroups.map((g) => (
                <tbody key={g.groupKey}>
                  <tr className="bg-slate-100/95">
                    <td colSpan={1 + roles.length} className="px-3 py-1.5 border-b border-slate-200/90">
                      <span className="text-[11px] font-black uppercase tracking-wider text-slate-600">
                        {g.groupName}
                      </span>
                    </td>
                  </tr>
                  {g.rows.map((f) => (
                    <tr key={f.key} className="hover:bg-slate-50/80 border-b border-slate-100 last:border-0">
                      <td className="px-3 py-1.5 align-middle">
                        <div
                          className="flex flex-wrap items-baseline gap-x-2 gap-y-0"
                          style={{ paddingLeft: Math.min(24, f.depth * 12) }}
                        >
                          <span
                            className={cn(
                              "font-semibold text-slate-800 leading-snug",
                              f.depth ? "text-slate-700" : "text-slate-900"
                            )}
                          >
                            {f.name}
                          </span>
                          <code className="text-[10px] text-slate-400 font-mono font-medium">{f.key}</code>
                        </div>
                      </td>
                      {roles.map((r) => {
                        const checked = !!matrix?.[r.id]?.[f.key];
                        return (
                          <td key={r.id} className="px-2 py-1.5 text-center align-middle">
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() => toggle(r.id, f.key)}
                              className="h-3.5 w-3.5 rounded border-slate-300 accent-blue-600"
                            />
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              ))}
            </table>
          </div>
        </div>
      ) : tab === "scopes" && matrixLoading ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-10 text-slate-500 font-medium">
          Đang tải...
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
      ) : tab === "order-line" ? (
        orderLineLoading ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-10 text-slate-500 font-medium flex items-center gap-3">
            <Loader2 className="w-5 h-5 animate-spin text-slate-400" />
            Đang tải cấu hình dòng đơn...
          </div>
        ) : (
          <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
            <div className="px-6 py-5 border-b border-slate-100 bg-slate-50/80">
              <h2 className="text-base font-black text-slate-900 tracking-tight">Cột &amp; giá trị mặc định trên form</h2>
              <p className="text-sm text-slate-500 font-medium mt-1 max-w-3xl leading-relaxed">
                Tách riêng <span className="text-slate-700 font-bold">đơn giao</span> và{" "}
                <span className="text-slate-700 font-bold">bán quầy</span>. Thay đổi có hiệu lực sau khi bấm Lưu (và khi mở lại màn tạo/sửa đơn).
              </p>
            </div>
            <div className="p-6">
              <div className="flex gap-3 rounded-xl border border-sky-100 bg-sky-50/60 px-4 py-3 text-sm text-sky-950/90">
                <Info className="w-5 h-5 shrink-0 text-sky-600 opacity-90 mt-0.5" />
                <p className="leading-relaxed">
                  Chỉ <strong className="font-bold">quản trị shop</strong> mới lưu được cấu hình này. Super admin không chỉnh qua API này.
                </p>
              </div>
              <div className="mt-6 grid gap-6 lg:grid-cols-2 lg:gap-8">
                <OrderLinePanel
                  icon={<Package className="w-4 h-4" strokeWidth={2.25} />}
                  heading="Đơn giao"
                  subheading="Form tạo / sửa đơn không tại quầy"
                  state={deliveryLine}
                  setState={setDeliveryLine}
                />
                <OrderLinePanel
                  icon={<Store className="w-4 h-4" strokeWidth={2.25} />}
                  heading="Bán tại quầy"
                  subheading="Màn bán quầy & đơn counter"
                  state={counterLine}
                  setState={setCounterLine}
                />
              </div>
            </div>
          </div>
        )
      ) : null}
    </div>
  );
}
