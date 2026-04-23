// Single source of truth for detailed (Nhanh.vn-style) RBAC feature keys.
// - Backend: requireFeature(featureKey) + caps2 computation
// - Frontend: Settings matrix UI + navigation gating

/**
 * Feature node shape:
 * - key: stable identifier used in DB (`role_feature_permissions.feature_key`)
 * - name: display name for Settings UI
 * - children: nested feature nodes
 */

const FEATURE_TREE = [
  {
    key: 'dashboard',
    name: 'Tổng quan',
    children: [{ key: 'dashboard.view', name: 'Xem tổng quan' }],
  },
  {
    key: 'products',
    name: 'Sản phẩm',
    children: [
      { key: 'products.list', name: 'Danh sách sản phẩm' },
      { key: 'products.create', name: 'Thêm sản phẩm' },
      { key: 'products.edit', name: 'Sửa sản phẩm' },
      { key: 'products.delete', name: 'Xóa sản phẩm' },
      { key: 'products.import', name: 'Import sản phẩm (Excel)' },
    ],
  },
  {
    key: 'customers',
    name: 'Khách hàng',
    children: [
      { key: 'customers.list', name: 'Danh sách khách hàng' },
      { key: 'customers.view', name: 'Xem chi tiết khách hàng' },
      { key: 'customers.create', name: 'Thêm khách hàng' },
      { key: 'customers.edit', name: 'Sửa khách hàng' },
      { key: 'customers.delete', name: 'Xóa khách hàng' },
      { key: 'customers.import', name: 'Import khách hàng (Excel)' },
    ],
  },
  {
    key: 'orders',
    name: 'Đơn hàng',
    children: [
      { key: 'orders.list', name: 'Danh sách đơn hàng' },
      { key: 'orders.view', name: 'Xem chi tiết đơn' },
      { key: 'orders.create', name: 'Tạo đơn' },
      { key: 'orders.edit', name: 'Sửa đơn' },
      { key: 'orders.delete', name: 'Xóa đơn' },
      { key: 'orders.export_items', name: 'Xuất Excel (chi tiết sản phẩm)' },
    ],
  },
  {
    key: 'inventory',
    name: 'Kho',
    children: [
      { key: 'inventory.view', name: 'Xem nhập xuất & tồn' },
      { key: 'inventory.import', name: 'Nhập kho' },
      { key: 'inventory.export', name: 'Xuất kho' },
    ],
  },
  {
    key: 'reports',
    name: 'Báo cáo',
    children: [
      { key: 'reports.revenue', name: 'Doanh thu' },
      { key: 'reports.commissions', name: 'Hoa hồng' },
      { key: 'reports.commissions_ctv', name: 'Hoa hồng CTV' },
      { key: 'reports.salary', name: 'Lương / tổng hợp nhân viên' },
      { key: 'reports.dashboard', name: 'Dashboard KPI' },
      { key: 'cash_transactions.view', name: 'Thu chi (xem)' },
      { key: 'cash_transactions.edit', name: 'Thu chi (thêm/sửa/xóa)' },
    ],
  },
  {
    key: 'employees',
    name: 'Nhân sự',
    children: [
      { key: 'employees.list', name: 'Danh sách nhân viên' },
      { key: 'employees.create', name: 'Tạo nhân viên' },
      { key: 'employees.edit', name: 'Sửa nhân viên / đổi vai trò' },
      { key: 'employees.disable', name: 'Vô hiệu hóa nhân viên' },
    ],
  },
  {
    key: 'settings',
    name: 'Cài đặt',
    children: [
      { key: 'settings.view', name: 'Xem phân quyền' },
      { key: 'settings.edit', name: 'Sửa phân quyền' },
      { key: 'roles.manage', name: 'Quản lý vai trò' },
    ],
  },
];

function flattenFeatureKeys(tree) {
  const out = [];
  const walk = (nodes) => {
    for (const n of nodes) {
      if (n.key) out.push(String(n.key));
      if (Array.isArray(n.children) && n.children.length) walk(n.children);
    }
  };
  walk(tree);
  // Keep only leaf-ish keys (exclude grouping keys without dot) if desired by caller.
  return [...new Set(out)];
}

// A flattened list of all keys (includes category/group nodes like `orders` too).
const FEATURE_KEYS_ALL = flattenFeatureKeys(FEATURE_TREE);

// Leaf keys are what we store/compute as actual permissions (checkboxes).
const FEATURE_KEYS = FEATURE_KEYS_ALL.filter((k) => k.includes('.'));

// Data-scope targets that support scope selection (own/group/shop)
const SCOPE_TARGETS = [
  { id: 'orders', name: 'Đơn hàng' },
  { id: 'customers', name: 'Khách hàng' },
  { id: 'reports', name: 'Báo cáo' },
];

const SCOPE_LEVELS = [
  { id: 'own', name: 'Cá nhân' },
  { id: 'group', name: 'Nhóm' },
  { id: 'shop', name: 'Toàn shop' },
];

module.exports = {
  FEATURE_TREE,
  FEATURE_KEYS,
  FEATURE_KEYS_ALL,
  SCOPE_TARGETS,
  SCOPE_LEVELS,
};

