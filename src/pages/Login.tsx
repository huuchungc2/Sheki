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

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    
    logger.info('Login attempt', { username });
    
    try {
      const { data, status } = await apiCall(
        '/auth/login',
        {
          method: "POST",
          body: JSON.stringify({ username: username.trim(), password })
        },
        'Login'
      );
      
      if (!status) {
        logger.warn('Login failed', { username, error: data.error });
        setError(data.error || "Đăng nhập thất bại");
        setIsLoading(false);
        return;
      }
      
      logger.info('Login success', { username, user: data.user });
      
      // Store token and user
      localStorage.setItem("token", data.token);
      localStorage.setItem("user", JSON.stringify(data.user));
      
      // Notify App component about auth change
      window.dispatchEvent(new Event('auth-change'));
      
      navigate("/");
    } catch (err: any) {
      logger.error('Login exception', err);
      setError("Lỗi kết nối server: " + err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
      <div className="max-w-[1000px] w-full bg-white rounded-[48px] shadow-2xl shadow-slate-200/50 overflow-hidden flex flex-col md:flex-row border border-slate-100">
        {/* Left Side: Branding & Info */}
        <div className="md:w-1/2 bg-slate-900 p-12 text-white flex flex-col justify-between relative overflow-hidden">
          <div className="relative z-10">
            <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center text-2xl font-black mb-8 shadow-lg shadow-blue-600/20">
              S
            </div>
            <h1 className="text-4xl font-black tracking-tight mb-4">
              Sheki <span className="text-blue-500">ERP</span>
            </h1>
            <p className="text-slate-400 font-medium text-lg leading-relaxed">
              Hệ thống quản lý bán hàng, nhân sự và kho bãi tích hợp mạnh mẽ nhất cho doanh nghiệp của bạn.
            </p>
          </div>

          <div className="relative z-10 space-y-6">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-emerald-400">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <p className="text-sm font-bold text-slate-300">Quản lý kho hàng thời gian thực</p>
            </div>
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-emerald-400">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <p className="text-sm font-bold text-slate-300">Báo cáo doanh thu chi tiết</p>
            </div>
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-emerald-400">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <p className="text-sm font-bold text-slate-300">Phân quyền nhân viên linh hoạt</p>
            </div>
          </div>

          {/* Decorative elements */}
          <div className="absolute -bottom-20 -left-20 w-64 h-64 bg-blue-600/10 rounded-full blur-3xl"></div>
          <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-600/5 rounded-full blur-3xl"></div>
        </div>

        {/* Right Side: Login Form */}
        <div className="md:w-1/2 p-12 md:p-16 overflow-y-auto">
          <div className="mb-10">
            <h2 className="text-3xl font-black text-slate-900 tracking-tight">Chào mừng trở lại</h2>
            <p className="text-slate-400 font-bold mt-2">Đăng nhập để tiếp tục quản lý hệ thống.</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-6">
            {error && (
              <div className="p-4 bg-red-50 border border-red-100 rounded-2xl flex items-center gap-3 text-red-600 text-xs font-bold">
                <AlertCircle className="w-4 h-4 shrink-0" />
                {error}
              </div>
            )}
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">TÊN ĐĂNG NHẬP</label>
              <div className="relative">
                <User className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" />
                <input 
                  type="text" 
                  autoComplete="username"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="VD: admin hoặc lan_sales" 
                  className="w-full pl-12 pr-5 py-4 bg-slate-50 border-transparent focus:bg-white focus:border-blue-200 focus:ring-4 focus:ring-blue-500/5 rounded-[24px] text-sm transition-all outline-none font-medium"
                />
              </div>
              <p className="text-[11px] text-slate-400 px-1">Có thể dùng tên đăng nhập hoặc email.</p>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between px-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">MẬT KHẨU</label>
              </div>
              <div className="relative">
                <Lock className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" />
                <input 
                  type="password" 
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••" 
                  className="w-full pl-12 pr-5 py-4 bg-slate-50 border-transparent focus:bg-white focus:border-blue-200 focus:ring-4 focus:ring-blue-500/5 rounded-[24px] text-sm transition-all outline-none font-medium"
                />
              </div>
            </div>

            <button 
              type="submit"
              disabled={isLoading}
              className="w-full flex items-center justify-center gap-3 py-4 bg-blue-600 text-white rounded-[24px] text-sm font-black hover:bg-blue-700 transition-all shadow-xl shadow-blue-600/20 disabled:opacity-50"
            >
              {isLoading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
              ) : (
                <>
                  Đăng nhập hệ thống
                  <ArrowRight className="w-5 h-5" />
                </>
              )}
            </button>
          </form>

          {/* Link đăng ký */}
          <div className="mt-8 text-center">
            <p className="text-sm text-slate-400 font-medium">
              Chưa có tài khoản?{" "}
              <Link to="/register" className="text-blue-600 font-bold hover:underline">
                Đăng ký ngay
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
