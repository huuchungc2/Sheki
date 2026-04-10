# CHANGELOG

## [10/04/2026] - Orders: thiết kế lại màn hình lên đơn trên mobile web
### Changed
- **OrderForm responsive** — Chuyển layout lên đơn sang mobile-first: các khối thông tin tự về 1 cột trên màn nhỏ, **Kho xuất hàng dời về khu vực chọn sản phẩm**, thêm sticky bar “Tổng cộng / Lưu đơn”, danh sách sản phẩm mobile chuyển sang **1 dòng / 1 sản phẩm** (cuộn ngang) có **header tên cột sticky**, thao tác giống quick order - Files: `src/pages/OrderForm.tsx`

## [10/04/2026] - Dev: truy cập web bằng điện thoại (LAN) không lỗi API
### Fixed
- **API dev trên mobile** — Dùng API relative `/api` + cấu hình Vite proxy `/api`/`/uploads` về backend để truy cập từ điện thoại trong cùng mạng LAN; backend nới CORS cho origin LAN (192.168/10/172.16-31). Đồng bộ toàn bộ màn hình frontend bỏ fallback `http://localhost:3000/api` - Files: `src/lib/api.ts`, `.env.development`, `vite.config.ts`, `backend/server.js`, `src/pages/*`

## [10/04/2026] - UI: chuẩn hoá font toàn hệ thống
### Changed
- **Typography base** — Set `html` font-size = **13px** (style ERP giống nhanh.vn, gọn hơn), giữ line-height 1.4 để dễ đọc trên mobile - Files: `src/index.css`

## [10/04/2026] - UI: mobile menu mặc định co lại
### Changed
- **Layout mobile** — Sidebar chuyển sang dạng drawer trên mobile: vào app mặc định **đóng**, có overlay, đổi route tự đóng; bỏ auto-expand submenu; padding page responsive (`p-4` mobile) - Files: `src/components/Layout.tsx`

## [09/04/2026] - Products: thêm/sửa bắt buộc chọn kho
### Fixed
- **ProductForm + Products API** — Bắt buộc chọn `warehouse_id` khi thêm/sửa; tồn kho trong form là **tồn theo kho đã chọn**. Backend cập nhật `warehouse_stock` theo kho rồi sync tổng tồn vào `products` - Files: `src/pages/ProductForm.tsx`, `backend/routes/products.js`
### Changed
- **OrderForm search sản phẩm** — Chỉ gợi ý sản phẩm đang kinh doanh (`is_active=1`) để tránh trường hợp kho có hàng nhưng không bán được do sản phẩm đã bị vô hiệu hóa - Files: `src/pages/OrderForm.tsx`, `backend/routes/products.js`

## [09/04/2026] - Orders: không tính HH quản lý khi không chọn
### Fixed
- **Hoa hồng** — Đơn `source_type=sales` không còn tính `override` cho quản lý; chỉ tính `direct` cho `salesperson_id` (A). Chỉ khi chọn quản lý (`source_type=collaborator`) thì `direct` cho quản lý - Files: `backend/services/orderService.js`, `LOGIC_BUSINESS.md`
### Changed
- **Sửa đơn** — Cho phép đổi qua lại **chọn quản lý / không chọn** khi sửa đơn (Sales) - Files: `backend/routes/orders.js`, `src/pages/OrderForm.tsx`, `LOGIC_BUSINESS.md`

## [09/04/2026] - Orders: chọn quản lý → CTV direct, quản lý override
### Fixed
- **Hoa hồng đúng vai trò** — Khi Sales (CTV) lên đơn và chọn quản lý, hệ thống giữ `salesperson_id` là người lên đơn để nhận `direct`, và tính `override` cho quản lý theo `commission_tiers` (tính trên net_amount từng item). Đồng thời vẫn tương thích đơn legacy đã lưu kiểu “quản lý ăn direct” - Files: `backend/routes/orders.js`, `backend/services/orderService.js`, `backend/routes/users.js`
- **Danh sách đơn hiển thị hoa hồng đúng** — `commission_amount` trên list lấy `direct` theo `orders.salesperson_id` (không lấy bừa `LIMIT 1`) - Files: `backend/routes/orders.js`, `backend/routes/users.js`

## [09/04/2026] - Orders: Sales chỉ thấy đơn mình bán
### Fixed
- **Đơn hàng của tôi (Sales)** — Sales chỉ load đơn có `salesperson_id = user_id`. Không còn load “đơn CTV” chỉ vì mình là quản lý (`collaborator_user_id`), tránh trường hợp Minh thấy đơn của Lan ở màn đơn hàng. Giữ ngoại lệ tương thích dữ liệu legacy (collaborator_user_id là CTV thật) - Files: `backend/routes/orders.js`

## [09/04/2026] - OrderForm: sửa đơn giữ quản lý đã chọn
### Fixed
- **Edit order giữ nguyên dropdown quản lý** — Khi mở form sửa đơn `source_type=collaborator`, OrderForm lấy quản lý từ `collaborator_user_id` (semantics mới) và dùng `include_user_ids` để không bị “mất” khi đổi nhóm/refresh list. Payload khi lưu không gửi `collaborator_user_id` sai chiều nữa - Files: `src/pages/OrderForm.tsx`

## [09/04/2026] - CTV commissions: hiển thị nhiều mức + popup chi tiết đơn
### Fixed
- **Tỷ lệ nhiều mức không còn =0** — `override_rate` NULL sẽ hiển thị “Nhiều mức” thay vì bị ép thành 0 - Files: `backend/routes/users.js`, `src/pages/CollaboratorsCommissionReport.tsx`, `src/pages/CollaboratorsCommissionsReport.tsx`
- **Popup chi tiết đơn** — Click mã đơn trong `/reports/commissions/ctv` mở popup hiển thị chi tiết sản phẩm/hoa hồng dòng - Files: `src/pages/CollaboratorsCommissionReport.tsx`, `src/pages/CollaboratorsCommissionsReport.tsx`
- **Quyền xem chi tiết đơn từ báo cáo CTV** — Sales quản lý có thể xem `/orders/:id` nếu có commission `override` của đơn đó (để popup không 403) - Files: `backend/routes/orders.js`
- **Popup hiển thị tỷ lệ & tổng tiền theo dòng** — Popup trả thêm `override_breakdown` (net_amount, override_rate, override_amount) và render “Tổng tiền dòng / Tỷ lệ hưởng / Tiền hưởng” theo từng sản phẩm - Files: `backend/routes/orders.js`, `src/pages/CollaboratorsCommissionReport.tsx`, `src/pages/CollaboratorsCommissionsReport.tsx`

## [09/04/2026] - Employees: UI gọn + username linh hoạt
### Changed
- **EmployeeList/EmployeeForm UI** — Tinh gọn layout, dễ đọc hơn (thông tin trạng thái rõ ràng, spacing hợp lý) - Files: `src/pages/EmployeeList.tsx`, `src/pages/EmployeeForm.tsx`
- **Username rule** — Cho phép username dạng `lan.sales`, `minh-sales` (không bắt ký tự đặc biệt nhưng không chặn dấu `.`/`-`); đồng bộ validate FE/BE và import - Files: `backend/routes/auth.js`, `backend/routes/users.js`, `backend/routes/import.js`, `src/pages/EmployeeForm.tsx`

## [09/04/2026] - Khách hàng: bắt phone 10 số + địa chỉ đầy đủ
### Fixed
- **Customers API** — POST/PUT validate phone đúng 10 số và địa chỉ đủ (city/district/ward/address); lưu phone đã clean (chỉ số) - Files: `backend/routes/customers.js`
- **CustomerForm** — Validate bắt buộc địa chỉ đủ + hiển thị inline errors; submit tự clean phone - Files: `src/pages/CustomerForm.tsx`

## [09/04/2026] - Quản lý theo nhóm + HH khi sửa đơn (API)
### Added
- **GET /collaborators/my-managers** — `?group_id=` chỉ quản lý thuộc nhóm (`user_groups`); `?include_user_ids=` thêm quản lý đơn đang sửa nếu thiếu trong list - Files: `backend/routes/collaborators.js`
### Changed
- **POST/PUT orders** — Suy `source_type=collaborator` khi có `manager_salesperson_id` nhưng thiếu `source_type`; `items` rỗng coi như không gửi - Files: `backend/routes/orders.js`
- **OrderForm** — Load quản lý theo `selectedGroupId`; tạo đơn mặc định quản lý đầu khi đổi nhóm; payload luôn có `source_type` + `subtotal` dòng; sửa đơn include quản lý hiện tại - Files: `src/pages/OrderForm.tsx`
- **LOGIC_BUSINESS.md** — Quản lý lọc theo nhóm

## [09/04/2026] - Sửa đơn: HH quản lý khi đổi sang collaborator
### Fixed
- **POST/PUT đơn collaborator** — Nếu không gửi `collaborator_user_id`, tự gán CTV = người đang thao tác (khi không phải chính quản lý) để không 403 và `salesperson_id` đúng - Files: `backend/routes/orders.js`
- **PUT đổi sales ↔ collaborator** — Khi body không có `items` nhưng có `source_type`, load lại dòng từ DB và tính lại % HH / `order_items` - Files: `backend/routes/orders.js`

## [09/04/2026] - Admin: bỏ chọn quản lý HH trên form đơn
### Changed
- **OrderForm** — Ẩn hoàn toàn “Quản lý (nhận HH trực tiếp)” với Admin; không gửi `source_type` (PUT giữ nguyên loại đơn) - Files: `src/pages/OrderForm.tsx`
### Added
- **API** — `POST/PUT` đơn: Admin không được gửi `source_type=collaborator` (403) - Files: `backend/routes/orders.js`
- **LOGIC_BUSINESS.md** — Mô tả Admin vs Sales

## [09/04/2026] - Quyền đổi đơn collaborator → sales + mặc định quản lý
### Changed
- **PUT `/orders/:id`** — Chỉ **Admin** đổi `source_type` từ collaborator về sales; Sales không còn quyền đó - Files: `backend/routes/orders.js`
- **OrderForm** — Tạo đơn: mặc định chọn **quản lý trực tiếp đầu tiên**; Sales sửa đơn collaborator: không hiện “Tôi nhận HH”, có thể đổi quản lý khác - Files: `src/pages/OrderForm.tsx`
- **LOGIC_BUSINESS.md** — Ghi nhận quyền + mặc định dropdown

## [09/04/2026] - OrderForm: một dropdown quản lý + HH trên danh sách SP
### Changed
- **OrderForm** — Bỏ checkbox / radio CTV–quản lý / chọn cặp Admin; chỉ còn **Quản lý (nhận HH trực tiếp)** trong card Danh sách sản phẩm; không chọn = HH cho người tạo (chỉnh % từng dòng); có chọn = % quản lý, cột Hoa hồng chỉ hiển thị - Files: `src/pages/OrderForm.tsx`
### Added
- **GET /collaborators** — Trả thêm `sales_commission_rate` để Admin chọn quản lý có đúng % HH - Files: `backend/routes/collaborators.js`
- **LOGIC_BUSINESS.md** — Mô tả dropdown trên form đơn

## [09/04/2026] - HH: sửa đơn collaborator → sales đúng người nhận HH
### Fixed
- **PUT `/orders/:id`** — Khi `source_type=sales`, nếu đơn trước là `collaborator` thì gán lại `salesperson_id` = `collaborator_user_id` (A) khi có CTV; đơn không ghi CTV thì giữ quản lý — khớp quy tắc “không chọn quản lý → HH chỉ cho người lên đơn; chọn quản lý → HH cho quản lý”
- **Quyền** — CTV trên đơn hoặc quản lý (đơn không CTV) được đổi về đơn bán trực tiếp, không chỉ Admin
### Changed
- **OrderForm** — Tắt checkbox “ghi nhận quản lý” → reset % HH từng dòng mặc định 10% trước khi lưu - Files: `src/pages/OrderForm.tsx`
- **LOGIC_BUSINESS.md** — Bổ sung khi sửa đơn đổi nguồn

## [09/04/2026] - Đơn quản lý: không bắt buộc chọn CTV
### Changed
- **Orders `source_type=collaborator`** — `collaborator_user_id` có thể NULL (quản lý tự ghi đơn, CTV không hưởng HH); chỉ validate `collaborators` khi có CTV - Files: `backend/routes/orders.js`
- **OrderForm** — Bỏ chọn CTV khi “Tôi là quản lý”; Admin chọn “chỉ quản lý” hoặc cặp đầy đủ - Files: `src/pages/OrderForm.tsx`
- **LOGIC_BUSINESS.md** — Mô tả `collaborator_user_id` tùy chọn

## [09/04/2026] - CORS: cho phép đăng nhập từ 127.0.0.1
### Fixed
- **CORS** — Thêm `http://127.0.0.1:5173` (và preview port 4173) vì trình duyệt coi `localhost` và `127.0.0.1` là origin khác nhau → trước đây fetch `/api/auth/login` bị chặn khi mở FE bằng 127.0.0.1 - Files: `backend/server.js`

## [09/04/2026] - Đơn ghi nhận quản lý là người bán (source_type collaborator)
### Added
- **Migration `010_order_collaborator.sql`** — `orders.source_type` (sales|collaborator), `orders.collaborator_user_id` - Files: `migrations/010_order_source_collaborator.sql`, `schema.sql`
- **API** — `GET /collaborators/my-managers`, `GET /collaborators/my-ctvs` - Files: `backend/routes/collaborators.js`
### Changed
- **Hoa hồng:** `source_type=collaborator` → chỉ HH **direct** cho `salesperson_id` (quản lý), **không** tính override CTV (tránh trùng) - Files: `backend/services/orderService.js`
- **Orders** — Tạo/sửa đơn collaborator: validate cặp trong `collaborators`; Sales thấy đơn nếu là `salesperson_id` hoặc `collaborator_user_id`; HH item dùng `%` của **quản lý** - Files: `backend/routes/orders.js`
- **OrderForm** — Checkbox + chọn quản lý/CTV (hoặc Admin chọn cặp) - Files: `src/pages/OrderForm.tsx`
- **LOGIC_BUSINESS.md** — Mô tả hai kiểu nguồn đơn

## [09/04/2026] - Đặc tả đa shop (chưa code)
### Added
- **`FEATURE_MULTI_SHOP.md`** — Luồng đăng ký không gắn shop; `user_shops` + role từng shop; admin gán user theo email/username; chọn/đổi shop; JWT `shop_id`; danh sách bảng + migration Sheki + checklist BE/FE + thứ tự triển khai - Files: `FEATURE_MULTI_SHOP.md`, `plan.md` (mục 11), `ROADMAP.md` (Phase 3), `CLAUDE.md`

## [09/04/2026] - Gỡ menu Tra cứu đơn (admin)
### Removed
- **Tra cứu đơn** — Xóa nhóm menu sidebar admin (theo ngày/tháng/năm/khoảng); xóa `OrderSearch.tsx`; URL `/orders/search/*` redirect về `/orders` - Files: `src/components/Layout.tsx`, `src/App.tsx`, `src/pages/OrderSearch.tsx` (deleted), `plan.md`, `UI_SPEC.md`

## [09/04/2026] - Thiết kế lại màn Doanh thu (Revenue)
### Changed
- **RevenueReport** — Header gradient + breadcrumb, bộ lọc theo UI_SPEC (màu Primary #E31837), 4 thẻ KPI (thêm tổng đơn), bảng có hạng #/link NV, biểu đồ top doanh số màu Sheki; cột hoa hồng hiển thị **tổng HH** (gồm CTV) khớp API - Files: `src/pages/RevenueReport.tsx`
### Added
- **Xuất Excel doanh thu** — Nút gọi `exportRevenueReport` (chi tiết HH bán/CTV/tổng) - Files: `src/lib/exportExcel.ts`

## [08/04/2026] - Nhân viên: gán phân quyền hàng loạt + fix Revenue/Dashboard
### Fixed
- **Reports dùng roles (không dùng `users.role`)** — Sửa `/reports/dashboard` và `/reports/salary` join `roles` + filter `r.code='sales'` để không 500 sau migration 007 - Files: `backend/routes/reports.js`
- **Auth tương thích token cũ** — Middleware `auth` tự tra DB lấy `can_access_admin/scope_own_data` theo `role_id` nếu JWT không có fields (tránh 403 “ẩn” sau migration roles) - Files: `backend/middleware/auth.js`
- **EmployeeList crash (Rules of Hooks)** — Dời `useMemo` lên trước các early-return `loading/error` để tránh “Rendered more hooks than during the previous render” - Files: `src/pages/EmployeeList.tsx`
- **EmployeeForm thiếu vai trò** — Bổ sung default `role_id` khi roles load xong + UI trạng thái loading/fallback khi không load được roles - Files: `src/pages/EmployeeForm.tsx`
### Added
- **Danh sách nhân viên có cột Phân quyền + gán hàng loạt** — Thêm checkbox chọn dòng + thanh bulk action gán `role_id` cho nhiều nhân viên (API `PUT /users/:id/role`) - Files: `src/pages/EmployeeList.tsx`
### Changed
- **EmployeeList search/filter UI** — Tìm kiếm debounce; filter phòng ban/vai trò thực sự gọi API; bulk gán quyền dời xuống cùng hàng filter và thiết kế lại gọn hơn - Files: `src/pages/EmployeeList.tsx`

## [08/04/2026] - Mật khẩu mặc định Sales = abc123
### Changed
- **Seed + migration** — Cập nhật seed Sales password sang `abc123` và thêm migration để reset toàn bộ user role `sales` về `abc123` - Files: `schema.sql`, `migrations/008_update_sales_default_password_abc123.sql`, `CLAUDE.md`

## [08/04/2026] - Reset mật khẩu Admin = comiumauden1234
### Changed
- **Migration reset admin password** — Cập nhật `password_hash` của role `admin` sang `comiumauden1234` để đăng nhập được ngay trên DB hiện tại - Files: `migrations/009_update_admin_password_comiumauden1234.sql`, `CLAUDE.md`

## [08/04/2026] - Backend logging: bỏ access.log
### Changed
- **Chỉ ghi error.log** — Tắt ghi `access.log` (morgan stream) và chỉ log HTTP ra console; lỗi vẫn ghi `backend/logs/error.log` qua `errorHandler` - Files: `backend/server.js`

## [08/04/2026] - Deploy production (CentOS 7.9)
### Added
- **Script deploy + Nginx config mẫu** — Thêm `deploy.sh` (Node+PM2, build FE, cấu hình Nginx, Certbot) và `nginx.conf` sample để triển khai VPS CentOS 7.9 - Files: `deploy.sh`, `nginx.conf`

## [08/04/2026] - Vai trò động (roles + phân quyền)
### Added
- **Bảng `roles` + `users.role_id`** — Admin định nghĩa vai trò (code, tên, `can_access_admin`, `scope_own_data`); nhân viên gán `role_id`; migration `007` + `schema.sql` cho cài mới - Files: `migrations/007_roles_table.sql`, `schema.sql`
- **API `/api/roles`** — CRUD vai trò (admin) - Files: `backend/routes/roles.js`, `backend/server.js`
- **Trang `/roles`** — Danh sách + tạo/sửa/xóa vai trò - Files: `src/pages/RolesPage.tsx`, `src/App.tsx`, `src/components/Layout.tsx`
### Changed
- **JWT & middleware** — Login trả `role_id`, `role_name`, `can_access_admin`, `scope_own_data`; `authorize('admin')` và lọc dữ liệu dùng cờ thay vì `role === 'sales'|'admin'` - Files: `backend/routes/auth.js`, `backend/middleware/auth.js`, `backend/middleware/authorize.js`, `backend/routes/users.js`, `backend/routes/customers.js`, `backend/routes/orders.js`, `backend/routes/commissions.js`, `backend/routes/reports.js`, `backend/routes/returns.js`, `backend/routes/collaborators.js`, `backend/routes/import.js`, `backend/services/notificationHub.js`
- **Frontend** — `isAdminUser()`; menu Vai trò; EmployeeForm chọn `role_id`; các màn admin/scoped dùng `can_access_admin` - Files: `src/lib/utils.ts`, `src/pages/EmployeeForm.tsx`, `src/pages/Dashboard.tsx`, `src/pages/OrderList.tsx`, `src/pages/OrderForm.tsx`, `src/pages/CommissionReport.tsx`, `src/pages/CustomerList.tsx`, `src/pages/EmployeeList.tsx`, `src/pages/CustomerForm.tsx`, `src/pages/CollaboratorsPage.tsx`, `src/pages/CommissionRules.tsx`

## [08/04/2026] - Tên đăng nhập (username)
### Added
- **Cột `users.username` (UNIQUE)** — đăng nhập bằng username hoặc email; đăng ký & tạo/sửa nhân viên bắt buộc username (3–32 ký tự: chữ, số, `_`); import Excel nhân viên thêm cột tên đăng nhập - Files: `migrations/006_add_username.sql`, `schema.sql`, `backend/routes/auth.js`, `backend/routes/users.js`, `backend/routes/import.js`
### Changed
- **Login, Register, nhân viên** — UI + `CLAUDE.md` tài khoản test - Files: `src/pages/Login.tsx`, `src/pages/Register.tsx`, `src/pages/EmployeeForm.tsx`, `src/pages/EmployeeList.tsx`, `src/pages/EmployeeDetail.tsx`, `CLAUDE.md`

## [08/04/2026] - Sidebar Admin gọn (nhóm menu)
### Changed
- **Menu Admin** - Gom thành các nhóm có submenu: Bán hàng, Danh mục, Kho, Báo cáo & HH (gồm Quy tắc hoa hồng), Tra cứu đơn, Nhập Excel; bỏ trùng “Cài đặt” ở giữa danh sách; chỉnh padding/submenu cho gọn - Files: `src/components/Layout.tsx`

## [08/04/2026] - Hoàn hàng: Sales chỉ xem, Admin xử lý
### Changed
- **Phân tách màn hoàn** - Sales: menu “Đơn hoàn” → `/returns` chỉ danh sách đơn hoàn (đơn gốc do mình bán). Admin: “Hoàn hàng” → `/returns/admin` tạo yêu cầu hoàn, duyệt/từ chối - Files: `src/pages/SalesReturnsList.tsx`, `src/pages/AdminReturns.tsx`, `src/App.tsx`, `src/components/Layout.tsx`
### Added
- **API `GET /api/returns`** - Danh sách bảng `returns` (Sales lọc theo `salesperson_id`, Admin xem tất cả) - Files: `backend/routes/returns.js`
### Changed
- **Quyền yêu cầu hoàn** - `POST /api/returns/requests` và `GET /api/returns/requests` chỉ Admin; xóa `ReturnRequests.tsx` - Files: `backend/routes/returns.js`, (removed) `src/pages/ReturnRequests.tsx`
### Changed
- **Hoàn từng phần theo sản phẩm** — Admin tạo yêu cầu hoàn với qty từng item; backend chặn hoàn vượt số lượng còn lại; khi duyệt sẽ điều chỉnh hoa hồng theo tỷ lệ giá trị item hoàn (partial) thay vì trừ toàn bộ - Files: `backend/routes/returns.js`, `src/pages/AdminReturns.tsx`

## [07/04/2026] - Fix filter nhóm báo cáo hoa hồng
### Fixed
- **Group filter theo “Nhóm BH” của đơn** - Khi chọn nhóm riêng ở CommissionReport, bảng tổng hợp nhân viên (API `/reports/salary`) giờ lọc theo `orders.group_id` (cùng logic với bảng chi tiết đơn), tránh trường hợp “Tất cả” có dữ liệu nhưng chọn nhóm lại rỗng do lọc theo `user_groups` - Files: `backend/routes/reports.js`

## [07/04/2026] - Fix báo cáo hoa hồng Admin (stat cards)
### Fixed
- **HH từ CTV + Tổng HH trên Admin** - Stat cards trên trang “Báo cáo hoa hồng toàn bộ” lấy `override_commission` đúng từ API `/commissions/orders` (không bị 0 khi là Admin) - Files: `src/pages/CommissionReport.tsx`

## [07/04/2026] - Fix màn hình chi tiết hoa hồng (Admin)
### Fixed
- **Summary đúng theo nhân viên** - API `/commissions/summary` hỗ trợ `user_id` cho Admin, tránh summary bị lấy toàn hệ thống khi xem chi tiết từng nhân viên - Files: `backend/routes/commissions.js`
- **Trạng thái đơn đúng enum mới** - Mapping status `pending/shipping/completed/cancelled` trên bảng chi tiết - Files: `src/pages/CommissionDetail.tsx`
- **Link qua chi tiết đơn đúng user** - Link sang `/reports/commissions/:userId/order/:orderId` dùng đúng `targetUserId` - Files: `src/pages/CommissionDetail.tsx`

## [07/04/2026] - Backend ghi log lỗi ra file
### Added
- **error.log + process.log** - Ghi lỗi runtime ra `backend/logs/error.log` (từ errorHandler) và `backend/logs/process.log` (unhandledRejection/uncaughtException) để dễ gửi log chẩn đoán - Files: `backend/middleware/errorHandler.js`, `backend/server.js`

## [07/04/2026] - OrderForm: tồn kho = có thể bán theo sản phẩm
### Fixed
- **Tồn kho hiển thị đúng “Có thể bán” theo kho** - Search sản phẩm gửi `warehouse_id` để lấy `available_stock` theo kho; edit mode không còn default 999 gây sai hiển thị; highlight “vượt tồn” tính theo lượng có thể bán (có cộng baseline khi edit pending/shipping) - Files: `src/pages/OrderForm.tsx`

## [07/04/2026] - Hủy đơn không tính hoa hồng
### Fixed
- **Đơn status=cancelled → hoa hồng = 0** - `recalculateCommission` sẽ xóa `commissions` của đơn và không tạo lại khi đơn đã hủy; nếu đổi trạng thái khỏi cancelled thì tính lại như bình thường - Files: `backend/services/orderService.js`

## [07/04/2026] - Luồng hoàn hàng sau chốt + điều chỉnh hoa hồng
### Added
- **Yêu cầu hoàn + Duyệt hoàn (Admin)** - Admin tạo yêu cầu hoàn theo đơn và duyệt để tạo “đơn hoàn” và nhập kho lại (sau đó tách UI Sales/Admin, xem mục 08/04/2026) - Files: `backend/routes/returns.js`, `backend/server.js`, `src/App.tsx`, `src/components/Layout.tsx`
- **Bút toán hoa hồng âm theo ngày hoàn** - Khi Admin duyệt hoàn, hệ thống tạo `commission_adjustments` (âm) để trừ lại hoa hồng của đơn gốc theo tháng phát sinh hoàn, không phá số kỳ trước - Files: `backend/routes/returns.js`, `migrations/005_returns_and_commission_adjustments.sql`
### Changed
- **Báo cáo hoa hồng gồm cả điều chỉnh** - API `/commissions` và `/commissions/orders` UNION thêm `commission_adjustments` theo `created_at` của adjustment; UI hiển thị badge “Điều chỉnh” và số âm màu đỏ - Files: `backend/routes/commissions.js`, `src/pages/CommissionReport.tsx`

## [07/04/2026] - Thông báo realtime (SSE)
### Added
- **SSE notifications** - Thêm endpoint realtime `/api/notifications/stream?token=...` và hub phát sự kiện - Files: `backend/routes/notifications.js`, `backend/services/notificationHub.js`, `backend/server.js`
### Changed
- **Orders emit events** - Tạo đơn/đổi trạng thái sẽ phát event realtime để UI cập nhật badge - Files: `backend/routes/orders.js`
- **Bell icon realtime** - Bell icon hiển thị số thông báo mới + dropdown danh sách, click điều hướng tới sửa đơn - Files: `src/components/Layout.tsx`

## [07/04/2026] - Fix sản phẩm: tên kho + khối lượng + upload ảnh
### Fixed
- **Upload ảnh sản phẩm** - Fix preview ảnh upload (URL `/api/uploads/...` được render đúng host) + báo lỗi rõ ràng khi upload fail - Files: `src/pages/ProductForm.tsx`
### Added
- **Khối lượng sản phẩm (kg)** - Thêm field “Khối lượng (kg)” trong form thêm/sửa và gửi lên API - Files: `src/pages/ProductForm.tsx`

## [07/04/2026] - Revert: danh sách sản phẩm phiên bản cũ
### Changed
- **ProductList UI** - Hoàn tác phần hiển thị “tên kho” trong cột kho hàng, quay về layout danh sách sản phẩm phiên bản cũ theo yêu cầu - Files: `src/pages/ProductList.tsx`

## [07/04/2026] - Fix ProductForm: upload ảnh + SKU tự sinh
### Fixed
- **Upload ảnh sản phẩm** - Backend trả URL ảnh đúng static `/uploads/...` để preview và lưu ảnh hoạt động ổn định - Files: `backend/routes/uploads.js`, `src/pages/ProductForm.tsx`
### Added
- **SKU tự sinh theo ngày** - Khi thêm sản phẩm nếu bỏ trống SKU, hệ thống tự tạo `SKU-YYYYMMDD-XXXX` và reset theo ngày (áp dụng cho cả UI và bulk import) - Files: `backend/routes/products.js`, `backend/routes/import.js`, `src/pages/ProductForm.tsx`, `src/pages/BulkImport.tsx`
### Changed
- **Prefill SKU khi thêm mới** - Form thêm sản phẩm tự gọi API lấy SKU kế tiếp và điền vào ô SKU luôn (không cần bấm Lưu mới thấy) - Files: `backend/routes/products.js`, `src/pages/ProductForm.tsx`

## [07/04/2026] - Ràng buộc tồn kho khi tạo/sửa đơn
### Fixed
- **Chặn vượt tồn kho theo kho xuất** - Khi tạo/sửa đơn, mỗi sản phẩm bắt buộc `qty <= available_stock` của kho đã chọn; nếu vượt sẽ không cho lưu (check cả frontend và backend) - Files: `src/pages/OrderForm.tsx`, `backend/routes/orders.js`

## [07/04/2026] - OrderForm: Thêm chọn kho xuất hàng
### Added
- **Warehouse selector** - Dropdown "KHO XUẤT HÀNG" hiển thị trước nhóm bán hàng, chỉ load kho `is_active=true`, viền amber khi chưa chọn - Files: `src/pages/OrderForm.tsx`
- **State + useEffect** - `selectedWarehouseId`, `warehouses`, fetch `/warehouses`, tự động sync `available_stock` của từng sản phẩm khi đổi kho qua `/inventory/stock-by-warehouse` - Files: `src/pages/OrderForm.tsx`
### Fixed
- **Validation** - Bắt buộc chọn kho trước khi submit (check trước `selectedGroupId`) - Files: `src/pages/OrderForm.tsx`
- **Payload warehouse_id** - Thay hardcode `warehouse_id: 1` bằng `warehouse_id: selectedWarehouseId` - Files: `src/pages/OrderForm.tsx`
- **Edit mode** - Load `warehouse_id` từ order khi mở form chỉnh sửa (`setSelectedWarehouseId(order?.warehouse_id ?? null)`) - Files: `src/pages/OrderForm.tsx`
- **Kho: tạo đơn completed** - Nếu tạo mới đơn với `status=completed` ngay từ đầu thì trừ kho vật lý theo đúng `warehouse_id` và cộng điểm - Files: `backend/routes/orders.js`
- **Kho: sync tồn theo kho khi thêm SP** - Khi đã chọn kho, thêm sản phẩm mới vào OrderForm sẽ được sync `available_stock` theo kho (không bị stale) - Files: `src/pages/OrderForm.tsx`
- **Inventory page** - Fix trang `/inventory` hiển thị đúng dữ liệu từ API `/inventory` (map đúng field `created_at/warehouse_name/staff_name/total_value`...), tránh crash do mismatch schema - Files: `src/pages/InventoryHistory.tsx`
- **Inventory time display** - Parse `created_at` kiểu MySQL DATETIME theo local time để hiển thị đúng giờ/phút trên bảng lịch sử kho - Files: `src/pages/InventoryHistory.tsx`
- **Inventory API pagination** - Fix `countQuery` dùng alias/join đồng bộ để không lỗi `Unknown column 'sm.type'` khi filter type/status - Files: `backend/routes/inventory.js`
- **Inventory filters** - Thêm filter theo kho (`warehouse_id`) + filter thời gian (`date_from/date_to`) cho trang Kho, UI popover chọn ngày hoạt động - Files: `src/pages/InventoryHistory.tsx`, `backend/routes/inventory.js`
- **Inventory summary stats** - Các thẻ thống kê (tổng nhập/xuất + số phiếu) lấy dữ liệu thật từ DB qua API `/inventory/summary` (completed-only, theo tháng hoặc theo date range/kho) - Files: `backend/routes/inventory.js`, `src/pages/InventoryHistory.tsx`
- **Products filter by warehouse** - Thêm dropdown lọc theo kho ở `/products`; backend hỗ trợ `warehouse_id` và trả `available_stock/stock_qty` theo kho để UI hiển thị đúng - Files: `src/pages/ProductList.tsx`, `backend/routes/products.js`
- **Inventory Import/Export UI** - Nâng cấp UX thêm sản phẩm bằng ô tìm kiếm gợi ý realtime (giống OrderForm), UI gọn và đẹp hơn - Files: `src/pages/InventoryImport.tsx`, `src/pages/InventoryExport.tsx`
- **Export transfer + adjustment** - Xuất chuyển kho yêu cầu chọn kho nhận và khi completed sẽ trừ kho xuất + cộng kho nhận; thêm lý do "Xuất điều chỉnh" - Files: `src/pages/InventoryExport.tsx`, `backend/routes/inventory.js`
- **Export product suggestions** - Khi xuất kho, ô tìm sản phẩm chỉ gợi ý sản phẩm có `available_stock > 0` trong kho xuất (dùng `warehouse_id` + `available_only=1`) - Files: `src/pages/InventoryExport.tsx`, `backend/routes/products.js`
- **Schema: warehouse_stock** - Bổ sung bảng `warehouse_stock` vào `schema.sql` để khớp logic tồn kho theo kho (unique warehouse_id+product_id, stock/available/reserved) - Files: `schema.sql`
- **Default warehouse stock init** - Tạo migration init `warehouse_stock` cho toàn bộ sản phẩm hiện có vào "Kho trung tâm" và cập nhật tạo sản phẩm mới để auto thuộc kho mặc định - Files: `migrations/002_init_warehouse_stock_default_central.sql`, `backend/routes/products.js`
- **Warehouses admin page + default** - Thêm màn hình admin tạo/sửa kho và đặt kho mặc định; backend enforce + tự chuẩn hoá để luôn chỉ có 1 kho default, schema thêm `warehouses.is_default` + migration - Files: `src/pages/Warehouses.tsx`, `src/App.tsx`, `src/components/Layout.tsx`, `backend/routes/warehouses.js`, `backend/routes/products.js`, `schema.sql`, `migrations/003_add_warehouse_default.sql`
- **Warehouses default radio UI** - Cột "Kho mặc định" hiển thị radio 1 lựa chọn; chọn sẽ auto cập nhật ngay, thay thế kho mặc định hiện tại - Files: `src/pages/Warehouses.tsx`
- **Local migration runner** - Thêm script chạy file .sql bằng mysql2 để tiện apply migrations trên máy không có mysql CLI - Files: `backend/scripts/runSqlMigration.js`
- **Seed products into default warehouse** - Thêm migration seed dữ liệu test: tạo `warehouse_stock` cho kho mặc định (kho tổng) với các sản phẩm chưa có warehouse_stock - Files: `migrations/004_seed_default_warehouse_stock_for_testing.sql`
- **Inventory Import/Export product picker UI** - Refine UI chọn sản phẩm theo style OrderForm (header + search box, dropdown suggestions đẹp, empty state) - Files: `src/pages/InventoryImport.tsx`, `src/pages/InventoryExport.tsx`
- **Inventory Import default price** - Khi thêm sản phẩm vào nhập kho, nếu `cost_price=0` sẽ fallback sang `price` để tránh đơn giá = 0 - Files: `src/pages/InventoryImport.tsx`

## [06/04/2026] - Verify & Fix OrderSearch, CollaboratorsPage, InventoryImport/Export
### Fixed
- **CollaboratorsPage API** - GET/POST/DELETE đều dùng bảng `collaborators` (sales_id/ctv_id) thay vì `user_collaborators` (rỗng) - Files: `backend/routes/users.js`
- **OrderSearch params** - Sửa `startDate/endDate` → `date_from/date_to` khớp với API `/orders`. Fix statusConfig đúng 4 trạng thái. Thêm navigate click vào đơn. Thêm filter trạng thái - Files: `src/pages/OrderSearch.tsx`
- **InventoryImport** - Nhận `quantity/unit_price` (từ frontend form) hoặc `qty/price`. Update cả `stock_qty` và `available_stock`. Recalculate stock sau nhập - Files: `backend/routes/inventory.js`
- **InventoryExport** - Tương tự, check `available_stock` thay vì `stock_qty`. Recalculate sau xuất - Files: `backend/routes/inventory.js`
### Verified
- **Login/Register** - API hoạt động đúng, token + user trả về đủ fields

## [06/04/2026] - Fix tính override per-item (mỗi sản phẩm tra tier riêng)
### Fixed
- **calculateOverrideCommissions per-item** - Tính override từng sản phẩm riêng: SP1 10%→tier 3%, SP2 7%→tier 2%, cộng lại → tổng override đúng. Cache tier query để không lặp DB - Files: `backend/services/orderService.js`
- Kết quả: đơn mix rate sẽ tính đúng từng item thay vì dùng avgRate chung

## [06/04/2026] - Fix tính override_rate đúng theo commission_rate của items
### Fixed
- **calculateOverrideCommissions** - Tra tier theo `avgItemRate` (commission_rate trung bình của items trong đơn, VD 10%) thay vì commission_rate của Sales quản lý (5%) → override đúng 3% thay vì 1% - Files: `backend/services/orderService.js`
- Kết quả: Minh ← Lan, items 10% → tier 10%-30% → **3%** × 10,040,000đ = **301,200đ** ✅

## [06/04/2026] - Fix logic hoa hồng CTV theo nhóm + lưu override_rate
### Fixed
- **calculateOverrideCommissions** - Thêm check cùng nhóm: B lên đơn nhóm X → A chỉ nhận override nếu A cũng thuộc nhóm X (đúng LOGIC_BUSINESS.md) - Files: `backend/services/orderService.js`
- **Lưu override_rate tại thời điểm tạo đơn** - Lưu `override_rate` vào bảng `commissions` khi tạo, không tra lại commission_tiers khi recalc → đơn cũ không bị ảnh hưởng khi admin sửa tier - Files: `backend/services/orderService.js`
### Added
- **Cột commissions.override_rate** - `DECIMAL(5,2)` lưu tỷ lệ % override tại thời điểm tạo đơn - DB migration
### Changed
- **Recalculate toàn bộ commission** - Chạy lại với logic mới: Minh ← Lan (1%, nhóm SHEKI) = 100,400đ ✅

## [05/04/2026] - Xuất Excel báo cáo hoa hồng
### Added
- **exportExcel.ts** - Thư viện export 3 loại: `exportSalesCommission` (Sales: chi tiết đơn + tổng kết), `exportAdminCommission` (Admin: tổng hợp NV + chi tiết đơn + HH CTV, 3 sheet), `exportCtvCommission` (HH từ CTV: tổng hợp + chi tiết đơn) - Files: `src/lib/exportExcel.ts`
- **Nút "Xuất Excel" CommissionReport** - Admin xuất 3 sheet (Tổng hợp NV / Chi tiết đơn / HH từ CTV), Sales xuất 2 sheet (Chi tiết đơn / Tổng kết) - Files: `src/pages/CommissionReport.tsx`
- **Nút "Xuất Excel" CollaboratorsCommissionReport** - Sales xuất 2 sheet (Tổng hợp CTV / Chi tiết đơn) - Files: `src/pages/CollaboratorsCommissionReport.tsx`
- **Nút "Xuất Excel" CollaboratorsCommissionsReport** - Admin xuất sheet HH CTV toàn hệ thống - Files: `src/pages/CollaboratorsCommissionsReport.tsx`
- **xlsx dependency** - Cài thư viện `xlsx` cho frontend

## [05/04/2026] - Gộp báo cáo HH CTV vào trang báo cáo Admin + Fix HH Sales
### Added
- **CommissionReport tab HH CTV** - Admin thấy 2 tab: "Hoa hồng nhân viên" + "Hoa hồng từ CTV" (accordion Sales→CTV→Đơn, grand total) - Files: `src/pages/CommissionReport.tsx`
- **fetch song song** - Promise.all salary + CTV cùng lúc khi admin load - Files: `src/pages/CommissionReport.tsx`
### Fixed
- **CommissionReport Sales stat cards = 0** - Gọi thêm API `/users/:id/collaborators/commissions` để lấy override_commission cho stat cards - Files: `src/pages/CommissionReport.tsx`
- **CommissionReport Sales bảng chi tiết hiện đơn override** - `/commissions/orders` thêm điều kiện `c.type='direct'` khi role=sales - Files: `backend/routes/commissions.js`
### Removed
- **Menu "Hoa hồng từ CTV" riêng lẻ** trong Admin nav - Files: `src/components/Layout.tsx`

## [05/04/2026] - Màn hình HH CTV (Sales + Admin) + Fix params SQL
### Added
- **CollaboratorsCommissionReport** - Sales: filter preset+nhóm, accordion CTV, chi tiết đơn, grand total - Files: `src/pages/CollaboratorsCommissionReport.tsx`
- **CollaboratorsCommissionsReport** - Admin: accordion 2 cấp Sales→CTV→Đơn, filter nhóm/sales/search - Files: `src/pages/CollaboratorsCommissionsReport.tsx`
- **CtvCommissionRoute** - Tự phân biệt Admin/Sales khi vào `/reports/commissions/ctv` - Files: `src/App.tsx`
### Fixed
- **HH CTV = 0** - params SQL bị lẫn targetUserId vào đầu filter tháng/năm → MONTH() nhận sai giá trị - Files: `backend/routes/users.js`, `backend/routes/collaborators.js`
- **Lan hiển thị HH CTV sai** - Route dùng màn hình Admin cho cả Sales → Lan thấy toàn hệ thống. Fix: tách route theo role - Files: `src/App.tsx`

## [05/04/2026] - Dashboard Admin + Sales hoàn chỉnh
### Added
- **Dashboard Admin** - Doanh thu tháng/hôm nay/% so tháng trước, 4 box trạng thái đơn, top 5 nhân viên, top 5 sản phẩm chart, đơn gần đây - Files: `src/pages/Dashboard.tsx`
- **Dashboard Sales** - Doanh thu, HH bán hàng, HH từ CTV, số đơn, 4 box trạng thái, top sản phẩm chart, đơn gần đây - Files: `src/pages/Dashboard.tsx`
- **Backend /reports/dashboard nâng cấp** - Tháng này/tháng trước/hôm nay, byStatus, commission tách direct/override, topSales (admin), topProducts, recentOrders đủ thông tin - Files: `backend/routes/reports.js`

## [05/04/2026] - CommissionReport nâng cấp + EmployeeDetail date filter
### Added
- **CommissionReport 4 stat cards** - HH bán hàng (direct) / HH từ CTV (override) / Tổng HH / Số đơn - Files: `src/pages/CommissionReport.tsx`
- **CommissionReport filter nhóm** - Sales lấy nhóm của mình, Admin lấy tất cả - Files: `src/pages/CommissionReport.tsx`
- **CommissionReport cột Nhóm BH** - Hiển thị nhóm bán hàng trong bảng chi tiết đơn - Files: `src/pages/CommissionReport.tsx`
- **CommissionReport Admin bảng sum** - Footer tổng cộng tất cả cột - Files: `src/pages/CommissionReport.tsx`
- **EmployeeDetail date filter** - Preset (Tất cả/Hôm nay/Tuần/Tháng/Tháng trước/Năm trước/Tuỳ chọn), 5 stat cards - Files: `src/pages/EmployeeDetail.tsx`
- **Backend /:id/overview filter date** - month/year params, tách direct/override commission - Files: `backend/routes/users.js`
- **Backend /commissions/orders nâng cấp** - Thêm group_id filter, group_name, customer_name, summary tách direct/override - Files: `backend/routes/commissions.js`

## [05/04/2026] - OrderList nâng cấp + Fix trạng thái đơn
### Added
- **OrderList checkbox bulk action** - Check all/từng dòng, đổi trạng thái nhiều đơn - Files: `src/pages/OrderList.tsx`
- **OrderList date preset** - Hôm nay/Tuần/Tháng/Tháng trước/Năm trước/Tuỳ chọn, mặc định hôm nay - Files: `src/pages/OrderList.tsx`
- **OrderList filter nhân viên** - Admin thấy dropdown + cột nhân viên - Files: `src/pages/OrderList.tsx`
- **Backend /orders date_from/date_to** - Filter theo khoảng ngày - Files: `backend/routes/orders.js`
### Fixed
- **Status đơn rỗng** - DB migrate: đơn status='' → pending - DB
### Removed
- **Status draft/confirmed/done** - Bỏ khỏi statusConfig, chỉ còn pending/shipping/completed/cancelled

## [05/04/2026] - Redesign bảng sản phẩm OrderForm
### Changed
- **Bảng sản phẩm OrderForm** - Font xs, padding gọn, qty input +/- buttons (step 0.1), đơn giá input gõ được (transparent border), chiết khấu % input, hoa hồng % chỉnh được, available_stock hiển thị dưới SKU, row đỏ khi vượt tồn, empty state, tfoot sum - Files: `src/pages/OrderForm.tsx`
- **Group selector** - Sales chỉ load nhóm của mình, Admin load tất cả - Files: `src/pages/OrderForm.tsx`

## [05/04/2026] - Fix logic hoa hồng override từ CTV + Tổng quan nhân viên
### Fixed
- **calculateOverrideCommissions** - Sửa đúng theo LOGIC_BUSINESS.md: override tính % trên TỔNG TIỀN ĐƠN (không phải trên hoa hồng CTV). Tra tier theo commission_rate của SALES (người quản lý), không phải CTV - Files: `backend/services/orderService.js`
- **Recalculate** - Chạy lại commission cho tất cả đơn hiện có theo logic mới
### Added  
- **EmployeeDetail** - Date filter preset (Tất cả/Hôm nay/Tuần/Tháng/Tháng trước/Năm trước/Tuỳ chọn), 5 stat cards (Tổng HH / HH bán hàng / HH từ CTV / Số đơn / Doanh thu), fix statusConfig đúng 4 trạng thái - Files: `src/pages/EmployeeDetail.tsx`
- **Backend overview API** - Thêm date_from/date_to filter, tách direct_commission và override_commission riêng - Files: `backend/routes/users.js`

## [05/04/2026] - Fix toàn bộ logic kho theo trạng thái đơn hàng
### Fixed
- **DB ENUM migration** - ALTER TABLE orders: bỏ draft/confirmed/done, chỉ còn 4 trạng thái: `pending/shipping/completed/cancelled` - DB
- **Data migration** - 1 đơn draft → pending, stock recalculate lại đúng
- **recalculateStock** - Chỉ pending+shipping giữ reserved_stock (bỏ draft)
- **deductStockOnComplete** - Khi đơn completed → trừ hẳn stock_qty vật lý
- **restoreStockOnCancel** - Khi đơn cancelled → hoàn lại kho (nếu đã completed thì cộng lại stock_qty)
- **DELETE order** - Lấy items trước khi xóa, hoàn kho nếu đơn đã completed
- **PUT order** - Xử lý đúng transition: pending→completed trừ kho, bất kỳ→cancelled hoàn kho
- Files: `backend/services/orderService.js`, `backend/routes/orders.js`

## [05/04/2026] - Fix draft/stock bug + Checkbox bulk action + Date preset filter
### Fixed
- **orderService.js** - `recalculateStock` bỏ `draft` khỏi reserved list, chỉ còn `pending/shipping` giữ kho - Files: `backend/services/orderService.js`
- **orders.js POST** - Bỏ hardcode `status='draft'`, dùng `status` từ request (default `pending`) - Files: `backend/routes/orders.js`
- **orders.js PUT** - Bỏ rule chặn sales sửa đơn nếu không phải draft - Files: `backend/routes/orders.js`
### Added
- **OrderList checkbox** - Check all / check từng dòng, bulk đổi trạng thái nhiều đơn cùng lúc - Files: `src/pages/OrderList.tsx`
- **OrderList date preset** - Dropdown: Hôm nay, Tuần này, Tháng này, Tháng trước, Năm trước, Tuỳ chọn (date range) — mặc định Hôm nay - Files: `src/pages/OrderList.tsx`
### Changed
- **OrderList** - Redesign gọn lại, bỏ stat cards thừa, filter 1 hàng, action buttons ẩn/hiện khi hover

## [05/04/2026] - Redesign bảng sản phẩm OrderForm + Fix group selector
### Fixed
- **Bảng sản phẩm OrderForm** - Redesign gọn lại: font vừa phải (text-sm thay text-2xl), padding nhỏ hơn (py-3 thay py-6), cột đúng căn lề, qty input nhỏ gọn (w-16 h-8), hoa hồng badge emerald, nút xoá ẩn/hiện khi hover, empty state khi chưa có sản phẩm - Files: `src/pages/OrderForm.tsx`
- **Group selector chỉ load nhóm của nhân viên** - Sales: `GET /groups/user/:userId`, Admin: `GET /groups` (tất cả) - Files: `src/pages/OrderForm.tsx`

## [05/04/2026] - Thêm validation đầy đủ cho tất cả form + Fix OrderForm bugs
### Added
- **CustomerForm validation** - `errors` state object, validate name required, phone bắt buộc 10 chữ số (không còn optional), email format check (regex), inline red border + error text dưới mỗi field - Files: `src/pages/CustomerForm.tsx`
- **ProductForm validation** - `errors` state, validate name/SKU required, price > 0, inline error display - Files: `src/pages/ProductForm.tsx`
- **EmployeeForm validation** - `errors` state, validate full_name/email required, email format, password min 6 ký tự khi tạo mới, phone 10 chữ số nếu nhập, commission_rate 0-100, salary >= 0, inline error per field - Files: `src/pages/EmployeeForm.tsx`
- **OrderForm formError banner** - Styled error banner thay thế alert(), hiển thị trên đầu form - Files: `src/pages/OrderForm.tsx`
- **OrderForm group selector** - Dropdown chọn nhóm bắt buộc, fetch từ API, validate trước khi submit - Files: `src/pages/OrderForm.tsx`
- **OrderForm note textarea** - Textarea ghi chú đơn hàng xuất hiện trong settings panel, bind `value={note}` - Files: `src/pages/OrderForm.tsx`
### Fixed
- **OrderForm shipping fee uncontrolled** - Chuyển sang `value={shippingFee}` + `onChange` → giá trị được gửi lên server - Files: `src/pages/OrderForm.tsx`
- **OrderForm discount uncontrolled** - Chuyển sang `value={orderDiscount}` + `onChange` → giá trị được gửi lên server - Files: `src/pages/OrderForm.tsx`
- **OrderForm payment method không cập nhật state** - Thêm `onClick={() => setPaymentMethod(method.id)}` vào mỗi button - Files: `src/pages/OrderForm.tsx`
- **OrderForm status select không bind** - Thêm `value={orderStatus}` + `onChange` - Files: `src/pages/OrderForm.tsx`
- **OrderForm payload hardcoded** - shipping_fee, discount, payment_method, status, note, group_id giờ lấy từ state thực - Files: `src/pages/OrderForm.tsx`
### Changed
- **CustomerForm** - Xóa `phoneError` state riêng, gộp vào `errors` object, phone trở thành bắt buộc - Files: `src/pages/CustomerForm.tsx`

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
