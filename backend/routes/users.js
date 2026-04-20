const express = require('express');
const bcrypt = require('bcryptjs');
const router = express.Router();
const auth = require('../middleware/auth');
const requireShop = require('../middleware/requireShop');
const authorize = require('../middleware/authorize');
const { getPool } = require('../config/db');



// Admin: toàn bộ NV. Sales (scope_own_data): cần dropdown NV phụ trách ở form KH — không chỉ admin.
router.get('/', auth, requireShop, (req, res, next) => {
  if (req.user.can_access_admin || req.user.scope_own_data) return next();
  return res.status(403).json({ error: 'Không có quyền truy cập' });
}, async (req, res, next) => {
  try {
    const pool = await getPool();
    const { search, department, role, scoped, page = 1, limit = 20, active_only } = req.query;
    // Sales không được xem toàn bộ user (admin); luôn lọc scope_own_data như dropdown form KH
    const scopedEffective =
      !req.user.can_access_admin && req.user.scope_own_data ? '1' : scoped;
    const offset = (page - 1) * limit;

    let query = `SELECT u.id, u.full_name, u.username, u.email, u.phone, r.code AS role, r.name AS role_name, us.role_id,
      u.department, u.position, u.commission_rate, u.salary, u.join_date, u.avatar_url, u.city, u.district, u.is_active, u.created_at
      FROM users u
      INNER JOIN user_shops us ON us.user_id = u.id AND us.shop_id = ?
      JOIN roles r ON us.role_id = r.id WHERE 1=1`;
    let countQuery = 'SELECT COUNT(*) as total FROM users u INNER JOIN user_shops us ON us.user_id = u.id AND us.shop_id = ? JOIN roles r ON us.role_id = r.id WHERE 1=1';
    const params = [req.shopId];

    // Mặc định chỉ NV đang làm; active_only=all → tất cả; active_only=0 → chỉ đã nghỉ
    if (String(active_only) === 'all') {
      // không lọc is_active
    } else if (active_only === '0') {
      query += ' AND u.is_active = 0';
      countQuery += ' AND u.is_active = 0';
    } else {
      query += ' AND u.is_active = 1';
      countQuery += ' AND u.is_active = 1';
    }

    if (search) {
      query += ' AND (u.full_name LIKE ? OR u.username LIKE ? OR u.email LIKE ? OR u.phone LIKE ?)';
      countQuery += ' AND (u.full_name LIKE ? OR u.username LIKE ? OR u.email LIKE ? OR u.phone LIKE ?)';
      const like = `%${search}%`;
      params.push(like, like, like, like);
    }

    if (department) {
      query += ' AND u.department = ?';
      countQuery += ' AND u.department = ?';
      params.push(department);
    }

    if (role) {
      query += ' AND r.code = ?';
      countQuery += ' AND r.code = ?';
      params.push(role);
    }

    if (scopedEffective === '1' || scopedEffective === 'true') {
      query += ' AND r.scope_own_data = 1';
      countQuery += ' AND r.scope_own_data = 1';
    }

    query += ' ORDER BY u.created_at DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), parseInt(offset));

    const [rows] = await pool.query(query, params);
    const [countRows] = await pool.query(countQuery, params.slice(0, -2));

    res.json({ data: rows, total: countRows[0].total, page: parseInt(page), limit: parseInt(limit) });
  } catch (err) {
    next(err);
  }
});

// NOTE: `/me` phải nằm trước `/:id` để tránh bị match nhầm (id="me")
router.get('/me', auth, async (req, res, next) => {
  try {
    const pool = await getPool();
    const id = req.user.id;
    const [[row]] = await pool.query(
      'SELECT id, full_name, username, email, phone, department, position, join_date, address, city, district, is_active, is_super_admin FROM users WHERE id = ? LIMIT 1',
      [id]
    );
    if (!row) return res.status(404).json({ error: 'Không tìm thấy người dùng' });
    res.json({ data: row });
  } catch (err) {
    next(err);
  }
});

// Sales/self: cập nhật thông tin cá nhân (không đổi role, không đổi is_active)
// NOTE: Không requireShop — cho phép user chưa được gán shop vẫn sửa profile cơ bản.
router.put('/me', auth, async (req, res, next) => {
  try {
    const pool = await getPool();
    const id = req.user.id;
    const full_name = req.body?.full_name != null ? String(req.body.full_name).trim() : '';
    const phoneRaw = req.body?.phone != null ? String(req.body.phone) : '';
    const phone = phoneRaw.replace(/\D/g, '');
    const email = req.body?.email != null ? String(req.body.email).trim() : '';
    const department = req.body?.department != null ? String(req.body.department).trim() : null;
    const position = req.body?.position != null ? String(req.body.position).trim() : null;
    const address = req.body?.address != null ? String(req.body.address).trim() : null;
    const city = req.body?.city != null ? String(req.body.city).trim() : null;
    const district = req.body?.district != null ? String(req.body.district).trim() : null;
    const join_date_raw = req.body?.join_date != null ? String(req.body.join_date).trim().slice(0, 10) : '';
    const join_date = join_date_raw ? join_date_raw : null;

    if (!full_name) return res.status(400).json({ error: 'Thiếu họ tên' });
    if (phone && phone.length !== 10) return res.status(400).json({ error: 'Số điện thoại phải có đúng 10 chữ số' });
    if (email) {
      const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!EMAIL_RE.test(email)) return res.status(400).json({ error: 'Email không hợp lệ' });
    }
    if (join_date != null && !/^\d{4}-\d{2}-\d{2}$/.test(join_date)) {
      return res.status(400).json({ error: 'Ngày vào làm không hợp lệ (YYYY-MM-DD)' });
    }

    await pool.query(
      'UPDATE users SET full_name = ?, phone = ?, email = ?, department = ?, position = ?, join_date = ?, address = ?, city = ?, district = ? WHERE id = ?',
      [full_name, phone || null, email || null, department, position, join_date, address || null, city || null, district || null, id]
    );

    const [[row]] = await pool.query(
      'SELECT id, full_name, username, email, phone, department, position, join_date, address, city, district FROM users WHERE id = ? LIMIT 1',
      [id]
    );
    res.json({ message: 'Đã cập nhật', data: row });
  } catch (err) {
    next(err);
  }
});

router.get('/:id', auth, requireShop, async (req, res, next) => {
  try {
    const pool = await getPool();
    const [rows] = await pool.query(
      `SELECT u.id, u.full_name, u.username, u.email, u.phone, r.code AS role, r.name AS role_name, us.role_id,
        u.department, u.position, u.commission_rate, u.salary, u.join_date, u.avatar_url, u.address, u.city, u.district, u.postal_code, u.is_active, u.created_at
       FROM users u
       INNER JOIN user_shops us ON us.user_id = u.id AND us.shop_id = ?
       JOIN roles r ON us.role_id = r.id WHERE u.id = ?`,
      [req.shopId, req.params.id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Không tìm thấy nhân viên' });
    }

    res.json({ data: rows[0] });
  } catch (err) {
    next(err);
  }
});

// Self: lấy profile cơ bản (không phụ thuộc shop)
router.get('/me', auth, async (req, res, next) => {
  try {
    const pool = await getPool();
    const id = req.user.id;
    const [[row]] = await pool.query(
      'SELECT id, full_name, username, email, phone, department, position, join_date, address, city, district, is_active, is_super_admin FROM users WHERE id = ? LIMIT 1',
      [id]
    );
    if (!row) return res.status(404).json({ error: 'Không tìm thấy người dùng' });
    res.json({ data: row });
  } catch (err) {
    next(err);
  }
});

// Sales/self: cập nhật thông tin cá nhân (không đổi role, không đổi is_active)
// NOTE: Không requireShop — cho phép user chưa được gán shop vẫn sửa profile cơ bản.
router.put('/me', auth, async (req, res, next) => {
  try {
    const pool = await getPool();
    const id = req.user.id;
    const full_name = req.body?.full_name != null ? String(req.body.full_name).trim() : '';
    const phoneRaw = req.body?.phone != null ? String(req.body.phone) : '';
    const phone = phoneRaw.replace(/\D/g, '');
    const email = req.body?.email != null ? String(req.body.email).trim() : '';
    const department = req.body?.department != null ? String(req.body.department).trim() : null;
    const position = req.body?.position != null ? String(req.body.position).trim() : null;
    const address = req.body?.address != null ? String(req.body.address).trim() : null;
    const city = req.body?.city != null ? String(req.body.city).trim() : null;
    const district = req.body?.district != null ? String(req.body.district).trim() : null;
    const join_date_raw = req.body?.join_date != null ? String(req.body.join_date).trim().slice(0, 10) : '';
    const join_date = join_date_raw ? join_date_raw : null;

    if (!full_name) return res.status(400).json({ error: 'Thiếu họ tên' });
    if (phone && phone.length !== 10) return res.status(400).json({ error: 'Số điện thoại phải có đúng 10 chữ số' });
    if (email) {
      const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!EMAIL_RE.test(email)) return res.status(400).json({ error: 'Email không hợp lệ' });
    }
    if (join_date != null && !/^\d{4}-\d{2}-\d{2}$/.test(join_date)) {
      return res.status(400).json({ error: 'Ngày vào làm không hợp lệ (YYYY-MM-DD)' });
    }

    await pool.query(
      'UPDATE users SET full_name = ?, phone = ?, email = ?, department = ?, position = ?, join_date = ?, address = ?, city = ?, district = ? WHERE id = ?',
      [full_name, phone || null, email || null, department, position, join_date, address || null, city || null, district || null, id]
    );

    const [[row]] = await pool.query(
      'SELECT id, full_name, username, email, phone, department, position, join_date, address, city, district FROM users WHERE id = ? LIMIT 1',
      [id]
    );
    res.json({ message: 'Đã cập nhật', data: row });
  } catch (err) {
    next(err);
  }
});

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

router.post('/', auth, requireShop, authorize('admin'), async (req, res, next) => {
  try {
    const { full_name, email, password, phone, department, position, commission_rate, salary, join_date, address, city, district, postal_code } = req.body;
    const username = normalizeUsername(req.body.username);
    let roleId = parseInt(req.body.role_id, 10);

    if (!full_name || !email || !password || !username) {
      return res.status(400).json({ error: 'Thiếu họ tên, tên đăng nhập, email hoặc mật khẩu' });
    }

    if (!isValidUsernameOrEmail(username)) {
      return res.status(400).json({ error: 'Tên đăng nhập: có thể dùng username (3–32 ký tự, bắt đầu bằng chữ/số; cho phép . _ -) hoặc dùng email.' });
    }

    const pool = await getPool();

    if (!roleId) {
      const [[sr]] = await pool.query('SELECT id FROM roles WHERE code = ?', ['sales']);
      roleId = sr?.id;
    }
    if (!roleId) {
      return res.status(400).json({ error: 'Thiếu vai trò (role_id)' });
    }
    const [[roleRow]] = await pool.query('SELECT id FROM roles WHERE id = ?', [roleId]);
    if (!roleRow) {
      return res.status(400).json({ error: 'Vai trò không hợp lệ' });
    }

    const [existingEmail] = await pool.query('SELECT id FROM users WHERE email = ?', [email]);
    if (existingEmail.length > 0) {
      return res.status(409).json({ error: 'Email đã tồn tại' });
    }

    const [existingUser] = await pool.query('SELECT id FROM users WHERE username = ?', [username]);
    if (existingUser.length > 0) {
      return res.status(409).json({ error: 'Tên đăng nhập đã được sử dụng' });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const [result] = await pool.query(
      `INSERT INTO users (full_name, username, email, password_hash, phone, role_id, department, position, commission_rate, salary, join_date, address, city, district, postal_code, is_active)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)`,
      [full_name, username, email, passwordHash, phone, roleId, department, position, commission_rate || 5.00, salary || 0, join_date, address, city, district, postal_code]
    );
    const newUserId = result.insertId;
    await pool.query(
      'INSERT INTO user_shops (user_id, shop_id, role_id) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE role_id = VALUES(role_id)',
      [newUserId, req.shopId, roleId]
    );

    res.status(201).json({ id: newUserId, message: 'Tạo nhân viên thành công' });
  } catch (err) {
    next(err);
  }
});

router.put('/:id', auth, requireShop, authorize('admin'), async (req, res, next) => {
  try {
    const { full_name, email, phone, department, position, commission_rate, salary, join_date, address, city, district, postal_code, is_active, password } = req.body;
    const username = normalizeUsername(req.body.username);
    const roleId = parseInt(req.body.role_id, 10);

    if (!username || !isValidUsernameOrEmail(username)) {
      return res.status(400).json({ error: 'Tên đăng nhập: có thể dùng username (3–32 ký tự, bắt đầu bằng chữ/số; cho phép . _ -) hoặc dùng email.' });
    }

    if (!roleId) {
      return res.status(400).json({ error: 'Thiếu vai trò (role_id)' });
    }

    const pool = await getPool();

    const [[roleRow]] = await pool.query('SELECT id FROM roles WHERE id = ?', [roleId]);
    if (!roleRow) {
      return res.status(400).json({ error: 'Vai trò không hợp lệ' });
    }

    const [existingEmail] = await pool.query('SELECT id FROM users WHERE email = ? AND id != ?', [email, req.params.id]);
    if (existingEmail.length > 0) {
      return res.status(409).json({ error: 'Email đã tồn tại' });
    }

    const [existingUser] = await pool.query('SELECT id FROM users WHERE username = ? AND id != ?', [username, req.params.id]);
    if (existingUser.length > 0) {
      return res.status(409).json({ error: 'Tên đăng nhập đã được sử dụng' });
    }

    if (password) {
      const passwordHash = await bcrypt.hash(password, 10);
      await pool.query(
        `UPDATE users SET full_name = ?, username = ?, email = ?, phone = ?, role_id = ?, department = ?, position = ?, commission_rate = ?, salary = ?, join_date = ?, address = ?, city = ?, district = ?, postal_code = ?, is_active = ?, password_hash = ?
         WHERE id = ?`,
        [full_name, username, email, phone, roleId, department, position, commission_rate, salary, join_date, address, city, district, postal_code, is_active, passwordHash, req.params.id]
      );
    } else {
      await pool.query(
        `UPDATE users SET full_name = ?, username = ?, email = ?, phone = ?, role_id = ?, department = ?, position = ?, commission_rate = ?, salary = ?, join_date = ?, address = ?, city = ?, district = ?, postal_code = ?, is_active = ?
         WHERE id = ?`,
        [full_name, username, email, phone, roleId, department, position, commission_rate, salary, join_date, address, city, district, postal_code, is_active, req.params.id]
      );
    }
    await pool.query(
      'UPDATE user_shops SET role_id = ? WHERE user_id = ? AND shop_id = ?',
      [roleId, req.params.id, req.shopId]
    );

    res.json({ message: 'Cập nhật nhân viên thành công' });
  } catch (err) {
    next(err);
  }
});

router.delete('/:id', auth, requireShop, authorize('admin'), async (req, res, next) => {
  try {
    const pool = await getPool();
    await pool.query('UPDATE users SET is_active = 0 WHERE id = ?', [req.params.id]);
    res.json({ message: 'Vô hiệu hóa nhân viên thành công' });
  } catch (err) {
    next(err);
  }
});

router.put('/:id/role', auth, requireShop, authorize('admin'), async (req, res, next) => {
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
    await pool.query('UPDATE user_shops SET role_id = ? WHERE user_id = ? AND shop_id = ?', [roleId, req.params.id, req.shopId]);
    res.json({ message: 'Cập nhật quyền thành công' });
  } catch (err) {
    next(err);
  }
});

router.get('/available/collaborators', auth, requireShop, async (req, res, next) => {
  try {
    const pool = await getPool();
    const { exclude_id } = req.query;

    let query = `SELECT u.id, u.full_name, u.email, u.phone, r.code AS role, u.department, u.position, u.is_active
      FROM users u
      INNER JOIN user_shops us ON us.user_id = u.id AND us.shop_id = ?
      JOIN roles r ON us.role_id = r.id WHERE u.is_active = 1`;
    const params = [req.shopId];

    if (exclude_id) {
      query += ' AND u.id != ?';
      params.push(parseInt(exclude_id));
    }

    if (req.user.scope_own_data) {
      query += ' AND u.id = ?';
      params.push(req.user.id);
    }

    query += ' ORDER BY u.full_name ASC';

    const [rows] = await pool.query(query, params);
    res.json({ data: rows });
  } catch (err) {
    next(err);
  }
});

router.get('/:id/overview', auth, requireShop, async (req, res, next) => {
  try {
    if (req.user.scope_own_data && parseInt(req.params.id) !== req.user.id) {
      return res.status(403).json({ error: 'Không có quyền xem thông tin nhân viên này' });
    }

    const pool = await getPool();
    const sid = req.shopId;
    const targetUserId = parseInt(req.params.id);
    const { date_from, date_to } = req.query;

    const [userRows] = await pool.query(
      `SELECT u.id, u.full_name, u.email, u.phone, r.code AS role, r.name AS role_name, us.role_id,
        u.department, u.position, u.commission_rate, u.salary, u.join_date, u.avatar_url, u.city, u.district, u.is_active, u.created_at
       FROM users u
       INNER JOIN user_shops us ON us.user_id = u.id AND us.shop_id = ?
       JOIN roles r ON us.role_id = r.id WHERE u.id = ?`,
      [sid, targetUserId]
    );
    if (userRows.length === 0) {
      return res.status(404).json({ error: 'Không tìm thấy nhân viên' });
    }
    const user = userRows[0];

    const [groupRows] = await pool.query(
      `SELECT g.id, g.name, g.description FROM groups g
       JOIN user_groups ug ON g.id = ug.group_id
       WHERE ug.user_id = ? AND g.shop_id = ?`,
      [targetUserId, sid]
    );

    // Build date filter condition
    let dateWhere = '';
    const dateParams = [];
    if (date_from) { dateWhere += ' AND DATE(o.created_at) >= ?'; dateParams.push(date_from); }
    if (date_to)   { dateWhere += ' AND DATE(o.created_at) <= ?'; dateParams.push(date_to); }

    // Hoa hồng trực tiếp (direct) — từ đơn nhân viên tự bán
    const [directRows] = await pool.query(
      `SELECT
        COUNT(DISTINCT c.order_id) as total_orders,
        COALESCE(SUM(c.commission_amount), 0) as direct_commission,
        COALESCE(SUM(o.total_amount), 0) as total_revenue
       FROM commissions c
       JOIN orders o ON c.order_id = o.id
       WHERE o.shop_id = ? AND c.user_id = ? AND c.type = 'direct' ${dateWhere}`,
      [sid, targetUserId, ...dateParams]
    );

    // Hoa hồng override (từ CTV) — nhân viên Sales nhận khi CTV dưới quyền bán
    const [overrideRows] = await pool.query(
      `SELECT COALESCE(SUM(c.commission_amount), 0) as override_commission
       FROM commissions c
       JOIN orders o ON c.order_id = o.id
       WHERE o.shop_id = ? AND c.user_id = ? AND c.type = 'override' ${dateWhere}`,
      [sid, targetUserId, ...dateParams]
    );

    const commission = {
      total_orders:        parseInt(directRows[0].total_orders) || 0,
      direct_commission:   parseFloat(directRows[0].direct_commission) || 0,
      override_commission: parseFloat(overrideRows[0].override_commission) || 0,
      total_commission:    (parseFloat(directRows[0].direct_commission) || 0) + (parseFloat(overrideRows[0].override_commission) || 0),
      total_revenue:       parseFloat(directRows[0].total_revenue) || 0,
    };

    const [topProductsRows] = await pool.query(
      `SELECT
        p.id, p.name, p.sku, p.unit,
        SUM(oi.qty) as total_qty,
        SUM(oi.subtotal) as total_revenue
       FROM order_items oi
       JOIN orders o ON oi.order_id = o.id
       JOIN products p ON oi.product_id = p.id
       WHERE o.shop_id = ? AND o.salesperson_id = ? AND o.status != 'cancelled' ${dateWhere}
       GROUP BY p.id, p.name, p.sku, p.unit
       ORDER BY total_qty DESC
       LIMIT 10`,
      [sid, targetUserId, ...dateParams]
    );

    const [orderStatsRows] = await pool.query(
      `SELECT status, COUNT(*) as count
       FROM orders
       WHERE shop_id = ? AND salesperson_id = ? ${dateWhere.replace(/o\./g, '')}
       GROUP BY status`,
      [sid, targetUserId, ...dateParams]
    );
    const orderStats = {};
    orderStatsRows.forEach(r => { orderStats[r.status] = r.count; });

    res.json({
      data: {
        user,
        groups: groupRows,
        commission,
        topProducts: topProductsRows.map(r => ({
          ...r,
          total_qty: parseFloat(r.total_qty) || 0,
          total_revenue: parseFloat(r.total_revenue) || 0,
        })),
        orderStats,
      }
    });
  } catch (err) {
    next(err);
  }
});

router.get('/:id/orders', auth, requireShop, async (req, res, next) => {
  try {
    if (req.user.scope_own_data && parseInt(req.params.id) !== req.user.id) {
      return res.status(403).json({ error: 'Không có quyền xem đơn hàng của nhân viên này' });
    }

    const pool = await getPool();
    const sid = req.shopId;
    const targetUserId = parseInt(req.params.id);
    const { status, date_from, date_to, page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

    let query = `
      SELECT o.*, c.name as customer_name, c.phone as customer_phone,
        COALESCE((
          SELECT commission_amount
          FROM commissions
          WHERE order_id = o.id AND user_id = o.salesperson_id AND type = 'direct'
          LIMIT 1
        ), 0) as commission_amount
      FROM orders o
      LEFT JOIN customers c ON o.customer_id = c.id
      WHERE o.shop_id = ? AND o.salesperson_id = ?
    `;
    let countQuery = 'SELECT COUNT(*) as total FROM orders WHERE shop_id = ? AND salesperson_id = ?';
    const params = [sid, targetUserId];

    if (status) { query += ' AND o.status = ?'; countQuery += ' AND status = ?'; params.push(status); }
    if (date_from) { query += ' AND DATE(o.created_at) >= ?'; countQuery += ' AND DATE(created_at) >= ?'; params.push(date_from); }
    if (date_to)   { query += ' AND DATE(o.created_at) <= ?'; countQuery += ' AND DATE(created_at) <= ?'; params.push(date_to); }

    query += ' ORDER BY o.created_at DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), parseInt(offset));

    const [rows] = await pool.query(query, params);
    const [countRows] = await pool.query(countQuery, params.slice(0, -2));

    const formattedRows = rows.map(row => ({
      ...row,
      total_amount: parseFloat(row.total_amount) || 0,
      subtotal: parseFloat(row.subtotal) || 0,
      discount: parseFloat(row.discount) || 0,
      tax_amount: parseFloat(row.tax_amount) || 0,
      shipping_fee: parseFloat(row.shipping_fee) || 0,
      commission_amount: parseFloat(row.commission_amount) || 0,
    }));

    res.json({ data: formattedRows, total: countRows[0].total, page: parseInt(page), limit: parseInt(limit) });
  } catch (err) {
    next(err);
  }
});

router.get('/:id/collaborators', auth, requireShop, async (req, res, next) => {
  try {
    if (req.user.scope_own_data && parseInt(req.params.id) !== req.user.id) {
      return res.status(403).json({ error: 'Không có quyền xem cộng tác viên của nhân viên này' });
    }

    const pool = await getPool();
    // Dùng bảng collaborators (sales_id → ctv_id), không dùng user_collaborators (rỗng)
    const [rows] = await pool.query(
      `SELECT c.id, c.ctv_id as collaborator_id, c.created_at,
              u.full_name, u.email, u.phone, r.code AS role, u.department, u.position,
              u.is_active, u.commission_rate
       FROM collaborators c
       JOIN users u ON c.ctv_id = u.id
       JOIN user_shops us ON us.user_id = u.id AND us.shop_id = ?
       JOIN roles r ON us.role_id = r.id
       WHERE c.shop_id = ? AND c.sales_id = ?
       ORDER BY c.created_at DESC`,
      [req.shopId, req.shopId, req.params.id]
    );

    res.json({ data: rows });
  } catch (err) {
    next(err);
  }
});

// Report: tổng hoa hồng từ CTV cho một nhân viên
router.get('/:id/collaborators/commissions', auth, requireShop, async (req, res, next) => {
  try {
    if (req.user.scope_own_data && parseInt(req.params.id) !== req.user.id) {
      return res.status(403).json({ error: 'Không có quyền xem báo cáo CTV' });
    }

    const pool = await getPool();
    const sid = req.shopId;
    const targetUserId = parseInt(req.params.id);
    const { month, year, group_id } = req.query;

    // Filter kỳ theo thời điểm phát sinh dòng HH/điều chỉnh (created_at của commission/adjustment)
    // để đơn hoàn (commission_adjustments) nằm đúng kỳ duyệt hoàn.
    const txFilterConds = [];
    const txFilterParams = [];
    if (month) { txFilterConds.push('MONTH(t.entry_date) = ?'); txFilterParams.push(parseInt(month)); }
    if (year)  { txFilterConds.push('YEAR(t.entry_date) = ?');  txFilterParams.push(parseInt(year)); }
    const txExtra = txFilterConds.length ? ' AND ' + txFilterConds.join(' AND ') : '';

    // Group filter lấy theo order
    const orderFilterConds = [];
    const orderFilterParams = [];
    if (group_id) { orderFilterConds.push('o.group_id = ?'); orderFilterParams.push(parseInt(group_id)); }
    const orderExtra = orderFilterConds.length ? ' AND ' + orderFilterConds.join(' AND ') : '';

    // IMPORTANT: group filter must constrain transactions (t) too, not only the joined order row.
    // Use a different alias than the outer query to avoid confusion.
    const txJoinOrders = orderFilterConds.length ? ' JOIN orders o_tx ON o_tx.id = t.order_id' : '';
    const txOrderExtra = orderFilterConds.length ? ' AND o_tx.group_id = ?' : '';
    const groupIdInt = group_id ? parseInt(group_id) : null;

    const txFrom = `
      FROM (
        SELECT id AS tx_id, order_id, NULL AS return_id, user_id, type, ctv_user_id, commission_amount AS amount, created_at AS entry_date, 'commission' AS entry_kind
        FROM commissions WHERE shop_id = ?
        UNION ALL
        SELECT id AS tx_id, order_id, return_id, user_id, type, ctv_user_id, amount, created_at AS entry_date, 'adjustment' AS entry_kind
        FROM commission_adjustments WHERE shop_id = ?
      ) t
    `;

    // Tổng hợp theo từng CTV
    // total_orders: số giao dịch HH (đơn bán + đơn hoàn), tức tính cả commissions + adjustments.
    // Params: [...txFilterParams, ...orderFilterParams, targetUserId, targetUserId]
    const [summary] = await pool.query(`
      SELECT
        col.id as collaborator_id,
        col.full_name as collaborator_name,
        col.commission_rate as collaborator_rate,
        COALESCE(SUM(t.amount), 0) as total_override_commission,
        -- Số đơn: chỉ đếm giao dịch bán (commission), không cộng đơn hoàn (adjustment)
        COALESCE(COUNT(DISTINCT CASE WHEN t.entry_kind = 'commission' THEN t.order_id END), 0) as total_orders,
        COALESCE(SUM(DISTINCT o.total_amount), 0) as total_revenue
      FROM collaborators cr
      JOIN users col ON cr.ctv_id = col.id
      LEFT JOIN (
        SELECT t.tx_id, t.order_id, t.user_id, t.type, t.ctv_user_id, t.amount, t.entry_date, t.entry_kind
        ${txFrom}
        ${txJoinOrders}
        WHERE 1=1 ${txExtra}${txOrderExtra}
      ) t ON t.user_id = ? AND t.type = 'override' AND t.ctv_user_id = col.id
      LEFT JOIN orders o ON o.id = t.order_id AND o.salesperson_id = col.id ${orderExtra}
      WHERE cr.shop_id = ? AND cr.sales_id = ?
      GROUP BY col.id, col.full_name, col.commission_rate
      ORDER BY total_override_commission DESC
    `, [
      sid,
      sid,
      ...txFilterParams,
      // txOrderExtra (if any) — must come BEFORE ON t.user_id placeholder
      ...(groupIdInt != null ? [groupIdInt] : []),
      targetUserId,
      // orderExtra (if any)
      ...(groupIdInt != null ? [groupIdInt] : []),
      // WHERE cr.shop_id, cr.sales_id
      sid,
      targetUserId,
    ]);

    // Chi tiết từng đơn
    // Trả theo từng giao dịch HH (commission/adjustment) để “Số đơn” khớp (đơn hoàn = 1 dòng riêng).
    // Params: [...txFilterParams, ...orderFilterParams, targetUserId, targetUserId]
    const [orders] = await pool.query(`
      SELECT
        col.id as collaborator_id,
        col.full_name as collaborator_name,
        t.tx_id,
        o.id as order_id, o.code as order_code,
        t.entry_date as order_date,
        o.total_amount, o.status,
        g.name as group_name,
        cu.name as customer_name,
        t.amount as override_commission,
        CASE
          WHEN t.entry_kind = 'adjustment' THEN adj_rates.override_rate
          ELSE c.override_rate
        END as override_rate,
        t.entry_kind
      FROM collaborators cr
      JOIN users col ON cr.ctv_id = col.id
      JOIN (
        SELECT t.tx_id, t.order_id, t.return_id, t.user_id, t.type, t.ctv_user_id, t.amount, t.entry_date, t.entry_kind
        ${txFrom}
        ${txJoinOrders}
        WHERE 1=1 ${txExtra}${txOrderExtra}
      ) t ON t.user_id = ? AND t.type = 'override' AND t.ctv_user_id = col.id
      JOIN orders o ON o.id = t.order_id AND o.salesperson_id = col.id ${orderExtra}
      LEFT JOIN commissions c ON c.order_id = o.id
        AND c.user_id = ? AND c.type = 'override' AND c.ctv_user_id = col.id
      LEFT JOIN (
        SELECT
          ca.id AS tx_id,
          CASE WHEN COUNT(DISTINCT r1.override_rate) = 1 THEN MAX(r1.override_rate) ELSE NULL END AS override_rate
        FROM commission_adjustments ca
        JOIN returns r ON r.id = ca.return_id
        JOIN return_items ri ON ri.return_id = r.id
        JOIN order_items oi ON oi.order_id = ca.order_id AND oi.product_id = ri.product_id
        LEFT JOIN (
          SELECT
            oi2.order_id,
            oi2.product_id,
            (
              SELECT ct.sales_override_rate
              FROM commission_tiers ct
              WHERE ct.shop_id = (SELECT o3.shop_id FROM orders o3 WHERE o3.id = oi2.order_id LIMIT 1)
                AND ct.ctv_rate_min <= oi2.commission_rate
                AND (ct.ctv_rate_max IS NULL OR ct.ctv_rate_max >= oi2.commission_rate)
              ORDER BY ct.ctv_rate_min DESC
              LIMIT 1
            ) AS override_rate
          FROM order_items oi2
        ) r1 ON r1.order_id = oi.order_id AND r1.product_id = oi.product_id
        GROUP BY ca.id
      ) adj_rates ON adj_rates.tx_id = t.tx_id
      LEFT JOIN groups g ON o.group_id = g.id
      LEFT JOIN customers cu ON o.customer_id = cu.id
      WHERE cr.shop_id = ? AND cr.sales_id = ?
      ORDER BY col.full_name, t.entry_date DESC
    `, [
      sid,
      sid,
      ...txFilterParams,
      ...(groupIdInt != null ? [groupIdInt] : []),
      // ON t.user_id
      targetUserId,
      // orderExtra in JOIN orders o
      ...(groupIdInt != null ? [groupIdInt] : []),
      // LEFT JOIN commissions c.user_id
      targetUserId,
      // WHERE cr.shop_id, cr.sales_id
      sid,
      targetUserId,
    ]);

    // Summary tổng
    const totalOverride = summary.reduce((s, r) => s + parseFloat(r.total_override_commission), 0);
    const totalOrders   = summary.reduce((s, r) => s + parseInt(r.total_orders), 0);
    const totalRevenue  = summary.reduce((s, r) => s + parseFloat(r.total_revenue), 0);

    res.json({
      data: {
        summary: summary.map(r => ({
          ...r,
          total_override_commission: parseFloat(r.total_override_commission) || 0,
          total_orders:  parseInt(r.total_orders) || 0,
          total_revenue: parseFloat(r.total_revenue) || 0,
        })),
        orders: orders.map(r => ({
          ...r,
          total_amount:        parseFloat(r.total_amount) || 0,
          override_commission: parseFloat(r.override_commission) || 0,
          override_rate:       r.override_rate != null ? parseFloat(r.override_rate) : null,
        })),
        totals: { total_override_commission: totalOverride, total_orders: totalOrders, total_revenue: totalRevenue },
      }
    });
  } catch (err) {
    next(err);
  }
});

router.post('/:id/collaborators', auth, requireShop, async (req, res, next) => {
  try {
    if (req.user.scope_own_data && parseInt(req.params.id) !== req.user.id) {
      return res.status(403).json({ error: 'Không có quyền thêm cộng tác viên cho nhân viên này' });
    }

    const { collaborator_id, commission_rate } = req.body;
    if (!collaborator_id) {
      return res.status(400).json({ error: 'Thiếu thông tin cộng tác viên' });
    }

    const pool = await getPool();
    const userId = parseInt(req.params.id);
    const collabId = parseInt(collaborator_id);

    if (userId === collabId) {
      return res.status(400).json({ error: 'Không thể thêm chính mình làm cộng tác viên' });
    }

    const [existing] = await pool.query('SELECT id FROM users WHERE id = ? AND is_active = 1', [collabId]);
    if (existing.length === 0) {
      return res.status(404).json({ error: 'Không tìm thấy nhân viên' });
    }

    // Dùng bảng collaborators (sales_id, ctv_id)
    const [duplicate] = await pool.query(
      'SELECT id FROM collaborators WHERE shop_id = ? AND sales_id = ? AND ctv_id = ?',
      [req.shopId, userId, collabId]
    );
    if (duplicate.length > 0) {
      return res.status(409).json({ error: 'Cộng tác viên đã tồn tại' });
    }

    await pool.query(
      'INSERT INTO collaborators (shop_id, sales_id, ctv_id) VALUES (?, ?, ?)',
      [req.shopId, userId, collabId]
    );

    res.status(201).json({ message: 'Thêm cộng tác viên thành công' });
  } catch (err) {
    next(err);
  }
});

router.delete('/:id/collaborators/:collaboratorId', auth, requireShop, async (req, res, next) => {
  try {
    if (req.user.scope_own_data && parseInt(req.params.id) !== req.user.id) {
      return res.status(403).json({ error: 'Không có quyền xóa cộng tác viên của nhân viên này' });
    }

    const pool = await getPool();
    await pool.query(
      'DELETE FROM collaborators WHERE shop_id = ? AND sales_id = ? AND ctv_id = ?',
      [req.shopId, req.params.id, req.params.collaboratorId]
    );

    res.json({ message: 'Xóa cộng tác viên thành công' });
  } catch (err) {
    next(err);
  }
});

router.put('/:id/password', auth, async (req, res, next) => {
  try {
    // Only allow users to change their own password, or admin can change any
    if (!req.user.can_access_admin && parseInt(req.params.id) !== req.user.id) {
      return res.status(403).json({ error: 'Không có quyền đổi mật khẩu người dùng này' });
    }
    
    const { currentPassword, newPassword } = req.body;
    const pool = await getPool();
    
    const [rows] = await pool.query('SELECT password_hash FROM users WHERE id = ?', [req.params.id]);
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Không tìm thấy người dùng' });
    }
    
    const isValid = await bcrypt.compare(currentPassword, rows[0].password_hash);
    if (!isValid) {
      return res.status(400).json({ error: 'Mật khẩu hiện tại không đúng' });
    }
    
    const newHash = await bcrypt.hash(newPassword, 10);
    await pool.query('UPDATE users SET password_hash = ? WHERE id = ?', [newHash, req.params.id]);
    
    res.json({ message: 'Đổi mật khẩu thành công' });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
