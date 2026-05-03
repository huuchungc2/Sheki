const { RBAC_MODULES, RBAC_ACTIONS } = require('../rbac/modules');

/**
 * Từ map feature_key → boolean (đúng ma trận Settings), suy ra role_permissions module×action
 * để `requirePermission` khớp với các ô đã bật trên UI.
 */
function deriveModulePermissionsFromFeatures(featureMap) {
  const mods = {};
  for (const m of RBAC_MODULES) {
    mods[m.id] = {};
    for (const a of RBAC_ACTIONS) mods[m.id][a.id] = false;
  }
  const set = (module, action, v) => {
    if (mods[module] && Object.prototype.hasOwnProperty.call(mods[module], action)) {
      mods[module][action] = !!v;
    }
  };

  const f = (k) => !!featureMap[k];

  if (f('dashboard.view')) set('dashboard', 'view', true);

  if (
    f('products.list') ||
    f('products.create') ||
    f('products.edit') ||
    f('products.delete') ||
    f('products.import')
  ) {
    set('products', 'view', true);
  }
  if (f('products.create') || f('products.import')) set('products', 'create', true);
  if (f('products.edit') || f('products.import')) set('products', 'edit', true);
  if (f('products.delete')) set('products', 'delete', true);

  if (
    f('customers.list') ||
    f('customers.view') ||
    f('customers.create') ||
    f('customers.edit') ||
    f('customers.delete') ||
    f('customers.import')
  ) {
    set('customers', 'view', true);
  }
  if (f('customers.create') || f('customers.import')) set('customers', 'create', true);
  if (f('customers.edit')) set('customers', 'edit', true);
  if (f('customers.delete')) set('customers', 'delete', true);

  if (
    f('orders.list') ||
    f('orders.view') ||
    f('orders.create') ||
    f('orders.edit') ||
    f('orders.delete') ||
    f('orders.export_items')
  ) {
    set('orders', 'view', true);
  }
  if (f('orders.create')) set('orders', 'create', true);
  if (f('orders.edit') || f('orders.export_items')) set('orders', 'edit', true);
  if (f('orders.delete')) set('orders', 'delete', true);

  if (f('inventory.view')) set('inventory', 'view', true);
  if (f('inventory.import') || f('inventory.export')) set('inventory', 'edit', true);

  const anyReportView =
    f('reports.revenue') ||
    f('reports.commissions') ||
    f('reports.commissions_ctv') ||
    f('reports.dashboard') ||
    f('reports.salary') ||
    f('cash_transactions.view') ||
    f('cash_transactions.edit');
  if (anyReportView) set('reports', 'view', true);
  if (f('cash_transactions.edit')) set('reports', 'edit', true);

  if (f('employees.list') || f('employees.create') || f('employees.edit') || f('employees.disable')) {
    set('employees', 'view', true);
  }
  if (f('employees.create')) set('employees', 'create', true);
  if (f('employees.edit')) set('employees', 'edit', true);
  if (f('employees.disable')) {
    set('employees', 'edit', true);
    set('employees', 'delete', true);
  }

  if (f('settings.view') || f('settings.edit') || f('roles.manage')) set('settings', 'view', true);
  if (f('settings.edit') || f('roles.manage')) set('settings', 'edit', true);

  return mods;
}

/**
 * Ghi đè role_permissions (role_id) theo matrix đã suy ra.
 */
async function replaceRolePermissionsFromModules(pool, shopId, roleId, mods) {
  let legacyMode = false;
  try {
    await pool.query('DELETE FROM role_permissions WHERE shop_id = ? AND role_id = ?', [shopId, roleId]);
  } catch (err) {
    if (!err || err.code !== 'ER_BAD_FIELD_ERROR') throw err;
    legacyMode = true;
    const [[r0]] = await pool.query('SELECT code FROM roles WHERE id = ? LIMIT 1', [roleId]);
    const roleCode = String(r0?.code || '').toLowerCase();
    if (!roleCode) return;
    await pool.query('DELETE FROM role_permissions WHERE shop_id = ? AND role = ?', [shopId, roleCode]);
  }

  const [[roleRow]] = await pool.query('SELECT code FROM roles WHERE id = ? LIMIT 1', [roleId]);
  const codeLower = String(roleRow?.code || '').toLowerCase();

  const rows = [];
  for (const m of RBAC_MODULES) {
    for (const a of RBAC_ACTIONS) {
      const allowed = !!(mods[m.id] && mods[m.id][a.id]);
      if (!legacyMode) {
        rows.push([shopId, roleId, m.id, a.id, allowed ? 1 : 0]);
      } else {
        rows.push([shopId, codeLower, m.id, a.id, allowed ? 1 : 0]);
      }
    }
  }

  if (!rows.length) return;

  if (!legacyMode) {
    await pool.query(
      'INSERT INTO role_permissions (shop_id, role_id, module, action, allowed) VALUES ?',
      [rows]
    );
  } else {
    await pool.query(
      'INSERT INTO role_permissions (shop_id, role, module, action, allowed) VALUES ?',
      [rows]
    );
  }
}

/**
 * @param {object} featureMap — đủ key FEATURE_KEYS (boolean)
 */
async function syncModulePermissionsFromFeatures(pool, shopId, roleId, featureMap) {
  const mods = deriveModulePermissionsFromFeatures(featureMap || {});
  await replaceRolePermissionsFromModules(pool, shopId, roleId, mods);
}

module.exports = {
  deriveModulePermissionsFromFeatures,
  syncModulePermissionsFromFeatures,
};
