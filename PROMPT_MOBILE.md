# PROMPT MOBILE — React Native native (ít token)

> Paste vào đầu mỗi session khi mở agent mới làm mobile.

---

## 🟢 Prompt gốc (RN native, tối ưu token)

```text
Bạn là AI coding agent trong Cursor.

Mục tiêu: Làm MOBILE APP React Native (Expo + TypeScript) theo docs trong repo, ưu tiên ít token.

BẮT BUỘC:
- Chỉ đọc đúng 2 file trước: FEATURE_MOBILE_RN.md và TODO.md.
- Không tự khám phá repo. Nếu cần file khác thì hỏi 1 câu xin phép rồi dừng.
- Mỗi session chỉ làm 1 task nhỏ, hoàn thành end-to-end.
- Chỉ sửa/tạo file trong folder mobile/.
- Không giải thích dài, tối đa 10 dòng/response.
- Sau khi xong task: update TODO.md + CHANGELOG.md đúng format repo.

FILES ĐƯỢC PHÉP SỬA:
- mobile/[...]
- TODO.md
- CHANGELOG.md

Đầu ra:
- List file đã sửa
- 1-2 lệnh chạy/test trên Android
- Không viết tài liệu thừa

TASK: <GHI 1 DÒNG RÕ RÀNG>
Definition of done:
- <2-4 gạch đầu dòng>
API_URL: <https://domain/api hoặc http://ip:3000/api>
```

---

## 🧩 TASK mẫu (copy/paste để khỏi nghĩ nhiều)

### 1) Setup project + nền tảng auth/api/utils/types

```text
TASK: Setup Expo RN trong mobile/ + khung auth/api/utils/types.
Definition of done:
- Tạo project Expo TS trong mobile/
- Có lib/constants.ts (API_URL), lib/api.ts (fetch wrapper), lib/auth.ts (SecureStore)
- Có root navigation: login → tabs (placeholder)
- Chạy được: npx expo start (Android)
API_URL: <...>
```

### 2) Màn Login native

```text
TASK: Implement màn Login native + lưu token SecureStore + verify /auth/me.
Definition of done:
- Login bằng username/email + password
- Success: lưu token, gọi /auth/me lấy user, vào tabs
- Fail: hiện lỗi tiếng Việt, không crash
- 401: xóa token, về login
API_URL: <...>
```

### 3) Tab Orders list

```text
TASK: Implement OrderList (FlatList) + search debounce + filter status.
Definition of done:
- FlatList + pull-to-refresh + load more
- Search hỗ trợ IME tiếng Việt (composition) + debounce 350ms
- Gọi GET /orders?page&limit&search&status
- Empty/loading/error state chuẩn
API_URL: <...>
```

### 4) Order detail

```text
TASK: Implement OrderDetail: xem chi tiết + đổi status.
Definition of done:
- GET /orders/:id render thông tin chính + items
- Đổi status (PUT /orders/:id hoặc endpoint hiện có) + refresh
- Không crash khi thiếu field/null
API_URL: <...>
```
