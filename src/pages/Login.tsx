import * as React from "react";
import { Link, useNavigate } from "react-router-dom";
import { 
  User,
  Lock, 
  ArrowRight, 
  CheckCircle2,
  AlertCircle
} from "lucide-react";
import { cn } from "../lib/utils";
import { API_URL, logger, apiCall } from "../lib/api";

export function Login() {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [username, setUsername] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [needsShopSelect, setNeedsShopSelect] = React.useState(false);
  const [allShops, setAllShops] = React.useState<{ id: number; name: string; code?: string }[]>([]);
  const [selectedShopId, setSelectedShopId] = React.useState<string>("");

  // Login screen: luôn hiển thị light mode mặc định
  React.useEffect(() => {
    localStorage.setItem("sheki-theme", "light");
    document.documentElement.classList.remove("dark", "light");
    document.documentElement.classList.add("light");
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    
    logger.info('Login attempt', { username });
    
    try {
      const baseBody: Record<string, unknown> = { username: username.trim().toLowerCase(), password };

      const attempt = async (body: Record<string, unknown>) => {
        return await apiCall(
          "/auth/login",
          {
            method: "POST",
            body: JSON.stringify(body),
          },
          "Login"
        );
      };

      // Non-superadmin: ưu tiên shop lần trước nếu có (tránh default shops[0] -> hay rơi về Smart Erp).
      let sentLastShopId = false;
      const body1: Record<string, unknown> = { ...baseBody };
      if (!needsShopSelect) {
        const last = localStorage.getItem("last_shop_id");
        const lastId = last != null && String(last).trim() !== "" ? parseInt(String(last), 10) : null;
        if (lastId && Number.isFinite(lastId)) {
          body1.shop_id = lastId;
          sentLastShopId = true;
        }
      }
      if (needsShopSelect && selectedShopId) {
        body1.shop_id = parseInt(selectedShopId, 10);
      }

      let { data, status } = await attempt(body1);

      // Nếu last_shop_id không còn hợp lệ (user không thuộc shop đó) → xoá và retry không kèm shop_id.
      if (!status && !needsShopSelect && sentLastShopId && data?.code === "SHOP_FORBIDDEN") {
        localStorage.removeItem("last_shop_id");
        ({ data, status } = await attempt(baseBody));
      }
      
      if (!status) {
        logger.warn('Login failed', { username, error: data.error });
        if (data?.code === "NO_SHOP") {
          setError(data.error || "Tài khoản chưa được gán shop — liên hệ quản trị");
        } else if (data?.code === "SHOP_INACTIVE_OR_EXPIRED") {
          setError(data.error || "Shop đã tắt hoặc hết hạn sử dụng — liên hệ quản trị");
        } else if (data?.code === "SHOP_FORBIDDEN") {
          setError(data.error || "Không có quyền vào shop đã chọn");
        } else if (data?.code === "USER_INACTIVE") {
          setError(data.error || "Tài khoản đã bị khóa");
        } else {
          setError(data.error || "Đăng nhập thất bại");
        }
        setIsLoading(false);
        return;
      }

      if (data?.requires_shop_select && !data?.token) {
        const list = Array.isArray(data.all_shops) ? data.all_shops : [];
        setNeedsShopSelect(true);
        setAllShops(list);
        setSelectedShopId(list[0]?.id != null ? String(list[0].id) : "");
        setError("Chọn shop để tiếp tục (Super Admin).");
        setIsLoading(false);
        return;
      }

      if (!data?.token) {
        setError("Đăng nhập thất bại: server không trả token.");
        setIsLoading(false);
        return;
      }
      
      logger.info('Login success', { username, user: data.user });

      // Default theme after login: light mode
      localStorage.setItem("sheki-theme", "light");
      document.documentElement.classList.remove("dark", "light");
      document.documentElement.classList.add("light");
      
      // Store token and user
      localStorage.setItem("token", data.token);
      localStorage.setItem("user", JSON.stringify(data.user));
      if (Array.isArray(data.shops)) {
        localStorage.setItem("shops", JSON.stringify(data.shops));
      }
      if (Array.isArray(data.all_shops)) {
        localStorage.setItem("all_shops", JSON.stringify(data.all_shops));
      } else {
        localStorage.removeItem("all_shops");
      }
      setNeedsShopSelect(false);

      // Nếu user thường thuộc nhiều shop và server default sai shop,
      // tự switch về shop lần trước (nếu có trong danh sách shops trả về).
      try {
        const last = localStorage.getItem("last_shop_id");
        const lastId = last != null && String(last).trim() !== "" ? parseInt(String(last), 10) : null;
        const shops = Array.isArray(data.shops) ? data.shops : [];
        const canUseLast = lastId && Number.isFinite(lastId) && shops.some((s: any) => Number(s?.id) === lastId);
        const currentShopId = data?.user?.shop_id != null ? Number(data.user.shop_id) : null;
        if (canUseLast && currentShopId != null && currentShopId !== lastId) {
          const sw = await apiCall(
            "/auth/switch-shop",
            { method: "POST", body: JSON.stringify({ shop_id: lastId }) },
            "Switch shop after login"
          );
          if (sw?.status && sw?.data?.token && sw?.data?.shop) {
            localStorage.setItem("token", sw.data.token);
            localStorage.setItem("last_shop_id", String(lastId));
            if (Array.isArray(sw.data.shops)) localStorage.setItem("shops", JSON.stringify(sw.data.shops));
            if (Array.isArray(sw.data.all_shops)) localStorage.setItem("all_shops", JSON.stringify(sw.data.all_shops));
            const prev = JSON.parse(localStorage.getItem("user") || "{}");
            const sh = sw.data.shop;
            const next = {
              ...prev,
              shop_id: sh.id,
              role: sh.role,
              role_id: sh.role_id,
              role_name: sh.role_name,
              can_access_admin: sh.can_access_admin,
              scope_own_data: sh.scope_own_data,
            };
            localStorage.setItem("user", JSON.stringify(next));
          }
        } else if (currentShopId != null) {
          localStorage.setItem("last_shop_id", String(currentShopId));
        }
      } catch {
        // ignore
      }
      
      // Notify App — then navigate on next macrotask so `isAuthenticated` commits
      // before Router renders `/` (avoids brief `/` → redirect `/login` loop or flash).
      window.dispatchEvent(new Event('auth-change'));
      setTimeout(() => navigate("/", { replace: true }), 0);
    } catch (err: any) {
      logger.error('Login exception', err);
      setError("Lỗi kết nối server: " + err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        <div className="bg-card border border-border rounded-xl shadow-sm">
          <div className="p-6 border-b border-border">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-primary text-primary-foreground flex items-center justify-center overflow-hidden">
                <img
                  src="/favicon.svg"
                  alt="Smart ERP"
                  className="h-6 w-6"
                  draggable={false}
                />
              </div>
              <div className="min-w-0">
                <h1 className="text-xl font-semibold tracking-tight">Smart ERP</h1>
                <p className="text-sm text-muted-foreground mt-0.5">
                  Đăng nhập để tiếp tục quản lý hệ thống.
                </p>
              </div>
            </div>
          </div>

          <div className="p-6">
            <form onSubmit={handleLogin} className="space-y-5">
              {error && (
                <div className="rounded-lg border border-destructive/30 bg-destructive/10 text-destructive px-4 py-3 text-sm flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span className="min-w-0">{error}</span>
                </div>
              )}

              {needsShopSelect && allShops.length > 0 && (
                <div className="space-y-2">
                  <label className="text-xs font-medium text-muted-foreground">
                    Shop
                  </label>
                  <select
                    value={selectedShopId}
                    onChange={(e) => setSelectedShopId(e.target.value)}
                    className={cn(
                      "h-10 w-full rounded-md bg-background text-foreground text-sm",
                      "border border-input px-3 outline-none",
                      "focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
                    )}
                  >
                    {allShops.map((s) => (
                      <option key={s.id} value={String(s.id)}>
                        {s.name}{s.code ? ` (${s.code})` : ""}
                      </option>
                    ))}
                  </select>
                  <p className="text-xs text-muted-foreground">Super Admin: chọn shop rồi bấm đăng nhập lại.</p>
                </div>
              )}

              <div className="space-y-2">
                <label className="text-xs font-medium text-muted-foreground">
                  Tên đăng nhập
                </label>
                <div className="relative">
                  <User className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <input
                    type="text"
                    autoComplete="username"
                    required
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="Nhập username"
                    className={cn(
                      "h-10 w-full pl-9 pr-3 rounded-md bg-background text-foreground text-sm",
                      "border border-input outline-none",
                      "focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
                    )}
                  />
                </div>
                <p className="text-xs text-muted-foreground">Chỉ đăng nhập bằng username — không dùng email.</p>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-medium text-muted-foreground">
                  Mật khẩu
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className={cn(
                      "h-10 w-full pl-9 pr-3 rounded-md bg-background text-foreground text-sm",
                      "border border-input outline-none",
                      "focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
                    )}
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className={cn(
                  "w-full h-10 rounded-md bg-primary text-primary-foreground text-sm font-semibold",
                  "hover:opacity-95 transition-opacity",
                  "disabled:opacity-50 disabled:pointer-events-none",
                  "inline-flex items-center justify-center gap-2",
                )}
              >
                {isLoading ? (
                  <div className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                ) : (
                  <>
                    Đăng nhập
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>

            <div className="mt-6 space-y-2 text-center">
              <p className="text-sm text-muted-foreground">
                Chưa có tài khoản?{" "}
                <Link to="/register" className="text-primary font-semibold hover:underline">
                  Đăng ký ngay
                </Link>
              </p>
              <p className="text-xs text-muted-foreground">
                <Link to="/super-admin-recovery" className="hover:underline underline-offset-2">
                  Quên mật khẩu Super Admin?
                </Link>
              </p>
            </div>
          </div>
        </div>

        <div className="mt-4 flex items-center justify-center gap-2 text-xs text-muted-foreground">
          <CheckCircle2 className="w-3.5 h-3.5" />
          <span>Quản lý kho • đơn hàng • báo cáo • phân quyền</span>
        </div>
      </div>
    </div>
  );
}
