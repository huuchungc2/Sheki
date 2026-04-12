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
- **Giao diện đơn (Sales):** Dropdown **“Quản lý (nhận HH trực tiếp)”** chỉ hiển thị quản lý **thuộc đúng nhóm bán hàng** đã chọn (quan hệ `collaborators` + quản lý có trong `user_groups` của nhóm đó). **Mặc định** chọn quản lý đầu tiên trong danh sách sau khi chọn nhóm; để trống “Tôi nhận HH” = HH cho **người tạo đơn** (chỉnh % từng dòng); chọn quản lý = HH trực tiếp cho quản lý (cùng % quản lý, cột Hoa hồng chỉ hiển thị).
- **Admin:** Không dùng dropdown này; đơn Admin tạo/sửa luôn theo kiểu **bán trực tiếp** (`sales`). API **từ chối** `source_type=collaborator` nếu user là Admin.
- **Hai kiểu nguồn đơn (trường `orders.source_type`):**
  - **`sales` (mặc định):** `salesperson_id` = người tạo đơn — **HH chỉ tính cho người đó** (không có HH quản lý/override).
  - **`collaborator`:** Đơn **ghi nhận quản lý là người bán** — `salesperson_id` = **quản lý** (nhận HH trực tiếp). `collaborator_user_id` **tùy chọn**: chỉ ghi khi cần biết CTV nguồn (ví dụ CTV tạo đơn cho quản lý); **quản lý tự tạo đơn** có thể để **NULL** vì CTV không hưởng HH trên loại đơn này. Nếu có `collaborator_user_id` thì cặp phải khớp `collaborators`. **Không** tính HH override kiểu “CTV tự bán” trên đơn này.
- Phải chọn nhóm bán hàng (để tính hoa hồng quản lý / filter nhóm)
- Mỗi sản phẩm có hoa hồng mặc định 10%
- Số tiền hoa hồng per-item = `(unit_price * qty - discount_amount) * commission_rate / 100`
- **Lưu commission_rate tại thời điểm tạo đơn** — không lấy từ config hiện tại khi báo cáo
- Mã đơn: `DH-YYYYMMDD-XXXX`, reset theo ngày

### Khi sửa đơn
- Đổi giữa **bán trực tiếp** và **ghi nhận quản lý** → server phải **tính lại** `order_items` (HH dòng) và `commissions` theo loại đơn mới; nếu request không gửi lại `items` nhưng có `source_type`, backend tự lấy dòng hiện có để tính lại.
- Tính lại hoa hồng theo đúng công thức trên
- Giữ nguyên commission_rate đã lưu (trừ khi đổi kiểu nguồn đơn: bỏ “ghi nhận quản lý” thì tính lại % HH dòng như lúc tạo đơn `sales`)
- Khi sửa đơn (Sales): có thể **chọn quản lý hoặc không chọn**:
  - Không chọn quản lý → `source_type=sales`, HH chỉ cho A (`salesperson_id`)
  - Chọn quản lý → `source_type=collaborator`, HH direct cho quản lý (`salesperson_id`), `collaborator_user_id` = A
- **Admin** sửa đơn: form không có dropdown quản lý.

### Khi xóa đơn
- Hoa hồng đơn đó = 0 (trừ đi khỏi tổng)
- Tính lại tổng hoa hồng của nhân viên

### Số lượng
- DECIMAL(10,3) — hỗ trợ 0.5kg, 1.25m
- `stock_qty = available_stock + reserved_stock`
- Validate: số lượng nhập <= available_stock

### Phí vận chuyển, cọc, thu khách, shop thu (bắt buộc mỗi đơn)

**Ký hiệu:**
- **Tạm tính** = **Giá trị đơn** (cùng một số trên UI) = tổng tiền hàng **sau chiết khấu dòng** (`orders.subtotal` — chưa gồm ship). Không dùng nhãn “Giá trị đơn” cho thu khách hay tổng thanh toán.
- **ship** = số tiền phí vận chuyển (luôn nhập / lưu để đối soát).
- **cọc** = tiền đặt cọc khách đã trả trước (trừ vào số phải thu).

**Ai trả phí ship:** mỗi đơn phải chọn một trong hai (mặc định **khách trả**):
| Chế độ | Thu khách | Shop thu |
|--------|-----------|----------|
| **Shop trả ship** | Tạm tính − ship − cọc | Tạm tính − ship − cọc |
| **Khách trả ship** (mặc định) | Tạm tính + ship − cọc | Tạm tính − cọc |

- Khi **shop trả ship**: số **thu khách** và **shop thu** trùng nhau (cùng công thức): đã trừ ship (shop gánh) và trừ cọc.
- Khi **khách trả ship**: khách trả thêm ship nên **thu khách** = tạm tính + ship − cọc; **shop thu** chỉ phản ánh phần hàng (tạm tính − cọc), không cộng ship vào doanh thu shop nếu ship là thu hộ chuyển đi.

**UI / lưu trữ:** Form đơn cần: chọn shop trả / khách trả ship; nhập phí ship; nhập cọc; hiển thị (hoặc lưu) **Thu khách** và **Shop thu** theo bảng trên — không tự đoán công thức khác.

### Tiền NV chịu (chênh lệch thu — trừ HH sau)

Trường hợp: theo đơn, **số phải thu từ khách** (ví dụ sau ship/cọc — cùng logic **Thu khách**) là **1.000.000đ**, nhưng **thực tế khách chỉ trả 900.000đ**; **100.000đ** còn lại do **nhân viên bán hàng tự chịu** (bù để chốt đơn).

- **Tên gọi trên UI (đề xuất):** **Tiền NV chịu** (hoặc *Chênh lệch NV chịu* nếu cần nhấn mạnh phần “thiếu thu”).
- **Ý nghĩa:** khoản NV **tự bỏ ra** tương ứng phần **khách không trả đủ** so với số thu lý thuyết; **không** gọi là “giảm giá đơn” thuần túy nếu mục đích là bù từ phía NV.
- **Xử lý sau:** số **Tiền NV chịu** (theo đơn) **cộng dồi để trừ vào tổng hoa hồng** NV ở kỳ quyết toán (báo cáo HH / settlement — triển khai riêng).
- **Lưu DB:** `orders.salesperson_absorbed_amount` — **không** làm đổi công thức **Thu khách** / **Shop thu** / `total_amount` (thu khách).
- **Danh sách đơn — cột Lương (theo đơn, NV phụ trách):** `Hoa hồng direct trên đơn (người bán) + Ship KH Trả − Tiền NV chịu`. **Ship KH Trả** = `shipping_fee` khi `ship_payer` = khách, = **0** khi shop trả ship. (HH quản lý từ đơn CTV nằm ở dòng HH override trên báo cáo, không cộng vào cột này của đơn CTV.)
- **Admin xem 1 nhân viên:** `/reports/commissions/{user_id}` — cùng KPI + bảng đơn như «Hoa hồng của tôi»; API `GET /commissions/orders?user_id=` (không dùng id đăng nhập Admin).
- **Báo cáo hoa hồng Admin — danh sách nhân viên:** `GET /reports/salary` chỉ trả về NV có **doanh số kỳ** (`SUM(total_amount)` đơn làm `salesperson` trong tháng/năm, theo nhóm nếu lọc) **> 0** — không liệt kê toàn bộ Sales không phát sinh đơn.
- **Báo cáo hoa hồng — bảng chi tiết theo đơn:** Sales thấy cả dòng **direct** (đơn mình bán) và **override** (HH từ CTV — đơn do CTV lên, quản lý nhận HH). Cột **Lương** = **tiền HH của dòng đó** + **một lần** (Ship KH Trả − tiền NV chịu của đơn) **chỉ khi** `commissions.user_id` = `orders.salesperson_id` và là **dòng commission gốc** đầu tiên của **người đó** trên đơn (không áp ship/NV cho dòng HH override của quản lý trên đơn CTV). **Tổng Ship KH Trả / NV chịu** (kỳ) với Sales chỉ cộng các đơn mà NV là **`salesperson_id`** (giống Dashboard), không lấy ship/NV từ đơn chỉ có override. **Tổng lương (kỳ)** = **tổng hoa hồng** (HH bán hàng + HH từ CTV / override) + **tổng** Ship KH Trả − **tổng** tiền NV chịu.
- **Admin — bảng Hoa hồng nhân viên (`/reports/salary`):** **Ship KH Trả** và **Tiền NV chịu** chỉ cộng theo các đơn mà NV đó là **`orders.salesperson_id`**. Người chỉ nhận **HH override** (quản lý) **không** nhận ship/NV của đơn CTV — **Tổng lương** = Tổng HH (direct + HH từ CTV) + Ship KH Trả − NV chịu (theo đơn mình phụ trách).
- **Tổng quan (`/reports/dashboard`):** Tháng hiện tại — **Ship KH Trả**, **Tiền NV chịu**, **Tổng lương** (tổng HH tháng + Ship KH Trả − NV); Admin = toàn hệ thống; Sales = đơn `salesperson_id` = mình; đơn `cancelled` không tính ship/NV.

---

## 4. HOA HỒNG

### Hoa hồng Sale (bản thân)
```
Tiền HH = (tổng tiền sau chiết khấu) × commission_rate
```
- **Quyết toán:** khi đơn có **Tiền NV chịu** (phần khách không trả đủ, NV tự bỏ ra), kỳ quyết toán **trừ tổng HH khả dụng** tương ứng (theo quy tắc công ty — chi tiết khi làm module trừ HH).

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

### Hoa hồng Quản lý (override) — ĐÃ TẮT
- Theo rule hiện tại: **không chọn quản lý → chỉ A**, **chọn quản lý → chỉ quản lý** ⇒ **không dùng** cơ chế “override quản lý” nữa.

### Lương / Tổng lương (kỳ)
```
Lương (theo nhân viên, kỳ) = Tổng HH bán hàng (direct)
                           + Tổng HH từ CTV (override từ đơn CTV)
                           + Tổng Ship KH Trả (theo đơn mình là salesperson_id)
                           − Tổng tiền NV chịu (theo đơn mình là salesperson_id)

Tổng lương (cùng công thức tổng kỳ) = Tổng hoa hồng + Tổng Ship KH Trả − Tổng tiền NV chịu
```
(trong đó **tổng hoa hồng** = direct + HH từ CTV; ship/NV chỉ gắn đơn phụ trách, không gắn vào tiền override của quản lý trên đơn CTV.)

**Vì sao «HH từ CTV» có thể = 0?** — Trên UI đây là **hoa hồng override** dành cho **quản lý** (`commissions.type = 'override'`) khi CTV lên đơn **ghi nhận quản lý** và hệ thống tạo được dòng override (cặp `collaborators` sales↔CTV, quản lý cùng nhóm đơn, có tier trong `commission_tiers`). Tiền hoa hồng của **chính CTV** khi bán nằm ở **HH bán hàng** (direct), không nằm ở ô «HH từ CTV». Tài khoản chỉ là CTV (không nhận override) thì ô này **0** là đúng.

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
