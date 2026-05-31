import fs from "fs";
import path from "path";

/** Xóa zip cũ khỏi dist nếu từng copy từ public/ — bản cài chỉ phục vụ qua backend từ public/zalopilot. */
for (const sub of ["zalopilot", path.join("public", "zalopilot")]) {
  const dir = path.join(process.cwd(), "dist", sub);
  if (fs.existsSync(dir)) {
    fs.rmSync(dir, { recursive: true, force: true });
    console.log(`[build] Removed dist/${sub}`);
  }
}
