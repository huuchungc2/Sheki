const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const router = express.Router();
const auth = require('../middleware/auth');
const { getPool } = require('../config/db');

const USERNAME_RE = /^[a-zA-Z0-9][a-zA-Z0-9._-]{2,31}$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function isValidUsernameOrEmail(login) {
  const s = String(login || '').trim().toLowerCase();
  return USERNAME_RE.test(s) || EMAIL_RE.test(s);
}

function normalizeUsername(s) {
  return String(s || '').trim().toLowerCase();
}

/** Đăng nhập chỉ theo cột username (không khớp email). */
async function findUserByUsernameForLogin(pool, login) {
  const sel = `SELECT u.id, u.full_name, u.username, u.email, u.password_hash, u.commission_rate, u.is_active, u.is_super_admin, u.role_id,
       CASE WHEN IFNULL(CAST(u.is_active AS UNSIGNED), 0) = 1 THEN 1 ELSE 0 END AS login_allowed
       FROM users u`;
  const [rows] = await pool.query(`${sel} WHERE LOWER(TRIM(u.username)) = ?`, [login]);
  return rows;
}

/** Cột is_active từ MySQL / mysql2: tinyint, BIT, chuỗi, Buffer… — chỉ coi 1 là mở */
function isActiveFromDb(v) {
  if (v === true) return true;
  if (v === false || v == null) return false;
  if (v === 1) return true;
  if (v === 0) return false;
  if (typeof v === 'bigint') return v === 1n;
  if (typeof v === 'string') {
    const t = v.trim().toLowerCase();
    return t === '1' || t === 'true';
  }
  if (typeof Buffer !== 'undefined' && Buffer.isBuffer(v)) {
    return v.length > 0 && v[0] === 1;
  }
  if (typeof v === 'number') return v === 1;
  return false;
}

/** Một trong hai: CASE trong SQL (login_allowed) hoặc is_active parse được — tránh oan «khóa» do kiểu driver */
function userRowAllowsLogin(row) {
  if (Number(row.login_allowed) === 1) return true;
  return isActiveFromDb(row.is_active);
}

async function loadShopsForUser(pool, userId) {
  const [rows] = await pool.query(
    `SELECT us.shop_id AS id, s.name, s.code, s.is_active,
            us.role_id, r.code AS role, r.name AS role_name, r.can_access_admin, r.scope_own_data
     FROM user_shops us
     JOIN shops s ON us.shop_id = s.id
     JOIN roles r ON us.role_id = r.id
     WHERE us.user_id = ?
       AND s.is_active = 1
       AND (s.valid_until IS NULL OR s.valid_until >= CURDATE())
     ORDER BY s.name ASC`,
    [userId]
  );
  return rows.map((x) => ({
    id: x.id,
    name: x.name,
    code: x.code,
    role_id: x.role_id,
    role: x.role,
    role_name: x.role_name,
    can_access_admin: !!x.can_access_admin,
    scope_own_data: !!x.scope_own_data,
  }));
}

function buildPayloadFromShop(user, shop) {
  return {
    id: user.id,
    email: user.email,
    username: user.username,
    full_name: user.full_name,
    commission_rate: user.commission_rate,
    shop_id: shop.id,
    role_id: shop.role_id != null ? shop.role_id : user.role_id,
    role: shop.role,
    role_name: shop.role_name,
    can_access_admin: !!shop.can_access_admin,
    scope_own_data: !!shop.scope_own_data,
  };
}

function signToken(payload) {
  return jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  });
}

router.get('/me', auth, async (req, res, next) => {
  try {
    const pool = await getPool();
    const [rows] = await pool.query(
      `SELECT u.id, u.full_name, u.username, u.email, u.phone, u.commission_rate, u.department, u.position, u.join_date, u.avatar_url, u.is_active, u.created_at,
              u.is_super_admin,
              r.id AS role_id, r.code AS role, r.name AS role_name, r.can_access_admin, r.scope_own_data
       FROM users u
       JOIN roles r ON u.role_id = r.id
       WHERE u.id = ?`,
      [req.user.id]
    );
    if (rows.length === 0) return res.status(404).json({ error: 'Không tìm thấy người dùng' });
    const row = rows[0];
    row.can_access_admin = !!row.can_access_admin;
    row.scope_own_data = !!row.scope_own_data;
    row.is_super_admin = !!row.is_super_admin;

    const shops = await loadShopsForUser(pool, req.user.id);
    let currentShop = null;
    if (req.user.shop_id != null) {
      currentShop = shops.find((s) => s.id === Number(req.user.shop_id)) || null;
      if (currentShop) {
        row.role_id = currentShop.role_id;
        row.role = currentShop.role;
        row.role_name = currentShop.role_name;
        row.can_access_admin = currentShop.can_access_admin;
        row.scope_own_data = currentShop.scope_own_data;
      } else if (row.is_super_admin) {
        const [[s]] = await pool.query('SELECT id, name, code FROM shops WHERE id = ? LIMIT 1', [req.user.shop_id]);
        if (s) {
          row.role = 'super_admin';
          row.role_name = 'Super Admin';
          row.can_access_admin = true;
          row.scope_own_data = false;
        }
      } else {
        // Token còn shop_id nhưng shop đã tắt / hết hạn — bắt đăng nhập lại
        return res.status(403).json({
          error: 'Phiên đăng nhập không còn hiệu lực (shop đã tắt hoặc hết hạn). Vui lòng đăng nhập lại.',
          code: 'SHOP_SESSION_INVALID',
        });
      }
    }

    let allShops = [];
    if (row.is_super_admin) {
      const [all] = await pool.query(
        'SELECT id, name, code, is_active, valid_until FROM shops ORDER BY name ASC'
      );
      allShops = all;
    }

    res.json({
      data: row,
      shops,
      all_shops: allShops,
      current_shop_id: req.user.shop_id != null ? Number(req.user.shop_id) : null,
    });
  } catch (err) {
    next(err);
  }
});

router.post('/login', async (req, res, next) => {
  try {
    const password = req.body.password;
    const login = normalizeUsername(req.body.username ?? req.body.login ?? '');
    const requestedShopId = req.body.shop_id != null ? parseInt(req.body.shop_id, 10) : null;

    if (!login || !password) {
      return res.status(400).json({ error: 'Thiếu tên đăng nhập hoặc mật khẩu' });
    }

    const pool = await getPool();
    const rows = await findUserByUsernameForLogin(pool, login);

    if (rows.length === 0) {
      return res.status(401).json({ error: 'Tên đăng nhập hoặc mật khẩu không đúng' });
    }

    rows.sort((a, b) => {
      const la = Number(a.login_allowed) === 1;
      const lb = Number(b.login_allowed) === 1;
      if (la !== lb) return la ? -1 : 1;
      return b.id - a.id;
    });

    let user = null;
    for (const candidate of rows) {
      const ok = await bcrypt.compare(password, candidate.password_hash);
      if (!ok) continue;
      if (!userRowAllowsLogin(candidate)) {
        return res.status(403).json({
          error: 'Tài khoản đã bị khóa',
          code: 'USER_INACTIVE',
        });
      }
      user = candidate;
      break;
    }

    if (!user) {
      return res.status(401).json({ error: 'Tên đăng nhập hoặc mật khẩu không đúng' });
    }

    const isSuperAdmin = !!user.is_super_admin;
    const shops = await loadShopsForUser(pool, user.id);
    if (!isSuperAdmin && shops.length === 0) {
      return res.status(403).json({
        error: 'Shop đã tắt, hết hạn hoặc tài khoản chưa được gán shop — liên hệ quản trị',
        code: 'NO_SHOP',
        shops: [],
      });
    }

    let shop = null;

    if (!isSuperAdmin) {
      if (requestedShopId && Number.isFinite(requestedShopId)) {
        const found = shops.find((s) => s.id === requestedShopId);
        if (found) {
          shop = found;
        } else {
          const [[mem]] = await pool.query(
            'SELECT 1 AS ok FROM user_shops WHERE user_id = ? AND shop_id = ? LIMIT 1',
            [user.id, requestedShopId]
          );
          if (mem) {
            return res.status(403).json({
              error: 'Shop đã tắt hoặc hết hạn sử dụng. Liên hệ quản trị.',
              code: 'SHOP_INACTIVE_OR_EXPIRED',
            });
          }
          return res.status(403).json({
            error: 'Bạn không thuộc shop đã chọn',
            code: 'SHOP_FORBIDDEN',
          });
        }
      } else {
        shop = shops[0];
      }
    } else {
      shop = shops[0] || null;
      if (requestedShopId && Number.isFinite(requestedShopId)) {
        const found = shops.find((s) => s.id === requestedShopId);
        if (found) shop = found;
      }
    }

    // Super admin: allow choosing any existing shop even without membership
    if (isSuperAdmin && requestedShopId && !shop) {
      const [[srow]] = await pool.query('SELECT id, name, code, is_active FROM shops WHERE id = ? LIMIT 1', [requestedShopId]);
      if (srow) {
        shop = {
          id: srow.id,
          name: srow.name,
          code: srow.code,
          role_id: null,
          role: 'super_admin',
          role_name: 'Super Admin',
          can_access_admin: true,
          scope_own_data: false,
        };
      }
    }

    // Super admin: if no memberships and no explicit shop selection, default to Sheki (id=1)
    if (!shop && isSuperAdmin && (!requestedShopId || !Number.isFinite(requestedShopId))) {
      const [[srow]] = await pool.query('SELECT id, name, code FROM shops WHERE id = 1 LIMIT 1');
      if (srow) {
        shop = {
          id: srow.id,
          name: srow.name,
          code: srow.code,
          role_id: null,
          role: 'super_admin',
          role_name: 'Super Admin',
          can_access_admin: true,
          scope_own_data: false,
        };
      }
    }

    if (!shop) {
      // Super admin but no shop selected and no memberships: return list of shops to pick
      const [all] = await pool.query(
        'SELECT id, name, code, is_active, valid_until FROM shops ORDER BY name ASC'
      );
      return res.status(200).json({
        token: null,
        shops,
        all_shops: all,
        requires_shop_select: true,
        user: {
          id: user.id,
          full_name: user.full_name,
          username: user.username,
          email: user.email,
          is_super_admin: true,
        },
      });
    }

    const payload = isSuperAdmin
      ? { ...buildPayloadFromShop(user, shop), is_super_admin: true }
      : buildPayloadFromShop(user, shop);
    const token = signToken(payload);

    let allShops = [];
    if (isSuperAdmin) {
      const [all] = await pool.query(
        'SELECT id, name, code, is_active, valid_until FROM shops ORDER BY name ASC'
      );
      allShops = all;
    }

    res.json({
      token,
      shops,
      all_shops: allShops,
      shop,
      user: {
        id: user.id,
        full_name: user.full_name,
        username: user.username,
        email: user.email,
        role: shop.role,
        role_id: shop.role_id != null ? shop.role_id : user.role_id,
        role_name: shop.role_name,
        can_access_admin: shop.can_access_admin,
        scope_own_data: shop.scope_own_data,
        commission_rate: user.commission_rate,
        shop_id: shop.id,
        is_super_admin: isSuperAdmin,
      },
    });
  } catch (err) {
    next(err);
  }
});

router.post('/switch-shop', auth, async (req, res, next) => {
  try {
    const shopId = req.body.shop_id != null ? parseInt(req.body.shop_id, 10) : null;
    if (!shopId || !Number.isFinite(shopId)) {
      return res.status(400).json({ error: 'Thiếu shop_id' });
    }
    const pool = await getPool();
    const [[uadm]] = await pool.query(
      'SELECT id, full_name, username, email, commission_rate, is_super_admin, role_id FROM users WHERE id = ? LIMIT 1',
      [req.user.id]
    );
    const isSuperAdmin = !!uadm?.is_super_admin;

    const shops = await loadShopsForUser(pool, req.user.id);
    let shop = shops.find((s) => s.id === shopId) || null;
    if (!shop && isSuperAdmin) {
      const [[srow]] = await pool.query('SELECT id, name, code FROM shops WHERE id = ? LIMIT 1', [shopId]);
      if (srow) {
        shop = {
          id: srow.id,
          name: srow.name,
          code: srow.code,
          role_id: null,
          role: 'super_admin',
          role_name: 'Super Admin',
          can_access_admin: true,
          scope_own_data: false,
        };
      }
    }
    if (!shop && !isSuperAdmin) {
      const [[mem]] = await pool.query(
        'SELECT 1 AS ok FROM user_shops WHERE user_id = ? AND shop_id = ? LIMIT 1',
        [req.user.id, shopId]
      );
      if (mem) {
        return res.status(403).json({
          error: 'Shop đã tắt hoặc hết hạn sử dụng',
          code: 'SHOP_INACTIVE_OR_EXPIRED',
        });
      }
      return res.status(403).json({ error: 'Không có quyền vào shop này', code: 'SHOP_FORBIDDEN' });
    }
    if (!shop) {
      return res.status(403).json({ error: 'Không có quyền vào shop này' });
    }
    const payload = isSuperAdmin
      ? { ...buildPayloadFromShop(uadm, shop), is_super_admin: true }
      : buildPayloadFromShop(uadm, shop);
    const token = signToken(payload);
    let allShops = [];
    if (isSuperAdmin) {
      const [all] = await pool.query(
        'SELECT id, name, code, is_active, valid_until FROM shops ORDER BY name ASC'
      );
      allShops = all;
    }
    res.json({ token, shop, shops, all_shops: allShops });
  } catch (err) {
    next(err);
  }
});

/**
 * Quên mật khẩu Super Admin (không cần đăng nhập). Bật bằng cách đặt SUPERADMIN_RESET_KEY trong backend/.env
 * POST { username, newPassword, resetKey }
 */
router.post('/super-admin-recovery', async (req, res, next) => {
  try {
    const envKey = process.env.SUPERADMIN_RESET_KEY;
    if (!envKey || String(envKey).trim() === '') {
      return res.status(503).json({
        error:
          'Chưa bật khôi phục: thêm SUPERADMIN_RESET_KEY vào backend/.env hoặc chạy node backend/scripts/resetSuperAdminPassword.js',
        code: 'RECOVERY_DISABLED',
      });
    }
    const { username, newPassword, resetKey } = req.body || {};
    if (String(resetKey) !== String(envKey)) {
      return res.status(403).json({ error: 'Mã khôi phục không đúng', code: 'BAD_RESET_KEY' });
    }
    const login = normalizeUsername(username ?? '');
    if (!login || !newPassword || String(newPassword).length < 6) {
      return res.status(400).json({
        error: 'Cần username super admin và mật khẩu mới (tối thiểu 6 ký tự)',
      });
    }
    const pool = await getPool();
    const [rows] = await pool.query(
      `SELECT id FROM users u
       WHERE LOWER(TRIM(u.username)) = ?
         AND u.is_super_admin = 1`,
      [login]
    );
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Không tìm thấy tài khoản super admin khớp' });
    }
    const newHash = await bcrypt.hash(String(newPassword), 10);
    await pool.query('UPDATE users SET password_hash = ? WHERE id = ?', [newHash, rows[0].id]);
    res.json({ message: 'Đã đặt lại mật khẩu. Có thể đăng nhập ngay.' });
  } catch (err) {
    next(err);
  }
});

router.post('/register', async (req, res, next) => {
  try {
    const { full_name, email, password, phone } = req.body;
    const username = normalizeUsername(req.body.username);

    if (!full_name || !email || !password || !username) {
      return res.status(400).json({ error: 'Thiếu họ tên, tên đăng nhập, email hoặc mật khẩu' });
    }

    if (!isValidUsernameOrEmail(username)) {
      return res.status(400).json({ error: 'Tên đăng nhập: có thể dùng username (3–32 ký tự, bắt đầu bằng chữ/số; cho phép . _ -) hoặc dùng email.' });
    }

    const pool = await getPool();

    const [existingEmail] = await pool.query('SELECT id FROM users WHERE email = ?', [email]);
    if (existingEmail.length > 0) {
      return res.status(409).json({ error: 'Email đã tồn tại' });
    }

    const [existingUser] = await pool.query('SELECT id FROM users WHERE username = ?', [username]);
    if (existingUser.length > 0) {
      return res.status(409).json({ error: 'Tên đăng nhập đã được sử dụng' });
    }

    const [[salesRole]] = await pool.query('SELECT id, code, name, can_access_admin, scope_own_data FROM roles WHERE code = ?', ['sales']);
    if (!salesRole) {
      return res.status(500).json({ error: 'Thiếu vai trò mặc định (sales) trong hệ thống' });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const [result] = await pool.query(
      'INSERT INTO users (full_name, username, email, password_hash, phone, role_id, is_active) VALUES (?, ?, ?, ?, ?, ?, 1)',
      [full_name, username, email, passwordHash, phone || null, salesRole.id]
    );

    const payload = {
      id: result.insertId,
      email,
      username,
      role: salesRole.code,
      role_id: salesRole.id,
      role_name: salesRole.name,
      full_name,
      can_access_admin: !!salesRole.can_access_admin,
      scope_own_data: !!salesRole.scope_own_data,
    };

    const token = signToken(payload);

    res.status(201).json({
      token,
      shops: [],
      requires_shop: true,
      user: {
        id: result.insertId,
        full_name,
        username,
        email,
        role: salesRole.code,
        role_id: salesRole.id,
        role_name: salesRole.name,
        can_access_admin: !!salesRole.can_access_admin,
        scope_own_data: !!salesRole.scope_own_data,
      },
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
