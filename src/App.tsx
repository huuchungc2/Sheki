import * as React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { Layout } from "./components/Layout";
import { Dashboard } from "./pages/Dashboard";
import { EmployeeList } from "./pages/EmployeeList";
import { EmployeeForm } from "./pages/EmployeeForm";
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
import { auth } from "./firebase";
import { onAuthStateChanged } from "firebase/auth";
import { BulkImport } from "./pages/BulkImport";
import { InventoryHistory } from "./pages/InventoryHistory";
import { InventoryImport } from "./pages/InventoryImport";
import { InventoryExport } from "./pages/InventoryExport";
import { SalaryReport } from "./pages/SalaryReport";

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = React.useState(false);
  const [isAuthReady, setIsAuthReady] = React.useState(false);

  React.useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setIsAuthenticated(!!user);
      setIsAuthReady(true);
    });
    return () => unsubscribe();
  }, []);

  if (!isAuthReady) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-blue-600/30 border-t-blue-600 rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <Router>
      <Routes>
        {/* Public Routes */}
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        
        {/* Protected Routes */}
        <Route 
          path="*" 
          element={
            isAuthenticated ? (
              <Layout>
                <Routes>
                  <Route path="/" element={<Dashboard />} />
                  
                  {/* Employees */}
                  <Route path="/employees" element={<EmployeeList />} />
                  <Route path="/employees/new" element={<EmployeeForm />} />
                  <Route path="/employees/edit/:id" element={<EmployeeForm />} />
                  <Route path="/employees/import" element={<BulkImport />} />
                  
                  {/* Products */}
                  <Route path="/products" element={<ProductList />} />
                  <Route path="/products/new" element={<ProductForm />} />
                  <Route path="/products/edit/:id" element={<ProductForm />} />
                  <Route path="/products/import" element={<BulkImport />} />
                  
                  {/* Customers */}
                  <Route path="/customers" element={<CustomerList />} />
                  <Route path="/customers/new" element={<CustomerForm />} />
                  <Route path="/customers/edit/:id" element={<CustomerForm />} />
                  <Route path="/customers/import" element={<BulkImport />} />
                  
                  {/* Orders */}
                  <Route path="/orders" element={<OrderList />} />
                  <Route path="/orders/new" element={<OrderForm />} />
                  <Route path="/orders/edit/:id" element={<OrderForm />} />
                  <Route path="/orders/search/day" element={<OrderSearchDay />} />
                  <Route path="/orders/search/month" element={<OrderSearchMonth />} />
                  <Route path="/orders/search/year" element={<OrderSearchYear />} />
                  <Route path="/orders/search/range" element={<OrderSearchRange />} />
                  
                  {/* Inventory */}
                  <Route path="/inventory" element={<InventoryHistory />} />
                  <Route path="/inventory/import" element={<InventoryImport />} />
                  <Route path="/inventory/export" element={<InventoryExport />} />
                  
                  {/* Reports */}
                  <Route path="/reports" element={<SalaryReport />} />
                  
                  {/* Settings */}
                  <Route path="/settings" element={<Settings />} />
                  
                  {/* Fallback */}
                  <Route path="*" element={<Dashboard />} />
                </Routes>
              </Layout>
            ) : (
              <Login />
            )
          } 
        />
      </Routes>
    </Router>
  );
}
