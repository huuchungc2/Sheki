const fs = require('fs');
const path = require('path');

const ALLOWED_EXT = new Set(['.zip', '.exe', '.msi', '.dmg', '.apk']);
const FOLDER_LABEL = 'zalopilot';

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

/** Chỉ đọc thư mục <repo>/zalopilot/ */
function getZaloPilotDir() {
  return path.join(projectRoot(), FOLDER_LABEL);
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
    id: name,
    name,
    size: st.size,
    modifiedAt: st.mtime.toISOString(),
    modifiedMs: st.mtimeMs,
  };
}

function isAllowedInstallerFile(name, fullPath) {
  const ext = path.extname(name).toLowerCase();
  if (!ALLOWED_EXT.has(ext)) return false;
  try {
    return fs.statSync(fullPath).isFile();
  } catch {
    return false;
  }
}

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
    if (name === '.gitkeep') continue;
    const full = path.join(dir, name);
    if (!isAllowedInstallerFile(name, full)) continue;
    try {
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
  if (!isAllowedInstallerFile(name, full)) return null;
  return full;
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
  FOLDER_LABEL,
};
