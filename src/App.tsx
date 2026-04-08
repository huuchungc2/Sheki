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
import { Login } from "./pages/Login";
import { Register } from "./pages/Register";
import { OrderSearchDay, OrderSearchMonth, OrderSearchYear, OrderSearchRange } from "./pages/OrderSearch";
import { BulkImport } from "./pages/BulkImport";
import { InventoryHistory } from "./pages/InventoryHistory";
import { InventoryImport } from "./pages/InventoryImport";
import { InventoryExport } from "./pages/InventoryExport";
import { Warehouses } from "./pages/Warehouses";
import { ActivityLog } from "./pages/ActivityLog";
import { CommissionDetail } from "./pages/CommissionDetail";
import { OrderCommissionDetail } from "./pages/OrderCommissionDetail";
import { RevenueReport } from "./pages/RevenueReport";
import { CommissionReport } from "./pages/CommissionReport";
import CommissionRules from "./pages/CommissionRules";
import CollaboratorsCommissionsReportPage from "./pages/CollaboratorsCommissionsReport";
import { ChangePassword } from "./pages/ChangePassword";
import { SalesReturnsList } from "./pages/SalesReturnsList";
import { AdminReturns } from "./pages/AdminReturns";
import { RolesPage } from "./pages/RolesPage";
import { isAdminUser } from "./lib/utils";

function getStoredUser() {
  const raw = localStorage.getItem("user");
  return raw ? JSON.parse(raw) : null;
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

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = React.useState(checkAuth);
  const [isAuthReady, setIsAuthReady] = React.useState(false);

  React.useEffect(() => {
    setIsAuthenticated(checkAuth());
    setIsAuthReady(true);
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
        
        {/* Protected Routes Wrapper */}
        <Route 
          path="/*" 
          element={
            isAuthenticated ? (
              <Layout>
                <Routes>
                  <Route path="/" element={<Dashboard />} />
                  <Route path="/employees" element={<AdminRoute><EmployeeList /></AdminRoute>} />
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
                  <Route path="/customers" element={<CustomerList />} />
                  <Route path="/customers/new" element={<CustomerForm />} />
                  <Route path="/customers/edit/:id" element={<CustomerForm />} />
                  <Route path="/customers/import" element={<BulkImport />} />
                  <Route path="/orders" element={<OrderList />} />
                  <Route path="/orders/new" element={<OrderForm />} />
                  <Route path="/orders/edit/:id" element={<OrderForm />} />
                  <Route path="/orders/search/day" element={<OrderSearchDay />} />
                  <Route path="/orders/search/month" element={<OrderSearchMonth />} />
                  <Route path="/orders/search/year" element={<OrderSearchYear />} />
                  <Route path="/orders/search/range" element={<OrderSearchRange />} />
                  <Route path="/inventory" element={<AdminRoute><InventoryHistory /></AdminRoute>} />
                  <Route path="/inventory/import" element={<AdminRoute><InventoryImport /></AdminRoute>} />
                  <Route path="/inventory/export" element={<AdminRoute><InventoryExport /></AdminRoute>} />
                  <Route path="/warehouses" element={<AdminRoute><Warehouses /></AdminRoute>} />
                  <Route path="/settings" element={<AdminRoute><Settings /></AdminRoute>} />
                  <Route path="/logs" element={<AdminRoute><ActivityLog /></AdminRoute>} />
                  <Route path="/change-password" element={<ChangePassword />} />
                  <Route path="/reports/revenue" element={<AdminRoute><RevenueReport /></AdminRoute>} />
                  <Route path="/reports/commissions" element={<CommissionReport />} />
                  <Route path="/reports/commissions/ctv" element={<CtvCommissionRoute />} />
                  <Route path="/reports/commissions/:userId" element={<AdminRoute><CommissionDetail /></AdminRoute>} />
                  <Route path="/reports/commissions/:userId/order/:orderId" element={<AdminRoute><OrderCommissionDetail /></AdminRoute>} />
                  <Route path="/commission-rules" element={<AdminRoute><CommissionRules /></AdminRoute>} />
                  <Route path="/roles" element={<AdminRoute><RolesPage /></AdminRoute>} />
                  <Route path="/returns" element={<SalesReturnsList />} />
                  <Route path="/returns/admin" element={<AdminRoute><AdminReturns /></AdminRoute>} />
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
