import * as React from "react";
import { Loader2, Calendar, Lock, Unlock, RefreshCcw } from "lucide-react";
import { cn, formatCurrency, formatDate } from "../lib/utils";

const API_URL = (import.meta as any)?.env?.VITE_API_URL || "/api";

type Period = {
  id: number;
  from_at: string;
  to_at: string | null;
  status: "open" | "closed";
  closed_at: string | null;
};

export function PayrollPeriods() {
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [periods, setPeriods] = React.useState<Period[]>([]);
  const [current, setCurrent] = React.useState<Period | null>(null);
  const [closing, setClosing] = React.useState(false);
  const [previewRows, setPreviewRows] = React.useState<any[]>([]);
  const [previewLoading, setPreviewLoading] = React.useState(false);
  const [selectedId, setSelectedId] = React.useState<number | null>(null);

  const fetchPeriods = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem("token");
      const [curRes, listRes] = await Promise.all([
        fetch(`${API_URL}/payroll/periods/current`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${API_URL}/payroll/periods`, { headers: { Authorization: `Bearer ${token}` } }),
      ]);
      if (!curRes.ok) throw new Error("Không thể tải kỳ lương hiện tại");
      if (!listRes.ok) throw new Error("Không thể tải danh sách kỳ lương");
      const curJ = await curRes.json();
      const listJ = await listRes.json();
      const cur = curJ?.data as Period;
      const list = (listJ?.data ?? []) as Period[];
      setCurrent(cur || null);
      setPeriods(list);
      const defaultId = cur?.id ? Number(cur.id) : (list?.[0]?.id ? Number(list[0].id) : null);
      setSelectedId(defaultId);
    } catch (e: any) {
      setError(e?.message || "Không thể tải dữ liệu");
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchPreview = React.useCallback(async (periodId: number) => {
    setPreviewLoading(true);
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API_URL}/payroll/periods/${periodId}/preview`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Không thể tải preview kỳ lương");
      const j = await res.json();
      setPreviewRows(j?.data ?? []);
    } catch {
      setPreviewRows([]);
    } finally {
      setPreviewLoading(false);
    }
  }, []);

  React.useEffect(() => {
    fetchPeriods();
  }, [fetchPeriods]);

  React.useEffect(() => {
    if (selectedId != null) fetchPreview(selectedId);
  }, [selectedId, fetchPreview]);

  const closeNow = async () => {
    if (!current?.id) return;
    const ok = window.confirm("Chốt kỳ lương hiện tại ngay bây giờ?");
    if (!ok) return;
    setClosing(true);
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API_URL}/payroll/periods/close`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({}),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j?.error || "Chốt kỳ thất bại");
      await fetchPeriods();
    } catch (e: any) {
      alert(e?.message || "Chốt kỳ thất bại");
    } finally {
      setClosing(false);
    }
  };

  const reindexOrders = async () => {
    const ok = window.confirm("Reindex đơn cũ vào các kỳ lương theo ngày tạo đơn? (dùng khi kỳ đã chốt đang ra 0)");
    if (!ok) return;
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API_URL}/payroll/reindex-orders`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({}),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(j?.error || "Reindex thất bại");
      await fetchPeriods();
      if (selectedId != null) await fetchPreview(selectedId);
      alert("Đã reindex xong");
    } catch (e: any) {
      alert(e?.message || "Reindex thất bại");
    }
  };

  const rebuildSettlements = async () => {
    if (!selected?.id) return;
    const ok = window.confirm("Rebuild snapshot lương cho kỳ đã chốt này? (dùng khi lỡ chốt kỳ quá sớm nên số = 0)");
    if (!ok) return;
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API_URL}/payroll/periods/${selected.id}/rebuild-settlements`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({}),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(j?.error || "Rebuild thất bại");
      if (selectedId != null) await fetchPreview(selectedId);
      alert("Đã rebuild snapshot");
    } catch (e: any) {
      alert(e?.message || "Rebuild thất bại");
    }
  };

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 font-semibold">{error}</p>
          <button
            onClick={fetchPeriods}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-semibold"
          >
            Thử lại
          </button>
        </div>
      </div>
    );
  }

  const selected = selectedId != null ? periods.find((p) => Number(p.id) === Number(selectedId)) : null;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Chốt kỳ lương</h1>
          <p className="text-sm text-slate-500 mt-1">
            Kỳ hiện tại:{" "}
            <span className="font-semibold text-slate-800">
              #{current?.id} • {current?.from_at ? formatDate(current.from_at) : "—"}
            </span>
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={fetchPeriods}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-slate-200 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            <RefreshCcw className="w-4 h-4" />
            Làm mới
          </button>
          <button
            onClick={reindexOrders}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-slate-200 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            Reindex đơn
          </button>
          {selected?.status === "closed" ? (
            <button
              onClick={rebuildSettlements}
              className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-slate-200 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              Rebuild snapshot
            </button>
          ) : null}
          <button
            onClick={closeNow}
            disabled={!current || current.status !== "open" || closing}
            className={cn(
              "inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold",
              closing || !current || current.status !== "open"
                ? "bg-slate-100 text-slate-400 cursor-not-allowed"
                : "bg-emerald-600 text-white hover:bg-emerald-700"
            )}
          >
            {closing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Lock className="w-4 h-4" />}
            Chốt kỳ hiện tại
          </button>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl p-4 flex flex-col gap-3">
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-slate-400" />
          <span className="text-sm font-semibold text-slate-700">Chọn kỳ</span>
          <select
            value={selectedId ?? ""}
            onChange={(e) => setSelectedId(e.target.value ? Number(e.target.value) : null)}
            className="ml-auto px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none"
          >
            {periods.map((p) => (
              <option key={p.id} value={p.id}>
                #{p.id} • {p.status === "open" ? "Đang mở" : "Đã chốt"} • {formatDate(p.from_at)}
                {p.to_at ? ` → ${formatDate(p.to_at)}` : ""}
              </option>
            ))}
          </select>
        </div>

        {selected && (
          <div className="text-xs text-slate-500 flex items-center gap-2">
            {selected.status === "open" ? (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 font-semibold">
                <Unlock className="w-3 h-3" /> Đang mở
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 font-semibold">
                <Lock className="w-3 h-3" /> Đã chốt
              </span>
            )}
            <span>
              Từ <span className="font-semibold">{formatDate(selected.from_at)}</span>
              {selected.to_at ? (
                <>
                  {" "}
                  đến <span className="font-semibold">{formatDate(selected.to_at)}</span>
                </>
              ) : null}
            </span>
          </div>
        )}
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
          <p className="text-sm font-bold text-slate-700">Preview lương theo kỳ</p>
          {previewLoading && <Loader2 className="w-4 h-4 animate-spin text-slate-400" />}
        </div>
        {previewRows.length === 0 ? (
          <div className="py-12 text-center text-slate-400 text-sm">Chưa có dữ liệu trong kỳ này</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-[980px] w-full text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100">
                  <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500">Nhân viên</th>
                  <th className="px-5 py-3 text-right text-xs font-semibold text-slate-500">HH direct</th>
                  <th className="px-5 py-3 text-right text-xs font-semibold text-slate-500">HH override</th>
                  <th
                    className="px-5 py-3 text-right text-xs font-semibold text-red-600"
                    title="Tổng HH bị trừ do hoàn: NV (direct) + quản lý (override). Số âm đỏ; chi tiết từng dòng bên dưới nếu có."
                  >
                    HH hoàn (trừ)
                  </th>
                  <th className="px-5 py-3 text-right text-xs font-semibold text-slate-500">Ship KH trả</th>
                  <th className="px-5 py-3 text-right text-xs font-semibold text-slate-500">NV chịu</th>
                  <th className="px-5 py-3 text-right text-xs font-semibold text-slate-500">Điều chỉnh</th>
                  <th className="px-5 py-3 text-right text-xs font-semibold text-slate-500">Tổng lương</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {previewRows.map((r: any) => (
                  <tr key={r.user_id} className="hover:bg-slate-50/50">
                    <td className="px-5 py-3 font-semibold text-slate-800">{r.full_name}</td>
                    <td className="px-5 py-3 text-right tabular-nums">{(Number(r.direct_commission) || 0).toLocaleString("vi-VN")}</td>
                    <td className="px-5 py-3 text-right tabular-nums">{(Number(r.override_commission) || 0).toLocaleString("vi-VN")}</td>
                    <td className="px-5 py-3 text-right tabular-nums align-top">
                      {(() => {
                        const total = Number(r.return_commission_abs) || 0;
                        const hasSplit =
                          r.return_commission_direct_abs != null &&
                          r.return_commission_override_abs != null;
                        const directAbs = hasSplit ? Number(r.return_commission_direct_abs) || 0 : 0;
                        const overrideAbs = hasSplit ? Number(r.return_commission_override_abs) || 0 : 0;
                        if (total <= 0) {
                          return <span className="text-slate-400 tabular-nums">0</span>;
                        }
                        return (
                          <div className="flex flex-col items-end gap-0.5">
                            <span className="font-semibold text-red-600">{formatCurrency(-total)}</span>
                            {hasSplit && directAbs > 0 ? (
                              <span className="text-[11px] text-slate-500 font-normal">
                                NV bán (direct): <span className="text-red-600 font-medium">−{formatCurrency(directAbs)}</span>
                              </span>
                            ) : null}
                            {hasSplit && overrideAbs > 0 ? (
                              <span className="text-[11px] text-slate-500 font-normal">
                                Quản lý (override): <span className="text-red-600 font-medium">−{formatCurrency(overrideAbs)}</span>
                              </span>
                            ) : null}
                          </div>
                        );
                      })()}
                    </td>
                    <td className="px-5 py-3 text-right tabular-nums">{(Number(r.ship_khach_tra) || 0).toLocaleString("vi-VN")}</td>
                    <td className="px-5 py-3 text-right tabular-nums">{(Number(r.nv_chiu) || 0).toLocaleString("vi-VN")}</td>
                    <td className="px-5 py-3 text-right tabular-nums">{(Number(r.adjustments) || 0).toLocaleString("vi-VN")}</td>
                    <td className="px-5 py-3 text-right font-bold tabular-nums">{(Number(r.total_luong) || 0).toLocaleString("vi-VN")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

