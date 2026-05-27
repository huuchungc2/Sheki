import fs from "fs";
import path from "path";

/** Xóa zip cũ khỏi dist nếu từng copy từ public/ — bản cài chỉ ở zalopilot/ (backend). */
for (const sub of ["zalopilot", path.join("public", "zalopilot")]) {
  const dir = path.join(process.cwd(), "dist", sub);
  if (fs.existsSync(dir)) {
    fs.rmSync(dir, { recursive: true, force: true });
    console.log(`[build] Removed dist/${sub}`);
  }
}
