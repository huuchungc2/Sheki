const mysql = require('mysql2/promise');

async function migrate() {
  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'erp',
  });

  try {
    console.log('🔄 Creating user_collaborators table...');

    await connection.query(`
      CREATE TABLE IF NOT EXISTS \`user_collaborators\` (
        \`id\` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        \`user_id\` INT UNSIGNED NOT NULL,
        \`collaborator_id\` INT UNSIGNED NOT NULL,
        \`commission_rate\` DECIMAL(5,2) DEFAULT 0.00,
        \`created_at\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY \`uk_user_collaborator\` (\`user_id\`, \`collaborator_id\`),
        CONSTRAINT \`fk_uc_user\` FOREIGN KEY (\`user_id\`) REFERENCES \`users\`(\`id\`) ON DELETE CASCADE,
        CONSTRAINT \`fk_uc_collaborator\` FOREIGN KEY (\`collaborator_id\`) REFERENCES \`users\`(\`id\`) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    console.log('✅ user_collaborators table created successfully');

    const [rows] = await connection.query('SHOW COLUMNS FROM user_collaborators');
    console.log('Table structure:');
    rows.forEach(r => console.log(`  - ${r.Field} (${r.Type})`));

  } catch (err) {
    console.error('❌ Migration failed:', err.message);
  } finally {
    await connection.end();
  }
}

migrate();
