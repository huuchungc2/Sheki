const fs = require('fs');
const path = require('path');

const ALLOWED_EXT = new Set(['.zip', '.exe', '.msi', '.dmg', '.apk']);

const MIME = {
  '.zip': 'application/zip',
  '.exe': 'application/vnd.microsoft.portable-executable',
  '.msi': 'application/x-msi',
  '.dmg': 'application/x-apple-diskimage',
  '.apk': 'application/vnd.android.package-archive',
};

function projectRoot() {
  return path.join(__dirname, '..', '..');
}

/**
 * Thư mục bản cài — KHÔNG nằm trong public/ (tránh Vite copy zip cũ vào dist → nginx phục vụ bản build).
 * Fallback public/zalopilot nếu zalopilot-releases chưa có file.
 */
function getZaloPilotDir() {
  const root = projectRoot();
  const primary = path.join(root, 'zalopilot-releases');
  const legacy = path.join(root, 'public', 'zalopilot');

  if (fs.existsSync(primary)) {
    try {
      const hasFile = fs.readdirSync(primary).some((name) => {
        const full = path.join(primary, name);
        return fs.statSync(full).isFile() && ALLOWED_EXT.has(path.extname(name).toLowerCase());
      });
      if (hasFile) return primary;
    } catch {
      // fall through
    }
  }
  return legacy;
}

function isSafeBasename(name) {
  return typeof name === 'string' && /^[a-zA-Z0-9._-]+$/.test(name) && !name.includes('..');
}

function decodeFilenameParam(raw) {
  if (typeof raw !== 'string' || !raw) return '';
  try {
    return decodeURIComponent(raw);
  } catch {
    return raw;
  }
}

function setZaloPilotNoCacheHeaders(res) {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  res.setHeader('Surrogate-Control', 'no-store');
  res.setHeader('CDN-Cache-Control', 'no-store');
}

function statToMeta(fullPath, name) {
  const st = fs.statSync(fullPath);
  return {
    name,
    size: st.size,
    modifiedAt: st.mtime.toISOString(),
    modifiedMs: st.mtimeMs,
  };
}

/** Liệt kê file (mtime mới nhất trước) — stat lại mỗi request, không cache list. */
function listZaloPilotFiles() {
  const dir = getZaloPilotDir();
  if (!fs.existsSync(dir)) return [];
  const files = [];
  for (const name of fs.readdirSync(dir)) {
    const ext = path.extname(name).toLowerCase();
    if (!ALLOWED_EXT.has(ext)) continue;
    const full = path.join(dir, name);
    try {
      if (!fs.statSync(full).isFile()) continue;
      files.push(statToMeta(full, name));
    } catch {
      // skip
    }
  }
  files.sort((a, b) => b.modifiedMs - a.modifiedMs);
  return files;
}

function resolveDefaultZaloPilotZipPath() {
  const dir = getZaloPilotDir();
  if (!fs.existsSync(dir)) return null;
  let best = null;
  let bestMs = -1;
  for (const name of fs.readdirSync(dir)) {
    if (path.extname(name).toLowerCase() !== '.zip') continue;
    const full = path.join(dir, name);
    try {
      const st = fs.statSync(full);
      if (!st.isFile()) continue;
      if (st.mtimeMs > bestMs) {
        bestMs = st.mtimeMs;
        best = full;
      }
    } catch {
      // skip
    }
  }
  return best;
}

function resolveZaloPilotFile(filename) {
  const name = decodeFilenameParam(filename);
  if (!isSafeBasename(name)) return null;
  const full = path.join(getZaloPilotDir(), name);
  if (!fs.existsSync(full)) return null;
  try {
    if (!fs.statSync(full).isFile()) return null;
    const ext = path.extname(name).toLowerCase();
    if (!ALLOWED_EXT.has(ext)) return null;
    return full;
  } catch {
    return null;
  }
}

/** Đọc lại stat + stream file — không ETag/Last-Modified (tránh 304 / proxy cache). */
function sendZaloPilotFile(res, filePath, next) {
  let stat;
  try {
    stat = fs.statSync(filePath);
    if (!stat.isFile()) {
      return res.status(404).json({ error: 'Không tìm thấy file' });
    }
  } catch {
    return res.status(404).json({ error: 'Không tìm thấy file' });
  }

  const name = path.basename(filePath);
  const ext = path.extname(filePath).toLowerCase();

  setZaloPilotNoCacheHeaders(res);
  res.setHeader('Content-Type', MIME[ext] || 'application/octet-stream');
  res.setHeader('Content-Length', String(stat.size));
  res.setHeader('Content-Disposition', `attachment; filename="${name}"`);
  res.setHeader('X-ZaloPilot-File', name);
  res.setHeader('X-ZaloPilot-Size', String(stat.size));
  res.setHeader('X-ZaloPilot-Mtime', String(stat.mtimeMs));

  res.sendFile(
    filePath,
    {
      etag: false,
      lastModified: false,
      maxAge: 0,
      dotfiles: 'deny',
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
      },
    },
    (err) => {
      if (err) next(err);
    }
  );
}

module.exports = {
  getZaloPilotDir,
  listZaloPilotFiles,
  resolveDefaultZaloPilotZipPath,
  resolveZaloPilotFile,
  decodeFilenameParam,
  setZaloPilotNoCacheHeaders,
  sendZaloPilotFile,
  isSafeBasename,
};
