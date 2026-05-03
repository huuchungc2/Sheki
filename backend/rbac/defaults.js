const { FEATURE_KEYS } = require('./features');
const { RBAC_MODULES, RBAC_ACTIONS } = require('./modules');
const { deriveModulePermissionsFromFeatures } = require('../services/rolePermissionSync');

/**
 * Mặc định feature (Sales / vai trò vận hành) — giữ đồng bộ với `middleware/requireFeature` (trước khi tách file).
 */
function salesLikeFeatureDefaults() {
  const out = {};
  for (const k of FEATURE_KEYS) out[k] = false;
  const allow = new Set([
    'dashboard.view',
    'orders.list',
    'orders.view',
    'orders.create',
    'orders.edit',
    'orders.export_items',
    'customers.list',
    'customers.view',
    'customers.create',
    'customers.edit',
    'reports.revenue',
    'reports.commissions',
    'reports.commissions_ctv',
    'reports.dashboard',
    'reports.salary',
    'products.list',
  ]);
  for (const k of allow) {
    if (Object.prototype.hasOwnProperty.call(out, k)) out[k] = true;
  }
  return out;
}

/**
 * @param {string|{ code: string, can_access_admin?: number|boolean }} roleInput
 */
function defaultFeaturePermissions(roleInput) {
  const row =
    typeof roleInput === 'object' && roleInput && roleInput.code !== undefined
      ? roleInput
      : { code: roleInput, can_access_admin: 0 };
  const ca = row.can_access_admin;
  const adminish =
    ca === true || ca === 1 || ca === '1' || String(ca).toLowerCase() === 'true';
  if (adminish) {
    const out = {};
    for (const k of FEATURE_KEYS) out[k] = true;
    return out;
  }
  const code = String(row.code || '').trim().toLowerCase();
  if (code === 'admin') {
    const out = {};
    for (const k of FEATURE_KEYS) out[k] = true;
    return out;
  }
  return salesLikeFeatureDefaults();
}

/**
 * Mảng { module, action, allowed } cho API /settings/:id/permissions khi chưa có bản ghi.
 * Ưu tiên `can_access_admin` thay vì chỉ mã `admin`.
 */
function getDefaultModulePermissionRows(roleInput) {
  const row =
    typeof roleInput === 'object' && roleInput && roleInput.code !== undefined
      ? roleInput
      : { code: roleInput, can_access_admin: 0 };
  const ca = row.can_access_admin;
  const adminish =
    ca === true || ca === 1 || ca === '1' || String(ca).toLowerCase() === 'true';
  if (adminish) {
    const permissions = [];
    for (const m of RBAC_MODULES) {
      for (const a of RBAC_ACTIONS) {
        permissions.push({ module: m.id, action: a.id, allowed: true });
      }
    }
    return permissions;
  }
  const code = String(row.code || '').trim().toLowerCase();
  if (code === 'admin') {
    const permissions = [];
    for (const m of RBAC_MODULES) {
      for (const a of RBAC_ACTIONS) {
        permissions.push({ module: m.id, action: a.id, allowed: true });
      }
    }
    return permissions;
  }

  const featureMap = salesLikeFeatureDefaults();
  const mods = deriveModulePermissionsFromFeatures(featureMap);
  const permissions = [];
  for (const m of RBAC_MODULES) {
    for (const a of RBAC_ACTIONS) {
      const allowed = !!(mods[m.id] && mods[m.id][a.id]);
      permissions.push({ module: m.id, action: a.id, allowed });
    }
  }
  return permissions;
}

module.exports = {
  salesLikeFeatureDefaults,
  defaultFeaturePermissions,
  getDefaultModulePermissionRows,
};
