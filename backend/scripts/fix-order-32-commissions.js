const { getPool } = require('../config/db');
const { recalculateCommission } = require('../services/orderService');

async function main() {
  const pool = await getPool();

  const [[lan]] = await pool.query('SELECT id, full_name, email FROM users WHERE email = ? LIMIT 1', [
    'lan.sales@velocity.vn',
  ]);
  const [[minh]] = await pool.query('SELECT id, full_name, email FROM users WHERE email = ? LIMIT 1', [
    'minh.sales@velocity.vn',
  ]);

  if (!lan || !minh) {
    throw new Error('Missing Lan or Minh user in DB.');
  }

  const orderId = 32;

  const [[before]] = await pool.query(
    'SELECT id, code, source_type, salesperson_id, collaborator_user_id, total_amount, status FROM orders WHERE id = ?',
    [orderId]
  );

  console.log('Before:', before);
  console.log('Lan:', lan);
  console.log('Minh:', minh);

  // New semantics: salesperson_id = Lan (direct), collaborator_user_id = Minh (override)
  await pool.query(
    'UPDATE orders SET source_type = ?, salesperson_id = ?, collaborator_user_id = ? WHERE id = ?',
    ['collaborator', lan.id, minh.id, orderId]
  );

  await recalculateCommission(orderId);

  const [[after]] = await pool.query(
    'SELECT id, code, source_type, salesperson_id, collaborator_user_id, total_amount, status FROM orders WHERE id = ?',
    [orderId]
  );
  const [commissions] = await pool.query(
    'SELECT id, order_id, user_id, type, ctv_user_id, commission_amount, override_rate, created_at FROM commissions WHERE order_id = ? ORDER BY id',
    [orderId]
  );

  console.log('After:', after);
  console.log('Commissions:', commissions);
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });

