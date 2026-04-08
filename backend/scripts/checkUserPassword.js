const mysql = require("mysql2/promise");
const bcrypt = require("bcryptjs");

async function main() {
  const login = process.argv[2];
  const password = process.argv[3];
  if (!login || !password) {
    console.error("Usage: node scripts/checkUserPassword.js <username_or_email> <password>");
    process.exit(1);
  }

  const conn = await mysql.createConnection({
    host: "127.0.0.1",
    port: 3306,
    user: "root",
    password: "",
    database: "erp",
  });

  try {
    const [rows] = await conn.query(
      `SELECT u.id, u.username, u.email, u.password_hash, r.code AS role
       FROM users u
       JOIN roles r ON u.role_id = r.id
       WHERE u.username = ? OR u.email = ?
       LIMIT 1`,
      [login, login]
    );
    if (!rows.length) {
      console.log("NOT_FOUND");
      return;
    }
    const u = rows[0];
    const ok = await bcrypt.compare(password, u.password_hash);
    console.log({
      id: u.id,
      username: u.username,
      email: u.email,
      role: u.role,
      password_match: ok,
    });
  } finally {
    await conn.end();
  }
}

main().catch((e) => {
  console.error("FAILED:", e.message);
  process.exit(1);
});

