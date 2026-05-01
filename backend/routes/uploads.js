const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const auth = require('../middleware/auth');
const requireShop = require('../middleware/requireShop');

const router = express.Router();

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Configure multer for file uploads
function extFromMime(mime) {
  const m = String(mime || '').toLowerCase();
  if (m === 'image/jpeg' || m === 'image/jpg' || m === 'image/pjpeg') return '.jpg';
  if (m === 'image/png') return '.png';
  if (m === 'image/gif') return '.gif';
  if (m === 'image/webp') return '.webp';
  if (m === 'image/heic' || m === 'image/heif') return '.heic';
  return '';
}

function pickUploadExt(file) {
  const fromName = path.extname(file.originalname || '');
  if (fromName && fromName !== '.') return fromName;
  const fromMime = extFromMime(file.mimetype);
  if (fromMime) return fromMime;
  return '.jpg';
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const ext = pickUploadExt(file);
    const uniqueName = `${Date.now()}-${Math.round(Math.random() * 1E9)}${ext}`;
    cb(null, uniqueName);
  }
});

const upload = multer({
  storage,
  // Ảnh chụp điện thoại dễ > 5MB; giữ mức vừa phải để tránh abuse
  limits: { fileSize: 12 * 1024 * 1024 }, // 12MB max
  fileFilter: (req, file, cb) => {
    const mime = String(file.mimetype || '').toLowerCase();
    const name = String(file.originalname || '');
    const ext = path.extname(name).toLowerCase();
    const extOk = /\.(jpe?g|png|gif|webp|heic|heif)$/i.test(ext) || /\.(jpe?g|png|gif|webp|heic|heif)$/i.test(name);

    // Mobile: hay gặp application/octet-stream hoặc tên không có đuôi nhưng mime là image/*
    if (mime.startsWith('image/') && mime !== 'image/svg+xml') {
      return cb(null, true);
    }
    if (mime === 'application/octet-stream' && extOk) {
      return cb(null, true);
    }
    if (extOk) {
      return cb(null, true);
    }
    cb(new Error('Chỉ hỗ trợ file ảnh: jpg, jpeg, png, gif, webp, heic, heif'));
  }
});

// Upload single image
router.post('/', auth, requireShop, upload.single('image'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'Không có file nào được tải lên' });
  }
  res.json({
    // Static files are served at /uploads (see backend/server.js)
    url: `/uploads/${req.file.filename}`,
    filename: req.file.filename,
    size: req.file.size
  });
});

// Upload multiple images
router.post('/multiple', auth, upload.array('images', 10), (req, res) => {
  if (!req.files || req.files.length === 0) {
    return res.status(400).json({ error: 'Không có file nào được tải lên' });
  }
  const files = req.files.map(f => ({
    url: `/uploads/${f.filename}`,
    filename: f.filename,
    size: f.size
  }));
  res.json({ files });
});

// Delete image
router.delete('/:filename', auth, (req, res) => {
  const filePath = path.join(uploadsDir, req.params.filename);
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
    res.json({ message: 'Đã xóa ảnh' });
  } else {
    res.status(404).json({ error: 'Không tìm thấy file' });
  }
});

module.exports = router;
