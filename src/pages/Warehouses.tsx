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
          <h1 className="text-2xl font-bold text-slate-900">Quản lý kho</h1>
          <p className="text-slate-500 text-sm mt-1">
            Tạo kho và chọn <span className="font-semibold">kho mặc định/kho tổng</span> của hệ thống.
          </p>
        </div>
        <button
          type="button"
          onClick={openCreate}
          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700 transition-all shadow-lg shadow-blue-600/20"
        >
          <Plus className="w-4 h-4" />
          Tạo kho
        </button>
      </div>

      {defaultWarehouse && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-start gap-3">
          <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center flex-shrink-0">
            <Star className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-amber-900">
              Kho mặc định hiện tại: <span className="font-bold">{defaultWarehouse.name}</span>
            </p>
            <p className="text-xs text-amber-700 mt-0.5">
              Sản phẩm mới sẽ tự động thuộc kho mặc định (tồn theo kho).
            </p>
            {defaultCount > 1 && (
              <p className="text-xs text-red-700 mt-1 font-semibold">
                Cảnh báo: dữ liệu đang có nhiều kho mặc định. Hệ thống sẽ tự động chuẩn hoá về 1 kho.
              </p>
            )}
          </div>
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm flex items-center gap-2">
          <AlertCircle className="w-4 h-4" />
          <span className="font-medium">{error}</span>
        </div>
      )}

      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/50 border-b border-slate-200">
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Kho</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Địa chỉ</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-center">Kho mặc định</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {warehouses.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-6 py-12 text-center text-slate-400">
                      Chưa có kho nào
                    </td>
                  </tr>
                ) : (
                  warehouses.map((w) => (
                    <tr key={w.id} className="hover:bg-slate-50/40 transition-all">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className={cn(
                            "w-10 h-10 rounded-xl flex items-center justify-center",
                            Boolean(w.is_default) ? "bg-amber-100 text-amber-700" : "bg-slate-100 text-slate-500"
                          )}>
                            <Warehouse className="w-5 h-5" />
                          </div>
                          <div>
                            <p className="text-sm font-bold text-slate-900">{w.name}</p>
                            <p className="text-[11px] text-slate-400">ID: {w.id}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-start gap-2 text-sm text-slate-600">
                          <MapPin className="w-4 h-4 text-slate-400 mt-0.5" />
                          <span className="line-clamp-2">{w.address || "—"}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-center">
                          <label className={cn(
                            "inline-flex items-center gap-2 px-3 py-2 rounded-xl border transition-all cursor-pointer select-none",
                            Boolean(w.is_default) ? "border-amber-200 bg-amber-50" : "border-slate-200 bg-white hover:bg-slate-50"
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
                              Boolean(w.is_default) ? "text-amber-800" : "text-slate-600"
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
                            className="px-3 py-2 rounded-xl text-sm font-semibold text-blue-600 hover:bg-blue-50 transition-all disabled:opacity-50"
                          >
                            Sửa
                          </button>
                          <button
                            type="button"
                            disabled={submitting}
                            onClick={() => disableWarehouse(w)}
                            className="p-2 rounded-xl text-slate-400 hover:bg-red-50 hover:text-red-600 transition-all disabled:opacity-50"
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
          <div className="fixed inset-0 bg-slate-900/30 backdrop-blur-sm z-40" onClick={closeModal} />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="w-full max-w-lg bg-white rounded-3xl border border-slate-200 shadow-2xl overflow-hidden">
              <div className="p-6 border-b border-slate-100">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                  {editing ? "Cập nhật kho" : "Tạo kho mới"}
                </p>
                <h3 className="text-lg font-bold text-slate-900 mt-1">
                  {editing ? editing.name : "Kho mới"}
                </h3>
              </div>
              <div className="p-6 space-y-4">
                <div>
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Tên kho</label>
                  <input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="mt-2 w-full px-4 py-3 bg-slate-50 border border-transparent focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 rounded-2xl text-sm outline-none transition-all"
                    placeholder="Ví dụ: Kho trung tâm"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Địa chỉ</label>
                  <textarea
                    rows={3}
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    className="mt-2 w-full px-4 py-3 bg-slate-50 border border-transparent focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 rounded-2xl text-sm outline-none transition-all resize-none"
                    placeholder="Địa chỉ kho (không bắt buộc)"
                  />
                </div>
                <label className="flex items-center gap-3 p-3 rounded-2xl border border-slate-200 bg-white">
                  <input
                    type="checkbox"
                    checked={isDefault}
                    onChange={(e) => setIsDefault(e.target.checked)}
                    className="w-4 h-4"
                  />
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-slate-900">Đặt làm kho mặc định</p>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Hệ thống chỉ cho phép 1 kho mặc định. Nếu chọn, kho mặc định hiện tại sẽ bị thay thế.
                    </p>
                  </div>
                </label>
              </div>
              <div className="p-6 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={closeModal}
                  className="px-4 py-2 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-50 border border-slate-200"
                >
                  Huỷ
                </button>
                <button
                  type="button"
                  disabled={submitting}
                  onClick={save}
                  className="inline-flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
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

