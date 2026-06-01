import * as React from "react";
import { Download, FileArchive, HardDrive, Loader2, RefreshCw, Trash2 } from "lucide-react";
import { isAdminUser } from "../lib/utils";

const API_URL =
  (import.meta as { env?: { VITE_API_URL?: string } }).env?.VITE_API_URL || "/api";

const ZALOPILOT_API = `${API_URL.replace(/\/$/, "")}/zalopilot`;

type ZaloPilotFile = {
  id: string;
  name: string;
  size: number;
  modifiedAt: string;
  modifiedMs: number;
};

type ZaloPilotListResponse = {
  files: ZaloPilotFile[];
};

type ZaloPilotDiagnostic = {
  diagnosticId: string;
  uploadedAt: string | null;
  originalFilename: string | null;
  sizeBytes: number;
  modifiedMs: number;
  clientIp: string | null;
};

type ZaloPilotDiagnosticsResponse = {
  diagnostics: ZaloPilotDiagnostic[];
};

type DateGroup<T> = {
  dayKey: string;
  label: string;
  items: T[];
};

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function localDayKey(iso: string) {
  const d = new Date(iso);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function dayGroupLabel(dayKey: string) {
  const today = localDayKey(new Date().toISOString());
  const yesterday = (() => {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    return localDayKey(d.toISOString());
  })();
  if (dayKey === today) return "Hôm nay";
  if (dayKey === yesterday) return "Hôm qua";
  const [y, m, d] = dayKey.split("-").map(Number);
  return new Intl.DateTimeFormat("vi-VN", {
    weekday: "long",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(y, m - 1, d));
}

function formatFileDateTime(iso: string) {
  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}

/** Nhóm theo ngày (local), ngày mới trước; trong ngày sort modifiedMs giảm dần. */
function groupByDay<T extends { modifiedMs: number }>(
  items: T[],
  getIso: (item: T) => string
): DateGroup<T>[] {
  const map = new Map<string, T[]>();
  for (const item of items) {
    const key = localDayKey(getIso(item));
    const list = map.get(key);
    if (list) list.push(item);
    else map.set(key, [item]);
  }
  for (const list of map.values()) {
    list.sort((a, b) => b.modifiedMs - a.modifiedMs);
  }
  return [...map.entries()]
    .sort(([a], [b]) => b.localeCompare(a))
    .map(([dayKey, groupItems]) => ({
      dayKey,
      label: dayGroupLabel(dayKey),
      items: groupItems,
    }));
}

async function parseJsonResponse<T>(res: Response): Promise<T> {
  const text = await res.text();
  if (text.trimStart().startsWith("<")) {
    throw new Error("Không kết nối được API — kiểm tra server ERP đang chạy.");
  }
  return JSON.parse(text) as T;
}

async function downloadZaloPilotFile(file: ZaloPilotFile): Promise<void> {
  const url =
    `${ZALOPILOT_API}/download/${encodeURIComponent(file.name)}` +
    `?v=${file.modifiedMs}&_=${Date.now()}`;

  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error("Không tải được file");

  const blob = await res.blob();
  if (file.size > 0 && blob.size !== file.size) {
    throw new Error("File tải về không khớp dung lượng trên server — thử Làm mới.");
  }

  const blobUrl = window.URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = blobUrl;
  a.download = file.name;
  document.body.appendChild(a);
  a.click();
  window.URL.revokeObjectURL(blobUrl);
  document.body.removeChild(a);
}

function readStoredUser(): { can_access_admin?: boolean; role?: string; is_super_admin?: boolean } | null {
  try {
    const raw = localStorage.getItem("user");
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

async function downloadDiagnosticZip(item: ZaloPilotDiagnostic): Promise<void> {
  const token = localStorage.getItem("token");
  if (!token) throw new Error("Cần đăng nhập ERP");

  const url = `${ZALOPILOT_API}/diagnostics/${encodeURIComponent(item.diagnosticId)}/download?_=${Date.now()}`;
  const res = await fetch(url, {
    cache: "no-store",
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    const text = await res.text();
    try {
      const j = JSON.parse(text) as { error?: string };
      throw new Error(j.error || "Không tải được diagnostic");
    } catch {
      throw new Error("Không tải được diagnostic");
    }
  }

  const blob = await res.blob();
  if (item.sizeBytes > 0 && blob.size !== item.sizeBytes) {
    throw new Error("File tải về không khớp dung lượng trên server");
  }

  const blobUrl = window.URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = blobUrl;
  a.download = `${item.diagnosticId}.zip`;
  document.body.appendChild(a);
  a.click();
  window.URL.revokeObjectURL(blobUrl);
  document.body.removeChild(a);
}

async function apiDelete(path: string): Promise<void> {
  const token = localStorage.getItem("token");
  if (!token) throw new Error("Cần đăng nhập ERP");

  const res = await fetch(`${ZALOPILOT_API}${path}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    const json = await parseJsonResponse<{ error?: string }>(res).catch(() => ({ error: "Xóa thất bại" }));
    throw new Error(json.error || "Xóa thất bại");
  }
}

type FileRowProps = {
  file: ZaloPilotFile;
  isAdmin: boolean;
  downloading: string | null;
  deleting: string | null;
  onDownload: (file: ZaloPilotFile) => void;
  onDelete: (file: ZaloPilotFile) => void;
};

function InstallFileRow({ file, isAdmin, downloading, deleting, onDownload, onDelete }: FileRowProps) {
  return (
    <li className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 px-4 py-4">
      <div className="flex-1 min-w-0">
        <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
          <span className="font-medium text-foreground break-all">{file.name}</span>
        </div>
        <p className="text-sm text-muted-foreground mt-1 tabular-nums">
          {formatFileDateTime(file.modifiedAt)} · {formatBytes(file.size)}
        </p>
      </div>
      <div className="flex flex-wrap gap-2 shrink-0 w-full sm:w-auto">
        <button
          type="button"
          onClick={() => onDownload(file)}
          disabled={downloading === file.id || deleting === file.id}
          className="inline-flex items-center justify-center gap-2 h-9 px-4 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 disabled:opacity-50 flex-1 sm:flex-none"
        >
          {downloading === file.id ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Download className="w-4 h-4" />
          )}
          Tải
        </button>
        {isAdmin && (
          <button
            type="button"
            onClick={() => onDelete(file)}
            disabled={deleting === file.id || downloading === file.id}
            className="inline-flex items-center justify-center gap-2 h-9 px-4 rounded-md border border-destructive/40 text-destructive text-sm hover:bg-destructive/10 disabled:opacity-50 flex-1 sm:flex-none"
          >
            {deleting === file.id ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Trash2 className="w-4 h-4" />
            )}
            Xóa
          </button>
        )}
      </div>
    </li>
  );
}

type DiagnosticRowProps = {
  item: ZaloPilotDiagnostic;
  downloading: string | null;
  deleting: string | null;
  onDownload: (item: ZaloPilotDiagnostic) => void;
  onDelete: (item: ZaloPilotDiagnostic) => void;
};

function DiagnosticRow({ item, downloading, deleting, onDownload, onDelete }: DiagnosticRowProps) {
  const timeIso = item.uploadedAt || new Date(item.modifiedMs).toISOString();
  return (
    <li className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 px-4 py-4">
      <div className="flex-1 min-w-0">
        <span className="font-medium text-foreground font-mono text-sm break-all">
          {item.diagnosticId}
        </span>
        <p className="text-sm text-muted-foreground mt-1 tabular-nums">
          {formatFileDateTime(timeIso)} · {formatBytes(item.sizeBytes)}
          {item.clientIp ? ` · IP ${item.clientIp}` : ""}
        </p>
        {item.originalFilename && (
          <p className="text-xs text-muted-foreground mt-0.5 truncate">
            File gốc: {item.originalFilename}
          </p>
        )}
      </div>
      <div className="flex flex-wrap gap-2 shrink-0 w-full sm:w-auto">
        <button
          type="button"
          onClick={() => onDownload(item)}
          disabled={downloadingDiagBusy(downloading, item) || deletingDiagBusy(deleting, item) || item.sizeBytes <= 0}
          className="inline-flex items-center justify-center gap-2 h-9 px-4 rounded-md border border-border bg-background text-sm hover:bg-accent disabled:opacity-50 flex-1 sm:flex-none"
        >
          {downloading === item.diagnosticId ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Download className="w-4 h-4" />
          )}
          Tải zip
        </button>
        <button
          type="button"
          onClick={() => onDelete(item)}
          disabled={deletingDiagBusy(deleting, item) || downloadingDiagBusy(downloading, item)}
          className="inline-flex items-center justify-center gap-2 h-9 px-4 rounded-md border border-destructive/40 text-destructive text-sm hover:bg-destructive/10 disabled:opacity-50 flex-1 sm:flex-none"
        >
          {deleting === item.diagnosticId ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Trash2 className="w-4 h-4" />
          )}
          Xóa
        </button>
      </div>
    </li>
  );
}

function downloadingDiagBusy(downloading: string | null, item: ZaloPilotDiagnostic) {
  return downloading === item.diagnosticId;
}

function deletingDiagBusy(deleting: string | null, item: ZaloPilotDiagnostic) {
  return deleting === item.diagnosticId;
}

export function ZaloPilotDownloads() {
  const isAdmin = isAdminUser(readStoredUser());
  const [files, setFiles] = React.useState<ZaloPilotFile[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [downloadError, setDownloadError] = React.useState<string | null>(null);
  const [downloading, setDownloading] = React.useState<string | null>(null);
  const [deletingFile, setDeletingFile] = React.useState<string | null>(null);
  const [diagnostics, setDiagnostics] = React.useState<ZaloPilotDiagnostic[]>([]);
  const [diagLoading, setDiagLoading] = React.useState(false);
  const [diagError, setDiagError] = React.useState<string | null>(null);
  const [downloadingDiag, setDownloadingDiag] = React.useState<string | null>(null);
  const [deletingDiag, setDeletingDiag] = React.useState<string | null>(null);

  const fileGroups = React.useMemo(
    () => groupByDay(files, (f) => f.modifiedAt),
    [files]
  );

  const diagnosticGroups = React.useMemo(
    () =>
      groupByDay(diagnostics, (d) =>
        d.uploadedAt ? d.uploadedAt : new Date(d.modifiedMs).toISOString()
      ),
    [diagnostics]
  );

  const loadList = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${ZALOPILOT_API}/files?_=${Date.now()}`, { cache: "no-store" });
      if (!res.ok) throw new Error("Không đọc được thư mục public/zalopilot");
      const json = await parseJsonResponse<ZaloPilotListResponse>(res);
      setFiles(json.files ?? []);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Lỗi kết nối");
      setFiles([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadDiagnostics = React.useCallback(async () => {
    if (!isAdmin) return;
    setDiagLoading(true);
    setDiagError(null);
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${ZALOPILOT_API}/diagnostics?_=${Date.now()}`, {
        cache: "no-store",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) {
        const json = await parseJsonResponse<{ error?: string }>(res);
        throw new Error(json.error || "Không đọc được danh sách diagnostic");
      }
      const json = await parseJsonResponse<ZaloPilotDiagnosticsResponse>(res);
      setDiagnostics(json.diagnostics ?? []);
    } catch (e: unknown) {
      setDiagError(e instanceof Error ? e.message : "Lỗi kết nối");
      setDiagnostics([]);
    } finally {
      setDiagLoading(false);
    }
  }, [isAdmin]);

  const refreshAll = React.useCallback(() => {
    void loadList();
    void loadDiagnostics();
  }, [loadList, loadDiagnostics]);

  const handleDownloadFile = React.useCallback((file: ZaloPilotFile) => {
    setDownloading(file.id);
    setDownloadError(null);
    void downloadZaloPilotFile(file)
      .catch((e: unknown) => {
        setDownloadError(e instanceof Error ? e.message : "Tải thất bại");
      })
      .finally(() => setDownloading(null));
  }, []);

  const handleDeleteFile = React.useCallback(
    (file: ZaloPilotFile) => {
      if (!window.confirm(`Xóa file "${file.name}" khỏi server? Không hoàn tác được.`)) return;
      setDeletingFile(file.id);
      setDownloadError(null);
      void apiDelete(`/files/${encodeURIComponent(file.name)}`)
        .then(() => loadList())
        .catch((e: unknown) => {
          setDownloadError(e instanceof Error ? e.message : "Xóa thất bại");
        })
        .finally(() => setDeletingFile(null));
    },
    [loadList]
  );

  const handleDownloadDiag = React.useCallback((item: ZaloPilotDiagnostic) => {
    setDownloadingDiag(item.diagnosticId);
    setDownloadError(null);
    void downloadDiagnosticZip(item)
      .catch((e: unknown) => {
        setDownloadError(e instanceof Error ? e.message : "Tải thất bại");
      })
      .finally(() => setDownloadingDiag(null));
  }, []);

  const handleDeleteDiag = React.useCallback(
    (item: ZaloPilotDiagnostic) => {
      if (!window.confirm(`Xóa log "${item.diagnosticId}" khỏi server?`)) return;
      setDeletingDiag(item.diagnosticId);
      setDownloadError(null);
      void apiDelete(`/diagnostics/${encodeURIComponent(item.diagnosticId)}`)
        .then(() => loadDiagnostics())
        .catch((e: unknown) => {
          setDownloadError(e instanceof Error ? e.message : "Xóa thất bại");
        })
        .finally(() => setDeletingDiag(null));
    },
    [loadDiagnostics]
  );

  React.useEffect(() => {
    void loadList();
  }, [loadList]);

  React.useEffect(() => {
    void loadDiagnostics();
  }, [loadDiagnostics]);

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Tải ZaloPilot</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Danh sách file trong <code className="text-xs bg-muted px-1 rounded">public/zalopilot</code> trên server
            (FTP: <code className="text-xs bg-muted px-1 rounded">…/erp/public/zalopilot</code>). Sắp xếp theo ngày,
            mới nhất trước.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void refreshAll()}
          disabled={loading || diagLoading}
          className="inline-flex items-center justify-center gap-2 h-9 px-3 rounded-md border border-border bg-background text-sm hover:bg-accent transition-colors disabled:opacity-50"
        >
          {loading || diagLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
          Làm mới
        </button>
      </div>

      {isAdmin && (
        <section className="space-y-4">
          <div>
            <h2 className="text-base font-semibold tracking-tight flex items-center gap-2">
              <FileArchive className="w-4 h-4 text-muted-foreground" />
              Log diagnostic (app gửi lên)
            </h2>
            <p className="text-sm text-muted-foreground mt-1">
              Chỉ Admin. App upload qua API → thư mục{" "}
              <code className="text-xs bg-muted px-1 rounded">public/zalopilot/ZP-…/</code>
            </p>
          </div>

          {diagError && (
            <div className="rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
              {diagError}
            </div>
          )}

          {diagLoading && diagnostics.length === 0 ? (
            <div className="flex items-center justify-center gap-2 py-10 text-sm text-muted-foreground rounded-lg border border-border bg-card">
              <Loader2 className="w-5 h-5 animate-spin" />
              Đang tải log…
            </div>
          ) : diagnostics.length === 0 && !diagError ? (
            <div className="py-10 px-6 text-center text-sm text-muted-foreground rounded-lg border border-border bg-card">
              Chưa có diagnostic nào từ app.
            </div>
          ) : (
            <div className="space-y-6">
              {diagnosticGroups.map((group) => (
                <div key={group.dayKey} className="space-y-2">
                  <h3 className="text-sm font-medium text-muted-foreground px-1">{group.label}</h3>
                  <ul className="rounded-lg border border-border bg-card divide-y divide-border">
                    {group.items.map((item) => (
                      <DiagnosticRow
                        key={item.diagnosticId}
                        item={item}
                        downloading={downloadingDiag}
                        deleting={deletingDiag}
                        onDownload={handleDownloadDiag}
                        onDelete={handleDeleteDiag}
                      />
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {error && (
        <div className="rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {downloadError && (
        <div className="rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {downloadError}
        </div>
      )}

      <section className="space-y-4">
        <h2 className="text-base font-semibold tracking-tight">Bản cài ZaloPilot</h2>

        {loading && files.length === 0 ? (
          <div className="flex items-center justify-center gap-2 py-14 text-sm text-muted-foreground rounded-lg border border-border bg-card">
            <Loader2 className="w-5 h-5 animate-spin" />
            Đang đọc thư mục…
          </div>
        ) : files.length === 0 && !error ? (
          <div className="flex flex-col items-center gap-3 py-14 px-6 text-center rounded-lg border border-border bg-card">
            <HardDrive className="w-10 h-10 text-muted-foreground/50" />
            <p className="text-sm text-muted-foreground">
              Thư mục trống. Upload file vào <code className="text-xs bg-muted px-1 rounded">public/zalopilot</code>{" "}
              rồi bấm Làm mới.
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {fileGroups.map((group) => (
              <div key={group.dayKey} className="space-y-2">
                <h3 className="text-sm font-medium text-muted-foreground px-1">{group.label}</h3>
                <ul className="rounded-lg border border-border bg-card divide-y divide-border">
                  {group.items.map((file) => (
                    <InstallFileRow
                      key={file.id}
                      file={file}
                      isAdmin={isAdmin}
                      downloading={downloading}
                      deleting={deletingFile}
                      onDownload={handleDownloadFile}
                      onDelete={handleDeleteFile}
                    />
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
