const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const requireShop = require('../middleware/requireShop');
const requirePermission = require('../middleware/requirePermission');
const { getPool } = require('../config/db');

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
  return [
    { module: 'dashboard', action: 'view', allowed: true },
    { module: 'orders', action: 'view', allowed: true },
    { module: 'orders', action: 'create', allowed: true },
    { module: 'orders', action: 'edit', allowed: true },
    { module: 'orders', action: 'delete', allowed: false },
    { module: 'customers', action: 'view', allowed: true },
    { module: 'customers', action: 'create', allowed: true },
    { module: 'customers', action: 'edit', allowed: true },
    { module: 'customers', action: 'delete', allowed: false },
    { module: 'reports', action: 'view', allowed: true },
    { module: 'products', action: 'view', allowed: true },
  ];
}

function getDefaultPermissions(roleCode) {
  const modules = ['dashboard', 'employees', 'products', 'customers', 'orders', 'inventory', 'reports', 'settings'];
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
    return res.json({ data: rows.length ? rows : defaultPermissions, role_id: r.id, role: r.code });
  } catch (err) { next(err); }
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
