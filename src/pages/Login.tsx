import * as React from "react";
import { Link, useNavigate } from "react-router-dom";
import { 
  Shield, 
  Mail, 
  Lock, 
  ArrowRight, 
  Chrome,
  Github,
  CheckCircle2,
  AlertCircle
} from "lucide-react";
import { cn } from "../lib/utils";
import { auth, db } from "../firebase";
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from "firebase/auth";
import { doc, setDoc, getDoc } from "firebase/firestore";

const DEMO_ACCOUNTS = [
  { email: "admin@velocity.com", password: "password123", role: "admin", name: "Quản trị viên" },
  { email: "sale1@velocity.com", password: "password123", role: "sales", name: "Nhân viên 1" },
  { email: "sale2@velocity.com", password: "password123", role: "sales", name: "Nhân viên 2" },
];

export function Login() {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = React.useState(false);
  const [isSeeding, setIsSeeding] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    try {
      await signInWithEmailAndPassword(auth, email, password);
      navigate("/");
    } catch (err: any) {
      setError("Email hoặc mật khẩu không chính xác. Vui lòng thử lại.");
      console.error("Login Error:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const seedAndLogin = async (account: typeof DEMO_ACCOUNTS[0]) => {
    setIsLoading(true);
    setError(null);
    try {
      // Try to sign in first
      await signInWithEmailAndPassword(auth, account.email, account.password);
      navigate("/");
    } catch (err: any) {
      console.log("Initial sign-in failed, checking if we need to seed:", err.code);
      
      // If user doesn't exist (or invalid credential which could mean doesn't exist)
      if (err.code === "auth/user-not-found" || err.code === "auth/invalid-credential") {
        try {
          console.log("Attempting to create demo account...");
          const userCredential = await createUserWithEmailAndPassword(auth, account.email, account.password);
          const user = userCredential.user;
          
          await setDoc(doc(db, "users", user.uid), {
            uid: user.uid,
            displayName: account.name,
            email: account.email,
            role: account.role,
            createdAt: new Date().toISOString()
          });
          
          console.log("Demo account created and seeded.");
          navigate("/");
        } catch (createErr: any) {
          if (createErr.code === "auth/email-already-in-use") {
            setError("Tài khoản này đã tồn tại nhưng mật khẩu không đúng. Vui lòng kiểm tra lại.");
          } else {
            setError(`Không thể khởi tạo tài khoản mẫu: ${createErr.message}`);
          }
          console.error("Seed Error:", createErr);
        }
      } else {
        setError(`Lỗi đăng nhập: ${err.message}`);
      }
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
              V
            </div>
            <h1 className="text-4xl font-black tracking-tight mb-4">
              Velocity <span className="text-blue-500">Retail</span>
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
        <div className="md:w-1/2 p-12 md:p-16">
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
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">EMAIL TRUY CẬP</label>
              <div className="relative">
                <Mail className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" />
                <input 
                  type="email" 
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@velocity.com" 
                  className="w-full pl-12 pr-5 py-4 bg-slate-50 border-transparent focus:bg-white focus:border-blue-200 focus:ring-4 focus:ring-blue-500/5 rounded-[24px] text-sm transition-all outline-none font-medium"
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between px-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">MẬT KHẨU</label>
                <button type="button" className="text-[10px] font-black text-blue-600 uppercase tracking-widest hover:underline">Quên mật khẩu?</button>
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

          <div className="mt-10">
            <div className="relative flex items-center justify-center mb-8">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-100"></div>
              </div>
              <span className="relative px-4 bg-white text-[10px] font-black text-slate-300 uppercase tracking-widest">Đăng nhập nhanh (Dữ liệu mẫu)</span>
            </div>

            <div className="grid grid-cols-1 gap-3">
              {DEMO_ACCOUNTS.map((acc) => (
                <button
                  key={acc.email}
                  type="button"
                  onClick={() => seedAndLogin(acc)}
                  disabled={isLoading}
                  className="flex items-center justify-between px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl hover:bg-blue-50 hover:border-blue-100 transition-all group"
                >
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      "w-8 h-8 rounded-lg flex items-center justify-center text-xs font-black",
                      acc.role === "admin" ? "bg-red-100 text-red-600" : "bg-emerald-100 text-emerald-600"
                    )}>
                      {acc.role === "admin" ? "AD" : "SA"}
                    </div>
                    <div className="text-left">
                      <p className="text-sm font-black text-slate-900">{acc.name}</p>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{acc.email}</p>
                    </div>
                  </div>
                  <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-blue-600 transition-colors" />
                </button>
              ))}
            </div>
          </div>

          <p className="mt-10 text-center text-sm font-bold text-slate-400">
            Chưa có tài khoản?{" "}
            <Link to="/register" className="text-blue-600 hover:underline">Đăng ký ngay</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
