import * as React from "react";
import { Link, useNavigate } from "react-router-dom";
import { AlertCircle, ArrowLeft, KeyRound, Loader2 } from "lucide-react";
import { API_URL } from "../lib/api";

export function SuperAdminRecovery() {
  const navigate = useNavigate();
  const [username, setUsername] = React.useState("superadmin");
  const [newPassword, setNewPassword] = React.useState("");
  const [confirm, setConfirm] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [ok, setOk] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setOk(null);
    if (newPassword !== confirm) {
      setError("Mật khẩu mới không khớp");
      return;
    }
    if (newPassword.length < 6) {
      setError("Mật khẩu tối thiểu 6 ký tự");
      return;
    }
    setLoading(true);
    try {
      setOk("Trang này không còn dùng reset key. Vui lòng reset bằng script trên máy có MySQL.");
    } catch {
      setError("Lỗi kết nối server");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <div className="max-w-md w-full bg-card rounded-xl border border-border shadow-sm">
        <div className="p-6 border-b border-border">
          <div className="flex items-start gap-3">
            <button
              type="button"
              onClick={() => navigate("/login")}
              className="h-9 w-9 rounded-md border border-border bg-background text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
              aria-label="Về đăng nhập"
            >
              <ArrowLeft className="w-4 h-4 mx-auto" />
            </button>
            <div className="min-w-0">
              <h1 className="text-xl font-semibold tracking-tight">Khôi phục Super Admin</h1>
            
            </div>
          </div>
        </div>

        <div className="p-6 space-y-5">
          {error && (
            <div className="rounded-lg border border-destructive/30 bg-destructive/10 text-destructive px-4 py-3 text-sm flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span className="min-w-0">{error}</span>
            </div>
          )}
          {ok && (
            <div className="rounded-lg border border-border bg-accent text-accent-foreground px-4 py-3 text-sm">
              {ok} Đang chuyển về đăng nhập…
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <label className="text-xs font-medium text-muted-foreground">Username Super Admin</label>
              <input
                type="text"
                className="h-10 w-full px-3 rounded-md bg-background text-foreground text-sm border border-input outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                autoComplete="username"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-medium text-muted-foreground">Mật khẩu mới</label>
              <input
                type="password"
                className="h-10 w-full px-3 rounded-md bg-background text-foreground text-sm border border-input outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                minLength={6}
                autoComplete="new-password"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-medium text-muted-foreground">Nhập lại mật khẩu</label>
              <input
                type="password"
                className="h-10 w-full px-3 rounded-md bg-background text-foreground text-sm border border-input outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                autoComplete="new-password"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full h-10 rounded-md bg-primary text-primary-foreground text-sm font-semibold hover:opacity-95 transition-opacity disabled:opacity-50 disabled:pointer-events-none inline-flex items-center justify-center gap-2"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <KeyRound className="w-4 h-4" />}
              Đặt lại mật khẩu
            </button>
          </form>

          <div className="rounded-lg border border-border bg-muted/20 px-4 py-3 text-xs text-muted-foreground space-y-1">
            
          </div>
          <p className="text-center text-sm">
            <Link to="/login" className="text-primary font-semibold hover:underline">
              Về đăng nhập
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
