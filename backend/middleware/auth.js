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

    // Backward compatible: old tokens may not carry can_access_admin/scope_own_data (or role after migration 007).
    if (typeof decoded.can_access_admin !== 'boolean' || typeof decoded.scope_own_data !== 'boolean') {
      try {
        const pool = await getPool();
        const [[row]] = await pool.query(
          `SELECT r.code as role, r.name as role_name, r.can_access_admin, r.scope_own_data
           FROM users u
           JOIN roles r ON u.role_id = r.id
           WHERE u.id = ?`,
          [decoded.id]
        );
        if (row) {
          decoded.role = row.role; // keep legacy field for existing checks
          decoded.role_name = row.role_name;
          decoded.can_access_admin = !!row.can_access_admin;
          decoded.scope_own_data = !!row.scope_own_data;
        } else {
          decoded.can_access_admin = false;
          decoded.scope_own_data = true;
        }
      } catch {
        // Fallback: best effort infer if role exists in token
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
