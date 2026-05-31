const express = require('express');
const multer = require('multer');
const path = require('path');
const auth = require('../middleware/auth');
const {
  generateDiagnosticId,
  saveDiagnosticUpload,
  listDiagnostics,
  resolveDiagnosticZipPath,
} = require('../utils/zalopilotDiagnostics');
const { setZaloPilotNoCacheHeaders } = require('../utils/zalopilotFiles');
const { requireZaloPilotToken } = require('../middleware/zalopilotToken');
const {
  zalopilotDiagnosticsIpRateLimit,
  zalopilotDiagnosticsDailyCap,
} = require('../middleware/zalopilotUploadLimit');

const router = express.Router();

const MAX_BYTES = 50 * 1024 * 1024;

function requireAdmin(req, res, next) {
  if (req.user?.is_super_admin || req.user?.can_access_admin === true || req.user?.role === 'admin') {
    return next();
  }
  return res.status(403).json({ error: 'Chỉ Admin mới xem/tải diagnostic' });
}

function isZipUpload(file) {
  const name = String(file.originalname || '');
  const ext = path.extname(name).toLowerCase();
  if (ext !== '.zip') return false;
  const mime = String(file.mimetype || '').toLowerCase();
  if (!mime || mime === 'application/octet-stream') return true;
  return (
    mime === 'application/zip' ||
    mime === 'application/x-zip-compressed' ||
    mime === 'multipart/x-zip'
  );
}

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_BYTES },
  fileFilter: (req, file, cb) => {
    if (isZipUpload(file)) return cb(null, true);
    cb(new Error('Chỉ chấp nhận file .zip (tối đa 50MB)'));
  },
});

router.get('/diagnostics', auth, requireAdmin, (req, res) => {
  res.json({ diagnostics: listDiagnostics() });
});

router.get('/diagnostics/:id/download', auth, requireAdmin, (req, res, next) => {
  const zipPath = resolveDiagnosticZipPath(req.params.id);
  if (!zipPath) {
    return res.status(404).json({ error: 'Không tìm thấy diagnostic' });
  }
  setZaloPilotNoCacheHeaders(res);
  res.setHeader('Content-Type', 'application/zip');
  res.setHeader('Content-Disposition', `attachment; filename="${req.params.id}.zip"`);
  res.sendFile(zipPath, (err) => {
    if (err) next(err);
  });
});

router.post(
  '/diagnostics/upload',
  zalopilotDiagnosticsIpRateLimit,
  requireZaloPilotToken,
  zalopilotDiagnosticsDailyCap,
  upload.single('file'),
  (req, res, next) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'Thiếu field multipart "file"' });
      }

      const diagnosticId = generateDiagnosticId();
      saveDiagnosticUpload({
        diagnosticId,
        fileBuffer: req.file.buffer,
        originalName: req.file.originalname,
        size: req.file.size,
        contentType: req.file.mimetype,
        req,
      });

      res.json({ ok: true, diagnosticId });
    } catch (err) {
      next(err);
    }
  }
);

module.exports = router;
