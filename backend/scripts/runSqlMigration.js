const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');

async function main() {
  const relFile = process.argv[2];
  if (!relFile) {
    console.error('Usage: node scripts/runSqlMigration.js <relative_sql_file>');
    process.exit(1);
  }

  const filePath = path.resolve(process.cwd(), relFile);
  const sql = fs.readFileSync(filePath, 'utf8');

  const conn = await mysql.createConnection({
    host: '127.0.0.1',
    port: 3306,
    user: 'root',
    password: '',
    database: 'erp',
    multipleStatements: true,
  });

  try {
    await conn.query(sql);
    console.log(`OK: ran ${relFile}`);
  } finally {
    await conn.end();
  }
}

main().catch((e) => {
  console.error('FAILED:', e.message);
  process.exit(1);
});

