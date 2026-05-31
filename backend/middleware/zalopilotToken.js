const crypto = require('crypto');

const MIN_TOKEN_LEN = 24;

function safeTokenEqual(provided, expected) {
  if (typeof provided !== 'string' || typeof expected !== 'string') return false;
  const a = Buffer.from(provided, 'utf8');
  const b = Buffer.from(expected, 'utf8');
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

function getExpectedUploadToken() {
  return process.env.ZALOPILOT_UPLOAD_TOKEN || process.env.ZALOPILOT_TOKEN || '';
}

function requireZaloPilotToken(req, res, next) {
  const expected = getExpectedUploadToken();
  if (!expected || expected.length < MIN_TOKEN_LEN) {
    return res.status(503).json({
      error: 'ZaloPilot upload chưa được cấu hình (cần ZALOPILOT_UPLOAD_TOKEN ≥ 24 ký tự)',
    });
  }

  const token = req.get('X-ZaloPilot-Token') || '';
  if (!safeTokenEqual(token, expected)) {
    return res.status(401).json({ error: 'Token ZaloPilot không hợp lệ' });
  }
  next();
}

module.exports = { requireZaloPilotToken, MIN_TOKEN_LEN };
