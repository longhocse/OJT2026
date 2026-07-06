import React, { Suspense, lazy } from "react";
import { BrowserRouter as Router, Route, Routes } from "react-router-dom";
import AuthSessionManager from "./components/auth/AuthSessionManager";
import AdminRoute from "./components/common/AdminRoute";
import AppErrorBoundary from "./components/common/AppErrorBoundary";
import PageLoader from "./components/common/PageLoader";

const AdminLayout = lazy(() => import("./layouts/AdminLayout"));
const UserLayout = lazy(() => import("./layouts/UserLayout"));

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
            <Route path="/*" element={<UserLayout />} />
          </Routes>
        </Suspense>
      </Router>
    </AppErrorBoundary>
  );
}

export default App;
