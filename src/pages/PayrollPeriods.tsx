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
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-center">
          <p className="text-destructive font-semibold">{error}</p>
          <button
            onClick={fetchPeriods}
            className="mt-4 h-10 px-4 bg-primary text-primary-foreground rounded-md text-sm font-semibold hover:opacity-95 transition-opacity"
          >
            Thử lại
          </button>
        </div>
      </div>
    );
  }

  const selected = selectedId != null ? periods.find((p) => Number(p.id) === Number(selectedId)) : null;

  return (
    <div className="space-y-6 min-w-0">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 min-w-0">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">Chốt kỳ lương</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Kỳ hiện tại:{" "}
            <span className="font-semibold text-foreground">
              #{current?.id} • {current?.from_at ? formatDate(current.from_at) : "—"}
            </span>
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={fetchPeriods}
            className="inline-flex items-center gap-2 h-10 px-3 rounded-md border border-border bg-background text-sm font-semibold text-foreground hover:bg-accent transition-colors"
          >
            <RefreshCcw className="w-4 h-4" />
            Làm mới
          </button>
          <button
            onClick={reindexOrders}
            className="inline-flex items-center gap-2 h-10 px-3 rounded-md border border-border bg-background text-sm font-semibold text-foreground hover:bg-accent transition-colors"
          >
            Reindex đơn
          </button>
          {selected?.status === "closed" ? (
            <button
              onClick={rebuildSettlements}
              className="inline-flex items-center gap-2 h-10 px-3 rounded-md border border-border bg-background text-sm font-semibold text-foreground hover:bg-accent transition-colors"
            >
              Rebuild snapshot
            </button>
          ) : null}
          <button
            onClick={closeNow}
            disabled={!current || current.status !== "open" || closing}
            className={cn(
              "inline-flex items-center gap-2 h-10 px-4 rounded-md text-sm font-semibold transition-colors",
              closing || !current || current.status !== "open"
                ? "bg-muted text-muted-foreground cursor-not-allowed"
                : "bg-primary text-primary-foreground hover:opacity-95"
            )}
          >
            {closing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Lock className="w-4 h-4" />}
            Chốt kỳ hiện tại
          </button>
        </div>
      </div>

      <div className="bg-card border border-border rounded-xl p-4 flex flex-col gap-3">
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm font-semibold text-foreground">Chọn kỳ</span>
          <select
            value={selectedId ?? ""}
            onChange={(e) => setSelectedId(e.target.value ? Number(e.target.value) : null)}
            className="ml-auto px-3 py-2 bg-background border border-input rounded-md text-sm font-semibold text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
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
          <div className="text-xs text-muted-foreground flex items-center gap-2">
            {selected.status === "open" ? (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-accent text-accent-foreground font-semibold border border-border">
                <Unlock className="w-3 h-3" /> Đang mở
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-muted text-muted-foreground font-semibold border border-border">
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

      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-border flex items-center justify-between gap-3 flex-wrap">
          <p className="text-sm font-semibold text-foreground">Preview lương theo kỳ</p>
          <div className="flex items-center gap-2">
            {previewLoading && <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />}
            <button
              type="button"
              onClick={exportPreviewExcel}
              disabled={exporting || previewRows.length === 0 || selectedId == null}
              className={cn(
                "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold border transition-colors",
                exporting || previewRows.length === 0 || selectedId == null
                  ? "bg-muted/20 text-muted-foreground border-border cursor-not-allowed"
                  : "bg-background text-foreground border-border hover:bg-accent"
              )}
            >
              {exporting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5 shrink-0" />}
              Xuất Excel
            </button>
          </div>
        </div>
        {previewRows.length === 0 ? (
          <div className="py-12 text-center text-muted-foreground text-sm">Chưa có dữ liệu trong kỳ này</div>
        ) : (
          <div className="overflow-x-auto">
            <p className="text-xs text-muted-foreground px-5 pt-4 pb-1 leading-relaxed">
              <span className="font-semibold text-foreground">Điều chỉnh:</span> tổng số cộng hoặc trừ thủ công gán vào kỳ này (bảng{" "}
              <code className="text-[11px] bg-muted px-1 rounded">payroll_adjustments</code>
              ), được cộng vào <span className="font-semibold">Tổng lương</span> sau HH, ship và NV chịu (công thức preview backend).
            </p>
            <table className="min-w-[960px] w-full text-sm">
              <thead>
                <tr className="bg-muted/30 border-b border-border">
                  <th className="px-5 py-3 text-left text-xs font-semibold text-muted-foreground">Nhân viên</th>
                  <th
                    className="px-5 py-3 text-right text-xs font-semibold text-muted-foreground max-w-[200px]"
                    title="HH bán (direct) và HH CTV (override); override là net trong kỳ (gồm hoàn CTV nếu có)."
                  >
                    Hoa hồng
                  </th>
                  <th
                    className="px-5 py-3 text-right text-xs font-semibold text-destructive bg-destructive/10 max-w-[200px]"
                    title="HH hoàn direct (NV) và hoàn override (QL) phát sinh trong kỳ; trừ vào tổng lương theo công thức preview."
                  >
                    Hoàn
                  </th>
                  <th
                    className="px-5 py-3 text-right text-xs font-semibold text-muted-foreground"
                    title="Ship do khách trả (theo đơn) và tiền NV chịu trên đơn."
                  >
                    Ship / NV chịu
                  </th>
                  <th
                    className="px-5 py-3 text-right text-xs font-semibold text-muted-foreground"
                    title="Cộng/trừ thủ công (payroll_adjustments) gán vào kỳ."
                  >
                    Điều chỉnh
                  </th>
                  <th className="px-5 py-3 text-right text-xs font-semibold text-muted-foreground">Tổng lương</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {previewRows.map((r: any) => (
                  <tr key={r.user_id} className="hover:bg-muted/20">
                    <td className="px-5 py-3 font-semibold text-foreground">{r.full_name}</td>
                    <td className="px-5 py-3 text-right align-top">
                      <div className="space-y-1 text-[13px]">
                        <p className="tabular-nums">
                          <span className="text-muted-foreground text-[11px]">Direct </span>
                          <span className="font-medium text-foreground">
                            {formatCurrency(Number(r.direct_commission) || 0)}
                          </span>
                        </p>
                        <p className="tabular-nums">
                          <span className="text-muted-foreground text-[11px]">Override </span>
                          <span className="font-medium text-foreground">
                            {formatCurrency(Number(r.override_commission) || 0)}
                          </span>
                        </p>
                      </div>
                    </td>
                    <td className="px-5 py-3 text-right align-top bg-destructive/5">
                      {(() => {
                        const total = Number(r.return_commission_abs) || 0;
                        const hasSplit =
                          r.return_commission_direct_abs != null &&
                          r.return_commission_override_abs != null;
                        const directAbs = hasSplit ? Number(r.return_commission_direct_abs) || 0 : 0;
                        const overrideAbs = hasSplit ? Number(r.return_commission_override_abs) || 0 : 0;
                        if (total <= 0) {
                          return (
                            <p className="tabular-nums text-destructive/70 text-[11px] pt-0.5 font-medium">
                              Hoàn (trừ): 0
                            </p>
                          );
                        }
                        return (
                          <div className="space-y-0.5 text-[13px] text-destructive">
                            <p className="tabular-nums font-semibold text-[12px]">
                              Hoàn (trừ): {formatCurrency(-total)}
                            </p>
                            {hasSplit && directAbs > 0 ? (
                              <p className="text-[11px] text-destructive/80 tabular-nums">
                                NV (direct): −{formatCurrency(directAbs)}
                              </p>
                            ) : null}
                            {hasSplit && overrideAbs > 0 ? (
                              <p className="text-[11px] text-destructive/80 tabular-nums">
                                Quản lý (override): −{formatCurrency(overrideAbs)}
                              </p>
                            ) : null}
                          </div>
                        );
                      })()}
                    </td>
                    <td className="px-5 py-3 text-right align-top">
                      <div className="space-y-1 text-[13px]">
                        <p className="tabular-nums">
                          <span className="text-muted-foreground text-[11px]">Ship KH </span>
                          <span className="font-medium text-foreground">
                            {formatCurrency(Number(r.ship_khach_tra) || 0)}
                          </span>
                        </p>
                        <p className="tabular-nums">
                          <span className="text-muted-foreground text-[11px]">NV chịu </span>
                          <span
                            className={cn(
                              "font-medium",
                              (Number(r.nv_chiu) || 0) > 0 ? "text-rose-700" : "text-muted-foreground"
                            )}
                          >
                            {(Number(r.nv_chiu) || 0) > 0
                              ? formatCurrency(Number(r.nv_chiu) || 0)
                              : "—"}
                          </span>
                        </p>
                      </div>
                    </td>
                    <td className="px-5 py-3 text-right tabular-nums text-foreground">
                      {formatCurrency(Number(r.adjustments) || 0)}
                    </td>
                    <td className="px-5 py-3 text-right font-bold tabular-nums text-violet-700 dark:text-violet-300">
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

