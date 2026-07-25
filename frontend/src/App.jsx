import React, { Suspense, lazy } from "react";
import { BrowserRouter as Router, Route, Routes } from "react-router-dom";
import AuthSessionManager from "./components/auth/AuthSessionManager";
import AdminRoute from "./components/common/AdminRoute";
import RoleRoute from "./components/common/RoleRoute";
import AppErrorBoundary from "./components/common/AppErrorBoundary";
import PageLoader from "./components/common/PageLoader";

const AdminLayout = lazy(() => import("./layouts/AdminLayout"));
const UserLayout = lazy(() => import("./layouts/UserLayout"));
const StaffLayout = lazy(() => import("./layouts/StaffLayout"));

function App() {
  return (
    <AppErrorBoundary>
      <Router>
        <AuthSessionManager />
        <Suspense fallback={<PageLoader />}>
          <Routes>
            <Route
              path="/admin/*"
              element={
                <AdminRoute>
                  <AdminLayout />
                </AdminRoute>
              }
            />
            <Route path="/manager/*" element={<RoleRoute role="manager"><StaffLayout /></RoleRoute>} />
            <Route path="/cashier/*" element={<RoleRoute role="cashier"><StaffLayout /></RoleRoute>} />
            <Route path="/checker/*" element={<RoleRoute role="ticket_checker"><StaffLayout /></RoleRoute>} />
            <Route path="/*" element={<UserLayout />} />
          </Routes>
        </Suspense>
      </Router>
    </AppErrorBoundary>
  );
}

export default App;
