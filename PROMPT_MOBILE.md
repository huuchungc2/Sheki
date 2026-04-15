# PROMPT MOBILE — Dùng với Cursor Agent

> Paste vào đầu mỗi session khi làm màn hình mobile mới

---

## 🟢 Prompt mở session mobile

```
Đọc các file sau trước khi làm bất cứ điều gì:
- CLAUDE.md
- FEATURE_MOBILE_RN.md
- mobile/src/theme/colors.ts

Sau khi đọc, làm màn hình: [TÊN MÀN HÌNH]

Quy tắc bắt buộc:
- Dùng StyleSheet.create(), KHÔNG inline style
- Dùng SecureStore thay localStorage
- Mọi API call qua src/config/api.ts
- Loading + Empty state bắt buộc
- Text phải trong <Text>, không để text raw
- Dùng SafeAreaView cho màn hình ngoài cùng

Sau khi xong: update TODO.md + CHANGELOG.md
```

---

## 📱 Prompt tạo màn hình List (danh sách)

```
Đọc CLAUDE.md và FEATURE_MOBILE_RN.md.

Màn hình: [Tên]Screen.tsx trong mobile/src/screens/
API endpoint: GET /api/[endpoint]

Cần có:
- FlatList với pull-to-refresh
- Search bar ở trên (nếu cần)
- Loading skeleton hoặc ActivityIndicator
- Empty state: icon + text "Chưa có dữ liệu"
- Mỗi row: tap → navigate sang DetailScreen

Style theo colors.ts — KHÔNG hardcode màu.
```

---

## 📝 Prompt tạo màn hình Form (tạo/sửa)

```
Đọc CLAUDE.md và FEATURE_MOBILE_RN.md.

Màn hình: [Tên]CreateScreen.tsx trong mobile/src/screens/
API: POST /api/[endpoint]

Cần có:
- KeyboardAvoidingView
- ScrollView để scroll khi bàn phím lên
- Validation realtime
- Loading khi submit
- Alert thành công / thất bại sau submit
- Nút Hủy + Lưu ở cuối form

Dùng colors.ts cho màu sắc.
```

---

## 🐛 Prompt fix bug mobile

```
Đọc FEATURE_MOBILE_RN.md và CLAUDE.md.

Bug: [mô tả]
File: mobile/src/screens/[tên file]
Platform: Android

Yêu cầu:
- Báo nguyên nhân trước khi fix
- Chỉ sửa đúng chỗ
- Không động vào file khác
```

---

## 🚀 Prompt setup lần đầu

```
Đọc FEATURE_MOBILE_RN.md.

Task: Setup project Expo React Native trong folder mobile/

Làm theo thứ tự:
1. Tạo project: npx create-expo-app mobile --template blank-typescript
2. Cài dependencies theo danh sách trong FEATURE_MOBILE_RN.md mục 10
3. Copy các file đã có: App.tsx, src/theme/colors.ts, src/config/api.ts
4. Tạo placeholder screens cho 4 tab: Dashboard, OrderList, CustomerList, Profile
5. Chạy: npx expo start

Sau khi xong báo tao các bước tiếp theo.
```
