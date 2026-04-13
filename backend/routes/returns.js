const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const authorize = require('../middleware/authorize');
const { getPool } = require('../config/db');
const { recalculateStock } = require('../services/orderService');

// Helpers
function normalizeItems(items) {
  if (!Array.isArray(items)) return [];
  return items
    .map(it => ({
      product_id: it.product_id ?? it.productId,
      qty: parseFloat(it.qty ?? it.quantity ?? 0),
    }))
    .filter(it => it.product_id && Number.isFinite(it.qty) && it.qty > 0);
}

async function getReturnedQtyByProduct(pool, orderId) {
  const [rows] = await pool.query(
    `SELECT ri.product_id, COALESCE(SUM(ri.qty), 0) AS returned_qty
     FROM returns r
     JOIN return_items ri ON r.id = ri.return_id
     WHERE r.order_id = ?
     GROUP BY ri.product_id`,
    [orderId]
  );
  return rows.reduce((acc, r) => {
    acc[String(r.product_id)] = parseFloat(r.returned_qty) || 0;
    return acc;
  }, {});
}

function computeOrderItemBaseAmount(it) {
  // Base amount excludes shipping/tax at the moment; focus on item-level revenue.
  const qty = parseFloat(it.qty) || 0;
  const unitPrice = parseFloat(it.unit_price) || 0;
  const discountAmount = parseFloat(it.discount_amount) || 0;
  return Math.max(0, unitPrice * qty - discountAmount);
}

function computeReturnAmountForItem(it, returnQty) {
  const qty = parseFloat(it.qty) || 0;
  if (!qty) return 0;
  const unitPrice = parseFloat(it.unit_price) || 0;
  const discountAmount = parseFloat(it.discount_amount) || 0;
  const perUnitDiscount = discountAmount / qty;
  return Math.max(0, unitPrice * returnQty - perUnitDiscount * returnQty);
}

async function computeReturnBaseTotalForRequest(pool, orderId, requestItems) {
  if (!orderId || !Array.isArray(requestItems) || requestItems.length === 0) return 0;
  const [orderItems] = await pool.query(
    'SELECT product_id, qty, unit_price, discount_amount FROM order_items WHERE order_id = ?',
    [orderId]
  );
  const orderItemsByProduct = orderItems.reduce((acc, it) => {
    const k = String(it.product_id);
    if (!acc[k]) acc[k] = [];
    acc[k].push(it);
    return acc;
  }, {});

  let total = 0;
  for (const reqIt of requestItems) {
    const pid = String(reqIt.product_id);
    let remaining = parseFloat(reqIt.qty) || 0;
    if (remaining <= 0) continue;
    const lines = orderItemsByProduct[pid] || [];
    for (const line of lines) {
      if (remaining <= 0) break;
      const lineQty = parseFloat(line.qty) || 0;
      const take = Math.min(remaining, lineQty);
      if (take > 0) {
        total += computeReturnAmountForItem(line, take);
        remaining -= take;
      }
    }
  }

  return total;
}

async function getOverrideTierRate(pool, ctvRate) {
  const [[t]] = await pool.query(
    `SELECT sales_override_rate
     FROM commission_tiers
     WHERE ctv_rate_min <= ? AND (ctv_rate_max IS NULL OR ctv_rate_max >= ?)
     ORDER BY ctv_rate_min DESC LIMIT 1`,
    [ctvRate, ctvRate]
  );
  return t ? (parseFloat(t.sales_override_rate) || 0) : 0;
}

// GET /api/returns — danh sách đơn hoàn (bảng returns)
// Sales: chỉ đơn gốc do mình bán; Admin: tất cả
router.get('/', auth, async (req, res, next) => {
  try {
    const pool = await getPool();
    const { page = 1, limit = 50, q, date_from, date_to } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    const conds = ['1=1'];
    const params = [];
    if (req.user.scope_own_data) {
      // Sales view: chỉ thấy đơn hoàn của đơn mình bán
      conds.push('o.salesperson_id = ?');
      params.push(req.user.id);
    }
    if (q) {
      conds.push('(o.code LIKE ? OR r.note LIKE ?)');
      params.push(`%${q}%`, `%${q}%`);
    }
    if (date_from) {
      conds.push('DATE(r.created_at) >= ?');
      params.push(String(date_from));
    }
    if (date_to) {
      conds.push('DATE(r.created_at) <= ?');
      params.push(String(date_to));
    }

    const where = 'WHERE ' + conds.join(' AND ');

    const [rows] = await pool.query(
      `SELECT
        r.id, r.order_id, r.return_request_id, r.warehouse_id, r.created_by, r.note, r.created_at,
        o.code as order_code,
        w.name as warehouse_name,
        u.full_name as created_by_name
       FROM returns r
       JOIN orders o ON r.order_id = o.id
       LEFT JOIN warehouses w ON r.warehouse_id = w.id
       JOIN users u ON r.created_by = u.id
       ${where}
       ORDER BY r.created_at DESC
       LIMIT ? OFFSET ?`,
      [...params, parseInt(limit), offset]
    );

    const [countRows] = await pool.query(
      `SELECT COUNT(*) as total FROM returns r JOIN orders o ON r.order_id = o.id ${where}`,
      params
    );

    const ids = rows.map(r => r.id);
    let itemsByRet = {};
    if (ids.length) {
      const [itRows] = await pool.query(
        `SELECT ri.return_id, ri.product_id, ri.qty, p.name as product_name, p.sku
         FROM return_items ri
         JOIN products p ON ri.product_id = p.id
         WHERE ri.return_id IN (${ids.map(() => '?').join(',')})`,
        ids
      );
      itemsByRet = itRows.reduce((acc, r) => {
        const k = String(r.return_id);
        if (!acc[k]) acc[k] = [];
        acc[k].push({
          product_id: r.product_id,
          product_name: r.product_name,
          sku: r.sku,
          qty: parseFloat(r.qty) || 0,
        });
        return acc;
      }, {});
    }

    // Sum commission adjustments per return_id (negative)
    // Sales: chỉ tính phần hoa hồng hoàn của chính mình (tránh cộng cả quản lý/CTV làm lệch KPI)
    let commissionByRet = {};
    if (ids.length) {
      const adjConds = [`return_id IN (${ids.map(() => '?').join(',')})`];
      const adjParams = [...ids];
      if (req.user.scope_own_data) {
        adjConds.push('user_id = ?');
        adjParams.push(req.user.id);
      }
      const [adjRows] = await pool.query(
        `SELECT return_id, COALESCE(SUM(amount), 0) AS total_amount
         FROM commission_adjustments
         WHERE ${adjConds.join(' AND ')}
         GROUP BY return_id`,
        adjParams
      );
      commissionByRet = adjRows.reduce((acc, r) => {
        acc[String(r.return_id)] = parseFloat(r.total_amount) || 0;
        return acc;
      }, {});
    }

    res.json({
      data: await Promise.all(
        rows.map(async (r) => {
          const items = itemsByRet[String(r.id)] || [];
          const return_amount = await computeReturnBaseTotalForRequest(pool, r.order_id, items);
          return {
            ...r,
            items,
            return_amount,
            commission_return_amount: commissionByRet[String(r.id)] || 0,
          };
        })
      ),
      total: countRows[0].total,
      page: parseInt(page),
      limit: parseInt(limit),
    });
  } catch (err) {
    next(err);
  }
});

// ADMIN: tạo yêu cầu hoàn (Sales không được tạo từ UI/API)
// POST /api/returns/requests
router.post('/requests', auth, authorize('admin'), async (req, res, next) => {
  try {
    const pool = await getPool();
    const { order_id, reason } = req.body;
    const items = normalizeItems(req.body.items);

    if (!order_id || items.length === 0) {
      return res.status(400).json({ error: 'Thiếu order_id hoặc items' });
    }

    const [orderRows] = await pool.query(
      'SELECT id, salesperson_id, warehouse_id, status FROM orders WHERE id = ? LIMIT 1',
      [order_id]
    );
    if (!orderRows.length) return res.status(404).json({ error: 'Không tìm thấy đơn hàng' });
    const order = orderRows[0];

    // Chỉ cho hoàn khi đơn đã giao (completed) hoặc đang xử lý? => chặt chẽ: completed
    if (String(order.status) !== 'completed') {
      return res.status(400).json({ error: 'Chỉ có thể yêu cầu hoàn khi đơn đã giao (completed)' });
    }

    // Validate qty <= qty đã mua
    const [orderItems] = await pool.query(
      'SELECT product_id, qty FROM order_items WHERE order_id = ?',
      [order_id]
    );
    const returnedByProduct = await getReturnedQtyByProduct(pool, order_id);
    const boughtByProduct = orderItems.reduce((acc, r) => {
      const pid = String(r.product_id);
      acc[pid] = (acc[pid] || 0) + (parseFloat(r.qty) || 0);
      return acc;
    }, {});
    for (const it of items) {
      const maxQty = parseFloat(boughtByProduct[String(it.product_id)] || 0) || 0;
      const already = parseFloat(returnedByProduct[String(it.product_id)] || 0) || 0;
      const remaining = Math.max(0, maxQty - already);
      if (it.qty > remaining) {
        return res.status(400).json({
          error: `Số lượng hoàn vượt số lượng còn lại (product_id=${it.product_id}, tối đa=${remaining})`
        });
      }
    }

    // Không tạo trùng pending request
    const [existing] = await pool.query(
      'SELECT id FROM return_requests WHERE order_id = ? AND status = "pending" LIMIT 1',
      [order_id]
    );
    if (existing.length) {
      return res.status(409).json({ error: 'Đơn này đã có yêu cầu hoàn đang chờ duyệt' });
    }

    const [rrRes] = await pool.query(
      'INSERT INTO return_requests (order_id, requested_by, status, reason) VALUES (?, ?, "pending", ?)',
      [order_id, req.user.id, reason || null]
    );
    const returnRequestId = rrRes.insertId;

    for (const it of items) {
      await pool.query(
        'INSERT INTO return_request_items (return_request_id, product_id, qty) VALUES (?, ?, ?)',
        [returnRequestId, it.product_id, it.qty]
      );
    }

    res.status(201).json({ id: returnRequestId, message: 'Đã tạo yêu cầu hoàn' });
  } catch (err) {
    next(err);
  }
});

// GET /api/returns/requests — Admin: danh sách yêu cầu hoàn (Sales dùng GET /returns)
router.get('/requests', auth, authorize('admin'), async (req, res, next) => {
  try {
    const pool = await getPool();
    const { status, page = 1, limit = 20 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    const conds = ['1=1'];
    const params = [];
    if (status) {
      conds.push('rr.status = ?');
      params.push(status);
    }
    const where = 'WHERE ' + conds.join(' AND ');

    const [rows] = await pool.query(
      `SELECT
        rr.*,
        o.code as order_code, o.status as order_status, o.total_amount, o.created_at as order_date,
        req.full_name as requested_by_name,
        app.full_name as approved_by_name
       FROM return_requests rr
       JOIN orders o ON rr.order_id = o.id
       JOIN users req ON rr.requested_by = req.id
       LEFT JOIN users app ON rr.approved_by = app.id
       ${where}
       ORDER BY rr.created_at DESC
       LIMIT ? OFFSET ?`,
      [...params, parseInt(limit), offset]
    );

    const [countRows] = await pool.query(
      `SELECT COUNT(*) as total FROM return_requests rr ${where}`,
      params
    );

    // fetch items per request (simple, small)
    const ids = rows.map(r => r.id);
    let itemsByReq = {};
    if (ids.length) {
      const [itRows] = await pool.query(
        `SELECT rri.return_request_id, rri.product_id, rri.qty, p.name as product_name, p.sku
         FROM return_request_items rri
         JOIN products p ON rri.product_id = p.id
         WHERE rri.return_request_id IN (${ids.map(() => '?').join(',')})`,
        ids
      );
      itemsByReq = itRows.reduce((acc, r) => {
        const k = String(r.return_request_id);
        if (!acc[k]) acc[k] = [];
        acc[k].push({
          product_id: r.product_id,
          product_name: r.product_name,
          sku: r.sku,
          qty: parseFloat(r.qty) || 0,
        });
        return acc;
      }, {});
    }

    // For approved requests: compute return_base_total and sum commission_adjustments for return_id
    let returnByReq = {};
    let adjustmentSumByRet = {};
    if (ids.length) {
      const [retRows] = await pool.query(
        `SELECT id, return_request_id FROM returns WHERE return_request_id IN (${ids.map(() => '?').join(',')})`,
        ids
      );
      returnByReq = retRows.reduce((acc, r) => {
        acc[String(r.return_request_id)] = { return_id: r.id };
        return acc;
      }, {});

      const retIds = retRows.map((r) => r.id);
      if (retIds.length) {
        const [adjRows] = await pool.query(
          `SELECT return_id, COALESCE(SUM(amount), 0) AS total_amount
           FROM commission_adjustments
           WHERE return_id IN (${retIds.map(() => '?').join(',')})
           GROUP BY return_id`,
          retIds
        );
        adjustmentSumByRet = adjRows.reduce((acc, r) => {
          acc[String(r.return_id)] = parseFloat(r.total_amount) || 0;
          return acc;
        }, {});
      }
    }

    res.json({
      data: await Promise.all(
        rows.map(async (r) => {
          const items = itemsByReq[String(r.id)] || [];
          const total_amount = parseFloat(r.total_amount) || 0;
          const ret = returnByReq[String(r.id)];
          const return_id = ret?.return_id ?? null;

          let return_base_total = 0;
          let commission_return_amount = 0;
          if (String(r.status) === 'approved' && return_id) {
            return_base_total = await computeReturnBaseTotalForRequest(pool, r.order_id, items);
            commission_return_amount = adjustmentSumByRet[String(return_id)] || 0; // negative sum
          }

          return {
            ...r,
            total_amount,
            items,
            return_id,
            return_base_total,
            commission_return_amount,
          };
        })
      ),
      total: countRows[0].total,
      page: parseInt(page),
      limit: parseInt(limit),
    });
  } catch (err) {
    next(err);
  }
});

// ADMIN: duyệt và tạo đơn hoàn + bút toán hoa hồng âm + cộng kho
// POST /api/returns/requests/:id/approve
router.post('/requests/:id/approve', auth, authorize('admin'), async (req, res, next) => {
  try {
    const pool = await getPool();
    const requestId = parseInt(req.params.id);
    const { admin_note } = req.body;

    const [rrRows] = await pool.query(
      'SELECT * FROM return_requests WHERE id = ? LIMIT 1',
      [requestId]
    );
    if (!rrRows.length) return res.status(404).json({ error: 'Không tìm thấy yêu cầu hoàn' });
    const rr = rrRows[0];
    if (String(rr.status) !== 'pending') {
      return res.status(400).json({ error: 'Yêu cầu hoàn không ở trạng thái pending' });
    }

    const [orderRows] = await pool.query(
      'SELECT id, code, warehouse_id, status FROM orders WHERE id = ? LIMIT 1',
      [rr.order_id]
    );
    if (!orderRows.length) return res.status(404).json({ error: 'Không tìm thấy đơn gốc' });
    const order = orderRows[0];
    if (String(order.status) !== 'completed') {
      return res.status(400).json({ error: 'Chỉ tạo hoàn cho đơn đã giao (completed)' });
    }

    const [reqItems] = await pool.query(
      'SELECT product_id, qty FROM return_request_items WHERE return_request_id = ?',
      [requestId]
    );
    if (!reqItems.length) return res.status(400).json({ error: 'Yêu cầu hoàn không có sản phẩm' });

    // Load original order items with pricing to compute return amount + commissions by returned items (supports multi-tier)
    const [orderItems] = await pool.query(
      'SELECT product_id, qty, unit_price, discount_amount, commission_rate FROM order_items WHERE order_id = ?',
      [rr.order_id]
    );
    const orderItemsByProduct = orderItems.reduce((acc, it) => {
      acc[String(it.product_id)] = acc[String(it.product_id)] || [];
      acc[String(it.product_id)].push(it);
      return acc;
    }, {});
    const orderBaseTotal = orderItems.reduce((sum, it) => sum + computeOrderItemBaseAmount(it), 0);

    let returnBaseTotal = 0;
    let directReturnCommission = 0;
    const overrideReturnCommissionByManager = new Map(); // manager_user_id -> amount (positive)

    // Create returns + items
    const [retRes] = await pool.query(
      'INSERT INTO returns (order_id, return_request_id, warehouse_id, created_by, note) VALUES (?, ?, ?, ?, ?)',
      [rr.order_id, requestId, order.warehouse_id, req.user.id, admin_note || null]
    );
    const returnId = retRes.insertId;
    for (const it of reqItems) {
      const qty = parseFloat(it.qty) || 0;
      if (qty <= 0) continue;
      await pool.query(
        'INSERT INTO return_items (return_id, product_id, qty) VALUES (?, ?, ?)',
        [returnId, it.product_id, qty]
      );

      // Sum return base amount + direct commission by returned items
      const list = orderItemsByProduct[String(it.product_id)] || [];
      // In this system each product typically appears once per order; if multiple lines exist, allocate by remaining qty.
      let remaining = qty;
      for (const line of list) {
        if (remaining <= 0) break;
        const lineQty = parseFloat(line.qty) || 0;
        const take = Math.min(remaining, lineQty);
        if (take > 0) {
          const returnNet = computeReturnAmountForItem(line, take);
          returnBaseTotal += returnNet;

          const directRate = parseFloat(line.commission_rate) || 0;
          if (directRate > 0) {
            directReturnCommission += (returnNet * directRate) / 100;
          }
          remaining -= take;
        }
      }

      // Restore physical stock into warehouse_stock
      await pool.query(
        'UPDATE warehouse_stock SET stock_qty = stock_qty + ? WHERE warehouse_id = ? AND product_id = ?',
        [qty, order.warehouse_id, it.product_id]
      );
      await recalculateStock(it.product_id, order.warehouse_id);
    }

    // Determine which commission rows exist to adjust (sale direct + manager override rows)
    const [commRows] = await pool.query(
      'SELECT user_id, type, ctv_user_id, commission_amount FROM commissions WHERE order_id = ?',
      [rr.order_id]
    );
    const ratio = orderBaseTotal > 0 ? Math.min(1, Math.max(0, returnBaseTotal / orderBaseTotal)) : 0;

    const tierCache = new Map();
    const getTier = async (ctvRate) => {
      const key = String(ctvRate);
      if (tierCache.has(key)) return tierCache.get(key);
      const r = await getOverrideTierRate(pool, ctvRate);
      tierCache.set(key, r);
      return r;
    };

    const overrideManagers = commRows.filter((c) => String(c.type) === 'override');
    if (overrideManagers.length > 0) {
      for (const it of reqItems) {
        const qty = parseFloat(it.qty) || 0;
        if (qty <= 0) continue;
        const list = orderItemsByProduct[String(it.product_id)] || [];
        let remaining = qty;
        for (const line of list) {
          if (remaining <= 0) break;
          const lineQty = parseFloat(line.qty) || 0;
          const take = Math.min(remaining, lineQty);
          if (take <= 0) continue;

          const returnNet = computeReturnAmountForItem(line, take);
          const ctvRate = parseFloat(line.commission_rate) || 0;
          const ovRate = await getTier(ctvRate);
          if (ovRate > 0) {
            const ovAmt = (returnNet * ovRate) / 100;
            for (const m of overrideManagers) {
              const managerId = parseInt(m.user_id, 10);
              overrideReturnCommissionByManager.set(
                managerId,
                (overrideReturnCommissionByManager.get(managerId) || 0) + ovAmt
              );
            }
          }

          remaining -= take;
        }
      }
    }

    const reason =
      ratio >= 0.999
        ? `Hoàn hàng (full) đơn ${order.code}`
        : `Hoàn hàng (partial ${(ratio * 100).toFixed(1)}%) đơn ${order.code}`;

    const directRow = commRows.find((c) => String(c.type) === 'direct');
    if (directRow) {
      const amt = Math.round(directReturnCommission * 100) / 100;
      if (amt !== 0) {
        await pool.query(
          `INSERT INTO commission_adjustments
            (order_id, return_id, user_id, type, ctv_user_id, amount, reason, created_by)
           VALUES (?, ?, ?, 'direct', NULL, ?, ?, ?)`,
          [rr.order_id, returnId, directRow.user_id, -Math.abs(amt), reason, req.user.id]
        );
      }
    }

    for (const m of overrideManagers) {
      const managerId = parseInt(m.user_id, 10);
      const amt = Math.round((overrideReturnCommissionByManager.get(managerId) || 0) * 100) / 100;
      if (!amt) continue;
      await pool.query(
        `INSERT INTO commission_adjustments
          (order_id, return_id, user_id, type, ctv_user_id, amount, reason, created_by)
         VALUES (?, ?, ?, 'override', ?, ?, ?, ?)`,
        [rr.order_id, returnId, managerId, m.ctv_user_id || null, -Math.abs(amt), reason, req.user.id]
      );
    }

    await pool.query(
      'UPDATE return_requests SET status="approved", admin_note=?, approved_by=?, approved_at=NOW() WHERE id=?',
      [admin_note || null, req.user.id, requestId]
    );

    res.json({ id: returnId, message: 'Đã duyệt và tạo đơn hoàn' });
  } catch (err) {
    next(err);
  }
});

// ADMIN: từ chối yêu cầu hoàn
// POST /api/returns/requests/:id/reject
router.post('/requests/:id/reject', auth, authorize('admin'), async (req, res, next) => {
  try {
    const pool = await getPool();
    const requestId = parseInt(req.params.id);
    const { admin_note } = req.body;

    const [rrRows] = await pool.query('SELECT id, status FROM return_requests WHERE id = ? LIMIT 1', [requestId]);
    if (!rrRows.length) return res.status(404).json({ error: 'Không tìm thấy yêu cầu hoàn' });
    if (String(rrRows[0].status) !== 'pending') return res.status(400).json({ error: 'Yêu cầu hoàn không ở trạng thái pending' });

    await pool.query(
      'UPDATE return_requests SET status="rejected", admin_note=?, approved_by=?, approved_at=NOW() WHERE id=?',
      [admin_note || null, req.user.id, requestId]
    );
    res.json({ message: 'Đã từ chối yêu cầu hoàn' });
  } catch (err) {
    next(err);
  }
});

module.exports = router;

