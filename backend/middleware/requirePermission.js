const { getPool } = require('../config/db');

/**
 * Require permission for a module+action based on role_permissions (per-shop).
 *
 * Source of truth:
 * - req.user.is_super_admin => always allowed
 * - Otherwise require req.shopId + req.user.role_id
 *
 * Backward compatibility:
 * - If DB chưa migrate `role_permissions.role_id`, fallback sang schema cũ dùng `role` (code).
 * - Nếu không có permission rows cho role hiện tại, allow admin roles (can_access_admin)
 *   để tránh lockout khi DB seed chưa đủ.
 */
function requirePermission(moduleName, action) {
  return async (req, res, next) => {
    try {
      if (!req.user) return res.status(401).json({ error: 'Chưa xác thực' });
      if (req.user.is_super_admin) return next();

      const shopId = req.shopId ?? req.user.shop_id;
      const roleId = req.user.role_id;
      const roleCode = String(req.user.role || '').trim().toLowerCase();

      if (!shopId) return res.status(403).json({ error: 'Thiếu shop' });

      const pool = await getPool();

      let hasAny = false;
      let legacyMode = false;
      try {
        if (!roleId) return res.status(403).json({ error: 'Thiếu vai trò' });
        const [[countRow]] = await pool.query(
          'SELECT COUNT(*) AS c FROM role_permissions WHERE shop_id = ? AND role_id = ?',
          [shopId, roleId]
        );
        hasAny = Number(countRow?.c || 0) > 0;
      } catch (err) {
        // Legacy DB: role_permissions chưa có role_id
        const code = (err && err.code) || '';
        if (code !== 'ER_BAD_FIELD_ERROR') throw err;
        legacyMode = true;
        if (!roleCode) return res.status(403).json({ error: 'Thiếu vai trò' });
        const [[countRow]] = await pool.query(
          'SELECT COUNT(*) AS c FROM role_permissions WHERE shop_id = ? AND role = ?',
          [shopId, roleCode]
        );
        hasAny = Number(countRow?.c || 0) > 0;
      }

      if (!hasAny) {
        if (req.user.can_access_admin) return next();
        return res.status(403).json({ error: 'Không có quyền truy cập' });
      }

      let allowed = false;
      if (!legacyMode) {
        const [[row]] = await pool.query(
          `SELECT allowed
           FROM role_permissions
           WHERE shop_id = ? AND role_id = ? AND module = ? AND action = ?
           LIMIT 1`,
          [shopId, roleId, moduleName, action]
        );
        allowed = !!row?.allowed;
      } else {
        const [[row]] = await pool.query(
          `SELECT allowed
           FROM role_permissions
           WHERE shop_id = ? AND role = ? AND module = ? AND action = ?
           LIMIT 1`,
          [shopId, roleCode, moduleName, action]
        );
        allowed = !!row?.allowed;
      }

      if (!allowed) return res.status(403).json({ error: 'Không có quyền truy cập' });
      return next();
    } catch (err) {
      return next(err);
    }
  };
}

module.exports = requirePermission;

