import * as React from "react";
import { Download, HardDrive, Loader2, RefreshCw } from "lucide-react";

const API_URL =
  (import.meta as { env?: { VITE_API_URL?: string } }).env?.VITE_API_URL || "/api";

const ZALOPILOT_API = `${API_URL.replace(/\/$/, "")}/zalopilot`;

type ZaloPilotFile = {
  name: string;
  size: number;
  modifiedAt: string;
  modifiedMs: number;
  folder?: string;
};

type ZaloPilotListResponse = {
  files: ZaloPilotFile[];
  defaultZipName: string | null;
  folders?: { label: string; exists: boolean }[];
};

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function formatFileDate(iso: string) {
  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(iso));
}

async function parseJsonResponse<T>(res: Response): Promise<T> {
  const text = await res.text();
  if (text.trimStart().startsWith("<")) {
    throw new Error(
      "Server trả trang HTML thay vì JSON — backend chưa chạy hoặc chưa deploy bản mới. Chạy backend port 3000 rồi thử Làm mới."
    );
  }
  try {
    return JSON.parse(text) as T;
  } catch {
    throw new Error("Phản hồi server không hợp lệ");
  }
}

async function downloadZaloPilotFile(file: ZaloPilotFile): Promise<void> {
  const url =
    `${ZALOPILOT_API}/download/${encodeURIComponent(file.name)}` +
    `?v=${file.modifiedMs}&s=${file.size}&_=${Date.now()}`;

  const res = await fetch(url, {
    cache: "no-store",
    headers: {
      Pragma: "no-cache",
      "Cache-Control": "no-cache",
    },
  });

  if (!res.ok) {
    throw new Error("Không tải được file từ server");
  }

  const ct = res.headers.get("content-type") || "";
  if (ct.includes("text/html")) {
    throw new Error("Server trả HTML thay vì file zip — kiểm tra backend và proxy /api");
  }

  const blob = await res.blob();
  const hdrSize = res.headers.get("X-ZaloPilot-Size");
  const hdrName = res.headers.get("X-ZaloPilot-File");
  const expectedSize = hdrSize ? Number(hdrSize) : file.size;

  if (hdrName && hdrName !== file.name) {
    throw new Error(`Server trả sai file (cần ${file.name}, nhận ${hdrName})`);
  }
  if (expectedSize > 0 && blob.size !== expectedSize) {
    throw new Error(
      `Dung lượng không khớp: cần ${formatBytes(expectedSize)}, nhận ${formatBytes(blob.size)}. ` +
        "Đặt zip vào zalopilot-releases/ trên server và restart backend."
    );
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

export function ZaloPilotDownloads() {
  const [files, setFiles] = React.useState<ZaloPilotFile[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [downloadError, setDownloadError] = React.useState<string | null>(null);
  const [downloading, setDownloading] = React.useState<string | null>(null);

  const loadList = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${ZALOPILOT_API}/files?_=${Date.now()}`, { cache: "no-store" });
      if (!res.ok) throw new Error("Không tải được danh sách file");
      const json = await parseJsonResponse<ZaloPilotListResponse>(res);
      setFiles(json.files ?? []);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Lỗi kết nối");
      setFiles([]);
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    void loadList();
  }, [loadList]);

  const handleDownload = async (file: ZaloPilotFile) => {
    setDownloading(file.name);
    setDownloadError(null);
    try {
      await downloadZaloPilotFile(file);
    } catch (e: unknown) {
      setDownloadError(e instanceof Error ? e.message : "Tải thất bại");
    } finally {
      setDownloading(null);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Tải ZaloPilot</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Chọn bản cần tải — mỗi dòng là một file zip trên server.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void loadList()}
          disabled={loading}
          className="inline-flex items-center justify-center gap-2 h-9 px-3 rounded-md border border-border bg-background text-sm hover:bg-accent transition-colors disabled:opacity-50"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
          Làm mới
        </button>
      </div>

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

      <ul className="rounded-lg border border-border bg-card divide-y divide-border">
        {loading && files.length === 0 ? (
          <li className="flex items-center justify-center gap-2 py-14 text-sm text-muted-foreground">
            <Loader2 className="w-5 h-5 animate-spin" />
            Đang tải danh sách…
          </li>
        ) : files.length === 0 && !error ? (
          <li className="flex flex-col items-center gap-3 py-14 px-6 text-center">
            <HardDrive className="w-10 h-10 text-muted-foreground/50" />
            <p className="text-sm text-muted-foreground">
              Chưa có file (.zip, .exe, .msi…). Đặt bản cài vào một trong:{" "}
              <code className="text-xs bg-muted px-1 py-0.5 rounded">zalopilot-releases/</code>,{" "}
              <code className="text-xs bg-muted px-1 py-0.5 rounded">public/zalopilot/</code> hoặc{" "}
              <code className="text-xs bg-muted px-1 py-0.5 rounded">zalopilot/</code> — rồi restart backend và bấm
              Làm mới.
            </p>
          </li>
        ) : (
          files.map((file) => (
            <li
              key={`${file.name}-${file.modifiedMs}`}
              className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 px-4 py-4"
            >
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                  <span className="font-medium text-foreground break-all">{file.name}</span>
                  <span className="text-sm text-muted-foreground tabular-nums shrink-0">
                    · {formatFileDate(file.modifiedAt)}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mt-1 tabular-nums">
                  {formatBytes(file.size)}
                  {file.folder ? (
                    <span className="ml-2 text-muted-foreground/80">· {file.folder}</span>
                  ) : null}
                </p>
              </div>
              <button
                type="button"
                onClick={() => void handleDownload(file)}
                disabled={downloading === file.name}
                className="inline-flex items-center justify-center gap-2 h-9 px-4 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 disabled:opacity-50 shrink-0 w-full sm:w-auto"
              >
                {downloading === file.name ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Download className="w-4 h-4" />
                )}
                Tải
              </button>
            </li>
          ))
        )}
      </ul>
    </div>
  );
}
