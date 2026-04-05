# TODO — ERP VELOCITY

> **Quy tắc:** Chỉ 1 task trong mục ĐANG LÀM tại một thời điểm.
> AI: Sau khi xong → tick [x], chuyển task tiếp lên ĐANG LÀM, update CHANGELOG.md

---

## 🔴 ĐANG LÀM

- [ ] **Deploy production**
  - Setup VPS CentOS/Ubuntu
  - Config Nginx, PM2, SSL
  - Files: tạo mới `deploy.sh`, `nginx.conf`

---

## 🟡 TIẾP THEO (theo thứ tự ưu tiên)

- [x] **Xuất Excel báo cáo hoa hồng** - Nút "Xuất báo cáo" trong CommissionReport thực sự export file
- [ ] **Thông báo realtime** - Bell icon hiển thị số đơn mới, đơn thay đổi trạng thái

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
- [x] **Màn hình HH CTV Sales** - Filter preset + nhóm, accordion từng CTV, chi tiết đơn per CTV, grand total
- [x] **Màn hình HH CTV Admin** - Accordion 2 cấp Sales→CTV→Đơn, filter nhóm/sales/search, grand total
- [x] **Fix bug HH CTV = 0** - Sửa params SQL bị lẫn targetUserId vào filter tháng/năm
- [x] **Fix CommissionReport Sales** - type=direct only trong /commissions/orders, stat cards lấy override riêng từ CTV API
- [x] **Gộp HH CTV vào báo cáo Admin** - Tab "Hoa hồng từ CTV" trong trang báo cáo hoa hồng, bỏ menu riêng

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
