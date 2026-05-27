import fs from "fs";
import path from "path";

/** Xóa zip cũ khỏi dist — tránh nginx try_files phục vụ bản build thay vì backend. */
const dir = path.join(process.cwd(), "dist", "zalopilot");
if (fs.existsSync(dir)) {
  fs.rmSync(dir, { recursive: true, force: true });
  console.log("[build] Removed dist/zalopilot (use zalopilot-releases/ on server)");
}
