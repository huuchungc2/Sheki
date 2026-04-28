## [26/04/2026] - OrderList: thanh toán nằm dưới khách hàng
### Changed
- **OrderList UI** — Giữ cột Sản phẩm cạnh cột Khách hàng; chuyển “Thanh toán” và “Tổng tiền” xuống dưới Khách hàng; chuyển “Trạng thái” xuống dưới Mã đơn; bỏ “Nhóm BH” khỏi cột Mã đơn (nhóm hiển thị trong cột Nhân viên); cột “Lương” giữ nguyên 1 dòng. — File: `src/pages/OrderList.tsx`
- **CommissionReport UI** — Popup chi tiết đơn (bảng sản phẩm) giảm số cột để tránh tràn ngang, Sales/Admin cùng UI. — File: `src/pages/CommissionReport.tsx`

## [28/04/2026] - OrderList: KPI hoa hồng khớp bộ lọc tuần
### Fixed
- **Orders API summary** — KPI “Tổng hoa hồng” trong danh sách đơn lọc theo `DATE(orders.created_at)` (khớp bộ lọc tuần/tháng/tùy chọn của OrderList), tránh lệch khi hoa hồng phát sinh muộn do sửa đơn/recalc. — Files: `backend/routes/orders.js`, `backend/services/commissionKpi.js`

## [28/04/2026] - EmployeeDetail: lọc tuần không lệch ngày
### Fixed
- **EmployeeDetail UI** — Date preset dùng format local (`YYYY-MM-DD`) thay vì `toISOString()` (UTC) để tránh lệch “Tuần này” ở VN và làm số hoa hồng/đơn hàng bị sai phạm vi ngày. — File: `src/pages/EmployeeDetail.tsx`

## [28/04/2026] - KPI hoa hồng theo tháng: đồng nhất theo ngày tạo đơn
### Changed
- **KPI hoa hồng/hoàn theo tháng** — Đồng nhất lọc theo `orders.created_at` cho Dashboard + báo cáo hoa hồng + báo cáo CTV (không còn “chuyển kỳ” khi sửa đơn/recalc). — Files: `backend/services/commissionKpi.js`, `backend/services/returnMetrics.js`, `backend/routes/reports.js`, `backend/routes/commissions.js`, `backend/routes/users.js`, `backend/routes/collaborators.js`

## [28/04/2026] - Payroll periods: chốt kỳ lương theo thời điểm
### Added
- **Kỳ lương (backend)** — Thêm `payroll_periods` và gắn `orders.payroll_period_id` khi tạo đơn; API list/current/close kỳ để chốt lương tại thời điểm bất kỳ. Chặn hủy/xóa đơn thuộc kỳ đã chốt để tránh lật lương đã trả. — Files: `migrations/031_payroll_periods.sql`, `backend/routes/payroll.js`, `backend/services/payrollPeriod.js`, `backend/routes/orders.js`, `backend/server.js`

## [28/04/2026] - Payroll periods: UI chốt kỳ lương
### Added
- **UI chốt kỳ** — Thêm trang `/reports/payroll-periods` để xem kỳ hiện tại, chốt kỳ, và xem preview lương theo kỳ. — Files: `src/pages/PayrollPeriods.tsx`, `src/App.tsx`, `src/components/Layout.tsx`

## [28/04/2026] - Payroll periods: tích hợp báo cáo lương + hủy đơn đã chốt
### Changed
- **Salary report** — `/reports/salary` hỗ trợ `payroll_period_id` (mặc định kỳ mở) và cộng `payroll_adjustments` vào Tổng lương; kỳ `closed` đọc snapshot từ `payroll_settlements`. — File: `backend/routes/reports.js`
### Added
- **OrderForm (Admin)** — Khi đơn thuộc kỳ đã chốt, hiển thị nút “Hủy đơn (tạo điều chỉnh lương)” gọi API điều chỉnh lương. Đồng thời `/orders/:id` trả thêm `payroll_period_status`. — Files: `src/pages/OrderForm.tsx`, `backend/routes/orders.js`

## [28/04/2026] - Payroll periods: chỉ Admin thấy menu chốt kỳ
### Fixed
- **Sidebar** — Sales không còn thấy mục “Chốt kỳ lương”; chỉ Admin (menu hardcode) hiển thị. — File: `src/components/Layout.tsx`

## [28/04/2026] - Payroll periods: UI chọn kỳ cho báo cáo hoa hồng
### Added
- **CommissionReport** — Thêm chế độ lọc “Kỳ lương” + dropdown chọn kỳ (Admin/Sales). Khi chọn kỳ, tất cả API chính dùng `payroll_period_id` thay vì month/year. — Files: `src/pages/CommissionReport.tsx`, `backend/routes/commissions.js`, `backend/routes/reports.js`, `backend/routes/collaborators.js`
### Fixed
- **Sync kỳ đang mở** — Báo cáo hoa hồng tự sync về kỳ open hiện tại sau khi chốt, tránh chọn nhầm “kỳ mở” cũ dẫn đến lấy dữ liệu sai. — File: `src/pages/CommissionReport.tsx`
- **Default theo tháng** — Mặc định vào trang theo Tháng (ổn định), chỉ khi chuyển sang Kỳ lương mới load/sync kỳ open để tránh trạng thái “vào trang sai, chọn qua chọn lại mới đúng”. — File: `src/pages/CommissionReport.tsx`

## [28/04/2026] - Payroll periods: backfill đơn cũ vào kỳ mở đầu tiên
### Fixed
- **ensureOpenPayrollPeriod** — Tự động gán `orders.payroll_period_id` cho các đơn legacy bị NULL để lọc theo kỳ không bị 0. — File: `backend/services/payrollPeriod.js`

## [28/04/2026] - Payroll periods: reindex đơn theo khoảng kỳ
### Added
- **Reindex orders** — Thêm hàm gán lại `orders.payroll_period_id` theo `orders.created_at` nằm trong khoảng `[period.from_at, period.to_at)` và endpoint admin để chạy lại khi kỳ đã chốt bị 0. Đồng thời auto reindex trước khi chốt để snapshot đúng. — Files: `backend/services/payrollPeriod.js`, `backend/routes/payroll.js`, `src/pages/PayrollPeriods.tsx`
### Fixed
- **Open period không dồn lịch sử** — Bỏ backfill kiểu gán tất cả đơn NULL vào kỳ đang mở; kỳ đầu tiên lấy `from_at` theo `MIN(orders.created_at)` và reindex theo khoảng kỳ. — File: `backend/services/payrollPeriod.js`

## [28/04/2026] - Payroll periods: chốt theo mốc thời điểm (cutoff)
### Changed
- **Close payroll period** — Khi chốt tại thời điểm \(T\), hệ thống gom toàn bộ đơn “chưa chốt” trước \(T\) vào kỳ vừa chốt và các đơn sau \(T\) vào kỳ mở mới (cutoff-based), tránh kỳ đã chốt rỗng/đơn rơi sai kỳ. — File: `backend/services/payrollPeriod.js`

## [28/04/2026] - Payroll periods: chặn hủy/xóa đơn đã chốt
### Changed
- **Orders** — Đơn thuộc kỳ lương đã chốt bị chặn hủy/xóa; hướng dẫn xử lý bằng “đơn hoàn (returns)”. Gỡ luồng `cancel-with-payroll-adjustment` khỏi UI. — Files: `backend/routes/orders.js`, `src/pages/OrderForm.tsx`

## [28/04/2026] - Payroll periods: chặn sửa đơn đã chốt
### Changed
- **Orders** — Đơn thuộc kỳ lương đã chốt bị chặn sửa (PUT), UI khóa nút lưu và hiển thị cảnh báo. — Files: `backend/routes/orders.js`, `src/pages/OrderForm.tsx`

## [23/04/2026] - Thu chi: nhân viên mặc định theo chính mình
### Fixed
- **CashTransactions UI** — Nếu user không phải Admin thì tự mặc định `user_id`/bộ lọc theo chính user đang đăng nhập và khóa chọn nhân viên; Admin vẫn chọn/lọc theo nhân viên như cũ. — File: `src/pages/CashTransactions.tsx`

## [24/04/2026] - Auth: JWT 30 ngày + auto về Login khi hết hạn
### Changed
- **JWT expiry** — Tăng thời hạn token mặc định từ 7 ngày lên 30 ngày (hỗ trợ cấu hình qua `JWT_EXPIRES_IN=30d`). — Files: `backend/routes/auth.js`, `backend/.env.example`
- **Frontend session** — Bắt `401` toàn cục (token hết hạn/không hợp lệ) để xoá `localStorage` và phát `auth-change`, app tự quay về `/login` lấy token mới; đồng thời bắt `403` có `code` thuộc nhóm shop (`SHOP_FORBIDDEN`/`SHOP_REQUIRED`/`SHOP_SESSION_INVALID`) để tự thoát khi shop bị khóa/hết hạn. — File: `src/App.tsx`

## [23/04/2026] - Super Admin: tạo shop auto-seed group + user test + sản phẩm test
### Added
- **Shops API** — Khi Super Admin tạo shop mới, hệ thống tự tạo 1 group theo tên shop, tạo 2 user sales test thuộc `user_shops` + `user_groups` (password `abc123`) và tạo 2 sản phẩm test kèm `warehouse_stock` ở kho mặc định để có thể lên đơn/nhập-xuất test ngay. — File: `backend/routes/shops.js`

## [23/04/2026] - RBAC: Sales xem chi tiết khách hàng không bị 403
### Fixed
- **Feature permissions seed** — Bổ sung quyền mặc định `customers.view` cho role non-admin (sales-like) để khớp middleware `requireFeature('customers.view')` ở `GET /customers/:id`; thêm migration backfill quyền này cho các role đã seed `customers.list`. — Files: `backend/routes/settings.js`, `migrations/029_fix_customers_view_feature.sql`

## [23/04/2026] - Báo cáo hoa hồng: UI đồng nhất theo menu Admin
### Changed
- **CommissionReport UI** — Trang `/reports/commissions` luôn hiển thị tabs “Hoa hồng nhân viên / Hoa hồng từ CTV” như Admin; non-admin (Sales) vẫn xem được theo scope `own` (bảng NV chỉ còn 1 dòng của mình, CTV filter theo `sales_id`). — File: `src/pages/CommissionReport.tsx`

## [23/04/2026] - RBAC: scope nhóm không lọt dữ liệu báo cáo
### Fixed
- **Commissions + CTV commissions** — Khi `scope='group'`, các endpoint báo cáo hoa hồng bắt buộc giới hạn theo `group_id` thuộc nhóm của user (nếu không truyền `group_id` thì tự chọn nhóm đầu tiên user thuộc) để tránh xem “lọt” ngoài nhóm. — Files: `backend/routes/commissions.js`, `backend/routes/collaborators.js`

## [23/04/2026] - RBAC: “Chức năng” (feature perms) bật/tắt ăn thật
### Fixed
- **Feature permissions strict + seed** — `PUT /settings/feature-matrix` luôn lưu đủ tất cả feature keys (key thiếu = false) để tránh fallback mặc định; middleware `requireFeature()` chuyển sang strict khi role đã có dòng seeded (key thiếu = deny); seed `role_feature_permissions` mặc định khi tạo role mới; gắn `employees.list` vào `GET /users` để bật/tắt “Xem nhân viên” hoạt động đúng. — Files: `backend/routes/settings.js`, `backend/middleware/requireFeature.js`, `backend/routes/roles.js`, `backend/routes/users.js`

## [23/04/2026] - Tooling: generator thêm module RBAC
### Added
- **rbac-gen** — Script sinh RBAC cho module mới: tự thêm feature keys vào `backend/rbac/features.js`, (tuỳ chọn) thêm scope target, và tự tạo migration backfill `role_feature_permissions` để key mới có sẵn cho mọi role/shop (hợp strict mode). — File: `backend/scripts/rbac-gen.js`

## [21/04/2026] - Multi-shop: role theo shop (không “lòi” role cross-shop)
### Fixed
- **Roles** — Thêm `roles.shop_id` để role custom thuộc từng shop; `GET /roles` chỉ trả role của shop hiện tại + role hệ thống; chặn sửa/xóa role hệ thống từ shop. — File: `backend/routes/roles.js`
- **Users/Shop** — Chặn gán `role_id` không thuộc shop hiện tại khi tạo/sửa/gán quyền nhân viên; seed/admin-role hệ thống luôn lấy `shop_id=0` (fallback DB cũ). — Files: `backend/routes/users.js`, `backend/routes/shops.js`
- **DB** — Migration thêm `roles.shop_id` và unique theo `(shop_id, code)` (custom role migrate về shop_id=1). — File: `migrations/022_roles_shop_id.sql`

## [22/04/2026] - OrderForm: tổng kết hiển thị mã đơn + đổi nhãn NV chịu
### Changed
- **OrderForm** — Thêm 1 dòng “Mã ĐH” trong “Tổng kết đơn hàng” khi sửa đơn (fallback `#id`); giữ nguyên dòng “Tổng CK”; dòng “Tiền NV chịu” đổi mô tả từ “trừ HH sau” → “trừ vào Lương” (không đổi logic). — File: `src/pages/OrderForm.tsx`

## [21/04/2026] - RBAC: Sales thấy lại “Hoa hồng CTV”
### Fixed
- **FE Menu/Routes** — Non-admin có `reports.view` sẽ thấy link `/reports/commissions/ctv` và route này cũng được bảo vệ bằng `reports.view` như các báo cáo khác. — Files: `src/components/Layout.tsx`, `src/App.tsx`

## [21/04/2026] - RBAC: default permissions luôn đủ 32 quyền
### Fixed
- **Settings API** — Khi role chưa có dòng `role_permissions`, default trả về luôn full matrix 8 module × 4 action (32 rows) để UI toggle ổn định; tránh tạo role kho nhưng thiếu quyền → `_caps` rỗng → mất hết menu/403. — File: `backend/routes/settings.js`

## [21/04/2026] - reports/commissions: sort lương cao→thấp + gộp cột HH & Ship/NV
### Changed
- **Reports API** — `GET /reports/salary` sort danh sách nhân viên theo `total_luong` giảm dần (để bảng “Hoa hồng nhân viên” hiển thị lương cao đến thấp). — File: `backend/routes/reports.js`
- **CommissionReport UI** — Bảng “Hoa hồng nhân viên”: gộp `Số đơn` + `Doanh số` vào cột Nhân viên; đổi nhãn HH thành `Bán hàng / Từ CTV / Tổng`; gộp `Ship KH Trả` + `NV chịu` thành 1 cột nhiều dòng. Bảng “Chi tiết hoa hồng theo đơn”: gộp `Ngày` + `Nhóm BH` vào cột Mã đơn hàng và chuyển `Loại HH` sang cột `NHÂN VIÊN`; gộp Ship/NV để giảm tràn ngang. — File: `src/pages/CommissionReport.tsx`

## [21/04/2026] - RBAC phase 1: kho/inventory enforce + UX Settings + seed quyền role mới
### Changed
- **Inventory API** — Các endpoint kho dùng `requirePermission('inventory', …)` thay vì `authorize('admin')`, để quyền trong `role_permissions` có hiệu lực thật (xem vs nhập/xuất). — File: `backend/routes/inventory.js`
- **Roles API** — Khi tạo role mới, tự seed `role_permissions` cho shop hiện tại (copy template `shop_id=1`: admin-role copy theo admin, role khác copy theo sales) để tránh 403 khi role chưa có dòng permission. — File: `backend/routes/roles.js`
- **FE** — Mở route `/inventory*` cho user role kho (theo `roles.code` chứa `kho/warehouse/inventory`); thêm menu sidebar riêng cho NV kho; default matrix trong Settings khớp backend cho mọi role không phải admin. — Files: `src/App.tsx`, `src/components/Layout.tsx`, `src/pages/Settings.tsx`
- **Auth API + FE routing** — `GET /auth/me` trả `_caps` (quyền hiệu lực theo `role_permissions` + cùng rule bypass như `requirePermission`); `App.tsx`/`Layout.tsx` dùng `_caps` để mở `/inventory*`, `/reports/revenue`, `/cash-transactions` thay vì hardcode theo `roles.code`. — Files: `backend/routes/auth.js`, `src/App.tsx`, `src/components/Layout.tsx`
- **Cash transactions + Revenue report API** — Bỏ `authorize('admin')` kiểu cũ; dùng `requirePermission('reports', …)` để role kiểu kế toán (có `reports.view/edit/delete`) dùng được khi được phân quyền. — Files: `backend/routes/cash-transactions.js`, `backend/routes/reports.js`

## [20/04/2026] - Profile: Sales bấm “Tài khoản” không bị 403 và luôn load dữ liệu mới nhất
### Fixed
- **Users API** — Thêm `GET /users/me` để lấy profile hiện tại; bỏ `requireShop` khỏi `PUT /users/me` để user chưa gán shop vẫn cập nhật thông tin cá nhân (tránh 403 “không có quyền truy cập”). — File: `backend/routes/users.js`
- **FE Profile** — Khi mở `/profile` sẽ gọi `GET /users/me` để load dữ liệu mới nhất (không phụ thuộc localStorage), đồng bộ lại `localStorage.user` và phát `auth-change`. — File: `src/pages/Profile.tsx`

## [20/04/2026] - Settings: phân quyền theo role_id + middleware requirePermission
### Changed
- `role_permissions` chuyển sang lưu theo `role_id` (FK `roles.id`) thay vì `role` string; bổ sung migration. — Files: `migrations/021_role_permissions_role_id.sql`, `schema.sql`
- Thêm middleware `requirePermission(module, action)` và áp vào settings/roles/groups (CRUD). — Files: `backend/middleware/requirePermission.js`, `backend/routes/settings.js`, `backend/routes/roles.js`, `backend/routes/groups.js`, `backend/middleware/auth.js`
- UI Settings load danh sách vai trò từ DB, không hardcode `admin/sales`. — File: `src/pages/Settings.tsx`

## [20/04/2026] - Sidebar Admin: sắp xếp lại menu
### Changed
- Nhóm lại menu Admin theo Bán hàng / Sản phẩm / Nhân sự / Kho / Báo cáo / Excel / Nhật ký để dễ tìm, giữ nguyên route. — File: `src/components/Layout.tsx`

## [20/04/2026] - Orders: chặn cọc > giá trị đơn + Logs: nhật ký theo shop
### Fixed
- **OrderForm** — Khi nhập `tiền cọc` lớn hơn `giá trị đơn` (tạm tính sau CK dòng), hiển thị cảnh báo và chặn lưu đơn. — File: `src/pages/OrderForm.tsx`
- **Activity logs** — Ghi `shop_id` vào `activity_logs` khi log hoạt động để màn Nhật ký lọc theo shop hoạt động đúng (trước đó log thiếu `shop_id` nên admin đổi shop thấy nhật ký sai/không có). — File: `backend/middleware/logger.js`

## [20/04/2026] - Hoa hồng quản lý (override): shop mới vẫn tính được
### Fixed
- **Shop create** — Khi tạo shop mới, tự copy `commission_tiers` từ shop mẫu (shop_id=1) sang shop mới để tính hoa hồng quản lý (override) không bị 0 do thiếu cấu hình. — File: `backend/routes/shops.js`
- **Order commissions** — Bỏ đọc cột không tồn tại `collaborators.override_rate` (tránh lỗi 500 “Unknown column”). Override rate lấy từ `commission_tiers`. — File: `backend/services/orderService.js`

## [20/04/2026] - Dashboard: đổi shop không bị dính doanh thu shop cũ
### Fixed
- **FE Dashboard** — Đồng bộ `token/user` theo `auth-change`/`storage` và tự refetch `/reports/dashboard` khi switch-shop, tránh hiển thị doanh thu/hoa hồng của shop trước (vd Sheki) khi đã chuyển sang shop khác (vd TNK). — File: `src/pages/Dashboard.tsx`

## [20/04/2026] - Revenue report: đổi shop không bị dính dữ liệu shop cũ
### Fixed
- **FE RevenueReport** — Đồng bộ token theo `auth-change`/`storage` và refetch `/reports/revenue` + `/groups` theo token mới sau switch-shop (tránh lấy dữ liệu Sheki khi đang ở TNK). — File: `src/pages/RevenueReport.tsx`

## [20/04/2026] - Reports revenue: Summary không lọt cross-shop
### Fixed
- **Reports API** — `GET /reports/revenue` phần `summary.totalSales/totalCommission/totalReturns` trước đây thiếu filter `shop_id` nên có thể hiện số của shop khác (vd Sheki) khi đang ở TNK. Đã thêm `o.shop_id = ?` cho các query summary. — File: `backend/routes/reports.js`

## [20/04/2026] - Shop: seed commission tiers cho shop đã tạo
### Added
- **Shops API** — Thêm `POST /shops/:id/seed-commission-tiers` (Super Admin) để copy `commission_tiers` từ shop mẫu `shop_id=1` sang shop khác (dùng khi shop tạo trước lúc auto-seed). — File: `backend/routes/shops.js`

## [20/04/2026] - Super Admin: tạo shop auto-seed quyền + kho mặc định
### Changed
- **Shops API** — Khi Super Admin tạo shop mới, hệ thống tự seed `role_permissions` (copy từ shop mẫu id=1 cho role admin/sales; có fallback nếu DB chưa migrate `role_id`) và tự tạo 1 kho mặc định để tránh lỗi khi lên đơn/nhập-xuất. — File: `backend/routes/shops.js`

## [20/04/2026] - Commission tiers: normalize min/max để shop nào cũng match
### Fixed
- **Commission tiers API** — Khi tạo/sửa tier nếu `ctv_rate_min > ctv_rate_max` (UI hiển thị 30% → 10%), backend tự swap để lưu đúng (min=10, max=30) giúp tính override không bị 0 ở shop mới. — File: `backend/routes/commission-tiers.js`

## [20/04/2026] - Multi-shop: fix Reports lọt dữ liệu cross-shop (Admin TNK thấy data Sheki)
### Fixed
- **Reports API** — Thêm `requireShop` và filter theo `shop_id` cho `GET /reports/dashboard`, `GET /reports/salary`, `GET /reports/revenue`, `GET /reports/returns-summary` (bao gồm KPI hoàn/HH hoàn). Trước đó các endpoint chỉ cần `auth` nên admin shop có thể thấy dữ liệu toàn hệ thống. — File: `backend/routes/reports.js`
- **Returns API** — Update trạng thái `return_requests` khi approve/reject thêm điều kiện `AND shop_id = ?` để tránh cập nhật nhầm yêu cầu hoàn của shop khác. — File: `backend/routes/returns.js`

## [20/04/2026] - Multi-shop: login nhớ shop lần trước (tránh tự về Sheki)
### Fixed
- **FE Auth** — Lưu `last_shop_id` khi đổi shop và tự gửi/auto `switch-shop` sau login để vào đúng shop lần trước, thay vì default `shops[0]` (thường là Sheki) khi user thuộc nhiều shop. — Files: `src/pages/Login.tsx`, `src/components/Layout.tsx`
- **FE Auth** — Nếu `last_shop_id` không còn hợp lệ (server trả `SHOP_FORBIDDEN` “Bạn không thuộc shop đã chọn”), tự xoá `last_shop_id` và retry login không kèm `shop_id` để tránh bị kẹt. — File: `src/pages/Login.tsx`

## [20/04/2026] - Import/Export: export ra import vào được (nhân viên/sản phẩm)
### Fixed
- **Import Export** — `GET /import/export/:entity` trước đây xuất theo `Object.keys(row)` nên **lệch cột** so với header, và header không khớp template import → import lại hay lỗi “kiểm tra sản phẩm/nhân viên”. Giờ export dùng đúng `TEMPLATES[entity].headers/keys` (round-trip export → import). — File: `backend/routes/import.js`
- **Import products** — Fix SQL `INSERT INTO products` thiếu placeholder gây lỗi MySQL `Column count doesn't match value count`. — File: `backend/routes/import.js`

## [20/04/2026] - Categories: fix UI không thêm được sau switch-shop/login
### Fixed
- **FE Categories** — Không memoize token một lần; đồng bộ token theo `auth-change`/`storage` để nút Thêm/Sửa/Ẩn gọi API với token mới nhất (tránh “bấm không ăn” sau login/switch-shop). — File: `src/pages/Categories.tsx`

## [20/04/2026] - Products: chọn nhiều và gán danh mục hàng loạt
### Added
- **Products API** — `POST /products/bulk/category` cập nhật `category_id` cho nhiều `product_ids` trong shop hiện tại (validate category thuộc shop; cho phép `null` để bỏ danh mục). — File: `backend/routes/products.js`
- **ProductList UI** — Thêm checkbox chọn sản phẩm (select all theo trang) + thanh hành động “Gán danh mục” chọn danh mục hoặc “Bỏ danh mục”. — File: `src/pages/ProductList.tsx`

## [20/04/2026] - Import products: tồn kho vào kho mặc định
### Fixed
- **Import products** — Khi import sản phẩm có `stock_qty`, tự ghi `warehouse_stock` vào kho mặc định của shop (`warehouses.is_default=1`, fallback kho active đầu tiên) để tồn không bị “trôi” chỉ nằm ở `products.stock_qty`. — File: `backend/routes/import.js`

## [20/04/2026] - CustomerForm: SĐT 10 số + ngày sinh 1 ô (nullable)
### Changed
- **FE CustomerForm** — SĐT bắt buộc 10 số (input chỉ nhận số, max 10), Ngày sinh 1 ô (nullable) dùng `GregorianDateSelect` để tránh iOS hiển thị năm Phật lịch (BE 2569). — File: `src/pages/CustomerForm.tsx`

## [20/04/2026] - Sales: Cài đặt mở hồ sơ + đổi mật khẩu (không về Dashboard)
### Fixed
- **Layout** — Link “Cài đặt” ở sidebar: Admin → `/settings`; Sales → `/profile` và có thêm link `/change-password`, tránh bị redirect về Dashboard do `AdminRoute`. — File: `src/components/Layout.tsx`
- **Profile** — Thêm trang `/profile` để Sales sửa thông tin cá nhân; API `PUT /users/me` cập nhật hồ sơ (full_name/phone/email/department/position/**join_date/address/city/district**). — Files: `src/pages/Profile.tsx`, `src/App.tsx`, `backend/routes/users.js`

## [20/04/2026] - Super Admin: màn tạo shop + minh bạch role Admin / fix hiển thị active
### Changed
- **SuperAdminShops** — Modal tạo shop: 2 bước (shop → quản trị), giải thích rõ Admin vs Sales; mặc định bắt buộc ≥1 quản trị (tuỳ chọn «chỉ tạo shop trống»); badge `role_code` sau khi tạo. Đồng bộ `userActiveFromApi` cho shop/admin (tránh hiển thị sai Active). — Files: `src/pages/SuperAdminShops.tsx`
- **Shops API** — `admins_created` kèm `role_code`, `role_id`; `attachAdmins` dùng `rowUserIsActive` thay vì `!!is_active`; `getAdminRoleId` kiểm tra `code === 'admin'`. — Files: `backend/routes/shops.js`
- **Docs** — `FEATURE_MULTI_SHOP.md` (UI tạo shop + nguồn gốc Sales).

## [20/04/2026] - Super Admin: Mở/Khoá user shop (không bắt buộc role admin trong user_shops)
### Fixed
- **Shops API** — `PATCH /shops/:shopId/admins/:userId` trước đây `JOIN roles ... code='admin'` nên **không cập nhật** user chỉ có membership **sales** (vd `huuchungc2`): `is_active` vẫn 0 dù đã «Mở» chỗ khác. Giờ cập nhật theo `user_shops` (mọi role), vẫn `requireSuperAdmin`. — Files: `backend/routes/shops.js`

## [20/04/2026] - Login: giảm oan «tài khoản khóa» (is_active / driver)
### Fixed
- **Auth** — Không còn SELECT `is_active` lần 2 sau bcrypt. Coi được đăng nhập nếu `login_allowed` (SQL) **hoặc** `is_active` parse an toàn (Buffer/BIGINT/chuỗi). — Files: `backend/routes/auth.js`, `backend/scripts/checkUserPassword.js`

## [20/04/2026] - Login: chỉ theo username (không email)
### Changed
- **Auth** — `POST /auth/login` chỉ tra `users.username`; không đọc `req.body.email`; không khớp cột email. **Khôi phục super admin** (`/auth/super-admin-recovery`) cũng chỉ theo username. — Files: `backend/routes/auth.js`, `backend/scripts/checkUserPassword.js`, `src/pages/Login.tsx`, `src/pages/SuperAdminRecovery.tsx`, `CLAUDE.md`

## [20/04/2026] - Login: tránh «bị khóa» oan khi OR username/email khớp 2 user
### Fixed
- **Auth** — Chuỗi không có `@` chỉ tra **username** trước; có `@` chỉ tra **email** trước; chỉ khi không có dòng mới fallback `OR`. Tránh trường hợp cùng chuỗi (vd `huuchungc2`) khớp user khóa theo email + user mở theo username mà mật khẩu trùng user khóa → báo khóa oan. Sau khi bcrypt khớp, đọc lại `is_active` từ DB. — Files: `backend/routes/auth.js`, `backend/scripts/checkUserPassword.js`

## [20/04/2026] - Super Admin: đặt lại mật khẩu admin shop
### Added
- **API** — `PATCH /api/shops/:shopId/admins/:userId/password` (body `newPassword`), chỉ super admin; chỉ user có `user_shops` + role `admin` trong shop đó (không áp cho `is_super_admin`).
- **UI** — `SuperAdminShops`: nút «Đặt lại MK» cạnh từng admin trong bảng shop + modal nhập mật khẩu mới.
- **Docs** — `CLAUDE.md`, `FEATURE_MULTI_SHOP.md`

## [20/04/2026] - Super Admin: khôi phục mật khẩu khi quên + ghi rõ pass seed
### Added
- **Auth** — `POST /api/auth/super-admin-recovery` (body: `username`, `newPassword`, `resetKey`) khi đặt `SUPERADMIN_RESET_KEY` trong `backend/.env`.
- **FE** — Trang công khai `/super-admin-recovery` + link từ màn đăng nhập.
- **Script** — `backend/scripts/resetSuperAdminPassword.js` đặt lại mật khẩu super admin qua MySQL (không cần .env).
### Changed / Docs
- **CLAUDE.md** — Bảng tài khoản test: thêm `superadmin`; nêu rõ sau migration 019 mật khẩu superadmin **copy từ admin** (thường trùng `comiumauden1234`), tránh nhầm với comment `schema.sql`.
- **backend/.env.example** — Gợi ý `SUPERADMIN_RESET_KEY`.

## [20/04/2026] - Login: ưu tiên user đang hoạt động khi trùng username/email
### Fixed
- **Auth** — Truy vấn `WHERE username OR email` có thể khớp nhiều dòng (email trùng được phép; hoặc cùng chuỗi vừa là username user này vừa là email user khác). Code cũ lấy `rows[0]` nên có thể chọn nhầm tài khoản đã `is_active=0` → báo «Tài khoản đã bị khóa» dù admin mới đúng. Đã thêm `ORDER BY is_active DESC`, ưu tiên khớp `email` rồi `username`, rồi `id DESC` + `LIMIT 1`. — Files: `backend/routes/auth.js`, `backend/scripts/checkUserPassword.js`
- **Auth (bổ sung)** — Lấy **tất cả** user khớp OR, lọc `is_active` trong JS (chuẩn hóa kiểu từ MySQL/driver), sắp xếp ưu tiên khớp email → username, rồi `bcrypt` lần lượt từng tài khoản **đang active** cho đến khi khớp mật khẩu — tránh vẫn báo khóa khi còn 1 user active đúng mật khẩu. — Files: `backend/routes/auth.js`, `backend/scripts/checkUserPassword.js`
- **Auth** — Cột `login_allowed` tính bằng SQL `COALESCE(is_active,0) IN (1,TRUE)` thay vì chỉ tin `is_active` sau khi đọc qua driver — tránh lệch kiểu khiến tài khoản đang bật trong DB vẫn bị coi là khóa. — Files: `backend/routes/auth.js`, `backend/scripts/checkUserPassword.js`
- **Auth (login)** — Không còn trả «khóa» khi chưa thử mật khẩu; sắp **active trước** rồi `bcrypt` lần lượt — cùng chuỗi login trùng user khóa + user đang bật thì vào đúng tài khoản đang bật; `login_allowed` dùng `CAST(is_active AS UNSIGNED)=1`. — Files: `backend/routes/auth.js`, `backend/scripts/checkUserPassword.js`

## [16/04/2026] - OrderForm: auto chọn kho mặc định khi tạo đơn
### Fixed
- **OrderForm** — Khi vào màn tạo đơn (`/orders/new`), dropdown “Kho xuất hàng” tự động chọn kho mặc định (`warehouses.is_default=1`) ngay khi load; fallback kho active đầu tiên nếu thiếu default. — File: `src/pages/OrderForm.tsx`

## [20/04/2026] - Đa shop (multi-tenant) giai đoạn 1
### Added/Changed
- **DB** — Thêm `shops`, `user_shops`, và cột `shop_id` trên các bảng nghiệp vụ; cập nhật unique key theo shop (vd `orders(shop_id, code)`, `products(shop_id, sku)`), seed shop mặc định `Sheki (id=1)` và backfill dữ liệu cũ về shop 1. — Files: `migrations/018_multi_shop.sql`
- **Auth** — Login trả danh sách shop user được gán; JWT chứa `shop_id`; thêm `POST /auth/switch-shop`; `/auth/me` trả `shops` + `current_shop_id`. — Files: `backend/routes/auth.js`, `backend/middleware/auth.js`, `backend/middleware/requireShop.js`
- **Backend routes/services** — Áp `requireShop` và filter/insert theo `shop_id` cho các module chính (orders, products, customers, inventory, reports, returns, commissions, cash, logs, import, uploads, groups, categories, warehouses, collaborators, commission tiers, users/settings). — Files: `backend/routes/*.js`, `backend/services/*.js`
- **Frontend** — Lưu `shops` sau login, hiển thị dropdown đổi shop (gọi `/auth/switch-shop`) và clear `shops` khi logout. — Files: `src/pages/Login.tsx`, `src/components/Layout.tsx`

## [20/04/2026] - Super Admin (global) cho multi-shop
### Added/Changed
- **DB** — Thêm cột `users.is_super_admin` và seed user `superadmin` (mật khẩu dùng chung hash với admin seed). — Files: `migrations/019_super_admin.sql`, `schema.sql`
- **Auth/Middleware** — Super admin đăng nhập không cần `user_shops`, được chọn shop để thao tác; `requireShop` cho phép super admin vào mọi shop active. — Files: `backend/routes/auth.js`, `backend/middleware/auth.js`, `backend/middleware/requireShop.js`, `backend/middleware/requireSuperAdmin.js`
- **API** — Thêm `GET/POST/PUT /api/shops` và `POST /api/shops/:shopId/users` để tạo shop và gán user vào shop. — Files: `backend/routes/shops.js`, `backend/server.js`

## [20/04/2026] - Super Admin: màn hình Quản lý shop (FE)
### Added
- **UI** — Trang `/admin/shops` (menu sidebar khi `is_super_admin`): danh sách shop, thêm/sửa shop, tìm user và gán vai trò vào shop; API bổ sung `GET /api/shops/users-lookup`, `GET /api/shops/:shopId/users`. — Files: `src/pages/SuperAdminShops.tsx`, `src/App.tsx`, `src/components/Layout.tsx`, `backend/routes/shops.js`

### Changed
- **Super Admin shop** — Chỉ chỉ định quản trị viên shop (role `admin`); không gán sales/NV từ màn này; `POST /api/shops/:shopId/users` từ super admin bắt buộc `role_id` là admin. — Files: `src/pages/SuperAdminShops.tsx`, `backend/routes/shops.js`

- **Tài liệu** — `FEATURE_MULTI_SHOP.md` §2.1: nêu rõ admin shop (Sheki hay shop mới) dùng **cùng logic** `user_shops` + JWT `shop_id`; super admin chỉ tạo shop + chỉ định admin ban đầu. — File: `FEATURE_MULTI_SHOP.md`

## [20/04/2026] - Auth: chặn login khi shop tắt / hết hạn
### Changed
- **Login / switch-shop** — User thường không đăng nhập vào shop `is_active=0` hoặc quá `valid_until`; nếu cố chọn shop đó → `403` `SHOP_INACTIVE_OR_EXPIRED` hoặc `SHOP_FORBIDDEN`. `loadShopsForUser` đã lọc shop hợp lệ.
- **GET /auth/me** — Nếu JWT còn `shop_id` nhưng shop không còn trong danh sách shop hợp lệ → `403` `SHOP_SESSION_INVALID` (bắt đăng nhập lại).
- **FE** — `Layout` xử lý `SHOP_SESSION_INVALID` (xoá token, về `/login`); `Login` hiển thị lỗi theo `code`. — Files: `backend/routes/auth.js`, `src/lib/api.ts`, `src/components/Layout.tsx`, `src/pages/Login.tsx`

## [20/04/2026] - Super Admin: tạo shop + 1 hoặc nhiều tài khoản admin (mới)
### Added/Changed
- **API** — `POST /api/shops` nhận `admins: [{ full_name, username, email, password }]` (0..n); transaction tạo shop + user + `user_shops` role admin. `POST /api/shops/:shopId/admins` thêm admin cho shop đã có. — File: `backend/routes/shops.js`
- **UI** — `SuperAdminShops`: form nhiều dòng admin khi tạo shop; nút «Thêm admin» trên từng shop để tạo thêm tài khoản admin. — File: `src/pages/SuperAdminShops.tsx`

## [20/04/2026] - Super Admin login: tránh lỗi “chưa gán shop” + đổi shop toàn hệ thống
### Fixed/Changed
- **Auth** — Super admin mặc định vào shop `id=1` nếu chưa có `user_shops`; JWT luôn có `role_id` hợp lệ (fallback `users.role_id`); `/auth/me` + `/auth/switch-shop` trả `all_shops` cho super admin. — Files: `backend/routes/auth.js`
- **Middleware** — `auth` ưu tiên cờ super admin (không bị ghi đè role theo `user_shops`/users role khi vào shop không membership). — Files: `backend/middleware/auth.js`
- **Frontend** — Login xử lý `requires_shop_select`; Layout dùng `all_shops` để dropdown đổi shop khi super admin không có membership. — Files: `src/pages/Login.tsx`, `src/components/Layout.tsx`

## [15/04/2026] - OrderList gộp cột + filter theo sản phẩm
### Changed
- Danh sách đơn: thêm cột Sản phẩm (tên × số lượng), chuyển thời gian vào cột Mã đơn, gộp Ship/NV/HH thành 1 cột 3 dòng, gộp Trạng thái + Thanh toán, bỏ cột Nhóm BH (đưa vào cột Nhân viên), thêm filter theo tên/SKU sản phẩm (API + UI). - Files: `src/pages/OrderList.tsx`, `backend/routes/orders.js`

## [15/04/2026] - Menu Sales đổi tên báo cáo hoa hồng
### Changed
- Sidebar Sales: menu cha “Hoa hồng” → “Báo cáo hoa hồng”; menu con “Tổng quan hoa hồng” → “Hoa hồng bán hàng”, “Hoa hồng từ CTV” → “Hoa hồng CTV”. - Files: `src/components/Layout.tsx`

## [15/04/2026] - Admin: quản lý danh mục sản phẩm
### Added
- Thêm trang CRUD danh mục sản phẩm (thêm/sửa/ẩn) cho Admin, gắn route + menu, API categories hỗ trợ xem tất cả và ẩn danh mục. - Files: `src/pages/Categories.tsx`, `src/App.tsx`, `src/components/Layout.tsx`, `backend/routes/categories.js`

# CHANGELOG

## [15/04/2026] - Xuất Excel: đơn hàng & đơn hoàn
### Added
- **OrderList** — Thêm nút «Xuất Excel» theo bộ lọc hiện tại; file có 2 sheet: «Đơn hàng» và «Chi tiết SP» (Tên sản phẩm, Số lượng, SKU, đơn giá, CK, thành tiền). — Files: `src/pages/OrderList.tsx`, `src/lib/exportExcel.ts`, `backend/routes/orders.js`
- **SalesReturnsList** — Thêm nút «Xuất Excel» cho tab Đơn hoàn; backend trả thêm `group_name` và `salesperson_name` để export đủ thông tin. — Files: `src/pages/SalesReturnsList.tsx`, `src/lib/exportExcel.ts`, `backend/routes/returns.js`

## [15/04/2026] - Khách hàng: Địa chỉ nhà xuống hàng dưới
### Changed
- **CustomerForm** — Màn thêm/sửa khách hàng: ô «Địa chỉ nhà» nằm một hàng riêng (full width) dưới phần Tỉnh/Quận/Phường để dễ nhập trên mobile. — File: `src/pages/CustomerForm.tsx`

## [15/04/2026] - Đơn hàng: hiển thị địa chỉ giao hàng đầy đủ khi chọn khách
### Changed
- **OrderForm** — Khi chọn khách hàng (tạo mới/sửa đơn), hệ thống lấy địa chỉ khách hàng đầy đủ (số nhà + phường + quận + tỉnh) để hiển thị vào ô «Địa chỉ giao hàng»; nếu user đã sửa tay địa chỉ giao hàng thì không tự ghi đè. — File: `src/pages/OrderForm.tsx`

## [15/04/2026] - Dashboard: Top khách hàng theo doanh số
### Added
- **Dashboard** — Thêm bảng Top khách hàng mua nhiều theo doanh số (SUM `orders.subtotal`, không gồm đơn hủy), áp theo scope: Admin xem toàn bộ, Sales chỉ đơn của mình. — Files: `backend/routes/reports.js`, `src/pages/Dashboard.tsx`

## [15/04/2026] - Đơn hàng: Sales không sửa/xóa đơn đang giao & đã giao
### Changed
- **OrderList** — Với tài khoản không phải Admin: ẩn nút sửa/xóa, tắt mở form khi click dòng, và không cho chọn bulk các đơn trạng thái «Đang giao» / «Đã giao». Admin giữ nguyên.
### Fixed
- **API + OrderForm** — `PUT`/`DELETE /orders/:id` trả 403 cho user có `scope_own_data` (không phải admin) khi đơn `shipping`/`completed`; mở URL sửa trực tiếp → điều hướng về danh sách. — Files: `backend/routes/orders.js`, `src/pages/OrderList.tsx`, `src/pages/OrderForm.tsx`

## [14/04/2026] - Branding: Velocity → Sheki
### Changed
- **UI + docs** — Đổi tên hiển thị từ Velocity sang Sheki (sidebar, register, metadata, tài liệu). — Files: `src/components/Layout.tsx`, `src/pages/Register.tsx`, `src/pages/InventoryImport.tsx`, `src/pages/InventoryExport.tsx`, `metadata.json`, `CLAUDE.md`, `plan.md`, `deploy.sh`

## [14/04/2026] - Báo cáo HH: bỏ lọc role 'sales' ở báo cáo
### Changed
- **Reports** — Gỡ hardcode `roles.code='sales'` khỏi Dashboard và `/reports/salary`; báo cáo/ KPI tính theo người phát sinh đơn (`orders.salesperson_id`) và phát sinh hoa hồng (`commissions`), không phụ thuộc role. — File: `backend/routes/reports.js`

## [14/04/2026] - Báo cáo HH: tổng “Hoa hồng nhân viên” khớp KPI Tổng lương
### Fixed
- **reports/salary** — Bảng “Hoa hồng nhân viên” không còn bỏ sót NV chỉ phát sinh HH (override/adjustment) nhưng không có đơn bán trong kỳ; tổng cột “Tổng lương” trong bảng khớp KPI/Dashboard. — File: `backend/routes/reports.js`

## [14/04/2026] - Báo cáo HH: thêm cột “NV bán” ở chi tiết theo đơn
### Added
- **CommissionReport** — Bảng “Chi tiết hoa hồng theo đơn hàng” hiển thị thêm cột “NV bán” cạnh “Mã đơn”. — Files: `backend/routes/commissions.js`, `src/pages/CommissionReport.tsx`

## [14/04/2026] - Loại HH: «Điều chỉnh» → «Hoàn»
### Changed
- **CommissionReport + Excel** — Badge/ cột loại giao dịch từ điều chỉnh hoa hồng (hoàn hàng) hiển thị **Hoàn**; export thêm cột «Loại HH» (Bán hàng / HH từ CTV / Hoàn). — Files: `src/pages/CommissionReport.tsx`, `src/lib/exportExcel.ts`

## [14/04/2026] - Báo cáo HH: phân biệt tổng trang vs Tổng lương cả kỳ
### Changed
- **CommissionReport** — Footer «Chi tiết theo đơn»: làm rõ hàng đen là **chỉ cộng dòng trang hiện tại**; thêm hàng **Tổng lương cả kỳ** khớp thẻ KPI (tránh nhầm số nhỏ hơn với tổng kỳ). — File: `src/pages/CommissionReport.tsx`

## [14/04/2026] - KPI hoa hồng: một nguồn (khớp Dashboard / báo cáo / đơn)
### Fixed
- **GET /orders (tổng HH)** — Khi lọc đủ cả tháng (ngày 1 → cuối tháng) và không có search/status/NV/kho, tổng «HH bán hàng» dùng **cùng** `getCommissionMonthKpi` với báo cáo (tránh lệch nhỏ do `DATE(c.created_at)` vs `MONTH/YEAR`). — Files: `backend/services/commissionKpi.js`, `backend/routes/orders.js`
- **commissionKpi** — Gom tính HH bán (direct gross) + HH CTV (override net) theo `commissions.created_at` / `commission_adjustments`; Dashboard và `/reports/salary` dùng chung; sửa lỗi Admin Dashboard trả nhầm tổng HH theo scope sales-only; Sales Dashboard trước đó lọc theo `orders.created_at` thay vì phát sinh HH.
- **reports/salary** — Thêm `summary.kpi_direct_gross`, `kpi_override_net`, `kpi_total_hh` (tổng đủ, không cộng thiếu từ bảng NV khi NV không có đơn trong tháng nhưng vẫn có phát sinh HH).
- **CommissionReport (Admin)** — KPI thẻ lấy các `kpi_*` từ salary thay vì SUM từng dòng NV.
- **GET /orders** — KPI «Tổng hoa hồng» = tổng direct gross theo ngày phát sinh HH (cùng quy tắc báo cáo khi cùng khoảng ngày). — Files: `backend/services/commissionKpi.js`, `backend/routes/reports.js`, `backend/routes/orders.js`, `src/pages/CommissionReport.tsx`, `src/pages/OrderList.tsx`

## [13/04/2026] - Báo cáo hoa hồng: KPI hoàn lọc theo nhóm
### Fixed
- **Reports/returns-summary** — “Tổng doanh số hoàn” và “Tổng HH hoàn” lọc theo `group_id` (khi chọn nhóm) để khớp bộ lọc báo cáo hoa hồng; fix lỗi SQL ambiguous column khi JOIN `orders` khiến KPI hoàn rơi về 0. — Files: `backend/routes/reports.js`
### Changed
- **Reports/Dashboard + Reports/returns-summary** — Gom logic tính KPI hoàn (doanh số hoàn / số đơn hoàn / HH hoàn) dùng chung để tránh lệch giữa Dashboard và Báo cáo hoa hồng; các màn chỉ khác phần filter. — Files: `backend/services/returnMetrics.js`, `backend/routes/reports.js`
- **Rule KPI HH hoàn** — “Tổng HH hoàn” chỉ tính phần hoa hồng **direct** của sales lên đơn (không cộng phần HH từ CTV/override) để tránh trùng với báo cáo CTV. — Files: `backend/services/returnMetrics.js`, `backend/routes/commissions.js`, `backend/routes/reports.js`
### Fixed
- **Báo cáo HH từ CTV** — “Số đơn” không cộng đơn hoàn (adjustment); chỉ đếm đơn bán (commission) để tránh hiểu nhầm “đơn hoàn là +1 đơn”. Hoa hồng override vẫn tự trừ bằng amount âm. — Files: `backend/routes/collaborators.js`, `backend/routes/users.js`
### Fixed
- **reports/commissions/ctv** — Lọc theo nhóm (`group_id`) hoạt động đúng cho tổng hợp (không còn “lọt” hoa hồng ngoài nhóm do SUM trên transactions không bị ràng buộc). — Files: `backend/routes/collaborators.js`, `backend/routes/users.js`

## [13/04/2026] - Đơn hoàn: thêm filter theo nhóm
### Added
- **Returns list** — Màn `/returns` hỗ trợ lọc theo `group_id` (Nhóm BH) giống các màn danh sách khác; backend lọc theo `orders.group_id`. — Files: `backend/routes/returns.js`, `src/pages/SalesReturnsList.tsx`

## [13/04/2026] - Đơn hoàn: xóa đơn hoàn (rollback kho + hoa hồng)
### Added
- **Returns list (Admin)** — Thêm nút “Xóa” cho đơn hoàn; khi xóa sẽ rollback kho (trừ ngược stock_qty), xóa các bút toán `commission_adjustments` (direct/override) theo `return_id`, và đưa `return_requests` về `pending` nếu đơn hoàn được tạo từ request. — Files: `backend/routes/returns.js`, `src/pages/SalesReturnsList.tsx`

## [13/04/2026] - HH từ CTV: đồng bộ net (trừ hoàn) giữa các màn
### Fixed
- **Dashboard + Hoa hồng của tôi** — KPI “HH từ CTV” giờ = hoa hồng override (commissions) + adjustment override (âm) theo kỳ phát sinh, để khớp màn “Hoa hồng từ CTV”. — Files: `backend/routes/reports.js`, `backend/routes/commissions.js`

## [13/04/2026] - Hoa hồng: làm rõ tổng theo trang vs cả kỳ
### Changed
- **CommissionReport** — Footer bảng “Chi tiết hoa hồng theo đơn” đổi nhãn tổng sang “Tổng (trang X)” để tránh hiểu nhầm với KPI “Tổng lương (cả kỳ lọc)”. — File: `src/pages/CommissionReport.tsx`

## [13/04/2026] - Hoa hồng: Ship/NV hiển thị đúng khi có hoàn
### Fixed
- **Commissions/orders** — Nếu 1 đơn có cả dòng commission và dòng hoàn (adjustment), đảm bảo dòng commission được xếp trước để “Ship KH Trả” và “NV chịu” không bị mất do logic hiển thị 1 lần/đơn. — File: `backend/routes/commissions.js`

## [13/04/2026] - Hoa hồng: dòng Hoàn không hiển thị Ship/NV
### Changed
- **CommissionReport UI** — Với dòng `Hoàn` (adjustment), 2 cột “Ship KH Trả” và “NV chịu” hiển thị “—” để tránh hiểu nhầm là thiếu dữ liệu; ship/NV chỉ gắn với dòng bán (commission). — File: `src/pages/CommissionReport.tsx`

## [13/04/2026] - Admin: Hoa hồng nhân viên tính HH hoàn đúng người bán
### Fixed
- **Reports/Salary** — `direct_adjustment` (HH hoàn) chỉ cộng khi `commission_adjustments.user_id = orders.salesperson_id` để tránh gán nhầm HH hoàn direct cho người không phải sales lên đơn. — File: `backend/routes/reports.js`

## [13/04/2026] - Admin: Tổng Ship KH Trả / NV chịu loại đơn hủy
### Fixed
- **Reports/Salary** — `total_khach_ship` và `total_nv_chiu` chỉ tính trên đơn không hủy (`status != 'cancelled'`) để tổng khớp nghiệp vụ & Dashboard. — File: `backend/routes/reports.js`

## [13/04/2026] - Admin: Tổng lương khớp chi tiết (lọc kỳ theo dòng HH)
### Fixed
- **Reports/Salary** — Hoa hồng direct/override lọc theo `commissions.created_at` (thời điểm phát sinh dòng HH) thay vì `orders.created_at`, để tổng lương trên bảng nhân viên khớp màn chi tiết theo đơn (lọc theo entry_date). — File: `backend/routes/reports.js`

## [13/04/2026] - Admin: KPI trên báo cáo hoa hồng khớp bảng nhân viên
### Fixed
- **CommissionReport (Admin)** — Các KPI Ship KH Trả / NV chịu / Tổng lương (và HH) lấy tổng từ bảng “Hoa hồng nhân viên” để không lệch với hàng “Tổng cộng”. — File: `src/pages/CommissionReport.tsx`

## [13/04/2026] - Dashboard Admin: Ship/NV/Tổng lương khớp báo cáo
### Fixed
- **Reports/Dashboard** — KPI Ship KH Trả / NV chịu / Tổng lương (Admin) tính theo phạm vi nhân viên sales đang hoạt động và HH override net (trừ hoàn), để đồng bộ với báo cáo hoa hồng nhân viên. — File: `backend/routes/reports.js`

## [13/04/2026] - Dashboard Admin: Tổng hoa hồng + Top hoa hồng đúng kỳ
### Fixed
- **Reports/Dashboard** — “Tổng hoa hồng tháng” (direct gross + override net) và “Top hoa hồng” lọc theo `commissions.created_at` (kỳ phát sinh dòng HH), override net cộng adjustment override (âm) để trừ hoàn; sắp xếp top theo tổng hoa hồng thay vì doanh thu. — File: `backend/routes/reports.js`
### Changed
- **Reports/Dashboard** — Đồng bộ scope KPI “HH bán hàng / HH từ CTV / Tổng HH” (Admin) theo đúng báo cáo hoa hồng nhân viên (sales active) để Dashboard không lệch báo cáo; vẫn giữ override net (trừ hoàn). — File: `backend/routes/reports.js`

## [13/04/2026] - Báo cáo hoa hồng Admin: HH bán hàng không trừ hoàn
### Fixed
- **CommissionReport (Admin)** — KPI và bảng “Hoa hồng nhân viên”: cột “HH bán hàng” dùng `direct_commission` (gross), không dùng `total_commission` (net đã trừ HH hoàn). HH hoàn hiển thị ở KPI riêng. — File: `src/pages/CommissionReport.tsx`
### Fixed
- **Reports/Salary** — Bổ sung field `direct_commission` (gross) và `direct_adjustment` để FE hiển thị “HH bán hàng” đúng, tránh bị 0 do thiếu field. — File: `backend/routes/reports.js`
### Fixed
- **Reports/Salary** — Điều kiện “có dữ liệu” theo kỳ đổi sang `total_orders > 0` (đơn bán), tránh rớt sales có đơn nhưng doanh số net = 0 làm KPI “Số đơn hàng” lệch so với Dashboard/Doanh thu. — File: `backend/routes/reports.js`

## [13/04/2026] - Hoa hồng: KPI Số đơn hàng chỉ tính đơn bán
### Changed
- **CommissionReport** — KPI “Số đơn hàng” chỉ tính đơn bán (commission), không cộng đơn hoàn. KPI hoàn vẫn hiển thị riêng ở “Tổng đơn hoàn”. — File: `src/pages/CommissionReport.tsx`
### Fixed
- **Reports/Salary + CommissionReport (Admin)** — KPI “Số đơn hàng” (Admin) lấy theo COUNT orders (không hủy) để khớp Dashboard/Doanh thu, không bị rớt do filter theo user active/role trong salaryData. — Files: `backend/routes/reports.js`, `src/pages/CommissionReport.tsx`

## [13/04/2026] - Tài liệu: chuẩn hóa quy ước KPI hoa hồng
### Changed
- **Docs** — Bổ sung “Quy ước KPI báo cáo” (Số đơn hàng chỉ đơn bán, direct gross, HH hoàn tách KPI riêng, override net, tổng HH, ship/NV) để tránh sửa lệch giữa Dashboard/Báo cáo. — Files: `CLAUDE.md`, `LOGIC_BUSINESS.md`

## [13/04/2026] - Admin: tab “Hoa hồng nhân viên” trống
### Fixed
- **Reports/Salary** — Fix lỗi runtime do biến `ordersExistsCond` chưa khai báo làm API `/reports/salary` không trả dữ liệu → tab “Hoa hồng nhân viên” rỗng — Files: `backend/routes/reports.js`
- **Frontend** — Làm ổn định nhận diện Admin (fallback role_name/chuỗi) và đồng bộ user state trong `CommissionReport` để UI không bị lệch quyền sau refresh `/auth/me` — Files: `src/lib/utils.ts`, `src/pages/CommissionReport.tsx`

## [13/04/2026] - Hoàn hàng: gỡ màn Admin `/returns/admin`
### Removed
- **AdminReturns (FE)** — Gỡ route/menu/page `/returns/admin` (thừa), giữ màn `/returns` — Files: `src/App.tsx`, `src/components/Layout.tsx`, `src/pages/AdminReturns.tsx` (deleted)

## [13/04/2026] - Hoàn hàng: Admin thao tác trong `/returns`
### Added
- **SalesReturnsList** — Với Admin: thêm tab “Yêu cầu hoàn” (tạo yêu cầu + duyệt/từ chối); Sales vẫn chỉ xem tab “Đơn hoàn” — File: `src/pages/SalesReturnsList.tsx`

## [13/04/2026] - Sales: thấy đúng menu/màn Đơn hoàn (sync user permissions)
### Fixed
- **Layout** — Đồng bộ `currentUser` từ localStorage + refresh `/auth/me` để tránh nhận nhầm role/permission khiến Sales không thấy mục “Đơn hoàn” — File: `src/components/Layout.tsx`

## [13/04/2026] - Sidebar: luôn có link Đơn hoàn
### Fixed
- **Layout** — Thêm mục “Đơn hoàn” vào submenu Bán hàng của Admin để đảm bảo luôn truy cập được `/returns` — File: `src/components/Layout.tsx`

## [13/04/2026] - Doanh số: coi hoàn hàng như “đơn âm”
### Changed
- **Reports** — Dashboard/Salary trừ doanh số theo tháng bằng \(doanh số bán − giá trị hoàn\) (giá trị hoàn tính realtime từ `return_items` + `order_items`, không sửa schema) — File: `backend/routes/reports.js`

## [13/04/2026] - Dashboard: giữ doanh thu bán + thêm KPI hoàn
### Changed
- **Reports/Dashboard** — Dashboard hiển thị doanh thu bán hàng (gross subtotal); thêm KPI Tổng doanh số hoàn + Tổng HH hoàn theo cùng kỳ (tháng/hôm nay) — Files: `backend/routes/reports.js`, `src/pages/Dashboard.tsx`

## [13/04/2026] - Dashboard: thêm KPI Tổng đơn hoàn + HH bán hàng không gồm CTV
### Changed
- **Reports/Dashboard** — Thêm KPI Tổng đơn hoàn (tháng/hôm nay). KPI “HH bán hàng” (Sales view) vẫn chỉ tính `commissions.type='direct'` (không gồm CTV/override), hoàn tách KPI riêng — Files: `backend/routes/reports.js`, `src/pages/Dashboard.tsx`

## [13/04/2026] - Dashboard: HH từ CTV trừ đơn hoàn
### Fixed
- **Reports/Dashboard** — KPI “HH từ CTV” (override) giờ cộng thêm `commission_adjustments` type `override` (âm) để trừ hoàn; “HH bán hàng” (direct) giữ gross — File: `backend/routes/reports.js`

## [13/04/2026] - Dashboard: hiển thị HH hoàn đúng dấu âm
### Fixed
- **Dashboard UI** — KPI “Tổng HH hoàn” luôn hiển thị số âm theo trị tuyệt đối (tránh lệch dấu khi dữ liệu/aggregate thay đổi) — File: `src/pages/Dashboard.tsx`

## [13/04/2026] - Hoa hồng của tôi: thêm KPI hoàn như Dashboard
### Added
- **CommissionReport** — Thêm 3 KPI: Tổng doanh số hoàn / Tổng HH hoàn / Tổng đơn hoàn theo bộ lọc (tháng/năm/nhóm/NV) — File: `src/pages/CommissionReport.tsx`
### Added
- **Reports** — Thêm API `GET /reports/returns-summary` để trả số liệu hoàn theo kỳ lọc — File: `backend/routes/reports.js`

## [13/04/2026] - Hoa hồng của tôi: tổng số đơn gồm đơn hoàn
### Fixed
- **CommissionReport** — KPI “Số đơn hàng” giờ = đơn bán (từ `/commissions/orders`) + đơn hoàn (từ `/reports/returns-summary`) — Files: `backend/routes/commissions.js`, `src/pages/CommissionReport.tsx`

## [13/04/2026] - Hoa hồng của tôi: HH bán hàng khớp Dashboard
### Fixed
- **API commissions/orders** — KPI “HH bán hàng” (direct) giờ là gross (chỉ `commissions`, không trừ hoàn); “HH từ CTV” (override) vẫn net (có trừ adjustment) — File: `backend/routes/commissions.js`

## [13/04/2026] - Hoa hồng: Tổng lương trừ HH hoàn (UI + Excel)
### Fixed
- **Commissions/Export** — Công thức Tổng lương cập nhật: Tổng HH + Ship KH Trả − tiền NV chịu − Tổng HH hoàn — Files: `backend/routes/commissions.js`, `src/pages/CommissionReport.tsx`, `src/lib/exportExcel.ts`

## [13/04/2026] - Dashboard: Tổng lương khớp “Hoa hồng của tôi”
### Fixed
- **Reports/Dashboard** — Đồng bộ công thức lương tháng: Tổng HH (gross) + Ship KH Trả − NV chịu − HH hoàn (abs) — File: `backend/routes/reports.js`

## [13/04/2026] - Fix Tổng lương: Tổng HH gross, HH hoàn tách riêng
### Fixed
- **Dashboard + Hoa hồng của tôi** — Chuẩn hóa:
  - Tổng HH = HH bán hàng + HH từ CTV (gross, chỉ lấy từ `commissions`)
  - Tổng lương = Tổng HH − Tổng HH hoàn + Ship KH Trả − NV chịu (HH hoàn lấy từ `commission_adjustments`)
  - Không “trộn” adjustment vào KPI HH từ CTV nữa; adjustment chỉ dùng cho KPI HH hoàn và công thức lương — Files: `backend/routes/reports.js`, `backend/routes/commissions.js`

## [13/04/2026] - Báo cáo doanh thu (Admin): tính đúng subtotal + trừ hoàn + trừ HH hoàn
### Fixed
- **Reports/Salary** — `total_sales` dùng `orders.subtotal` (không dùng `total_amount`), loại `cancelled`; hoa hồng cộng thêm `commission_adjustments` (âm) theo kỳ để trừ đơn hoàn đúng — File: `backend/routes/reports.js`

## [13/04/2026] - Báo cáo doanh thu (Admin): hiển thị gross như Dashboard
### Fixed
- **RevenueReport** — Đổi sang API `/reports/revenue` để hiển thị doanh thu bán (gross) và hoa hồng gross như Dashboard; hoàn tách riêng (không trừ vào gross) — Files: `backend/routes/reports.js`, `src/pages/RevenueReport.tsx`
### Fixed
- **Reports/Revenue** — Không giới hạn theo role/active để tránh lệch doanh thu giữa Dashboard và báo cáo khi đơn gắn salesperson không thuộc role sales hoặc đã inactive — File: `backend/routes/reports.js`
### Fixed
- **Reports/Revenue** — `summary.totalCommission` giờ SUM trực tiếp từ `commissions` theo kỳ (khớp Dashboard), không phụ thuộc nhân viên có/không có doanh số trực tiếp — File: `backend/routes/reports.js`

## [13/04/2026] - Báo cáo doanh thu (Admin): bỏ KPI Tổng hoa hồng
### Removed
- **RevenueReport** — Gỡ thẻ KPI “Tổng hoa hồng” theo yêu cầu — File: `src/pages/RevenueReport.tsx`

## [13/04/2026] - Đơn hoàn (Sales): KPI tổng doanh số hoàn + tổng hoa hồng hoàn
### Added
- **SalesReturnsList** — Thêm 2 KPI và hiển thị “Doanh số hoàn / HH hoàn” dạng số âm theo từng đơn; backend `/returns` trả thêm `return_amount` (tính từ đơn gốc theo item hoàn) và `commission_return_amount` — Files: `src/pages/SalesReturnsList.tsx`, `backend/routes/returns.js`

## [13/04/2026] - Đơn hoàn (Sales): KPI Tổng số đơn hoàn
### Added
- **SalesReturnsList** — Thêm KPI “Tổng số đơn hoàn” theo bộ lọc hiện tại (dựa trên `total` từ API) — File: `src/pages/SalesReturnsList.tsx`

## [13/04/2026] - Đơn hoàn (Sales): tổng HH hoàn khớp “Hoa hồng của tôi”
### Fixed
- **GET /api/returns** — Sales chỉ SUM `commission_adjustments` theo `user_id` (không cộng phần của quản lý/CTV) để KPI “Tổng hoa hồng hoàn” không bị lệch — File: `backend/routes/returns.js`

## [13/04/2026] - Đơn hoàn (Sales): include đơn hoàn trừ HH quản lý
### Fixed
- **GET /api/returns** — Sales (quản lý) thấy thêm các đơn hoàn có `commission_adjustments.return_id` trừ vào chính mình, để tổng HH hoàn khớp “Hoa hồng của tôi” — File: `backend/routes/returns.js`

## [13/04/2026] - Đơn hoàn (Sales): không trộn đơn người khác
### Fixed
- **GET /api/returns** — Revert: Sales chỉ thấy đơn hoàn của đơn mình bán; không “dồn” đơn hoàn người khác vào danh sách — File: `backend/routes/returns.js`

## [13/04/2026] - Đơn hoàn (Sales): filter giống quản lý đơn hàng
### Added
- **SalesReturnsList** — Filter search + preset ngày + khoảng ngày + phân trang sync URL — File: `src/pages/SalesReturnsList.tsx`
### Changed
- **GET /api/returns** — Hỗ trợ `q`, `date_from`, `date_to`, `page/limit` — File: `backend/routes/returns.js`

## [13/04/2026] - Quản lý đơn hàng: KPI Tổng doanh thu + Tổng hoa hồng
### Added
- **OrderList** — Thêm 2 KPI theo bộ lọc hiện tại: Tổng doanh thu (subtotal) và Tổng hoa hồng (direct) — File: `src/pages/OrderList.tsx`
### Changed
- **GET /api/orders** — Trả thêm `summary.total_revenue` và `summary.total_commission` theo bộ lọc — File: `backend/routes/orders.js`

## [13/04/2026] - Đơn hàng của tôi: KPI Tổng đơn hàng
### Added
- **OrderList** — Thêm KPI “Tổng đơn hàng” (không gồm đơn hủy) theo bộ lọc hiện tại — File: `src/pages/OrderList.tsx`
### Changed
- **GET /api/orders** — Trả thêm `summary.total_orders` theo bộ lọc — File: `backend/routes/orders.js`

## [13/04/2026] - Hoàn hàng: trừ đúng “HH từ CTV” (override) trên Dashboard/Báo cáo HH
### Fixed
- **Dashboard/Commission Orders API** — KPI “HH từ CTV” giờ tính cả `commission_adjustments` (âm) khi duyệt hoàn; lọc kỳ theo thời điểm phát sinh dòng hoa hồng/điều chỉnh (`created_at` của commission/adjustment) — Files: `backend/routes/reports.js`, `backend/routes/commissions.js`

## [13/04/2026] - Hoa hồng: “Số đơn” tính cả đơn hoàn
### Changed
- **CommissionReport / API** — “Số đơn hàng” giờ đếm theo số dòng phát sinh hoa hồng (đơn bán + đơn hoàn), tức tính cả `commissions` và `commission_adjustments` theo kỳ lọc — File: `backend/routes/commissions.js`

## [13/04/2026] - Báo cáo HH từ CTV: “Số đơn” tính cả đơn hoàn
### Fixed
- **CTV report** — `/reports/commissions/ctv` giờ đếm “Số đơn từ CTV” theo số giao dịch hoa hồng (commission + adjustment), nên đơn hoàn cũng +1; đồng thời lọc kỳ theo thời điểm phát sinh dòng HH/điều chỉnh — File: `backend/routes/collaborators.js`

## [13/04/2026] - Báo cáo HH từ CTV: hiển thị đủ dòng đơn hoàn
### Fixed
- **UI** — Bảng chi tiết `/reports/commissions/ctv` không còn bị “mất” dòng hoàn do trùng React key theo `order_id` (đơn bán + đơn hoàn cùng order_id). API trả thêm `tx_id` để key unique — Files: `backend/routes/collaborators.js`, `src/pages/CollaboratorsCommissionsReport.tsx`

## [13/04/2026] - Hoa hồng từ CTV (màn Sales): tính & hiển thị đơn hoàn
### Fixed
- **User CTV report** — `GET /users/:id/collaborators/commissions` giờ tính cả `commission_adjustments` (đơn hoàn) và trả thêm `tx_id/entry_kind` để UI không bị mất dòng do trùng `order_id` — Files: `backend/routes/users.js`, `src/pages/CollaboratorsCommissionReport.tsx`

## [13/04/2026] - Hoa hồng từ CTV: dòng hoàn màu đỏ + tỷ lệ đúng
### Fixed
- **UI/Reports** — Dòng hoàn (`entry_kind='adjustment'`) hiển thị badge “Hoàn” + số tiền màu đỏ; cột “Tỷ lệ” của dòng hoàn lấy `override_rate` từ đơn gốc (không còn hiện “Nhiều mức”) — Files: `backend/routes/users.js`, `backend/routes/collaborators.js`, `src/pages/CollaboratorsCommissionReport.tsx`, `src/pages/CollaboratorsCommissionsReport.tsx`

## [13/04/2026] - Hoa hồng từ CTV: đơn hoàn lấy đúng rate theo sản phẩm hoàn
### Fixed
- **Reports** — Với dòng hoàn (adjustment), `override_rate` được tính từ sản phẩm bị hoàn (join `return_items` + `order_items` + `commission_tiers`); nếu hoàn nhiều sản phẩm khác tier sẽ trả `NULL` và UI hiện “Nhiều mức” — Files: `backend/routes/users.js`, `backend/routes/collaborators.js`

## [13/04/2026] - Hoàn hàng: trừ hoa hồng đúng theo tier từng sản phẩm
### Fixed
- **Approve return** — Khi duyệt hoàn, `commission_adjustments` không còn trừ theo tỷ lệ \(giá trị hoàn / giá trị đơn\). Thay vào đó trừ theo từng sản phẩm hoàn: direct dùng `order_items.commission_rate`, override tra tier theo `commission_tiers` từ `order_items.commission_rate` (ctv_rate) — File: `backend/routes/returns.js`

## [13/04/2026] - Quy tắc hoàn/trả hàng: chỉ điều chỉnh hoa hồng (không đụng Ship/NV chịu)
### Changed
- **LOGIC_BUSINESS** — Bổ sung quy tắc Return: khi duyệt hoàn chỉ tạo `commission_adjustments` (âm) để trừ hoa hồng theo tỷ lệ item hoàn; không tự động chỉnh `shipping_fee/ship_payer`, `deposit/customer_collect/shop_collect/total_amount`, và `salesperson_absorbed_amount` — File: `LOGIC_BUSINESS.md`

## [13/04/2026] - Lịch sử nhập xuất: popup lọc thời gian hiển thị đúng (portal + fixed)
### Fixed
- **InventoryHistory** — Popup lọc ngày render qua `createPortal` → `document.body`, `position: fixed` + `z-index: 200`, căn theo nút + cập nhật khi scroll/resize; đóng khi bấm ngoài (kèm `touchstart`) — tránh bị thanh header `z-40` hoặc stacking context che — File: `src/pages/InventoryHistory.tsx`

## [13/04/2026] - Lịch sử nhập xuất: popup lọc thời gian gọn hơn
### Changed
- **InventoryHistory** — Thu nhỏ panel lọc (max ~260px, `p-3`, một cột, nút/ô `text-xs`) — File: `src/pages/InventoryHistory.tsx`
- **GregorianDateSelect** — `stacked`: khoảng cách dọc `gap-1` — File: `src/components/GregorianDateSelect.tsx`

## [13/04/2026] - Lịch sử nhập xuất: popup lọc thời gian không tràn màn hình
### Fixed
- **InventoryHistory** — Popover lọc ngày căn giữa theo nút trên mobile, `max-w` theo viewport; hàng filter `flex-wrap` + `min-w-0`; chọn ngày dạng xếp dọc (`stacked`) + tháng dạng số — File: `src/pages/InventoryHistory.tsx`
- **GregorianDateSelect** — Thêm `stacked`, `monthNumericOptions`, wrapper `min-w-0 max-w-full` — File: `src/components/GregorianDateSelect.tsx`

## [13/04/2026] - CustomerForm: bỏ gợi ý dài dưới Ngày sinh
### Changed
- **CustomerForm** — Xóa đoạn mô tả Phật lịch/popup dưới ô ngày sinh — File: `src/pages/CustomerForm.tsx`

## [13/04/2026] - CustomerForm: Hooks + GET /users cho Sales (403)
### Fixed
- **CustomerForm** — Di chuyển `birthYearOptions` / `maxBirthDay` `useMemo` lên trước `if (fetchLoading) return` — File: `src/pages/CustomerForm.tsx`
- **`backend/routes/users.js`** — `GET /api/users`: cho phép `scope_own_data` (Sales); ép `scoped` khi không phải admin — File: `backend/routes/users.js`

## [13/04/2026] - Thêm KH: kiểm tra user tồn tại (created_by) + script SQL verify bảng customers
### Added
- **`migrations/017_customers_verify_optional.sql`** — SHOW COLUMNS / FK (đối chiếu khi DB cũ thiếu cột)
### Fixed
- **`backend/routes/customers.js`** — POST: nếu `req.user.id` không còn trong `users` → 401 + hướng dẫn đăng nhập lại

## [13/04/2026] - Thêm/sửa KH: chuẩn hóa NV phụ trách (FK) + lỗi API rõ ràng
### Fixed
- **`backend/routes/customers.js`** — `assigned_employee_id` chỉ lưu khi tồn tại trong `users` (tránh lỗi khóa ngoại khi id không hợp lệ); `email`/`source` rỗng → `null`
- **CustomerForm** — `assigned_employee_id` parse an toàn; `email`/`note` gửi null khi trống; thông báo khi `Failed to fetch` (backend chưa chạy) — File: `src/pages/CustomerForm.tsx`

## [13/04/2026] - Vite: host 0.0.0.0 + HMR tùy chọn IP LAN (VITE_DEV_HMR_HOST)
### Changed
- **`vite.config.ts`** — `server.host: '0.0.0.0'`, `strictPort`; HMR qua `VITE_DEV_HMR_HOST` khi mở bằng IP Wi‑Fi — File: `vite.config.ts`
- **`.env.example`** — Gợi ý biến `VITE_DEV_HMR_HOST`

## [13/04/2026] - Form KH: ngày sinh 3 dropdown (tránh popup Phật lịch 2569 BE)
### Changed
- **CustomerForm** — Bỏ `input type="date"` (một số WebView/Android hiển thị lịch Phật lịch / năm BE như 2569). Thay bằng chọn **Ngày / Tháng / Năm** dương lịch; gửi API `yyyy-mm-dd` hoặc null — File: `src/pages/CustomerForm.tsx`

## [13/04/2026] - Form KH: ngày sinh chọn lịch; NV phụ trách = người thêm; nguồn mặc định Zalo
### Changed
- **CustomerForm** — `input type="date"` (chọn ngày), gửi `yyyy-mm-dd` hoặc null; thêm mới: `assigned_employee_id` = user hiện tại, `source` = `zalo`; dropdown NV luôn gồm user hiện tại nếu thiếu trong API; nguồn có option Zalo — File: `src/pages/CustomerForm.tsx`
- **`schema.sql`** — Comment cột `customers.source` thêm `zalo`

## [13/04/2026] - Khách hàng: ngày sinh dd/mm/yyyy; rỗng → NULL (fix lỗi MySQL birthday)
### Added
- **`backend/utils/customerBirthday.js`** — `normalizeCustomerBirthday`: `''` / không hợp lệ → `null`; nhận `yyyy-mm-dd` hoặc `dd/mm/yyyy`
### Fixed
- **`backend/routes/customers.js`** — INSERT/UPDATE dùng `normalizeCustomerBirthday` thay vì gửi `''` vào cột DATE
- **`backend/routes/import.js`** — Import khách: birthday qua cùng helper
- **CustomerForm** — Ô ngày sinh `type="text"` placeholder `dd/mm/yyyy`, load từ API hiển thị đúng format, submit gửi `yyyy-mm-dd` hoặc `null` — File: `src/pages/CustomerForm.tsx`

## [13/04/2026] - CommissionReport: lọc + Xuất Excel một hàng (flex-nowrap, scroll ngang khi cần)
### Changed
- **CommissionReport** — Khối lọc dùng `flex-nowrap` + `overflow-x-auto`; select/nút `shrink-0` — File: `src/pages/CommissionReport.tsx`

## [13/04/2026] - Fix tràn ngang: Layout min-w-0 + CommissionReport KPI/bảng/lọc
### Fixed
- **`Layout.tsx`** — `main` và khung nội dung trang thêm `min-w-0` để flex không kéo chiều ngang toàn trang khi bảng/chữ dài — File: `src/components/Layout.tsx`
- **CommissionReport** — Header mô tả `break-words`; hàng lọc full width trên mobile (`w-full sm:w-auto`); lưới KPI `[&>*]:min-w-0` + `break-words`/`tabular-nums` số tiền; khối `overflow-x-auto` bọc bảng thêm `min-w-0`, bảng `min-w-[640px]`/`min-w-[720px]` để cuộn ngang **trong** khối — File: `src/pages/CommissionReport.tsx`

## [13/04/2026] - CommissionReport: KPI dùng đúng bố cục Dashboard (bỏ commission-kpi-*)
### Changed
- **CommissionReport** — Hai lưới KPI copy cùng class Tailwind với `Dashboard.tsx` (Sales): `grid grid-cols-2 lg:grid-cols-4 gap-4`, `grid grid-cols-2 lg:grid-cols-3 gap-4`, `col-span-2 lg:col-span-1` cho Tổng lương; dòng phụ Ship/NV giống Dashboard (Sales vs Admin) — File: `src/pages/CommissionReport.tsx`
### Removed
- **`index.css`** — Xóa toàn bộ `@layer` `.commission-kpi-grid-*` / `.commission-kpi-span-2` (không còn dùng; tránh lệch với Dashboard)

## [13/04/2026] - CommissionReport KPI: cùng kích thước thẻ với Dashboard (bỏ ép nhỏ mobile)
### Changed
- **`index.css`** — Bỏ `@media (max-width: 1023px)` thu nhỏ `.commission-kpi-card` / `.kpi-*` (trước đó làm ô «HH bán hàng» nhỏ hơn Dashboard). Giữ lưới `commission-kpi-grid-*` + `gap: 1rem` như `gap-4` trên Dashboard — File: `src/index.css`

## [13/04/2026] - CommissionReport: KPI gắn class commission-kpi-* (khớp index.css WebView + compact)
### Fixed
- **CommissionReport** — Khối 7 KPI dùng `commission-kpi-grid-4` / `commission-kpi-grid-3`, `commission-kpi-card`, `kpi-icon` / `kpi-label` / `kpi-value` / `kpi-sub`; ô Tổng lương `commission-kpi-span-2`; phụ đề mobile «HH + Ship − NV», desktop giữ câu đầy đủ — File: `src/pages/CommissionReport.tsx`

## [13/04/2026] - Hoa hồng của tôi: KPI trùng markup Dashboard (bỏ lưới CSS riêng)
### Changed
- **CommissionReport** — Khối 7 KPI dùng **cùng class** với `Dashboard.tsx` (Sales): `grid grid-cols-2 lg:grid-cols-4 gap-4` + hàng Ship/NV/Lương `grid-cols-2 lg:grid-cols-3`, `p-5`, `text-xl`, `col-span-2 lg:col-span-1` cho Tổng lương; header/lọc trả về layout chuẩn — File: `src/pages/CommissionReport.tsx`
### Removed
- **`index.css`** — Xóa `.commission-kpi-grid-*` (không còn dùng)

## [13/04/2026] - Hoa hồng của tôi: KPI ép lưới CSS + gọn mobile (thấy đủ 7 ô như Dashboard)
### Added
- **`index.css`** — `.commission-kpi-grid-4` / `.commission-kpi-grid-3` / `.commission-kpi-span-2` dùng `grid-template-columns` tường minh (tránh WebView bỏ `grid-cols-2`)
### Changed
- **CommissionReport** — Mobile: padding/chữ/icon nhỏ hơn (`p-2.5`, `text-sm`/`text-[10px]`), `space-y-3`, header Sales gọn (ẩn mô tả, lọc 2 cột, nút Excel full width); dòng phụ Ship/NV rút gọn — File: `src/pages/CommissionReport.tsx`

## [13/04/2026] - Hoa hồng của tôi: KPI trùng class Dashboard (gap-4, p-5, text-xl, icon)
### Changed
- **CommissionReport** — 7 ô KPI dùng cùng lưới/spacing/typography như Dashboard Sales: `gap-4`, `p-5`, `text-xl`; HH bán = `TrendingUp`; Tổng HH = `DollarSign`; Ship/NV dòng phụ «Đơn bạn phụ trách — tháng này» (Sales) — File: `src/pages/CommissionReport.tsx`

## [13/04/2026] - CommissionReport: bỏ overflow-x-hidden root; đồng bộ wrapper với màn HH CTV
### Changed
- **CommissionReport** — Root chỉ còn `min-w-0 max-w-full` (bỏ `overflow-x-hidden` để tránh khác hành vi cuộn với bảng). **CollaboratorsCommissionReport** + **CollaboratorsCommissionsReport** — thêm `min-w-0 max-w-full` cho đồng bộ — Files: `src/pages/CommissionReport.tsx`, `CollaboratorsCommissionReport.tsx`, `CollaboratorsCommissionsReport.tsx`

## [13/04/2026] - Hoa hồng của tôi: KPI gọn như Dashboard, không tràn ngang
### Changed
- **CommissionReport** — Trang Sales: `min-w-0` / `overflow-x-hidden`, lưới KPI `gap-3 sm:gap-4`, `p-4 sm:p-5`, `space-y-6` giữa 2 hàng; ô «HH từ CTV» giống Dashboard (tím + «Tổng HH»); Ship/NV ghi chú «Đơn bạn phụ trách»; số tiền `text-lg sm:text-xl` — File: `src/pages/CommissionReport.tsx`

## [13/04/2026] - CommissionReport: KPI 2 hàng như Dashboard (không còn 1 hàng 7 ô)
### Changed
- **CommissionReport** — Hàng 1: HH bán / HH CTV / Tổng HH / Số đơn (`grid-cols-2 lg:grid-cols-4`); Hàng 2: Ship KH Trả / NV chịu / Tổng lương (`grid-cols-2 lg:grid-cols-3`, Tổng lương full width mobile) — giống bố cục Dashboard — File: `src/pages/CommissionReport.tsx`

## [13/04/2026] - Hoa hồng CTV (trang riêng): KPI mobile 2 cột
### Changed
- **CollaboratorsCommissionsReport**, **CollaboratorsCommissionReport** — 3 thẻ KPI: `grid-cols-2 lg:grid-cols-3`, ô thứ 3 full width mobile — Files: `src/pages/CollaboratorsCommissionsReport.tsx`, `src/pages/CollaboratorsCommissionReport.tsx`

## [13/04/2026] - Dashboard mobile: lưới Ship / NV / Tổng lương giống hàng KPI
### Changed
- **Dashboard** — Khối Ship KH Trả, Tiền NV chịu, Tổng lương: `grid-cols-2` trên mobile (như Doanh thu / HH / Đơn); `lg:grid-cols-3`; ô Tổng lương `col-span-2` trên mobile — Files: `src/pages/Dashboard.tsx`

## [13/04/2026] - Dashboard: doanh thu = tổng tạm tính bán hàng (subtotal)
### Changed
- **GET /api/reports/dashboard** — Doanh thu tháng/trước/hôm nay, Top NV, và % so tháng trước dùng `SUM(orders.subtotal)` (tổng tiền bán sau CK dòng), không dùng `total_amount` (thu khách); không cộng đơn `cancelled`. Đơn gần đây trả thêm `subtotal` — Files: `backend/routes/reports.js`, `src/pages/Dashboard.tsx`
### Changed
- **Dashboard** — Gợi ý nhỏ dưới KPI doanh thu; cột tiền ở «Đơn gần đây» hiển thị tạm tính đơn

## [12/04/2026] - TODO: Deploy production — hoàn tất (ghi nhận)
### Changed
- **TODO.md** — Gỡ mục «Deploy production» khỏi ĐANG LÀM; chuyển **Đa shop** lên ĐANG LÀM

## [12/04/2026] - Đổi nhãn «Phí ship KH» → «Ship KH Trả» (UI + Excel + tài liệu)
### Changed
- **Dashboard**, **CommissionReport**, **OrderList**, **exportExcel**, **LOGIC_BUSINESS.md**, **CLAUDE.md** — Nhãn cột/KPI/mô tả: **Ship KH Trả** (thay «Phí ship KH» / «Phí ship KH trả»)

## [12/04/2026] - Admin báo cáo HH: chỉ NV có phát sinh doanh thu kỳ
### Changed
- **GET /reports/salary** — Danh sách nhân viên (tab Hoa hồng Admin) chỉ gồm Sales có **doanh số** trong tháng/năm (và nhóm nếu chọn) **> 0** — Files: `backend/routes/reports.js`, `LOGIC_BUSINESS.md`

## [12/04/2026] - Admin «Chi tiết» NV = cùng màn «Hoa hồng của tôi» + API `user_id`
### Changed
- **`GET /api/commissions/orders?user_id=`** — Admin lọc 1 nhân viên: cùng bộ lọc direct/override + summary/ship/NV như Sales — Files: `backend/routes/commissions.js`
### Changed
- **`/reports/commissions/:userId`** — Dùng **CommissionReport** (KPI + bảng đơn như NV), nút quay lại báo cáo toàn bộ; bỏ `CommissionDetail.tsx` — Files: `src/pages/CommissionReport.tsx`, `src/App.tsx`, `plan.md`

## [12/04/2026] - Fix: «HH từ CTV» trên Hoa hồng của tôi = 0 (summary Sales)
### Fixed
- **GET /api/commissions/orders** — Với Sales, tổng **direct / override / total_commission** tính trực tiếp `commissions` + `orders` (cùng logic Dashboard); tránh SUM trên subquery UNION+JOIN làm **override_commission** sai — Files: `backend/routes/commissions.js`

## [12/04/2026] - Báo cáo HH Sales: hiển thị HH từ CTV (override), ship/NV đúng
### Fixed
- **GET /api/commissions/orders** — Sales: danh sách gồm cả `type=override` (trước đây chỉ `direct` nên không thấy HH từ CTV trên đơn CTV). Tổng **ship KH / NV chịu** chỉ theo đơn `salesperson_id` = mình (không lấy từ đơn chỉ có override). Summary dùng `total_commission` từ cùng bộ lọc — Files: `backend/routes/commissions.js`
### Changed
- **CommissionReport** — Cột **Loại HH** cho mọi user; badge **HH từ CTV (tên CTV)**; cột Hoa hồng màu xanh cho override — Files: `src/pages/CommissionReport.tsx`
- **LOGIC_BUSINESS.md** — Mô tả bảng chi tiết Sales

## [12/04/2026] - Chính tả: **Tổng lương** (tiền lương), không dùng «Tổng lượng»
### Changed
- **CommissionReport**, **Dashboard**, **exportExcel**, **LOGIC_BUSINESS.md**, **CLAUDE.md**, **TODO.md**, **CHANGELOG** (mục liên quan) — Đổi nhãn **Tổng lượng** → **Tổng lương**; API vẫn dùng `total_luong`

## [12/04/2026] - Đổi nhãn «Tổng lương cho toàn bộ» → «Tổng lương»
### Changed
- **CommissionReport**, **Dashboard**, **exportExcel**, **LOGIC_BUSINESS.md**, **CLAUDE.md** — Nhãn KPI / cột / Excel / tài liệu dùng **Tổng lương** (công thức không đổi)

## [12/04/2026] - Báo cáo HH: cột Phí ship KH & NV chịu (trước Lương)
### Changed
- **CommissionReport** — Bảng chi tiết theo đơn: thêm **Phí ship KH**, **NV chịu** (trước **Lương**); tổng trang — Files: `src/pages/CommissionReport.tsx`
- **exportExcel** — Xuất Excel chi tiết đơn (Sales + Admin sheet đơn) cùng hai cột — Files: `src/lib/exportExcel.ts`

## [12/04/2026] - Giải thích «HH từ CTV» (override quản lý) + gợi ý UI
### Changed
- **CommissionReport**, **Dashboard (Sales)** — Chú thích: ô «HH từ CTV» là tiền **quản lý** nhận (override) từ đơn để CTV lên; nếu chỉ là CTV thì thường **0**, HH nằm ở «HH bán hàng» — Files: `src/pages/CommissionReport.tsx`, `src/pages/Dashboard.tsx`
- **LOGIC_BUSINESS.md** — Đoạn FAQ vì sao có thể = 0

## [12/04/2026] - Lương: công thức HH+CTV+ship−NV; nhãn «Tổng lương cho toàn bộ»
### Changed
- **LOGIC_BUSINESS.md**, **CLAUDE.md** — Mô tả **Lương** / **Tổng lương cho toàn bộ** = tổng HH (direct + HH từ CTV) + phí ship KH − NV; ship/NV chỉ theo `salesperson_id` (không gán vào dòng HH override quản lý trên đơn CTV).
### Fixed
- **GET /api/commissions/orders** — Sales: cộng **HH từ CTV** (override) vào `summary.total_commission` / `total_luong`; cột **Lương** từng dòng: ship/NV chỉ khi `user_id` = `orders.salesperson_id` và dòng commission gốc đầu tiên của user trên đơn — Files: `backend/routes/commissions.js`
### Changed
- **CommissionReport**, **Dashboard**, **exportExcel** — Nhãn **Tổng lương cho toàn bộ**, mô tả phụ «Tổng HH + phí ship KH − tiền NV chịu» — Files: `src/pages/CommissionReport.tsx`, `src/pages/Dashboard.tsx`, `src/lib/exportExcel.ts`

## [12/04/2026] - EmployeeList: URL + fix crash + EmployeeForm quay lại danh sách
### Fixed
- **EmployeeList** — Đồng bộ `page`, `q`, `department`, `role`, `status` trên URL; không full-screen loading mỗi lần đổi trang; `json.data` an toàn; chữ ký tên không crash khi `full_name` rỗng; phân trang `getVisiblePageNumbers`; nhắc lỗi / «Đang cập nhật» khi có dữ liệu cũ — Files: `src/pages/EmployeeList.tsx`
- **EmployeeForm** — Sau lưu về `employeesListReturn` nếu có — Files: `src/pages/EmployeeForm.tsx`

## [12/04/2026] - Danh sách: giữ trang/lọc qua URL + quay lại đúng sau sửa/lưu
### Added
- **`src/lib/listUrl.ts`** — `parseListPage`, `getVisiblePageNumbers` (phân trang quanh trang hiện tại)
### Changed
- **OrderList** — `page`, `q`, `status`, `group`, `employee`, `from`/`to`, `preset` trên query string; nút «Xóa lọc» chỉ khi thực sự lệch mặc định hoặc `page>1`; phân trang số trang động; sau xóa đơn tự hạ trang nếu vượt tổng — Files: `src/pages/OrderList.tsx`
- **CustomerList / ProductList** — cùng kiểu URL (`q`, `tier` / `category`, `warehouse`, `page`); link tới form kèm `state` quay lại — Files: `src/pages/CustomerList.tsx`, `src/pages/ProductList.tsx`
- **CustomerForm / ProductForm** — sau lưu thành công điều hướng về URL danh sách đã lưu trong `state` (nếu có) — Files: `src/pages/CustomerForm.tsx`, `src/pages/ProductForm.tsx`
- **OrderForm** — (đã có) lưu đơn xong về `ordersListReturn` khi có

## [12/04/2026] - OrderList: thu nhỏ nút «Thêm đơn mới»
### Changed
- Giảm padding, `text-xs`, icon nhỏ hơn; nhãn rút thành «Thêm đơn» — Files: `src/pages/OrderList.tsx`

## [12/04/2026] - Danh sách đơn: mobile cùng bảng như desktop (cuộn ngang)
### Changed
- **OrderList** — Bỏ layout thẻ riêng cho mobile; dùng một bảng cho mọi breakpoint, `overflow-x-auto` + `min-w-[980px]`; gợi ý «Vuốt ngang» trên mobile — Files: `src/pages/OrderList.tsx`

## [12/04/2026] - Nhập/xuất kho: sửa URL API + redirect sau lưu
### Fixed
- **InventoryImport / InventoryExport** — Dùng biến `API_URL` (trước đó gọi `API_BASE` không tồn tại → fetch `undefined/...`); sau thành công chuyển tới `/inventory` thay vì `/inventory/history` (không có route) — Files: `src/pages/InventoryImport.tsx`, `src/pages/InventoryExport.tsx`

## [12/04/2026] - Login/Register: tránh vòng redirect sau đăng nhập
### Fixed
- Sau khi lưu token, hoãn `navigate("/")` một tick để `App` kịp cập nhật `isAuthenticated` trước khi Router render route bảo vệ — Files: `src/pages/Login.tsx`, `src/pages/Register.tsx`

## [11/04/2026] - RevenueReport: biểu đồ xếp hạng — hẹp khoảng cách hàng
### Fixed
- **Xếp hạng doanh số** — Chiều cao biểu đồ tính theo số NV (`~32px`/hàng), bỏ `min-h` cố định; cột mảnh hơn, `barCategoryGap` 4%, tooltip/cursor nhạt — Files: `src/pages/RevenueReport.tsx`

## [11/04/2026] - RevenueReport: bố cục & giao diện (Sheki / Dashboard)
### Changed
- **RevenueReport** — Bỏ header gradient tối; tiêu đề + breadcrumb + badge kỳ; khối lọc trắng có icon; KPI giống Dashboard; biểu đồ full width phía trên, bảng phía dưới; bảng header `slate-50` — Files: `src/pages/RevenueReport.tsx`

## [11/04/2026] - DB: join_date mọi user = 01/01/2020 (seed + migration)
### Changed
- **Migration `016_users_join_date_2020.sql`** — `UPDATE users SET join_date = '2020-01-01'` — chạy trước khi dump lên VPS
- **schema.sql** — Seed user kèm `join_date` — Files: `schema.sql`, `migrations/016_users_join_date_2020.sql`

## [11/04/2026] - Thu chi: lọc tháng/năm + xuất Excel
### Added
- **GET /api/cash-transactions/export** — Cùng bộ lọc với danh sách, trả toàn bộ dòng (không phân trang) — Files: `backend/routes/cash-transactions.js`
### Changed
- **GET /api/cash-transactions** — Lọc `year` + `month` (thay cho `date_from` / `date_to`)
- **CashTransactions** — Dropdown Tháng / Năm, nút **Xuất Excel** — Files: `src/pages/CashTransactions.tsx`, `src/lib/exportExcel.ts` (`exportCashTransactions`)

## [11/04/2026] - Thu chi: format tiền + hiện nhóm khi chọn NV
### Changed
- **CashTransactions** — Ô số tiền format kiểu VNĐ (locale vi-VN); khi chọn NV hiển thị chip nhóm BH (hoặc báo chưa gán nhóm) — Files: `src/pages/CashTransactions.tsx`

## [11/04/2026] - Thu chi: ô gõ tìm nhân viên (form + lọc)
### Changed
- **CashTransactions** — Combobox tìm theo tên / username / email / SĐT; sau lưu phiếu reset ô chọn NV — Files: `src/pages/CashTransactions.tsx`

## [11/04/2026] - Thu chi: tối ưu mobile (thẻ + touch)
### Changed
- **CashTransactions** — Dưới `md`: danh sách dạng thẻ, không cuộn ngang; form/lọc/nút phân trang `min-h` touch; desktop giữ bảng — Files: `src/pages/CashTransactions.tsx`

## [11/04/2026] - Admin: màn hình Thu chi (nhân viên + nhóm BH + loại + ghi chú)
### Added
- **Bảng `cash_transactions`** — migration `015_cash_transactions.sql`, cập nhật `schema.sql`
- **API** — `GET/POST/DELETE /api/cash-transactions` (Admin) — Files: `backend/routes/cash-transactions.js`, `backend/server.js`
- **FE** — `/cash-transactions`: form + danh sách, lọc NV/loại/ngày — Files: `src/pages/CashTransactions.tsx`, `src/App.tsx`, `src/components/Layout.tsx`

## [11/04/2026] - Dashboard: Phí ship KH, NV chịu, Tổng lương (tháng)
### Added
- **GET /reports/dashboard** — `luongMonth`: `total_khach_ship`, `total_nv_chiu`, `total_luong` (tháng hiện tại; đơn không hủy) — Files: `backend/routes/reports.js`
- **Dashboard** — 3 thẻ KPI (Admin + Sales) — Files: `src/pages/Dashboard.tsx`, `LOGIC_BUSINESS.md`

## [11/04/2026] - API mặc định: chỉ SP/NV `is_active=1` (active_only=all để xem hết)
### Changed
- **GET /api/products** — Mặc định `p.is_active = 1`; `active_only=all` bỏ lọc; `active_only=0` chỉ SP đã ngừng — Files: `backend/routes/products.js`
- **GET /api/users** — Mặc định `u.is_active = 1`; `active_only=all` bỏ lọc — Files: `backend/routes/users.js`
- **EmployeeList** — Lọc «Tất cả» gửi `active_only=all` — Files: `src/pages/EmployeeList.tsx`

## [11/04/2026] - Rà soát: `active_only=1` mọi màn tìm SP / NV
### Changed
- **InventoryExport, InventoryImport, OrderForm_old, OrderForm (1)** — gợi ý sản phẩm chỉ `is_active=1`
- **CustomerForm, OrderList, CollaboratorsCommissionsReport, CommissionRules, CollaboratorsPage** — danh sách NV (scoped) chỉ `is_active=1`
- **OrderForm** — đã có `active_only=1`; **ProductList, EmployeeList** — đã cấu hình trước đó

## [11/04/2026] - Fix: xóa / vô hiệu SP & nhân viên + lọc danh sách
### Fixed
- **ProductList** — Gọi `DELETE /products/:id` (trước đây dùng `PUT` `{is_active:0}` dễ lỗi); danh sách chỉ SP `active_only=1`; nút xóa chỉ Admin — Files: `src/pages/ProductList.tsx`
- **products PUT** — Cập nhật từng phần an toàn (`IF` cho `category_id` / `images` / `is_active`) — Files: `backend/routes/products.js`
- **GET /users** — Query `active_only=1|0` — Files: `backend/routes/users.js`
- **EmployeeList** — Mặc định chỉ NV đang làm; lọc Đang làm / Tất cả / Đã nghỉ; thông báo lỗi API; nút thao tác luôn hiện — Files: `src/pages/EmployeeList.tsx`

## [11/04/2026] - Fix: ship/NV bảng HH NV theo `salesperson_id` (không trùng Lan–Minh)
### Fixed
- **`GET /reports/salary`** — Phí ship KH + Tiền NV chịu chỉ từ đơn mà NV là **salesperson_id**; người chỉ có HH override không bị cộng ship/NV của đơn người khác — Files: `backend/routes/reports.js`, `LOGIC_BUSINESS.md`

## [11/04/2026] - Admin: bảng Hoa hồng NV + 3 cột ship / NV chịu / Tổng lương
### Added
- **GET /reports/salary** — `total_khach_ship`, `total_nv_chiu`, `total_luong` theo từng sales (đơn × NV distinct) — Files: `backend/routes/reports.js`
- **CommissionReport** tab Hoa hồng nhân viên + **exportExcel** sheet Tổng hợp NV — Files: `src/pages/CommissionReport.tsx`, `src/lib/exportExcel.ts`

## [11/04/2026] - Báo cáo HH: thẻ Phí ship KH + Tiền NV chịu
### Changed
- **CommissionReport** — KPI hiển thị **Tổng phí ship KH trả** và **Tổng tiền NV chịu** (cả kỳ), grid 7 cột — Files: `src/pages/CommissionReport.tsx`

## [11/04/2026] - Báo cáo hoa hồng: cột Lương + Tổng lương
### Added
- **GET /api/commissions/orders** — `luong`, `khach_tra_ship`, `nv_chiu_display`, `summary.total_khach_ship`, `summary.total_nv_chiu`, `summary.total_luong` (ship/NV một lần theo đơn; `ROW_NUMBER` cho nhiều dòng cùng đơn) — Files: `backend/routes/commissions.js`
- **CommissionReport** — cột **Lương**, thẻ **Tổng lương**, dòng tổng kỳ dưới bảng — Files: `src/pages/CommissionReport.tsx`
- **exportExcel** — cột Lương + chỉ số kỳ trong export Sales/Admin — Files: `src/lib/exportExcel.ts`
- **LOGIC_BUSINESS.md** — mô tả Lương / Tổng lương trên báo cáo HH

## [11/04/2026] - Danh sách đơn: mobile thẻ dọc (không cuộn ngang)
### Changed
- **OrderList** — `md:hidden` thẻ đơn đủ trường như bảng; bảng chỉ `md+` — Files: `src/pages/OrderList.tsx`

## [11/04/2026] - Danh sách đơn: cột Lương gọn (chỉ tên cột)
### Changed
- **OrderList** — Bỏ dòng phụ «HH + KH ship − NV chịu» dưới tiêu đề Lương — Files: `src/pages/OrderList.tsx`

## [11/04/2026] - Danh sách đơn: mobile cùng cột như laptop
### Changed
- **`OrderList`** — Bỏ layout mobile riêng; mọi màn hình dùng một bảng đủ cột, mobile `overflow-x` cuộn ngang — Files: `src/pages/OrderList.tsx`

## [11/04/2026] - Danh sách đơn: layout mobile (thẻ) — KH ship, NV chịu, Lương
### Added
- **`OrderList`** — `md:hidden` thẻ đơn hiển thị đủ số liệu; bảng chỉ `md:block` — `computeOrderMoney()` dùng chung — Files: `src/pages/OrderList.tsx`

## [11/04/2026] - Danh sách đơn: cột Lương (HH + KH ship − NV chịu)
### Added
- **OrderList** — cột **Lương** = `commission_amount + khách_trả_phí_ship − salesperson_absorbed_amount`; **LOGIC_BUSINESS.md** — Files: `src/pages/OrderList.tsx`, `LOGIC_BUSINESS.md`

## [11/04/2026] - OrderForm: nhân viên phụ trách = sales thực tế
### Fixed
- **OrderForm** — Bỏ placeholder Admin; hiển thị `salesperson_name` (sửa đơn) hoặc user đang đăng nhập (tạo đơn); mô tả “Nhân viên bán hàng (sales)” — Files: `src/pages/OrderForm.tsx`

## [11/04/2026] - Danh sách đơn: icon Sửa/Xóa luôn hiện (mobile)
### Fixed
- **OrderList** — bỏ `opacity-0` + `group-hover` trên nút sửa/xóa (touch không hover → icon bị ẩn) — Files: `src/pages/OrderList.tsx`

## [11/04/2026] - Danh sách đơn: cột Ship & NV chịu
### Added
- **OrderList** — cột **KH Trả Ship** (chỉ số tiền KH trả phần ship; shop trả hộ = 0), cột **NV chịu** — Files: `src/pages/OrderList.tsx`

## [11/04/2026] - OrderForm mobile: tổng kết thu gọn khi vào trang
### Changed
- Thanh dưới (`sm`) mặc định 1 dòng (Thu khách + Lưu); chạm mở đủ phí ship / cọc / Tiền NV chịu / HH — tránh khối lớn như popup khi load — Files: `src/pages/OrderForm.tsx`

## [11/04/2026] - Đơn hàng: đổi cột/API `nv_chiu` → `salesperson_absorbed_amount`
### Changed
- **Migration `014_rename_nv_chiu_salesperson_absorbed_amount.sql`**: đổi tên cột tiếng Anh; API JSON `salesperson_absorbed_amount` — Files: `backend/routes/orders.js`, `src/pages/OrderForm.tsx`, `schema.sql`, docs

## [11/04/2026] - Đơn hàng: cột `nv_chiu` + form Tiền NV chịu
### Added
- **Migration `013_orders_nv_chiu.sql`**: `orders.nv_chiu` — Tiền NV chịu (không đổi `computeOrderCollects` / `total_amount`)
### Changed
- **`backend/routes/orders.js`**, **`OrderForm`**, **`schema.sql`**, **`LOGIC_BUSINESS.md`**, **`CLAUDE.md`**

## [11/04/2026] - Nghiệp vụ: Tiền NV chịu (chênh lệch thu, trừ HH sau)
### Added
- **LOGIC_BUSINESS.md** §3 — Định nghĩa khi khách trả thiếu, NV bù phần còn lại; tên UI đề xuất **Tiền NV chịu**; gợi ý trừ HH kỳ quyết toán — **CLAUDE.md** bullet

## [11/04/2026] - Mặc định phí ship: khách trả
### Changed
- **OrderForm** — `shipPayer` mặc định `customer`; **`backend/routes/orders.js`** — API không gửi `ship_payer` thì coi là khách; **`schema.sql`**, migration **`012_ship_payer_default_customer.sql`** — DEFAULT DB `customer`; **LOGIC_BUSINESS.md**, **CLAUDE.md**

## [11/04/2026] - Giá trị đơn = subtotal (sau CK dòng)
### Changed
- **OrderForm** — **Giá trị đơn** luôn bằng tổng sau chiết khấu dòng (`subtotal`), không còn gán bằng thu khách; bỏ dòng Tạm tính trùng — Files: `src/pages/OrderForm.tsx`, `LOGIC_BUSINESS.md`, `CLAUDE.md`

## [11/04/2026] - OrderForm: phí ship & cọc hiển thị format tiền
### Changed
- **`MoneyAmountField`** — Bấm để sửa; lúc xem dùng `formatCurrency` giống Tạm tính / Thu khách (desktop + mobile sticky) - Files: `src/pages/OrderForm.tsx`

## [11/04/2026] - Đơn hàng: ship shop/khách, cọc, thu khách, shop thu (FE + BE)
### Added
- **Migration `011_order_ship_payer_deposit_collect.sql`**: `ship_payer`, `deposit`, `customer_collect`, `shop_collect`; backfill đơn cũ
- **`backend/utils/orderCollect.js`**, **`src/lib/orderCollect.ts`**: công thức thu — `orders.total_amount` = thu khách
### Changed
- **`backend/routes/orders.js`**: POST/PUT/GET; **`OrderForm`**: desktop + **mobile sticky** đủ nhập phí ship, cọc, chọn ship shop/khách, Thu khách / Shop thu / Giá trị đơn; **`schema.sql`**, **`CLAUDE.md`**

## [11/04/2026] - Quy tắc ship / cọc / thu khách / shop thu
### Added
- **LOGIC_BUSINESS.md** §3 — Bảng công thức theo shop trả vs khách trả ship; **CLAUDE.md** — bullet tóm tắt

## [11/04/2026] - OrderForm: nhãn Giá trị đơn
### Changed
- Đổi **Tổng cộng** → **Giá trị đơn** (tổng kết, sticky mobile, footer bảng SP) - Files: `src/pages/OrderForm.tsx`

## [11/04/2026] - OrderForm: nhãn Tổng CK
### Changed
- Đổi nhãn **Chiết khấu (dòng)** → **Tổng CK** (tổng kết + sticky mobile) - Files: `src/pages/OrderForm.tsx`

## [11/04/2026] - OrderForm: ô CK/HH desktop lớn hơn
### Changed
- **Web (bảng sm+)** — Tăng kích thước ô nhập CK% và HH% (`w-14 h-8`, `text-sm`, ký hiệu % `text-xs`) - Files: `src/pages/OrderForm.tsx`

## [11/04/2026] - OrderForm: CK% nhập từng dòng (mặc định 0)
### Changed
- **Chiết khấu** — Mỗi dòng sản phẩm cho nhập **CK%** như cột HH% (mặc định 0); style rose để phân biệt HH xanh. Sửa `addProduct` khi tăng SL cùng SP: đồng bộ `discount_amount` theo `discount_rate` - Files: `src/pages/OrderForm.tsx`, `CLAUDE.md`

## [11/04/2026] - OrderForm: ẩn VAT, chiết khấu chỉ hiển thị
### Changed
- **OrderForm** — Bỏ dòng VAT 10% và không cộng thuế vào tổng (khớp cách tính `total_amount` phía backend). Bỏ nhập giảm giá cấp đơn; hiển thị **tổng chiết khấu theo dòng** (read-only). Cột CK trên bảng sản phẩm chỉ hiển thị % (không nhập); đồng bộ `discountAmount` khi đổi SL/đơn giá - Files: `src/pages/OrderForm.tsx`
- **Mobile** — Thêm hàng tổng cuối bảng ngang (tổng SL, tổng CK, tạm tính HH); thanh sticky dưới cùng hiển thị đủ Tạm tính / Chiết khấu (dòng) / Phí VC / Tổng cộng / HH (không VAT) - Files: `src/pages/OrderForm.tsx`

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

## [08/04/2026] - Hoàn hàng: Sales xem đơn hoàn; Admin duyệt qua API
### Changed
- **Màn đơn hoàn** — Sales: menu “Đơn hoàn” → `/returns` chỉ danh sách đơn hoàn (đơn gốc do mình bán). (UI Admin `/returns/admin` đã gỡ về sau) — Files: `src/pages/SalesReturnsList.tsx`, `src/App.tsx`, `src/components/Layout.tsx`
### Added
- **API `GET /api/returns`** - Danh sách bảng `returns` (Sales lọc theo `salesperson_id`, Admin xem tất cả) - Files: `backend/routes/returns.js`
### Changed
- **Quyền yêu cầu hoàn** - `POST /api/returns/requests` và `GET /api/returns/requests` chỉ Admin; xóa `ReturnRequests.tsx` - Files: `backend/routes/returns.js`, (removed) `src/pages/ReturnRequests.tsx`
### Changed
- **Hoàn từng phần theo sản phẩm** — Admin tạo yêu cầu hoàn với qty từng item; backend chặn hoàn vượt số lượng còn lại; khi duyệt sẽ điều chỉnh hoa hồng theo tỷ lệ giá trị item hoàn (partial) thay vì trừ toàn bộ - Files: `backend/routes/returns.js`

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

## [23/04/2026] - Menu Nhân sự: Nhóm nhân viên
### Changed
- **Nhóm nhân viên đưa vào menu Nhân sự** - Tách màn quản lý nhóm ra route riêng `/employees/groups` (submenu Nhân sự) và gỡ tab “Nhóm nhân viên” khỏi Settings. - Files: `src/components/Layout.tsx`, `src/App.tsx`, `src/pages/EmployeeGroups.tsx`, `src/pages/Settings.tsx`

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

## [15/04/2026] - [Fix: Search input gõ tiếng Việt bị giật]
### Fixed
- Fix các ô tìm kiếm ở nhiều màn danh sách bị giật/không gõ được tiếng Việt hoặc dấu cách do sync URL trực tiếp + trim/debounce sai; chuyển sang dùng state local + debounce cập nhật query + bỏ cập nhật khi đang IME composition. - Files: `src/pages/EmployeeList.tsx`, `src/pages/ProductList.tsx`, `src/pages/OrderList.tsx`, `src/pages/CustomerList.tsx`, `src/pages/SalesReturnsList.tsx`, `src/pages/InventoryHistory.tsx`, `src/pages/ActivityLog.tsx`

## [15/04/2026] - [Docs: sẵn sàng làm Mobile App]
### Changed
- Chuẩn hoá README theo repo ERP + thêm mục Mobile docs, bổ sung checklist WebView/RN (env, back button, offline, IME, release). - Files: `README.md`, `FEATURE_MOBILE.md`, `FEATURE_MOBILE_RN.md`, `PROMPT_MOBILE.md`

## [15/04/2026] - [Docs: prompt RN native ít token]
### Changed
- Chuẩn hoá `PROMPT_MOBILE.md` thành prompt gốc RN native + các task mẫu (setup/login/orders/detail) để mở agent nhanh và giảm token. - Files: `PROMPT_MOBILE.md`

## [23/04/2026] - [DB: Final SQL bundle cho multi-shop + RBAC]
### Added
- Thêm script SQL “final bundle” (idempotent) để áp toàn bộ thay đổi multi-shop → RBAC/scope lên DB backup từ server, chạy 1 lần là đúng. - Files: `migrations/999_final_multishop_rbac.sql`

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
