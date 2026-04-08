const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const authorize = require('../middleware/authorize');
const { getPool } = require('../config/db');

// Nhóm nhân viên theo mã vai trò (roles.code)
router.get('/', auth, authorize('admin'), async (req, res, next) => {
  try {
    const pool = await getPool();
    const [rows] = await pool.query(
      `SELECT u.id, u.full_name, u.email, u.phone, u.department, u.position, u.commission_rate, u.salary, u.join_date, u.is_active, u.created_at,
              r.code AS role, r.name AS role_name, r.id AS role_id
       FROM users u
       JOIN roles r ON u.role_id = r.id
       ORDER BY r.code, u.full_name`
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

// Get role permissions
router.get('/:role/permissions', auth, authorize('admin'), async (req, res, next) => {
  try {
    const { role } = req.params;
    const pool = await getPool();
    const [rows] = await pool.query('SELECT * FROM role_permissions WHERE role = ?', [role]);
    
    const defaultPermissions = getDefaultPermissions(role);
    if (rows.length === 0) {
      res.json({ data: defaultPermissions });
    } else {
      res.json({ data: rows });
    }
  } catch (err) { next(err); }
});

// Update role permissions
router.put('/:role/permissions', auth, authorize('admin'), async (req, res, next) => {
  try {
    const { role } = req.params;
    const { permissions } = req.body;
    const pool = await getPool();
    
    await pool.query('DELETE FROM role_permissions WHERE role = ?', [role]);
    
    for (const perm of permissions) {
      await pool.query(
        'INSERT INTO role_permissions (role, module, action, allowed) VALUES (?, ?, ?, ?)',
        [role, perm.module, perm.action, perm.allowed ? 1 : 0]
      );
    }
    
    res.json({ message: 'Cập nhật phân quyền thành công' });
  } catch (err) { next(err); }
});

// Update user role
router.put('/users/:id/role', auth, authorize('admin'), async (req, res, next) => {
  try {
    const roleId = parseInt(req.body.role_id, 10);
    if (!roleId) {
      return res.status(400).json({ error: 'Thiếu role_id' });
    }
    const pool = await getPool();
    const [[r]] = await pool.query('SELECT id FROM roles WHERE id = ?', [roleId]);
    if (!r) {
      return res.status(400).json({ error: 'Vai trò không hợp lệ' });
    }
    await pool.query('UPDATE users SET role_id = ? WHERE id = ?', [roleId, req.params.id]);
    res.json({ message: 'Cập nhật quyền thành công' });
  } catch (err) {
    next(err);
  }
});

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

function getDefaultPermissions(role) {
  const modules = ['dashboard', 'employees', 'products', 'customers', 'orders', 'inventory', 'reports', 'settings'];
  const permissions = [];

  if (role === 'admin') {
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

module.exports = router;
