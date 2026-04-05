# FEATURE: Mobile App (iOS + Android)

> Làm sau khi web hoàn chỉnh + deploy xong

---

## Chiến lược: 2 giai đoạn

### Giai đoạn 1 — WebView (Ra app nhanh, 1-2 tuần)
Bọc website vào app native → lên App Store + Google Play được luôn.

**Ưu điểm:** Nhanh, rẻ, không viết lại code  
**Nhược điểm:** UX không native 100%  
**Phù hợp:** Ra mắt nhanh, test thị trường

### Giai đoạn 2 — React Native (Nâng cấp sau, 3-4 tuần)
Reuse toàn bộ API backend từ web, chỉ viết lại UI cho mobile.

**Ưu điểm:** UX native, push notification, camera, offline mode  
**Nhược điểm:** Mất thêm thời gian  
**Phù hợp:** Khi user dùng nhiều, cần trải nghiệm tốt hơn

---

## Giai đoạn 1: WebView Chi tiết

### Tech
- React Native + Expo (dễ build, không cần Mac để build Android)
- Package: `react-native-webview`

### Cần làm trên Web trước
- [ ] Web phải responsive (mobile-friendly)
- [ ] Deploy lên domain thật (không dùng localhost)
- [ ] HTTPS bắt buộc (App Store yêu cầu)

### Code WebView cơ bản
```javascript
// App.js
import { WebView } from 'react-native-webview';

export default function App() {
  return (
    <WebView 
      source={{ uri: 'https://erp.velocity.vn' }}
      style={{ flex: 1 }}
    />
  );
}
```

### Cấu trúc project mobile
```
mobile/
├── App.js
├── app.json          # Expo config (tên app, icon, splash)
├── assets/
│   ├── icon.png      # 1024x1024
│   └── splash.png    # 1284x2778
└── package.json
```

### Build & Deploy
```bash
# Cài Expo CLI
npm install -g @expo/cli

# Tạo project
npx create-expo-app mobile --template blank

# Build APK (Android) — không cần Mac
eas build --platform android

# Build IPA (iOS) — cần Apple Developer Account ($99/năm)
eas build --platform ios
```

---

## Giai đoạn 2: React Native Chi tiết

### Reuse từ Web
| Web | Mobile |
|---|---|
| Backend API (Node.js) | Giữ nguyên 100% |
| Business logic | Giữ nguyên 100% |
| UI Components | Viết lại bằng RN components |
| Auth (JWT) | Giữ nguyên logic, lưu vào SecureStore |

### Màn hình ưu tiên cho mobile
1. Login
2. Dashboard (tóm tắt)
3. OrderList + OrderForm (Sales hay dùng nhất)
4. CustomerList + CustomerForm
5. Notifications (push notification đơn mới)

### Tính năng native thêm vào
- Push notification khi có đơn mới
- Camera scan barcode sản phẩm
- Offline mode (xem đơn khi mất mạng)

---

## Checklist trước khi làm mobile

- [ ] Web deploy xong, có domain thật
- [ ] Web responsive trên mobile browser
- [ ] API backend stable, không còn bug lớn
- [ ] Apple Developer Account (nếu cần iOS)
- [ ] Google Play Console account ($25 một lần)

---

## Timeline ước tính

| Giai đoạn | Thời gian | Chi phí |
|---|---|---|
| Web hoàn chỉnh + Deploy | Đang làm | VPS ~$10-20/tháng |
| WebView App | 1-2 tuần | Apple $99/năm + Google $25 |
| React Native App | 3-4 tuần | Không thêm |
