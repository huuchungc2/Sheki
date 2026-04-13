# TODO — ERP VELOCITY

> **Quy tắc:** Chỉ 1 task trong mục ĐANG LÀM tại một thời điểm.
> AI: Sau khi xong → tick [x], chuyển task tiếp lên ĐANG LÀM, update CHANGELOG.md

---

## 🔴 ĐANG LÀM

- [ ] **Đa shop (multi-tenant)** — Đọc `FEATURE_MULTI_SHOP.md`; triển khai theo giai đoạn: DB `shops` + `user_shops` + `shop_id` → auth/switch-shop → middleware từng route → FE chọn shop → UI admin gán user

---

## 🟡 TIẾP THEO (theo thứ tự ưu tiên)

- [x] **Reset mật khẩu Admin = comiumauden1234**
  - Thêm migration reset role admin + cập nhật CLAUDE.md

- [x] **Cập nhật mật khẩu mặc định Sales = abc123**
  - Update seed `schema.sql` + cập nhật `CLAUDE.md`
  - Thêm migration update password_hash cho sales hiện có

- [x] **Hoàn hàng: hỗ trợ hoàn từng phần theo sản phẩm**
  - Admin tạo yêu cầu hoàn với số lượng từng item
  - Approve tạo return + nhập kho + điều chỉnh hoa hồng theo tỷ lệ phần hoàn
  - Chặn hoàn vượt số lượng còn lại (đã trừ các lần hoàn trước)

- [x] **EmployeeForm: fix thiếu vai trò khi thêm/sửa**
  - Đảm bảo roles load được và luôn có default role_id hợp lệ
  - Khi roles chưa load, UI hiển thị trạng thái rõ ràng

- [x] **EmployeeList: fix search/filter + redesign bulk gán quyền**
  - Tìm kiếm debounce, filter department/role thực sự gọi API
  - Bulk gán quyền nằm cùng hàng filter, UI gọn

- [x] **Nhân viên: cột phân quyền + gán hàng loạt (checkbox) + fix Dashboard/Revenue**
  - Danh sách nhân viên có cột Phân quyền
  - Chọn checkbox nhiều nhân viên → gán vai trò hàng loạt
  - Fix backend reports dùng roles (không dùng users.role đã drop)

- [x] **Xuất Excel báo cáo hoa hồng** - Nút "Xuất báo cáo" trong CommissionReport thực sự export file
- [x] **Thông báo realtime** - Bell icon hiển thị số đơn mới, đơn thay đổi trạng thái

---

## 🔮 TƯƠNG LAI (Mobile App)

- [ ] **Phase Mobile — WebView (nhanh nhất)**
  - Bọc website vào React Native WebView
  - Build APK (Android) + IPA (iOS)
  - Cần làm sau khi web hoàn chỉnh + deploy xong

- [ ] **Phase Mobile — React Native (nâng cấp)**
  - Reuse API backend từ web
  - UI native cho mobile
  - Push notification

---

## ✅ HOÀN THÀNH

- [x] **Dashboard Admin/Sales: doanh thu = tổng tạm tính (subtotal), không phải thu khách** — API `reports/dashboard` + UI gợi ý + đơn gần đây

- [x] **Quy tắc hoàn/trả hàng: chỉ điều chỉnh hoa hồng (không đụng Ship/NV chịu)** — Update tài liệu nghiệp vụ (LOGIC_BUSINESS)

- [x] **Hoàn hàng: bỏ `/returns/admin` nhưng vẫn giữ nghiệp vụ Admin** — Admin thao tác tại tab “Yêu cầu hoàn” trong `/returns`

- [x] **Doanh số = bán − hoàn** — Dashboard/Salary trừ doanh số theo tháng (giá trị hoàn tính realtime, không sửa schema)

- [x] **Dashboard: thêm KPI hoàn (doanh số hoàn + HH hoàn) và giữ doanh thu bán** — Dashboard hiển thị gross subtotal, hoàn hiển thị KPI riêng — Files: `backend/routes/reports.js`, `src/pages/Dashboard.tsx`

- [x] **Dashboard: thêm KPI Tổng đơn hoàn** — Dashboard thêm tổng số đơn hoàn theo tháng/hôm nay — Files: `backend/routes/reports.js`, `src/pages/Dashboard.tsx`

- [x] **Dashboard: HH từ CTV trừ đơn hoàn** — KPI override cộng adjustment override (âm) để trừ hoàn; direct giữ gross — File: `backend/routes/reports.js`

- [x] **Dashboard: HH hoàn hiển thị đúng dấu** — KPI HH hoàn luôn hiển thị âm theo trị tuyệt đối — File: `src/pages/Dashboard.tsx`

- [x] **Hoa hồng của tôi: thêm KPI hoàn như Dashboard** — Tổng doanh số hoàn / Tổng HH hoàn / Tổng đơn hoàn theo kỳ lọc — Files: `backend/routes/reports.js`, `src/pages/CommissionReport.tsx`

- [x] **Hoa hồng của tôi: tổng số đơn gồm đơn hoàn** — KPI “Số đơn hàng” cộng thêm số đơn hoàn — Files: `backend/routes/commissions.js`, `src/pages/CommissionReport.tsx`

- [x] **Hoa hồng của tôi: HH bán hàng khớp Dashboard** — Direct gross (không trừ hoàn), override net — File: `backend/routes/commissions.js`

- [x] **Hoa hồng: Tổng lương trừ HH hoàn (UI + Excel)** — Tổng lương = Tổng HH + Ship KH Trả − NV chịu − HH hoàn — Files: `backend/routes/commissions.js`, `src/pages/CommissionReport.tsx`, `src/lib/exportExcel.ts`

- [x] **Dashboard: Tổng lương khớp Hoa hồng của tôi** — Đồng bộ công thức lương tháng — File: `backend/routes/reports.js`

- [x] **Fix công thức Tổng lương (gross HH, tách HH hoàn)** — Tổng lương = (HH bán + HH CTV) − HH hoàn + Ship KH Trả − NV chịu; Tổng HH = direct+override gross (chỉ `commissions`) — Files: `backend/routes/reports.js`, `backend/routes/commissions.js`

- [x] **Sales: fix không thấy menu/màn Đơn hoàn** — Layout sync user từ `/auth/me`
- [x] **Sidebar: luôn có link Đơn hoàn** — Thêm `/returns` vào menu Bán hàng (Admin)

- [x] **Đơn hoàn (Sales): KPI tổng doanh số hoàn + tổng hoa hồng hoàn** — Màn `/returns`

- [x] **Đơn hoàn (Sales): KPI tổng số đơn hoàn** — Hiển thị tổng số đơn hoàn theo bộ lọc hiện tại — File: `src/pages/SalesReturnsList.tsx`

- [x] **Đơn hoàn (Sales): tổng HH hoàn khớp Hoa hồng của tôi** — Sales chỉ tính adjustment của chính mình để tránh lệch KPI — File: `backend/routes/returns.js`

- [x] **Đơn hoàn (Sales): thấy đơn hoàn trừ HH quản lý** — Include returns có adjustment trừ vào user (override) — File: `backend/routes/returns.js`

- [x] **Đơn hoàn (Sales): không trộn đơn người khác** — Revert hiển thị chỉ đơn hoàn của đơn mình bán — File: `backend/routes/returns.js`

- [x] **Báo cáo doanh thu (Admin): tính đúng doanh số + hoàn + HH hoàn** — `total_sales` theo `subtotal`, trừ hoàn realtime, HH cộng adjustments (âm) — File: `backend/routes/reports.js`

- [x] **Báo cáo doanh thu (Admin): gross như Dashboard** — RevenueReport dùng `/reports/revenue` (gross subtotal + HH gross, không trừ hoàn) — Files: `backend/routes/reports.js`, `src/pages/RevenueReport.tsx`

- [x] **Báo cáo doanh thu (Admin): tổng HH khớp Dashboard** — `summary.totalCommission` SUM trực tiếp `commissions` theo kỳ — File: `backend/routes/reports.js`

- [x] **Báo cáo doanh thu (Admin): bỏ KPI Tổng hoa hồng** — Gỡ thẻ KPI theo yêu cầu — File: `src/pages/RevenueReport.tsx`

- [x] **Đơn hoàn (Sales): thêm filter như quản lý đơn hàng** — Search + preset ngày + khoảng ngày + phân trang theo URL

- [x] **Quản lý đơn hàng: KPI Tổng doanh thu + Tổng hoa hồng** — Theo bộ lọc hiện tại (không chỉ 1 trang)

- [x] **Đơn hàng của tôi: KPI Tổng đơn hàng** — Hiển thị tổng số đơn (không gồm đơn hủy) theo bộ lọc hiện tại — Files: `backend/routes/orders.js`, `src/pages/OrderList.tsx`

- [x] **Hoàn hàng: trừ HH theo tier từng sản phẩm** — Duyệt hoàn tạo `commission_adjustments` theo đúng sản phẩm hoàn (không trừ theo tỷ lệ tổng đơn) — File: `backend/routes/returns.js`

- [x] **Dashboard mobile: bố cục Ship / NV / Tổng lương 2 cột như hàng KPI**

- [x] **CommissionReport + màn HH CTV: KPI mobile 2 cột (đồng bộ Dashboard)**

- [x] **CommissionReport: KPI 2 hàng (4+3) như Dashboard — bỏ 1 hàng 7 ô**

- [x] **CommissionReport: KPI class-by-class giống Dashboard (gap/p/text/icon)**

- [x] **Hoa hồng của tôi: KPI ép lưới CSS + compact mobile (đủ 7 ô trên màn)**

- [x] **CommissionReport: JSX gắn `commission-kpi-*` + `kpi-*` (CSS compact/WebView có hiệu lực)**

- [x] **KPI Hoa hồng của tôi: kích thước thẻ = Dashboard (bỏ CSS ép nhỏ trên mobile)**

- [x] **CommissionReport KPI: cùng markup/grid Tailwind với Dashboard (không class commission-kpi riêng)**

- [x] **Fix tràn ngang trang Hoa hồng (Layout min-w-0 + KPI/bảng/lọc)**

- [x] **Hoa hồng: filter + Xuất Excel luôn 1 hàng**

- [x] **Khách hàng: ngày sinh dd/mm/yyyy + birthday rỗng → NULL**

- [x] **Form KH: date picker ngày sinh + NV phụ trách mặc định + nguồn Zalo**

- [x] **Form KH: ngày sinh 3 dropdown (không popup lịch BE 2569)**

- [x] **Vite: cấu hình truy cập IP LAN + HMR (VITE_DEV_HMR_HOST)**

- [x] **Thêm KH: fix FK assigned_employee_id + thông báo lỗi API**

- [x] **Migration tùy chọn verify customers + check created_by**

- [x] **CustomerForm: Rules of Hooks (useMemo sau fetchLoading)**

- [x] **GET /api/users cho Sales (form KH) — tránh 403**

- [x] **CustomerForm: bỏ text gợi ý ngày sinh (Phật lịch)**

- [x] **Deploy production (website)** — Triển khai VPS / domain / SSL (hoàn tất ngoài repo)

- [x] **Đổi nhãn Phí ship KH → Ship KH Trả** — Dashboard, CommissionReport, OrderList, Excel, LOGIC, CLAUDE — Files: `src/pages/Dashboard.tsx`, `src/pages/CommissionReport.tsx`, `src/pages/OrderList.tsx`, `src/lib/exportExcel.ts`, `LOGIC_BUSINESS.md`, `CLAUDE.md`, `CHANGELOG.md`

- [x] **Admin HH: danh sách NV chỉ khi có doanh thu kỳ** — `GET /reports/salary` — Files: `backend/routes/reports.js`, `LOGIC_BUSINESS.md`

- [x] **Admin chi tiết NV: cùng UI «Hoa hồng của tôi»** — Route `/reports/commissions/:userId` → CommissionReport + `GET /commissions/orders?user_id=` — Files: `backend/routes/commissions.js`, `src/pages/CommissionReport.tsx`, `src/App.tsx`, `plan.md`

- [x] **Fix summary Sales: ô «HH từ CTV» = 0** — Tổng HH từ query `commissions`+`orders` (khớp Dashboard) — Files: `backend/routes/commissions.js`, `CHANGELOG.md`

- [x] **Báo cáo HH Sales: HH từ CTV (override) trong bảng + ship/NV đúng** — API `commissions/orders` + cột Loại HH — Files: `backend/routes/commissions.js`, `src/pages/CommissionReport.tsx`, `LOGIC_BUSINESS.md`

- [x] **Chính tả Tổng lương** — Nhãn đúng «lương» không phải «lượng» — Files: `src/pages/CommissionReport.tsx`, `src/pages/Dashboard.tsx`, `src/lib/exportExcel.ts`, `LOGIC_BUSINESS.md`, `CLAUDE.md`, `CHANGELOG.md`

- [x] **Nhãn «Tổng lương»** — Thay «Tổng lương cho toàn bộ» trên UI / Excel / LOGIC / CLAUDE — Files: `src/pages/CommissionReport.tsx`, `src/pages/Dashboard.tsx`, `src/lib/exportExcel.ts`, `LOGIC_BUSINESS.md`, `CLAUDE.md`

- [x] **Hoa hồng của tôi: cột Phí ship KH + NV chịu (trước Lương)** — Bảng chi tiết + Excel — Files: `src/pages/CommissionReport.tsx`, `src/lib/exportExcel.ts`

- [x] **Giải thích «HH từ CTV» = override quản lý** — Chú thích UI + FAQ `LOGIC_BUSINESS.md` (CTV thường thấy 0; HH nằm ở HH bán hàng) — Files: `src/pages/CommissionReport.tsx`, `src/pages/Dashboard.tsx`, `LOGIC_BUSINESS.md`, `CHANGELOG.md`

- [x] **Lương / Tổng lương — công thức & nhãn** — HH + HH CTV + ship KH − NV; UI «Tổng lương»; API Sales cộng override; ship/NV đúng theo `salesperson_id` — Files: `backend/routes/commissions.js`, `src/pages/CommissionReport.tsx`, `src/pages/Dashboard.tsx`, `src/lib/exportExcel.ts`, `LOGIC_BUSINESS.md`, `CLAUDE.md`

- [x] **Admin: Thu chi** — Chọn NV, loại Thu/Chi, nhóm bán hàng (theo `user_groups`), ghi chú, số tiền; danh sách + lọc + xóa — Files: `migrations/015_cash_transactions.sql`, `schema.sql`, `backend/routes/cash-transactions.js`, `backend/server.js`, `src/pages/CashTransactions.tsx`, `src/App.tsx`, `src/components/Layout.tsx`

- [x] **Dashboard: Tổng lương + ship KH + NV chịu (tháng)** — API + UI — Files: `backend/routes/reports.js`, `src/pages/Dashboard.tsx`, `LOGIC_BUSINESS.md`

- [x] **API default active_only + EmployeeList «Tất cả»** — GET products/users mặc định chỉ active; `active_only=all` — Files: `backend/routes/products.js`, `backend/routes/users.js`, `src/pages/EmployeeList.tsx`

- [x] **Rà soát active_only** — Mọi màn gợi ý SP / chọn NV dùng `active_only=1` — Files: `InventoryExport.tsx`, `InventoryImport.tsx`, `CustomerForm.tsx`, `OrderList.tsx`, `CollaboratorsCommissionsReport.tsx`, `CommissionRules.tsx`, `CollaboratorsPage.tsx`, `OrderForm_old.tsx`, `OrderForm (1).tsx`

- [x] **Danh sách SP & nhân viên: xóa/vô hiệu + hiển thị đúng** — `DELETE` SP, `active_only` API + UI, sửa PUT product partial — Files: `backend/routes/products.js`, `backend/routes/users.js`, `src/pages/ProductList.tsx`, `src/pages/EmployeeList.tsx`

- [x] **Báo cáo hoa hồng: cột Lương + Tổng lương** — Cùng công thức danh sách đơn; tổng kỳ = tổng HH + ship KH trả − NV chịu (ship/NV một lần/đơn) — Files: `backend/routes/commissions.js`, `src/pages/CommissionReport.tsx`, `src/lib/exportExcel.ts`, `LOGIC_BUSINESS.md`

- [x] **Báo cáo HH: KPI Phí ship KH + Tiền NV chịu** — Hai thẻ thống kê cả kỳ lọc — Files: `src/pages/CommissionReport.tsx`

- [x] **Admin — bảng Hoa hồng NV: cột Phí ship KH, NV chịu, Tổng lương** — API `/reports/salary` + Excel — Files: `backend/routes/reports.js`, `src/pages/CommissionReport.tsx`, `src/lib/exportExcel.ts`

- [x] **Fix ship/NV bảng HH NV** — Chỉ theo `salesperson_id` đơn, không gán ship/NV của đơn Lan cho Minh (override) — Files: `backend/routes/reports.js`, `LOGIC_BUSINESS.md`

- [x] **Danh sách đơn: mobile không cuộn ngang** — Thẻ dọc đủ cột — Files: `src/pages/OrderList.tsx`

- [x] **Danh sách đơn: tiêu đề cột Lương gọn** — Chỉ chữ «Lương» — Files: `src/pages/OrderList.tsx`

- [x] **Danh sách đơn: mobile = bảng đủ cột như laptop** — Cuộn ngang — Files: `src/pages/OrderList.tsx`

- [x] **Danh sách đơn: cột Lương** — HH + KH trả ship − NV chịu — Files: `src/pages/OrderList.tsx`, `LOGIC_BUSINESS.md`

- [x] **OrderForm: NV phụ trách hiển thị sales đúng** — Không còn placeholder Admin; load `salesperson_name` / user hiện tại — Files: `src/pages/OrderForm.tsx`

- [x] **Danh sách đơn: icon Sửa/Xóa trên mobile** — Bỏ ẩn theo hover — Files: `src/pages/OrderList.tsx`

- [x] **Danh sách đơn: cột Ship + NV chịu** — `OrderList` hiển thị ai trả phí ship và tiền NV chịu — Files: `src/pages/OrderList.tsx`

- [x] **OrderForm mobile: tổng kết thu gọn mặc định** — Thanh dưới không mở full như popup khi load; chạm “Thu gọn” / vùng Thu khách để mở chi tiết — Files: `src/pages/OrderForm.tsx`

- [x] **Đơn hàng: Tiền NV chịu (`orders.salesperson_absorbed_amount`)** — NV tự bỏ ra (ghi nhận, trừ HH sau); **không** đổi công thức Thu khách / Shop thu / `total_amount` — Files: migrations `013` + `014`, `backend/routes/orders.js`, `src/pages/OrderForm.tsx`, `schema.sql`, `LOGIC_BUSINESS.md`

- [x] **Orders: thiết kế lại màn hình lên đơn trên mobile web**
  - OrderForm responsive: layout 1 cột trên mobile + sticky bar “Tổng cộng / Lưu đơn”
  - Cải thiện picker sản phẩm trên mobile: 1 hàng ngang (ô tìm + nút thao tác)
  - Danh sách sản phẩm: mobile hiển thị dạng card (dễ thao tác), desktop giữ table - Files: `src/pages/OrderForm.tsx`
  - Chuẩn hoá font toàn hệ thống: base 14px giống ERP (nhanh.vn) - Files: `src/index.css`

- [x] **UI: menu mobile mặc định co lại**
  - Sidebar mobile dạng drawer, vào app auto đóng, đổi route tự đóng; không auto bung submenu - Files: `src/components/Layout.tsx`

- [x] **Products: thêm/sửa bắt buộc chọn kho + tồn kho theo kho**
  - ProductForm thêm dropdown kho (bắt buộc) và load tồn theo kho khi edit
  - Products API nhận `warehouse_id`: create/sửa tồn sẽ cập nhật `warehouse_stock` theo kho và sync tổng tồn - Files: `src/pages/ProductForm.tsx`, `backend/routes/products.js`

- [x] **Orders: không tính HH quản lý khi không chọn** — Tắt override commissions trên đơn bán trực tiếp (`sales`)
- [x] **Sửa đơn: chọn/bỏ chọn quản lý** — Edit đơn cho phép toggle quản lý; HH theo rule mới
- [x] **Orders: chọn quản lý → CTV có direct, quản lý có override** — Giữ `salesperson_id` là người lên đơn; tính `override` cho quản lý theo tier (tính trên net_amount từng item)
- [x] **Orders: Sales chỉ thấy đơn mình bán** — Sales chỉ list/view/edit/delete đơn có `salesperson_id = user_id` (trừ legacy collaborator_user_id là CTV thật)
- [x] **OrderForm: edit giữ quản lý đã chọn** — Load manager từ `collaborator_user_id` (semantics mới), giữ dropdown khi đổi nhóm, payload không gửi `collaborator_user_id` sai
- [x] **CTV commissions: nhiều mức + popup** — Override_rate nhiều mức hiển thị “Nhiều mức”, click mã đơn mở popup chi tiết đơn trong `/reports/commissions/ctv`
- [x] **Employees UI + username linh hoạt** — Làm UI EmployeeList/EmployeeForm gọn hơn; username cho phép `.`/`-` và không yêu cầu ký tự đặc biệt

- [x] **CustomerForm + API: bắt phone 10 số + địa chỉ đầy đủ** — Validate FE/BE cho tạo/sửa KH (city/district/ward/address), lưu phone đã clean

- [x] **Quản lý dropdown theo nhóm + HH sửa đơn** — API my-managers `group_id` / `include_user_ids`; POST/PUT suy source_type; OrderForm sync

- [x] **Sửa đơn: đổi sang quản lý → HH đúng** — Auto CTV khi thiếu; PUT tính lại dòng khi đổi `source_type` không kèm items

- [x] **Admin không dùng dropdown quản lý HH + API chặn collaborator** — Form + POST/PUT

- [x] **Quyền + mặc định quản lý đơn** — Chỉ Admin collaborator→sales; Sales chọn/đổi QL; tạo đơn mặc định QL đầu tiên

- [x] **OrderForm đơn giản: một dropdown quản lý (HH) trên danh sách SP** — Bỏ UI chọn CTV/quản lý/cặp; API collaborators có `sales_commission_rate` cho Admin

- [x] **HH khi sửa đơn: collaborator → sales** — `salesperson_id` về đúng A/CTV; quyền CTV đổi về bán trực tiếp; OrderForm reset % HH dòng khi tắt ghi nhận quản lý

- [x] **Đơn ghi nhận quản lý là người bán** — `source_type` + `collaborator_user_id`, API my-managers/my-ctvs, OrderForm, HH không override khi collaborator

- [x] **Đặc tả đa shop** — Ghi `FEATURE_MULTI_SHOP.md` + cập nhật `plan.md`, `ROADMAP.md`, `CLAUDE.md` (chưa sửa code DB/API)

- [x] **Gỡ menu Tra cứu đơn admin** — Dư thừa so với lọc đơn tại Danh sách đơn; redirect `/orders/search/*` → `/orders`

- [x] **RevenueReport — UI Sheki + export Excel** — Header/breadcrumb, KPI 4 ô, bảng xếp hạng + link NV, HH tổng (gồm CTV), xuất file Excel

- [x] **Backend logging: bỏ access.log**
  - Tắt morgan ghi file access.log, chỉ giữ error.log

### Phase 1: Setup & Infrastructure
- [x] Phân tích 21 màn hình giao diện
- [x] Xác nhận business rules với chủ dự án
- [x] Tạo plan.md, TODO.md, CHANGELOG.md
- [x] Schema.sql (12 bảng + seed data + role_permissions + activity_logs)
- [x] Config MySQL direct connection
- [x] Backend structure (Express + middleware + routes + services)
- [x] Frontend structure (React + Vite + TypeScript + Tailwind)

### Phase 2: Core Features (21 màn hình)
- [x] Auth: Login, Register, Logout, Change Password (JWT)
- [x] Dashboard (admin xem tất cả, sales xem của mình)
- [x] Employee CRUD (admin only, đổi mật khẩu khi edit)
- [x] Product CRUD (admin only, filter danh mục, search, image upload)
- [x] Customer CRUD (sales filter: created_by OR assigned_employee_id)
- [x] Order CRUD (sales filter, decimal qty, commission 10%)
- [x] Inventory Import/Export/History (admin only, decimal qty)
- [x] Bulk Import Excel + template download
- [x] Bulk Export Excel
- [x] Salary Report (admin: toàn bộ, sales: của mình)
- [x] Commission Detail (chi tiết hoa hồng từng NV)
- [x] Settings (phân quyền 8 module × 4 action)
- [x] OrderSearch 4 variants (day/month/year/range)
- [x] Activity Log (admin only, filter + modal chi tiết)
- [x] Change Password (all users)
- [x] Vietnam locations 63 tỉnh (TP→Quận→Phường)
- [x] Image upload sản phẩm (local + URL)
- [x] OrderForm: customer search + new customer + address dropdowns
- [x] Groups: bảng groups + user_groups, CRUD, gán NV
- [x] OrderForm: Group selector + validate tồn kho realtime
- [x] OrderForm: Warehouse selector — chọn kho xuất hàng, sync available_stock theo kho
- [x] SalaryReport: filter theo nhóm

### Phase 7: Verify & Fix các màn hình chưa test (06/04/2026)
- [x] **Vai trò động** - Bảng `roles`, `users.role_id`, API `/api/roles`, trang `/roles`, JWT `can_access_admin`/`scope_own_data`, phân quyền backend/FE theo cờ (migration `007_roles_table.sql`)
- [x] **CollaboratorsPage** - Sửa API GET/POST/DELETE dùng bảng `collaborators` thay vì `user_collaborators` (rỗng)
- [x] **OrderSearch** - Sửa params `startDate/endDate` → `date_from/date_to`, fix statusConfig, thêm navigate click đơn, thêm filter trạng thái
- [x] **InventoryImport/Export** - Sửa nhận `quantity/unit_price` (frontend) hoặc `qty/price` (API), fix stock_qty + available_stock đồng bộ, recalculate sau nhập/xuất
- [x] **Login/Register** - Đã test OK, cả 2 hoạt động đúng
- [x] **Fix kho: tạo đơn completed + sync tồn theo kho** - Tạo mới đơn `completed` sẽ trừ kho vật lý đúng kho; OrderForm sync `available_stock` theo kho cho sản phẩm mới thêm
- [x] **Fix Inventory page /inventory** - InventoryHistory map đúng schema API `/inventory`, render ổn định không crash
- [x] **Fix Inventory time** - Hiển thị thời gian tạo phiếu kho đúng giờ local (parse MySQL DATETIME)
- [x] **Fix Inventory API countQuery** - Sửa lỗi `Unknown column 'sm.type'` trong filter/pagination của `/inventory`
- [x] **Inventory filter kho + thời gian** - Trang Kho có dropdown chọn kho + popover chọn khoảng ngày, backend hỗ trợ `date_from/date_to`
- [x] **Inventory stats thật** - 4 thẻ thống kê trên /inventory lấy dữ liệu DB qua API `/inventory/summary`
- [x] **Products filter theo kho** - Trang Products có dropdown chọn kho, API `/products` hỗ trợ `warehouse_id` trả tồn theo kho
- [x] **Inventory Import/Export: tìm sản phẩm đẹp** - Nhập/Xuất kho thêm sản phẩm bằng search suggestions như OrderForm, UI đẹp hơn
- [x] **Xuất chuyển kho + xuất điều chỉnh** - Xuất chuyển kho có kho nhận (cộng/trừ 2 kho khi completed); thêm lý do xuất điều chỉnh
- [x] **Xuất kho: chỉ gợi ý SP trong kho** - Search sản phẩm khi xuất chỉ trả SP có thể bán > 0 trong kho xuất
- [x] **Update schema warehouse_stock** - Bổ sung bảng warehouse_stock vào schema.sql khớp logic tồn kho theo kho
- [x] **Default kho trung tâm cho sản phẩm** - Init warehouse_stock cho toàn bộ sản phẩm hiện có vào kho trung tâm + tạo sản phẩm mới auto thuộc kho mặc định
- [x] **Màn hình tạo kho + kho mặc định** - Admin CRUD kho và set 1 kho là kho tổng/mặc định (is_default)
- [x] **Kho mặc định dạng radio** - Cột kho mặc định là radio (1 lựa chọn), chọn auto cập nhật
- [x] **Script chạy migration local** - Thêm script Node chạy file SQL khi không có mysql CLI
- [x] **Seed test: sản phẩm thuộc kho tổng** - Tạo warehouse_stock ở kho mặc định cho các sản phẩm chưa có dữ liệu theo kho
- [x] **UI chọn sản phẩm nhập/xuất kiểu search** - Chỉnh UI picker theo style search dropdown (như OrderForm)
- [x] **Nhập kho: đơn giá không =0** - Fallback cost_price→price khi cost_price=0

### Phase 6: Logic nghiệp vụ đúng theo LOGIC_BUSINESS.md (06/04/2026)
- [x] **Fix HH CTV theo nhóm** - B lên đơn nhóm X → A chỉ nhận override nếu A thuộc nhóm X
- [x] **Lưu override_rate tại thời điểm tạo đơn** - Thêm cột `commissions.override_rate`, không tra lại tier khi recalc

### Phase 5: UX, Hoa hồng & Dashboard (05/04/2026)
- [x] **Redesign bảng sản phẩm OrderForm** - Font gọn, cột đúng, qty +/- buttons, đơn giá gõ được, chiết khấu/hoa hồng chỉnh được, available_stock hiển thị, cảnh báo vượt tồn
- [x] **OrderList nâng cấp** - Checkbox bulk action đổi trạng thái, date preset filter (hôm nay/tuần/tháng/năm), filter nhân viên (admin), mặc định lọc hôm nay
- [x] **Fix logic kho hoàn chỉnh** - pending/shipping giữ reserved, completed trừ stock_qty thật, cancelled hoàn kho, delete order hoàn kho
- [x] **Fix ENUM status orders** - Migration: bỏ draft/confirmed/done → chỉ còn pending/shipping/completed/cancelled
- [x] **Fix logic hoa hồng override** - Tính % trên tổng tiền đơn (không phải HH của CTV), tra tier theo commission_rate của Sales quản lý
- [x] **Dashboard Admin** - Doanh thu tháng/hôm nay/% so tháng trước, đơn theo trạng thái, top nhân viên, top sản phẩm, đơn gần đây
- [x] **Dashboard Sales** - Doanh thu, HH bán hàng, HH từ CTV, đơn theo trạng thái, top sản phẩm, đơn gần đây
- [x] **EmployeeDetail nâng cấp** - Date filter preset, 5 stat cards (HH bán hàng / HH từ CTV / Tổng HH / Số đơn / Doanh thu), fix statusConfig
- [x] **CommissionReport nâng cấp** - 4 stat cards đúng (direct/override/tổng/số đơn), cột nhóm BH, filter nhóm, admin: bảng sum + tab HH CTV gộp chung
- [x] **Fix filter nhóm báo cáo hoa hồng** - Chọn "Tất cả" vẫn ra, chọn nhóm riêng giờ hiển thị đúng (salary report lọc theo `orders.group_id` thay vì membership) 
- [x] **Màn hình HH CTV Sales** - Filter preset + nhóm, accordion từng CTV, chi tiết đơn per CTV, grand total
- [x] **Màn hình HH CTV Admin** - Accordion 2 cấp Sales→CTV→Đơn, filter nhóm/sales/search, grand total
- [x] **Fix bug HH CTV = 0** - Sửa params SQL bị lẫn targetUserId vào filter tháng/năm
- [x] **Fix CommissionReport Sales** - type=direct only trong /commissions/orders, stat cards lấy override riêng từ CTV API
- [x] **Gộp HH CTV vào báo cáo Admin** - Tab "Hoa hồng từ CTV" trong trang báo cáo hoa hồng, bỏ menu riêng
- [x] **Fix stat cards Admin (HH bán hàng/CTV/Tổng)** - Admin lấy `override_commission` đúng từ API `/commissions/orders` (không bị 0) - Files: `src/pages/CommissionReport.tsx`
- [x] **Fix màn hình chi tiết hoa hồng (Admin)** - Summary + trạng thái + link order detail đúng theo nhân viên được chọn - Files: `backend/routes/commissions.js`, `src/pages/CommissionDetail.tsx`
- [x] **Ghi log lỗi backend ra file** - Ghi `error.log` (middleware errorHandler) + `process.log` (unhandledRejection/uncaughtException) để dễ gửi chẩn đoán bug - Files: `backend/middleware/errorHandler.js`, `backend/server.js`
- [x] **OrderForm: tồn kho = có thể bán theo kho** - Search sản phẩm gửi `warehouse_id`, edit mode không set 999, hiển thị + validate theo “có thể bán” (available_stock) - Files: `src/pages/OrderForm.tsx`
- [x] **Hủy đơn = 0 hoa hồng** - Nếu `orders.status='cancelled'` thì xóa commission của đơn và không tính lại - Files: `backend/services/orderService.js`
- [x] **Luồng hoàn hàng sau chốt** - Admin tạo yêu cầu hoàn + duyệt/từ chối; Sales chỉ xem danh sách đơn hoàn (`/returns`); Admin quản lý tại `/returns/admin`; API `GET /returns` (đơn hoàn), `GET/POST /returns/requests` (admin) - Files: `migrations/005_returns_and_commission_adjustments.sql`, `backend/routes/returns.js`, `backend/routes/commissions.js`, `backend/server.js`, `src/pages/SalesReturnsList.tsx`, `src/pages/AdminReturns.tsx`, `src/pages/CommissionReport.tsx`, `src/App.tsx`, `src/components/Layout.tsx`

### Phase 4: Validation & Bug Fixes
- [x] **Thêm validation đầy đủ cho tất cả form** - Required fields, inline errors, format check cho CustomerForm, ProductForm, EmployeeForm, OrderForm
- [x] **Fix OrderForm bugs** - Shipping fee/discount controlled inputs, payment method toggle, order status select, note textarea hiển thị đúng, group selector bắt buộc

### Phase 3: Bug Fixes
- [x] CustomerList: sales filter đúng
- [x] Customer suggest: filter theo sales
- [x] EmployeeForm: tách isLoading/isSaving
- [x] OrderForm: helper functions trước useEffect (fix trang trắng)
- [x] OrderForm: không lặp cột, decimal qty, tổng dùng Math.max
- [x] CustomerForm: normalize địa chỉ, validate phone 10 số
- [x] Inventory export: check product trước khi truy cập
- [x] Bulk import: Excel, match header theo tên, auto SKU
- [x] ProductList: fix filter alias, hiển thị ảnh + category + status
- [x] OrderList: hiển thị code + total_amount + commission
- [x] Order detail API: convert DECIMAL strings to numbers
- [x] Hoa hồng: mặc định 10%, Math.round
- [x] Activity logging middleware
- [x] Groups migration fix (bảng groups, user_groups, cột group_id)

---

## 📝 GHI CHÚ QUAN TRỌNG (AI đọc kỹ)

### Địa chỉ — dễ bug nhất
- LOCATIONS lưu tên đầy đủ: "Thành phố Hà Nội", "Quận Ba Đình"
- DB có thể lưu tên ngắn: "Hà Nội", "Ba Đình"
- **LUÔN normalize** khi so sánh: bỏ prefix để match

### Khách hàng
- **KHÔNG UNIQUE** phone/email — trùng là bình thường

### Số lượng
- **DECIMAL(10,3)** — 0.5kg, 1.25m là hợp lệ

### Cấu hình chạy
```bash
# Backend
cd backend && node server.js   # Port 3000

# Frontend  
npm run dev                    # Port 5173

# DB: localhost:3306, user: root, pass: (trống), db: erp
```
