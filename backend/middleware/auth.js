const jwt = require('jsonwebtoken');
const { getPool } = require('../config/db');

async function auth(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Không có token' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Always load is_super_admin from DB (source of truth)
    try {
      const pool = await getPool();
      const [[urow]] = await pool.query('SELECT is_super_admin FROM users WHERE id = ? LIMIT 1', [decoded.id]);
      decoded.is_super_admin = !!urow?.is_super_admin;
    } catch {
      decoded.is_super_admin = !!decoded.is_super_admin;
    }

    if (decoded.is_super_admin) {
      decoded.role = 'super_admin';
      decoded.role_name = 'Super Admin';
      // Super admin is global; role_id depends on seeded roles, but keep stable fields for UI
      decoded.role_id = decoded.role_id || null;
      decoded.can_access_admin = true;
      decoded.scope_own_data = false;
      req.user = decoded;
      return next();
    }

    if (decoded.shop_id != null) {
      try {
        const pool = await getPool();
        const [[row]] = await pool.query(
          `SELECT us.role_id as role_id, r.code as role, r.name as role_name, r.can_access_admin, r.scope_own_data
           FROM user_shops us
           JOIN roles r ON us.role_id = r.id
           WHERE us.user_id = ? AND us.shop_id = ?`,
          [decoded.id, decoded.shop_id]
        );
        if (row) {
          decoded.role = row.role;
          decoded.role_name = row.role_name;
          decoded.role_id = row.role_id;
          decoded.can_access_admin = !!row.can_access_admin;
          decoded.scope_own_data = !!row.scope_own_data;
        }
      } catch {
        // fallback below
      }
    }

    if (typeof decoded.can_access_admin !== 'boolean' || typeof decoded.scope_own_data !== 'boolean') {
      try {
        const pool = await getPool();
        const [[row]] = await pool.query(
          `SELECT u.role_id as role_id, r.code as role, r.name as role_name, r.can_access_admin, r.scope_own_data
           FROM users u
           JOIN roles r ON u.role_id = r.id
           WHERE u.id = ?`,
          [decoded.id]
        );
        if (row) {
          decoded.role = row.role;
          decoded.role_name = row.role_name;
          decoded.role_id = row.role_id;
          decoded.can_access_admin = !!row.can_access_admin;
          decoded.scope_own_data = !!row.scope_own_data;
        } else {
          decoded.can_access_admin = false;
          decoded.scope_own_data = true;
        }
      } catch {
        if (typeof decoded.can_access_admin !== 'boolean') {
          decoded.can_access_admin = decoded.role === 'admin';
        }
        if (typeof decoded.scope_own_data !== 'boolean') {
          decoded.scope_own_data = !decoded.can_access_admin;
        }
      }
    }

    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Token không hợp lệ' });
  }
}

module.exports = auth;
