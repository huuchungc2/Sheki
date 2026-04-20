const express = require('express');
const bcrypt = require('bcryptjs');
const router = express.Router();
const auth = require('../middleware/auth');
const requireSuperAdmin = require('../middleware/requireSuperAdmin');
const { getPool } = require('../config/db');

const USERNAME_RE = /^[a-zA-Z0-9][a-zA-Z0-9._-]{2,31}$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function normalizeUsername(s) {
  return String(s || '').trim().toLowerCase();
}

/** admins: [{ full_name, username, email, password }] — tất cả field bắt buộc từng dòng */
async function createAdminAccountsForShop(conn, shopId, admins, adminRoleId) {
  const created = [];
  const seenUser = new Set();
  const seenEmail = new Set();

  for (let i = 0; i < admins.length; i++) {
    const a = admins[i];
    const full_name = String(a.full_name || '').trim();
    const username = normalizeUsername(a.username);
    const email = String(a.email || '').trim().toLowerCase();
    const password = String(a.password || '');
    const label = `Tài khoản admin #${i + 1}`;

    if (!full_name || !username || !email || !password) {
      throw Object.assign(new Error(`${label}: nhập đủ họ tên, tên đăng nhập, email và mật khẩu`), {
        status: 400,
      });
    }
    if (!USERNAME_RE.test(username)) {
      throw Object.assign(new Error(`${label}: tên đăng nhập 3–32 ký tự, chỉ chữ, số, . _ -`), {
        status: 400,
      });
    }
    if (!EMAIL_RE.test(email)) {
      throw Object.assign(new Error(`${label}: email không hợp lệ`), { status: 400 });
    }
    if (password.length < 6) {
      throw Object.assign(new Error(`${label}: mật khẩu ít nhất 6 ký tự`), { status: 400 });
    }
    if (seenUser.has(username)) {
      throw Object.assign(new Error(`${label}: trùng tên đăng nhập với dòng khác trong form`), {
        status: 400,
      });
    }
    if (seenEmail.has(email)) {
      throw Object.assign(new Error(`${label}: trùng email với dòng khác trong form`), { status: 400 });
    }
    seenUser.add(username);
    seenEmail.add(email);

    const [dupU] = await conn.query('SELECT id FROM users WHERE username = ? LIMIT 1', [username]);
    if (dupU.length) {
      throw Object.assign(new Error(`Tên đăng nhập "${username}" đã tồn tại`), { status: 409 });
    }
    const [dupE] = await conn.query('SELECT id FROM users WHERE email = ? LIMIT 1', [email]);
    if (dupE.length) {
      throw Object.assign(new Error(`Email "${email}" đã tồn tại`), { status: 409 });
    }

    const password_hash = await bcrypt.hash(password, 10);
    const [ins] = await conn.query(
      `INSERT INTO users (full_name, username, email, password_hash, role_id, is_super_admin, is_active)
       VALUES (?, ?, ?, ?, ?, 0, 1)`,
      [full_name, username, email, password_hash, adminRoleId]
    );
    const userId = ins.insertId;
    await conn.query(
      `INSERT INTO user_shops (user_id, shop_id, role_id) VALUES (?, ?, ?)
       ON DUPLICATE KEY UPDATE role_id = VALUES(role_id)`,
      [userId, shopId, adminRoleId]
    );
    created.push({
      id: userId,
      full_name,
      username,
      email,
      role_code: 'admin',
      role_id: adminRoleId,
    });
  }
  return created;
}

async function getAdminRoleId(conn) {
  const [[r]] = await conn.query("SELECT id, code FROM roles WHERE code = 'admin' LIMIT 1");
  if (!r || String(r.code) !== 'admin') {
    const err = new Error('Thiếu role admin trong hệ thống (roles.code = admin)');
    err.status = 500;
    throw err;
  }
  return r.id;
}

async function getSalesRoleId(conn) {
  const [[r]] = await conn.query("SELECT id, code FROM roles WHERE code = 'sales' LIMIT 1");
  if (!r || String(r.code) !== 'sales') {
    const err = new Error('Thiếu role sales trong hệ thống (roles.code = sales)');
    err.status = 500;
    throw err;
  }
  return r.id;
}

async function seedRolePermissionsForShop(conn, shopId, roleIds) {
  if (!shopId || !Array.isArray(roleIds) || roleIds.length === 0) return;

  // Prefer new schema: role_permissions has role_id. Fallback to legacy schema: role string.
  try {
    // Copy rows from template shop (id=1) for the given roleIds.
    await conn.query(
      `INSERT INTO role_permissions (shop_id, role_id, role, module, action, allowed)
       SELECT ?, rp.role_id, rp.role, rp.module, rp.action, rp.allowed
       FROM role_permissions rp
       WHERE rp.shop_id = 1 AND rp.role_id IN (?)
       ON DUPLICATE KEY UPDATE allowed = VALUES(allowed)`,
      [shopId, roleIds]
    );
    return;
  } catch (e) {
    if (!e || e.code !== 'ER_BAD_FIELD_ERROR') throw e;
  }

  // Legacy: role_permissions(shop_id, role, module, action, allowed)
  const [roles] = await conn.query('SELECT id, code FROM roles WHERE id IN (?)', [roleIds]);
  const codes = (roles || []).map((r) => String(r.code || '').toLowerCase()).filter(Boolean);
  if (codes.length === 0) return;

  await conn.query(
    `INSERT INTO role_permissions (shop_id, role, module, action, allowed)
     SELECT ?, rp.role, rp.module, rp.action, rp.allowed
     FROM role_permissions rp
     WHERE rp.shop_id = 1 AND rp.role IN (?)
     ON DUPLICATE KEY UPDATE allowed = VALUES(allowed)`,
    [shopId, codes]
  );
}

async function ensureDefaultWarehouseForShop(conn, shopId) {
  if (!shopId) return;
  // Create a minimal default warehouse so order/inventory flows have a warehouse_id.
  await conn.query('UPDATE warehouses SET is_default = 0 WHERE shop_id = ?', [shopId]);
  const [[w]] = await conn.query('SELECT id FROM warehouses WHERE shop_id = ? LIMIT 1', [shopId]);
  if (w?.id) {
    await conn.query('UPDATE warehouses SET is_default = 1 WHERE id = ? AND shop_id = ?', [w.id, shopId]);
    return;
  }
  await conn.query(
    'INSERT INTO warehouses (shop_id, name, address, is_default, is_active) VALUES (?, ?, ?, 1, 1)',
    [shopId, 'Kho trung tâm', null]
  );
}

function normalizeAdminsInput(body) {
  let admins = Array.isArray(body?.admins) ? body.admins : [];
  admins = admins.filter(
    (a) =>
      String(a?.full_name || '').trim() ||
      String(a?.username || '').trim() ||
      String(a?.email || '').trim() ||
      String(a?.password || '').trim()
  );
  return admins;
}

function parseValidUntil(body) {
  if (body?.valid_until === undefined) return undefined;
  if (body.valid_until === null || body.valid_until === '') return null;
  const s = String(body.valid_until).trim().slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) {
    throw Object.assign(new Error('valid_until phải là ngày dạng YYYY-MM-DD'), { status: 400 });
  }
  return s;
}

/** Coi active giống auth (tránh !!\"0\" hoặc Buffer driver). */
function rowUserIsActive(v) {
  if (v === true || v === 1) return true;
  if (v === false || v === 0 || v == null) return false;
  if (typeof v === 'bigint') return v === 1n;
  if (typeof v === 'string') {
    const t = v.trim().toLowerCase();
    return t === '1' || t === 'true';
  }
  if (typeof Buffer !== 'undefined' && Buffer.isBuffer(v)) {
    return v.length > 0 && v[0] === 1;
  }
  return Number(v) === 1;
}

/** Gắn danh sách admin (role admin) + cờ shop_expired cho UI */
async function attachAdminsAndExpiry(pool, shops) {
  if (!shops.length) return shops;
  const ids = shops.map((s) => s.id);
  const [admins] = await pool.query(
    `SELECT us.shop_id, u.id AS user_id, u.full_name, u.username, u.email, u.is_active
     FROM user_shops us
     INNER JOIN users u ON u.id = us.user_id
     INNER JOIN roles r ON r.id = us.role_id AND r.code = 'admin'
     WHERE us.shop_id IN (?)
     ORDER BY us.shop_id ASC, u.full_name ASC`,
    [ids]
  );
  const byShop = {};
  for (const a of admins) {
    if (!byShop[a.shop_id]) byShop[a.shop_id] = [];
    byShop[a.shop_id].push({
      user_id: a.user_id,
      full_name: a.full_name,
      username: a.username,
      email: a.email,
      is_active: rowUserIsActive(a.is_active),
    });
  }
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return shops.map((s) => {
    const row = { ...s, admins: byShop[s.id] || [] };
    if (s.valid_until) {
      const d = new Date(`${String(s.valid_until).slice(0, 10)}T12:00:00`);
      row.shop_expired = d < today;
    } else {
      row.shop_expired = false;
    }
    return row;
  });
}

// Super admin: list shops (kèm toàn bộ admin + hạn dùng)
router.get('/', auth, requireSuperAdmin, async (req, res, next) => {
  try {
    const pool = await getPool();
    const [rows] = await pool.query(
      'SELECT id, name, code, is_active, valid_until, created_at FROM shops ORDER BY created_at DESC'
    );
    const data = await attachAdminsAndExpiry(pool, rows);
    res.json({ data });
  } catch (e) {
    next(e);
  }
});

// Super admin: tìm user (giữ cho tích hợp khác nếu cần)
router.get('/users-lookup', auth, requireSuperAdmin, async (req, res, next) => {
  try {
    const q = String(req.query.q || '').trim();
    if (q.length < 2) {
      return res.json({ data: [] });
    }
    const pool = await getPool();
    const like = `%${q}%`;
    const [rows] = await pool.query(
      `SELECT u.id, u.full_name, u.username, u.email, u.is_active
       FROM users u
       WHERE (u.full_name LIKE ? OR u.username LIKE ? OR u.email LIKE ?)
       ORDER BY u.is_active DESC, u.full_name ASC
       LIMIT 30`,
      [like, like, like]
    );
    res.json({ data: rows });
  } catch (e) {
    next(e);
  }
});

// Super admin: danh sách user của shop
router.get('/:shopId/users', auth, requireSuperAdmin, async (req, res, next) => {
  try {
    const shopId = parseInt(req.params.shopId, 10);
    if (!shopId) return res.status(400).json({ error: 'shop_id không hợp lệ' });
    const pool = await getPool();
    const [[s]] = await pool.query('SELECT id FROM shops WHERE id = ? LIMIT 1', [shopId]);
    if (!s) return res.status(404).json({ error: 'Không tìm thấy shop' });
    const [rows] = await pool.query(
      `SELECT us.user_id, u.full_name, u.username, u.email, u.is_active,
              us.role_id, r.code AS role, r.name AS role_name
       FROM user_shops us
       JOIN users u ON u.id = us.user_id
       JOIN roles r ON r.id = us.role_id
       WHERE us.shop_id = ?
       ORDER BY u.full_name ASC`,
      [shopId]
    );
    res.json({ data: rows });
  } catch (e) {
    next(e);
  }
});

// Super admin: tạo shop + (tuỳ chọn) một hoặc nhiều tài khoản admin mới cho shop
router.post('/', auth, requireSuperAdmin, async (req, res, next) => {
  const pool = await getPool();
  let conn;
  try {
    const name = String(req.body?.name || '').trim();
    const code = String(req.body?.code || '').trim().toLowerCase();
    if (!name || !code) return res.status(400).json({ error: 'Thiếu name hoặc code' });

    const admins = normalizeAdminsInput(req.body);
    let validUntil = null;
    try {
      const v = parseValidUntil(req.body);
      if (v !== undefined) validUntil = v;
    } catch (err) {
      return res.status(err.status || 400).json({ error: err.message });
    }

    conn = await pool.getConnection();
    await conn.beginTransaction();

    const adminRoleId = await getAdminRoleId(conn);
    const salesRoleId = await getSalesRoleId(conn);

    const [r] = await conn.query(
      'INSERT INTO shops (name, code, is_active, valid_until) VALUES (?, ?, 1, ?)',
      [name, code, validUntil]
    );
    const shopId = r.insertId;

    // Seed commission_tiers cho shop mới (copy từ shop mẫu id=1) để tính override HH quản lý
    await conn.query(
      `INSERT INTO commission_tiers (shop_id, ctv_rate_min, ctv_rate_max, sales_override_rate, note)
       SELECT ?, ctv_rate_min, ctv_rate_max, sales_override_rate, note
       FROM commission_tiers
       WHERE shop_id = 1`,
      [shopId]
    );

    // Seed role_permissions cho shop mới (copy từ shop mẫu id=1) để không bị 403 khi bật phân quyền
    await seedRolePermissionsForShop(conn, shopId, [adminRoleId, salesRoleId]);

    // Ensure at least one default warehouse for the new shop
    await ensureDefaultWarehouseForShop(conn, shopId);

    let admins_created = [];
    if (admins.length > 0) {
      admins_created = await createAdminAccountsForShop(conn, shopId, admins, adminRoleId);
    }

    await conn.commit();

    const [[row]] = await pool.query(
      'SELECT id, name, code, is_active, valid_until, created_at FROM shops WHERE id = ?',
      [shopId]
    );
    const [withAdmins] = await attachAdminsAndExpiry(pool, [row]);
    res.status(201).json({ data: withAdmins, admins_created });
  } catch (e) {
    if (conn) await conn.rollback();
    if (e.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ error: 'Trùng mã shop, email hoặc tên đăng nhập' });
    }
    if (e.status) {
      return res.status(e.status).json({ error: e.message });
    }
    next(e);
  } finally {
    if (conn) conn.release();
  }
});

// Super admin: thêm một hoặc nhiều tài khoản admin (mới) cho shop đã có
router.post('/:shopId/admins', auth, requireSuperAdmin, async (req, res, next) => {
  const pool = await getPool();
  let conn;
  try {
    const shopId = parseInt(req.params.shopId, 10);
    if (!shopId) return res.status(400).json({ error: 'shop_id không hợp lệ' });

    const admins = normalizeAdminsInput(req.body);
    if (admins.length === 0) {
      return res.status(400).json({ error: 'Thiếu danh sách admins (ít nhất một tài khoản đủ thông tin)' });
    }

    conn = await pool.getConnection();
    await conn.beginTransaction();

    const [[s]] = await conn.query('SELECT id FROM shops WHERE id = ? LIMIT 1', [shopId]);
    if (!s) {
      await conn.rollback();
      return res.status(404).json({ error: 'Không tìm thấy shop' });
    }

    const adminRoleId = await getAdminRoleId(conn);
    const admins_created = await createAdminAccountsForShop(conn, shopId, admins, adminRoleId);

    await conn.commit();
    res.status(201).json({ admins_created });
  } catch (e) {
    if (conn) await conn.rollback();
    if (e.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ error: 'Trùng email hoặc tên đăng nhập' });
    }
    if (e.status) {
      return res.status(e.status).json({ error: e.message });
    }
    next(e);
  } finally {
    if (conn) conn.release();
  }
});

// Super admin: đặt lại mật khẩu admin shop (không cần mật khẩu cũ) — đặt TRƯỚC route PATCH .../:userId để không nhầm "password" là userId
router.patch('/:shopId/admins/:userId/password', auth, requireSuperAdmin, async (req, res, next) => {
  try {
    const shopId = parseInt(req.params.shopId, 10);
    const userId = parseInt(req.params.userId, 10);
    const newPassword = String(req.body?.newPassword ?? '').trim();
    if (!shopId || !userId) return res.status(400).json({ error: 'Thiếu shop hoặc user' });
    if (newPassword.length < 6) {
      return res.status(400).json({ error: 'Mật khẩu mới tối thiểu 6 ký tự' });
    }

    const pool = await getPool();
    const [[row]] = await pool.query(
      `SELECT u.id FROM users u
       INNER JOIN user_shops us ON us.user_id = u.id AND us.shop_id = ?
       INNER JOIN roles r ON r.id = us.role_id AND r.code = 'admin'
       WHERE u.id = ? AND COALESCE(u.is_super_admin, 0) = 0`,
      [shopId, userId]
    );
    if (!row) {
      return res.status(404).json({ error: 'Không tìm thấy admin shop này' });
    }
    const password_hash = await bcrypt.hash(newPassword, 10);
    await pool.query('UPDATE users SET password_hash = ? WHERE id = ?', [password_hash, userId]);
    res.json({ message: 'Đã đặt lại mật khẩu' });
  } catch (e) {
    next(e);
  }
});

// Super admin: bật/tắt hoạt động user gắn shop (mọi role trong user_shops — không chỉ admin;
// trước đây JOIN role admin khiến user bị gán sales trong shop không bao giờ được UPDATE).
router.patch('/:shopId/admins/:userId', auth, requireSuperAdmin, async (req, res, next) => {
  try {
    const shopId = parseInt(req.params.shopId, 10);
    const userId = parseInt(req.params.userId, 10);
    if (!shopId || !userId) return res.status(400).json({ error: 'Thiếu shop hoặc user' });

    const active =
      req.body?.is_active === true ||
      req.body?.is_active === 1 ||
      req.body?.is_active === '1' ||
      req.body?.is_active === 'true';

    const pool = await getPool();
    const [r] = await pool.query(
      `UPDATE users u
       INNER JOIN user_shops us ON us.user_id = u.id AND us.shop_id = ? AND u.id = ?
       SET u.is_active = ?`,
      [shopId, userId, active ? 1 : 0]
    );
    if (r.affectedRows === 0) {
      return res.status(404).json({ error: 'Không tìm thấy admin shop này' });
    }
    res.json({ message: 'Đã cập nhật', is_active: active });
  } catch (e) {
    next(e);
  }
});

// Super admin: update shop
router.put('/:id', auth, requireSuperAdmin, async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (!id) return res.status(400).json({ error: 'ID không hợp lệ' });
    const name = req.body?.name != null ? String(req.body.name).trim() : null;
    const code = req.body?.code != null ? String(req.body.code).trim().toLowerCase() : null;
    const is_active = req.body?.is_active != null ? (req.body.is_active ? 1 : 0) : null;

    let validUntilSql = null;
    let validUntilVal = null;
    if (req.body && Object.prototype.hasOwnProperty.call(req.body, 'valid_until')) {
      try {
        validUntilVal = parseValidUntil(req.body);
        validUntilSql = 'valid_until = ?';
      } catch (err) {
        return res.status(err.status || 400).json({ error: err.message });
      }
    }

    const pool = await getPool();
    const [[cur]] = await pool.query('SELECT id FROM shops WHERE id = ? LIMIT 1', [id]);
    if (!cur) return res.status(404).json({ error: 'Không tìm thấy shop' });

    let sql = `UPDATE shops SET name = COALESCE(?, name), code = COALESCE(?, code), is_active = COALESCE(?, is_active)`;
    const params = [name || null, code || null, is_active];
    if (validUntilSql) {
      sql += `, ${validUntilSql}`;
      params.push(validUntilVal);
    }
    sql += ' WHERE id = ?';
    params.push(id);

    await pool.query(sql, params);

    const [[row]] = await pool.query(
      'SELECT id, name, code, is_active, valid_until, created_at FROM shops WHERE id = ?',
      [id]
    );
    const [withAdmins] = await attachAdminsAndExpiry(pool, [row]);
    res.json({ data: withAdmins });
  } catch (e) {
    if (e.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ error: 'Trùng mã shop' });
    }
    next(e);
  }
});

// Super admin: seed/copy commission_tiers từ shop mẫu (shop_id=1) cho shop đã tồn tại
// Dùng khi shop được tạo trước khi code auto-seed tiers được deploy.
router.post('/:id/seed-commission-tiers', auth, requireSuperAdmin, async (req, res, next) => {
  let conn;
  try {
    const shopId = parseInt(req.params.id, 10);
    if (!shopId) return res.status(400).json({ error: 'ID không hợp lệ' });
    if (shopId === 1) return res.status(400).json({ error: 'Shop mẫu (id=1) không cần seed' });

    const pool = await getPool();
    conn = await pool.getConnection();
    await conn.beginTransaction();

    const [[s]] = await conn.query('SELECT id FROM shops WHERE id = ? LIMIT 1', [shopId]);
    if (!s) {
      await conn.rollback();
      return res.status(404).json({ error: 'Không tìm thấy shop' });
    }

    const [[tplCount]] = await conn.query(
      'SELECT COUNT(*) AS c FROM commission_tiers WHERE shop_id = 1',
      []
    );
    const templateRows = parseInt(tplCount?.c, 10) || 0;
    if (templateRows === 0) {
      await conn.rollback();
      return res.status(400).json({ error: 'Shop mẫu (id=1) chưa có commission_tiers để copy' });
    }

    // Xoá tier hiện có của shop (nếu có) rồi copy lại để đồng nhất
    await conn.query('DELETE FROM commission_tiers WHERE shop_id = ?', [shopId]);
    const [ins] = await conn.query(
      `INSERT INTO commission_tiers (shop_id, ctv_rate_min, ctv_rate_max, sales_override_rate, note)
       SELECT ?, ctv_rate_min, ctv_rate_max, sales_override_rate, note
       FROM commission_tiers
       WHERE shop_id = 1`,
      [shopId]
    );

    await conn.commit();
    res.json({ message: 'Đã seed commission_tiers', inserted: ins?.affectedRows || 0 });
  } catch (e) {
    if (conn) await conn.rollback();
    next(e);
  } finally {
    if (conn) conn.release();
  }
});

// Super admin: gán user có sẵn vào shop (admin) — dùng hiếm
router.post('/:shopId/users', auth, requireSuperAdmin, async (req, res, next) => {
  try {
    const shopId = parseInt(req.params.shopId, 10);
    const userId = parseInt(req.body?.user_id, 10);
    const roleId = parseInt(req.body?.role_id, 10);
    if (!shopId || !userId || !roleId) return res.status(400).json({ error: 'Thiếu shop_id/user_id/role_id' });

    const pool = await getPool();
    const [[s]] = await pool.query('SELECT id FROM shops WHERE id = ? LIMIT 1', [shopId]);
    if (!s) return res.status(404).json({ error: 'Shop không tồn tại' });
    const [[u]] = await pool.query('SELECT id FROM users WHERE id = ? LIMIT 1', [userId]);
    if (!u) return res.status(404).json({ error: 'User không tồn tại' });
    const [[r]] = await pool.query('SELECT id, code FROM roles WHERE id = ? LIMIT 1', [roleId]);
    if (!r) return res.status(400).json({ error: 'role_id không hợp lệ' });
    if (r.code !== 'admin') {
      return res.status(400).json({
        error: 'Chỉ được gán vai trò quản trị viên (admin) cho shop. Nhân viên khác do admin shop quản lý.',
        code: 'SUPER_ADMIN_ONLY_ADMIN_ROLE',
      });
    }

    await pool.query(
      'INSERT INTO user_shops (user_id, shop_id, role_id) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE role_id = VALUES(role_id)',
      [userId, shopId, roleId]
    );

    res.status(201).json({ message: 'Đã chỉ định quản trị viên shop' });
  } catch (e) {
    next(e);
  }
});

module.exports = router;
