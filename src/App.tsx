import * as React from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { Layout } from "./components/Layout";
import { Dashboard } from "./pages/Dashboard";
import { EmployeeList } from "./pages/EmployeeList";
import { EmployeeForm } from "./pages/EmployeeForm";
import { EmployeeDetail } from "./pages/EmployeeDetail";
import { CollaboratorsPage } from "./pages/CollaboratorsPage";
import { CollaboratorsCommissionReport } from "./pages/CollaboratorsCommissionReport";
import CollaboratorsCommissionsReport from "./pages/CollaboratorsCommissionsReport";
import { ProductList } from "./pages/ProductList";
import { ProductForm } from "./pages/ProductForm";
import { CustomerList } from "./pages/CustomerList";
import { CustomerForm } from "./pages/CustomerForm";
import { OrderList } from "./pages/OrderList";
import { OrderForm } from "./pages/OrderForm";
import { Settings } from "./pages/Settings";
import { EmployeeGroups } from "./pages/EmployeeGroups";
import { Login } from "./pages/Login";
import { Register } from "./pages/Register";
import { BulkImport } from "./pages/BulkImport";
import { InventoryHistory } from "./pages/InventoryHistory";
import { InventoryImport } from "./pages/InventoryImport";
import { InventoryExport } from "./pages/InventoryExport";
import { Warehouses } from "./pages/Warehouses";
import { ActivityLog } from "./pages/ActivityLog";
import { OrderCommissionDetail } from "./pages/OrderCommissionDetail";
import { RevenueReport } from "./pages/RevenueReport";
import { CommissionReport } from "./pages/CommissionReport";
import { PayrollPeriods } from "./pages/PayrollPeriods";
import CommissionRules from "./pages/CommissionRules";
import CollaboratorsCommissionsReportPage from "./pages/CollaboratorsCommissionsReport";
import { ChangePassword } from "./pages/ChangePassword";
import { Profile } from "./pages/Profile";
import { SalesReturnsList } from "./pages/SalesReturnsList";
import { RolesPage } from "./pages/RolesPage";
import { CashTransactions } from "./pages/CashTransactions";
import { Categories } from "./pages/Categories";
import { SuperAdminShops } from "./pages/SuperAdminShops";
import { SuperAdminRecovery } from "./pages/SuperAdminRecovery";
import { isAdminUser } from "./lib/utils";

function getStoredUser() {
  const raw = localStorage.getItem("user");
  return raw ? JSON.parse(raw) : null;
}

function capTrue(u: any, mod: string, act: string) {
  return !!u?._caps?.[mod]?.[act];
}

// Route /reports/commissions/ctv — Admin thấy toàn hệ thống, Sales thấy CTV của mình
function CtvCommissionRoute() {
  if (isAdminUser(getStoredUser())) return <CollaboratorsCommissionsReportPage />;
  return <CollaboratorsCommissionReport />;
}

function checkAuth() {
  const token = localStorage.getItem("token");
  const user = localStorage.getItem("user");
  return !!(token && user);
}

function AdminRoute({ children }: { children: React.ReactNode }) {
  if (!isAdminUser(getStoredUser())) {
    return <Navigate to="/" replace />;
  }
  return <>{children}</>;
}

function InventoryViewRoute({ children }: { children: React.ReactNode }) {
  const u = getStoredUser();
  if (isAdminUser(u)) return <>{children}</>;
  if (capTrue(u, "inventory", "view")) return <>{children}</>;
  return <Navigate to="/" replace />;
}

function InventoryEditRoute({ children }: { children: React.ReactNode }) {
  const u = getStoredUser();
  if (isAdminUser(u)) return <>{children}</>;
  if (capTrue(u, "inventory", "edit")) return <>{children}</>;
  return <Navigate to="/" replace />;
}

function ReportsViewRoute({ children }: { children: React.ReactNode }) {
  const u = getStoredUser();
  if (isAdminUser(u)) return <>{children}</>;
  if (capTrue(u, "reports", "view")) return <>{children}</>;
  return <Navigate to="/" replace />;
}

function SuperAdminRoute({ children }: { children: React.ReactNode }) {
  const u = getStoredUser() as { is_super_admin?: boolean } | null;
  if (!u?.is_super_admin) {
    return <Navigate to="/" replace />;
  }
  return <>{children}</>;
}

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = React.useState(checkAuth);
  const [isAuthReady, setIsAuthReady] = React.useState(false);

  React.useEffect(() => {
    setIsAuthenticated(checkAuth());
    setIsAuthReady(true);
  }, []);

  // Global fetch guard: if token expired → clear session and return to /login
  React.useEffect(() => {
    const w = window as any;
    if (w.__fetchWrappedForAuth) return;
    w.__fetchWrappedForAuth = true;

    const originalFetch = window.fetch.bind(window);
    window.fetch = (async (...args: any[]) => {
      const res = await originalFetch(...args);
      const clearSession = () => {
        try {
          localStorage.removeItem("token");
          localStorage.removeItem("user");
          localStorage.removeItem("shops");
          localStorage.removeItem("all_shops");
        } catch {}
        window.dispatchEvent(new Event("auth-change"));
      };

      // 401: token hết hạn/không hợp lệ
      if (res?.status === 401) clearSession();

      // 403: shop bị khóa/hết hạn/phiên shop không hợp lệ (chỉ bắt các code shop, không bắt 403 do thiếu quyền)
      if (res?.status === 403) {
        try {
          const cloned = res.clone();
          const data = await cloned.json();
          const code = data?.code;
          if (code === "SHOP_FORBIDDEN" || code === "SHOP_REQUIRED" || code === "SHOP_SESSION_INVALID") {
            clearSession();
          }
        } catch {
          // ignore parse errors
        }
      }
      return res;
    }) as any;
  }, []);

  // Listen for custom auth change events (login/logout)
  React.useEffect(() => {
    const handleAuthChange = () => {
      const authed = checkAuth();
      console.log('🔐 Auth state changed:', authed);
      setIsAuthenticated(authed);
    };
    window.addEventListener('auth-change', handleAuthChange);
    return () => window.removeEventListener('auth-change', handleAuthChange);
  }, []);

  if (!isAuthReady) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-blue-600/30 border-t-blue-600 rounded-full animate-spin"></div>
          <p className="text-slate-400 font-bold text-sm">Đang khởi tạo hệ thống...</p>
        </div>
      </div>
    );
  }

  return (
    <Router>
      <Routes>
        {/* Public Routes */}
        <Route path="/login" element={!isAuthenticated ? <Login /> : <Navigate to="/" replace />} />
        <Route path="/register" element={!isAuthenticated ? <Register /> : <Navigate to="/" replace />} />
        <Route path="/super-admin-recovery" element={!isAuthenticated ? <SuperAdminRecovery /> : <Navigate to="/" replace />} />
        
        {/* Protected Routes Wrapper */}
        <Route 
          path="/*" 
          element={
            isAuthenticated ? (
              <Layout>
                <Routes>
                  <Route path="/" element={<Dashboard />} />
                  <Route path="/employees" element={<AdminRoute><EmployeeList /></AdminRoute>} />
                  <Route path="/employees/groups" element={<AdminRoute><EmployeeGroups /></AdminRoute>} />
                  <Route path="/employees/new" element={<AdminRoute><EmployeeForm /></AdminRoute>} />
                  <Route path="/employees/edit/:id" element={<AdminRoute><EmployeeForm /></AdminRoute>} />
                  <Route path="/employees/:id" element={<AdminRoute><EmployeeDetail /></AdminRoute>} />
                  <Route path="/employees/:id/collaborators" element={<AdminRoute><CollaboratorsPage /></AdminRoute>} />
                  <Route path="/employees/:id/collaborators/commissions" element={<AdminRoute><CollaboratorsCommissionReport /></AdminRoute>} />
                  <Route path="/employees/import" element={<AdminRoute><BulkImport /></AdminRoute>} />
                  <Route path="/products" element={<AdminRoute><ProductList /></AdminRoute>} />
                  <Route path="/products/new" element={<AdminRoute><ProductForm /></AdminRoute>} />
                  <Route path="/products/edit/:id" element={<AdminRoute><ProductForm /></AdminRoute>} />
                  <Route path="/products/import" element={<AdminRoute><BulkImport /></AdminRoute>} />
                  <Route path="/categories" element={<AdminRoute><Categories /></AdminRoute>} />
                  <Route path="/customers" element={<CustomerList />} />
                  <Route path="/customers/new" element={<CustomerForm />} />
                  <Route path="/customers/edit/:id" element={<CustomerForm />} />
                  <Route path="/customers/import" element={<BulkImport />} />
                  <Route path="/orders" element={<OrderList />} />
                  <Route path="/orders/new" element={<OrderForm />} />
                  <Route path="/orders/edit/:id" element={<OrderForm />} />
                  <Route path="/orders/search/*" element={<Navigate to="/orders" replace />} />
                  <Route path="/inventory" element={<InventoryViewRoute><InventoryHistory /></InventoryViewRoute>} />
                  <Route path="/inventory/import" element={<InventoryEditRoute><InventoryImport /></InventoryEditRoute>} />
                  <Route path="/inventory/export" element={<InventoryEditRoute><InventoryExport /></InventoryEditRoute>} />
                  <Route path="/warehouses" element={<AdminRoute><Warehouses /></AdminRoute>} />
                  <Route path="/settings" element={<AdminRoute><Settings /></AdminRoute>} />
                  <Route path="/logs" element={<AdminRoute><ActivityLog /></AdminRoute>} />
                  <Route path="/change-password" element={<ChangePassword />} />
                  <Route path="/profile" element={<Profile />} />
                  <Route path="/reports/revenue" element={<ReportsViewRoute><RevenueReport /></ReportsViewRoute>} />
                  <Route path="/reports/commissions" element={<CommissionReport />} />
                  <Route path="/reports/payroll-periods" element={<AdminRoute><PayrollPeriods /></AdminRoute>} />
                  <Route path="/reports/commissions/ctv" element={<ReportsViewRoute><CtvCommissionRoute /></ReportsViewRoute>} />
                  <Route path="/reports/commissions/:userId" element={<AdminRoute><CommissionReport /></AdminRoute>} />
                  <Route path="/reports/commissions/:userId/order/:orderId" element={<AdminRoute><OrderCommissionDetail /></AdminRoute>} />
                  <Route path="/commission-rules" element={<AdminRoute><CommissionRules /></AdminRoute>} />
                  <Route path="/cash-transactions" element={<ReportsViewRoute><CashTransactions /></ReportsViewRoute>} />
                  <Route path="/roles" element={<AdminRoute><RolesPage /></AdminRoute>} />
                  <Route
                    path="/admin/shops"
                    element={
                      <AdminRoute>
                        <SuperAdminRoute>
                          <SuperAdminShops />
                        </SuperAdminRoute>
                      </AdminRoute>
                    }
                  />
                  <Route path="/returns" element={<SalesReturnsList />} />
                  <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
              </Layout>
            ) : (
              <Navigate to="/login" replace />
            )
          } 
        />
      </Routes>
    </Router>
  );
}
