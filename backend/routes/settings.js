const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const requireShop = require('../middleware/requireShop');
const requirePermission = require('../middleware/requirePermission');
const { getPool } = require('../config/db');
const { FEATURE_KEYS, FEATURE_TREE, SCOPE_TARGETS, SCOPE_LEVELS } = require('../rbac/features');

// Nhóm nhân viên theo mã vai trò (roles.code) — nhân viên thuộc shop hiện tại (user_shops)
router.get('/', auth, requireShop, requirePermission('settings', 'view'), async (req, res, next) => {
  try {
    const pool = await getPool();
    const [rows] = await pool.query(
      `SELECT u.id, u.full_name, u.email, u.phone, u.department, u.position, u.commission_rate, u.salary, u.join_date, u.is_active, u.created_at,
              r.code AS role, r.name AS role_name, r.id AS role_id
       FROM users u
       INNER JOIN user_shops us ON us.user_id = u.id AND us.shop_id = ?
       JOIN roles r ON us.role_id = r.id
       ORDER BY r.code, u.full_name`,
      [req.shopId]
    );

    const roleMap = {};
    rows.forEach((u) => {
      const key = u.role;
      if (!roleMap[key]) {
        roleMap[key] = { role: u.role, role_name: u.role_name, role_id: u.role_id, users: [] };
      }
      roleMap[key].users.push(u);
    });

    res.json({ data: Object.values(roleMap) });
  } catch (err) {
    next(err);
  }
});

async function getModuleScopes(pool, shopId, roleId) {
  const out = {};
  try {
    const [rows] = await pool.query(
      'SELECT module, scope FROM role_module_scopes WHERE shop_id = ? AND role_id = ?',
      [shopId, roleId]
    );
    for (const r of rows) out[String(r.module)] = String(r.scope);
  } catch (e) {
    // Table not migrated yet
    if (!e || e.code !== 'ER_NO_SUCH_TABLE') throw e;
  }
  return out;
}

async function resolveRole(req, pool) {
  const raw = String(req.params.roleId || req.params.role || '').trim();
  if (!raw) return null;

  const asNum = Number(raw);
  if (Number.isFinite(asNum) && String(parseInt(raw, 10)) === raw) {
    const [[r]] = await pool.query('SELECT id, code FROM roles WHERE id = ? LIMIT 1', [parseInt(raw, 10)]);
    return r || null;
  }

  const [[r]] = await pool.query('SELECT id, code FROM roles WHERE code = ? LIMIT 1', [raw.toLowerCase()]);
  return r || null;
}

function salesLikePermissions() {
  // IMPORTANT: Always return a full 8x4 matrix (32 rows) so UI can render/toggle consistently.
  // Keep this in sync with backend RBAC config (`backend/rbac/modules.js`).
  const { RBAC_MODULES, RBAC_ACTIONS } = require('../rbac/modules');
  const modules = RBAC_MODULES.map((m) => m.id);
  const actions = RBAC_ACTIONS.map((a) => a.id);
  const permissions = [];
  for (const m of modules) {
    for (const a of actions) {
      let allowed = false;
      if (m === 'dashboard' && a === 'view') allowed = true;
      if (m === 'orders' && ['view', 'create', 'edit'].includes(a)) allowed = true;
      if (m === 'customers' && ['view', 'create', 'edit'].includes(a)) allowed = true;
      if (m === 'reports' && a === 'view') allowed = true;
      if (m === 'products' && a === 'view') allowed = true;
      permissions.push({ module: m, action: a, allowed });
    }
  }
  return permissions;
}

function getDefaultPermissions(roleCode) {
  const { RBAC_MODULES } = require('../rbac/modules');
  const modules = RBAC_MODULES.map((m) => m.id);
  const permissions = [];

  if (roleCode === 'admin') {
    modules.forEach((m) => {
      ['view', 'create', 'edit', 'delete'].forEach((a) => {
        permissions.push({ module: m, action: a, allowed: true });
      });
    });
    return permissions;
  }

  // Mọi vai trò khác (sales, tùy chỉnh): mặc định giống sales
  return salesLikePermissions();
}

function defaultFeaturePermissions(roleCodeRaw) {
  const roleCode = String(roleCodeRaw || '').trim().toLowerCase();
  const out = {};
  for (const k of FEATURE_KEYS) out[k] = false;
  if (roleCode === 'admin') {
    for (const k of FEATURE_KEYS) out[k] = true;
    return out;
  }

  // Default non-admin: like sales
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
  for (const k of allow) out[k] = true;
  return out;
}

async function tableExists(pool, tableName) {
  try {
    await pool.query(`SELECT 1 FROM \`${tableName}\` LIMIT 1`);
    return true;
  } catch (e) {
    if (e && e.code === 'ER_NO_SUCH_TABLE') return false;
    throw e;
  }
}

// Nhanh.vn-style: get feature permission matrix for all roles in shop
router.get('/feature-matrix', auth, requireShop, requirePermission('settings', 'view'), async (req, res, next) => {
  try {
    const pool = await getPool();
    const sid = req.shopId;

    const [roles] = await pool.query(
      'SELECT id, shop_id, code, name, can_access_admin, scope_own_data, is_system FROM roles WHERE shop_id IN (0, ?) ORDER BY is_system DESC, name ASC',
      [sid]
    );

    const hasTable = await tableExists(pool, 'role_feature_permissions');
    const matrix = {};

    if (!hasTable) {
      for (const r of roles) matrix[r.id] = defaultFeaturePermissions(r.code);
      return res.json({
        data: { roles, feature_tree: FEATURE_TREE, feature_keys: FEATURE_KEYS, matrix, migrated: false },
      });
    }

    for (const r of roles) matrix[r.id] = defaultFeaturePermissions(r.code);

    const [rows] = await pool.query(
      'SELECT role_id, feature_key, allowed FROM role_feature_permissions WHERE shop_id = ?',
      [sid]
    );
    for (const row of rows) {
      const rid = Number(row.role_id);
      const key = String(row.feature_key || '');
      if (!matrix[rid]) continue;
      if (!Object.prototype.hasOwnProperty.call(matrix[rid], key)) continue;
      matrix[rid][key] = !!row.allowed;
    }

    res.json({
      data: { roles, feature_tree: FEATURE_TREE, feature_keys: FEATURE_KEYS, matrix, migrated: true },
    });
  } catch (err) {
    next(err);
  }
});

// Bulk update feature permissions: { updates: [{ role_id, permissions: { [feature_key]: boolean } }] }
router.put('/feature-matrix', auth, requireShop, requirePermission('settings', 'edit'), async (req, res, next) => {
  try {
    const pool = await getPool();
    const sid = req.shopId;
    const updates = Array.isArray(req.body?.updates) ? req.body.updates : [];

    const hasTable = await tableExists(pool, 'role_feature_permissions');
    if (!hasTable) {
      return res.status(400).json({
        error: 'Chưa migrate role_feature_permissions. Chạy migrations/027_rbac_feature_permissions.sql',
      });
    }

    for (const u of updates) {
      const roleId = parseInt(String(u?.role_id), 10);
      if (!roleId) continue;
      const perms = u?.permissions && typeof u.permissions === 'object' ? u.permissions : {};

      await pool.query('DELETE FROM role_feature_permissions WHERE shop_id = ? AND role_id = ?', [sid, roleId]);

      const rowsToInsert = [];
      for (const k of FEATURE_KEYS) {
        // Always write full matrix so missing keys don't silently fall back to defaults.
        const allowed = Object.prototype.hasOwnProperty.call(perms, k) ? !!perms[k] : false;
        rowsToInsert.push([sid, roleId, k, allowed ? 1 : 0]);
      }
      if (rowsToInsert.length) {
        await pool.query(
          'INSERT INTO role_feature_permissions (shop_id, role_id, feature_key, allowed) VALUES ?',
          [rowsToInsert]
        );
      }
    }

    res.json({ message: 'Đã cập nhật phân quyền chi tiết' });
  } catch (err) {
    next(err);
  }
});

// Seed default feature permissions for a role (admin: all; else sales-like)
router.post('/feature-seed-default/:roleId', auth, requireShop, requirePermission('settings', 'edit'), async (req, res, next) => {
  try {
    const pool = await getPool();
    const sid = req.shopId;
    const roleId = parseInt(req.params.roleId, 10);
    if (!roleId) return res.status(400).json({ error: 'Thiếu roleId' });

    const hasTable = await tableExists(pool, 'role_feature_permissions');
    if (!hasTable) {
      return res.status(400).json({
        error: 'Chưa migrate role_feature_permissions. Chạy migrations/027_rbac_feature_permissions.sql',
      });
    }

    const [[role]] = await pool.query('SELECT id, code FROM roles WHERE id = ? LIMIT 1', [roleId]);
    if (!role) return res.status(404).json({ error: 'Không tìm thấy vai trò' });

    const defaults = defaultFeaturePermissions(role.code);
    await pool.query('DELETE FROM role_feature_permissions WHERE shop_id = ? AND role_id = ?', [sid, roleId]);

    const rowsToInsert = FEATURE_KEYS.map((k) => [sid, roleId, k, defaults[k] ? 1 : 0]);
    if (rowsToInsert.length) {
      await pool.query(
        'INSERT INTO role_feature_permissions (shop_id, role_id, feature_key, allowed) VALUES ?',
        [rowsToInsert]
      );
    }

    res.json({ message: 'Đã khởi tạo phân quyền mặc định', data: defaults });
  } catch (err) {
    next(err);
  }
});

// Scope matrix (own/group/shop) per target for all roles in shop
router.get('/scope-matrix', auth, requireShop, requirePermission('settings', 'view'), async (req, res, next) => {
  try {
    const pool = await getPool();
    const sid = req.shopId;

    const [roles] = await pool.query(
      'SELECT id, shop_id, code, name, can_access_admin, scope_own_data, is_system FROM roles WHERE shop_id IN (0, ?) ORDER BY is_system DESC, name ASC',
      [sid]
    );

    const hasTable = await tableExists(pool, 'role_scopes');
    const targets = SCOPE_TARGETS.map((t) => t.id);
    const matrix = {};

    for (const r of roles) {
      matrix[r.id] = {};
      const roleCode = String(r.code || '').toLowerCase();
      const def =
        (r.can_access_admin || roleCode === 'admin')
          ? 'shop'
          : (roleCode === 'sales' ? 'own' : (r.scope_own_data ? 'own' : 'shop'));
      for (const t of targets) matrix[r.id][t] = def;
    }

    if (!hasTable) {
      return res.json({
        data: { roles, scope_targets: SCOPE_TARGETS, scope_levels: SCOPE_LEVELS, matrix, migrated: false },
      });
    }

    const [rows] = await pool.query('SELECT role_id, target, scope FROM role_scopes WHERE shop_id = ?', [sid]);
    for (const row of rows) {
      const rid = Number(row.role_id);
      const t = String(row.target || '');
      const s = String(row.scope || '');
      if (!matrix[rid] || !targets.includes(t)) continue;
      matrix[rid][t] = (s === 'shop' || s === 'group' || s === 'own') ? s : matrix[rid][t];
    }

    res.json({
      data: { roles, scope_targets: SCOPE_TARGETS, scope_levels: SCOPE_LEVELS, matrix, migrated: true },
    });
  } catch (err) {
    next(err);
  }
});

// Bulk update scopes: { updates: [{ role_id, scopes: { [target]: 'own'|'group'|'shop' } }] }
router.put('/scope-matrix', auth, requireShop, requirePermission('settings', 'edit'), async (req, res, next) => {
  try {
    const pool = await getPool();
    const sid = req.shopId;
    const updates = Array.isArray(req.body?.updates) ? req.body.updates : [];

    const hasTable = await tableExists(pool, 'role_scopes');
    if (!hasTable) {
      return res.status(400).json({
        error: 'Chưa migrate role_scopes. Chạy migrations/028_role_scope_levels.sql',
      });
    }

    const allowedTargets = new Set(SCOPE_TARGETS.map((t) => t.id));
    const allowedScopes = new Set(['own', 'group', 'shop']);

    for (const u of updates) {
      const roleId = parseInt(String(u?.role_id), 10);
      if (!roleId) continue;
      const scopes = u?.scopes && typeof u.scopes === 'object' ? u.scopes : {};

      for (const [tRaw, sRaw] of Object.entries(scopes)) {
        const t = String(tRaw || '').trim();
        if (!allowedTargets.has(t)) continue;
        const s = String(sRaw || '').trim();
        const scope = allowedScopes.has(s) ? s : 'own';
        await pool.query(
          `INSERT INTO role_scopes (shop_id, role_id, target, scope)
           VALUES (?, ?, ?, ?)
           ON DUPLICATE KEY UPDATE scope = VALUES(scope)`,
          [sid, roleId, t, scope]
        );
      }
    }

    res.json({ message: 'Đã cập nhật phạm vi dữ liệu' });
  } catch (err) {
    next(err);
  }
});

// Get role permissions (roleId preferred; fallback supports role code)
router.get('/:roleId/permissions', auth, requireShop, requirePermission('settings', 'view'), async (req, res, next) => {
  try {
    const pool = await getPool();
    const r = await resolveRole(req, pool);
    if (!r) return res.status(404).json({ error: 'Không tìm thấy vai trò' });

    let rows = [];
    try {
      const [out] = await pool.query(
        'SELECT module, action, allowed FROM role_permissions WHERE shop_id = ? AND role_id = ?',
        [req.shopId, r.id]
      );
      rows = out;
    } catch (err) {
      // Legacy DB: role_permissions chưa có role_id
      if (!err || err.code !== 'ER_BAD_FIELD_ERROR') throw err;
      const [out] = await pool.query(
        'SELECT module, action, allowed FROM role_permissions WHERE shop_id = ? AND role = ?',
        [req.shopId, String(r.code || '').toLowerCase()]
      );
      rows = out;
    }

    const defaultPermissions = getDefaultPermissions(String(r.code || '').toLowerCase());
    const scopes = await getModuleScopes(pool, req.shopId, r.id);
    return res.json({ data: rows.length ? rows : defaultPermissions, role_id: r.id, role: r.code, module_scopes: scopes });
  } catch (err) { next(err); }
});

// Get module scopes (own vs shop) for a role
router.get('/:roleId/module-scopes', auth, requireShop, requirePermission('settings', 'view'), async (req, res, next) => {
  try {
    const pool = await getPool();
    const r = await resolveRole(req, pool);
    if (!r) return res.status(404).json({ error: 'Không tìm thấy vai trò' });
    const scopes = await getModuleScopes(pool, req.shopId, r.id);
    res.json({ data: scopes, role_id: r.id, role: r.code });
  } catch (err) {
    next(err);
  }
});

// Update module scopes for a role
router.put('/:roleId/module-scopes', auth, requireShop, requirePermission('settings', 'edit'), async (req, res, next) => {
  try {
    const pool = await getPool();
    const sid = req.shopId;
    const r = await resolveRole(req, pool);
    if (!r) return res.status(404).json({ error: 'Không tìm thấy vai trò' });

    const scopes = req.body?.scopes && typeof req.body.scopes === 'object' ? req.body.scopes : {};
    const allowedModules = new Set(['orders', 'customers', 'reports']);
    const ops = [];
    for (const [modRaw, scopeRaw] of Object.entries(scopes)) {
      const mod = String(modRaw || '').trim();
      if (!allowedModules.has(mod)) continue;
      const scope = String(scopeRaw || '').trim() === 'shop' ? 'shop' : 'own';
      ops.push([sid, r.id, mod, scope]);
    }

    // If table doesn't exist yet, fail with clear message
    try {
      await pool.query('SELECT 1 FROM role_module_scopes LIMIT 1');
    } catch (e) {
      if (e && e.code === 'ER_NO_SUCH_TABLE') {
        return res.status(400).json({ error: 'Chưa migrate role_module_scopes. Chạy migrations/025_role_module_scopes.sql' });
      }
      throw e;
    }

    for (const p of ops) {
      await pool.query(
        `INSERT INTO role_module_scopes (shop_id, role_id, module, scope)
         VALUES (?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE scope = VALUES(scope)`,
        p
      );
    }
    const out = await getModuleScopes(pool, sid, r.id);
    res.json({ message: 'Đã cập nhật phạm vi dữ liệu', data: out });
  } catch (err) {
    next(err);
  }
});

// Update role permissions
router.put('/:roleId/permissions', auth, requireShop, requirePermission('settings', 'edit'), async (req, res, next) => {
  try {
    const { permissions } = req.body;
    const pool = await getPool();
    const sid = req.shopId;

    const r = await resolveRole(req, pool);
    if (!r) return res.status(404).json({ error: 'Không tìm thấy vai trò' });

    let legacyMode = false;
    try {
      await pool.query('DELETE FROM role_permissions WHERE shop_id = ? AND role_id = ?', [sid, r.id]);
    } catch (err) {
      if (!err || err.code !== 'ER_BAD_FIELD_ERROR') throw err;
      legacyMode = true;
      await pool.query('DELETE FROM role_permissions WHERE shop_id = ? AND role = ?', [sid, String(r.code || '').toLowerCase()]);
    }

    for (const perm of permissions) {
      if (!legacyMode) {
        await pool.query(
          'INSERT INTO role_permissions (shop_id, role_id, module, action, allowed) VALUES (?, ?, ?, ?, ?)',
          [sid, r.id, perm.module, perm.action, perm.allowed ? 1 : 0]
        );
      } else {
        await pool.query(
          'INSERT INTO role_permissions (shop_id, role, module, action, allowed) VALUES (?, ?, ?, ?, ?)',
          [sid, String(r.code || '').toLowerCase(), perm.module, perm.action, perm.allowed ? 1 : 0]
        );
      }
    }
    
    res.json({ message: 'Cập nhật phân quyền thành công' });
  } catch (err) { next(err); }
});

// Update user role
router.put('/users/:id/role', auth, requireShop, requirePermission('employees', 'edit'), async (req, res, next) => {
  try {
    const roleId = parseInt(req.body.role_id, 10);
    if (!roleId) {
      return res.status(400).json({ error: 'Thiếu role_id' });
    }
    const pool = await getPool();
    const sid = req.shopId;
    const [[r]] = await pool.query('SELECT id FROM roles WHERE id = ?', [roleId]);
    if (!r) {
      return res.status(400).json({ error: 'Vai trò không hợp lệ' });
    }
    await pool.query('UPDATE user_shops SET role_id = ? WHERE user_id = ? AND shop_id = ?', [roleId, req.params.id, sid]);
    await pool.query('UPDATE users SET role_id = ? WHERE id = ?', [roleId, req.params.id]);
    res.json({ message: 'Cập nhật quyền thành công' });
  } catch (err) {
    next(err);
  }
});

module.exports = router;

