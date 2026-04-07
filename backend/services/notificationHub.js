const jwt = require('jsonwebtoken');

// In-memory SSE hub (no extra deps). Resets on server restart.
const clients = new Map(); // res -> { id, role, full_name }

function parseTokenFromQuery(req) {
  const token = req.query?.token;
  return typeof token === 'string' && token.trim() ? token.trim() : null;
}

function authenticateSse(req) {
  const token = parseTokenFromQuery(req);
  if (!token) return { ok: false, status: 401, error: 'Không có token' };
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    return { ok: true, user: decoded };
  } catch {
    return { ok: false, status: 401, error: 'Token không hợp lệ' };
  }
}

function sseHeaders() {
  return {
    'Content-Type': 'text/event-stream; charset=utf-8',
    'Cache-Control': 'no-cache, no-transform',
    Connection: 'keep-alive',
    // Helps when behind proxies (harmless locally)
    'X-Accel-Buffering': 'no',
  };
}

function writeEvent(res, event, data) {
  res.write(`event: ${event}\n`);
  res.write(`data: ${JSON.stringify(data)}\n\n`);
}

function registerClient(req, res, user) {
  res.writeHead(200, sseHeaders());
  // first chunk so browser considers it "open"
  writeEvent(res, 'connected', { ts: Date.now() });

  clients.set(res, { id: user.id, role: user.role, full_name: user.full_name });

  // keep-alive ping to avoid idle timeouts
  const ping = setInterval(() => {
    try {
      writeEvent(res, 'ping', { ts: Date.now() });
    } catch {}
  }, 25000);

  req.on('close', () => {
    clearInterval(ping);
    clients.delete(res);
  });
}

function shouldDeliver(client, payload) {
  if (!client) return false;
  if (client.role === 'admin') return true;
  // Sales: only own orders
  if (payload && payload.salesperson_id != null) {
    return String(payload.salesperson_id) === String(client.id);
  }
  return false;
}

function publishOrderEvent(type, payload) {
  for (const [res, client] of clients.entries()) {
    if (!shouldDeliver(client, payload)) continue;
    try {
      writeEvent(res, 'order', { type, ...payload, ts: Date.now() });
    } catch {
      clients.delete(res);
    }
  }
}

module.exports = {
  authenticateSse,
  registerClient,
  publishOrderEvent,
};

