# LOGIC_BUSINESS.md — NGHIỆP VỤ CORE HỆ THỐNG SHEKI

> AI PHẢI đọc file này trước khi code bất kỳ thứ gì liên quan đến
> đơn hàng, hoa hồng, lương, báo cáo.
> KHÔNG được đoán mò — phải theo đúng logic dưới đây.

---

## 1. PHÂN QUYỀN

| Role | Quyền |
|---|---|
| Admin | Toàn quyền, xem tất cả |
| Sales | Chỉ xem đơn/KH của mình |

- Sales thấy KH khi: `created_by = user_id` HOẶC `assigned_employee_id = user_id`
- Menu sidebar tự động ẩn/hiện theo role

---

## 2. NHÂN VIÊN & CỘng TÁC VIÊN (CTV)

### Quan hệ
- 1 nhân viên có thể có 1 hoặc nhiều CTV (cũng là nhân viên trong hệ thống)
- Admin tự gán CTV cho nhân viên
- Bảng: `collaborators` (employee_id, collaborator_id)

### Nhóm bán hàng
- 1 nhân viên có thể thuộc 0, 1 hoặc nhiều nhóm
- Bảng: `groups` + `user_groups` (many-to-many)
- Ví dụ nhóm: TNK, SHEKI, KHA...

---

## 3. ĐƠN HÀNG

### Khi tạo đơn
- Phải chọn nhóm bán hàng (để tính hoa hồng quản lý)
- Mỗi sản phẩm có hoa hồng mặc định 10%
- Số tiền hoa hồng per-item = `(unit_price * qty - discount_amount) * commission_rate / 100`
- **Lưu commission_rate tại thời điểm tạo đơn** — không lấy từ config hiện tại khi báo cáo
- Mã đơn: `DH-YYYYMMDD-XXXX`, reset theo ngày

### Khi sửa đơn
- Tính lại hoa hồng theo đúng công thức trên
- Giữ nguyên commission_rate đã lưu

### Khi xóa đơn
- Hoa hồng đơn đó = 0 (trừ đi khỏi tổng)
- Tính lại tổng hoa hồng của nhân viên

### Số lượng
- DECIMAL(10,3) — hỗ trợ 0.5kg, 1.25m
- `stock_qty = available_stock + reserved_stock`
- Validate: số lượng nhập <= available_stock

---

## 4. HOA HỒNG

### Hoa hồng Sale (bản thân)
```
Tiền HH = (tổng tiền sau chiết khấu) × commission_rate
```

### Hoa hồng CTV
- Sale A có CTV là B
- B lên đơn trong cùng nhóm với A
- A được thêm: `tổng tiền đơn của B × ctv_commission_rate`
- `ctv_commission_rate` do Admin cấu hình, lưu tại thời điểm tạo đơn
- **Tính theo % của tổng tiền đơn** (không phải % của hoa hồng B)

Ví dụ:
```
B lên đơn 1,000,000đ
ctv_commission_rate = 3%
A được thêm: 1,000,000 × 3% = 30,000đ
```

### Hoa hồng Quản lý
- Nếu nhân viên có quản lý (admin gán) → quản lý được hưởng thêm
- Tỷ lệ dựa vào bảng cấu hình theo khoảng commission_rate:

| Commission rate của Sale | Quản lý được |
|---|---|
| 10% - 30% | 3% |
| 7% | 2% |
| 4% - 5% | 1% |
| Khoảng khác | Admin tự cấu hình |

- Bảng cấu hình này Admin tự định nghĩa tùy ý
- **Lưu tỷ lệ tại thời điểm tạo đơn**

### Tổng lương nhân viên
```
Lương = Hoa hồng bản thân (tổng từng đơn)
      + Hoa hồng từ CTV (tổng từng đơn của từng CTV trong cùng nhóm)
      + Hoa hồng quản lý (nếu có quản lý)
```

---

## 5. BÁO CÁO HOA HỒNG

### Filter thời gian (áp dụng cho TẤT CẢ màn hình có tìm kiếm)
- Mặc định: ngày hiện tại
- Tùy chọn: tuần hiện tại, khoảng ngày tự chọn

### Màn hình 1 — Báo cáo hoa hồng bản thân
| Cột | Mô tả |
|---|---|
| Mã đơn | DH-YYYYMMDD-XXXX |
| Ngày | Ngày tạo đơn |
| Khách hàng | Tên KH |
| Tổng tiền | Sau chiết khấu |
| % HH | Commission rate |
| Tiền HH | Số tiền hoa hồng |

- Hiển thị tổng cộng ở cuối: Tổng tiền + Tổng hoa hồng
- Nhấn vào từng đơn → xem chi tiết từng item
- Xuất Excel
- Sales chỉ xem của mình, Admin xem tất cả (chọn theo nhân viên)

### Màn hình 2 — Báo cáo hoa hồng CTV
| Cột | Mô tả |
|---|---|
| Tên CTV | Tên nhân viên CTV |
| Mã đơn | Đơn hàng của CTV |
| Tổng tiền | Tổng tiền đơn đó |
| % HH | ctv_commission_rate |
| Tiền HH từ CTV | Số tiền mày được từ đơn đó |

- Nhóm theo từng CTV
- Hiển thị tổng hoa hồng từ CTV ở cuối
- Xuất Excel
- Sales chỉ xem CTV của mình

---

## 6. BÁO CÁO DOANH THU

### Admin xem
- Tổng doanh thu toàn shop
- Tổng hoa hồng đã trả
- Filter theo nhóm bán hàng
- Filter theo thời gian
- Xuất Excel

### Sale xem
- Doanh thu của mình
- Hoa hồng của mình
- Filter theo thời gian

---

## 7. CẤU HÌNH (Admin only)

| Cấu hình | Mô tả |
|---|---|
| Tỷ lệ hoa hồng CTV | % tính trên tổng tiền đơn |
| Bảng hoa hồng quản lý | Khoảng % → tỷ lệ quản lý |
| Nhóm bán hàng | Thêm/sửa/xóa nhóm |
| Gán CTV | Gán CTV cho nhân viên |
| Gán quản lý | Gán quản lý cho nhân viên |

---

## 8. QUY TẮC QUAN TRỌNG CHO AI

### Lưu tỷ lệ tại thời điểm tạo đơn
```
❌ SAI: Lấy commission_rate từ config hiện tại khi tính báo cáo
✅ ĐÚNG: Lưu commission_rate vào order_items khi tạo/sửa đơn
```

### Hoa hồng CTV tính trên tổng tiền đơn
```
❌ SAI: A được 3% của hoa hồng B (3% × 100k = 3k)
✅ ĐÚNG: A được 3% của tổng tiền đơn B (3% × 1,000k = 30k)
```

### Xóa đơn
```
❌ SAI: Tính lại từ đầu toàn bộ
✅ ĐÚNG: Trừ đi hoa hồng của đơn bị xóa
```
