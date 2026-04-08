const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const authorize = require('../middleware/authorize');
const { getPool } = require('../config/db');

const CODE_RE = /^[a-z][a-z0-9_]{2,31}$/;

router.get('/', auth, authorize('admin'), async (req, res, next) => {
  try {
    const pool = await getPool();
    const [rows] = await pool.query(
      'SELECT id, code, name, description, can_access_admin, scope_own_data, is_system, created_at FROM roles ORDER BY is_system DESC, name ASC'
    );
    res.json({ data: rows });
  } catch (err) {
    next(err);
  }
});

router.post('/', auth, authorize('admin'), async (req, res, next) => {
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
    const [dup] = await pool.query('SELECT id FROM roles WHERE code = ?', [code]);
    if (dup.length) {
      return res.status(409).json({ error: 'Mã vai trò đã tồn tại' });
    }

    const [r] = await pool.query(
      'INSERT INTO roles (code, name, description, can_access_admin, scope_own_data, is_system) VALUES (?, ?, ?, ?, ?, 0)',
      [code, name, description || null, isAdmin ? 1 : 0, scope ? 1 : 0]
    );

    const [[row]] = await pool.query('SELECT * FROM roles WHERE id = ?', [r.insertId]);
    res.status(201).json({ data: row });
  } catch (err) {
    next(err);
  }
});

router.put('/:id', auth, authorize('admin'), async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    const { name, description, can_access_admin, scope_own_data } = req.body;
    const pool = await getPool();

    const [[existing]] = await pool.query('SELECT * FROM roles WHERE id = ?', [id]);
    if (!existing) {
      return res.status(404).json({ error: 'Không tìm thấy vai trò' });
    }

    const isAdmin = !!can_access_admin;
    const scope = isAdmin ? 0 : !!scope_own_data;

    await pool.query(
      'UPDATE roles SET name = ?, description = ?, can_access_admin = ?, scope_own_data = ? WHERE id = ?',
      [name, description || null, isAdmin ? 1 : 0, scope ? 1 : 0, id]
    );

    const [[row]] = await pool.query('SELECT * FROM roles WHERE id = ?', [id]);
    res.json({ data: row });
  } catch (err) {
    next(err);
  }
});

router.delete('/:id', auth, authorize('admin'), async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    const pool = await getPool();
    const [[existing]] = await pool.query('SELECT is_system FROM roles WHERE id = ?', [id]);
    if (!existing) {
      return res.status(404).json({ error: 'Không tìm thấy vai trò' });
    }
    if (existing.is_system) {
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
      await pool.query('DELETE FROM role_permissions WHERE role = ?', [rc.code]);
    }
    await pool.query('DELETE FROM roles WHERE id = ?', [id]);
    res.json({ message: 'Đã xóa vai trò' });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
