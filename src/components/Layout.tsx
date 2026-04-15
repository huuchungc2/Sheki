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
  Bell,
  Search,
  Menu,
  ChevronDown,
  DollarSign,
  ClipboardList,
  Upload,
} from "lucide-react";
import { cn, isAdminUser } from "../lib/utils";
import { api } from "../lib/api";

const API_URL =
  (import.meta as any)?.env?.VITE_API_URL ||
  "/api";

/** Menu Admin gọn: nhóm submenu, bớt mục trùng (Cài đặt chỉ ở cuối sidebar) */
const navigationAdmin = [
  { name: "Tổng quan", href: "/", icon: LayoutDashboard },
  {
    name: "Bán hàng",
    icon: ShoppingCart,
    children: [
      { name: "Đơn hàng", href: "/orders" },
      { name: "Khách hàng", href: "/customers" },
      { name: "Đơn hoàn", href: "/returns" },
    ],
  },
  {
    name: "Danh mục",
    icon: Package,
    children: [
      { name: "Nhân viên", href: "/employees" },
      { name: "Vai trò", href: "/roles" },
      { name: "Sản phẩm", href: "/products" },
    ],
  },
  {
    name: "Kho",
    icon: Warehouse,
    children: [
      { name: "Nhập xuất & tồn", href: "/inventory" },
      { name: "Kho & mặc định", href: "/warehouses" },
    ],
  },
  {
    name: "Báo cáo & HH",
    icon: BarChart3,
    children: [
      { name: "Doanh thu", href: "/reports/revenue" },
      { name: "Hoa hồng", href: "/reports/commissions" },
      { name: "Quy tắc hoa hồng", href: "/commission-rules" },
      { name: "Thu chi", href: "/cash-transactions" },
    ],
  },
  {
    name: "Nhập Excel",
    icon: Upload,
    children: [
      { name: "Sản phẩm", href: "/products/import" },
      { name: "Khách hàng", href: "/customers/import" },
      { name: "Nhân viên", href: "/employees/import" },
    ],
  },
  { name: "Nhật ký", href: "/logs", icon: ClipboardList },
];

const navigationSales = [
  { name: "Tổng quan", href: "/", icon: LayoutDashboard },
  {
    name: "Bán hàng",
    icon: ShoppingCart,
    children: [
      { name: "Đơn hàng", href: "/orders" },
      { name: "Khách hàng", href: "/customers" },
      { name: "Đơn hoàn", href: "/returns" },
    ],
  },
  {
    name: "Báo cáo hoa hồng",
    icon: DollarSign,
    children: [
      { name: "Hoa hồng bán hàng", href: "/reports/commissions" },
      { name: "Hoa hồng CTV", href: "/reports/commissions/ctv" },
    ],
  },
];

export function Layout({ children }: { children: React.ReactNode }) {
  const [isSidebarOpen, setIsSidebarOpen] = React.useState(true);
  const [showUserMenu, setShowUserMenu] = React.useState(false);
  const [openSubmenu, setOpenSubmenu] = React.useState<string | null>(null);
  const [showNotifMenu, setShowNotifMenu] = React.useState(false);
  const [notifCount, setNotifCount] = React.useState(0);
  const [notifItems, setNotifItems] = React.useState<any[]>([]);
  const location = useLocation();
  const navigate = useNavigate();

  const isAuthPage = location.pathname === "/login" || location.pathname === "/register";
  const [isMobile, setIsMobile] = React.useState(false);

  React.useEffect(() => {
    const mq = window.matchMedia("(max-width: 1023px)");
    const apply = () => {
      const mobile = mq.matches;
      setIsMobile(mobile);
      setIsSidebarOpen(!mobile); // mobile: đóng mặc định; desktop: mở
      if (mobile) setOpenSubmenu(null);
    };
    apply();
    const onChange = () => apply();
    // safari/iOS compat
    if ("addEventListener" in mq) (mq as any).addEventListener("change", onChange);
    else (mq as any).addListener(onChange);
    return () => {
      if ("removeEventListener" in mq) (mq as any).removeEventListener("change", onChange);
      else (mq as any).removeListener(onChange);
    };
  }, []);

  const handleLogout = () => {
    console.log('👋 Logging out user:', currentUser?.email);
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    
    // Notify App component about auth change
    window.dispatchEvent(new Event('auth-change'));
    
    console.log('👋 Redirecting to /login');
    navigate("/login");
  };

  const [currentUser, setCurrentUser] = React.useState<any>(() => {
    const userStr = localStorage.getItem("user");
    return userStr ? JSON.parse(userStr) : null;
  });

  // Keep user in sync (role/permissions changes, login/logout)
  React.useEffect(() => {
    const syncFromStorage = () => {
      const userStr = localStorage.getItem("user");
      setCurrentUser(userStr ? JSON.parse(userStr) : null);
    };
    const onAuthChange = () => syncFromStorage();
    const onStorage = (e: StorageEvent) => {
      if (e.key === "user" || e.key === "token") syncFromStorage();
    };
    window.addEventListener("auth-change", onAuthChange as any);
    window.addEventListener("storage", onStorage);
    return () => {
      window.removeEventListener("auth-change", onAuthChange as any);
      window.removeEventListener("storage", onStorage);
    };
  }, []);

  // Refresh user permissions from backend
  React.useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) return;
    (async () => {
      try {
        const res: any = await api.get("/auth/me");
        const u = res?.data;
        if (u && typeof u === "object") {
          localStorage.setItem("user", JSON.stringify(u));
          setCurrentUser(u);
        }
      } catch {
        // ignore (token may be invalid; App will route to login on next auth-check)
      }
    })();
  }, []);

  React.useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token || !currentUser?.id) return;

    const url = `${API_URL}/notifications/stream?token=${encodeURIComponent(token)}`;
    const es = new EventSource(url);

    const onOrder = (ev: MessageEvent) => {
      try {
        const data = JSON.parse(ev.data);
        // Sales: backend already filters; Admin: show all
        setNotifCount(c => c + 1);
        setNotifItems(prev => {
          const next = [data, ...prev];
          return next.slice(0, 8);
        });
      } catch {}
    };

    es.addEventListener('order', onOrder as any);
    es.addEventListener('error', () => {
      // Browser will auto-retry; keep silent to avoid noisy UI
    });

    return () => {
      es.removeEventListener('order', onOrder as any);
      es.close();
    };
  }, [currentUser?.id]);

  const navigation = isAdminUser(currentUser) ? navigationAdmin : navigationSales;
  const visibleNavigation = navigation.filter((item, idx, arr) =>
    arr.findIndex(i => i.name === item.name) === idx
  );
  const isAdmin = isAdminUser(currentUser);

  /** Trùng route con (vd /orders/edit) */
  const pathActive = React.useCallback((pathname: string, href: string) => {
    if (pathname === href) return true;
    if (href === "/") return false;
    if (!pathname.startsWith(href + "/")) return false;
    return true;
  }, []);

  React.useEffect(() => {
    console.log('📱 Layout mounted, user:', currentUser?.email, 'role:', currentUser?.role);
  }, []);

  // Mobile: đổi route thì tự đóng menu/drawer và đóng dropdown
  React.useEffect(() => {
    setShowUserMenu(false);
    setShowNotifMenu(false);
    if (isMobile) {
      setIsSidebarOpen(false);
      setOpenSubmenu(null);
    }
  }, [location.pathname, isMobile]);

  if (isAuthPage) {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Sidebar */}
      {isMobile && isSidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/40"
          onClick={() => setIsSidebarOpen(false)}
          aria-hidden
        />
      )}
      <aside 
        className={cn(
          "bg-white border-r border-slate-200 transition-all duration-300 flex flex-col fixed h-full z-50",
          isMobile
            ? cn("w-72 max-w-[85vw]", isSidebarOpen ? "translate-x-0" : "-translate-x-full")
            : (isSidebarOpen ? "w-64" : "w-20")
        )}
      >
        <div className="p-6 flex items-center gap-3">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold">
            S
          </div>
          {isSidebarOpen && (
            <span className="font-bold text-xl text-slate-900 tracking-tight">Sheki</span>
          )}
        </div>

        <nav className="flex-1 px-3 space-y-0.5 mt-2 overflow-y-auto pb-4">
          {visibleNavigation.map((item) => {
            const hasChildren = "children" in item && item.children;
            const children = (item as { children?: { name: string; href: string }[] }).children;
            let isActive = false;
            if (hasChildren && children?.length) {
              isActive = children.some((ch) => pathActive(location.pathname, ch.href));
            } else if ("href" in item && item.href) {
              isActive =
                item.href === "/"
                  ? location.pathname === "/"
                  : pathActive(location.pathname, item.href);
            }
            const isSubmenuOpen = openSubmenu === item.name;

            if (hasChildren && isSidebarOpen) {
              return (
                <div key={item.name}>
                  <button
                    type="button"
                    onClick={() => setOpenSubmenu(isSubmenuOpen ? null : item.name)}
                    className={cn(
                      "w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-all group text-left",
                      isActive
                        ? "bg-blue-50 text-blue-600 font-medium"
                        : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
                    )}
                  >
                    <item.icon className={cn("w-5 h-5 shrink-0", isActive ? "text-blue-600" : "text-slate-400 group-hover:text-slate-600")} />
                    <span className="text-sm">{item.name}</span>
                    <ChevronDown className={cn("w-4 h-4 ml-auto shrink-0 transition-transform", isSubmenuOpen ? "rotate-180" : "")} />
                  </button>
                  {isSubmenuOpen && (
                    <div className="ml-2 pl-3 border-l border-slate-200 mt-0.5 mb-1 space-y-0.5">
                      {(children || []).map((child) => {
                        const isChildActive = pathActive(location.pathname, child.href);
                        return (
                          <Link
                            key={child.name}
                            to={child.href}
                            className={cn(
                              "flex items-center gap-2 px-2 py-1.5 rounded-md transition-all text-sm",
                              isChildActive
                                ? "bg-blue-50 text-blue-600 font-medium"
                                : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
                            )}
                          >
                            <span>{child.name}</span>
                          </Link>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            }

            if (hasChildren && !isSidebarOpen) {
              const first = children?.[0];
              if (!first) return null;
              return (
                <Link
                  key={item.name}
                  to={first.href}
                  title={item.name}
                  className={cn(
                    "flex items-center justify-center px-3 py-2 rounded-lg transition-all group",
                    isActive
                      ? "bg-blue-50 text-blue-600"
                      : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
                  )}
                >
                  <item.icon className={cn("w-5 h-5 shrink-0", isActive ? "text-blue-600" : "text-slate-400 group-hover:text-slate-600")} />
                </Link>
              );
            }

            return (
              <Link
                key={item.name}
                to={"href" in item && item.href ? item.href : "/"}
                className={cn(
                  "flex items-center gap-3 px-3 py-2 rounded-lg transition-all group",
                  isActive
                    ? "bg-blue-50 text-blue-600 font-medium"
                    : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
                )}
              >
                <item.icon className={cn("w-5 h-5 shrink-0", isActive ? "text-blue-600" : "text-slate-400 group-hover:text-slate-600")} />
                {isSidebarOpen && <span className="text-sm">{item.name}</span>}
                {isActive && isSidebarOpen && (
                  <div className="ml-auto w-1.5 h-1.5 rounded-full bg-blue-600 shrink-0" />
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
        "flex-1 min-w-0 transition-all duration-300 min-h-screen flex flex-col",
        isMobile ? "ml-0" : (isSidebarOpen ? "ml-64" : "ml-20")
      )}>
        {/* TopBar */}
        <header className="h-16 bg-white/80 backdrop-blur-md border-b border-slate-200 sticky top-0 z-40 px-4 sm:px-8 flex items-center justify-between">
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
            <div className="relative">
              <button
                onClick={() => {
                  setShowNotifMenu(v => !v);
                  setNotifCount(0);
                }}
                className="p-2 hover:bg-slate-100 rounded-lg text-slate-500 relative"
                aria-label="Thông báo"
              >
                <Bell className="w-5 h-5" />
                {notifCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 bg-red-500 text-white rounded-full text-[10px] font-bold flex items-center justify-center border-2 border-white">
                    {notifCount > 99 ? "99+" : notifCount}
                  </span>
                )}
              </button>

              {showNotifMenu && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setShowNotifMenu(false)} />
                  <div className="absolute right-0 top-12 z-50 w-80 bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden">
                    <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
                      <p className="text-sm font-bold text-slate-900">Thông báo</p>
                      <button
                        onClick={() => { setNotifItems([]); setNotifCount(0); setShowNotifMenu(false); }}
                        className="text-xs font-semibold text-slate-500 hover:text-slate-700"
                      >
                        Xoá
                      </button>
                    </div>
                    {notifItems.length === 0 ? (
                      <div className="px-4 py-10 text-center text-sm text-slate-400">Chưa có thông báo</div>
                    ) : (
                      <div className="max-h-96 overflow-y-auto divide-y divide-slate-50">
                        {notifItems.map((n, idx) => (
                          <button
                            key={idx}
                            onClick={() => {
                              setShowNotifMenu(false);
                              if (n?.order_id) navigate(`/orders/edit/${n.order_id}`);
                            }}
                            className="w-full text-left px-4 py-3 hover:bg-slate-50 transition-all"
                          >
                            <p className="text-sm font-semibold text-slate-800">
                              {n.type === "created"
                                ? `Đơn mới: ${n.order_code || "—"}`
                                : `Đổi trạng thái: ${n.order_code || "—"}`}
                            </p>
                            <p className="text-xs text-slate-500 mt-0.5">
                              {n.type === "created"
                                ? `Trạng thái: ${n.status}`
                                : `${n.old_status} → ${n.status}`}
                            </p>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
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
                {isAdmin ? "ADMIN" : (currentUser?.role_name || String(currentUser?.role || "USER").toUpperCase())}
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
        <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full min-w-0">
          <div key={location.pathname} className="min-w-0">
            {children}
          </div>
        </div>
      </main>
    </div>
  );
}
