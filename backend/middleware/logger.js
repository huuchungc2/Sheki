const { getPool } = require('../config/db');
const { getClientIp } = require('../utils/clientIp');

async function logActivity({ shopId = null, userId, userName, module, action, targetId, targetName, details, ipAddress, userAgent, status = 'success', errorMessage = null }) {
  try {
    const pool = await getPool();
    await pool.query(
      `INSERT INTO activity_logs (shop_id, user_id, user_name, module, action, target_id, target_name, details, ip_address, user_agent, status, error_message)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [shopId, userId, userName, module, action, targetId || null, targetName || null, details ? JSON.stringify(details) : null, ipAddress || null, userAgent || null, status, errorMessage]
    );
  } catch (err) {
    console.error('❌ Failed to log activity:', err.message);
  }
}

// Middleware to auto-log requests
function logMiddleware(req, res, next) {
  const originalJson = res.json.bind(res);
  
  res.json = function(body) {
    const statusCode = res.statusCode;
    const isWrite = ['POST', 'PUT', 'DELETE', 'PATCH'].includes(req.method);
    
    if (isWrite && req.user) {
      const moduleMap = {
        '/api/users': 'employees',
        '/api/customers': 'customers',
        '/api/products': 'products',
        '/api/orders': 'orders',
        '/api/inventory': 'inventory',
        '/api/auth': 'auth',
        '/api/settings': 'settings',
        '/api/import': 'import',
      };
      
      const actionMap = {
        'POST': 'create',
        'PUT': 'update',
        'DELETE': 'delete',
        'PATCH': 'update',
      };
      
      for (const [path, mod] of Object.entries(moduleMap)) {
        if (req.originalUrl && req.originalUrl.startsWith(path)) {
          const status = statusCode >= 400 ? 'error' : 'success';
          const shopId = req.shopId ?? req.user?.shop_id ?? null;
          logActivity({
            shopId,
            userId: req.user.id,
            userName: req.user.full_name,
            module: mod,
            action: actionMap[req.method] || req.method.toLowerCase(),
            targetId: req.params.id || null,
            details: req.body,
            ipAddress: getClientIp(req),
            userAgent: req.get('User-Agent'),
            status,
            errorMessage: status === 'error' ? (body?.error || body?.message) : null,
          });
          break;
        }
      }
    }
    
    return originalJson(body);
  };
  
  next();
}

module.exports = { logActivity, logMiddleware };
