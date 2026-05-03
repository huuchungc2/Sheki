import * as React from "react";
import { Loader2, Calendar, Lock, Unlock, RefreshCcw, Download } from "lucide-react";
import { cn, formatCurrency, formatDate } from "../lib/utils";
import { exportPayrollPeriodPreview } from "../lib/exportExcel";

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
  const [exporting, setExporting] = React.useState(false);
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

  const exportPreviewExcel = React.useCallback(() => {
    if (selectedId == null || previewRows.length === 0) return;
    const p = periods.find((x) => Number(x.id) === Number(selectedId));
    try {
      setExporting(true);
      exportPayrollPeriodPreview({
        rows: previewRows,
        periodId: selectedId,
        periodFrom: p?.from_at,
        periodTo: p?.to_at,
        periodStatus: p?.status,
      });
    } finally {
      setExporting(false);
    }
  }, [selectedId, previewRows, periods]);

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
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between gap-3 flex-wrap">
          <p className="text-sm font-bold text-slate-700">Preview lương theo kỳ</p>
          <div className="flex items-center gap-2">
            {previewLoading && <Loader2 className="w-4 h-4 animate-spin text-slate-400" />}
            <button
              type="button"
              onClick={exportPreviewExcel}
              disabled={exporting || previewRows.length === 0 || selectedId == null}
              className={cn(
                "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all",
                exporting || previewRows.length === 0 || selectedId == null
                  ? "bg-slate-50 text-slate-400 border-slate-200 cursor-not-allowed"
                  : "bg-white text-slate-700 border-slate-200 hover:border-emerald-200 hover:text-emerald-700"
              )}
            >
              {exporting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5 shrink-0" />}
              Xuất Excel
            </button>
          </div>
        </div>
        {previewRows.length === 0 ? (
          <div className="py-12 text-center text-slate-400 text-sm">Chưa có dữ liệu trong kỳ này</div>
        ) : (
          <div className="overflow-x-auto">
            <p className="text-xs text-slate-500 px-5 pt-4 pb-1 leading-relaxed">
              <span className="font-semibold text-slate-600">Điều chỉnh:</span> tổng số cộng hoặc trừ thủ công gán vào kỳ này (bảng{" "}
              <code className="text-[11px] bg-slate-100 px-1 rounded">payroll_adjustments</code>
              ), được cộng vào <span className="font-semibold">Tổng lương</span> sau HH, ship và NV chịu (công thức preview backend).
            </p>
            <table className="min-w-[820px] w-full text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100">
                  <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500">Nhân viên</th>
                  <th
                    className="px-5 py-3 text-right text-xs font-semibold text-slate-500 max-w-[220px]"
                    title="HH bán (direct) + HH CTV (override), trừ HH hoàn (direct + phần override hiển thị); override đã là net (gồm hoàn CTV trong kỳ)."
                  >
                    Hoa hồng
                  </th>
                  <th
                    className="px-5 py-3 text-right text-xs font-semibold text-slate-500"
                    title="Ship do khách trả (theo đơn) và tiền NV chịu trên đơn."
                  >
                    Ship / NV chịu
                  </th>
                  <th
                    className="px-5 py-3 text-right text-xs font-semibold text-slate-500"
                    title="Cộng/trừ thủ công (payroll_adjustments) gán vào kỳ."
                  >
                    Điều chỉnh
                  </th>
                  <th className="px-5 py-3 text-right text-xs font-semibold text-slate-500">Tổng lương</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {previewRows.map((r: any) => (
                  <tr key={r.user_id} className="hover:bg-slate-50/50">
                    <td className="px-5 py-3 font-semibold text-slate-800">{r.full_name}</td>
                    <td className="px-5 py-3 text-right align-top">
                      <div className="space-y-1 text-[13px]">
                        <p className="tabular-nums">
                          <span className="text-slate-400 text-[11px]">Direct </span>
                          <span className="font-medium text-slate-800">
                            {formatCurrency(Number(r.direct_commission) || 0)}
                          </span>
                        </p>
                        <p className="tabular-nums">
                          <span className="text-slate-400 text-[11px]">Override </span>
                          <span className="font-medium text-slate-800">
                            {formatCurrency(Number(r.override_commission) || 0)}
                          </span>
                        </p>
                        {(() => {
                          const total = Number(r.return_commission_abs) || 0;
                          const hasSplit =
                            r.return_commission_direct_abs != null &&
                            r.return_commission_override_abs != null;
                          const directAbs = hasSplit ? Number(r.return_commission_direct_abs) || 0 : 0;
                          const overrideAbs = hasSplit ? Number(r.return_commission_override_abs) || 0 : 0;
                          if (total <= 0) {
                            return (
                              <p className="tabular-nums text-slate-400 text-[11px]">
                                Hoàn (trừ): 0
                              </p>
                            );
                          }
                          return (
                            <div className="space-y-0.5 pt-0.5 border-t border-slate-100">
                              <p className="tabular-nums text-red-600 font-semibold text-[12px]">
                                Hoàn (trừ): {formatCurrency(-total)}
                              </p>
                              {hasSplit && directAbs > 0 ? (
                                <p className="text-[11px] text-slate-500">
                                  NV (direct): −{formatCurrency(directAbs)}
                                </p>
                              ) : null}
                              {hasSplit && overrideAbs > 0 ? (
                                <p className="text-[11px] text-slate-500">
                                  Quản lý (override): −{formatCurrency(overrideAbs)}
                                </p>
                              ) : null}
                            </div>
                          );
                        })()}
                      </div>
                    </td>
                    <td className="px-5 py-3 text-right align-top">
                      <div className="space-y-1 text-[13px]">
                        <p className="tabular-nums">
                          <span className="text-slate-400 text-[11px]">Ship KH </span>
                          <span className="font-medium text-slate-800">
                            {formatCurrency(Number(r.ship_khach_tra) || 0)}
                          </span>
                        </p>
                        <p className="tabular-nums">
                          <span className="text-slate-400 text-[11px]">NV chịu </span>
                          <span
                            className={cn(
                              "font-medium",
                              (Number(r.nv_chiu) || 0) > 0 ? "text-rose-700" : "text-slate-400"
                            )}
                          >
                            {(Number(r.nv_chiu) || 0) > 0
                              ? formatCurrency(Number(r.nv_chiu) || 0)
                              : "—"}
                          </span>
                        </p>
                      </div>
                    </td>
                    <td className="px-5 py-3 text-right tabular-nums text-slate-800">
                      {formatCurrency(Number(r.adjustments) || 0)}
                    </td>
                    <td className="px-5 py-3 text-right font-bold tabular-nums text-violet-900">
                      {formatCurrency(Number(r.total_luong) || 0)}
                    </td>
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

