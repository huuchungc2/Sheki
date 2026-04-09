# ROADMAP.md — LỘ TRÌNH PHÁT TRIỂN SHEKI

---

## Phase 1 — Web hoàn chỉnh (Đang làm)

### Mục tiêu
- 1 shop: Sheki
- Tiếng Việt
- Chạy ổn định trên VPS

### Checklist
- [ ] Kiểm tra + fix toàn bộ logic (chạy AUDIT_PROMPT.md)
- [ ] Hoàn thiện báo cáo hoa hồng (2 màn hình)
- [ ] Hoàn thiện báo cáo doanh thu
- [ ] Cài đặt bảng hoa hồng quản lý
- [ ] Cài đặt tỷ lệ hoa hồng CTV
- [ ] Test toàn bộ flow với data thực
- [ ] Deploy lên VPS (Ubuntu/CentOS)
- [ ] Setup Nginx + PM2 + SSL

### Tech hiện tại
- Frontend: React 19 + Vite + TypeScript + Tailwind
- Backend: Node.js + Express
- DB: MySQL
- Deploy: VPS CentOS/Ubuntu

---

## Phase 2 — Mobile App

### Mục tiêu
- iOS + Android
- Reuse toàn bộ backend từ Phase 1

### Giai đoạn 2A — WebView (Ra app nhanh)
- React Native + Expo
- Bọc website vào WebView
- Build APK (Android) + IPA (iOS)
- Thời gian: 1-2 tuần sau khi web xong

### Giai đoạn 2B — React Native (Nâng cấp)
- UI native cho mobile
- Push notification đơn mới
- Camera scan barcode
- Thời gian: 3-4 tuần

### Điều kiện để bắt đầu Phase 2
- [ ] Web deploy xong, có domain thật + HTTPS
- [ ] Web responsive trên mobile browser
- [ ] Backend API stable
- [ ] Có Apple Developer Account ($99/năm) nếu cần iOS
- [ ] Có Google Play Console ($25 một lần)

---

## Phase 3 — Multi-tenant / đa shop

### Đặc tả (đã ghi trong repo)
- **`FEATURE_MULTI_SHOP.md`** — luồng đăng ký không shop, `user_shops`, chọn shop, JWT `shop_id`, danh sách bảng + thứ tự code.

### Mục tiêu
- Nhiều shop dùng chung hệ thống
- Mỗi shop data riêng biệt (Sheki chỉ thấy Sheki)
- (Tuỳ chọn sau) SaaS: bán cho shop khác, subdomain, billing

### Thay đổi kỹ thuật cần làm
- Bảng `shops` + `user_shops` + `shop_id` trên bảng nghiệp vụ (chi tiết trong `FEATURE_MULTI_SHOP.md`)
- Middleware filter theo `shop_id` từ JWT
- (Tuỳ chọn) Subdomain: `sheki.app.vn`, `shop2.app.vn`
- (Tuỳ chọn) Super admin + billing

### Điều kiện để bắt đầu Phase 3
- [ ] Phase 1 + 2 hoàn chỉnh (hoặc ưu tiên nghiệp vụ)
- [ ] Đọc và chốt `FEATURE_MULTI_SHOP.md`
- [ ] Migration + test trên bản sao DB
