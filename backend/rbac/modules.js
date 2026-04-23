// Single source of truth for RBAC modules/actions.
// - Used by backend (caps + defaults)
// - Exposed to frontend for Settings UI (avoid hardcoded module list)

/**
 * Modules visible in Settings UI.
 * id must match `role_permissions.module`.
 */
const RBAC_MODULES = [
  { id: 'dashboard', name: 'Tổng quan' },
  { id: 'employees', name: 'Nhân viên' },
  { id: 'products', name: 'Sản phẩm' },
  { id: 'customers', name: 'Khách hàng' },
  { id: 'orders', name: 'Đơn hàng' },
  { id: 'inventory', name: 'Kho bãi' },
  { id: 'reports', name: 'Báo cáo' },
  { id: 'settings', name: 'Cài đặt' },
];

/**
 * Actions visible in Settings UI.
 * id must match `role_permissions.action`.
 */
const RBAC_ACTIONS = [
  { id: 'view', name: 'Xem' },
  { id: 'create', name: 'Thêm' },
  { id: 'edit', name: 'Sửa' },
  { id: 'delete', name: 'Xóa' },
];

/**
 * Scope-capable modules (own vs shop).
 * Scope table: role_module_scopes(module, scope).
 */
const SCOPE_MODULES = ['orders', 'customers', 'reports'];

/**
 * For caps computation (FE routing/menus).
 * Keep in sync with RBAC_MODULES/RBAC_ACTIONS.
 */
const MODULE_ACTIONS = RBAC_MODULES.map((m) => [m.id, RBAC_ACTIONS.map((a) => a.id)]);

module.exports = {
  RBAC_MODULES,
  RBAC_ACTIONS,
  SCOPE_MODULES,
  MODULE_ACTIONS,
};

