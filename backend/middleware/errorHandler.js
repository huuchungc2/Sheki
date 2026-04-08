const fs = require('fs');
const path = require('path');

function appendErrorLog(payload) {
  try {
    const logsDir = path.join(__dirname, '..', 'logs');
    if (!fs.existsSync(logsDir)) fs.mkdirSync(logsDir);
    const line = JSON.stringify(payload) + '\n';
    fs.appendFileSync(path.join(logsDir, 'error.log'), line, 'utf8');
  } catch (e) {
    // If file logging fails, fallback to console only
    console.error('❌ Failed to write error.log:', e?.message || e);
  }
}

function errorHandler(err, req, res, next) {
  console.error('❌ Error:', err.message);
  console.error('❌ Stack:', err.stack);

  appendErrorLog({
    ts: new Date().toISOString(),
    message: err?.message,
    stack: err?.stack,
    method: req?.method,
    url: req?.originalUrl,
    user_id: req?.user?.id || null,
    statusCode: res?.statusCode || 500,
    ip: req?.ip || req?.connection?.remoteAddress || null,
    userAgent: req?.get?.('User-Agent') || null,
  });

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
