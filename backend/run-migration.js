const mysql = require('mysql2/promise');

(async () => {
  const c = await mysql.createConnection({
    host: '127.0.0.1',
    port: 3306,
    user: 'root',
    password: '',
    database: 'erp'
  });

  // 1. Create groups table
  try {
    await c.query(`CREATE TABLE IF NOT EXISTS groups (
      id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(100) NOT NULL,
      description TEXT,
      is_active TINYINT(1) NOT NULL DEFAULT 1,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_groups_is_active (is_active)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);
    console.log('OK: groups table');
  } catch (e) {
    console.log('groups:', e.message);
  }

  // 2. Create user_groups table
  try {
    await c.query(`CREATE TABLE IF NOT EXISTS user_groups (
      id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      user_id INT UNSIGNED NOT NULL,
      group_id INT UNSIGNED NOT NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      UNIQUE KEY uk_user_group (user_id, group_id),
      INDEX idx_user_groups_user (user_id),
      INDEX idx_user_groups_group (group_id),
      CONSTRAINT fk_user_groups_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      CONSTRAINT fk_user_groups_group FOREIGN KEY (group_id) REFERENCES groups(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);
    console.log('OK: user_groups table');
  } catch (e) {
    console.log('user_groups:', e.message);
  }

  // 3. Add group_id to orders
  try {
    await c.query('ALTER TABLE orders ADD COLUMN group_id INT UNSIGNED DEFAULT NULL AFTER warehouse_id');
    console.log('OK: orders.group_id column');
  } catch (e) {
    console.log('orders.group_id:', e.message);
  }

  try {
    await c.query('ALTER TABLE orders ADD INDEX idx_orders_group (group_id)');
    console.log('OK: orders.group_id index');
  } catch (e) {
    console.log('index:', e.message);
  }

  try {
    await c.query('ALTER TABLE orders ADD CONSTRAINT fk_orders_group FOREIGN KEY (group_id) REFERENCES groups(id) ON DELETE SET NULL');
    console.log('OK: orders.group_id FK');
  } catch (e) {
    console.log('FK:', e.message);
  }

  // 4. Add missing columns to customers
  try {
    await c.query('ALTER TABLE customers ADD COLUMN district VARCHAR(50) DEFAULT NULL AFTER city');
  } catch (e) {}
  try {
    await c.query('ALTER TABLE customers ADD COLUMN ward VARCHAR(50) DEFAULT NULL AFTER district');
  } catch (e) {}
  try {
    await c.query('ALTER TABLE customers ADD COLUMN note TEXT DEFAULT NULL AFTER assigned_employee_id');
  } catch (e) {}

  // 5. Seed default groups
  try {
    await c.query("INSERT IGNORE INTO groups (name, description) VALUES ('TNK', 'Nhom TNK'), ('SHEKI', 'Nhom SHEKI'), ('KHA', 'Nhom KHA')");
    console.log('OK: seed groups');
  } catch (e) {
    console.log('seed:', e.message);
  }

  // Verify
  const [groups] = await c.query('SELECT * FROM groups');
  console.log('Groups:', groups.length);

  const [cols] = await c.query('SHOW COLUMNS FROM orders LIKE "group_id"');
  console.log('orders.group_id exists:', cols.length > 0);

  c.end();
  console.log('Migration done!');
})();
