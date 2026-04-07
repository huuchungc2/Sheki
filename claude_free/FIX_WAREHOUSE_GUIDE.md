# HƯỚNG DẪN FIX OrderForm.tsx — Thêm chọn kho

## Có 3 chỗ cần sửa trong file src/pages/OrderForm.tsx

---

## THAY ĐỔI 1 — Thêm state warehouse (sau dòng selectedGroupId)

Tìm dòng:
```
const [groups, setGroups] = React.useState<any[]>([]);
```

Thêm VÀO SAU:
```typescript
const [selectedWarehouseId, setSelectedWarehouseId] = React.useState<number | null>(null);
const [warehouses, setWarehouses] = React.useState<any[]>([]);

// Fetch danh sách kho
React.useEffect(() => {
  api.get('/warehouses').then((res: any) => {
    const data = res?.data ?? res ?? [];
    setWarehouses(Array.isArray(data) ? data : []);
  }).catch(() => setWarehouses([]));
}, []);

// Khi chọn kho → cập nhật available_stock của từng sản phẩm theo kho đó
React.useEffect(() => {
  if (!selectedWarehouseId || items.length === 0) return;
  (async () => {
    try {
      const productIds = items.map(i => i.productId).join(',');
      const res: any = await api.get(`/inventory/stock-by-warehouse?warehouse_id=${selectedWarehouseId}`);
      const stockData = res?.data ?? [];
      setItems(prev => prev.map(item => {
        const ws = stockData.find((s: any) => String(s.product_id) === String(item.productId));
        return { ...item, availableStock: ws ? Number(ws.available_stock) : 0 };
      }));
    } catch {}
  })();
}, [selectedWarehouseId]);
```

---

## THAY ĐỔI 2 — Thêm dropdown chọn kho trong UI

Tìm đoạn (dropdown chọn nhóm bán hàng):
```
{/* Group selector */}
<div className="space-y-2">
  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
    NHÓM BÁN HÀNG <span className="text-red-500">*</span>
  </label>
```

Thêm VÀO TRƯỚC đoạn đó:
```tsx
{/* Warehouse selector */}
<div className="space-y-2">
  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
    KHO XUẤT HÀNG <span className="text-red-500">*</span>
  </label>
  <select
    value={selectedWarehouseId ?? ""}
    onChange={(e) => setSelectedWarehouseId(e.target.value ? Number(e.target.value) : null)}
    className={cn(
      "w-full px-5 py-3 bg-slate-50 border rounded-[24px] text-sm font-bold transition-all outline-none",
      !selectedWarehouseId ? "border-amber-300 focus:border-amber-500 focus:ring-4 focus:ring-amber-500/10" : "border-transparent focus:border-red-200 focus:ring-4 focus:ring-red-500/5"
    )}
  >
    <option value="">-- Chọn kho xuất hàng --</option>
    {warehouses.filter((w: any) => w.is_active).map((w: any) => (
      <option key={w.id} value={w.id}>{w.name}</option>
    ))}
  </select>
</div>
```

---

## THAY ĐỔI 3 — Fix validation và payload

Tìm đoạn validation (sau dòng `if (!selectedGroupId)`):
```javascript
if (!selectedGroupId) {
  setFormError('Vui lòng chọn nhóm bán hàng');
```

Thêm VÀO TRƯỚC đoạn đó:
```typescript
if (!selectedWarehouseId) {
  setFormError('Vui lòng chọn kho xuất hàng');
  window.scrollTo({ top: 0, behavior: 'smooth' });
  return;
}
```

Sau đó tìm dòng:
```javascript
warehouse_id: 1,
```

Thay bằng:
```javascript
warehouse_id: selectedWarehouseId,
```

---

## THAY ĐỔI 4 — Load warehouse_id khi edit đơn

Tìm trong useEffect load order (dòng `setSelectedGroupId`):
```javascript
setSelectedGroupId(order?.group_id ?? null);
```

Thêm VÀO SAU:
```javascript
setSelectedWarehouseId(order?.warehouse_id ?? null);
```

---

## TÓM TẮT CÁC FILE CẦN THAY ĐỔI

| File | Thay đổi |
|---|---|
| `src/pages/OrderForm.tsx` | Thêm warehouse state + dropdown + fix payload |
| `backend/services/orderService.js` | Thay file mới (đã tạo) |
| `backend/routes/inventory.js` | Thay file mới (đã tạo) |
| `backend/migrations/add_warehouse_stock.sql` | Chạy migration (đã tạo) |
