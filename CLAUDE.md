# CLAUDE.md — ERP VELOCITY (ĐỌC FILE NÀY TRƯỚC KHI LÀM BẤT CỨ ĐIỀU GÌ)

## 📌 Đọc ngay các file sau theo thứ tự
1. `TODO.md` → biết đang làm gì, task nào tiếp theo
2. `CHANGELOG.md` → biết đã làm gì rồi, tránh làm lại
3. `RULES.md` → quy tắc code bắt buộc
4. `LOGIC_BUSINESS.md` → nghiệp vụ hoa hồng, lương, CTV
5. `UI_SPEC.md` → chuẩn giao diện Sheki
6. `plan.md` → business rules chi tiết, DB schema, cấu trúc thư mục
7. **Khi làm đa shop:** `FEATURE_MULTI_SHOP.md` (đặc tả đầy đủ) — không đoán mò ngoài file này

---

## 🏢 Project
**ERP quản lý bán hàng nội bộ — Công ty Velocity**

## ⚙️ Tech Stack
| | |
|---|---|
| Frontend | React 19 + Vite + TypeScript + Tailwind CSS |
| Backend | Node.js + Express |
| Database | MySQL — localhost:3306, user: root, pass: (trống), db: erp |
| Auth | JWT token |
| Port FE | 5173 |
| Port BE | 3000 |

## 📁 Cấu trúc thư mục
```
project/
├── backend/
│   ├── config/db.js          # MySQL direct (localhost, root, empty pass)
│   ├── middleware/           # auth.js, authorize.js, logger.js, errorHandler.js
│   ├── routes/               # auth, users, customers, products, orders,
│   │                         # inventory, commissions, reports, warehouses,
│   │                         # categories, settings, import, uploads, logs, groups
│   ├── services/orderService.js
│   └── uploads/              # ảnh sản phẩm
└── src/
    ├── pages/                # 21 màn hình (xem plan.md)
    ├── components/Layout.tsx # Menu động theo role
    ├── lib/
    │   ├── api.ts
    │   ├── utils.ts
    │   └── vietnam-locations-simple.json
    └── App.tsx
```

## 👥 Phân quyền
- **Admin:** toàn quyền, xem tất cả
- **Sales:** chỉ xem đơn/KH của mình (`created_by = user_id OR assigned_employee_id = user_id`)
- Menu sidebar tự động ẩn/hiện theo role

## 🔑 Tài khoản test
Đăng nhập bằng **tên đăng nhập** hoặc **email** (cùng mật khẩu).

| Tên đăng nhập | Email | Password | Role |
|---|---|---|---|
| admin@velocity.vn | admin@velocity.vn | comiumauden1234 | Admin |
| lan.sales@velocity.vn | lan.sales@velocity.vn | abc123 | Sales |
| minh.sales@velocity.vn | minh.sales@velocity.vn | abc123 | Sales |

## ⚠️ Business Rules cốt lõi (KHÔNG được bỏ qua)
- Mã đơn: `DH-YYYYMMDD-XXXX`, reset theo ngày
- Số lượng: DECIMAL(10,3) — hỗ trợ 0.5kg, 1.25m
- Hoa hồng: per-item, `(unit_price * qty - discount_amount) * commission_rate / 100`, mặc định 10%
- Chiết khấu dòng: `discount_rate` nhập trên OrderForm (giống HH%), mặc định **0%**; `discount_amount = unit_price * qty * discount_rate / 100` — trên UI tổng các dòng gọi **Tổng CK**
- **Giá trị đơn** (màn hình đơn) = **Tạm tính** = tổng sau chiết khấu dòng (`subtotal`) — không phải thu khách
- **Tiền NV chịu (UI):** phần chênh lệch khi khách trả ít hơn số phải thu; lưu DB/API `orders.salesperson_absorbed_amount`; **không** đổi công thức thu khách; sau này **trừ HH** — `LOGIC_BUSINESS.md` §3
- **Lương / Tổng lương (kỳ):** `Lương` = HH (direct + HH từ CTV) + Ship KH Trả − tiền NV chịu (ship/NV theo đơn mình `salesperson_id`); **Tổng lương** = tổng HH + tổng Ship KH Trả − tổng NV chịu — chi tiết `LOGIC_BUSINESS.md` (Đơn hàng + Lương)
- **Ship / cọc / thu:** Mỗi đơn có phí ship **khách trả** (mặc định) hoặc **shop trả**; có **tiền cọc**, **thu khách**, **shop thu**. Công thức: shop trả ship → thu khách = shop thu = Tạm tính − ship − cọc; khách trả ship → thu khách = Tạm tính + ship − cọc, shop thu = Tạm tính − cọc — chi tiết `LOGIC_BUSINESS.md` §3. DB: `ship_payer`, `deposit`, `customer_collect`, `shop_collect`; **`orders.total_amount` = thu khách** (đồng bộ báo cáo/loyalty).
- Tồn kho: `stock_qty = available_stock + reserved_stock`
- Địa chỉ: LUÔN normalize — bỏ prefix "Thành phố/Quận/Phường" khi so sánh
- Khách hàng: KHÔNG UNIQUE phone/email — trùng nhau là bình thường
- Phone: bắt buộc 10 chữ số

---

## 📊 Quy ước KPI báo cáo (để tránh lệch số)
- **Số đơn hàng**: chỉ tính **đơn bán** (không hủy), **KHÔNG** cộng đơn hoàn.
- **Tổng đơn hoàn**: KPI riêng.
- **HH bán hàng (direct)**: **gross** = tổng `commissions.type='direct'` theo kỳ phát sinh (`commissions.created_at`) — **không trừ** hoàn trong KPI này.
- **Tổng HH hoàn**: KPI riêng = tổng `commission_adjustments.type='direct'` (âm) theo kỳ phát sinh (`commission_adjustments.created_at`), chỉ tính cho **salesperson** của đơn gốc.
- **HH từ CTV (override)**: **net** = `commissions.type='override'` + `commission_adjustments.type='override'` (âm).
- **Tổng HH**: = HH bán hàng (gross) + HH từ CTV (net). (Khi tính lương kỳ thì mới trừ HH hoàn.)

---

## 🤖 QUY TẮC BẮT BUỘC SAU MỖI TASK HOÀN THÀNH

Mày PHẢI tự động làm 3 việc sau — KHÔNG được bỏ qua:

### 1. Cập nhật TODO.md
- Tick `[x]` task vừa làm xong
- Chuyển task tiếp theo lên mục `🔄 ĐANG LÀM`

### 2. Cập nhật CHANGELOG.md
Thêm dòng theo format:
```
## [DD/MM/YYYY] - [Tên task ngắn gọn]
### Added/Fixed/Changed
- [Mô tả thay đổi] - Files: [danh sách file đã sửa]
```

### 3. Báo cáo cho tao theo format này
```
✅ Hoàn thành: [tên task]
📁 Files đã sửa: [list]
⚠️  Lưu ý / Side effects: [nếu có]
▶️  Task tiếp theo: [tên task từ TODO.md]
```

**KHÔNG được kết thúc mà thiếu 3 bước trên.**
