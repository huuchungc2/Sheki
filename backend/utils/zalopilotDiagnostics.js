const fs = require('fs');
const path = require('path');
const { getClientIp } = require('./clientIp');
const { getZaloPilotDir } = require('./zalopilotFiles');

const DIAGNOSTIC_ID_RE = /^ZP-\d{8}-\d{4}$/;

/** Cùng thư mục bản cài: public/zalopilot (hoặc ZALOPILOT_DIR / ZALOPILOT_DIAGNOSTICS_DIR) */
function getDiagnosticsStorageDir() {
  if (process.env.ZALOPILOT_DIAGNOSTICS_DIR) {
    return path.resolve(process.env.ZALOPILOT_DIAGNOSTICS_DIR);
  }
  return getZaloPilotDir();
}

function todayDateStr() {
  const today = new Date();
  return `${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, '0')}${String(today.getDate()).padStart(2, '0')}`;
}

/** Mã ZP-YYYYMMDD-XXXX — reset seq theo ngày, đếm thư mục trên disk (không DB) */
function generateDiagnosticId() {
  const dateStr = todayDateStr();
  const prefix = `ZP-${dateStr}-`;
  const baseDir = getDiagnosticsStorageDir();
  let maxSeq = 0;

  if (fs.existsSync(baseDir)) {
    const re = new RegExp(`^ZP-${dateStr}-(\\d{4})$`);
    for (const name of fs.readdirSync(baseDir)) {
      const m = name.match(re);
      if (m) {
        const seq = parseInt(m[1], 10);
        if (Number.isFinite(seq) && seq > maxSeq) maxSeq = seq;
      }
    }
  }

  return `${prefix}${String(maxSeq + 1).padStart(4, '0')}`;
}

function countTodayDiagnosticUploads() {
  const dateStr = todayDateStr();
  const re = new RegExp(`^ZP-${dateStr}-\\d{4}$`);
  const baseDir = getDiagnosticsStorageDir();
  if (!fs.existsSync(baseDir)) return 0;
  let n = 0;
  for (const name of fs.readdirSync(baseDir)) {
    if (re.test(name)) {
      try {
        if (fs.statSync(path.join(baseDir, name)).isDirectory()) n += 1;
      } catch {
        // skip
      }
    }
  }
  return n;
}

function isValidDiagnosticId(diagnosticId) {
  return DIAGNOSTIC_ID_RE.test(String(diagnosticId || ''));
}

function listDiagnostics() {
  const baseDir = getDiagnosticsStorageDir();
  if (!fs.existsSync(baseDir)) return [];

  const items = [];
  for (const name of fs.readdirSync(baseDir)) {
    if (!isValidDiagnosticId(name)) continue;
    const dir = path.join(baseDir, name);
    try {
      if (!fs.statSync(dir).isDirectory()) continue;
    } catch {
      continue;
    }

    const zipPath = path.join(dir, 'diagnostic.zip');
    const metaPath = path.join(dir, 'metadata.json');
    let metadata = null;
    if (fs.existsSync(metaPath)) {
      try {
        metadata = JSON.parse(fs.readFileSync(metaPath, 'utf8'));
      } catch {
        metadata = null;
      }
    }

    let size = 0;
    let modifiedMs = 0;
    if (fs.existsSync(zipPath)) {
      try {
        const st = fs.statSync(zipPath);
        if (st.isFile()) {
          size = st.size;
          modifiedMs = st.mtimeMs;
        }
      } catch {
        // skip
      }
    }

    items.push({
      diagnosticId: name,
      uploadedAt: metadata?.uploadedAt || null,
      originalFilename: metadata?.originalFilename || null,
      sizeBytes: size,
      modifiedMs,
      clientIp: metadata?.clientIp || null,
    });
  }

  items.sort((a, b) => (b.modifiedMs || 0) - (a.modifiedMs || 0));
  return items;
}

function resolveDiagnosticZipPath(diagnosticId) {
  if (!isValidDiagnosticId(diagnosticId)) return null;
  const zipPath = path.join(getDiagnosticsStorageDir(), diagnosticId, 'diagnostic.zip');
  if (!fs.existsSync(zipPath)) return null;
  try {
    if (!fs.statSync(zipPath).isFile()) return null;
    return zipPath;
  } catch {
    return null;
  }
}

function ensureDiagnosticDir(diagnosticId) {
  if (!isValidDiagnosticId(diagnosticId)) {
    throw new Error('Mã diagnostic không hợp lệ');
  }
  const dir = path.join(getDiagnosticsStorageDir(), diagnosticId);
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

function saveDiagnosticUpload({ diagnosticId, fileBuffer, originalName, size, contentType, req }) {
  const dir = ensureDiagnosticDir(diagnosticId);
  fs.writeFileSync(path.join(dir, 'diagnostic.zip'), fileBuffer);

  const metadata = {
    diagnosticId,
    uploadedAt: new Date().toISOString(),
    originalFilename: originalName || null,
    sizeBytes: size,
    contentType: contentType || 'application/zip',
    clientIp: req ? getClientIp(req) || null : null,
    userAgent: req?.get?.('User-Agent') || null,
  };

  fs.writeFileSync(path.join(dir, 'metadata.json'), `${JSON.stringify(metadata, null, 2)}\n`, 'utf8');
  return { dir, metadata };
}

module.exports = {
  getDiagnosticsStorageDir,
  isValidDiagnosticId,
  generateDiagnosticId,
  countTodayDiagnosticUploads,
  listDiagnostics,
  resolveDiagnosticZipPath,
  saveDiagnosticUpload,
};
