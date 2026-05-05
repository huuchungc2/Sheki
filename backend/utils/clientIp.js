/**
 * Lấy IP client thật khi Node đứng sau Vite proxy / reverse proxy (socket thường là 127.0.0.1).
 * Chỉ tin X-Forwarded-For khi socket là loopback, hoặc khi TRUST_PROXY=1 (Nginx tin cậy).
 */
function stripIpv4Mapped(ip) {
  if (ip == null || ip === '') return null;
  const s = String(ip).trim();
  if (!s) return null;
  if (s.startsWith('::ffff:')) return s.slice(7);
  return s;
}

function isLoopbackSocket(socketIp) {
  const s = stripIpv4Mapped(socketIp);
  if (!s) return false;
  return s === '127.0.0.1' || s === '::1';
}

function trustForwardedFor(socketIp) {
  if (process.env.TRUST_PROXY === '1' || String(process.env.TRUST_PROXY || '').toLowerCase() === 'true') {
    return true;
  }
  return isLoopbackSocket(socketIp);
}

function getClientIp(req) {
  if (!req) return null;
  const rawSocket = req.socket?.remoteAddress || req.connection?.remoteAddress || '';
  const xff = req.headers['x-forwarded-for'];
  if (xff && trustForwardedFor(rawSocket)) {
    const first = stripIpv4Mapped(String(xff).split(',')[0].trim());
    if (first) return first;
  }
  return stripIpv4Mapped(rawSocket) || null;
}

module.exports = { getClientIp, stripIpv4Mapped };
