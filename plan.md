# KẾ HOẠCH PHÁT TRIỂN ERP SYSTEM

## TỔNG QUAN
Hệ thống quản lý bán hàng nội bộ cho công ty Velocity.
- **Frontend:** React 19 + Vite + TypeScript + Tailwind CSS
- **Backend:** Node.js + Express
- **Database:** MySQL (kết nối trực tiếp localhost, user: root, pass: empty)
- **Auth:** JWT token

---

## BUSINESS RULES QUAN TRỌNG (ĐÃ XÁC NHẬN VỚI CHỦ DỰ ÁN)

### 1. Phân quyền
- **Sales:** chỉ xem/sửa đơn hàng do mình tạo, chỉ xem KH do mình tạo HOẶC được gán cho mình (`created_by = user_id OR assigned_employee_id = user_id`)
- **Admin:** toàn quyền, xem tất cả
- **Menu sidebar** tự động ẩn/hiện theo role

### 2. Khách hàng
- **KH có thể trùng nhau** (cùng tên/SĐT) - bình thường, không UNIQUE constraint
- Sales thấy KH khi: `created_by = sales_id` HOẶC `assigned_employee_id = sales_id`
- Khi sales tạo đơn hàng với KH mới → tự tạo KH với `created_by = sales_id`
- Khi gợi ý KH trong OrderForm → chỉ hiện KH thuộc về sales đó

### 3. Địa chỉ
- Có 4 phần: **Tỉnh/TP** → **Quận/Huyện** → **Phường/Xã** → **Số nhà, tên đường**
- Dropdown phụ thuộc nhau: chọn TP → hiện quận, chọn quận → hiện phường
- Dữ liệu: 63 tỉnh thành từ `vietnam-locations-simple.json`
- Khi edit KH cũ chỉ có address string → tự parse để điền dropdown
- Tên trong LOCATIONS là đầy đủ: "Thành phố Hà Nội", "Quận Ba Đình", "Phường Phúc Xá"
- **Luôn normalize** khi so sánh: bỏ prefix "Thành phố ", "Quận ", "Phường " để match

### 4. Số lượng & Tồn kho
- **Số lượng có thể là số lẻ** (DECIMAL 10,3): 0.5kg, 1.25m...
- `stock_qty = available_stock + reserved_stock`
- reserved = tổng qty từ đơn có status IN ('draft','confirmed','shipping')
- Cập nhật tồn khi: thêm/sửa/xóa đơn hàng

### 5. Hoa hồng
- Tính **per-item**: `(unit_price * qty - discount_amount) * commission_rate / 100`
- Mặc định 10%
- Tự động tính lại khi thêm/sửa/xóa đơn

### 6. Mã đơn hàng
- Format: `DH-YYYYMMDD-XXXX`, reset theo ngày

### 7. Số điện thoại
- **Bắt buộc 10 chữ số** (Việt Nam)
- Validate realtime khi nhập

### 8. Điểm tích lũy
- Tích: 1 điểm / 10,000 VNĐ chi tiêu
- Đổi: 1 điểm = 1,000 VNĐ

### 9. Nhóm nhân viên (Groups)
- Mỗi nhân viên có thể thuộc 1 hoặc nhiều nhóm (TNK, SHEKI, KHA...)
- Bảng `groups` + `user_groups` (many-to-many)
- Khi lên đơn hàng: sales chọn nhóm (mặc định = nhóm của nhân viên), có thể không chọn
- Báo cáo lương: filter theo nhóm (Tất cả hoặc từng nhóm)

### 10. Ràng buộc số lượng khi lên đơn
- Mỗi sản phẩm hiển thị **"Có thể bán"** (available_stock) realtime
- Số lượng nhập phải `<= available_stock`
- Nếu vượt tồn: border đỏ + cảnh báo "Vượt tồn!"

### 11. Đa shop (SPEC — chưa code trong repo)
- **Hiện tại:** một shop ngầm định (Sheki); toàn bộ dữ liệu như một tenant.
- **Mục tiêu:** nhiều shop A/B/C, **dữ liệu riêng**; một user có thể vào nhiều shop với **role từng shop** qua bảng `user_shops`.
- **Đăng ký:** không gắn shop; **admin** thêm user vào shop sau (theo email / tên đăng nhập).
- **Đăng nhập:** chọn shop (hoặc nhớ shop); JWT mang **`shop_id`** hiện tại; đổi shop trong app.
- **Đặc tả đầy đủ:** `FEATURE_MULTI_SHOP.md` (migration, bảng, checklist BE/FE, thứ tự làm).

---

## MÀN HÌNH (20 screens)

| # | Màn hình | Route | Role |
|---|----------|-------|------|
| 1 | Login | /login | Public |
| 2 | Register | /register | Public |
| 3 | Dashboard | / | Admin+Sales |
| 4 | EmployeeList | /employees | Admin only |
| 5 | EmployeeForm | /employees/new, /employees/edit/:id | Admin only |
| 6 | ProductList | /products | Admin only |
| 7 | ProductForm | /products/new, /products/edit/:id | Admin only |
| 8 | CustomerList | /customers | Admin+Sales |
| 9 | CustomerForm | /customers/new, /customers/edit/:id | Admin+Sales |
| 10 | OrderList | /orders | Admin+Sales |
| 11 | OrderForm | /orders/new, /orders/edit/:id | Admin+Sales |
| 12 | InventoryHistory | /inventory | Admin only |
| 13 | InventoryImport | /inventory/import | Admin only |
| 14 | InventoryExport | /inventory/export | Admin only |
| 15 | BulkImport | /{entity}/import | Admin only |
| 16 | SalaryReport | /reports | Admin+Sales |
| 17 | CommissionDetail | /reports/commissions/:userId | Admin only |
| 18 | ActivityLog | /logs | Admin only |
| 19 | ChangePassword | /change-password | All |
| 20 | Settings | /settings | Admin only |

---

## DATABASE

### Bảng chính (12 tables)
- `users` - nhân viên (role: admin/sales)
- `customers` - khách hàng (có district, ward, note; KHÔNG UNIQUE phone/email)
- `products` - sản phẩm (stock_qty DECIMAL 10,3)
- `orders` - đơn hàng (code DH-YYYYMMDD-XXXX)
- `order_items` - chi tiết đơn (qty DECIMAL 10,3)
- `warehouses` - kho
- `stock_movements` - xuất nhập tồn (qty DECIMAL 10,3)
- `commissions` - hoa hồng (tự động tính per-item)
- `loyalty_points` - điểm tích lũy
- `categories` - danh mục sản phẩm
- `role_permissions` - phân quyền theo role
- `activity_logs` - nhật ký hoạt động

### Lưu ý schema
- `customers` có thêm: `district`, `ward`, `note`
- `products.stock_qty`, `order_items.qty`, `stock_movements.qty` = DECIMAL(10,3)
- Không có UNIQUE constraint trên phone/email của customers

---

## BACKEND STRUCTURE

```
backend/
├── config/db.js              # MySQL direct connection (localhost, root, empty pass)
├── middleware/
│   ├── auth.js               # JWT verify
│   ├── authorize.js          # Role check (admin/sales)
│   ├── errorHandler.js
│   └── logger.js             # Activity logging middleware
├── routes/
│   ├── auth.js               # login, register, me
│   ├── users.js              # CRUD employees (admin only)
│   ├── customers.js          # CRUD customers (sales filter: created_by OR assigned_employee_id)
│   ├── products.js           # CRUD products (admin only)
│   ├── orders.js             # CRUD orders (sales filter: salesperson_id)
│   ├── inventory.js          # stock movements (admin only)
│   ├── commissions.js        # view commissions
│   ├── reports.js            # dashboard stats, salary report
│   ├── warehouses.js         # CRUD warehouses
│   ├── categories.js         # CRUD categories
│   ├── settings.js           # role permissions
│   ├── import.js             # bulk import (Excel .xlsx) + export
│   ├── uploads.js            # image upload
│   └── logs.js               # activity logs (admin only)
├── services/
│   └── orderService.js       # auto code, stock calc, commission calc
├── uploads/                  # uploaded images
└── server.js
```

## FRONTEND STRUCTURE

```
src/
├── pages/
│   ├── Login.tsx             # Backend API auth
│   ├── Register.tsx          # Backend API register
│   ├── Dashboard.tsx         # Fetch API, filter by role
│   ├── EmployeeList.tsx      # Admin only
│   ├── EmployeeForm.tsx      # Admin, has password field on edit
│   ├── ProductList.tsx       # Admin only, filter by category, search
│   ├── ProductForm.tsx       # Admin only, image upload
│   ├── CustomerList.tsx      # Sales sees only own customers
│   ├── CustomerForm.tsx      # 10-digit phone, address dropdowns
│   ├── OrderList.tsx         # Sales sees only own orders (lọc ngày/tuần/tháng/năm)
│   ├── OrderForm.tsx         # Customer search + new customer + address dropdowns
│   ├── InventoryHistory.tsx  # Admin only
│   ├── InventoryImport.tsx   # Admin, decimal qty
│   ├── InventoryExport.tsx   # Admin, decimal qty
│   ├── BulkImport.tsx        # Excel upload with template download
│   ├── SalaryReport.tsx      # Admin: all employees, Sales: own
│   ├── CommissionDetail.tsx  # Admin: detail per employee
│   ├── ActivityLog.tsx       # Admin: activity log with detail modal
│   ├── ChangePassword.tsx    # All users
│   └── Settings.tsx          # Admin: role permissions grid
├── components/
│   └── Layout.tsx            # Dynamic menu by role, user dropdown
├── lib/
│   ├── api.ts                # API helper with logging
│   ├── utils.ts              # formatCurrency, formatDate, cn
│   └── vietnam-locations-simple.json  # 63 provinces data
└── App.tsx                   # Routes with AdminRoute wrapper
```

---

## CẦN LÀM TIẾP

- [ ] Test toàn bộ flow với data thực
- [ ] Fix các edge cases khi parse địa chỉ
- [ ] Thêm validation đầy đủ cho tất cả form
- [ ] Implement real-time stock update
- [ ] Deploy production

---

## TÀI KHOẢN TEST

| Email | Password | Role |
|-------|----------|------|
| admin@velocity.vn | admin123 | Admin |
| lan.sales@velocity.vn | sales123 | Sales |
| minh.sales@velocity.vn | sales123 | Sales |

---

## CẤU HÌNH CHẠY PROJECT

### Backend
```bash
cd backend
node server.js
```
- Port: 3000
- DB: localhost:3306, user: root, pass: (empty), db: erp

### Frontend
```bash
npm run dev
```
- Port: 5173
