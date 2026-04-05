# AUDIT_PROMPT.md — PROMPT KIỂM TRA CODE

> Dùng file này khi muốn AI kiểm tra toàn bộ code hiện tại
> Copy prompt bên dưới → paste vào opencode

---

## PROMPT KIỂM TRA TOÀN BỘ

```
Đọc kỹ các file sau trước khi làm bất cứ điều gì:
- CLAUDE.md
- LOGIC_BUSINESS.md  
- UI_SPEC.md
- plan.md

Nhiệm vụ: Kiểm tra toàn bộ source code hiện tại

Với mỗi module dưới đây, báo cáo:
✅ Đúng — chạy đúng theo LOGIC_BUSINESS.md
❌ Sai logic — sai chỗ nào, file nào, dòng nào
🔲 Chưa làm — còn thiếu gì so với UI_SPEC.md
⚠️ Cần cải thiện UI — so với UI_SPEC.md

Modules cần kiểm tra:
1. Auth (Login, Register, JWT, phân quyền)
2. Dashboard
3. Quản lý nhân viên + CTV
4. Quản lý sản phẩm
5. Quản lý khách hàng
6. Quản lý đơn hàng (logic hoa hồng quan trọng nhất)
7. Quản lý tồn kho
8. Báo cáo hoa hồng bản thân
9. Báo cáo hoa hồng CTV
10. Báo cáo doanh thu
11. Cài đặt (bảng hoa hồng quản lý, cấu hình CTV)
12. Activity Log

Chỉ KIỂM TRA, KHÔNG sửa gì hết.
Sau khi xong tạo file AUDIT.md với kết quả chi tiết.
```

---

## PROMPT FIX TỪNG PHẦN (dùng sau khi có AUDIT.md)

```
Đọc CLAUDE.md, LOGIC_BUSINESS.md, UI_SPEC.md, AUDIT.md

Fix phần: [tên module từ AUDIT.md]

Ưu tiên:
1. Fix logic sai trước (phần ❌)
2. Làm phần chưa có (phần 🔲)
3. Cải thiện UI sau (phần ⚠️)

KHÔNG đụng vào phần ✅ đang chạy đúng
KHÔNG fix nhiều module cùng lúc

Sau khi xong:
- Update AUDIT.md (đổi ❌/🔲 thành ✅)
- Update TODO.md
- Update CHANGELOG.md
- Chạy: git add . && git commit -m "fix: [tên module]"
```

---

## PROMPT THÊM TÍNH NĂNG MỚI

```
Đọc CLAUDE.md, LOGIC_BUSINESS.md, UI_SPEC.md, RULES.md

Tính năng mới: [mô tả]

Thứ tự làm:
1. Kiểm tra DB cần thêm/sửa bảng/cột gì không
2. Làm backend (API) trước — báo tao xem
3. Làm frontend sau — theo đúng UI_SPEC.md
4. Update TODO.md + CHANGELOG.md
5. Chạy: git add . && git commit -m "feat: [tên tính năng]"

KHÔNG đụng file không liên quan
```
