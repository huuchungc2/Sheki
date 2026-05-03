const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const requireShop = require('../middleware/requireShop');
const requirePermission = require('../middleware/requirePermission');
const { getPool } = require('../config/db');
const { FEATURE_KEYS } = require('../rbac/features');
const { defaultFeaturePermissions } = require('../rbac/defaults');
const { syncModulePermissionsFromFeatures } = require('../services/rolePermissionSync');

const CODE_RE = /^[a-z][a-z0-9_]{2,31}$/;

async function getSalesRoleId(pool) {
  try {
    const [[r]] = await pool.query("SELECT id FROM roles WHERE code = 'sales' AND shop_id = 0 LIMIT 1");
    return r?.id || null;
  } catch (e) {
    if (!e || e.code !== 'ER_BAD_FIELD_ERROR') throw e;
    const [[r]] = await pool.query("SELECT id FROM roles WHERE code = 'sales' LIMIT 1");
    return r?.id || null;
  }
}

async function getAdminRoleId(pool) {
  try {
    const [[r]] = await pool.query("SELECT id FROM roles WHERE code = 'admin' AND shop_id = 0 LIMIT 1");
    return r?.id || null;
  } catch (e) {
    if (!e || e.code !== 'ER_BAD_FIELD_ERROR') throw e;
    const [[r]] = await pool.query("SELECT id FROM roles WHERE code = 'admin' LIMIT 1");
    return r?.id || null;
  }
}

/**
 * Khi tạo role mới: seed `role_permissions` cho shop hiện tại để `requirePermission` không 403 "im lặng".
 * - Admin-role: copy theo template shop_id=1 của role admin
 * - Role khác: copy theo template shop_id=1 của role sales (mặc định vận hành giống sales)
 */
async function seedRolePermissionsForNewRole(pool, shopId, newRoleId, isAdminRole) {
  if (!shopId || !newRoleId) return;
  const adminId = await getAdminRoleId(pool);
  const salesId = await getSalesRoleId(pool);
  const templateRoleId = isAdminRole ? adminId : salesId;
  if (!templateRoleId) return;

  try {
    await pool.query(
      `INSERT INTO role_permissions (shop_id, role_id, role, module, action, allowed)
       SELECT ?, ?, rp.role, rp.module, rp.action, rp.allowed
       FROM role_permissions rp
       WHERE rp.shop_id = 1 AND rp.role_id = ?
       ON DUPLICATE KEY UPDATE allowed = VALUES(allowed)`,
      [shopId, newRoleId, templateRoleId]
    );
    return;
  } catch (e) {
    if (!e || e.code !== 'ER_BAD_FIELD_ERROR') throw e;
  }

  const [[tpl]] = await pool.query('SELECT code FROM roles WHERE id = ? LIMIT 1', [templateRoleId]);
  const [[nr]] = await pool.query('SELECT code FROM roles WHERE id = ? LIMIT 1', [newRoleId]);
  const tplCode = String(tpl?.code || '').toLowerCase();
  const nrCode = String(nr?.code || '').toLowerCase();
  if (!tplCode || !nrCode) return;

  await pool.query(
    `INSERT INTO role_permissions (shop_id, role, module, action, allowed)
     SELECT ?, ?, rp.module, rp.action, rp.allowed
     FROM role_permissions rp
     WHERE rp.shop_id = 1 AND rp.role = ?
     ON DUPLICATE KEY UPDATE allowed = VALUES(allowed)`,
    [shopId, nrCode, tplCode]
  );
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

async function seedRoleFeaturePermissionsForNewRole(pool, shopId, newRoleId, roleLike) {
  if (!shopId || !newRoleId) return;
  const has = await tableExists(pool, 'role_feature_permissions');
  if (!has) return;
  const defaults = defaultFeaturePermissions(roleLike);
  const rowsToInsert = FEATURE_KEYS.map((k) => [shopId, newRoleId, k, defaults[k] ? 1 : 0]);
  await pool.query('DELETE FROM role_feature_permissions WHERE shop_id = ? AND role_id = ?', [shopId, newRoleId]);
  if (rowsToInsert.length) {
    await pool.query(
      'INSERT INTO role_feature_permissions (shop_id, role_id, feature_key, allowed) VALUES ?',
      [rowsToInsert]
    );
  }
  await syncModulePermissionsFromFeatures(pool, shopId, newRoleId, defaults);
}

router.get('/', auth, requireShop, requirePermission('settings', 'view'), async (req, res, next) => {
  try {
    const pool = await getPool();
    let rows = [];
    try {
      const [r] = await pool.query(
        `SELECT id, shop_id, code, name, description, can_access_admin, scope_own_data, is_system, created_at
         FROM roles
         WHERE shop_id IN (0, ?)
         ORDER BY is_system DESC, name ASC`,
        [req.shopId]
      );
      rows = r;
    } catch (e) {
      if (!e || e.code !== 'ER_BAD_FIELD_ERROR') throw e;
      const [r] = await pool.query(
        'SELECT id, code, name, description, can_access_admin, scope_own_data, is_system, created_at FROM roles ORDER BY is_system DESC, name ASC'
      );
      rows = r;
    }
    res.json({ data: rows });
  } catch (err) {
    next(err);
  }
});

router.post('/', auth, requireShop, requirePermission('settings', 'edit'), async (req, res, next) => {
  try {
    const { name, description, can_access_admin, scope_own_data } = req.body;
    let code = String(req.body.code || '').trim().toLowerCase();
    if (!name || !code) {
      return res.status(400).json({ error: 'Thiếu tên hoặc mã vai trò' });
    }
    if (!CODE_RE.test(code)) {
      return res.status(400).json({ error: 'Mã vai trò: 3–32 ký tự, bắt đầu bằng chữ, chỉ a-z, 0-9, _' });
    }
    const isAdmin = !!can_access_admin;
    const scope = isAdmin ? 0 : !!scope_own_data;

    const pool = await getPool();
    try {
      const [dup] = await pool.query('SELECT id FROM roles WHERE code = ? AND shop_id IN (0, ?)', [code, req.shopId]);
      if (dup.length) {
        return res.status(409).json({ error: 'Mã vai trò đã tồn tại trong shop hoặc là vai trò hệ thống' });
      }
    } catch (e) {
      if (!e || e.code !== 'ER_BAD_FIELD_ERROR') throw e;
      const [dup] = await pool.query('SELECT id FROM roles WHERE code = ?', [code]);
      if (dup.length) {
        return res.status(409).json({ error: 'Mã vai trò đã tồn tại' });
      }
    }

    let r;
    try {
      [r] = await pool.query(
        'INSERT INTO roles (shop_id, code, name, description, can_access_admin, scope_own_data, is_system) VALUES (?, ?, ?, ?, ?, ?, 0)',
        [req.shopId, code, name, description || null, isAdmin ? 1 : 0, scope ? 1 : 0]
      );
    } catch (e) {
      if (!e || e.code !== 'ER_BAD_FIELD_ERROR') throw e;
      [r] = await pool.query(
        'INSERT INTO roles (code, name, description, can_access_admin, scope_own_data, is_system) VALUES (?, ?, ?, ?, ?, 0)',
        [code, name, description || null, isAdmin ? 1 : 0, scope ? 1 : 0]
      );
    }

    await seedRolePermissionsForNewRole(pool, req.shopId, r.insertId, isAdmin);
    await seedRoleFeaturePermissionsForNewRole(pool, req.shopId, r.insertId, {
      code,
      can_access_admin: isAdmin ? 1 : 0,
    });

    const [[row]] = await pool.query('SELECT * FROM roles WHERE id = ?', [r.insertId]);
    res.status(201).json({ data: row });
  } catch (err) {
    next(err);
  }
});

router.put('/:id', auth, requireShop, requirePermission('settings', 'edit'), async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    const { name, description, can_access_admin, scope_own_data } = req.body;
    const pool = await getPool();

    let existing = null;
    try {
      const [[ex]] = await pool.query('SELECT * FROM roles WHERE id = ? AND shop_id IN (0, ?)', [id, req.shopId]);
      existing = ex || null;
    } catch (e) {
      if (!e || e.code !== 'ER_BAD_FIELD_ERROR') throw e;
      const [[ex]] = await pool.query('SELECT * FROM roles WHERE id = ?', [id]);
      existing = ex || null;
    }
    if (!existing) {
      return res.status(404).json({ error: 'Không tìm thấy vai trò' });
    }
    if (existing.shop_id === 0 || existing.is_system) {
      return res.status(403).json({ error: 'Không thể sửa vai trò hệ thống' });
    }

    const isAdmin = !!can_access_admin;
    const scope = isAdmin ? 0 : !!scope_own_data;

    try {
      await pool.query(
        'UPDATE roles SET name = ?, description = ?, can_access_admin = ?, scope_own_data = ? WHERE id = ?',
        [name, description || null, isAdmin ? 1 : 0, scope ? 1 : 0, id]
      );
    } catch (e) {
      if (!e || e.code !== 'ER_BAD_FIELD_ERROR') throw e;
      await pool.query(
        'UPDATE roles SET name = ?, description = ?, can_access_admin = ?, scope_own_data = ? WHERE id = ?',
        [name, description || null, isAdmin ? 1 : 0, scope ? 1 : 0, id]
      );
    }

    const [[row]] = await pool.query('SELECT * FROM roles WHERE id = ?', [id]);
    res.json({ data: row });
  } catch (err) {
    next(err);
  }
});

router.delete('/:id', auth, requireShop, requirePermission('settings', 'delete'), async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    const pool = await getPool();
    let existing = null;
    try {
      const [[ex]] = await pool.query('SELECT id, shop_id, is_system FROM roles WHERE id = ? AND shop_id IN (0, ?)', [id, req.shopId]);
      existing = ex || null;
    } catch (e) {
      if (!e || e.code !== 'ER_BAD_FIELD_ERROR') throw e;
      const [[ex]] = await pool.query('SELECT is_system FROM roles WHERE id = ?', [id]);
      existing = ex || null;
    }
    if (!existing) {
      return res.status(404).json({ error: 'Không tìm thấy vai trò' });
    }
    if (existing.is_system || existing.shop_id === 0) {
      return res.status(403).json({ error: 'Không thể xóa vai trò hệ thống' });
    }

    const [[salesRole]] = await pool.query('SELECT id FROM roles WHERE code = ?', ['sales']);
    const fallbackId = salesRole?.id || id;

    const [used] = await pool.query('SELECT COUNT(*) AS c FROM users WHERE role_id = ?', [id]);
    if (used[0].c > 0) {
      await pool.query('UPDATE users SET role_id = ? WHERE role_id = ?', [fallbackId, id]);
    }

    const [[rc]] = await pool.query('SELECT code FROM roles WHERE id = ?', [id]);
    if (rc?.code) {
      await pool.query(
        `DELETE rp
         FROM role_permissions rp
         WHERE rp.shop_id = ? AND (rp.role_id = ? OR rp.role = ?)`,
        [req.shopId, id, rc.code]
      );
    }
    await pool.query('DELETE FROM roles WHERE id = ?', [id]);
    res.json({ message: 'Đã xóa vai trò' });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
