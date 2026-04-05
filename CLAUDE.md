# CLAUDE.md — ERP VELOCITY (ĐỌC FILE NÀY TRƯỚC KHI LÀM BẤT CỨ ĐIỀU GÌ)

## 📌 Đọc ngay các file sau theo thứ tự
1. `TODO.md` → biết đang làm gì, task nào tiếp theo
2. `CHANGELOG.md` → biết đã làm gì rồi, tránh làm lại
3. `RULES.md` → quy tắc code bắt buộc
4. `LOGIC_BUSINESS.md` → nghiệp vụ hoa hồng, lương, CTV
5. `UI_SPEC.md` → chuẩn giao diện Sheki
6. `plan.md` → business rules chi tiết, DB schema, cấu trúc thư mục

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
| Email | Password | Role |
|---|---|---|
| admin@velocity.vn | admin123 | Admin |
| lan.sales@velocity.vn | sales123 | Sales |
| minh.sales@velocity.vn | sales123 | Sales |

## ⚠️ Business Rules cốt lõi (KHÔNG được bỏ qua)
- Mã đơn: `DH-YYYYMMDD-XXXX`, reset theo ngày
- Số lượng: DECIMAL(10,3) — hỗ trợ 0.5kg, 1.25m
- Hoa hồng: per-item, `(unit_price * qty - discount_amount) * commission_rate / 100`, mặc định 10%
- Tồn kho: `stock_qty = available_stock + reserved_stock`
- Địa chỉ: LUÔN normalize — bỏ prefix "Thành phố/Quận/Phường" khi so sánh
- Khách hàng: KHÔNG UNIQUE phone/email — trùng nhau là bình thường
- Phone: bắt buộc 10 chữ số

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
