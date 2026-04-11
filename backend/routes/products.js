const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const authorize = require('../middleware/authorize');
const { getPool } = require('../config/db');
const { recalculateStock } = require('../services/orderService');

async function generateProductSku(pool) {
  const now = new Date();
  const dateStr = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;
  const prefix = `SKU-${dateStr}-`;

  const [rows] = await pool.query(
    'SELECT sku FROM products WHERE sku LIKE ? ORDER BY sku DESC LIMIT 1',
    [`${prefix}%`]
  );

  let seq = 1;
  if (rows.length > 0 && rows[0].sku) {
    const parts = String(rows[0].sku).split('-');
    const last = parts[parts.length - 1];
    const n = parseInt(last, 10);
    if (!Number.isNaN(n)) seq = n + 1;
  }

  return `${prefix}${String(seq).padStart(4, '0')}`;
}

router.get('/', auth, async (req, res, next) => {
  try {
    const pool = await getPool();
    const { search, category, warehouse_id, available_only, active_only, status, page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

    let query = `
      SELECT 
        p.*,
        c.name as category_name,
        ws.stock_qty as warehouse_stock_qty,
        ws.available_stock as warehouse_available_stock,
        ws.reserved_stock as warehouse_reserved_stock
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      LEFT JOIN warehouse_stock ws ON ws.product_id = p.id ${warehouse_id ? 'AND ws.warehouse_id = ?' : ''}
      WHERE 1=1
    `;
    let countQuery = `
      SELECT COUNT(*) as total
      FROM products p
      LEFT JOIN warehouse_stock ws ON ws.product_id = p.id ${warehouse_id ? 'AND ws.warehouse_id = ?' : ''}
      WHERE 1=1
    `;
    const params = [];

    // Mặc định chỉ SP đang kinh doanh; active_only=all → mọi SP; active_only=0 → chỉ đã ngừng
    if (String(active_only) === 'all') {
      // không lọc is_active
    } else if (String(active_only) === '0') {
      query += ' AND p.is_active = 0';
      countQuery += ' AND p.is_active = 0';
    } else {
      query += ' AND p.is_active = 1';
      countQuery += ' AND p.is_active = 1';
    }

    if (warehouse_id) {
      // Filter theo kho: vẫn trả TẤT CẢ sản phẩm; nếu kho chưa có record thì tồn = 0
      params.push(parseInt(warehouse_id));
    }

    // Khi dùng để xuất kho: chỉ lấy những sản phẩm có thể bán > 0 trong kho đó
    if (warehouse_id && String(available_only) === '1') {
      query += ' AND COALESCE(ws.available_stock, 0) > 0';
      countQuery += ' AND COALESCE(ws.available_stock, 0) > 0';
    }

    if (search) {
      query += ' AND (p.name LIKE ? OR p.sku LIKE ?)';
      countQuery += ' AND (p.name LIKE ? OR p.sku LIKE ?)';
      const like = `%${search}%`;
      params.push(like, like);
    }

    if (category) {
      query += ' AND p.category_id = ?';
      countQuery += ' AND p.category_id = ?';
      params.push(category);
    }

    query += ' ORDER BY p.created_at DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), parseInt(offset));

    const [rows] = await pool.query(query, params);
    const [countRows] = await pool.query(countQuery, params.slice(0, -2));

    // Convert DECIMAL strings to numbers
    const formattedRows = rows.map(row => {
      const warehouseAvailable = row.warehouse_available_stock !== null && row.warehouse_available_stock !== undefined
        ? parseFloat(row.warehouse_available_stock)
        : null;
      const warehouseStock = row.warehouse_stock_qty !== null && row.warehouse_stock_qty !== undefined
        ? parseFloat(row.warehouse_stock_qty)
        : null;
      const warehouseReserved = row.warehouse_reserved_stock !== null && row.warehouse_reserved_stock !== undefined
        ? parseFloat(row.warehouse_reserved_stock)
        : null;

      // Nếu đang filter theo kho → trả available/stock/reserved theo kho để UI dùng thẳng
      // (nếu kho chưa có record warehouse_stock thì trả 0)
      const stockQty = warehouse_id ? (warehouseStock ?? 0) : (parseFloat(row.stock_qty) || 0);
      const availableStock = warehouse_id ? (warehouseAvailable ?? 0) : (parseFloat(row.available_stock) || 0);
      const reservedStock = warehouse_id ? (warehouseReserved ?? 0) : (parseFloat(row.reserved_stock) || 0);

      return ({
      ...row,
      stock_qty: stockQty || 0,
      available_stock: availableStock || 0,
      reserved_stock: reservedStock || 0,
      low_stock_threshold: parseFloat(row.low_stock_threshold) || 10,
      price: parseFloat(row.price) || 0,
      cost_price: parseFloat(row.cost_price) || 0,
      weight: row.weight ? parseFloat(row.weight) : null,
      length: row.length ? parseFloat(row.length) : null,
      width: row.width ? parseFloat(row.width) : null,
      height: row.height ? parseFloat(row.height) : null,
    });
    });

    res.json({ data: formattedRows, total: countRows[0].total, page: parseInt(page), limit: parseInt(limit) });
  } catch (err) {
    next(err);
  }
});

// Get next auto SKU (SKU-YYYYMMDD-XXXX), reset per day
// NOTE: must be declared before '/:id' route
router.get('/next-sku', auth, authorize('admin'), async (req, res, next) => {
  try {
    const pool = await getPool();
    const sku = await generateProductSku(pool);
    res.json({ data: { sku } });
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
    const { name, sku, category_id, unit, price, cost_price, stock_qty, low_stock_threshold, weight, length, width, height, description, images, warehouse_id } = req.body;

    if (!name || !price) {
      return res.status(400).json({ error: 'Thiếu thông tin bắt buộc' });
    }
    if (!warehouse_id) {
      return res.status(400).json({ error: 'Vui lòng chọn kho (warehouse_id)' });
    }

    const pool = await getPool();

    let finalSku = String(sku || '').trim();
    if (!finalSku) {
      finalSku = await generateProductSku(pool);
    } else {
      const [existing] = await pool.query('SELECT id FROM products WHERE sku = ?', [finalSku]);
      if (existing.length > 0) {
        return res.status(409).json({ error: 'SKU đã tồn tại' });
      }
    }

    const selectedWarehouseId = parseInt(warehouse_id);
    if (Number.isNaN(selectedWarehouseId)) {
      return res.status(400).json({ error: 'warehouse_id không hợp lệ' });
    }
    const [whCheck] = await pool.query(
      'SELECT id FROM warehouses WHERE id = ? AND is_active = 1 LIMIT 1',
      [selectedWarehouseId]
    );
    if (!whCheck.length) {
      return res.status(400).json({ error: 'Kho không tồn tại hoặc đã bị vô hiệu hóa' });
    }

    const initialStock = parseFloat(stock_qty || 0) || 0;

    const [result] = await pool.query(
      `INSERT INTO products (name, sku, category_id, unit, price, cost_price, stock_qty, available_stock, reserved_stock, low_stock_threshold, weight, length, width, height, description, images)
       VALUES (?, ?, ?, ?, ?, ?, 0, 0, 0, ?, ?, ?, ?, ?, ?, ?)`,
      [name, finalSku, category_id, unit || 'Cái', price, cost_price || 0, low_stock_threshold || 10, weight, length, width, height, description, images ? JSON.stringify(images) : null]
    );

    const productId = result.insertId;

    // Create per-warehouse stock in selected warehouse
    if (initialStock > 0) {
      await pool.query(
        `INSERT INTO warehouse_stock (warehouse_id, product_id, stock_qty, available_stock, reserved_stock)
         VALUES (?, ?, ?, ?, 0)
         ON DUPLICATE KEY UPDATE
           stock_qty = VALUES(stock_qty),
           available_stock = VALUES(available_stock)`,
        [selectedWarehouseId, productId, initialStock, initialStock]
      );
    } else {
      await pool.query(
        `INSERT IGNORE INTO warehouse_stock (warehouse_id, product_id, stock_qty, available_stock, reserved_stock)
         VALUES (?, ?, 0, 0, 0)`,
        [selectedWarehouseId, productId]
      );
    }

    // Sync aggregate totals into products
    await recalculateStock(productId);

    res.status(201).json({ id: productId, sku: finalSku, message: 'Tạo sản phẩm thành công' });
  } catch (err) {
    next(err);
  }
});

router.put('/:id', auth, authorize('admin'), async (req, res, next) => {
  try {
    const { name, sku, category_id, unit, price, cost_price, stock_qty, low_stock_threshold, weight, length, width, height, description, images, is_active, warehouse_id } = req.body;

    const pool = await getPool();

    // SKU uniqueness only if sku is provided (avoid false positives on soft-delete updates)
    if (typeof sku === 'string' && sku.trim()) {
      const [existing] = await pool.query('SELECT id FROM products WHERE sku = ? AND id != ?', [sku, req.params.id]);
      if (existing.length > 0) {
        return res.status(409).json({ error: 'SKU đã tồn tại' });
      }
    }

    // Cập nhật từng phần: IF(flag, newVal, col) — flag=0 → giữ cột cũ (tránh PUT chỉ is_active làm mất danh mục/ảnh)
    const hasCategory = Object.prototype.hasOwnProperty.call(req.body, 'category_id');
    const categoryBind = hasCategory
      ? (category_id === '' || category_id === null ? null : category_id)
      : null;
    const hasImages = Object.prototype.hasOwnProperty.call(req.body, 'images');
    const imagesBind = hasImages ? (images ? JSON.stringify(images) : null) : null;
    const hasIsActive = Object.prototype.hasOwnProperty.call(req.body, 'is_active');
    const isActiveBind = hasIsActive ? (is_active ? 1 : 0) : null;

    await pool.query(
      `UPDATE products SET 
         name = COALESCE(?, name),
         sku = COALESCE(?, sku),
         category_id = IF(?, ?, category_id),
         unit = COALESCE(?, unit),
         price = COALESCE(?, price),
         cost_price = COALESCE(?, cost_price),
         low_stock_threshold = COALESCE(?, low_stock_threshold),
         weight = COALESCE(?, weight),
         length = COALESCE(?, length),
         width = COALESCE(?, width),
         height = COALESCE(?, height),
         description = COALESCE(?, description),
         images = IF(?, ?, images),
         is_active = IF(?, ?, is_active)
       WHERE id = ?`,
      [
        name ?? null,
        (typeof sku === 'string' && sku.trim()) ? sku.trim() : null,
        hasCategory ? 1 : 0,
        categoryBind,
        unit ?? null,
        price ?? null,
        cost_price ?? null,
        low_stock_threshold ?? null,
        weight ?? null,
        length ?? null,
        width ?? null,
        height ?? null,
        description ?? null,
        hasImages ? 1 : 0,
        imagesBind,
        hasIsActive ? 1 : 0,
        isActiveBind,
        req.params.id,
      ]
    );

    // If updating stock, require warehouse_id (stock is per-warehouse)
    const hasStockUpdate = stock_qty !== undefined && stock_qty !== null;
    if (hasStockUpdate) {
      if (!warehouse_id) {
        return res.status(400).json({ error: 'Vui lòng chọn kho để cập nhật tồn (warehouse_id)' });
      }
      const wid = parseInt(warehouse_id);
      if (Number.isNaN(wid)) {
        return res.status(400).json({ error: 'warehouse_id không hợp lệ' });
      }

      const newStockQty = Math.max(0, parseFloat(stock_qty) || 0);
      const [curWs] = await pool.query(
        'SELECT reserved_stock FROM warehouse_stock WHERE warehouse_id = ? AND product_id = ? LIMIT 1',
        [wid, req.params.id]
      );
      const reserved = curWs?.[0]?.reserved_stock ? parseFloat(curWs[0].reserved_stock) : 0;
      const newAvailable = Math.max(0, newStockQty - (reserved || 0));

      await pool.query(
        `INSERT INTO warehouse_stock (warehouse_id, product_id, stock_qty, available_stock, reserved_stock)
         VALUES (?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE
           stock_qty = VALUES(stock_qty),
           available_stock = VALUES(available_stock)`,
        [wid, req.params.id, newStockQty, newAvailable, reserved || 0]
      );

      await recalculateStock(req.params.id);
    }

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
