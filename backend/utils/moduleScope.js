const { getPool } = require('../config/db');

/**
 * Data scope per module: 'own' | 'shop'
 * Source of truth: role_module_scopes (per shop_id + role_id + module)
 * Fallback: role.scope_own_data (legacy)
 */
async function getModuleScope(req, moduleName) {
  // Super admin / admin-class: shop scope
  if (req?.user?.is_super_admin || req?.user?.can_access_admin) return 'shop';
  const shopId = req?.shopId ?? req?.user?.shop_id;
  const roleId = req?.user?.role_id;
  if (!shopId || !roleId) {
    return req?.user?.scope_own_data ? 'own' : 'shop';
  }

  const pool = await getPool();
  try {
    const [[row]] = await pool.query(
      'SELECT scope FROM role_module_scopes WHERE shop_id = ? AND role_id = ? AND module = ? LIMIT 1',
      [shopId, roleId, String(moduleName)]
    );
    if (row?.scope === 'shop') return 'shop';
    if (row?.scope === 'own') return 'own';
  } catch (e) {
    // Table not migrated yet
    if (!e || e.code !== 'ER_NO_SUCH_TABLE') throw e;
  }

  // Default fallback
  return req?.user?.scope_own_data ? 'own' : 'shop';
}

async function isOwnScope(req, moduleName) {
  const s = await getModuleScope(req, moduleName);
  return s === 'own';
}

module.exports = { getModuleScope, isOwnScope };

