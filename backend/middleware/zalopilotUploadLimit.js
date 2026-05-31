const { getClientIp } = require('../utils/clientIp');
const { countTodayDiagnosticUploads } = require('../utils/zalopilotDiagnostics');

/** Sliding window đơn giản trong RAM — đủ chặn spam/DDoS nhẹ trên 1 instance Node */
const buckets = new Map();

function envInt(name, fallback) {
  const n = parseInt(process.env[name] || '', 10);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

function pruneBuckets(now) {
  if (buckets.size < 5000) return;
  for (const [key, b] of buckets) {
    if (now >= b.resetAt) buckets.delete(key);
  }
}

function hitLimit(key, windowMs, max) {
  const now = Date.now();
  pruneBuckets(now);
  let bucket = buckets.get(key);
  if (!bucket || now >= bucket.resetAt) {
    bucket = { count: 0, resetAt: now + windowMs };
    buckets.set(key, bucket);
  }
  bucket.count += 1;
  return bucket.count > max;
}

/** Mọi request tới upload (kể cả 401) — chặn flood trước khi đọc body lớn */
function zalopilotDiagnosticsIpRateLimit(req, res, next) {
  const ip = getClientIp(req) || req.socket?.remoteAddress || 'unknown';
  const windowMs = envInt('ZALOPILOT_UPLOAD_IP_WINDOW_MS', 15 * 60 * 1000);
  const max = envInt('ZALOPILOT_UPLOAD_MAX_PER_IP', 8);

  if (hitLimit(`ip:${ip}`, windowMs, max)) {
    return res.status(429).json({
      error: 'Quá nhiều yêu cầu upload từ IP này, thử lại sau',
    });
  }
  next();
}

/** Sau khi token đúng — chặn fill ổ đĩa trong ngày */
function zalopilotDiagnosticsDailyCap(req, res, next) {
  const maxDay = envInt('ZALOPILOT_UPLOAD_MAX_PER_DAY', 80);
  const today = countTodayDiagnosticUploads();
  if (today >= maxDay) {
    return res.status(503).json({
      error: 'Đã đạt giới hạn upload diagnostic trong ngày trên server',
    });
  }
  next();
}

module.exports = {
  zalopilotDiagnosticsIpRateLimit,
  zalopilotDiagnosticsDailyCap,
};
