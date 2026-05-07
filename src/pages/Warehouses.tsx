import * as React from "react";
import { Plus, Save, Trash2, Warehouse, Star, AlertCircle, Loader2, MapPin } from "lucide-react";
import { api } from "../lib/api";
import { cn } from "../lib/utils";

type WarehouseRow = {
  id: number;
  name: string;
  address?: string | null;
  is_active: number | boolean;
  is_default?: number | boolean;
};

export function Warehouses() {
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [warehouses, setWarehouses] = React.useState<WarehouseRow[]>([]);

  const [isModalOpen, setIsModalOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<WarehouseRow | null>(null);
  const [name, setName] = React.useState("");
  const [address, setAddress] = React.useState("");
  const [isDefault, setIsDefault] = React.useState(false);
  const [submitting, setSubmitting] = React.useState(false);

  const fetchWarehouses = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res: any = await api.get("/warehouses");
      const data = res?.data ?? [];
      setWarehouses(Array.isArray(data) ? data : []);
    } catch (e: any) {
      setError(e?.message || "Không thể tải danh sách kho");
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    fetchWarehouses();
  }, [fetchWarehouses]);

  const openCreate = () => {
    setEditing(null);
    setName("");
    setAddress("");
    setIsDefault(false);
    setIsModalOpen(true);
  };

  const openEdit = (w: WarehouseRow) => {
    setEditing(w);
    setName(w.name || "");
    setAddress(String(w.address ?? ""));
    setIsDefault(Boolean(w.is_default));
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditing(null);
    setName("");
    setAddress("");
    setIsDefault(false);
  };

  const save = async () => {
    if (!name.trim()) {
      setError("Vui lòng nhập tên kho");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      if (editing?.id) {
        await api.put(`/warehouses/${editing.id}`, {
          name: name.trim(),
          address: address.trim() || null,
          is_active: 1,
          is_default: isDefault ? 1 : 0,
        });
      } else {
        await api.post(`/warehouses`, {
          name: name.trim(),
          address: address.trim() || null,
          is_default: isDefault ? 1 : 0,
        });
      }
      closeModal();
      await fetchWarehouses();
    } catch (e: any) {
      setError(e?.message || "Không thể lưu kho");
    } finally {
      setSubmitting(false);
    }
  };

  const setDefaultWarehouse = async (w: WarehouseRow) => {
    setSubmitting(true);
    setError(null);
    try {
      await api.put(`/warehouses/${w.id}`, {
        name: w.name,
        address: w.address ?? null,
        is_active: 1,
        is_default: 1,
      });
      await fetchWarehouses();
    } catch (e: any) {
      setError(e?.message || "Không thể set kho mặc định");
    } finally {
      setSubmitting(false);
    }
  };

  const disableWarehouse = async (w: WarehouseRow) => {
    const ok = window.confirm(`Vô hiệu hóa kho "${w.name}"?`);
    if (!ok) return;
    setSubmitting(true);
    setError(null);
    try {
      await api.delete(`/warehouses/${w.id}`);
      await fetchWarehouses();
    } catch (e: any) {
      setError(e?.message || "Không thể vô hiệu hóa kho");
    } finally {
      setSubmitting(false);
    }
  };

  const defaultWarehouse = warehouses.find((w) => Boolean(w.is_default));
  const defaultCount = warehouses.filter((w) => Boolean(w.is_default)).length;

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">Quản lý kho</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Tạo kho và chọn <span className="font-semibold">kho mặc định/kho tổng</span> của hệ thống.
          </p>
        </div>
        <button
          type="button"
          onClick={openCreate}
          className="inline-flex items-center gap-2 h-10 px-4 bg-primary text-primary-foreground rounded-md text-sm font-semibold hover:opacity-95 transition-opacity"
        >
          <Plus className="w-4 h-4" />
          Tạo kho
        </button>
      </div>

      {defaultWarehouse && (
        <div className="bg-amber-50 border border-amber-200 dark:bg-amber-950/30 dark:border-amber-900/50 rounded-xl p-4 flex items-start gap-3">
          <div className="w-9 h-9 rounded-lg bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-200 flex items-center justify-center flex-shrink-0">
            <Star className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-amber-900 dark:text-amber-100">
              Kho mặc định hiện tại: <span className="font-bold">{defaultWarehouse.name}</span>
            </p>
            <p className="text-xs text-amber-700 dark:text-amber-300 mt-0.5">
              Sản phẩm mới sẽ tự động thuộc kho mặc định (tồn theo kho).
            </p>
            {defaultCount > 1 && (
              <p className="text-xs text-destructive mt-1 font-semibold">
                Cảnh báo: dữ liệu đang có nhiều kho mặc định. Hệ thống sẽ tự động chuẩn hoá về 1 kho.
              </p>
            )}
          </div>
        </div>
      )}

      {error && (
        <div className="bg-destructive/10 border border-destructive/30 text-destructive px-4 py-3 rounded-lg text-sm flex items-center gap-2">
          <AlertCircle className="w-4 h-4" />
          <span className="font-medium">{error}</span>
        </div>
      )}

      <div className="bg-card rounded-xl border border-border overflow-hidden shadow-sm">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-muted/30 border-b border-border">
                  <th className="px-6 py-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Kho</th>
                  <th className="px-6 py-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Địa chỉ</th>
                  <th className="px-6 py-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider text-center">Kho mặc định</th>
                  <th className="px-6 py-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {warehouses.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-6 py-12 text-center text-muted-foreground">
                      Chưa có kho nào
                    </td>
                  </tr>
                ) : (
                  warehouses.map((w) => (
                    <tr key={w.id} className="hover:bg-muted/30 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className={cn(
                            "w-10 h-10 rounded-xl flex items-center justify-center",
                            Boolean(w.is_default)
                              ? "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-200"
                              : "bg-muted text-muted-foreground"
                          )}>
                            <Warehouse className="w-5 h-5" />
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-foreground">{w.name}</p>
                            <p className="text-[11px] text-muted-foreground">ID: {w.id}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-start gap-2 text-sm text-muted-foreground">
                          <MapPin className="w-4 h-4 text-muted-foreground mt-0.5" />
                          <span className="line-clamp-2">{w.address || "—"}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-center">
                          <label className={cn(
                            "inline-flex items-center gap-2 px-3 py-2 rounded-xl border transition-colors cursor-pointer select-none",
                            Boolean(w.is_default)
                              ? "border-amber-200 bg-amber-50 dark:border-amber-900/50 dark:bg-amber-950/30"
                              : "border-border bg-background hover:bg-accent/50"
                          )}>
                            <input
                              type="radio"
                              name="defaultWarehouse"
                              checked={Boolean(w.is_default)}
                              disabled={submitting}
                              onChange={() => setDefaultWarehouse(w)}
                              className="w-4 h-4"
                            />
                            <span className={cn(
                              "text-sm font-semibold",
                              Boolean(w.is_default) ? "text-amber-800 dark:text-amber-200" : "text-muted-foreground"
                            )}>
                              {Boolean(w.is_default) ? "Đang chọn" : "Chọn"}
                            </span>
                          </label>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="inline-flex items-center gap-2">
                          <button
                            type="button"
                            disabled={submitting}
                            onClick={() => openEdit(w)}
                            className="px-3 py-2 rounded-lg text-sm font-semibold text-primary hover:bg-accent transition-colors disabled:opacity-50"
                          >
                            Sửa
                          </button>
                          <button
                            type="button"
                            disabled={submitting}
                            onClick={() => disableWarehouse(w)}
                            className="p-2 rounded-lg text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors disabled:opacity-50"
                            title="Vô hiệu hóa"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal */}
      {isModalOpen && (
        <>
          <div className="fixed inset-0 bg-foreground/10 backdrop-blur-sm z-40" onClick={closeModal} />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="w-full max-w-lg bg-card rounded-2xl border border-border shadow-2xl overflow-hidden">
              <div className="p-6 border-b border-border">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  {editing ? "Cập nhật kho" : "Tạo kho mới"}
                </p>
                <h3 className="text-lg font-semibold text-foreground mt-1">
                  {editing ? editing.name : "Kho mới"}
                </h3>
              </div>
              <div className="p-6 space-y-4">
                <div>
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Tên kho</label>
                  <input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="mt-2 w-full px-4 py-3 bg-background border border-input focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background rounded-xl text-sm outline-none transition-colors"
                    placeholder="Ví dụ: Kho trung tâm"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Địa chỉ</label>
                  <textarea
                    rows={3}
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    className="mt-2 w-full px-4 py-3 bg-background border border-input focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background rounded-xl text-sm outline-none transition-colors resize-none"
                    placeholder="Địa chỉ kho (không bắt buộc)"
                  />
                </div>
                <label className="flex items-center gap-3 p-3 rounded-xl border border-border bg-background">
                  <input
                    type="checkbox"
                    checked={isDefault}
                    onChange={(e) => setIsDefault(e.target.checked)}
                    className="w-4 h-4"
                  />
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-foreground">Đặt làm kho mặc định</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Hệ thống chỉ cho phép 1 kho mặc định. Nếu chọn, kho mặc định hiện tại sẽ bị thay thế.
                    </p>
                  </div>
                </label>
              </div>
              <div className="p-6 border-t border-border flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={closeModal}
                  className="h-10 px-4 rounded-md text-sm font-semibold text-foreground hover:bg-accent border border-border transition-colors"
                >
                  Huỷ
                </button>
                <button
                  type="button"
                  disabled={submitting}
                  onClick={save}
                  className="inline-flex items-center gap-2 h-10 px-5 rounded-md text-sm font-semibold text-primary-foreground bg-primary hover:opacity-95 transition-opacity disabled:opacity-50"
                >
                  <Save className="w-4 h-4" />
                  Lưu
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

