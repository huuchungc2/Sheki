const fs = require('fs');
const path = require('path');

const MIME = {
  '.zip': 'application/zip',
  '.apk': 'application/vnd.android.package-archive',
  '.exe': 'application/vnd.microsoft.portable-executable',
  '.msi': 'application/x-msi',
  '.dmg': 'application/x-apple-diskimage',
};

function projectRoot() {
  return path.join(__dirname, '..', '..');
}

/** Thư mục public/zalopilot trong project website (VPS: /var/www/erp/public/zalopilot) */
function getZaloPilotDir() {
  if (process.env.ZALOPILOT_DIR) {
    return path.resolve(process.env.ZALOPILOT_DIR);
  }
  return path.join(projectRoot(), 'public', 'zalopilot');
}

function isSafeBasename(name) {
  return (
    typeof name === 'string' &&
    name.length > 0 &&
    name.length <= 255 &&
    !name.includes('..') &&
    !name.includes('/') &&
    !name.includes('\\') &&
    !name.startsWith('.')
  );
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
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
}

function statToMeta(fullPath, name) {
  const st = fs.statSync(fullPath);
  return {
    id: name,
    name,
    size: st.size,
    modifiedAt: st.mtime.toISOString(),
    modifiedMs: st.mtimeMs,
  };
}

/** Đọc thư mục — có bao nhiêu file thì trả bấy nhiêu (trừ file ẩn). */
function listZaloPilotFiles() {
  const dir = getZaloPilotDir();
  if (!fs.existsSync(dir)) return [];

  const files = [];
  let names;
  try {
    names = fs.readdirSync(dir);
  } catch {
    return [];
  }

  for (const name of names) {
    if (name.startsWith('.')) continue;
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

function resolveZaloPilotFile(filename) {
  const name = decodeFilenameParam(filename);
  if (!isSafeBasename(name)) return null;

  const full = path.join(getZaloPilotDir(), name);
  if (!fs.existsSync(full)) return null;
  try {
    if (!fs.statSync(full).isFile()) return null;
    return full;
  } catch {
    return null;
  }
}

/** Xóa file bản cài trong public/zalopilot (chỉ file, không thư mục con). */
function deleteZaloPilotFile(filename) {
  const full = resolveZaloPilotFile(filename);
  if (!full) return false;
  try {
    fs.unlinkSync(full);
    return true;
  } catch {
    return false;
  }
}

function resolveDefaultZaloPilotZipPath() {
  let best = null;
  let bestMs = -1;
  for (const file of listZaloPilotFiles()) {
    if (!file.name.toLowerCase().endsWith('.zip')) continue;
    if (file.modifiedMs > bestMs) {
      bestMs = file.modifiedMs;
      best = path.join(getZaloPilotDir(), file.name);
    }
  }
  return best;
}

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

  res.sendFile(filePath, { etag: false, lastModified: false, maxAge: 0 }, (err) => {
    if (err) next(err);
  });
}

module.exports = {
  getZaloPilotDir,
  listZaloPilotFiles,
  resolveDefaultZaloPilotZipPath,
  resolveZaloPilotFile,
  deleteZaloPilotFile,
  decodeFilenameParam,
  setZaloPilotNoCacheHeaders,
  sendZaloPilotFile,
  FOLDER_LABEL: 'public/zalopilot',
};
