const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const authorize = require('../middleware/authorize');
const { getPool } = require('../config/db');

router.get('/', auth, async (req, res, next) => {
  try {
    const pool = await getPool();
    const { search, category, status, page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

    let query = `
      SELECT p.*, c.name as category_name
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      WHERE 1=1
    `;
    let countQuery = 'SELECT COUNT(*) as total FROM products WHERE 1=1';
    const params = [];

    if (search) {
      query += ' AND (p.name LIKE ? OR p.sku LIKE ?)';
      countQuery += ' AND (name LIKE ? OR sku LIKE ?)';
      const like = `%${search}%`;
      params.push(like, like);
    }

    if (category) {
      query += ' AND p.category_id = ?';
      countQuery += ' AND category_id = ?';
      params.push(category);
    }

    query += ' ORDER BY p.created_at DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), parseInt(offset));

    const [rows] = await pool.query(query, params);
    const [countRows] = await pool.query(countQuery, params.slice(0, -2));

    // Convert DECIMAL strings to numbers
    const formattedRows = rows.map(row => ({
      ...row,
      stock_qty: parseFloat(row.stock_qty) || 0,
      available_stock: parseFloat(row.available_stock) || 0,
      reserved_stock: parseFloat(row.reserved_stock) || 0,
      low_stock_threshold: parseFloat(row.low_stock_threshold) || 10,
      price: parseFloat(row.price) || 0,
      cost_price: parseFloat(row.cost_price) || 0,
      weight: row.weight ? parseFloat(row.weight) : null,
      length: row.length ? parseFloat(row.length) : null,
      width: row.width ? parseFloat(row.width) : null,
      height: row.height ? parseFloat(row.height) : null,
    }));

    res.json({ data: formattedRows, total: countRows[0].total, page: parseInt(page), limit: parseInt(limit) });
  } catch (err) {
    next(err);
  }
});

router.get('/:id', auth, async (req, res, next) => {
  try {
    const pool = await getPool();
    const [rows] = await pool.query(
      'SELECT p.*, c.name as category_name FROM products p LEFT JOIN categories c ON p.category_id = c.id WHERE p.id = ?',
      [req.params.id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Không tìm thấy sản phẩm' });
    }

    const product = rows[0];
    // Convert DECIMAL strings to numbers
    const formatted = {
      ...product,
      stock_qty: parseFloat(product.stock_qty) || 0,
      available_stock: parseFloat(product.available_stock) || 0,
      reserved_stock: parseFloat(product.reserved_stock) || 0,
      low_stock_threshold: parseFloat(product.low_stock_threshold) || 10,
      price: parseFloat(product.price) || 0,
      cost_price: parseFloat(product.cost_price) || 0,
      weight: product.weight ? parseFloat(product.weight) : null,
      length: product.length ? parseFloat(product.length) : null,
      width: product.width ? parseFloat(product.width) : null,
      height: product.height ? parseFloat(product.height) : null,
    };

    res.json({ data: formatted });
  } catch (err) {
    next(err);
  }
});

router.post('/', auth, authorize('admin'), async (req, res, next) => {
  try {
    const { name, sku, category_id, unit, price, cost_price, stock_qty, low_stock_threshold, weight, length, width, height, description, images } = req.body;

    if (!name || !sku || !price) {
      return res.status(400).json({ error: 'Thiếu thông tin bắt buộc' });
    }

    const pool = await getPool();

    const [existing] = await pool.query('SELECT id FROM products WHERE sku = ?', [sku]);
    if (existing.length > 0) {
      return res.status(409).json({ error: 'SKU đã tồn tại' });
    }

    const available = stock_qty || 0;

    const [result] = await pool.query(
      `INSERT INTO products (name, sku, category_id, unit, price, cost_price, stock_qty, available_stock, reserved_stock, low_stock_threshold, weight, length, width, height, description, images)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?, ?, ?, ?, ?, ?)`,
      [name, sku, category_id, unit || 'Cái', price, cost_price || 0, available, low_stock_threshold || 10, weight, length, width, height, description, images ? JSON.stringify(images) : null]
    );

    res.status(201).json({ id: result.insertId, message: 'Tạo sản phẩm thành công' });
  } catch (err) {
    next(err);
  }
});

router.put('/:id', auth, authorize('admin'), async (req, res, next) => {
  try {
    const { name, sku, category_id, unit, price, cost_price, stock_qty, low_stock_threshold, weight, length, width, height, description, images, is_active } = req.body;

    const pool = await getPool();

    const [existing] = await pool.query('SELECT id FROM products WHERE sku = ? AND id != ?', [sku, req.params.id]);
    if (existing.length > 0) {
      return res.status(409).json({ error: 'SKU đã tồn tại' });
    }

    const [currentProduct] = await pool.query('SELECT reserved_stock FROM products WHERE id = ?', [req.params.id]);
    const reserved = currentProduct[0]?.reserved_stock || 0;
    const available = Math.max(0, (stock_qty || 0) - reserved);

    await pool.query(
      `UPDATE products SET name = ?, sku = ?, category_id = ?, unit = ?, price = ?, cost_price = ?, stock_qty = ?, available_stock = ?, reserved_stock = ?, low_stock_threshold = ?, weight = ?, length = ?, width = ?, height = ?, description = ?, images = ?, is_active = ?
       WHERE id = ?`,
      [name, sku, category_id, unit, price, cost_price, stock_qty, available, reserved, low_stock_threshold, weight, length, width, height, description, images ? JSON.stringify(images) : null, is_active, req.params.id]
    );

    res.json({ message: 'Cập nhật sản phẩm thành công' });
  } catch (err) {
    next(err);
  }
});

router.delete('/:id', auth, authorize('admin'), async (req, res, next) => {
  try {
    const pool = await getPool();
    await pool.query('UPDATE products SET is_active = 0 WHERE id = ?', [req.params.id]);
    res.json({ message: 'Vô hiệu hóa sản phẩm thành công' });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
