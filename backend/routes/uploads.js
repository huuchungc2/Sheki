const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const auth = require('../middleware/auth');

const router = express.Router();

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const uniqueName = `${Date.now()}-${Math.round(Math.random() * 1E9)}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB max
  fileFilter: (req, file, cb) => {
    const allowed = /\.(jpg|jpeg|png|gif|webp)$/i;
    if (allowed.test(file.originalname)) {
      cb(null, true);
    } else {
      cb(new Error('Chỉ hỗ trợ file ảnh: jpg, jpeg, png, gif, webp'));
    }
  }
});

// Upload single image
router.post('/', auth, upload.single('image'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'Không có file nào được tải lên' });
  }
  res.json({
    url: `/api/uploads/${req.file.filename}`,
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
    url: `/api/uploads/${f.filename}`,
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
