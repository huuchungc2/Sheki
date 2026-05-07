# UI_SPEC.md — ĐẶC TẢ GIAO DIỆN SHEKI

> AI PHẢI đọc file này trước khi thiết kế hoặc sửa bất kỳ giao diện nào.
> Đọc thêm CLAUDE.md (quy tắc màu) và DESIGN.md (spacing/typography) để có đủ context.

---

## 1. THÔNG TIN THƯƠNG HIỆU

| | |
|---|---|
| Tên app | **Sheki** |
| Ngôn ngữ | Tiếng Việt hoàn toàn |
| Style tham khảo | Linear.app — minimal, data-forward, precision |
| Logo | Hiển thị "Sheki" trên sidebar và tab trình duyệt |

---

## 2. DESIGN SYSTEM

### Nguyên tắc màu sắc — BẮT BUỘC

**KHÔNG hardcode hex, KHÔNG dùng slate-\*, gray-\*, white, black.**
Toàn bộ màu lấy từ semantic tokens trong `src/index.css`.

| Mục đích | Token Tailwind |
|---|---|
| Nền trang | `bg-background` |
| Card / panel | `bg-card` / `text-card-foreground` |
| Popover / dropdown | `bg-popover` / `text-popover-foreground` |
| Text chính | `text-foreground` |
| Text phụ | `text-muted-foreground` |
| Nền muted | `bg-muted` |
| Border | `border-border` |
| Border input | `border-input` |
| Primary (button, link, active) | `bg-primary` / `text-primary` / `text-primary-foreground` |
| Accent (hover, selected) | `bg-accent` / `text-accent-foreground` |
| Destructive (xóa, lỗi) | `bg-destructive` / `text-destructive` |
| Sidebar | `bg-sidebar` / `text-sidebar-foreground` / `border-sidebar-border` |

### Hai mode màu (tự động qua class `.dark` trên `<html>`)

| | Light | Dark |
|---|---|---|
| Primary | Teal `#0d9488` | Lavender `#5e6ad2` |
| Background | Trắng | `#010102` (Linear canvas) |
| Card | Trắng | `#0f1011` |
| Text | Gần đen | `#f7f8f8` |

### Typography

```
Font: Geist Variable (đã import trong index.css)
Fallback: Inter, system-ui
Size base: 13px (html font-size)
```

| Role | Class |
|---|---|
| Tiêu đề trang | `text-xl font-semibold tracking-tight` |
| Section heading | `text-xs font-medium text-muted-foreground uppercase tracking-wide` |
| Body | `text-sm` (= 13px với base 13px) |
| Label form | `text-xs font-medium text-muted-foreground` |
| Số tiền / mã đơn | `tabular-nums` |

### Border radius

```
Button, Input: rounded-md (calc(var(--radius) * 0.8))
Card, Panel:   rounded-lg (var(--radius) = 0.5rem)
Badge:         rounded-full
Modal:         rounded-xl
```

---

## 3. LAYOUT CHUNG

```
┌─────────────────────────────────────────┐
│  Sidebar (256px / collapse 80px)        │
│  ─────────────   ─────────────────────  │
│  Logo: Sheki     Header (h-14, sticky)  │
│  ─────────────   ─────────────────────  │
│  Menu items      Page content (p-6)     │
│  (theo role)                            │
└─────────────────────────────────────────┘
```

### Sidebar
- `bg-sidebar border-r border-sidebar-border`
- Nav item inactive: `text-muted-foreground hover:bg-accent hover:text-accent-foreground`
- Nav item active: `bg-accent text-accent-foreground border-l-2 border-primary`
- Có thể collapse về 80px (chỉ icon)
- Mobile: drawer overlay

### Header mỗi trang
```tsx
<div className="flex items-center justify-between mb-6">
  <div>
    <h1 className="text-xl font-semibold tracking-tight">Tên trang</h1>
    <p className="text-sm text-muted-foreground mt-0.5">Mô tả / số lượng bản ghi</p>
  </div>
  <div className="flex items-center gap-2">
    {/* Action buttons */}
  </div>
</div>
```

---

## 4. COMPONENTS CHUẨN

### Button
- Primary: `<Button variant="default">` — tự dùng `bg-primary text-primary-foreground`
- Secondary: `<Button variant="outline">`
- Danger: `<Button variant="destructive">`
- Ghost (action trong bảng): `<Button variant="ghost" size="sm">`

### Input / Select
- Dùng shadcn `<Input>` `<Select>` `<Textarea>` — tự đúng dark/light
- Label: `text-xs font-medium text-muted-foreground`
- Required: `<span className="text-destructive ml-0.5">*</span>`
- Error: `text-xs text-destructive mt-1`

### Table
```tsx
<div className="rounded-lg border border-border overflow-hidden">
  <table className="w-full text-sm">
    <thead>
      <tr className="bg-muted border-b border-border">
        <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide">
          Cột
        </th>
      </tr>
    </thead>
    <tbody className="divide-y divide-border">
      <tr className="bg-background hover:bg-accent/30 transition-colors">
        <td className="px-4 py-3">Nội dung</td>
      </tr>
    </tbody>
  </table>
</div>
```
- Số tiền: `tabular-nums text-right`
- Cột action: `<Button variant="ghost" size="sm">`
- Phân trang ở cuối

### Badge trạng thái đơn hàng
```tsx
// Dùng Tailwind dark: variant để đúng cả light lẫn dark
const statusConfig = {
  pending:   { label: 'Chờ xử lý',   class: 'bg-amber-50 text-amber-700 border border-amber-200 dark:bg-[#1a1600] dark:text-[#f59e0b] dark:border-[#78350f]' },
  confirmed: { label: 'Đã xác nhận', class: 'bg-blue-50 text-blue-700 border border-blue-200 dark:bg-[#0f1729] dark:text-[#5e6ad2] dark:border-[#312e81]' },
  shipping:  { label: 'Đang giao',   class: 'bg-orange-50 text-orange-700 border border-orange-200 dark:bg-[#1a0f00] dark:text-[#fb923c] dark:border-[#7c2d12]' },
  completed: { label: 'Hoàn thành',  class: 'bg-green-50 text-green-700 border border-green-200 dark:bg-[#052e16] dark:text-[#27a644] dark:border-[#14532d]' },
  cancelled: { label: 'Đã hủy',      class: 'bg-red-50 text-red-600 border border-red-200 dark:bg-[#1c0a0a] dark:text-[#ef4444] dark:border-[#7f1d1d]' },
}
// Apply: className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${statusConfig[status].class}`}
```

### Filter / Search bar
```tsx
<div className="bg-card border border-border rounded-lg p-4 mb-4 flex flex-wrap items-center gap-3">
  <Input placeholder="Tìm kiếm..." className="w-48" />
  <Select>...</Select>
  {/* Filter thời gian */}
</div>
```

### Filter thời gian (chuẩn — dùng cho tất cả màn hình)
```
[Hôm nay] [Tuần này] [Tháng này] [Tùy chọn: từ ngày ... đến ngày ...]
```
- Mặc định: Hôm nay
- Khi chọn "Tùy chọn": hiện 2 date picker

### Card thống kê (Dashboard KPI)
```tsx
<div className="bg-card border border-border rounded-lg p-6">
  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Tổng đơn</p>
  <p className="text-2xl font-semibold tabular-nums tracking-tight mt-1">1,234</p>
  <p className="text-xs text-green-500 mt-1">↑ 12% so tháng trước</p>
</div>
```
Grid: `grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4`

### Modal
```tsx
// Dùng shadcn <Dialog> — tự đúng dark/light
<Dialog>
  <DialogContent className="sm:max-w-md">
    <DialogHeader>
      <DialogTitle>Tiêu đề</DialogTitle>
    </DialogHeader>
    {/* content */}
    <DialogFooter>
      <Button variant="outline">Hủy</Button>
      <Button>Xác nhận</Button>
    </DialogFooter>
  </DialogContent>
</Dialog>
```

### Form section
```tsx
// Phân tách các section trong form
<div className="border-t border-border pt-6 mt-6">
  <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-4">
    Thông tin khách hàng
  </h3>
  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
    {/* fields */}
  </div>
</div>
```

---

## 5. NGOẠI LỆ — CounterSale.tsx (POS)

Màn hình quầy thu ngân **luôn dark mode** dù user đang bật light:

```tsx
export function CounterSale() {
  return (
    <div className="dark">
      {/* toàn bộ nội dung — vẫn dùng semantic tokens như bình thường */}
    </div>
  );
}
```

---

## 6. DANH SÁCH 21 MÀN HÌNH

| # | Màn hình | Route | Role |
|---|---|---|---|
| 1 | Login | /login | Public |
| 2 | Register | /register | Public |
| 3 | Dashboard | / | Admin+Sales |
| 4 | EmployeeList | /employees | Admin |
| 5 | EmployeeForm | /employees/new, /edit/:id | Admin |
| 6 | ProductList | /products | Admin |
| 7 | ProductForm | /products/new, /edit/:id | Admin |
| 8 | CustomerList | /customers | Admin+Sales |
| 9 | CustomerForm | /customers/new, /edit/:id | Admin+Sales |
| 10 | OrderList | /orders | Admin+Sales |
| 11 | OrderForm | /orders/new, /edit/:id | Admin+Sales |
| 12 | InventoryHistory | /inventory | Admin |
| 13 | InventoryImport | /inventory/import | Admin |
| 14 | InventoryExport | /inventory/export | Admin |
| 15 | BulkImport | /import | Admin |
| 16 | CommissionReport | /reports/commissions | Admin+Sales |
| 17 | CTVCommissionReport | /reports/commissions/ctv | Admin+Sales |
| 18 | RevenueReport | /reports/revenue | Admin+Sales |
| 19 | PayrollPeriods | /reports/payroll-periods | Admin |
| 20 | ActivityLog | /logs | Admin |
| 21 | Settings | /settings | Admin |

---

## 7. QUY TẮC GIAO DIỆN CHO AI

```
✅ Dùng semantic tokens — KHÔNG hardcode màu (ngoại lệ: badge status)
✅ Dùng shadcn components tối đa — tự đúng dark/light
✅ Tiếng Việt hoàn toàn — label, placeholder, thông báo, empty state
✅ Responsive — mobile-first, chạy tốt trên điện thoại
✅ Filter thời gian mặc định = Hôm nay
✅ Table phải có phân trang
✅ Form phải có validation + error message
✅ Loading state khi fetch data
✅ Empty state khi không có data (icon + text mô tả)
✅ tabular-nums cho mọi số tiền, số lượng, mã đơn
❌ Không hardcode bg-white, bg-black, bg-slate-*, text-gray-*
❌ Không dùng màu từ DESIGN.md (DESIGN.md chỉ dùng cho spacing/typography)
❌ Không bỏ qua responsive
❌ Không để tiếng Anh xuất hiện trong UI
```
