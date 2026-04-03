import * as React from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { 
  LayoutDashboard, 
  Users, 
  Package, 
  UserCircle, 
  ShoppingCart, 
  Warehouse, 
  BarChart3, 
  Settings, 
  LogOut,
  Bell,
  Search,
  Menu,
  X,
  ChevronRight
} from "lucide-react";
import { cn } from "../lib/utils";

import { auth } from "../firebase";
import { signOut } from "firebase/auth";

const navigation = [
  { name: "Tổng quan", href: "/", icon: LayoutDashboard },
  { name: "Nhân viên", href: "/employees", icon: Users },
  { name: "Sản phẩm", href: "/products", icon: Package },
  { name: "Khách hàng", href: "/customers", icon: UserCircle },
  { name: "Đơn hàng", href: "/orders", icon: ShoppingCart },
  { name: "Kho bãi", href: "/inventory", icon: Warehouse },
  { name: "Báo cáo", href: "/reports", icon: BarChart3 },
];

const searchNavigation = [
  { name: "Tìm theo ngày", href: "/orders/search/day", icon: Search },
  { name: "Tìm theo tháng", href: "/orders/search/month", icon: Search },
  { name: "Tìm theo năm", href: "/orders/search/year", icon: Search },
  { name: "Tìm theo khoảng", href: "/orders/search/range", icon: Search },
];

const importNavigation = [
  { name: "Nhập sản phẩm", href: "/products/import", icon: Package },
  { name: "Nhập khách hàng", href: "/customers/import", icon: UserCircle },
  { name: "Nhập nhân viên", href: "/employees/import", icon: Users },
];

export function Layout({ children }: { children: React.ReactNode }) {
  const [isSidebarOpen, setIsSidebarOpen] = React.useState(true);
  const location = useLocation();
  const navigate = useNavigate();

  const isAuthPage = location.pathname === "/login" || location.pathname === "/register";

  const handleLogout = async () => {
    try {
      await signOut(auth);
      navigate("/login");
    } catch (error) {
      console.error("Logout Error:", error);
    }
  };

  if (isAuthPage) {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Sidebar */}
      <aside 
        className={cn(
          "bg-white border-r border-slate-200 transition-all duration-300 flex flex-col fixed h-full z-50",
          isSidebarOpen ? "w-64" : "w-20"
        )}
      >
        <div className="p-6 flex items-center gap-3">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold">
            V
          </div>
          {isSidebarOpen && (
            <span className="font-bold text-xl text-slate-900 tracking-tight">Velocity</span>
          )}
        </div>

        <nav className="flex-1 px-4 space-y-1 mt-4">
          {navigation.map((item) => {
            const isActive = location.pathname === item.href || (item.href !== "/" && location.pathname.startsWith(item.href));
            return (
              <Link
                key={item.name}
                to={item.href}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all group",
                  isActive 
                    ? "bg-blue-50 text-blue-600 font-medium" 
                    : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
                )}
              >
                <item.icon className={cn("w-5 h-5 shrink-0", isActive ? "text-blue-600" : "text-slate-400 group-hover:text-slate-600")} />
                {isSidebarOpen && <span>{item.name}</span>}
                {isActive && isSidebarOpen && (
                  <div className="ml-auto w-1.5 h-1.5 rounded-full bg-blue-600" />
                )}
              </Link>
            );
          })}

          {isSidebarOpen && (
            <div className="pt-4 pb-2 px-3">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-3">Tra cứu đơn hàng</span>
            </div>
          )}

          {searchNavigation.map((item) => {
            const isActive = location.pathname === item.href;
            return (
              <Link
                key={item.name}
                to={item.href}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all group",
                  isActive 
                    ? "bg-blue-50 text-blue-600 font-medium" 
                    : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
                )}
              >
                <item.icon className={cn("w-5 h-5 shrink-0", isActive ? "text-blue-600" : "text-slate-400 group-hover:text-slate-600")} />
                {isSidebarOpen && <span>{item.name}</span>}
                {isActive && isSidebarOpen && (
                  <div className="ml-auto w-1.5 h-1.5 rounded-full bg-blue-600" />
                )}
              </Link>
            );
          })}

          {isSidebarOpen && (
            <div className="pt-4 pb-2 px-3">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-3">Nhập dữ liệu hàng loạt</span>
            </div>
          )}

          {importNavigation.map((item) => {
            const isActive = location.pathname === item.href;
            return (
              <Link
                key={item.name}
                to={item.href}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all group",
                  isActive 
                    ? "bg-blue-50 text-blue-600 font-medium" 
                    : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
                )}
              >
                <item.icon className={cn("w-5 h-5 shrink-0", isActive ? "text-blue-600" : "text-slate-400 group-hover:text-slate-600")} />
                {isSidebarOpen && <span>{item.name}</span>}
                {isActive && isSidebarOpen && (
                  <div className="ml-auto w-1.5 h-1.5 rounded-full bg-blue-600" />
                )}
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-slate-100 space-y-1">
          <Link 
            to="/settings"
            className={cn(
              "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all group",
              location.pathname === "/settings" 
                ? "bg-blue-50 text-blue-600 font-medium" 
                : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
            )}
          >
            <Settings className={cn("w-5 h-5 shrink-0", location.pathname === "/settings" ? "text-blue-600" : "text-slate-400 group-hover:text-slate-600")} />
            {isSidebarOpen && <span>Cài đặt</span>}
          </Link>
          <button 
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-red-500 hover:bg-red-50 transition-all"
          >
            <LogOut className="w-5 h-5 shrink-0" />
            {isSidebarOpen && <span>Đăng xuất</span>}
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className={cn(
        "flex-1 transition-all duration-300 min-h-screen flex flex-col",
        isSidebarOpen ? "ml-64" : "ml-20"
      )}>
        {/* TopBar */}
        <header className="h-16 bg-white/80 backdrop-blur-md border-b border-slate-200 sticky top-0 z-40 px-8 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="p-2 hover:bg-slate-100 rounded-lg text-slate-500 transition-all"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="relative hidden md:block">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input 
                type="text" 
                placeholder="Tìm kiếm nhanh..." 
                className="pl-10 pr-4 py-2 bg-slate-100 border-transparent focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 rounded-xl text-sm w-64 transition-all outline-none"
              />
            </div>
          </div>

          <div className="flex items-center gap-4">
            <button className="p-2 hover:bg-slate-100 rounded-lg text-slate-500 relative">
              <Bell className="w-5 h-5" />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full border-2 border-white"></span>
            </button>
            <div className="h-8 w-px bg-slate-200 mx-2"></div>
            <div className="flex items-center gap-3">
              <div className="text-right hidden sm:block">
                <p className="text-sm font-semibold text-slate-900 leading-none">
                  {auth.currentUser?.displayName || "Người dùng"}
                </p>
                <p className="text-xs text-slate-500 mt-1">
                  {auth.currentUser?.email || "Chưa đăng nhập"}
                </p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold shadow-lg shadow-blue-500/20">
                {auth.currentUser?.displayName?.split(' ').map(n => n[0]).join('').toUpperCase() || "U"}
              </div>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <div className="p-8 max-w-7xl mx-auto w-full">
          <div key={location.pathname}>
            {children}
          </div>
        </div>
      </main>
    </div>
  );
}
