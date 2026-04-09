# UI_SPEC.md — ĐẶC TẢ GIAO DIỆN SHEKI

> AI PHẢI đọc file này trước khi thiết kế hoặc sửa bất kỳ giao diện nào.

---

## 1. THÔNG TIN THƯƠNG HIỆU

| | |
|---|---|
| Tên app | **Sheki** |
| Ngôn ngữ | Tiếng Việt hoàn toàn |
| Style tham khảo | Nhanh.vn — clean, professional, dễ dùng |
| Logo | Hiển thị "Sheki" trên sidebar và tab trình duyệt |

---

## 2. DESIGN SYSTEM

### Màu sắc
```
Primary:     #E31837  (đỏ — theo style Nhanh.vn)
Primary dark:#C41230
White:       #FFFFFF
Gray light:  #F5F5F5
Gray border: #E0E0E0
Gray text:   #666666
Dark text:   #333333
Success:     #28A745
Warning:     #FFC107
Danger:      #DC3545
```

### Font chữ
```
Font: Inter hoặc system-ui (clean, dễ đọc)
Size heading: 20px
Size body: 14px
Size small: 12px
```

### Border radius
```
Button: 6px
Card: 8px
Input: 6px
```

---

## 3. LAYOUT CHUNG

```
┌─────────────────────────────────────────┐
│  Sidebar (240px)  │  Main Content        │
│  ─────────────   │  ─────────────────   │
│  Logo: Sheki     │  Header (breadcrumb) │
│  ─────────────   │  ─────────────────   │
│  Menu items      │  Page content        │
│  (theo role)     │                      │
│                  │                      │
└─────────────────────────────────────────┘
```

### Sidebar
- Background: #1a1a2e hoặc trắng với border
- Menu item active: màu Primary
- Icon + text cho mỗi menu item
- Ẩn/hiện theo role (admin/sales)

### Header mỗi trang
- Tiêu đề trang (lớn, bold)
- Breadcrumb navigation
- Nút action chính (Thêm mới, Xuất Excel...)

---

## 4. COMPONENTS CHUẨN

### Table (danh sách)
- Header: background #F5F5F5, text bold
- Row hover: background #FAFAFA
- Phân trang ở cuối
- Cột action: Sửa (xanh) | Xóa (đỏ)
- Responsive: scroll ngang trên mobile

### Form
- Label trên input
- Required field: dấu * đỏ
- Error: text đỏ bên dưới input, border đỏ
- Button Submit: Primary color, full width hoặc right-aligned
- Button Cancel: outline, bên cạnh Submit

### Filter / Search bar
- Nằm trên table
- Bao gồm: ô tìm kiếm + filter thời gian + các filter khác
- Nút "Tìm kiếm" hoặc auto-search khi gõ

### Filter thời gian (CHUẨN — dùng cho tất cả màn hình)
```
[Hôm nay] [Tuần này] [Tùy chọn: từ ngày ... đến ngày ...]
```
- Mặc định: Hôm nay
- Khi chọn "Tùy chọn": hiện 2 date picker

### Modal
- Overlay mờ phía sau
- Card trắng, border-radius 8px
- Header: tiêu đề + nút đóng X
- Footer: nút Cancel + Confirm

### Badge / Tag
- Status đơn hàng: màu khác nhau
  - Draft: xám
  - Confirmed: xanh dương
  - Shipping: cam
  - Completed: xanh lá
  - Cancelled: đỏ

---

## 5. DANH SÁCH 21 MÀN HÌNH

| # | Màn hình | Route | Role |
|---|---|---|---|
| 1 | Login | /login | Public |
| 2 | Register | /register | Public |
| 3 | Dashboard | / | Admin+Sales |
| 4 | EmployeeList | /employees | Admin |
| 5 | EmployeeForm | /employees/new, /edit/:id | Admin |
| 6 | ProductList | /products | Admin |
| 7 | ProductForm | /products/new, /edit/:id | Admin |
| 8 | CustomerList | /customers | Admin+Sales |
| 9 | CustomerForm | /customers/new, /edit/:id | Admin+Sales |
| 10 | OrderList | /orders | Admin+Sales |
| 11 | OrderForm | /orders/new, /edit/:id | Admin+Sales |
| 12 | InventoryHistory | /inventory | Admin |
| 13 | InventoryImport | /inventory/import | Admin |
| 14 | InventoryExport | /inventory/export | Admin |
| 15 | BulkImport | /import | Admin |
| 16 | CommissionReport | /reports/commissions | Admin+Sales |
| 17 | CTVCommissionReport | /reports/ctv-commissions | Admin+Sales |
| 18 | RevenueReport | /reports/revenue | Admin+Sales |
| 19 | ActivityLog | /logs | Admin |
| 20 | Settings | /settings | Admin |

---

## 6. MÀN HÌNH BÁO CÁO HOA HỒNG CHI TIẾT

### Màn hình 1: Hoa hồng bản thân (/reports/commissions)

```
┌─────────────────────────────────────────────┐
│ Báo cáo hoa hồng                [Xuất Excel]│
├─────────────────────────────────────────────┤
│ [Hôm nay] [Tuần này] [Tùy chọn]  [NV ▼]   │
├──────┬────────┬──────┬────────┬─────┬───────┤
│Mã đơn│ Ngày  │  KH  │Tổng tiền│%HH │Tiền HH│
├──────┼────────┼──────┼────────┼─────┼───────┤
│ ...  │  ...  │ ...  │  ...   │ .. │  ...  │
├──────┴────────┴──────┴────────┴─────┴───────┤
│              Tổng: xxx        Tổng HH: xxx  │
└─────────────────────────────────────────────┘
```
- Click vào đơn → Modal chi tiết từng item

### Màn hình 2: Hoa hồng CTV (/reports/ctv-commissions)

```
┌─────────────────────────────────────────────┐
│ Hoa hồng cộng tác viên         [Xuất Excel]│
├─────────────────────────────────────────────┤
│ [Hôm nay] [Tuần này] [Tùy chọn]            │
├─────────────────────────────────────────────┤
│ 👤 Nguyễn Văn B                            │
├──────┬────────┬────────┬──────┬─────────────┤
│Mã đơn│ Ngày  │Tổng tiền│ %HH │ Tiền HH     │
├──────┼────────┼────────┼──────┼─────────────┤
│ ...  │  ...  │  ...   │ ...  │    ...      │
├──────┴────────┴────────┴──────┴─────────────┤
│                        Tổng từ B: xxx       │
├─────────────────────────────────────────────┤
│ 👤 Trần Thị C                              │
│ ...                                         │
├─────────────────────────────────────────────┤
│                   Tổng tất cả CTV: xxx      │
└─────────────────────────────────────────────┘
```

---

## 7. QUY TẮC GIAO DIỆN CHO AI

```
✅ Clean, ít màu, chuyên nghiệp như Nhanh.vn
✅ Tiếng Việt hoàn toàn — label, placeholder, thông báo
✅ Responsive — chạy tốt trên mobile browser
✅ Filter thời gian mặc định = Hôm nay
✅ Table phải có phân trang
✅ Form phải có validation realtime
✅ Loading state khi fetch data
✅ Empty state khi không có data (hiện icon + text)
❌ Không dùng tiếng Anh trong UI
❌ Không thiết kế phức tạp, nhiều màu loè loẹt
❌ Không bỏ qua responsive
```
