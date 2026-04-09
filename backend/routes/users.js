const express = require('express');
const bcrypt = require('bcryptjs');
const router = express.Router();
const auth = require('../middleware/auth');
const authorize = require('../middleware/authorize');
const { getPool } = require('../config/db');



router.get('/', auth, authorize('admin'), async (req, res, next) => {
  try {
    const pool = await getPool();
    const { search, department, role, scoped, page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

    let query = `SELECT u.id, u.full_name, u.username, u.email, u.phone, r.code AS role, r.name AS role_name, u.role_id,
      u.department, u.position, u.commission_rate, u.salary, u.join_date, u.avatar_url, u.city, u.district, u.is_active, u.created_at
      FROM users u JOIN roles r ON u.role_id = r.id WHERE 1=1`;
    let countQuery = 'SELECT COUNT(*) as total FROM users u JOIN roles r ON u.role_id = r.id WHERE 1=1';
    const params = [];

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

    if (scoped === '1' || scoped === 'true') {
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

router.get('/:id', auth, async (req, res, next) => {
  try {
    const pool = await getPool();
    const [rows] = await pool.query(
      `SELECT u.id, u.full_name, u.username, u.email, u.phone, r.code AS role, r.name AS role_name, u.role_id,
        u.department, u.position, u.commission_rate, u.salary, u.join_date, u.avatar_url, u.address, u.city, u.district, u.postal_code, u.is_active, u.created_at
       FROM users u JOIN roles r ON u.role_id = r.id WHERE u.id = ?`,
      [req.params.id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Không tìm thấy nhân viên' });
    }

    res.json({ data: rows[0] });
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

router.post('/', auth, authorize('admin'), async (req, res, next) => {
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

    res.status(201).json({ id: result.insertId, message: 'Tạo nhân viên thành công' });
  } catch (err) {
    next(err);
  }
});

router.put('/:id', auth, authorize('admin'), async (req, res, next) => {
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

    res.json({ message: 'Cập nhật nhân viên thành công' });
  } catch (err) {
    next(err);
  }
});

router.delete('/:id', auth, authorize('admin'), async (req, res, next) => {
  try {
    const pool = await getPool();
    await pool.query('UPDATE users SET is_active = 0 WHERE id = ?', [req.params.id]);
    res.json({ message: 'Vô hiệu hóa nhân viên thành công' });
  } catch (err) {
    next(err);
  }
});

router.put('/:id/role', auth, authorize('admin'), async (req, res, next) => {
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
    res.json({ message: 'Cập nhật quyền thành công' });
  } catch (err) {
    next(err);
  }
});

router.get('/available/collaborators', auth, async (req, res, next) => {
  try {
    const pool = await getPool();
    const { exclude_id } = req.query;

    let query = `SELECT u.id, u.full_name, u.email, u.phone, r.code AS role, u.department, u.position, u.is_active
      FROM users u JOIN roles r ON u.role_id = r.id WHERE u.is_active = 1`;
    const params = [];

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

router.get('/:id/overview', auth, async (req, res, next) => {
  try {
    if (req.user.scope_own_data && parseInt(req.params.id) !== req.user.id) {
      return res.status(403).json({ error: 'Không có quyền xem thông tin nhân viên này' });
    }

    const pool = await getPool();
    const targetUserId = parseInt(req.params.id);
    const { date_from, date_to } = req.query;

    const [userRows] = await pool.query(
      `SELECT u.id, u.full_name, u.email, u.phone, r.code AS role, r.name AS role_name, u.role_id,
        u.department, u.position, u.commission_rate, u.salary, u.join_date, u.avatar_url, u.city, u.district, u.is_active, u.created_at
       FROM users u JOIN roles r ON u.role_id = r.id WHERE u.id = ?`,
      [targetUserId]
    );
    if (userRows.length === 0) {
      return res.status(404).json({ error: 'Không tìm thấy nhân viên' });
    }
    const user = userRows[0];

    const [groupRows] = await pool.query(
      `SELECT g.id, g.name, g.description FROM groups g
       JOIN user_groups ug ON g.id = ug.group_id
       WHERE ug.user_id = ?`,
      [targetUserId]
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
       WHERE c.user_id = ? AND c.type = 'direct' ${dateWhere}`,
      [targetUserId, ...dateParams]
    );

    // Hoa hồng override (từ CTV) — nhân viên Sales nhận khi CTV dưới quyền bán
    const [overrideRows] = await pool.query(
      `SELECT COALESCE(SUM(c.commission_amount), 0) as override_commission
       FROM commissions c
       JOIN orders o ON c.order_id = o.id
       WHERE c.user_id = ? AND c.type = 'override' ${dateWhere}`,
      [targetUserId, ...dateParams]
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
       WHERE o.salesperson_id = ? AND o.status != 'cancelled' ${dateWhere}
       GROUP BY p.id, p.name, p.sku, p.unit
       ORDER BY total_qty DESC
       LIMIT 10`,
      [targetUserId, ...dateParams]
    );

    const [orderStatsRows] = await pool.query(
      `SELECT status, COUNT(*) as count
       FROM orders
       WHERE salesperson_id = ? ${dateWhere.replace(/o\./g, '')}
       GROUP BY status`,
      [targetUserId, ...dateParams]
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

router.get('/:id/orders', auth, async (req, res, next) => {
  try {
    if (req.user.scope_own_data && parseInt(req.params.id) !== req.user.id) {
      return res.status(403).json({ error: 'Không có quyền xem đơn hàng của nhân viên này' });
    }

    const pool = await getPool();
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
      WHERE o.salesperson_id = ?
    `;
    let countQuery = 'SELECT COUNT(*) as total FROM orders WHERE salesperson_id = ?';
    const params = [targetUserId];

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

router.get('/:id/collaborators', auth, async (req, res, next) => {
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
       JOIN roles r ON u.role_id = r.id
       WHERE c.sales_id = ?
       ORDER BY c.created_at DESC`,
      [req.params.id]
    );

    res.json({ data: rows });
  } catch (err) {
    next(err);
  }
});

// Report: tổng hoa hồng từ CTV cho một nhân viên
router.get('/:id/collaborators/commissions', auth, async (req, res, next) => {
  try {
    if (req.user.scope_own_data && parseInt(req.params.id) !== req.user.id) {
      return res.status(403).json({ error: 'Không có quyền xem báo cáo CTV' });
    }

    const pool = await getPool();
    const targetUserId = parseInt(req.params.id);
    const { month, year, group_id } = req.query;

    // Params cho filter ngày/nhóm (KHÔNG bao gồm targetUserId)
    const filterConds = [];
    const filterParams = [];
    if (month)    { filterConds.push('MONTH(o.created_at) = ?'); filterParams.push(parseInt(month)); }
    if (year)     { filterConds.push('YEAR(o.created_at) = ?');  filterParams.push(parseInt(year)); }
    if (group_id) { filterConds.push('o.group_id = ?');          filterParams.push(parseInt(group_id)); }
    const extra = filterConds.length ? ' AND ' + filterConds.join(' AND ') : '';

    // Tổng hợp theo từng CTV
    // Params: [filterParams...(cho JOIN ON), targetUserId(cho c.user_id), targetUserId(cho cr.sales_id)]
    const [summary] = await pool.query(`
      SELECT
        col.id as collaborator_id,
        col.full_name as collaborator_name,
        col.commission_rate as collaborator_rate,
        COALESCE(SUM(c.commission_amount), 0) as total_override_commission,
        COALESCE(COUNT(DISTINCT c.order_id), 0) as total_orders,
        COALESCE(SUM(CASE WHEN c.id IS NOT NULL THEN o.total_amount ELSE 0 END), 0) as total_revenue
      FROM collaborators cr
      JOIN users col ON cr.ctv_id = col.id
      LEFT JOIN orders o ON o.salesperson_id = col.id ${extra}
      LEFT JOIN commissions c ON c.order_id = o.id
        AND c.user_id = ? AND c.type = 'override' AND c.ctv_user_id = col.id
      WHERE cr.sales_id = ?
      GROUP BY col.id, col.full_name, col.commission_rate
      ORDER BY total_override_commission DESC
    `, [...filterParams, targetUserId, targetUserId]);

    // Chi tiết từng đơn
    // Params: [targetUserId(c.user_id), targetUserId(cr.sales_id), filterParams...(WHERE extra)]
    const [orders] = await pool.query(`
      SELECT
        col.id as collaborator_id,
        col.full_name as collaborator_name,
        o.id as order_id, o.code as order_code,
        o.created_at as order_date,
        o.total_amount, o.status,
        g.name as group_name,
        cu.name as customer_name,
        c.commission_amount as override_commission,
        c.override_rate as override_rate
      FROM collaborators cr
      JOIN users col ON cr.ctv_id = col.id
      JOIN orders o ON o.salesperson_id = col.id
      JOIN commissions c ON c.order_id = o.id
        AND c.user_id = ? AND c.type = 'override' AND c.ctv_user_id = col.id
      LEFT JOIN groups g ON o.group_id = g.id
      LEFT JOIN customers cu ON o.customer_id = cu.id
      WHERE cr.sales_id = ? ${extra}
      ORDER BY col.full_name, o.created_at DESC
    `, [targetUserId, targetUserId, ...filterParams]);

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

router.post('/:id/collaborators', auth, async (req, res, next) => {
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
      'SELECT id FROM collaborators WHERE sales_id = ? AND ctv_id = ?',
      [userId, collabId]
    );
    if (duplicate.length > 0) {
      return res.status(409).json({ error: 'Cộng tác viên đã tồn tại' });
    }

    await pool.query(
      'INSERT INTO collaborators (sales_id, ctv_id) VALUES (?, ?)',
      [userId, collabId]
    );

    res.status(201).json({ message: 'Thêm cộng tác viên thành công' });
  } catch (err) {
    next(err);
  }
});

router.delete('/:id/collaborators/:collaboratorId', auth, async (req, res, next) => {
  try {
    if (req.user.scope_own_data && parseInt(req.params.id) !== req.user.id) {
      return res.status(403).json({ error: 'Không có quyền xóa cộng tác viên của nhân viên này' });
    }

    const pool = await getPool();
    await pool.query(
      'DELETE FROM collaborators WHERE sales_id = ? AND ctv_id = ?',
      [req.params.id, req.params.collaboratorId]
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
