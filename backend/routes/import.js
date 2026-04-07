const express = require('express');
const multer = require('multer');
const XLSX = require('xlsx');
const auth = require('../middleware/auth');
const authorize = require('../middleware/authorize');
const { getPool } = require('../config/db');

const upload = multer({ storage: multer.memoryStorage() });

const router = express.Router();

// Template definitions
const TEMPLATES = {
  employees: {
    headers: ['Họ tên *', 'Email *', 'Số điện thoại', 'Vai trò', 'Phòng ban', 'Chức vụ', '% Hoa hồng', 'Lương cơ bản', 'Ngày vào', 'Địa chỉ', 'Tỉnh/TP', 'Quận/Huyện'],
    keys: ['full_name', 'email', 'phone', 'role', 'department', 'position', 'commission_rate', 'salary', 'join_date', 'address', 'city', 'district'],
    sample: [
      ['Nguyễn Văn A', 'nguyenvana@email.com', '0901234567', 'sales', 'Kinh doanh', 'Nhân viên', 5.00, 8000000, '2026-01-15', '123 Đường ABC', 'Hà Nội', 'Ba Đình'],
      ['Trần Thị B', 'tranthib@email.com', '0912345678', 'sales', 'Kinh doanh', 'Nhân viên', 5.00, 9000000, '2026-02-01', '456 Đường XYZ', 'TP. Hồ Chí Minh', 'Quận 1'],
    ],
    note: 'Vai trò: admin hoặc sales. Mật khẩu mặc định: 123456'
  },
  customers: {
    headers: ['Họ tên *', 'Số điện thoại', 'Email', 'Địa chỉ (số nhà, đường)', 'Tỉnh/TP', 'Quận/Huyện', 'Phường/Xã', 'Nguồn', 'Ngày sinh'],
    keys: ['name', 'phone', 'email', 'address', 'city', 'district', 'ward', 'source', 'birthday'],
    sample: [
      ['Lê Văn C', '0923456789', 'levanc@email.com', '789 Đường DEF', 'Hà Nội', 'Cầu Giấy', 'Dịch Vọng', 'store', '1990-05-15'],
      ['Phạm Thị D', '0934567890', 'phamthid@email.com', '321 Đường GHI', 'TP. Hồ Chí Minh', 'Quận 3', 'Phường 1', 'facebook', '1985-08-20'],
    ],
    note: 'Khách hàng có thể trùng tên/SĐT. Nguồn: store, facebook, website, referral'
  },
  products: {
    headers: ['Tên sản phẩm *', 'SKU *', 'Đơn vị', 'Giá bán', 'Giá vốn', 'Số lượng tồn', 'Cảnh báo hết hàng', 'Cân nặng (g)', 'Dài (cm)', 'Rộng (cm)', 'Cao (cm)', 'URL hình ảnh', 'Mô tả'],
    keys: ['name', 'sku', 'unit', 'price', 'cost_price', 'stock_qty', 'low_stock_threshold', 'weight', 'length', 'width', 'height', 'image_url', 'description'],
    sample: [
      ['Áo Thun Nam', 'AT001', 'Cái', 150000, 80000, 100, 10, 200, 30, 20, 2, 'https://example.com/ao-thun.jpg', 'Áo thun cotton cao cấp'],
      ['Quần Jean Nam', 'QJ001', 'Cái', 350000, 180000, 50, 5, 500, 40, 30, 3, 'https://example.com/quan-jean.jpg', 'Quần jean slim fit'],
    ],
    note: 'SKU phải duy nhất. Đơn vị: Cái, Hộp, Kg, Mét... Hình ảnh: dán URL ảnh. Cân nặng tính bằng gram.'
  }
};

// Download Excel template
router.get('/template/:entity', auth, (req, res) => {
  const { entity } = req.params;
  const tpl = TEMPLATES[entity];
  if (!tpl) {
    return res.status(404).json({ error: 'Không tìm thấy template' });
  }

  // Create workbook
  const wb = XLSX.utils.book_new();
  
  // Sheet 1: Template
  const wsData = [tpl.headers, ...tpl.sample];
  const ws = XLSX.utils.aoa_to_sheet(wsData);
  
  // Column widths
  ws['!cols'] = tpl.headers.map(() => ({ wch: 20 }));
  
  XLSX.utils.book_append_sheet(wb, ws, 'Template');

  // Sheet 2: Instructions
  const noteData = [
    ['HƯỚNG DẪN NHẬP DỮ LIỆU'],
    [''],
    ['1. Điền dữ liệu vào các dòng bên dưới dòng tiêu đề'],
    ['2. Các trường có dấu * là bắt buộc'],
    ['3. Không sửa dòng tiêu đề (dòng 1)'],
    ['4. Lưu file dưới dạng .xlsx trước khi tải lên'],
    [''],
    ['LƯU Ý:'],
    [tpl.note],
    [''],
    ['Hỗ trợ: admin@velocity.vn'],
  ];
  const ws2 = XLSX.utils.aoa_to_sheet(noteData);
  ws2['!cols'] = [{ wch: 60 }];
  XLSX.utils.book_append_sheet(wb, ws2, 'Hướng dẫn');

  // Generate buffer
  const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', `attachment; filename=mau_import_${entity}.xlsx`);
  res.send(buf);
});

// Upload and process
router.post('/:entity', auth, authorize('admin'), upload.single('file'), async (req, res, next) => {
  try {
    const { entity } = req.params;
    
    if (!req.file) {
      return res.status(400).json({ error: 'Không có file nào được tải lên' });
    }
    
    if (!TEMPLATES[entity]) {
      return res.status(400).json({ error: `Không hỗ trợ import: ${entity}` });
    }

    const results = await parseExcel(req.file.buffer, entity);
    
    if (results.length === 0) {
      return res.status(400).json({ error: 'File không có dữ liệu' });
    }
    
    // Debug log
    console.log(`📦 Import ${entity}: ${results.length} rows`);
    console.log('📦 First row:', JSON.stringify(results[0]));

    const importResult = await importData(entity, results, req.user.id);
    
    res.json({
      message: 'Nhập dữ liệu thành công',
      total: results.length,
      success: importResult.success,
      failed: importResult.failed,
      skipped: importResult.skipped,
      errors: importResult.errors
    });
  } catch (err) {
    next(err);
  }
});

function parseExcel(buffer, entity) {
  const wb = XLSX.read(buffer, { type: 'buffer' });
  const ws = wb.Sheets[wb.SheetNames[0]];
  
  // Get as array of objects using first row as keys
  const rows = XLSX.utils.sheet_to_json(ws, { defval: '' });
  
  if (rows.length === 0) return [];
  
  const tpl = TEMPLATES[entity];
  if (!tpl) return rows;

  // Build a map: header text -> template key
  // The headers from the Excel file are the keys in each row object
  const headerToKey = {};
  const excelHeaders = Object.keys(rows[0]);
  
  console.log(`📦 ${entity} Excel headers:`, excelHeaders);
  console.log(`📦 Template headers:`, tpl.headers);
  console.log(`📦 Template keys:`, tpl.keys);
  
  // For each Excel header, find matching template key
  excelHeaders.forEach(excelHeader => {
    const cleanHeader = String(excelHeader).trim();
    
    // Try exact match with template header (without *)
    for (let i = 0; i < tpl.headers.length; i++) {
      const tplHeaderClean = tpl.headers[i].replace(/\s*\*\s*$/, '').trim();
      if (cleanHeader === tplHeaderClean || cleanHeader === tpl.headers[i]) {
        headerToKey[excelHeader] = tpl.keys[i];
        return;
      }
    }
    
    // Try partial match
    for (let i = 0; i < tpl.headers.length; i++) {
      const tplHeaderClean = tpl.headers[i].replace(/\s*\*\s*$/, '').trim().toLowerCase();
      if (cleanHeader.toLowerCase().includes(tplHeaderClean) || tplHeaderClean.includes(cleanHeader.toLowerCase())) {
        headerToKey[excelHeader] = tpl.keys[i];
        return;
      }
    }
    
    // Fallback: use the header as-is
    headerToKey[excelHeader] = excelHeader;
  });
  
  console.log(`📦 Header mapping:`, headerToKey);

  return rows.map(row => {
    const normalized = {};
    Object.keys(row).forEach(excelHeader => {
      const key = headerToKey[excelHeader];
      normalized[key] = String(row[excelHeader] || '').trim();
    });
    return normalized;
  });
}

async function importData(entity, rows, userId) {
  const pool = await getPool();
  const result = { success: 0, failed: 0, skipped: 0, errors: [] };

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    try {
      if (entity === 'employees') {
        const inserted = await importEmployee(pool, row);
        if (!inserted) {
          result.skipped++;
          continue;
        }
      } else if (entity === 'customers') {
        await importCustomer(pool, row, userId);
      } else if (entity === 'products') {
        const inserted = await importProduct(pool, row);
        if (!inserted) {
          result.skipped++;
          continue;
        }
      }
      result.success++;
    } catch (err) {
      result.failed++;
      result.errors.push({ row: i + 2, error: err.message });
    }
  }

  return result;
}

async function importEmployee(pool, row) {
  const name = row.full_name || row.name || '';
  const email = row.email || '';
  const phone = row.phone || '';
  const role = row.role || 'sales';
  const department = row.department || '';
  const position = row.position || '';
  const commissionRate = parseFloat(row.commission_rate) || 5.00;
  const salary = parseFloat(row.salary) || 0;
  const joinDate = row.join_date || null;
  const address = row.address || null;
  const city = row.city || null;
  const district = row.district || null;

  if (!name) {
    throw new Error('Thiếu tên nhân viên');
  }
  if (!email) {
    throw new Error('Thiếu email nhân viên');
  }

  const [existing] = await pool.query('SELECT id FROM users WHERE email = ?', [email]);
  if (existing.length > 0) {
    return; // Skip if email already exists
  }

  const bcrypt = require('bcryptjs');
  const defaultPassword = row.password || '123456';
  const passwordHash = await bcrypt.hash(defaultPassword, 10);

  await pool.query(
    `INSERT INTO users (full_name, email, password_hash, phone, role, department, position, commission_rate, salary, join_date, address, city, district, is_active)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)`,
    [name, email, passwordHash, phone, role, department, position, commissionRate, salary, joinDate, address, city, district]
  );
  
  return true;
}

async function importCustomer(pool, row, userId) {
  const name = row.name || '';
  const phone = row.phone || '';
  const email = row.email || '';
  const address = row.address || '';
  const city = row.city || '';
  const district = row.district || '';
  const ward = row.ward || '';
  const source = row.source || 'store';
  const birthday = row.birthday || '';

  if (!name) {
    throw new Error('Thiếu tên khách hàng');
  }

  await pool.query(
    `INSERT INTO customers (name, phone, email, address, city, district, ward, source, birthday, created_by)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [name, phone, email, address, city, district, ward, source, birthday, userId]
  );
}

async function importProduct(pool, row) {
  const name = row.name || '';
  let sku = row.sku || '';
  const unit = row.unit || 'Cái';
  const price = parseFloat(row.price) || 0;
  const costPrice = parseFloat(row.cost_price) || 0;
  const stockQty = parseFloat(row.stock_qty) || 0;
  const lowStockThreshold = parseFloat(row.low_stock_threshold) || 10;
  const weight = row.weight ? parseFloat(row.weight) : null;
  const length = row.length ? parseFloat(row.length) : null;
  const width = row.width ? parseFloat(row.width) : null;
  const height = row.height ? parseFloat(row.height) : null;
  const description = row.description || '';
  const imageUrl = row.image_url || '';
  const images = imageUrl ? JSON.stringify([imageUrl]) : null;

  if (!name) {
    throw new Error('Thiếu tên sản phẩm');
  }
  
  // Auto-generate SKU if empty
  if (!sku) {
    const now = new Date();
    const dateStr = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;
    const prefix = `SKU-${dateStr}-`;
    const [lastRows] = await pool.query(
      'SELECT sku FROM products WHERE sku LIKE ? ORDER BY sku DESC LIMIT 1',
      [`${prefix}%`]
    );
    let seq = 1;
    if (lastRows.length > 0 && lastRows[0].sku) {
      const parts = String(lastRows[0].sku).split('-');
      const last = parts[parts.length - 1];
      const n = parseInt(last, 10);
      if (!Number.isNaN(n)) seq = n + 1;
    }
    sku = `${prefix}${String(seq).padStart(4, '0')}`;
  }

  const [existing] = await pool.query('SELECT id FROM products WHERE sku = ?', [sku]);
  if (existing.length > 0) {
    return false; // Skip if SKU already exists
  }

  await pool.query(
    `INSERT INTO products (name, sku, unit, price, cost_price, stock_qty, available_stock, reserved_stock, low_stock_threshold, weight, length, width, height, description, images, is_active)
     VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?, ?, ?, ?, ?, ?, ?, 1)`,
    [name, sku, unit, price, costPrice, stockQty, stockQty, lowStockThreshold, weight, length, width, height, description, images]
  );
  
  return true;
}

module.exports = router;

// Export data to Excel
router.get('/export/:entity', auth, authorize('admin'), async (req, res, next) => {
  try {
    const { entity } = req.params;
    const pool = await getPool();
    
    let rows = [];
    let headers = [];
    let filename = '';
    
    if (entity === 'employees') {
      const [data] = await pool.query('SELECT id, full_name, email, phone, role, department, position, commission_rate, salary, join_date, address, city, district, is_active FROM users ORDER BY id');
      rows = data;
      headers = ['ID', 'Họ tên', 'Email', 'Số điện thoại', 'Vai trò', 'Phòng ban', 'Chức vụ', '% Hoa hồng', 'Lương', 'Ngày vào', 'Địa chỉ', 'Tỉnh/TP', 'Quận', 'Trạng thái'];
      filename = 'danh_sach_nhan_vien.xlsx';
    } else if (entity === 'customers') {
      const [data] = await pool.query('SELECT id, name, phone, email, address, city, district, ward, tier, source, birthday, total_spent, points_balance, created_at FROM customers ORDER BY id');
      rows = data;
      headers = ['ID', 'Họ tên', 'Số điện thoại', 'Email', 'Địa chỉ', 'Tỉnh/TP', 'Quận', 'Phường', 'Hạng', 'Nguồn', 'Ngày sinh', 'Tổng chi tiêu', 'Điểm', 'Ngày tạo'];
      filename = 'danh_sach_khach_hang.xlsx';
    } else if (entity === 'products') {
      const [data] = await pool.query('SELECT id, name, sku, unit, price, cost_price, stock_qty, available_stock, reserved_stock, low_stock_threshold, weight, length, width, height, description, images, is_active, created_at FROM products ORDER BY id');
      rows = data;
      headers = ['ID', 'Tên sản phẩm', 'SKU', 'Đơn vị', 'Giá bán', 'Giá vốn', 'Tồn kho', 'Có thể bán', 'Tạm giữ', 'Cảnh báo hết', 'Cân nặng (g)', 'Dài (cm)', 'Rộng (cm)', 'Cao (cm)', 'Mô tả', 'Hình ảnh', 'Trạng thái', 'Ngày tạo'];
      filename = 'danh_sach_san_pham.xlsx';
    } else {
      return res.status(404).json({ error: 'Không hỗ trợ export entity này' });
    }
    
    // Convert data to array format
    const wsData = [headers];
    rows.forEach(row => {
      const keys = Object.keys(row);
      const rowData = keys.map(key => {
        let val = row[key];
        if (val instanceof Date) {
          return val.toISOString().split('T')[0];
        }
        if (key === 'images' && val) {
          try { return JSON.parse(val)[0] || ''; } catch { return ''; }
        }
        return val !== null && val !== undefined ? val : '';
      });
      wsData.push(rowData);
    });
    
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(wsData);
    ws['!cols'] = headers.map(() => ({ wch: 20 }));
    XLSX.utils.book_append_sheet(wb, ws, 'Danh sách');
    
    const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
    
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=${filename}`);
    res.send(buf);
  } catch (err) {
    next(err);
  }
});
