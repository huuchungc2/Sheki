/**
 * Đặt lại mật khẩu super admin khi không đăng nhập được (không cần .env).
 *
 * Usage (từ thư mục gốc project):
 *   node backend/scripts/resetSuperAdminPassword.js <mật_khẩu_mới_≥6_ký_tự> [username_or_email]
 *
 * Mặc định username = superadmin. Có thể truyền email hoặc username để khớp user is_super_admin=1.
 */
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../.env") });
const bcrypt = require("bcryptjs");
const mysql = require("mysql2/promise");

function normalize(s) {
  return String(s || "")
    .trim()
    .toLowerCase();
}

async function main() {
  const newPass = process.argv[2];
  const loginArg = process.argv[3];
  if (!newPass || newPass.length < 6) {
    console.error("Usage: node backend/scripts/resetSuperAdminPassword.js <new_password_min_6> [username_or_email]");
    process.exit(1);
  }

  const conn = await mysql.createConnection({
    host: process.env.DB_HOST || "127.0.0.1",
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER || "root",
    password: process.env.DB_PASSWORD != null ? process.env.DB_PASSWORD : "",
    database: process.env.DB_NAME || "erp",
  });

  try {
    const login = normalize(loginArg || "superadmin");
    const hash = await bcrypt.hash(newPass, 10);
    const [r] = await conn.query(
      `UPDATE users SET password_hash = ?
       WHERE is_super_admin = 1
         AND (LOWER(TRIM(username)) = ? OR LOWER(TRIM(email)) = ?)`,
      [hash, login, login]
    );
    if (r.affectedRows === 0) {
      console.error("Không tìm thấy super admin khớp. Thử: SELECT id, username, email FROM users WHERE is_super_admin = 1;");
      process.exit(1);
    }
    console.log("OK. Đã cập nhật mật khẩu super admin.");
  } finally {
    await conn.end();
  }
}

main().catch((e) => {
  console.error("FAILED:", e.message);
  process.exit(1);
});
