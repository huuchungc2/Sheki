const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const authorize = require('../middleware/authorize');
const { getPool } = require('../config/db');

// Get all roles
router.get('/', auth, authorize('admin'), async (req, res, next) => {
  try {
    const pool = await getPool();
    const [rows] = await pool.query('SELECT id, full_name, email, phone, role, department, position, commission_rate, salary, join_date, is_active, created_at FROM users ORDER BY role, full_name');
    
    // Group by role
    const roleMap = {};
    rows.forEach(u => {
      if (!roleMap[u.role]) {
        roleMap[u.role] = { role: u.role, users: [] };
      }
      roleMap[u.role].users.push(u);
    });
    
    res.json({ data: Object.values(roleMap) });
  } catch (err) { next(err); }
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
    const { role } = req.body;
    const pool = await getPool();
    await pool.query('UPDATE users SET role = ? WHERE id = ?', [role, req.params.id]);
    res.json({ message: 'Cập nhật quyền thành công' });
  } catch (err) { next(err); }
});

function getDefaultPermissions(role) {
  const modules = ['dashboard', 'employees', 'products', 'customers', 'orders', 'inventory', 'reports', 'settings'];
  const permissions = [];
  
  if (role === 'admin') {
    modules.forEach(m => {
      ['view', 'create', 'edit', 'delete'].forEach(a => {
        permissions.push({ module: m, action: a, allowed: true });
      });
    });
  } else if (role === 'sales') {
    permissions.push(
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
    );
  }
  
  return permissions;
}

module.exports = router;
