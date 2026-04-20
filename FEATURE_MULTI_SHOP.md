# FEATURE: Đa shop (Multi-shop / tenant)

> **Trạng thái:** ĐANG TRIỂN KHAI (đã có migration + backend auth/middleware/routes + FE switch shop).  
> Khi làm tiếp: follow **thứ tự giai đoạn** cuối tài liệu.

---

## 1. Mục tiêu

- Hiện tại toàn bộ dữ liệu coi như **một shop** (Sheki).
- Mở rộng: nhiều shop **A, B, C…** — **dữ liệu tách biệt** (KH, đơn, SP, kho, báo cáo… không lẫn).
- Một **user** có thể thuộc **nhiều shop** với **vai trò có thể khác nhau** từng shop.

---

## 2. Khái niệm

| Khái niệm | Ý nghĩa |
|-----------|---------|
| **Shop** | Đơn vị kinh doanh (tenant). Có bảng `shops` (id, tên, mã, is_active, …). |
| **User** | Tài khoản đăng nhập (`users`) — **không bắt buộc** thuộc shop nào ngay sau đăng ký. |
| **Gán shop** | Quan hệ nhiều-nhiều qua bảng **`user_shops`**: `user_id`, `shop_id`, `role_id` (hoặc tương đương quyền **theo từng shop**). |
| **Shop hiện tại** | Sau khi đăng nhập, user **chọn một shop** (hoặc nhớ shop lần trước). Mọi API đọc/ghi dùng **`shop_id` trong context** (JWT / session). |

### 2.1 Super Admin và Admin shop (Sheki hay shop mới — cùng một logic)

- **Admin của một shop** (kể cả shop Sheki `id=1` hay shop do super admin tạo ra): **không đổi** cách hoạt động — vẫn là user có dòng **`user_shops`** với **`role_id` = admin** cho **đúng shop đó**, JWT mang **`shop_id`** tương ứng, `can_access_admin` / menu / API **giống nhau** (lọc theo `shop_id` của shop đang làm việc).
- **Super admin** là lớp **tạo shop** và **tạo một hoặc nhiều tài khoản admin mới** cho shop đó (insert `users` + `user_shops` role admin). Có thể thêm admin sau qua cùng luồng «thêm admin» cho shop đã có. Trên màn **Quản lý shop** (`/admin/shops`), super admin có thể **đặt lại mật khẩu** cho từng admin shop đã tồn tại (nút «Đặt lại MK»; API `PATCH /shops/:shopId/admins/:userId/password`). Sau đó **admin shop** đăng nhập và quản lý nhân viên / nghiệp vụ **giống admin shop Sheki** — super admin không thay admin shop trong vận hành hàng ngày.
- **UI tạo shop:** mặc định **bắt buộc ít nhất một tài khoản quản trị** (trừ khi tick «Chỉ tạo shop không kèm quản trị»). User chỉ thành **Sales** khi được thêm từ **màn Nhân viên** (admin shop) hoặc đổi `user_shops.role_id` — không phải do luồng tạo admin trên màn này. API trả `role_code: admin` trong `admins_created` để đối soát.

---

## 3. Đăng ký (Register)

- User **đăng ký không chỉ định shop** → **chưa có dòng** trong `user_shops`.
- User đó **chưa vào được** màn hình nghiệp vụ (đơn, kho, báo cáo…) cho đến khi được gán shop.
- Màn hợp lệ khi chưa có shop: thông báo *“Tài khoản chưa được gán shop — liên hệ quản trị”*, có thể cho **đổi mật khẩu / profile** tối thiểu.

---

## 4. Admin gán user vào shop

- **Admin shop** (màn Nhân viên / API theo shop): tìm user theo **email** hoặc **tên đăng nhập**, gán role (sales, …) **trong shop của admin đó**.
- **Super admin** (màn Quản lý shop): chỉ **tạo shop** và **chỉ định admin** cho shop mới; không thay luồng gán nhân viên của admin shop (mục 2.1).
- Thao tác: **Thêm vào shop X** + chọn **role trong shop đó** (insert/update `user_shops`).
- Có thể **gỡ** user khỏi một shop (xóa dòng `user_shops`) — cần rule: không gỡ nếu còn ràng buộc (tùy nghiệp vụ).

---

## 5. Đăng nhập & chọn shop

1. **Login** thành công → trả về danh sách **shop mà user có quyền** (từ `user_shops`).
2. Nếu **0 shop** → flow mục 3 (không vào app nghiệp vụ).
3. Nếu **1 shop** → có thể **tự gắn `shop_id`** vào JWT luôn (không cần màn chọn).
4. Nếu **≥ 2 shop** → **màn chọn shop** hoặc **dropdown đổi shop** trong app.
5. **Đổi shop** trong app → cấp lại token (hoặc endpoint `POST /auth/switch-shop`) với **`shop_id` mới**.

---

## 6. JWT / phiên làm việc

Payload tối thiểu cần có (sau khi đã chọn shop):

- `user_id`
- **`shop_id`** (shop đang làm việc)
- `role_id` **trong shop đó** (lấy từ `user_shops` cho cặp user + shop)
- Các cờ hiện có nếu vẫn dùng: `can_access_admin`, `scope_own_data` — **theo role của shop hiện tại**

Mọi query INSERT/UPDATE/SELECT nghiệp vụ phải có **`WHERE shop_id = :current_shop`** (hoặc join đúng bảng cha có `shop_id`).

---

## 7. Phân quyền

- **Quyền thực tế khi dùng app:** lấy từ **`user_shops.role_id`** (cặp user + shop hiện tại).
- Bảng `roles` có thể **dùng chung** định nghĩa (admin, sales…) — không nhất thiết nhân bản theo shop trừ khi sau này cần role tùy biến từng shop.
- `users.role_id` toàn cục (nếu còn): cần **quyết định migration** — ưu tiên nguồn sự thật là **`user_shops`** khi đã bật multi-shop.

---

## 8. Nghiệp vụ có thể phải đổi theo shop

- **Mã đơn `DH-YYYYMMDD-XXXX`:** sequence **reset theo ngày** nên tính **theo `shop_id`** (mỗi shop một dãy số).
- **Báo cáo / dashboard:** luôn filter `shop_id`.
- **Nhóm BH (`groups`):** thuộc shop (thêm `shop_id`).
- **Trùng SĐT/email KH giữa shop:** vẫn cho phép **khác shop** trùng (giữ rule cũ **trong cùng shop** nếu có).

---

## 9. Danh sách bảng cần `shop_id` (khi implement)

**Bảng mới:** `shops`.

**Bảng nghiệp vụ (thêm cột `shop_id` + FK + index):**  
`categories`, `warehouses`, `customers`, `products`, `orders`, `order_items` (hoặc chỉ qua `orders`), `warehouse_stock`, `stock_movements`, `commissions`, `loyalty_points`, `role_permissions` (nếu cấu hình theo shop), `activity_logs`, `groups`, `user_groups`, `commission_tiers`, `collaborators`, `return_requests`, `return_request_items`, `returns`, `return_items`, `commission_adjustments`.

**Bảng nối:** `user_shops` (`user_id`, `shop_id`, `role_id`, `created_at`, unique `(user_id, shop_id)`).

**Lưu ý:** `roles` có thể giữ master global; `users` không nhất thiết có `shop_id` nếu đã dùng `user_shops` là nguồn chính.

Chi tiết cột từng bảng làm khi viết migration SQL.

---

## 10. Migration dữ liệu cũ

1. Tạo shop mặc định **Sheki** (hoặc tên đã thống nhất).
2. Gán toàn bộ bản ghi hiện có `shop_id = id shop Sheki`.
3. Với mỗi user hiện tại: insert `user_shops` (user_id, shop Sheki, role_id lấy từ `users.role_id` hoặc tương đương).

---

## 11. Checklist khi code backend

- [ ] Middleware: mọi route nghiệp vụ đọc `shop_id` từ JWT, từ chối nếu thiếu/không khớp `user_shops`.
- [ ] Không tin `shop_id` từ body query tùy tiện — phải khớp quyền user.
- [ ] Rà soát **tất cả** file trong `backend/routes/` + `services/`.

---

## 12. Checklist khi code frontend

- [ ] Sau login: nếu nhiều shop → UI chọn shop; lưu token mới.
- [ ] Header/sidebar: hiển thị **tên shop hiện tại**; nút đổi shop.
- [ ] Mọi gọi API gửi context shop (đã nằm trong JWT thì đủ nếu BE chỉ đọc token).

---

## 13. Thứ tự triển khai gợi ý (tránh sửa hàng loạt một lần sai)

1. **DB:** `shops` + `user_shops` + migration Sheki + `shop_id` từng bảng (có thể chia nhiều file migration).
2. **Auth:** login trả danh sách shop; endpoint switch-shop; JWT có `shop_id`.
3. **Middleware** + sửa từng nhóm route (orders → customers → products → …).
4. **FE:** chọn shop + đổi shop.
5. **Admin UI:** gán user vào shop theo email/username.

---

## 14. Tài liệu liên quan

- `plan.md` — mục đa shop (tóm tắt + link file này)
- `ROADMAP.md` — Phase 3 multi-tenant (mục tiêu tương thích)
