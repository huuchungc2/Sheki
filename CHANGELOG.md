# CHANGELOG

## 2026-04-05 - Test flow with real data
### Added
- Test flow with real data executed; moved to next task (edge-case address parsing). - Files: TODO.md

## 2026-04-05 - Order Form Group Move
### Changed
- NHÓM BÁN HÀNG moved into OrderForm near customer info; require selecting a group when creating/updating orders. Payload includes group_id. Files: src/pages/OrderForm.tsx
- Order Form redesign: add/edit screen updated to include full Vietnam provinces, dynamic district/ward dropdowns, and search-filtered customer suggestions by current sales user; quantity input now supports decimals. Files: src/pages/OrderForm.tsx

## 05/04/2026 - Fix edge cases parse địa chỉ
### Fixed
- **CustomerForm address parsing** - Improve matching for abbreviated names (HN → Thành phố Hà Nội, HCM → Thành phố Hồ Chí Minh) - Files: `src/pages/CustomerForm.tsx`
- **OrderForm address parsing** - Improve matching logic for city/district/ward with fallback to abbreviations - Files: `src/pages/OrderForm.tsx`
- **Utils improvements** - Added more robust address normalization functions - Files: `src/lib/utils.ts`

## 05/04/2026 - Quy tắc hoa hồng phân cấp (Commission Override)
### Added
- **Bảng commission_tiers** - Định nghĩa mức hoa hồng CTV (ctv_rate_min → ctv_rate_max) → % Sale quản lý hưởng (sales_override_rate)
- **Bảng collaborators** - Gán CTV (user role sales) cho Sale quản lý (sales_id, ctv_id unique)
- **Cột mới commissions.type** - ENUM('direct', 'override') phân biệt hoa hồng trực tiếp và hoa hồng quản lý CTV
- **Cột mới commissions.ctv_user_id** - ID của CTV tạo ra hoa hồng override
- **Migration 001_commission_rules.sql** - Tạo 2 bảng mới + alter commissions + seed 3 tiers mẫu (≥10%→3%, 7-9.99%→2%, 4-6.99%→1%)
- **Backend API: GET/POST/PUT/DELETE /api/commission-tiers** - CRUD mức hoa hồng (admin only)
- **Backend API: GET/POST/DELETE /api/collaborators** - CRUD gán CTV cho Sale (admin only)
- **Backend API: GET /api/collaborators/available-ctvs** - Lấy danh sách sales chưa được gán làm CTV
- **orderService.calculateOverrideCommissions** - Tự động tính override commission khi recalculateCommission: tìm Sales quản lý CTV → match tier → tính % trên commission của CTV
- **reports.js salary report** - Tách direct_commission, override_commission, total_all_commission
- **commissions.js** - Trả về type, ctv_user_id, ctv_name trong response
- **CommissionRules page** - 2 tabs: Mức hoa hồng (CRUD tiers) + Gán CTV cho Sale (add/remove với dropdown filter)
- **CommissionReport** - Thêm cột "Hoa hồng quản lý CTV" + "Tổng hoa hồng"
- **CommissionDetail** - Badge phân loại "Trực tiếp" (xanh) / "Quản lý CTV: tên" (xanh dương), highlight row override
- **Menu Layout** - Thêm "Quy tắc hoa hồng" (admin only)
- **Route /commission-rules** - AdminRoute
- **Users API** - Thêm filter theo role (?role=sales)
- **api.ts** - Export api object tiện dụng (get/post/put/delete với auto auth token)
### Changed
- **orderService.recalculateCommission** - Xóa cả direct + override cũ, tạo lại direct + gọi calculateOverrideCommissions
### Files
- `migrations/001_commission_rules.sql` (new), `backend/routes/commission-tiers.js` (new), `backend/routes/collaborators.js` (new), `backend/services/orderService.js`, `backend/routes/reports.js`, `backend/routes/commissions.js`, `backend/routes/users.js`, `backend/server.js`, `src/pages/CommissionRules.tsx` (new), `src/pages/CommissionReport.tsx`, `src/pages/CommissionDetail.tsx`, `src/components/Layout.tsx`, `src/App.tsx`, `src/lib/api.ts`

## 05/04/2026 - Quản lý Cộng tác viên (Collaborators)
### Added
- **Bảng user_collaborators** - Many-to-many self-referencing: user_id → collaborator_id + commission_rate
- **Backend API: GET /api/users/:id/collaborators** - Danh sách CTV của nhân viên (sales chỉ xem của mình)
- **Backend API: POST /api/users/:id/collaborators** - Thêm CTV với tỷ lệ hoa hồng (dành sau)
- **Backend API: DELETE /api/users/:id/collaborators/:collaboratorId** - Xóa CTV
- **Backend API: GET /api/users/available/collaborators** - Lấy danh sách NV có thể thêm làm CTV (filter theo role)
- **CollaboratorsPage** - Trang quản lý CTV: bảng danh sách, modal thêm CTV với search, xóa CTV
- **EmployeeDetail** - Nút "Quản lý CTV" dẫn tới trang collaborators
- **Route mới**: `/employees/:id/collaborators` (AdminRoute)

## 05/04/2026 - Employee Detail Overview
### Added
- **EmployeeDetail page** - Trang tổng quan nhân viên với 4 section: thông tin cá nhân + nhóm, thống kê hoa hồng/doanh thu, top 10 sản phẩm bán chạy, bảng đơn hàng có filter status + phân trang
- **Backend API: GET /api/users/:id/overview** - Trả về user info, groups, commission summary, top 10 products (theo qty), order stats
- **Backend API: GET /api/users/:id/orders** - Danh sách đơn hàng của nhân viên, filter theo status, phân trang
- **EmployeeList** - Click tên nhân viên → navigate tới EmployeeDetail
- **Route mới**: `/employees/:id` (AdminRoute)

## 05/04/2026 - CommissionDetail → OrderCommissionDetail
### Changed
- **CommissionDetail click đơn hàng → navigate sang trang chi tiết** - Không còn expand inline nữa, giờ click vào mã đơn sẽ chuyển sang trang OrderCommissionDetail riêng biệt
- **OrderCommissionDetail page mới** - Hiển thị chi tiết hoa hồng của 1 đơn hàng cụ thể: thông tin đơn, bảng sản phẩm với hoa hồng từng món, tổng hoa hồng đơn hàng
- **Route mới**: `/reports/commissions/:userId/order/:orderId`

## 05/04/2026 - Cải thiện CommissionDetail và menu Báo cáo
### Changed
- **Menu Báo cáo có submenu** - Admin: "Báo cáo" mở rộng → "Báo cáo doanh thu" + "Báo cáo hoa hồng". Sales: "Hoa hồng của tôi"
- **CommissionDetail expand chi tiết sản phẩm** - Click đơn hàng → mở rộng ngay tại chỗ, hiển thị từng sản phẩm: tên, SKU, SL, đơn giá, giảm giá, thành tiền, tỷ lệ HH, hoa hồng từng món
- **CommissionDetail bỏ "Hoa hồng trung bình"** → Thay bằng "Lương cơ bản" của nhân viên (dễ hiểu hơn)
- **Commissions API** - Thêm `status`, `total_amount` vào response để hiển thị ngay trong bảng

## 05/04/2026 - Tách báo cáo doanh thu và hoa hồng
### Changed
- **Tách 2 trang báo cáo riêng** - RevenueReport (admin only) và CommissionReport (admin + sales) thay vì gộp chung SalaryReport
- **Menu admin** - "Báo cáo doanh thu" (/reports/revenue) + "Báo cáo hoa hồng" (/reports/commissions)
- **Menu sales** - Chỉ còn "Hoa hồng của tôi" (/reports/commissions) - hiển thị đúng order-level commission data
- **RevenueReport** - Biểu đồ doanh số + bảng chi tiết từng nhân viên (đơn hàng, doanh số, hoa hồng)
- **CommissionReport** - Admin: bảng hoa hồng từng NV + link chi tiết; Sales: bảng order-level commission với mã đơn, ngày, tổng tiền, hoa hồng, trạng thái
### Removed
- **SalaryReport.tsx** - Xóa file cũ, thay bằng 2 file mới

## 05/04/2026 - Commission Report Fixes
### Fixed
- **CommissionDetail route missing** - Đã import nhưng không có `<Route>` trong App.tsx → click "Chi tiết" bị redirect về `/` - Files: `src/App.tsx`
- **OrderList commission hardcoded 10%** - Line 79 ghi đè `commission_amount` bằng `Math.round(total * 0.10 * 100)` bỏ qua giá trị thực từ DB - Files: `backend/routes/orders.js`
- **SalaryReport sales view broken** - Dùng `salesData` (per-employee summary) nhưng render như per-order → hiện undefined - Files: `src/pages/SalaryReport.tsx`
- **CommissionDetail order link sai** - Link về `/orders` thay vì search theo order code - Files: `src/pages/CommissionDetail.tsx`
- **Salary report SUM(DISTINCT)** - `SUM(DISTINCT o.total_amount)` loại bỏ đơn trùng số tiền → sai tổng - Files: `backend/routes/reports.js`

### Added
- **GET /api/commissions/orders** - API mới trả về order-level commission data (code, date, total, status, commission) cho sales view - Files: `backend/routes/commissions.js`

## 2026-04-05 - Groups Migration Fix

### Fixed
- **Orders API 500 error** - Database chưa có bảng `groups`, `user_groups` và cột `group_id` trong `orders`
- **Migration script** - `backend/run-migration.js` tạo bảng + cột + FK + seed groups

## 2026-04-05 - Groups & Stock Validation

### Added
- **Groups (Nhóm nhân viên)** - Bảng `groups` + `user_groups` (many-to-many), mỗi nhân viên thuộc 1 hoặc nhiều nhóm
- **Groups CRUD** - Backend routes: `GET/POST/PUT/DELETE /api/groups`, `GET/PUT /api/groups/user/:userId`
- **Order Form - Group Selector** - Dropdown chọn nhóm khi lên đơn (mặc định = nhóm của nhân viên), có thể không chọn
- **Order Form - Available Stock** - Cột "Có thể bán" hiển thị realtime cho mỗi sản phẩm
- **Order Form - Stock Validation** - Validate số lượng <= available_stock, border đỏ + cảnh báo "Vượt tồn!" nếu vượt
- **Employee Form - Groups** - Checkbox chọn nhóm nhân viên, fetch + save groups
- **Salary Report - Group Filter** - Dropdown filter theo nhóm (Tất cả hoặc từng nhóm)
- **Settings - Groups Tab** - Tab quản lý nhóm nhân viên với thêm/sửa/xóa nhóm
- **Orders table** - Thêm cột `group_id` FK → groups

### Fixed
- **OrderForm** - LSP error: Customer interface thiếu district/ward
- **OrderForm** - Submit body thiếu group_id
- **OrderList API** - Include group_name từ LEFT JOIN groups
- **Orders GET detail** - Include group_name

## 2026-04-05 - Complete System

### Added
- **Activity Log** - Bảng `activity_logs` trong schema, middleware tự động log mọi POST/PUT/DELETE, trang `/logs` với filter + modal chi tiết
- **Bulk Export Excel** - Export danh sách nhân viên, khách hàng, sản phẩm ra file .xlsx
- **Image Upload** - Upload ảnh sản phẩm từ máy tính (lưu vào `backend/uploads/`) hoặc dán URL
- **OrderForm Address Dropdowns** - TP → Quận → Phường dropdown phụ thuộc nhau, parse địa chỉ cũ tự động
- **Customer Form** - Thêm district, ward, note fields, validate phone 10 số
- **Product List** - Filter theo danh mục, search theo tên/SKU, hiển thị ảnh thật, category_name, status
- **Product Form** - Upload ảnh, parse images JSON, categories dropdown
- **Order List** - Hiển thị mã đơn, tổng tiền, hoa hồng 10%
- **Order Detail API** - Convert DECIMAL strings to numbers, include customer location data
- **Bulk Import** - Excel template download, match header theo tên, auto-generate SKU nếu trống

### Fixed
- **OrderForm** - Helper functions định nghĩa TRƯỚC useEffect (lỗi trang trắng khi edit)
- **OrderForm** - Bảng không bị lặp cột (duplicate columns)
- **OrderForm** - Số lượng step="0.1" chỉ 1 hoặc 1.x, chiết khấu/hoa hồng min=0 max=100
- **OrderForm** - Tổng cộng dùng Math.max(0, ...) tránh NaN
- **ProductList** - Filter theo danh mục (bỏ alias `p.` trong countQuery → lỗi 500)
- **EmployeeForm** - Tách `isLoading` (fetch data) và `isSaving` (submit form)
- **CustomerList** - Sales chỉ xem KH của mình (`created_by = user_id OR assigned_employee_id = user_id`)
- **Customer suggest** - Filter theo sales user, không hiện tất cả KH
- **Inventory export** - Check product tồn tại trước khi truy cập `product[0]`
- **Bulk import** - Chuyển từ CSV sang Excel (.xlsx), match header theo tên
- **parseAddress** - Short map cho city, match theo thứ tự city→district→ward
- **Hoa hồng** - Mặc định 10%, hiển thị số đẹp (Math.round)
- **Schema** - `stock_qty`, `qty` = DECIMAL(10,3) thay vì INT
- **Config** - Chuyển từ SSH tunnel sang MySQL direct connection (localhost, root, empty password)

### Changed
- **backend/config/db.js** - MySQL direct connection (localhost, root, empty password)
- **backend/.env** - Update credentials cho localhost
- **schema.sql** - Thêm `district`, `ward`, `note` vào customers
- **backend/routes/customers.js** - Sales filter: `created_by = ? OR assigned_employee_id = ?`
- **backend/routes/orders.js** - Include customer_city/district/ward, convert DECIMAL
- **backend/routes/products.js** - Convert DECIMAL strings to numbers, filter fix
- **src/components/Layout.tsx** - Menu động theo role, user dropdown, thêm mục "Nhật ký"
- **src/App.tsx** - AdminRoute wrapper, thêm route /logs
- **src/pages/BulkImport.tsx** - Rewrite dùng API thực, Excel upload, kết quả chi tiết
- **src/pages/SalaryReport.tsx** - Admin xem toàn bộ NV + link chi tiết, sales xem của mình
- **src/pages/ProductList.tsx** - Fetch categories, filter, ảnh, status
- **src/pages/ProductForm.tsx** - Image upload, categories, parse images JSON
- **src/pages/OrderList.tsx** - Hiển thị code, total_amount, commission_amount
- **src/pages/OrderForm.tsx** - Customer search + new customer + address dropdowns
- **src/pages/CustomerForm.tsx** - Phone validation, address dropdowns
- **src/pages/EmployeeForm.tsx** - Role select (admin/sales), password on edit
- **src/pages/Dashboard.tsx** - Fetch API, filter by role
- **src/pages/Login.tsx** - Backend API auth
- **src/pages/Register.tsx** - Backend API register
- **Frontend package.json** - Port 5173

## 2026-04-04 - Initial Setup

### Added
- `plan.md` - Tài liệu kế hoạch chi tiết
- `TODO.md` - Danh sách task và trạng thái
- `CHANGELOG.md` - File này
- `schema.sql` - Database schema đầy đủ (9 bảng + seed data)
- `backend/config/db.js` - SSH Tunnel + MySQL connection
- `backend/.env.example` - Environment variables template
- `.gitignore` - Loại trừ sensitive files
- `backend/package.json` - Dependencies
- `backend/server.js` - Express server entry point
- `backend/middleware/auth.js` - JWT verification middleware
- `backend/middleware/authorize.js` - Role-based authorization
- `backend/middleware/errorHandler.js` - Global error handler
- `backend/routes/auth.js` - Login, Register
- `backend/routes/users.js` - CRUD employees
- `backend/routes/customers.js` - CRUD customers
- `backend/routes/products.js` - CRUD products
- `backend/routes/orders.js` - CRUD orders + auto-calculate
- `backend/routes/inventory.js` - Stock movements
- `backend/routes/commissions.js` - View commissions
- `backend/routes/reports.js` - Salary report, dashboard stats
- `backend/routes/warehouses.js` - CRUD warehouses
- `backend/services/orderService.js` - Auto code generation, stock & commission calculation

### Business Rules Implemented
- Mã đơn hàng: `DH-YYYYMMDD-XXXX` (reset theo ngày)
- Tồn kho 3 chỉ số: stock_qty = available_stock + reserved_stock
- Hoa hồng per-item: `(unit_price * qty - discount_amount) * commission_rate / 100`
- Điểm tích lũy: 1 điểm / 10K VND, đổi 1 điểm = 1K VND
- Phân quyền: Sales chỉ xem đơn của mình, Admin toàn quyền
## [05/04/2026] - [Task: Đảm bảo đơn hàng bắt buộc có nhóm bán hàng]
### Added
- Thêm nhóm bán hàng vào OrderForm và buộc chọn khi tạo/sửa đơn hàng (File: src/pages/OrderForm.tsx).
- Cập nhật UI để cho phép người dùng chọn nhóm và chuẩn hóa dữ liệu liên quan.

## [05/04/2026] - [Nhóm bán hàng đảm bảo ổn định UI]
### Updated
- Refactor và làm sạch phần nhóm bán hàng trong OrderForm để tránh nhiễu UI và parse lỗi Babel. Thêm vị trí rõ ràng cho dropdown nhóm bán hàng ở bên trái/two-column layout (File: src/pages/OrderForm.tsx).
## [05/04/2026] - Implemented Collaborators: Robust error handling for gán CTV
### Added
- Implement robust error handling for assigning collaborators in CollaboratorsPage.tsx: gracefully handle non-JSON responses (HTML), read error messages from response text, and log for debugging. Ensure no crashes and actionable UI messages. - Files: src/pages/CollaboratorsPage.tsx
