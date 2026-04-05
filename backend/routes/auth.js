const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const router = express.Router();
const auth = require('../middleware/auth');
const { getPool } = require('../config/db');

router.get('/me', auth, async (req, res, next) => {
  try {
    const pool = await getPool();
    const [rows] = await pool.query(
      'SELECT id, full_name, email, phone, role, commission_rate, department, position, join_date, avatar_url, is_active, created_at FROM users WHERE id = ?',
      [req.user.id]
    );
    if (rows.length === 0) return res.status(404).json({ error: 'Không tìm thấy người dùng' });
    res.json({ data: rows[0] });
  } catch (err) { next(err); }
});

router.post('/login', async (req, res, next) => {
  try {
    const { email, password } = req.body;
    console.log('Login request:', email);

    if (!email || !password) {
      return res.status(400).json({ error: 'Thiếu email hoặc password' });
    }

    const pool = await getPool();
    const [rows] = await pool.query(
      'SELECT id, full_name, email, password_hash, role, commission_rate, is_active FROM users WHERE email = ?',
      [email]
    );

    console.log('Found users:', rows.length);

    if (rows.length === 0) {
      return res.status(401).json({ error: 'Email hoặc password không đúng' });
    }

    const user = rows[0];

    if (!user.is_active) {
      return res.status(403).json({ error: 'Tài khoản đã bị khóa' });
    }

    const isValid = await bcrypt.compare(password, user.password_hash);

    if (!isValid) {
      return res.status(401).json({ error: 'Email hoặc password không đúng' });
    }

    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role, full_name: user.full_name },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    res.json({
      token,
      user: {
        id: user.id,
        full_name: user.full_name,
        email: user.email,
        role: user.role,
        commission_rate: user.commission_rate
      }
    });
  } catch (err) {
    next(err);
  }
});

router.post('/register', async (req, res, next) => {
  try {
    const { full_name, email, password, phone } = req.body;

    if (!full_name || !email || !password) {
      return res.status(400).json({ error: 'Thiếu thông tin bắt buộc' });
    }

    const pool = await getPool();

    const [existing] = await pool.query('SELECT id FROM users WHERE email = ?', [email]);
    if (existing.length > 0) {
      return res.status(409).json({ error: 'Email đã tồn tại' });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const [result] = await pool.query(
      'INSERT INTO users (full_name, email, password_hash, phone, role, is_active) VALUES (?, ?, ?, ?, "sales", 1)',
      [full_name, email, passwordHash, phone || null]
    );

    const token = jwt.sign(
      { id: result.insertId, email, role: 'sales', full_name },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    res.status(201).json({
      token,
      user: {
        id: result.insertId,
        full_name,
        email,
        role: 'sales'
      }
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
