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

/** Mọi thư mục có thể chứa bản cài (ưu tiên releases → public/zalopilot → zalopilot/) */
function getZaloPilotDirs() {
  const root = projectRoot();
  return [
    { key: 'zalopilot-releases', dir: path.join(root, 'zalopilot-releases') },
    { key: 'public/zalopilot', dir: path.join(root, 'public', 'zalopilot') },
    { key: 'zalopilot', dir: path.join(root, 'zalopilot') },
  ];
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

function statToMeta(fullPath, name, folder) {
  const st = fs.statSync(fullPath);
  return {
    name,
    size: st.size,
    modifiedAt: st.mtime.toISOString(),
    modifiedMs: st.mtimeMs,
    folder,
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

/** Liệt kê mọi file cài đặt trong tất cả thư mục zalopilot (trùng tên → giữ bản mtime mới hơn). */
function listZaloPilotFiles() {
  const byName = new Map();

  for (const { key, dir } of getZaloPilotDirs()) {
    if (!fs.existsSync(dir)) continue;
    let names;
    try {
      names = fs.readdirSync(dir);
    } catch {
      continue;
    }
    for (const name of names) {
      if (name === '.gitkeep') continue;
      const full = path.join(dir, name);
      if (!isAllowedInstallerFile(name, full)) continue;
      try {
        const meta = statToMeta(full, name, key);
        const prev = byName.get(name);
        if (!prev || meta.modifiedMs > prev.modifiedMs) {
          byName.set(name, meta);
        }
      } catch {
        // skip
      }
    }
  }

  const files = Array.from(byName.values());
  files.sort((a, b) => b.modifiedMs - a.modifiedMs);
  return files;
}

/** Thư mục đầu tiên tồn tại (để hiển thị gợi ý upload). */
function getZaloPilotDir() {
  for (const { dir } of getZaloPilotDirs()) {
    if (fs.existsSync(dir)) return dir;
  }
  return getZaloPilotDirs()[0].dir;
}

function resolveZaloPilotFilePath(filename) {
  const name = decodeFilenameParam(filename);
  if (!isSafeBasename(name)) return null;

  let newest = null;
  let newestMs = -1;

  for (const { dir } of getZaloPilotDirs()) {
    const full = path.join(dir, name);
    if (!fs.existsSync(full)) continue;
    if (!isAllowedInstallerFile(name, full)) continue;
    try {
      const st = fs.statSync(full);
      if (st.mtimeMs >= newestMs) {
        newestMs = st.mtimeMs;
        newest = full;
      }
    } catch {
      // skip
    }
  }
  return newest;
}

function resolveDefaultZaloPilotZipPath() {
  let best = null;
  let bestMs = -1;
  for (const file of listZaloPilotFiles()) {
    if (!file.name.toLowerCase().endsWith('.zip')) continue;
    if (file.modifiedMs > bestMs) {
      bestMs = file.modifiedMs;
      best = resolveZaloPilotFilePath(file.name);
    }
  }
  return best;
}

function resolveZaloPilotFile(filename) {
  return resolveZaloPilotFilePath(filename);
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
  getZaloPilotDirs,
  listZaloPilotFiles,
  resolveDefaultZaloPilotZipPath,
  resolveZaloPilotFile,
  decodeFilenameParam,
  setZaloPilotNoCacheHeaders,
  sendZaloPilotFile,
  isSafeBasename,
};
