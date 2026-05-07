const { getPool } = require('../config/db');
const authRouter = require('../routes/auth');
const { computeFeatureCaps } = require('./requireFeature');

const COUNTER_SALE_ADDRESS = 'Mua tại cửa hàng';

function orderRowIsCounterSale(row) {
  if (!row) return false;
  return Number(row.is_counter_sale) === 1 || String(row.shipping_address || '').trim() === COUNTER_SALE_ADDRESS;
}

/**
 * PUT /orders/:id — đơn quầy: orders.counter_edit hoặc (module orders.edit + feature orders.edit).
 * Đơn giao: module orders.edit + feature orders.edit.
 * Cần orders.view (hoặc admin).
 */
async function requireOrderPutAccess(req, res, next) {
  try {
    if (!req.user) return res.status(401).json({ error: 'Chưa xác thực' });
    if (req.user.is_super_admin || req.user.can_access_admin) return next();

    const pool = await getPool();
    const orderId = parseInt(req.params.id, 10);
    if (!Number.isFinite(orderId)) return res.status(400).json({ error: 'ID đơn không hợp lệ' });

    const [[order]] = await pool.query(
      'SELECT id, is_counter_sale, shipping_address FROM orders WHERE id = ? AND shop_id = ? LIMIT 1',
      [orderId, req.shopId]
    );
    if (!order) return res.status(404).json({ error: 'Không tìm thấy đơn hàng' });

    const caps = await authRouter.computePermissionCaps(pool, req.user);
    const caps2 = await computeFeatureCaps(pool, req.user);

    if (!caps.orders?.view) {
      return res.status(403).json({ error: 'Không có quyền truy cập' });
    }

    if (orderRowIsCounterSale(order)) {
      const ok =
        caps2['orders.counter_edit'] === true ||
        (caps.orders?.edit === true && caps2['orders.edit'] === true);
      if (!ok) {
        return res.status(403).json({ error: 'Không có quyền sửa đơn tại quầy' });
      }
      return next();
    }

    if (!caps.orders?.edit || !caps2['orders.edit']) {
      return res.status(403).json({ error: 'Không có quyền truy cập' });
    }
    return next();
  } catch (err) {
    return next(err);
  }
}

/**
 * DELETE /orders/:id — đơn quầy: orders.counter_delete hoặc (module orders.delete + feature orders.delete).
 */
async function requireOrderDeleteAccess(req, res, next) {
  try {
    if (!req.user) return res.status(401).json({ error: 'Chưa xác thực' });
    if (req.user.is_super_admin || req.user.can_access_admin) return next();

    const pool = await getPool();
    const orderId = parseInt(req.params.id, 10);
    if (!Number.isFinite(orderId)) return res.status(400).json({ error: 'ID đơn không hợp lệ' });

    const [[order]] = await pool.query(
      'SELECT id, is_counter_sale, shipping_address FROM orders WHERE id = ? AND shop_id = ? LIMIT 1',
      [orderId, req.shopId]
    );
    if (!order) return res.status(404).json({ error: 'Không tìm thấy đơn hàng' });

    const caps = await authRouter.computePermissionCaps(pool, req.user);
    const caps2 = await computeFeatureCaps(pool, req.user);

    if (!caps.orders?.view) {
      return res.status(403).json({ error: 'Không có quyền truy cập' });
    }

    if (orderRowIsCounterSale(order)) {
      const ok =
        caps2['orders.counter_delete'] === true ||
        (caps.orders?.delete === true && caps2['orders.delete'] === true);
      if (!ok) {
        return res.status(403).json({ error: 'Không có quyền xóa đơn tại quầy' });
      }
      return next();
    }

    if (!caps.orders?.delete || !caps2['orders.delete']) {
      return res.status(403).json({ error: 'Không có quyền truy cập' });
    }
    return next();
  } catch (err) {
    return next(err);
  }
}

module.exports = {
  requireOrderPutAccess,
  requireOrderDeleteAccess,
  orderRowIsCounterSale,
  COUNTER_SALE_ADDRESS,
};
