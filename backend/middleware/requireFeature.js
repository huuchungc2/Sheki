const { getPool } = require('../config/db');
const { FEATURE_KEYS } = require('../rbac/features');

function emptyCaps2() {
  const out = {};
  for (const k of FEATURE_KEYS) out[k] = false;
  return out;
}

function salesLikeDefaultCaps2() {
  const out = emptyCaps2();
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

function defaultCaps2ForRole(roleCodeRaw) {
  const roleCode = String(roleCodeRaw || '').trim().toLowerCase();
  if (roleCode === 'admin') {
    const out = {};
    for (const k of FEATURE_KEYS) out[k] = true;
    return out;
  }
  return salesLikeDefaultCaps2();
}

/**
 * Require feature permission based on role_feature_permissions (per-shop).
 *
 * Rules:
 * - req.user.is_super_admin => always allowed
 * - Otherwise requires shop_id + role_id
 * - If permission table isn't migrated yet => fallback allow for admin-class only, otherwise deny.
 * - If role has no seeded feature rows yet => allow admin-class to avoid lockout, otherwise deny.
 */
function requireFeature(featureKey) {
  return async (req, res, next) => {
    try {
      if (!req.user) return res.status(401).json({ error: 'Chưa xác thực' });
      if (req.user.is_super_admin) return next();

      const shopId = req.shopId ?? req.user.shop_id;
      const roleId = req.user.role_id;
      if (!shopId) return res.status(403).json({ error: 'Thiếu shop' });
      if (!roleId) return res.status(403).json({ error: 'Thiếu vai trò' });

      const pool = await getPool();
      const defaultCaps = defaultCaps2ForRole(req.user.role);

      // Ensure table exists
      try {
        await pool.query('SELECT 1 FROM role_feature_permissions LIMIT 1');
      } catch (e) {
        if (e && e.code === 'ER_NO_SUCH_TABLE') {
          if (req.user.can_access_admin) return next();
          return res.status(403).json({ error: 'Chưa bật phân quyền chi tiết (DB chưa migrate)' });
        }
        throw e;
      }

      const [[countRow]] = await pool.query(
        'SELECT COUNT(*) AS c FROM role_feature_permissions WHERE shop_id = ? AND role_id = ?',
        [shopId, roleId]
      );
      const hasAny = Number(countRow?.c || 0) > 0;
      if (!hasAny) {
        // Fallback defaults to avoid lockout before first seed.
        // Admin-class: always allowed. Non-admin: allow if default template permits.
        if (req.user.can_access_admin) return next();
        if (defaultCaps[String(featureKey)] === true) return next();
        return res.status(403).json({ error: 'Không có quyền truy cập' });
      }

      const [[row]] = await pool.query(
        `SELECT allowed
         FROM role_feature_permissions
         WHERE shop_id = ? AND role_id = ? AND feature_key = ?
         LIMIT 1`,
        [shopId, roleId, String(featureKey)]
      );
      // When role has any seeded rows: missing key should be treated as DENY (strict),
      // otherwise toggling in Settings can be bypassed by "default template" fallback.
      const allowed =
        row?.allowed != null
          ? !!row.allowed
          : (req.user.can_access_admin ? true : false);
      if (!allowed) return res.status(403).json({ error: 'Không có quyền truy cập' });
      return next();
    } catch (err) {
      return next(err);
    }
  };
}

/**
 * Compute caps2 map for a user (feature_key -> boolean).
 * Used by /auth/me for frontend routing/menu.
 */
async function computeFeatureCaps(pool, reqUser) {
  if (!reqUser) return emptyCaps2();
  if (reqUser.is_super_admin) {
    const out = {};
    for (const k of FEATURE_KEYS) out[k] = true;
    return out;
  }

  const shopId = reqUser.shop_id ?? null;
  const roleId = reqUser.role_id ?? null;
  if (!shopId || !roleId) return emptyCaps2();

  // Start from defaults so missing keys don't become false by accident.
  const base =
    reqUser.can_access_admin
      ? (() => {
          const out = {};
          for (const k of FEATURE_KEYS) out[k] = true;
          return out;
        })()
      : defaultCaps2ForRole(reqUser.role);

  // Table missing => admin-class all true; others false
  try {
    await pool.query('SELECT 1 FROM role_feature_permissions LIMIT 1');
  } catch (e) {
    if (e && e.code === 'ER_NO_SUCH_TABLE') {
      if (reqUser.can_access_admin) {
        const out = {};
        for (const k of FEATURE_KEYS) out[k] = true;
        return out;
      }
      // No table yet: return defaults so UI/menu still usable
      return defaultCaps2ForRole(reqUser.role);
    }
    throw e;
  }

  const [[countRow]] = await pool.query(
    'SELECT COUNT(*) AS c FROM role_feature_permissions WHERE shop_id = ? AND role_id = ?',
    [shopId, roleId]
  );
  const hasAny = Number(countRow?.c || 0) > 0;
  if (!hasAny) {
    if (reqUser.can_access_admin) {
      const out = {};
      for (const k of FEATURE_KEYS) out[k] = true;
      return out;
    }
    // No rows seeded yet: default template (sales-like) to avoid blank UI.
    return defaultCaps2ForRole(reqUser.role);
  }

  const [rows] = await pool.query(
    'SELECT feature_key, allowed FROM role_feature_permissions WHERE shop_id = ? AND role_id = ?',
    [shopId, roleId]
  );
  // Strict mode when table is active + role has rows: only allow explicitly configured keys.
  const out = reqUser.can_access_admin ? { ...base } : emptyCaps2();
  for (const r of rows) {
    const k = String(r.feature_key || '');
    if (k && Object.prototype.hasOwnProperty.call(out, k)) out[k] = !!r.allowed;
  }
  return out;
}

module.exports = { requireFeature, computeFeatureCaps };

