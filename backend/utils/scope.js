const { getPool } = require('../config/db');

/**
 * Data scope levels:
 * - own: only user-owned data
 * - group: within user's selling group (orders.group_id or users.group_id mapping via orders)
 * - shop: whole shop
 *
 * Source of truth: role_scopes(shop_id, role_id, target) => scope
 * Compatibility fallback:
 * - role_module_scopes (own/shop)
 * - roles.scope_own_data (legacy boolean)
 */
async function getScope(req, target) {
  if (req?.user?.is_super_admin || req?.user?.can_access_admin) return 'shop';

  const shopId = req?.shopId ?? req?.user?.shop_id;
  const roleId = req?.user?.role_id;
  if (!shopId || !roleId) {
    return req?.user?.scope_own_data ? 'own' : 'shop';
  }

  const pool = await getPool();

  // Prefer new table role_scopes
  try {
    const [[row]] = await pool.query(
      'SELECT scope FROM role_scopes WHERE shop_id = ? AND role_id = ? AND target = ? LIMIT 1',
      [shopId, roleId, String(target)]
    );
    const s = String(row?.scope || '');
    if (s === 'shop' || s === 'group' || s === 'own') return s;
  } catch (e) {
    if (!e || e.code !== 'ER_NO_SUCH_TABLE') throw e;
  }

  // Fallback to role_module_scopes (own/shop)
  try {
    const [[row2]] = await pool.query(
      'SELECT scope FROM role_module_scopes WHERE shop_id = ? AND role_id = ? AND module = ? LIMIT 1',
      [shopId, roleId, String(target)]
    );
    const s2 = String(row2?.scope || '');
    if (s2 === 'shop') return 'shop';
    if (s2 === 'own') return 'own';
  } catch (e) {
    if (!e || e.code !== 'ER_NO_SUCH_TABLE') throw e;
  }

  return req?.user?.scope_own_data ? 'own' : 'shop';
}

async function isOwnScope(req, target) {
  const s = await getScope(req, target);
  return s === 'own';
}

async function isGroupScope(req, target) {
  const s = await getScope(req, target);
  return s === 'group';
}

module.exports = { getScope, isOwnScope, isGroupScope };

