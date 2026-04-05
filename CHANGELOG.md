# CHANGELOG

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
