import * as React from "react";
import { Link, useNavigate } from "react-router-dom";
import { AlertCircle, ArrowLeft, KeyRound, Loader2 } from "lucide-react";
import { API_URL } from "../lib/api";

export function SuperAdminRecovery() {
  const navigate = useNavigate();
  const [username, setUsername] = React.useState("superadmin");
  const [newPassword, setNewPassword] = React.useState("");
  const [confirm, setConfirm] = React.useState("");
  const [resetKey, setResetKey] = React.useState("");
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
    if (!resetKey.trim()) {
      setError("Nhập mã khôi phục (SUPERADMIN_RESET_KEY trong backend/.env)");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/auth/super-admin-recovery`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: username.trim(),
          newPassword,
          resetKey: resetKey.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Thất bại");
        return;
      }
      setOk(data.message || "Đã đặt lại mật khẩu.");
      setTimeout(() => navigate("/login"), 2000);
    } catch {
      setError("Lỗi kết nối server");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
      <div className="max-w-md w-full bg-white rounded-3xl border border-slate-200 shadow-sm p-8 space-y-6">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigate("/login")}
            className="p-2 rounded-xl hover:bg-slate-100 text-slate-500"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-xl font-black text-slate-900">Khôi phục Super Admin</h1>
            <p className="text-sm text-slate-500 mt-1">
              Cần mã <code className="text-xs bg-slate-100 px-1 rounded">SUPERADMIN_RESET_KEY</code> trong{" "}
              <code className="text-xs bg-slate-100 px-1 rounded">backend/.env</code>
            </p>
          </div>
        </div>

        {error && (
          <div className="p-4 bg-red-50 border border-red-100 rounded-2xl flex items-start gap-2 text-red-600 text-sm font-medium">
            <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
            {error}
          </div>
        )}
        {ok && (
          <div className="p-4 bg-emerald-50 border border-emerald-100 rounded-2xl text-emerald-700 text-sm font-medium">
            {ok} Đang chuyển về đăng nhập…
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">Username super admin</label>
            <input
              type="text"
              className="mt-1 w-full px-4 py-3 bg-slate-50 border border-transparent rounded-xl text-sm focus:bg-white focus:border-blue-500 outline-none"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoComplete="username"
            />
          </div>
          <div>
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">Mã khôi phục (reset key)</label>
            <input
              type="password"
              className="mt-1 w-full px-4 py-3 bg-slate-50 border border-transparent rounded-xl text-sm focus:bg-white focus:border-blue-500 outline-none"
              value={resetKey}
              onChange={(e) => setResetKey(e.target.value)}
              placeholder="Giá trị SUPERADMIN_RESET_KEY"
              autoComplete="off"
            />
          </div>
          <div>
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">Mật khẩu mới</label>
            <input
              type="password"
              className="mt-1 w-full px-4 py-3 bg-slate-50 border border-transparent rounded-xl text-sm focus:bg-white focus:border-blue-500 outline-none"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              minLength={6}
              autoComplete="new-password"
            />
          </div>
          <div>
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">Nhập lại mật khẩu</label>
            <input
              type="password"
              className="mt-1 w-full px-4 py-3 bg-slate-50 border border-transparent rounded-xl text-sm focus:bg-white focus:border-blue-500 outline-none"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              autoComplete="new-password"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 py-3 bg-slate-900 text-white rounded-xl text-sm font-bold hover:bg-slate-800 disabled:opacity-50"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <KeyRound className="w-4 h-4" />}
            Đặt lại mật khẩu
          </button>
        </form>

        <p className="text-xs text-slate-400 text-center">
          Không có server key? Chạy trên máy có MySQL:{" "}
          <code className="bg-slate-100 px-1 rounded">node backend/scripts/resetSuperAdminPassword.js &lt;mật_mới&gt;</code>
        </p>
        <p className="text-center text-sm">
          <Link to="/login" className="text-blue-600 font-bold hover:underline">
            Về đăng nhập
          </Link>
        </p>
      </div>
    </div>
  );
}
