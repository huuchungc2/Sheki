import * as React from "react";
import { useSearchParams } from "react-router-dom";
import {
  Loader2,
  Calendar,
  Lock,
  Unlock,
  RefreshCcw,
  Download,
  Filter,
  Search,
  ChevronDown,
  X,
} from "lucide-react";
import { cn, formatCurrency, formatDate, isAdminUser } from "../lib/utils";
import { exportPayrollPeriodPreview } from "../lib/exportExcel";

const API_URL = (import.meta as any)?.env?.VITE_API_URL || "/api";

const payrollSelectCls =
  "min-h-10 rounded-md border border-input bg-background px-3 py-2 text-sm font-medium text-foreground outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background";

type Period = {
  id: number;
  from_at: string;
  to_at: string | null;
  status: "open" | "closed";
  closed_at: string | null;
};

export function PayrollPeriods() {
  const [searchParams, setSearchParams] = useSearchParams();
  const employeeIdRaw = (searchParams.get("employee") ?? "").trim();
  const patchSearchParams = React.useCallback(
    (patch: Record<string, string | null | undefined>) => {
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          for (const [k, v] of Object.entries(patch)) {
            if (v === null || v === undefined || v === "") next.delete(k);
            else next.set(k, v);
          }
          return next;
        },
        { replace: true }
      );
    },
    [setSearchParams]
  );

  const [currentUser, setCurrentUser] = React.useState<any>(() => {
    try {
      const u = localStorage.getItem("user");
      return u ? JSON.parse(u) : null;
    } catch {
      return null;
    }
  });
  const isAdmin = isAdminUser(currentUser);
  const previewEmployeeId =
    isAdmin && employeeIdRaw && /^\d+$/.test(employeeIdRaw) ? employeeIdRaw : null;

  React.useEffect(() => {
    if (!isAdmin && employeeIdRaw) patchSearchParams({ employee: null });
  }, [isAdmin, employeeIdRaw, patchSearchParams]);

  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [periods, setPeriods] = React.useState<Period[]>([]);
  const [current, setCurrent] = React.useState<Period | null>(null);
  const [closing, setClosing] = React.useState(false);
  const [previewRows, setPreviewRows] = React.useState<any[]>([]);
  const [previewLoading, setPreviewLoading] = React.useState(false);
  const [exporting, setExporting] = React.useState(false);
  const [selectedId, setSelectedId] = React.useState<number | null>(null);

  const [showEmployeeMenu, setShowEmployeeMenu] = React.useState(false);
  const [employeeQuery, setEmployeeQuery] = React.useState("");
  const [employeeOptions, setEmployeeOptions] = React.useState<any[]>([]);
  const [employeeLoading, setEmployeeLoading] = React.useState(false);
  const [employeeSelectedName, setEmployeeSelectedName] = React.useState("");

  React.useEffect(() => {
    if (!isAdmin || !showEmployeeMenu) return;
    const q = employeeQuery.trim();
    const t = window.setTimeout(async () => {
      try {
        setEmployeeLoading(true);
        const token = localStorage.getItem("token") || "";
        const params = new URLSearchParams({
          scoped: "1",
          limit: "20",
          active_only: "1",
          ...(q ? { search: q } : {}),
        });
        const res = await fetch(`${API_URL}/users?${params}`, { headers: { Authorization: `Bearer ${token}` } });
        if (!res.ok) return;
        const j = await res.json();
        setEmployeeOptions(j?.data || []);
      } catch {
        setEmployeeOptions([]);
      } finally {
        setEmployeeLoading(false);
      }
    }, 200);
    return () => window.clearTimeout(t);
  }, [isAdmin, showEmployeeMenu, employeeQuery]);

  React.useEffect(() => {
    if (!previewEmployeeId) {
      setEmployeeSelectedName("");
      return;
    }
    const token = localStorage.getItem("token");
    fetch(`${API_URL}/users/${previewEmployeeId}`, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => setEmployeeSelectedName(String(j?.data?.full_name || "")))
      .catch(() => setEmployeeSelectedName(""));
  }, [previewEmployeeId]);

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

  const fetchPreview = React.useCallback(
    async (periodId: number) => {
      setPreviewLoading(true);
      try {
        const token = localStorage.getItem("token");
        const empQ = previewEmployeeId ? `?employee=${encodeURIComponent(previewEmployeeId)}` : "";
        const res = await fetch(`${API_URL}/payroll/periods/${periodId}/preview${empQ}`, {
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
    },
    [previewEmployeeId]
  );

  React.useEffect(() => {
    fetchPeriods();
  }, [fetchPeriods]);

  React.useEffect(() => {
    if (selectedId != null) fetchPreview(selectedId);
  }, [selectedId, fetchPreview]);

  React.useEffect(() => {
    const onAuth = () => {
      try {
        const u = localStorage.getItem("user");
        setCurrentUser(u ? JSON.parse(u) : null);
      } catch {
        setCurrentUser(null);
      }
    };
    window.addEventListener("auth-change", onAuth as any);
    return () => window.removeEventListener("auth-change", onAuth as any);
  }, []);

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
        filteredEmployeeId: previewEmployeeId ? Number(previewEmployeeId) : null,
        filteredEmployeeName: previewEmployeeId ? employeeSelectedName || null : null,
      });
    } finally {
      setExporting(false);
    }
  }, [selectedId, previewRows, periods, previewEmployeeId, employeeSelectedName]);

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

      <div className="rounded-xl border border-border bg-card p-4 shadow-sm md:p-5 space-y-4">
        <div className="flex items-center gap-2 text-foreground">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-muted text-muted-foreground">
            <Filter className="h-4 w-4" />
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground">Lọc preview lương</p>
            <p className="text-xs text-muted-foreground">
              Chọn kỳ lương{isAdmin ? ", Admin: nhân viên (salesperson / dòng lương theo user_id)" : ""}
            </p>
          </div>
        </div>
        <div className="flex flex-col gap-4 lg:flex-row lg:flex-wrap lg:items-end">
          <label className="flex flex-col gap-1.5 min-w-[220px] flex-1">
            <span className="text-xs font-medium text-muted-foreground">Kỳ lương</span>
            <select
              value={selectedId ?? ""}
              onChange={(e) => setSelectedId(e.target.value ? Number(e.target.value) : null)}
              className={payrollSelectCls}
            >
              {periods.map((p) => (
                <option key={p.id} value={p.id}>
                  #{p.id} • {p.status === "open" ? "Đang mở" : "Đã chốt"} • {formatDate(p.from_at)}
                  {p.to_at ? ` → ${formatDate(p.to_at)}` : ""}
                </option>
              ))}
            </select>
          </label>
          {isAdmin ? (
            <div className="relative">
              <button
                type="button"
                onClick={() => {
                  setShowEmployeeMenu((v) => !v);
                  setEmployeeQuery("");
                }}
                className="flex h-10 min-w-[200px] items-center justify-between gap-2 rounded-md border border-input bg-background px-3 text-sm font-medium text-foreground transition-colors hover:bg-accent/50"
                title="Lọc preview theo một nhân viên (user_id trên bảng lương)"
              >
                <span className="truncate">
                  {previewEmployeeId
                    ? employeeSelectedName || `NV #${previewEmployeeId}`
                    : "Tất cả nhân viên"}
                </span>
                <ChevronDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
              </button>
              {showEmployeeMenu && (
                <div className="absolute left-0 top-full z-50 mt-1 w-[18rem] overflow-hidden rounded-lg border border-border bg-popover text-popover-foreground shadow-lg">
                  <div className="border-b border-border p-2">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <input
                        value={employeeQuery}
                        onChange={(e) => setEmployeeQuery(e.target.value)}
                        placeholder="Gõ tên/username/phone..."
                        className="h-10 w-full rounded-md border border-input bg-background pl-9 pr-9 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                      />
                      <button
                        type="button"
                        onClick={() => setShowEmployeeMenu(false)}
                        className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-muted-foreground hover:bg-accent hover:text-foreground"
                        title="Đóng"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        patchSearchParams({ employee: null });
                        setShowEmployeeMenu(false);
                      }}
                      className={cn(
                        "mt-2 w-full rounded-lg px-3 py-2 text-left text-sm transition-colors",
                        !previewEmployeeId
                          ? "bg-accent font-semibold text-accent-foreground"
                          : "text-foreground hover:bg-accent/50"
                      )}
                    >
                      Tất cả nhân viên
                    </button>
                  </div>
                  <div className="max-h-72 overflow-auto">
                    {employeeLoading ? (
                      <div className="flex items-center gap-2 px-3 py-3 text-sm text-muted-foreground">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Đang tải...
                      </div>
                    ) : employeeOptions.length === 0 ? (
                      <div className="px-3 py-3 text-sm text-muted-foreground">Không tìm thấy nhân viên</div>
                    ) : (
                      employeeOptions.map((emp: any) => (
                        <button
                          key={emp.id}
                          type="button"
                          onClick={() => {
                            patchSearchParams({ employee: String(emp.id) });
                            setEmployeeSelectedName(String(emp.full_name || ""));
                            setShowEmployeeMenu(false);
                          }}
                          className={cn(
                            "w-full px-3 py-2.5 text-left text-sm transition-colors hover:bg-accent/50",
                            String(previewEmployeeId) === String(emp.id)
                              ? "bg-accent font-semibold text-accent-foreground"
                              : "text-foreground"
                          )}
                        >
                          <div className="flex items-center justify-between gap-3">
                            <span className="truncate">{emp.full_name}</span>
                            <span className="shrink-0 text-xs text-muted-foreground">#{emp.id}</span>
                          </div>
                          {emp.username ? (
                            <div className="mt-0.5 truncate text-xs text-muted-foreground">{emp.username}</div>
                          ) : null}
                        </button>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>
          ) : null}
        </div>

        {previewEmployeeId && isAdmin ? (
          <p className="text-xs text-muted-foreground">
            Preview chỉ hiển thị một dòng lương theo <span className="font-semibold text-foreground">user_id</span> đã chọn
            (HH direct/ship/NV chịu theo đơn salesperson; HH override/hoàn QL theo user nhận override).
          </p>
        ) : null}

        {selected && (
          <div className="flex items-center gap-2 border-t border-border pt-3 text-xs text-muted-foreground">
            <Calendar className="h-4 w-4 shrink-0 text-muted-foreground" />
            {selected.status === "open" ? (
              <span className="inline-flex items-center gap-1 rounded-full border border-border bg-accent px-2 py-0.5 font-semibold text-accent-foreground">
                <Unlock className="h-3 w-3" /> Đang mở
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 rounded-full border border-border bg-muted px-2 py-0.5 font-semibold text-muted-foreground">
                <Lock className="h-3 w-3" /> Đã chốt
              </span>
            )}
            <span>
              Từ <span className="font-semibold text-foreground">{formatDate(selected.from_at)}</span>
              {selected.to_at ? (
                <>
                  {" "}
                  đến <span className="font-semibold text-foreground">{formatDate(selected.to_at)}</span>
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
          <div className="py-12 text-center text-sm text-muted-foreground">
            {previewEmployeeId
              ? "Không có dữ liệu lương cho nhân viên đã chọn trong kỳ này."
              : "Chưa có dữ liệu trong kỳ này"}
          </div>
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

