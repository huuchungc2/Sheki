const express = require('express');
const bcrypt = require('bcryptjs');
const router = express.Router();
const auth = require('../middleware/auth');
const authorize = require('../middleware/authorize');
const { getPool } = require('../config/db');

router.get('/', auth, authorize('admin'), async (req, res, next) => {
  try {
    const pool = await getPool();
    const { search, department, role, page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

    let query = 'SELECT id, full_name, email, phone, role, department, position, commission_rate, salary, join_date, avatar_url, city, district, is_active, created_at FROM users WHERE 1=1';
    let countQuery = 'SELECT COUNT(*) as total FROM users WHERE 1=1';
    const params = [];

    if (search) {
      query += ' AND (full_name LIKE ? OR email LIKE ? OR phone LIKE ?)';
      countQuery += ' AND (full_name LIKE ? OR email LIKE ? OR phone LIKE ?)';
      const like = `%${search}%`;
      params.push(like, like, like);
    }

    if (department) {
      query += ' AND department = ?';
      countQuery += ' AND department = ?';
      params.push(department);
    }

    if (role) {
      query += ' AND role = ?';
      countQuery += ' AND role = ?';
      params.push(role);
    }

    query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
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
      'SELECT id, full_name, email, phone, role, department, position, commission_rate, salary, join_date, avatar_url, address, city, district, postal_code, is_active, created_at FROM users WHERE id = ?',
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

router.post('/', auth, authorize('admin'), async (req, res, next) => {
  try {
    const { full_name, email, password, phone, role, department, position, commission_rate, salary, join_date, address, city, district, postal_code } = req.body;

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
      `INSERT INTO users (full_name, email, password_hash, phone, role, department, position, commission_rate, salary, join_date, address, city, district, postal_code, is_active)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)`,
      [full_name, email, passwordHash, phone, role || 'sales', department, position, commission_rate || 5.00, salary || 0, join_date, address, city, district, postal_code]
    );

    res.status(201).json({ id: result.insertId, message: 'Tạo nhân viên thành công' });
  } catch (err) {
    next(err);
  }
});

router.put('/:id', auth, authorize('admin'), async (req, res, next) => {
  try {
    const { full_name, email, phone, role, department, position, commission_rate, salary, join_date, address, city, district, postal_code, is_active, password } = req.body;

    const pool = await getPool();

    const [existing] = await pool.query('SELECT id FROM users WHERE email = ? AND id != ?', [email, req.params.id]);
    if (existing.length > 0) {
      return res.status(409).json({ error: 'Email đã tồn tại' });
    }

    if (password) {
      const passwordHash = await bcrypt.hash(password, 10);
      await pool.query(
        `UPDATE users SET full_name = ?, email = ?, phone = ?, role = ?, department = ?, position = ?, commission_rate = ?, salary = ?, join_date = ?, address = ?, city = ?, district = ?, postal_code = ?, is_active = ?, password_hash = ?
         WHERE id = ?`,
        [full_name, email, phone, role, department, position, commission_rate, salary, join_date, address, city, district, postal_code, is_active, passwordHash, req.params.id]
      );
    } else {
      await pool.query(
        `UPDATE users SET full_name = ?, email = ?, phone = ?, role = ?, department = ?, position = ?, commission_rate = ?, salary = ?, join_date = ?, address = ?, city = ?, district = ?, postal_code = ?, is_active = ?
         WHERE id = ?`,
        [full_name, email, phone, role, department, position, commission_rate, salary, join_date, address, city, district, postal_code, is_active, req.params.id]
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
    const { role } = req.body;
    const pool = await getPool();
    await pool.query('UPDATE users SET role = ? WHERE id = ?', [role, req.params.id]);
    res.json({ message: 'Cập nhật quyền thành công' });
  } catch (err) {
    next(err);
  }
});

router.get('/available/collaborators', auth, async (req, res, next) => {
  try {
    const pool = await getPool();
    const { exclude_id } = req.query;

    let query = 'SELECT id, full_name, email, phone, role, department, position, is_active FROM users WHERE is_active = 1';
    const params = [];

    if (exclude_id) {
      query += ' AND id != ?';
      params.push(parseInt(exclude_id));
    }

    if (req.user.role === 'sales') {
      query += ' AND id = ?';
      params.push(req.user.id);
    }

    query += ' ORDER BY full_name ASC';

    const [rows] = await pool.query(query, params);
    res.json({ data: rows });
  } catch (err) {
    next(err);
  }
});

router.get('/:id/overview', auth, async (req, res, next) => {
  try {
    if (req.user.role === 'sales' && parseInt(req.params.id) !== req.user.id) {
      return res.status(403).json({ error: 'Không có quyền xem thông tin nhân viên này' });
    }

    const pool = await getPool();
    const targetUserId = parseInt(req.params.id);

    const [userRows] = await pool.query(
      'SELECT id, full_name, email, phone, role, department, position, commission_rate, salary, join_date, avatar_url, city, district, is_active, created_at FROM users WHERE id = ?',
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

    const [commissionRows] = await pool.query(
      `SELECT
        COUNT(DISTINCT c.order_id) as total_orders,
        COALESCE(SUM(DISTINCT c.commission_amount), 0) as total_commission,
        COALESCE(SUM(DISTINCT o.total_amount), 0) as total_revenue
       FROM commissions c
       JOIN orders o ON c.order_id = o.id
       WHERE c.user_id = ?`,
      [targetUserId]
    );

    const [topProductsRows] = await pool.query(
      `SELECT
        p.id, p.name, p.sku, p.unit,
        SUM(oi.qty) as total_qty,
        SUM(oi.subtotal) as total_revenue
       FROM order_items oi
       JOIN orders o ON oi.order_id = o.id
       JOIN products p ON oi.product_id = p.id
       WHERE o.salesperson_id = ? AND o.status != 'cancelled'
       GROUP BY p.id, p.name, p.sku, p.unit
       ORDER BY total_qty DESC
       LIMIT 10`,
      [targetUserId]
    );

    const [orderStatsRows] = await pool.query(
      `SELECT status, COUNT(*) as count
       FROM orders
       WHERE salesperson_id = ?
       GROUP BY status`,
      [targetUserId]
    );
    const orderStats = {};
    orderStatsRows.forEach(r => { orderStats[r.status] = r.count; });

    res.json({
      data: {
        user,
        groups: groupRows,
        commission: commissionRows[0],
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
    if (req.user.role === 'sales' && parseInt(req.params.id) !== req.user.id) {
      return res.status(403).json({ error: 'Không có quyền xem đơn hàng của nhân viên này' });
    }

    const pool = await getPool();
    const targetUserId = parseInt(req.params.id);
    const { status, page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

    let query = `
      SELECT o.*, c.name as customer_name, c.phone as customer_phone,
        COALESCE((SELECT commission_amount FROM commissions WHERE order_id = o.id LIMIT 1), 0) as commission_amount
      FROM orders o
      LEFT JOIN customers c ON o.customer_id = c.id
      WHERE o.salesperson_id = ?
    `;
    let countQuery = 'SELECT COUNT(*) as total FROM orders WHERE salesperson_id = ?';
    const params = [targetUserId];

    if (status) {
      query += ' AND o.status = ?';
      countQuery += ' AND status = ?';
      params.push(status);
    }

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
    if (req.user.role === 'sales' && parseInt(req.params.id) !== req.user.id) {
      return res.status(403).json({ error: 'Không có quyền xem cộng tác viên của nhân viên này' });
    }

    const pool = await getPool();
    const [rows] = await pool.query(
      `SELECT uc.id, uc.collaborator_id, uc.commission_rate, uc.created_at,
              u.full_name, u.email, u.phone, u.role, u.department, u.position, u.is_active
       FROM user_collaborators uc
       JOIN users u ON uc.collaborator_id = u.id
       WHERE uc.user_id = ?
       ORDER BY uc.created_at DESC`,
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
    // Admin có quyền xem cho mọi NV; Sales chỉ được xem CTV của chính mình
    if (req.user.role === 'sales') {
      // if there is no mapping, still return 403 to avoid leaking data
      const pool = await getPool();
      const [exist] = await pool.query('SELECT 1 FROM user_collaborators WHERE user_id = ? LIMIT 1', [req.params.id]);
      if ((exist || []).length === 0) {
        return res.status(403).json({ error: 'Không có quyền xem báo cáo CTV' });
      }
    }

    const pool = await getPool();
    const [rows] = await pool.query(`
      SELECT uc.collaborator_id, u.full_name as collaborator_name,
             COALESCE(SUM(c.commission_amount), 0) as total_commission,
             COALESCE(COUNT(DISTINCT c.order_id), 0) as total_orders
      FROM user_collaborators uc
      LEFT JOIN commissions c ON c.user_id = uc.collaborator_id
      LEFT JOIN users u ON uc.collaborator_id = u.id
      WHERE uc.user_id = ?
      GROUP BY uc.collaborator_id, u.full_name
      ORDER BY total_commission DESC
    `, [req.params.id]);

    res.json({ data: rows });
  } catch (err) {
    next(err);
  }
});

router.post('/:id/collaborators', auth, async (req, res, next) => {
  try {
    if (req.user.role === 'sales' && parseInt(req.params.id) !== req.user.id) {
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

    const [duplicate] = await pool.query(
      'SELECT id FROM user_collaborators WHERE user_id = ? AND collaborator_id = ?',
      [userId, collabId]
    );
    if (duplicate.length > 0) {
      return res.status(409).json({ error: 'Cộng tác viên đã tồn tại' });
    }

    await pool.query(
      'INSERT INTO user_collaborators (user_id, collaborator_id, commission_rate) VALUES (?, ?, ?)',
      [userId, collabId, commission_rate || 0]
    );

    res.status(201).json({ message: 'Thêm cộng tác viên thành công' });
  } catch (err) {
    next(err);
  }
});

router.delete('/:id/collaborators/:collaboratorId', auth, async (req, res, next) => {
  try {
    if (req.user.role === 'sales' && parseInt(req.params.id) !== req.user.id) {
      return res.status(403).json({ error: 'Không có quyền xóa cộng tác viên của nhân viên này' });
    }

    const pool = await getPool();
    await pool.query(
      'DELETE FROM user_collaborators WHERE user_id = ? AND collaborator_id = ?',
      [req.params.id, req.params.collaboratorId]
    );

    res.json({ message: 'Xóa cộng tác viên thành công' });
  } catch (err) {
    next(err);
  }
});

router.get('/available/collaborators', auth, async (req, res, next) => {
  try {
    const pool = await getPool();
    const { exclude_id } = req.query;

    let query = 'SELECT id, full_name, email, phone, role, department, position, is_active FROM users WHERE is_active = 1';
    const params = [];

    if (exclude_id) {
      query += ' AND id != ?';
      params.push(parseInt(exclude_id));
    }

    if (req.user.role === 'sales') {
      query += ' AND id = ?';
      params.push(req.user.id);
    }

    query += ' ORDER BY full_name ASC';

    const [rows] = await pool.query(query, params);
    res.json({ data: rows });
  } catch (err) {
    next(err);
  }
});

router.put('/:id/password', auth, async (req, res, next) => {
  try {
    // Only allow users to change their own password, or admin can change any
    if (req.user.role !== 'admin' && parseInt(req.params.id) !== req.user.id) {
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
