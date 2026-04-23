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
  Building2,
} from "lucide-react";
import { cn, isAdminUser } from "../lib/utils";
import { api } from "../lib/api";

const API_URL =
  (import.meta as any)?.env?.VITE_API_URL ||
  "/api";

function capTrue(caps: any, mod: string, act: string) {
  return !!caps?.[mod]?.[act];
}

function cap2True(caps2: any, featureKey: string) {
  return !!caps2?.[featureKey];
}

function buildNonAdminNavigation(caps: any) {
  const items: any[] = [];
  const caps2 = (caps as any)?._caps2 || (caps as any)?.caps2 || null;
  const hasCaps2 = caps2 && typeof caps2 === "object";
  const can = (featureKey: string, fallbackMod?: string, fallbackAct?: string) => {
    if (hasCaps2) return cap2True(caps2, featureKey);
    if (fallbackMod && fallbackAct) return capTrue(caps, fallbackMod, fallbackAct);
    return false;
  };

  if (can("dashboard.view", "dashboard", "view")) {
    items.push({ name: "Tổng quan", href: "/", icon: LayoutDashboard });
  }

  const salesChildren: { name: string; href: string }[] = [];
  if (can("orders.list", "orders", "view")) {
    salesChildren.push({ name: "Đơn hàng", href: "/orders" });
  }
  if (can("customers.list", "customers", "view")) {
    salesChildren.push({ name: "Khách hàng", href: "/customers" });
  }
  if (can("orders.list", "orders", "view")) {
    salesChildren.push({ name: "Đơn hoàn", href: "/returns" });
  }
  if (salesChildren.length) {
    items.push({ name: "Bán hàng", icon: ShoppingCart, children: salesChildren });
  }

  const invChildren: { name: string; href: string }[] = [];
  if (can("inventory.view", "inventory", "view")) {
    invChildren.push({ name: "Nhập xuất & tồn", href: "/inventory" });
  }
  if (can("inventory.import", "inventory", "edit")) {
    invChildren.push({ name: "Nhập kho", href: "/inventory/import" });
    invChildren.push({ name: "Xuất kho", href: "/inventory/export" });
  }
  if (invChildren.length) {
    items.push({ name: "Kho", icon: Warehouse, children: invChildren });
  }

  const reportChildren: { name: string; href: string }[] = [];
  if (can("reports.revenue", "reports", "view")) {
    reportChildren.push({ name: "Doanh thu", href: "/reports/revenue" });
  }
  if (can("reports.commissions", "reports", "view")) {
    reportChildren.push({ name: "Hoa hồng", href: "/reports/commissions" });
  }
  if (can("reports.commissions_ctv", "reports", "view")) {
    reportChildren.push({ name: "Hoa hồng CTV", href: "/reports/commissions/ctv" });
  }
  if (can("cash_transactions.view", "reports", "view")) {
    reportChildren.push({ name: "Thu chi", href: "/cash-transactions" });
  }
  if (reportChildren.length) {
    items.push({ name: "Báo cáo", icon: BarChart3, children: reportChildren });
  }

  // Fallback: nếu caps rỗng (token cũ / lỗi load) thì giữ menu sales tối thiểu để không “mất app”
  if (items.length === 0) {
    return navigationSales;
  }

  return items;
}

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
    name: "Sản phẩm",
    icon: Package,
    children: [
      { name: "Danh mục sản phẩm", href: "/categories" },
      { name: "Sản phẩm", href: "/products" },
    ],
  },
  {
    name: "Nhân sự",
    icon: Users,
    children: [
      { name: "Nhân viên", href: "/employees" },
      { name: "Vai trò", href: "/roles" },
      { name: "Nhóm nhân viên", href: "/employees/groups" },
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
    name: "Báo cáo",
    icon: BarChart3,
    children: [
      { name: "Doanh thu", href: "/reports/revenue" },
      { name: "Hoa hồng", href: "/reports/commissions" },
      { name: "Quy tắc hoa hồng", href: "/commission-rules" },
      { name: "Thu chi", href: "/cash-transactions" },
    ],
  },
  {
    name: "Excel",
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
    localStorage.removeItem("shops");
    localStorage.removeItem("all_shops");
    
    // Notify App component about auth change
    window.dispatchEvent(new Event('auth-change'));
    
    console.log('👋 Redirecting to /login');
    navigate("/login");
  };

  const [currentUser, setCurrentUser] = React.useState<any>(() => {
    const userStr = localStorage.getItem("user");
    return userStr ? JSON.parse(userStr) : null;
  });

  const [shops, setShops] = React.useState<{ id: number; name: string; code?: string }[]>(() => {
    try {
      const raw = localStorage.getItem("shops");
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  });

  const [allShops, setAllShops] = React.useState<{ id: number; name: string; code?: string }[]>(() => {
    try {
      const raw = localStorage.getItem("all_shops");
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  });

  const shopSwitcherOptions = React.useMemo(() => {
    if (currentUser?.is_super_admin && Array.isArray(allShops) && allShops.length > 0) {
      return allShops;
    }
    return shops;
  }, [currentUser?.is_super_admin, allShops, shops]);

  const currentShopName = React.useMemo(() => {
    const sid = currentUser?.shop_id != null ? Number(currentUser.shop_id) : null;
    if (sid == null || !Number.isFinite(sid)) return null;
    const list = currentUser?.is_super_admin ? allShops : shops;
    const found = Array.isArray(list) ? list.find((s: any) => Number(s?.id) === sid) : null;
    return found?.name || null;
  }, [currentUser?.shop_id, currentUser?.is_super_admin, allShops, shops]);

  // Keep user in sync (role/permissions changes, login/logout)
  React.useEffect(() => {
    const syncFromStorage = () => {
      const userStr = localStorage.getItem("user");
      setCurrentUser(userStr ? JSON.parse(userStr) : null);
      try {
        const raw = localStorage.getItem("shops");
        setShops(raw ? JSON.parse(raw) : []);
      } catch {
        setShops([]);
      }
      try {
        const rawAll = localStorage.getItem("all_shops");
        setAllShops(rawAll ? JSON.parse(rawAll) : []);
      } catch {
        setAllShops([]);
      }
    };
    const onAuthChange = () => syncFromStorage();
    const onStorage = (e: StorageEvent) => {
      if (e.key === "user" || e.key === "token" || e.key === "shops" || e.key === "all_shops") syncFromStorage();
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
          const merged = {
            ...u,
            shop_id: res.current_shop_id != null ? res.current_shop_id : u.shop_id,
          };
          localStorage.setItem("user", JSON.stringify(merged));
          setCurrentUser(merged);
        }
        if (Array.isArray(res?.shops)) {
          localStorage.setItem("shops", JSON.stringify(res.shops));
          setShops(res.shops);
        }
        if (Array.isArray(res?.all_shops)) {
          localStorage.setItem("all_shops", JSON.stringify(res.all_shops));
          setAllShops(res.all_shops);
        }
      } catch (err: any) {
        if (err?.code === "SHOP_SESSION_INVALID") {
          localStorage.removeItem("token");
          localStorage.removeItem("user");
          localStorage.removeItem("shops");
          localStorage.removeItem("all_shops");
          window.dispatchEvent(new Event("auth-change"));
          navigate("/login", { replace: true });
          return;
        }
        // ignore (token may be invalid; App will route to login on next auth-check)
      }
    })();
  }, [navigate]);

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

  const navigation = React.useMemo(() => {
    if (isAdminUser(currentUser)) {
      if (currentUser?.is_super_admin) {
        const rest = navigationAdmin.slice(1);
        return [navigationAdmin[0], { name: "Quản lý shop", href: "/admin/shops", icon: Building2 }, ...rest];
      }
      return navigationAdmin;
    }
    // Pass both caps shapes to builder (legacy `_caps` + new `_caps2` on user)
    const caps = (currentUser as any)?._caps;
    const merged = { ...(caps || {}), _caps2: (currentUser as any)?._caps2 };
    return buildNonAdminNavigation(merged);
  }, [currentUser]);
  const visibleNavigation = navigation.filter((item, idx, arr) =>
    arr.findIndex(i => i.name === item.name) === idx
  );
  const isAdmin = isAdminUser(currentUser);

  /** Trùng route con (vd /orders/edit) */
  const pathActive = React.useCallback((pathname: string, href: string) => {
    const baseHref = (href || "").split("?")[0].split("#")[0] || "/";
    if (pathname === baseHref) return true;
    if (baseHref === "/") return false;
    if (!pathname.startsWith(baseHref + "/")) return false;
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
            <span className="font-bold text-xl text-slate-900 tracking-tight">
              {currentShopName || "—"}
            </span>
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
            to={isAdmin ? "/settings" : "/profile"}
            className={cn(
              "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all group",
              location.pathname === "/settings" || location.pathname === "/profile"
                ? "bg-blue-50 text-blue-600 font-medium" 
                : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
            )}
          >
            <Settings className={cn("w-5 h-5 shrink-0", location.pathname === "/settings" ? "text-blue-600" : "text-slate-400 group-hover:text-slate-600")} />
            {isSidebarOpen && <span>{isAdmin ? "Cài đặt" : "Tài khoản"}</span>}
          </Link>
          {!isAdmin && (
            <Link
              to="/change-password"
              className={cn(
                "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all group",
                location.pathname === "/change-password"
                  ? "bg-blue-50 text-blue-600 font-medium"
                  : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
              )}
            >
              <KeyRound className={cn("w-5 h-5 shrink-0", location.pathname === "/change-password" ? "text-blue-600" : "text-slate-400 group-hover:text-slate-600")} />
              {isSidebarOpen && <span>Đổi mật khẩu</span>}
            </Link>
          )}
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
            {shopSwitcherOptions.length > 1 && (
              <div className="hidden sm:block">
                <label className="sr-only" htmlFor="layout-shop-select">
                  Shop
                </label>
                <select
                  id="layout-shop-select"
                  className="text-xs font-semibold text-slate-700 bg-slate-100 border border-slate-200 rounded-lg px-2 py-1.5 max-w-[200px]"
                  value={String(currentUser?.shop_id ?? "")}
                  onChange={async (e) => {
                    const shopId = parseInt(e.target.value, 10);
                    if (!Number.isFinite(shopId)) return;
                    try {
                      const out: any = await api.post("/auth/switch-shop", { shop_id: shopId });
                      localStorage.setItem("token", out.token);
                      localStorage.setItem("last_shop_id", String(shopId));
                      if (Array.isArray(out.shops)) {
                        localStorage.setItem("shops", JSON.stringify(out.shops));
                        setShops(out.shops);
                      }
                      if (Array.isArray(out.all_shops)) {
                        localStorage.setItem("all_shops", JSON.stringify(out.all_shops));
                        setAllShops(out.all_shops);
                      }
                      const sh = out.shop;
                      const prev = JSON.parse(localStorage.getItem("user") || "{}");
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
                      setCurrentUser(next);
                      window.dispatchEvent(new Event("auth-change"));
                    } catch (err: any) {
                      console.error(err);
                    }
                  }}
                >
                  {shopSwitcherOptions.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>
            )}
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
