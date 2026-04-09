const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const router = express.Router();
const auth = require('../middleware/auth');
const { getPool } = require('../config/db');

// Username có thể là:
// - "username" thường: 3–32 ký tự, bắt đầu bằng chữ/số; cho phép . _ -
// - hoặc email (để dùng luôn dạng lan.sales@velocity.vn như seed)
const USERNAME_RE = /^[a-zA-Z0-9][a-zA-Z0-9._-]{2,31}$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function isValidUsernameOrEmail(login) {
  const s = String(login || '').trim().toLowerCase();
  return USERNAME_RE.test(s) || EMAIL_RE.test(s);
}

function normalizeUsername(s) {
  return String(s || '').trim().toLowerCase();
}

router.get('/me', auth, async (req, res, next) => {
  try {
    const pool = await getPool();
    const [rows] = await pool.query(
      `SELECT u.id, u.full_name, u.username, u.email, u.phone, u.commission_rate, u.department, u.position, u.join_date, u.avatar_url, u.is_active, u.created_at,
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
    res.json({ data: row });
  } catch (err) {
    next(err);
  }
});

router.post('/login', async (req, res, next) => {
  try {
    const password = req.body.password;
    const login = normalizeUsername(req.body.username ?? req.body.email ?? req.body.login ?? '');

    if (!login || !password) {
      return res.status(400).json({ error: 'Thiếu tên đăng nhập hoặc mật khẩu' });
    }

    const pool = await getPool();
    const [rows] = await pool.query(
      `SELECT u.id, u.full_name, u.username, u.email, u.password_hash, u.commission_rate, u.is_active,
              r.id AS role_id, r.code AS role, r.name AS role_name, r.can_access_admin, r.scope_own_data
       FROM users u
       JOIN roles r ON u.role_id = r.id
       WHERE u.username = ? OR u.email = ?`,
      [login, login]
    );

    console.log('Login request:', login, 'found:', rows.length);

    if (rows.length === 0) {
      return res.status(401).json({ error: 'Tên đăng nhập hoặc mật khẩu không đúng' });
    }

    const user = rows[0];

    if (!user.is_active) {
      return res.status(403).json({ error: 'Tài khoản đã bị khóa' });
    }

    const isValid = await bcrypt.compare(password, user.password_hash);

    if (!isValid) {
      return res.status(401).json({ error: 'Tên đăng nhập hoặc mật khẩu không đúng' });
    }

    const payload = {
      id: user.id,
      email: user.email,
      username: user.username,
      role: user.role,
      role_id: user.role_id,
      role_name: user.role_name,
      full_name: user.full_name,
      can_access_admin: !!user.can_access_admin,
      scope_own_data: !!user.scope_own_data,
    };

    const token = jwt.sign(payload, process.env.JWT_SECRET, {
      expiresIn: process.env.JWT_EXPIRES_IN || '7d',
    });

    res.json({
      token,
      user: {
        id: user.id,
        full_name: user.full_name,
        username: user.username,
        email: user.email,
        role: user.role,
        role_id: user.role_id,
        role_name: user.role_name,
        can_access_admin: !!user.can_access_admin,
        scope_own_data: !!user.scope_own_data,
        commission_rate: user.commission_rate,
      },
    });
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

    const token = jwt.sign(payload, process.env.JWT_SECRET, {
      expiresIn: process.env.JWT_EXPIRES_IN || '7d',
    });

    res.status(201).json({
      token,
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
