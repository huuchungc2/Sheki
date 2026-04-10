import * as React from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Lock, Save, AlertCircle, CheckCircle2, Loader2 } from "lucide-react";

const API_URL =
  (import.meta as any)?.env?.VITE_API_URL ||
  "/api";

export function ChangePassword() {
  const navigate = useNavigate();
  const [formData, setFormData] = React.useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [success, setSuccess] = React.useState(false);
  const currentUser = React.useMemo(() => {
    const u = localStorage.getItem("user");
    return u ? JSON.parse(u) : null;
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    if (formData.newPassword !== formData.confirmPassword) {
      setError("Mật khẩu mới không khớp");
      return;
    }
    if (formData.newPassword.length < 6) {
      setError("Mật khẩu mới phải có ít nhất 6 ký tự");
      return;
    }

    setIsLoading(true);
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API_URL}/users/${currentUser.id}/password`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          currentPassword: formData.currentPassword,
          newPassword: formData.newPassword,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Đổi mật khẩu thất bại");
        return;
      }
      setSuccess(true);
      setFormData({ currentPassword: "", newPassword: "", confirmPassword: "" });
      setTimeout(() => navigate(-1), 2000);
    } catch (err: any) {
      setError("Lỗi kết nối server");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-lg mx-auto space-y-8">
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate(-1)}
          className="p-2 hover:bg-slate-100 rounded-xl text-slate-500 transition-all"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Đổi mật khẩu</h1>
          <p className="text-slate-500 text-sm mt-1">Cập nhật mật khẩu để bảo mật tài khoản của bạn.</p>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-100 rounded-2xl flex items-center gap-3 text-red-600 text-sm font-bold">
          <AlertCircle className="w-5 h-5 shrink-0" />
          {error}
        </div>
      )}
      {success && (
        <div className="p-4 bg-emerald-50 border border-emerald-100 rounded-2xl flex items-center gap-3 text-emerald-600 text-sm font-bold">
          <CheckCircle2 className="w-5 h-5 shrink-0" />
          Đổi mật khẩu thành công! Đang quay lại...
        </div>
      )}

      <form onSubmit={handleSubmit} className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm space-y-6">
        <div className="space-y-2">
          <label className="text-sm font-bold text-slate-700">Mật khẩu hiện tại</label>
          <div className="relative">
            <Lock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="password"
              required
              value={formData.currentPassword}
              onChange={(e) => setFormData({ ...formData, currentPassword: e.target.value })}
              placeholder="Nhập mật khẩu hiện tại"
              className="w-full pl-10 pr-4 py-3 bg-slate-50 border-transparent focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 rounded-xl text-sm transition-all outline-none"
            />
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-bold text-slate-700">Mật khẩu mới</label>
          <div className="relative">
            <Lock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="password"
              required
              value={formData.newPassword}
              onChange={(e) => setFormData({ ...formData, newPassword: e.target.value })}
              placeholder="Tối thiểu 6 ký tự"
              className="w-full pl-10 pr-4 py-3 bg-slate-50 border-transparent focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 rounded-xl text-sm transition-all outline-none"
            />
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-bold text-slate-700">Xác nhận mật khẩu mới</label>
          <div className="relative">
            <Lock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="password"
              required
              value={formData.confirmPassword}
              onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
              placeholder="Nhập lại mật khẩu mới"
              className="w-full pl-10 pr-4 py-3 bg-slate-50 border-transparent focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 rounded-xl text-sm transition-all outline-none"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className="w-full flex items-center justify-center gap-2 py-3 bg-blue-600 text-white rounded-xl text-sm font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-600/20 disabled:opacity-50"
        >
          {isLoading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Save className="w-4 h-4" />
          )}
          {isLoading ? "Đang xử lý..." : "Lưu mật khẩu mới"}
        </button>
      </form>
    </div>
  );
}
