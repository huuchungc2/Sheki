# FEATURE_MOBILE_RN.md — React Native App (Android)

> Đọc file này trước khi làm bất cứ thứ gì liên quan đến mobile.
> Backend API dùng chung hoàn toàn với web — KHÔNG viết lại logic.

---

## 1. Tổng quan

- **Platform:** Android (iOS sau nếu cần)
- **Framework:** Expo (Managed Workflow) + React Native
- **Ngôn ngữ:** TypeScript
- **Navigation:** React Navigation v6 (Stack + Bottom Tabs)
- **State:** React hooks (useState, useContext) — không dùng Redux
- **Auth:** JWT lưu vào `expo-secure-store` (KHÔNG dùng AsyncStorage cho token)
- **API:** Ưu tiên domain + HTTPS (khuyến nghị). Dev có thể dùng IP tạm thời.
- **Styling:** StyleSheet của React Native — follow design system dưới

---

## 2. Design System (adapt từ web)

```
Màu sắc:
  Primary:      #2563EB  (blue-600 — theo code web thực tế)
  Primary Dark: #1D4ED8  (blue-700)
  Danger:       #DC2626  (red-600)
  Success:      #16A34A  (green-600)
  Warning:      #D97706  (amber-600)
  BG:           #F8FAFC  (slate-50)
  BG Card:      #FFFFFF
  Border:       #E2E8F0  (slate-200)
  Text:         #0F172A  (slate-900)
  Text Sub:     #64748B  (slate-500)
  Text Muted:   #94A3B8  (slate-400)

Border radius:
  Small:  8
  Medium: 12
  Large:  16
  XLarge: 24

Font weight:
  Normal: '400'
  Medium: '500'
  Bold:   '700'
  Black:  '900'

Shadow (Android elevation):
  Card: elevation 2
  Modal: elevation 8
  Button: elevation 3
```

---

## 3. Cấu trúc thư mục

```
mobile/
├── app/                        # Màn hình
│   ├── (auth)/
│   │   └── login.tsx
│   ├── (tabs)/
│   │   ├── _layout.tsx         # Bottom tab navigator
│   │   ├── index.tsx           # Dashboard
│   │   ├── orders.tsx          # Danh sách đơn
│   │   ├── customers.tsx       # Danh sách KH
│   │   └── profile.tsx         # Thông tin cá nhân + đổi MK
│   ├── orders/
│   │   ├── new.tsx             # Tạo đơn mới
│   │   └── [id].tsx            # Chi tiết / sửa đơn
│   ├── customers/
│   │   ├── new.tsx
│   │   └── [id].tsx
│   └── _layout.tsx             # Root layout (auth check)
├── components/
│   ├── ui/
│   │   ├── Button.tsx
│   │   ├── Input.tsx
│   │   ├── Card.tsx
│   │   ├── Badge.tsx
│   │   └── LoadingSpinner.tsx
│   └── shared/
│       ├── Header.tsx
│       └── EmptyState.tsx
├── lib/
│   ├── api.ts                  # Fetch wrapper (gọi backend)
│   ├── auth.ts                 # Login, logout, getUser
│   ├── utils.ts                # formatCurrency, formatDate
│   └── constants.ts            # API_URL, màu sắc, sizes
├── hooks/
│   ├── useAuth.ts
│   └── useApi.ts
├── types/
│   └── index.ts                # Order, Customer, User types
├── app.json
├── package.json
└── tsconfig.json
```

---

## 4. Màn hình ưu tiên (làm theo thứ tự)

### Giai đoạn 1 — Core (bắt buộc)
| Màn hình | File | Mô tả |
|---|---|---|
| Login | `app/(auth)/login.tsx` | Đăng nhập bằng username + password (cùng API web: chỉ username) |
| Dashboard | `app/(tabs)/index.tsx` | KPI tóm tắt: doanh thu hôm nay, số đơn, HH |
| OrderList | `app/(tabs)/orders.tsx` | Danh sách đơn, filter, search |
| OrderDetail | `app/orders/[id].tsx` | Xem chi tiết đơn, đổi status |
| CustomerList | `app/(tabs)/customers.tsx` | Danh sách KH |
| Profile | `app/(tabs)/profile.tsx` | Thông tin user + đổi mật khẩu + logout |

### Giai đoạn 2 — Quan trọng (làm sau)
| Màn hình | File | Mô tả |
|---|---|---|
| OrderForm (tạo mới) | `app/orders/new.tsx` | Tạo đơn mới (form phức tạp) |
| CustomerForm | `app/customers/new.tsx` | Thêm KH |
| CommissionReport | `app/(tabs)/reports.tsx` | Báo cáo HH của bản thân |

---

## 5. API Endpoints cần dùng

```
BASE_URL =
  - Production: `https://<domain>/api` (khuyến nghị)
  - Dev: `http://[LAN_IP_OR_VPS_IP]:3000/api` (chỉ dùng tạm)

Auth:
  POST   /auth/login              body: {username, password}
  GET    /auth/me                 header: Bearer token

Dashboard:
  GET    /reports/dashboard       KPI tổng quan

Orders:
  GET    /orders                  ?page=1&limit=20&search=&status=
  GET    /orders/:id
  POST   /orders
  PUT    /orders/:id
  PATCH  /orders/:id/status       body: {status}

Customers:
  GET    /customers               ?page=1&limit=20&search=
  GET    /customers/:id
  POST   /customers
  PUT    /customers/:id

Commissions:
  GET    /commissions/report      ?from=&to=&userId=
```

---

## 6. Auth Flow

```
App khởi động
  → Đọc token từ SecureStore
  → Nếu có token: gọi GET /auth/me để verify
    → Valid: vào app (tabs)
    → Invalid/expired: xóa token, về Login
  → Nếu không có token: về Login

Login thành công:
  → Lưu token vào SecureStore ('auth_token')
  → Lưu user object vào SecureStore ('auth_user')
  → Navigate vào app (tabs)

Logout:
  → Xóa SecureStore
  → Navigate về Login
```

---

## 7. HTTP Config — Fix cleartext (tạm thời cho dev)

Vì VPS dùng IP không có HTTPS, cần thêm vào `app.json`:

```json
{
  "expo": {
    "android": {
      "usesCleartextTraffic": true
    }
  }
}
```

**Lưu ý:** Khi có domain + HTTPS thật thì xóa dòng này đi.

---

## 7.1 ENV config (khuyến nghị)

- Không hardcode API URL trong code.
- Dùng `app.json` / `expo.extra` hoặc `.env` (Expo) để cấu hình `API_URL` theo môi trường (dev/staging/prod).

---

## 7.2 Auth & bảo mật (khuyến nghị tối thiểu)

- Token JWT lưu SecureStore key: `auth_token`
- Không log token ra console
- Khi 401: xoá token + điều hướng về Login

---

## 7.3 UX quan trọng trên mobile

- **Search input**: phải hỗ trợ IME tiếng Việt (composition) + debounce khi gọi API.
- **List**: dùng `FlatList` + `keyExtractor`, hỗ trợ pull-to-refresh.
- **Offline**: hiển thị trạng thái “Mất kết nối” thay vì crash/treo.

---

## 8. Packages cần cài

```bash
npx create-expo-app mobile --template blank-typescript
cd mobile

npx expo install expo-secure-store
npx expo install expo-status-bar
npm install @react-navigation/native @react-navigation/bottom-tabs @react-navigation/stack
npx expo install react-native-screens react-native-safe-area-context
npm install react-native-vector-icons
npx expo install @expo/vector-icons
```

---

## 9. Bottom Tab Navigation

```
[📊 Dashboard] [📋 Đơn hàng] [👥 Khách hàng] [👤 Tôi]
```

- Admin thấy thêm tab Báo cáo (sau)
- Sales chỉ thấy 4 tab cơ bản

---

## 10. OrderList — Spec chi tiết

```
Header: "Đơn hàng" + nút [+ Tạo đơn] (nếu có quyền)
Search bar: tìm theo mã đơn, tên KH
Filter status: Tất cả | Nháp | Đã xác nhận | Đang giao | Hoàn thành | Đã hủy

Mỗi row:
  - Mã đơn (bold) + ngày
  - Tên khách hàng
  - Tổng tiền (blue, bold)
  - Badge status (màu theo trạng thái)

Phân trang: Load more (scroll xuống cuối)
```

---

## 11. Status Badge màu

```
draft:      bg #F1F5F9, text #64748B  (xám)
confirmed:  bg #DBEAFE, text #1D4ED8  (xanh dương)
shipping:   bg #FEF3C7, text #D97706  (cam)
completed:  bg #DCFCE7, text #16A34A  (xanh lá)
cancelled:  bg #FEE2E2, text #DC2626  (đỏ)
```

---

## 12. Quy tắc code mobile

- KHÔNG dùng `localStorage` — dùng `expo-secure-store`
- KHÔNG dùng `window`, `document` — không có trên RN
- KHÔNG copy nguyên component web sang — viết lại bằng RN StyleSheet
- Mọi text phải trong `<Text>` component
- Image dùng `<Image>` của RN hoặc `expo-image`
- Touchable dùng `Pressable` (không dùng `TouchableOpacity` cũ)
- Scroll dùng `FlatList` cho danh sách, `ScrollView` cho form

---

## 13. Thứ tự code từng màn hình

```
1. lib/constants.ts        → API_URL, colors, sizes
2. lib/api.ts              → fetch wrapper với auth header
3. lib/auth.ts             → login, logout, getUser (SecureStore)
4. lib/utils.ts            → formatCurrency, formatDate
5. types/index.ts          → TypeScript interfaces
6. components/ui/          → Button, Input, Card, Badge, LoadingSpinner
7. app/_layout.tsx         → Root layout, auth check
8. app/(auth)/login.tsx    → Màn hình login
9. app/(tabs)/_layout.tsx  → Bottom tabs
10. app/(tabs)/index.tsx   → Dashboard
11. app/(tabs)/orders.tsx  → OrderList
12. app/orders/[id].tsx    → OrderDetail
13. app/(tabs)/customers.tsx → CustomerList
14. app/(tabs)/profile.tsx → Profile + logout
```

---

## 14. Tài liệu liên quan

- `FEATURE_MOBILE.md` — overview 2 giai đoạn (WebView vs RN)
- `ROADMAP.md` — Phase 2 mobile
- `CLAUDE.md` — tech stack web (backend dùng chung)
- `LOGIC_BUSINESS.md` — nghiệp vụ HH, lương (đọc khi làm báo cáo)
