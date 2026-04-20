const mysql = require("mysql2/promise");
const bcrypt = require("bcryptjs");

function isActiveFromDb(v) {
  if (v === true) return true;
  if (v === false || v == null) return false;
  if (v === 1) return true;
  if (v === 0) return false;
  if (typeof v === "bigint") return v === 1n;
  if (typeof v === "string") {
    const t = v.trim().toLowerCase();
    return t === "1" || t === "true";
  }
  if (Buffer.isBuffer(v)) return v.length > 0 && v[0] === 1;
  if (typeof v === "number") return v === 1;
  return false;
}

function userRowAllowsLogin(row) {
  if (Number(row.login_allowed) === 1) return true;
  return isActiveFromDb(row.is_active);
}

async function main() {
  const login = process.argv[2];
  const password = process.argv[3];
  if (!login || !password) {
    console.error("Usage: node scripts/checkUserPassword.js <username> <password>");
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
    const ln = String(login || "").trim().toLowerCase();
    const [rows] = await conn.query(
      `SELECT u.id, u.username, u.email, u.password_hash, u.is_active, r.code AS role,
              CASE WHEN IFNULL(CAST(u.is_active AS UNSIGNED), 0) = 1 THEN 1 ELSE 0 END AS login_allowed
       FROM users u
       JOIN roles r ON u.role_id = r.id
       WHERE LOWER(TRIM(u.username)) = ?`,
      [ln]
    );
    if (!rows.length) {
      console.log("NOT_FOUND");
      return;
    }
    rows.sort((a, b) => {
      const la = Number(a.login_allowed) === 1;
      const lb = Number(b.login_allowed) === 1;
      if (la !== lb) return la ? -1 : 1;
      return b.id - a.id;
    });
    let u = null;
    for (const c of rows) {
      if (!(await bcrypt.compare(password, c.password_hash))) continue;
      if (!userRowAllowsLogin(c)) {
        console.log("LOCKED");
        return;
      }
      u = c;
      break;
    }
    if (!u) {
      console.log("BAD_PASSWORD");
      return;
    }
    console.log({
      id: u.id,
      username: u.username,
      email: u.email,
      role: u.role,
      password_match: true,
    });
  } finally {
    await conn.end();
  }
}

main().catch((e) => {
  console.error("FAILED:", e.message);
  process.exit(1);
});
