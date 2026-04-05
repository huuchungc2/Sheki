# RULES.md — QUY TẮC CODE BẮT BUỘC

## 🚫 Tuyệt đối KHÔNG làm
- Không sửa file không liên quan đến task hiện tại
- Không xóa hoặc rewrite code cũ khi chưa được yêu cầu
- Không cài thêm package nếu chưa hỏi
- Không gộp nhiều task vào 1 lần làm
- Không đoán mò — nếu không chắc → hỏi trước

## ✅ Bắt buộc phải làm
- Chỉ sửa đúng file được chỉ định trong task
- Giữ nguyên naming convention hiện tại (camelCase, PascalCase components)
- Báo rõ nguyên nhân bug TRƯỚC khi fix
- Fix đúng chỗ — không rewrite cả file chỉ để fix 1 bug

## 📐 Code Convention
| | Convention |
|---|---|
| Components | PascalCase (ví dụ: `OrderForm.tsx`) |
| Functions/vars | camelCase |
| API routes | kebab-case (ví dụ: `/api/order-items`) |
| DB columns | snake_case |
| CSS | Tailwind utility classes |

## 🐛 Quy trình xử lý bug
```
1. Xác định nguyên nhân (báo cho tao)
2. Fix đúng chỗ, không lan rộng
3. Kiểm tra side effects
4. Báo cáo files đã sửa
```

## 🎨 Quy trình thay đổi UI
```
1. Làm 1 component nhỏ trước
2. Báo tao xem — duyệt rồi mới apply rộng
3. Không redesign cả trang khi chỉ cần sửa 1 phần
```

## ➕ Quy trình thêm tính năng mới
```
1. Đọc FEATURE_[tên].md nếu có
2. Làm backend (API, DB) trước
3. Làm frontend sau
4. Update TODO.md + CHANGELOG.md
```

## 🔀 Git Convention (nếu dùng)
- Branch: `feature/[tên]`, `fix/[tên]`
- Không commit thẳng vào main khi đang làm tính năng mới
