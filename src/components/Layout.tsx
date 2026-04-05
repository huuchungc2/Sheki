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
  KeyRound,
  FileText,
  Bell,
  Search,
  Menu,
  X,
  ChevronRight,
  ChevronDown,
  DollarSign
} from "lucide-react";
import { cn } from "../lib/utils";

const navigationAdmin = [
  { name: "Tổng quan", href: "/", icon: LayoutDashboard },
  { name: "Nhân viên", href: "/employees", icon: Users },
  { name: "Sản phẩm", href: "/products", icon: Package },
  { name: "Khách hàng", href: "/customers", icon: UserCircle },
  { name: "Đơn hàng", href: "/orders", icon: ShoppingCart },
  { name: "Kho bãi", href: "/inventory", icon: Warehouse },
  { name: "Báo cáo", href: "/reports", icon: BarChart3, children: [
    { name: "Báo cáo doanh thu", href: "/reports/revenue" },
    { name: "Báo cáo hoa hồng", href: "/reports/commissions" },
  ]},
  { name: "Quy tắc hoa hồng", href: "/commission-rules", icon: DollarSign },
  { name: "Hoa hồng từ CTV", href: "/reports/commissions/ctv", icon: DollarSign },
  { name: "Nhật ký", href: "/logs", icon: FileText },
  { name: "Cài đặt", href: "/settings", icon: Settings },
];

const navigationSales = [
  { name: "Tổng quan", href: "/", icon: LayoutDashboard },
  { name: "Đơn hàng của tôi", href: "/orders", icon: ShoppingCart },
  { name: "Khách hàng của tôi", href: "/customers", icon: UserCircle },
  { name: "Hoa hồng của tôi", href: "/reports/commissions", icon: DollarSign },
  { name: "Hoa hồng từ CTV", href: "/reports/commissions/ctv", icon: DollarSign },
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
  const [showUserMenu, setShowUserMenu] = React.useState(false);
  const [openSubmenu, setOpenSubmenu] = React.useState<string | null>(null);
  const location = useLocation();
  const navigate = useNavigate();

  const isAuthPage = location.pathname === "/login" || location.pathname === "/register";

  const handleLogout = () => {
    console.log('👋 Logging out user:', currentUser?.email);
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    
    // Notify App component about auth change
    window.dispatchEvent(new Event('auth-change'));
    
    console.log('👋 Redirecting to /login');
    navigate("/login");
  };

  const currentUser = React.useMemo(() => {
    const userStr = localStorage.getItem("user");
    return userStr ? JSON.parse(userStr) : null;
  }, []);

  const navigation = currentUser?.role === 'admin' ? navigationAdmin : navigationSales;
  // Deduplicate potential duplicate entries (e.g., multiple additions of the same href)
  const visibleNavigation = navigation.filter((item, idx, arr) =>
    arr.findIndex(i => i.href === item.href) === idx
  );
  const isAdmin = currentUser?.role === 'admin';

  React.useEffect(() => {
    console.log('📱 Layout mounted, user:', currentUser?.email, 'role:', currentUser?.role);
  }, []);

  React.useEffect(() => {
    if (isAdmin) {
      if (location.pathname.startsWith('/reports/revenue') || location.pathname.startsWith('/reports/commissions')) {
        setOpenSubmenu('Báo cáo');
      }
      if (location.pathname.startsWith('/commission-rules')) {
        setOpenSubmenu(null);
      }
    }
  }, [location.pathname, isAdmin]);

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
          {visibleNavigation.map((item) => {
            const hasChildren = 'children' in item && item.children;
            const isActive = location.pathname === item.href || (item.href !== "/" && location.pathname.startsWith(item.href));
            const isSubmenuOpen = openSubmenu === item.name;

            if (hasChildren && isSidebarOpen) {
              return (
                <div key={item.name}>
                  <button
                    onClick={() => setOpenSubmenu(isSubmenuOpen ? null : item.name)}
                    className={cn(
                      "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all group",
                      isActive 
                        ? "bg-blue-50 text-blue-600 font-medium" 
                        : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
                    )}
                  >
                    <item.icon className={cn("w-5 h-5 shrink-0", isActive ? "text-blue-600" : "text-slate-400 group-hover:text-slate-600")} />
                    <span>{item.name}</span>
                    <ChevronDown className={cn("w-4 h-4 ml-auto transition-transform", isSubmenuOpen ? "rotate-180" : "")} />
                  </button>
                  {isSubmenuOpen && (
                    <div className="ml-8 mt-1 space-y-1">
                      {(item.children as any[] || []).map((child) => {
                        const isChildActive = location.pathname === child.href;
                        return (
                          <Link
                            key={child.name}
                            to={child.href}
                            className={cn(
                              "flex items-center gap-2 px-3 py-2 rounded-lg transition-all text-sm",
                              isChildActive 
                                ? "bg-blue-50 text-blue-600 font-medium" 
                                : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
                            )}
                          >
                            <div className="w-1.5 h-1.5 rounded-full bg-current" />
                            <span>{child.name}</span>
                          </Link>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            }

            return (
              <Link
                key={item.name}
                to={hasChildren ? (item.children[0] as any).href : item.href}
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

          {isSidebarOpen && isAdmin && (
            <div className="pt-4 pb-2 px-3">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-3">Tra cứu đơn hàng</span>
            </div>
          )}

          {isAdmin && searchNavigation.map((item) => {
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

          {isSidebarOpen && isAdmin && (
            <div className="pt-4 pb-2 px-3">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-3">Nhập dữ liệu hàng loạt</span>
            </div>
          )}

          {isAdmin && importNavigation.map((item) => {
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
                  {currentUser?.full_name || "Người dùng"}
                </p>
                <p className="text-xs text-slate-500 mt-1">
                  {currentUser?.email || "Chưa đăng nhập"}
                </p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold shadow-lg shadow-blue-500/20 cursor-pointer hover:ring-2 hover:ring-blue-300 transition-all"
                onClick={() => setShowUserMenu(!showUserMenu)}
              >
                {currentUser?.full_name?.split(' ').map(n => n[0]).join('').toUpperCase() || "U"}
              </div>
              <span className="text-xs font-bold text-slate-500 bg-slate-100 px-2 py-1 rounded">
                {currentUser?.role === 'admin' ? 'ADMIN' : 'SALES'}
              </span>

              {/* User dropdown menu */}
              {showUserMenu && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setShowUserMenu(false)} />
                  <div className="absolute right-4 top-20 z-50 w-56 bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden">
                    <div className="p-4 border-b border-slate-100">
                      <p className="text-sm font-bold text-slate-900">{currentUser?.full_name}</p>
                      <p className="text-xs text-slate-500">{currentUser?.email}</p>
                    </div>
                    <div className="py-1">
                      <Link
                        to="/change-password"
                        onClick={() => setShowUserMenu(false)}
                        className="flex items-center gap-3 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-all"
                      >
                        <KeyRound className="w-4 h-4 text-slate-400" />
                        Đổi mật khẩu
                      </Link>
                      <button
                        onClick={() => { setShowUserMenu(false); handleLogout(); }}
                        className="flex items-center gap-3 w-full px-4 py-2.5 text-sm font-medium text-red-600 hover:bg-red-50 transition-all"
                      >
                        <LogOut className="w-4 h-4" />
                        Đăng xuất
                      </button>
                    </div>
                  </div>
                </>
              )}
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
