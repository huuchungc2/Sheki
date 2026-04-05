# PROMPT TEMPLATE — Dùng với Opencode

> Copy đoạn phù hợp, paste vào đầu mỗi session opencode

---

## 🟢 Prompt mở session mới (dùng hàng ngày)

```
Đọc CLAUDE.md, TODO.md, RULES.md trước khi làm bất cứ điều gì.

Sau khi đọc xong, làm task đang ở mục "ĐANG LÀM" trong TODO.md.

Nhớ: Sau khi xong phải cập nhật TODO.md + CHANGELOG.md và báo cáo theo format trong CLAUDE.md.
```

---

## 🐛 Prompt fix bug

```
Đọc CLAUDE.md và RULES.md.

Bug cần fix: [mô tả bug]
File bị lỗi: [tên file]
Cách tái hiện: [các bước]

Yêu cầu:
- Báo nguyên nhân trước khi fix
- Chỉ sửa đúng chỗ, không rewrite file khác
- Sau khi fix: update CHANGELOG.md
```

---

## 🎨 Prompt thay đổi UI

```
Đọc CLAUDE.md và RULES.md.

Màn hình cần sửa: [tên màn hình] — file: [tên file]
Thay đổi: [mô tả cụ thể]

KHÔNG được đụng vào: [list file giữ nguyên]

Làm 1 component nhỏ trước, báo tao xem rồi mới apply rộng.
```

---

## ➕ Prompt thêm tính năng mới

```
Đọc CLAUDE.md, RULES.md, và FEATURE_[tên].md.

Tính năng mới: [tên]

Thứ tự làm:
1. Backend: API + DB migration
2. Frontend: UI + kết nối API
3. Update TODO.md + CHANGELOG.md

Chỉ làm backend trước, báo tao xem rồi mới làm frontend.
```

---

## 🚀 Prompt deploy

```
Đọc CLAUDE.md.

Task: Deploy lên VPS Ubuntu/CentOS
Server: [IP hoặc domain]

Cần:
1. Setup Nginx config
2. PM2 để chạy Node.js backend
3. Build frontend (npm run build)
4. SSL với Let's Encrypt

Tạo file deploy.sh và nginx.conf, giải thích từng bước.
```

---

## 📱 Prompt làm mobile (sau khi web xong)

```
Đọc CLAUDE.md và FEATURE_MOBILE.md.

Task: Tạo React Native WebView app

Web URL: [https://erp.velocity.vn]

Cần:
1. Setup Expo project trong folder /mobile
2. WebView trỏ đến web URL
3. Splash screen + App icon
4. Hướng dẫn build APK Android

Bắt đầu với Giai đoạn 1 (WebView) trước.
```
