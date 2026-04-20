const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const requireShop = require('../middleware/requireShop');
const authorize = require('../middleware/authorize');
const { getPool } = require('../config/db');
const { normalizeCustomerBirthday } = require('../utils/customerBirthday');

/** Chỉ gán NV khi tồn tại trong users — tránh ER_NO_REFERENCED_ROW_2 (id lỗi / localStorage cũ) */
async function resolveAssignedEmployeeId(pool, raw) {
  if (raw == null || raw === '') return null;
  const id = parseInt(String(raw), 10);
  if (Number.isNaN(id) || id < 1) return null;
  const [rows] = await pool.query('SELECT id FROM users WHERE id = ? LIMIT 1', [id]);
  return rows.length ? id : null;
}

router.get('/', auth, requireShop, async (req, res, next) => {
  try {
    const pool = await getPool();
    const { search, tier, page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

    let query = 'SELECT c.*, u.full_name as assigned_employee_name FROM customers c LEFT JOIN users u ON c.assigned_employee_id = u.id WHERE c.shop_id = ?';
    let countQuery = 'SELECT COUNT(*) as total FROM customers WHERE shop_id = ?';
    const params = [req.shopId];

    if (req.user.scope_own_data) {
      query += ' AND (created_by = ? OR assigned_employee_id = ?)';
      countQuery += ' AND (created_by = ? OR assigned_employee_id = ?)';
      params.push(req.user.id, req.user.id);
    }

    if (search) {
      query += ' AND (c.name LIKE ? OR c.phone LIKE ? OR c.email LIKE ?)';
      countQuery += ' AND (name LIKE ? OR phone LIKE ? OR email LIKE ?)';
      const like = `%${search}%`;
      params.push(like, like, like);
    }

    if (tier) {
      query += ' AND c.tier = ?';
      countQuery += ' AND tier = ?';
      params.push(tier);
    }

    query += ' ORDER BY c.created_at DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), parseInt(offset));

    const [rows] = await pool.query(query, params);
    const [countRows] = await pool.query(countQuery, params.slice(0, req.user.scope_own_data ? -2 : -2));

    res.json({ data: rows, total: countRows[0].total, page: parseInt(page), limit: parseInt(limit) });
  } catch (err) {
    next(err);
  }
});

router.get('/suggest', auth, requireShop, async (req, res, next) => {
  try {
    const { q } = req.query;
    const pool = await getPool();

    let query = 'SELECT id, name, phone, email, tier, address, city, district, ward FROM customers WHERE shop_id = ?';
    const params = [req.shopId];

    // Sales chỉ thấy KH do mình tạo hoặc được gán cho mình
    if (req.user.scope_own_data) {
      query += ' AND (created_by = ? OR assigned_employee_id = ?)';
      params.push(req.user.id, req.user.id);
    }

    if (q) {
      query += ' AND (name LIKE ? OR phone LIKE ?)';
      const like = `%${q}%`;
      params.push(like, like);
    }

    query += ' ORDER BY created_at DESC LIMIT 50';

    const [rows] = await pool.query(query, params);
    res.json({ data: rows });
  } catch (err) {
    next(err);
  }
});

router.get('/:id', auth, requireShop, async (req, res, next) => {
  try {
    const pool = await getPool();
    const [rows] = await pool.query(
      'SELECT c.*, u.full_name as assigned_employee_name FROM customers c LEFT JOIN users u ON c.assigned_employee_id = u.id WHERE c.id = ? AND c.shop_id = ?',
      [req.params.id, req.shopId]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Không tìm thấy khách hàng' });
    }

    if (req.user.scope_own_data && rows[0].created_by !== req.user.id && rows[0].assigned_employee_id !== req.user.id) {
      return res.status(403).json({ error: 'Không có quyền xem khách hàng này' });
    }

    res.json({ data: rows[0] });
  } catch (err) {
    next(err);
  }
});

router.post('/', auth, requireShop, async (req, res, next) => {
  try {
    const { name, phone, email, address, city, district, ward, birthday, tier, source, assigned_employee_id, note } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Thiếu tên khách hàng' });
    }
    const cleanedPhone = String(phone || '').replace(/\D/g, '');
    if (!cleanedPhone) {
      return res.status(400).json({ error: 'Thiếu số điện thoại' });
    }
    if (cleanedPhone.length !== 10) {
      return res.status(400).json({ error: 'Số điện thoại phải có đúng 10 chữ số' });
    }
    if (!String(address || '').trim() || !String(city || '').trim() || !String(district || '').trim() || !String(ward || '').trim()) {
      return res.status(400).json({ error: 'Địa chỉ phải đầy đủ: Tỉnh/TP, Quận/Huyện, Phường/Xã, Số nhà/Đường' });
    }

    const pool = await getPool();

    const [[creatorRow]] = await pool.query('SELECT id FROM users WHERE id = ? LIMIT 1', [req.user.id]);
    if (!creatorRow) {
      return res.status(401).json({
        error: 'Tài khoản đăng nhập không còn trong hệ thống (created_by). Đăng xuất và đăng nhập lại.',
      });
    }

    const birthdayDb = normalizeCustomerBirthday(birthday);
    const assignDb = await resolveAssignedEmployeeId(pool, assigned_employee_id);

    const [result] = await pool.query(
      'INSERT INTO customers (shop_id, name, phone, email, address, city, district, ward, birthday, tier, source, assigned_employee_id, note, created_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [req.shopId, name, cleanedPhone, email || null, address, city, district, ward, birthdayDb, tier || 'new', source || null, assignDb, note != null ? note : null, req.user.id]
    );

    res.status(201).json({ id: result.insertId, message: 'Tạo khách hàng thành công' });
  } catch (err) {
    next(err);
  }
});

router.put('/:id', auth, requireShop, async (req, res, next) => {
  try {
    const pool = await getPool();

    if (req.user.scope_own_data) {
      const [existing] = await pool.query('SELECT created_by, assigned_employee_id FROM customers WHERE id = ? AND shop_id = ?', [req.params.id, req.shopId]);
      if (existing.length === 0 || (existing[0].created_by !== req.user.id && existing[0].assigned_employee_id !== req.user.id)) {
        return res.status(403).json({ error: 'Không có quyền sửa khách hàng này' });
      }
    }

    const { name, phone, email, address, city, district, ward, birthday, tier, source, assigned_employee_id, note } = req.body;
    if (!name) {
      return res.status(400).json({ error: 'Thiếu tên khách hàng' });
    }
    const cleanedPhone = String(phone || '').replace(/\D/g, '');
    if (!cleanedPhone) {
      return res.status(400).json({ error: 'Thiếu số điện thoại' });
    }
    if (cleanedPhone.length !== 10) {
      return res.status(400).json({ error: 'Số điện thoại phải có đúng 10 chữ số' });
    }
    if (!String(address || '').trim() || !String(city || '').trim() || !String(district || '').trim() || !String(ward || '').trim()) {
      return res.status(400).json({ error: 'Địa chỉ phải đầy đủ: Tỉnh/TP, Quận/Huyện, Phường/Xã, Số nhà/Đường' });
    }

    const birthdayDb = normalizeCustomerBirthday(birthday);
    const assignDb = await resolveAssignedEmployeeId(pool, assigned_employee_id);

    await pool.query(
      'UPDATE customers SET name = ?, phone = ?, email = ?, address = ?, city = ?, district = ?, ward = ?, birthday = ?, tier = ?, source = ?, assigned_employee_id = ?, note = ? WHERE id = ? AND shop_id = ?',
      [name, cleanedPhone, email || null, address, city, district, ward, birthdayDb, tier, source || null, assignDb, note != null ? note : null, req.params.id, req.shopId]
    );

    res.json({ message: 'Cập nhật khách hàng thành công' });
  } catch (err) {
    next(err);
  }
});

router.delete('/:id', auth, requireShop, authorize('admin'), async (req, res, next) => {
  try {
    const pool = await getPool();
    await pool.query('DELETE FROM customers WHERE id = ? AND shop_id = ?', [req.params.id, req.shopId]);
    res.json({ message: 'Xóa khách hàng thành công' });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
