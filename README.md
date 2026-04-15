# ERP Sheki

ERP quản lý bán hàng nội bộ cho Sheki.

- **Frontend**: React + Vite + TypeScript + Tailwind
- **Backend**: Node.js + Express
- **DB**: MySQL (local)
- **Auth**: JWT

## Tài liệu quan trọng (đọc theo thứ tự)

- `TODO.md` — task hiện tại
- `CHANGELOG.md` — lịch sử thay đổi
- `RULES.md` — quy tắc code bắt buộc
- `LOGIC_BUSINESS.md` — nghiệp vụ đơn/hoa hồng/lương/hoàn
- `UI_SPEC.md` — chuẩn UI
- `plan.md` — tổng quan + cấu trúc + schema

## Chạy local

### Backend

```bash
cd backend
npm install
node server.js
```

- **Port**: 3000
- **DB**: `localhost:3306`, user `root`, pass rỗng, db `erp`

### Frontend

```bash
npm install
npm run dev
```

- **Port**: 5173

## Mobile App

Repo đã có đặc tả để bắt đầu làm mobile:

- **Tổng quan WebView vs RN**: `FEATURE_MOBILE.md`
- **Đặc tả React Native (Expo + TS)**: `FEATURE_MOBILE_RN.md`
- **Prompt làm mobile trong Cursor**: `PROMPT_MOBILE.md`

Điều kiện tối thiểu trước khi làm mobile:
- Web deploy có **domain + HTTPS**
- UI web responsive tốt trên mobile browser
- API backend ổn định (ít thay đổi breaking)
