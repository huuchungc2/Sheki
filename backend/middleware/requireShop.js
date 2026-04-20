const { getPool } = require('../config/db');

/**
 * Sau `auth`: bắt buộc JWT có shop_id và user thuộc shop đó (user_shops).
 * Shop phải đang hoạt động và chưa hết hạn (valid_until) — trừ super admin (vào mọi shop còn tồn tại để vận hành).
 */
async function requireShop(req, res, next) {
  try {
    const shopId = req.user?.shop_id;
    if (shopId == null || shopId === '') {
      return res.status(403).json({
        error: 'Chưa chọn shop hoặc tài khoản chưa được gán shop',
        code: 'SHOP_REQUIRED',
      });
    }
    const pool = await getPool();

    if (req.user?.is_super_admin) {
      const [[s]] = await pool.query('SELECT id FROM shops WHERE id = ? LIMIT 1', [shopId]);
      if (!s) {
        return res.status(403).json({ error: 'Shop không tồn tại', code: 'SHOP_FORBIDDEN' });
      }
      req.shopId = Number(shopId);
      req.user.can_access_admin = true;
      req.user.scope_own_data = false;
      req.user.role = req.user.role || 'super_admin';
      req.user.role_name = req.user.role_name || 'Super Admin';
      return next();
    }

    const [[s]] = await pool.query(
      `SELECT id FROM shops WHERE id = ?
       AND is_active = 1
       AND (valid_until IS NULL OR valid_until >= CURDATE())`,
      [shopId]
    );
    if (!s) {
      return res.status(403).json({
        error: 'Shop không hoạt động hoặc đã hết hạn sử dụng',
        code: 'SHOP_FORBIDDEN',
      });
    }

    const [[row]] = await pool.query(
      `SELECT us.shop_id, us.role_id, r.code AS role, r.name AS role_name, r.can_access_admin, r.scope_own_data
       FROM user_shops us
       JOIN roles r ON us.role_id = r.id
       WHERE us.user_id = ? AND us.shop_id = ?`,
      [req.user.id, shopId]
    );
    if (!row) {
      return res.status(403).json({ error: 'Không có quyền truy cập shop này', code: 'SHOP_FORBIDDEN' });
    }
    req.shopId = Number(shopId);
    req.user.role_id = row.role_id;
    req.user.role = row.role;
    req.user.role_name = row.role_name;
    req.user.can_access_admin = !!row.can_access_admin;
    req.user.scope_own_data = !!row.scope_own_data;
    next();
  } catch (e) {
    next(e);
  }
}

module.exports = requireShop;
