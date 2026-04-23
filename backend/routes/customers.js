const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const requireShop = require('../middleware/requireShop');
const authorize = require('../middleware/authorize');
const { requireFeature } = require('../middleware/requireFeature');
const { getPool } = require('../config/db');
const { normalizeCustomerBirthday } = require('../utils/customerBirthday');
const { getScope } = require('../utils/scope');

async function loadUserGroupIds(pool, shopId, userId) {
  const [rows] = await pool.query(
    `SELECT ug.group_id
     FROM user_groups ug
     JOIN groups g ON g.id = ug.group_id
     WHERE ug.user_id = ? AND g.shop_id = ? AND g.is_active = 1`,
    [userId, shopId]
  );
  return rows.map((r) => Number(r.group_id)).filter((n) => Number.isFinite(n) && n > 0);
}

async function assertCanViewOrder(pool, req, orderId) {
  const [rows] = await pool.query(
    'SELECT id, shop_id, group_id, salesperson_id, customer_id FROM orders WHERE id = ? AND shop_id = ?',
    [orderId, req.shopId]
  );
  if (!rows.length) {
    const err = new Error('Không tìm thấy đơn hàng');
    err.status = 404;
    throw err;
  }
  const order = rows[0];

  const scope = await getScope(req, 'orders');
  if (scope === 'own' && order.salesperson_id !== req.user.id) {
    const [[ov]] = await pool.query(
      `SELECT 1 as ok
       FROM commissions c
       WHERE c.order_id = ? AND c.user_id = ? AND c.type = 'override' AND c.shop_id = ?
       LIMIT 1`,
      [order.id, req.user.id, req.shopId]
    );
    if (!ov?.ok) {
      const err = new Error('Không có quyền xem đơn hàng này');
      err.status = 403;
      throw err;
    }
  }
  if (scope === 'group') {
    const gids = await loadUserGroupIds(pool, req.shopId, req.user.id);
    if (!gids.length || !gids.includes(Number(order.group_id))) {
      const err = new Error('Không có quyền xem đơn hàng này');
      err.status = 403;
      throw err;
    }
  }
  return order;
}

async function loadUserIdsInGroups(pool, shopId, groupIds) {
  if (!groupIds || groupIds.length === 0) return [];
  const placeholders = groupIds.map(() => '?').join(',');
  const [rows] = await pool.query(
    `SELECT DISTINCT ug.user_id
     FROM user_groups ug
     JOIN groups g ON g.id = ug.group_id
     JOIN user_shops us ON us.user_id = ug.user_id AND us.shop_id = ?
     WHERE g.shop_id = ?
       AND ug.group_id IN (${placeholders})`,
    [shopId, shopId, ...groupIds]
  );
  return rows.map((r) => Number(r.user_id)).filter((n) => Number.isFinite(n) && n > 0);
}

/** Chỉ gán NV khi tồn tại trong users — tránh ER_NO_REFERENCED_ROW_2 (id lỗi / localStorage cũ) */
async function resolveAssignedEmployeeId(pool, raw) {
  if (raw == null || raw === '') return null;
  const id = parseInt(String(raw), 10);
  if (Number.isNaN(id) || id < 1) return null;
  const [rows] = await pool.query('SELECT id FROM users WHERE id = ? LIMIT 1', [id]);
  return rows.length ? id : null;
}

router.get('/', auth, requireShop, requireFeature('customers.list'), async (req, res, next) => {
  try {
    const pool = await getPool();
    const { search, tier, page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

    let query = 'SELECT c.*, u.full_name as assigned_employee_name FROM customers c LEFT JOIN users u ON c.assigned_employee_id = u.id WHERE c.shop_id = ?';
    let countQuery = 'SELECT COUNT(*) as total FROM customers WHERE shop_id = ?';
    const params = [req.shopId];

    const scope = await getScope(req, 'customers');
    if (scope === 'own') {
      query += ' AND (created_by = ? OR assigned_employee_id = ?)';
      countQuery += ' AND (created_by = ? OR assigned_employee_id = ?)';
      params.push(req.user.id, req.user.id);
    } else if (scope === 'group') {
      const gids = await loadUserGroupIds(pool, req.shopId, req.user.id);
      const uids = await loadUserIdsInGroups(pool, req.shopId, gids);
      if (!uids.length) {
        query += ' AND 1=0';
        countQuery += ' AND 1=0';
      } else {
        const placeholders = uids.map(() => '?').join(',');
        query += ` AND (created_by IN (${placeholders}) OR assigned_employee_id IN (${placeholders}))`;
        countQuery += ` AND (created_by IN (${placeholders}) OR assigned_employee_id IN (${placeholders}))`;
        params.push(...uids, ...uids);
      }
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
    // countQuery uses same params without LIMIT/OFFSET
    const countParams = params.slice(0, params.length - 2);
    const [countRows] = await pool.query(countQuery, countParams);

    res.json({ data: rows, total: countRows[0].total, page: parseInt(page), limit: parseInt(limit) });
  } catch (err) {
    next(err);
  }
});

router.get('/suggest', auth, requireShop, requireFeature('customers.list'), async (req, res, next) => {
  try {
    const { q, order_id } = req.query;
    const pool = await getPool();

    let query = 'SELECT id, name, phone, email, tier, address, city, district, ward FROM customers WHERE shop_id = ?';
    const params = [req.shopId];

    // Nếu đang sửa đơn: bám theo salesperson của đơn để lọc KH
    // (tránh bám theo user login khiến dropdown sai khi sửa đơn của người khác)
    let scopeUserId = req.user.id;
    if (order_id != null && String(order_id).trim() !== '') {
      const oid = parseInt(String(order_id), 10);
      if (Number.isFinite(oid) && oid > 0) {
        const order = await assertCanViewOrder(pool, req, oid);
        scopeUserId = Number(order.salesperson_id) || scopeUserId;
      }
    }

    const scope = await getScope(req, 'customers');
    if (scope === 'own') {
      query += ' AND (created_by = ? OR assigned_employee_id = ?)';
      params.push(scopeUserId, scopeUserId);
    } else if (scope === 'group') {
      const gids = await loadUserGroupIds(pool, req.shopId, scopeUserId);
      const uids = await loadUserIdsInGroups(pool, req.shopId, gids);
      if (!uids.length) {
        query += ' AND 1=0';
      } else {
        const placeholders = uids.map(() => '?').join(',');
        query += ` AND (created_by IN (${placeholders}) OR assigned_employee_id IN (${placeholders}))`;
        params.push(...uids, ...uids);
      }
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

router.get('/:id', auth, requireShop, requireFeature('customers.view'), async (req, res, next) => {
  try {
    const pool = await getPool();
    const { order_id } = req.query;

    const [rows] = await pool.query(
      'SELECT c.*, u.full_name as assigned_employee_name FROM customers c LEFT JOIN users u ON c.assigned_employee_id = u.id WHERE c.id = ? AND c.shop_id = ?',
      [req.params.id, req.shopId]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Không tìm thấy khách hàng' });
    }

    // Nếu có order_id: cho phép xem KH đúng của đơn đang sửa, miễn là user có quyền xem đơn đó.
    if (order_id != null && String(order_id).trim() !== '') {
      const oid = parseInt(String(order_id), 10);
      if (Number.isFinite(oid) && oid > 0) {
        const order = await assertCanViewOrder(pool, req, oid);
        if (String(order.customer_id) === String(rows[0].id)) {
          return res.json({ data: rows[0] });
        }
      }
    }

    const scope = await getScope(req, 'customers');
    if (scope === 'own' && rows[0].created_by !== req.user.id && rows[0].assigned_employee_id !== req.user.id) {
      return res.status(403).json({ error: 'Không có quyền xem khách hàng này' });
    }
    if (scope === 'group') {
      const gids = await loadUserGroupIds(pool, req.shopId, req.user.id);
      const uids = await loadUserIdsInGroups(pool, req.shopId, gids);
      if (!uids.length || (!uids.includes(Number(rows[0].created_by)) && !uids.includes(Number(rows[0].assigned_employee_id)))) {
        return res.status(403).json({ error: 'Không có quyền xem khách hàng này' });
      }
    }

    res.json({ data: rows[0] });
  } catch (err) {
    next(err);
  }
});

router.post('/', auth, requireShop, requireFeature('customers.create'), async (req, res, next) => {
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

router.put('/:id', auth, requireShop, requireFeature('customers.edit'), async (req, res, next) => {
  try {
    const pool = await getPool();

    const scope = await getScope(req, 'customers');
    if (scope === 'own') {
      const [existing] = await pool.query('SELECT created_by, assigned_employee_id FROM customers WHERE id = ? AND shop_id = ?', [req.params.id, req.shopId]);
      if (existing.length === 0 || (existing[0].created_by !== req.user.id && existing[0].assigned_employee_id !== req.user.id)) {
        return res.status(403).json({ error: 'Không có quyền sửa khách hàng này' });
      }
    }
    if (scope === 'group') {
      const [existing] = await pool.query('SELECT created_by, assigned_employee_id FROM customers WHERE id = ? AND shop_id = ?', [req.params.id, req.shopId]);
      if (existing.length === 0) return res.status(404).json({ error: 'Không tìm thấy khách hàng' });
      const gids = await loadUserGroupIds(pool, req.shopId, req.user.id);
      const uids = await loadUserIdsInGroups(pool, req.shopId, gids);
      if (!uids.length || (!uids.includes(Number(existing[0].created_by)) && !uids.includes(Number(existing[0].assigned_employee_id)))) {
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

router.delete('/:id', auth, requireShop, requireFeature('customers.delete'), async (req, res, next) => {
  try {
    const pool = await getPool();
    await pool.query('DELETE FROM customers WHERE id = ? AND shop_id = ?', [req.params.id, req.shopId]);
    res.json({ message: 'Xóa khách hàng thành công' });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
