import * as React from "react";
import { Link, useNavigate } from "react-router-dom";
import { 
  Mail, 
  Lock, 
  ArrowRight, 
  User,
  AtSign,
  Phone,
  CheckCircle2,
  AlertCircle
} from "lucide-react";
import { cn } from "../lib/utils";
import { logger, apiCall } from "../lib/api";

const API_URL =
  (import.meta as any)?.env?.VITE_API_URL ||
  "/api";

export function Register() {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [formData, setFormData] = React.useState({
    fullName: "",
    username: "",
    email: "",
    phone: "",
    password: ""
  });

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    try {
      logger.info('Register attempt', { email: formData.email });
      const { data, status } = await apiCall(
        '/auth/register',
        { method: "POST", body: JSON.stringify({
          full_name: formData.fullName,
          username: formData.username.trim().toLowerCase(),
          email: formData.email.trim(),
          phone: formData.phone,
          password: formData.password
        }) },
        'Register'
      );
      
      if (!status) {
        setError(data.error || "Đăng ký thất bại");
        setIsLoading(false);
        return;
      }
      
      logger.info('Register success', { email: formData.email });
      localStorage.setItem("token", data.token);
      localStorage.setItem("user", JSON.stringify(data.user));
      window.dispatchEvent(new Event('auth-change'));
      setTimeout(() => navigate("/", { replace: true }), 0);
    } catch (err: any) {
      logger.error('Register exception', err);
      setError("Lỗi kết nối server");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
      <div className="max-w-[1000px] w-full bg-white rounded-[48px] shadow-2xl shadow-slate-200/50 overflow-hidden flex flex-col md:flex-row border border-slate-100">
        <div className="md:w-1/2 bg-slate-900 p-12 text-white flex flex-col justify-between relative overflow-hidden">
          <div className="relative z-10">
            <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center text-2xl font-black mb-8 shadow-lg shadow-blue-600/20">
              S
            </div>
            <h1 className="text-4xl font-black tracking-tight mb-4">
              Smart <span className="text-blue-500">Retail</span>
            </h1>
            <p className="text-slate-400 font-medium text-lg leading-relaxed">
              Bắt đầu hành trình tối ưu hóa doanh nghiệp của bạn ngay hôm nay.
            </p>
          </div>

          <div className="relative z-10 space-y-6">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-emerald-400">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <p className="text-sm font-bold text-slate-300">Miễn phí 14 ngày dùng thử</p>
            </div>
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-emerald-400">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <p className="text-sm font-bold text-slate-300">Không cần thẻ tín dụng</p>
            </div>
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-emerald-400">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <p className="text-sm font-bold text-slate-300">Hỗ trợ kỹ thuật 24/7</p>
            </div>
          </div>

          <div className="absolute -bottom-20 -left-20 w-64 h-64 bg-blue-600/10 rounded-full blur-3xl"></div>
          <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-600/5 rounded-full blur-3xl"></div>
        </div>

        <div className="md:w-1/2 p-12 md:p-16">
          <div className="mb-10">
            <h2 className="text-3xl font-black text-slate-900 tracking-tight">Tạo tài khoản mới</h2>
            <p className="text-slate-400 font-bold mt-2">Điền thông tin để bắt đầu trải nghiệm.</p>
          </div>

          <form onSubmit={handleRegister} className="space-y-5">
            {error && (
              <div className="p-4 bg-red-50 border border-red-100 rounded-2xl flex items-center gap-3 text-red-600 text-xs font-bold">
                <AlertCircle className="w-4 h-4 shrink-0" />
                {error}
              </div>
            )}
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">HỌ VÀ TÊN</label>
              <div className="relative">
                <User className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" />
                <input type="text" required value={formData.fullName} onChange={(e) => setFormData({ ...formData, fullName: e.target.value })} placeholder="VD: Lê Hoàng" className="w-full pl-12 pr-5 py-4 bg-slate-50 border-transparent focus:bg-white focus:border-blue-200 focus:ring-4 focus:ring-blue-500/5 rounded-[24px] text-sm transition-all outline-none font-medium" />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">TÊN ĐĂNG NHẬP</label>
              <div className="relative">
                <AtSign className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" />
                <input
                  type="text"
                  autoComplete="username"
                  required
                  value={formData.username}
                  onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                  placeholder="3–32 ký tự: chữ, số, _"
                  className="w-full pl-12 pr-5 py-4 bg-slate-50 border-transparent focus:bg-white focus:border-blue-200 focus:ring-4 focus:ring-blue-500/5 rounded-[24px] text-sm transition-all outline-none font-medium"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">EMAIL</label>
              <div className="relative">
                <Mail className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" />
                <input type="email" required value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} placeholder="email@company.com" className="w-full pl-12 pr-5 py-4 bg-slate-50 border-transparent focus:bg-white focus:border-blue-200 focus:ring-4 focus:ring-blue-500/5 rounded-[24px] text-sm transition-all outline-none font-medium" />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">SỐ ĐIỆN THOẠI</label>
              <div className="relative">
                <Phone className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" />
                <input type="tel" required value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} placeholder="090 123 4567" className="w-full pl-12 pr-5 py-4 bg-slate-50 border-transparent focus:bg-white focus:border-blue-200 focus:ring-4 focus:ring-blue-500/5 rounded-[24px] text-sm transition-all outline-none font-medium" />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">MẬT KHẨU</label>
              <div className="relative">
                <Lock className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" />
                <input type="password" required value={formData.password} onChange={(e) => setFormData({ ...formData, password: e.target.value })} placeholder="••••••••" className="w-full pl-12 pr-5 py-4 bg-slate-50 border-transparent focus:bg-white focus:border-blue-200 focus:ring-4 focus:ring-blue-500/5 rounded-[24px] text-sm transition-all outline-none font-medium" />
              </div>
            </div>

            <div className="flex items-start gap-3 px-1 py-2">
              <input type="checkbox" required className="mt-1 w-4 h-4 rounded border-slate-200 text-blue-600 focus:ring-blue-500" />
              <p className="text-[10px] font-bold text-slate-400 leading-relaxed">
                Tôi đồng ý với <span className="text-blue-600">Điều khoản dịch vụ</span> và <span className="text-blue-600">Chính sách bảo mật</span> của Sheki Retail.
              </p>
            </div>

            <button type="submit" disabled={isLoading} className="w-full flex items-center justify-center gap-3 py-4 bg-blue-600 text-white rounded-[24px] text-sm font-black hover:bg-blue-700 transition-all shadow-xl shadow-blue-600/20 disabled:opacity-50">
              {isLoading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
              ) : (
                <>
                  Đăng ký tài khoản
                  <ArrowRight className="w-5 h-5" />
                </>
              )}
            </button>
          </form>

          <p className="mt-10 text-center text-sm font-bold text-slate-400">
            Đã có tài khoản?{" "}
            <Link to="/login" className="text-blue-600 hover:underline">Đăng nhập ngay</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
