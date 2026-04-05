# TODO — ERP VELOCITY

> **Quy tắc:** Chỉ 1 task trong mục ĐANG LÀM tại một thời điểm.
> AI: Sau khi xong → tick [x], chuyển task tiếp lên ĐANG LÀM, update CHANGELOG.md

---

## 🔴 ĐANG LÀM

- [x] Move NHÓM BÁN HÀNG lên khu vực thông tin khách hàng và bắt buộc chọn khi lên đơn (OrderForm)
- [x] **Test luồng thêm/sửa/xóa đơn với nhóm bắt buộc** - Validate UI, payload, end-to-end
- [ ] **Implement real-time stock update**
  - Tồn kho cập nhật ngay khi đơn hàng thay đổi status
  - Files: `backend/routes/orders.js`, `backend/services/orderService.js`

- [ ] **Thêm validation đầy đủ cho tất cả form**
  - Required fields, min/max, format check
  - Hiển thị lỗi rõ ràng dưới mỗi field
  - Files: tất cả `src/pages/*Form.tsx`

- [ ] **Implement real-time stock update**
  - Tồn kho cập nhật ngay khi đơn hàng thay đổi status
  - Files: `backend/routes/orders.js`, `backend/services/orderService.js`

- [ ] **Deploy production**
  - Setup VPS CentOS/Ubuntu
  - Config Nginx, PM2, SSL
  - Files: tạo mới `deploy.sh`, `nginx.conf`

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
- [x] SalaryReport: filter theo nhóm

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

### Phase 4: Commission Report Fixes
- [x] CommissionDetail route missing trong App.tsx
- [x] OrderList commission_amount hardcoded 10% → dùng DB thực
- [x] SalaryReport sales view: sai data structure → fetch order-level commissions
- [x] CommissionDetail: link order code về đúng order search
- [x] Salary report: SUM(DISTINCT) sai → dùng subquery
- [x] API mới: GET /api/commissions/orders (order-level commission data)

### Phase 5: Tách báo cáo doanh thu và hoa hồng
- [x] Tạo RevenueReport.tsx (admin only) - báo cáo doanh thu theo nhân viên
- [x] Tạo CommissionReport.tsx (admin + sales) - báo cáo hoa hồng riêng
- [x] Tách menu: Admin có "Báo cáo doanh thu" + "Báo cáo hoa hồng", Sales chỉ có "Hoa hồng của tôi"
- [x] Xóa SalaryReport.tsx cũ, cập nhật routes App.tsx

### Phase 6: Cải thiện CommissionDetail và menu
- [x] Menu Báo cáo có submenu (admin: mở rộng → doanh thu + hoa hồng)
- [x] CommissionDetail: click đơn hàng → expand chi tiết sản phẩm ngay tại chỗ
- [x] Bỏ "Hoa hồng trung bình" → thay bằng "Lương cơ bản"
- [x] Commissions API thêm status, total_amount

### Phase 7: CommissionDetail → OrderCommissionDetail
- [x] Tạo OrderCommissionDetail page - trang riêng chi tiết hoa hồng từng đơn hàng
- [x] CommissionDetail: click mã đơn → navigate sang OrderCommissionDetail
- [x] Route mới: /reports/commissions/:userId/order/:orderId

### Phase 8: Employee Detail Overview
- [x] EmployeeDetail page: nhóm nhân viên, tổng hoa hồng, top 10 SP bán chạy, đơn hàng của NV
- [x] Backend API: GET /api/users/:id/overview + GET /api/users/:id/orders
- [x] EmployeeList: click tên NV → navigate tới EmployeeDetail

### Phase 9: Cộng tác viên (Collaborators)
- [x] Bảng user_collaborators (many-to-many self-referencing)
- [x] Backend CRUD API: GET/POST/DELETE /api/users/:id/collaborators
- [x] CollaboratorsPage: trang quản lý CTV cho từng nhân viên
- [x] EmployeeDetail: nút "Quản lý CTV" → trang collaborators

### Phase 10: Quy tắc hoa hồng phân cấp (Commission Override)
- [x] DB: commission_tiers (mức hoa hồng CTV → % Sale hưởng) + collaborators (gán CTV cho Sale)
- [x] Migration: 001_commission_rules.sql + seed tiers mẫu
- [x] Backend API: GET/POST/PUT/DELETE /api/commission-tiers
- [x] Backend API: GET/POST/DELETE /api/collaborators + available-ctvs
- [x] orderService: recalculateCommission tạo cả override commission cho Sale quản lý
- [x] reports.js: salary report tách direct_commission + override_commission
- [x] commissions.js: trả về type (direct/override) + ctv_name
- [x] Frontend: CommissionRules page (2 tabs: mức hoa hồng + gán CTV)
- [x] CommissionReport: thêm cột "Hoa hồng quản lý CTV" + "Tổng hoa hồng"
- [x] CommissionDetail: badge phân loại "Trực tiếp" / "Quản lý CTV: tên"
- [x] Menu Layout: thêm "Quy tắc hoa hồng" (admin only)
- [x] Route: /commission-rules (AdminRoute)

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
