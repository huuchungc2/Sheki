function errorHandler(err, req, res, next) {
  console.error('❌ Error:', err.message);
  console.error('❌ Stack:', err.stack);

  if (err.name === 'ValidationError') {
    return res.status(400).json({ error: err.message });
  }

  if (err.code === 'ER_DUP_ENTRY') {
    return res.status(409).json({ error: 'Dữ liệu đã tồn tại' });
  }

  if (err.code === 'ER_NO_REFERENCED_ROW_2') {
    return res.status(400).json({ error: 'Khóa ngoại không hợp lệ' });
  }

  if (err.code === 'ER_ACCESS_DENIED_ERROR') {
    return res.status(500).json({ error: 'Lỗi kết nối database - Access denied' });
  }

  if (err.code === 'ECONNREFUSED') {
    return res.status(500).json({ error: 'Lỗi kết nối database - Connection refused' });
  }

  if (err.message && err.message.includes('Access denied')) {
    return res.status(500).json({ error: 'Lỗi kết nối database - Access denied for user' });
  }

  res.status(500).json({ error: 'Lỗi server nội bộ: ' + err.message });
}

module.exports = errorHandler;
