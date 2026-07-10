import React, { Suspense, lazy } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { useSelector } from "react-redux";
import AdminSidebar from "../components/admin/AdminSidebar";
import PageLoader from "../components/common/PageLoader";
import {
  ADMIN_ROLE,
  CASHIER_ROLE,
  MANAGER_ROLE,
  TICKET_CHECKER_ROLE,
  roleHomePath,
} from "../utils/roles";

const AdminDashboard = lazy(() => import("../pages/admin/AdminDashboard"));
const AdminMovies = lazy(() => import("../pages/admin/AdminMovies"));
const AdminMovieForm = lazy(() => import("../pages/admin/AdminMovieForm"));
const AdminCinemas = lazy(() => import("../pages/admin/AdminCinemas"));
const AdminCinemaForm = lazy(() => import("../pages/admin/AdminCinemaForm"));
const AdminRooms = lazy(() => import("../pages/admin/AdminRooms"));
const AdminRoomForm = lazy(() => import("../pages/admin/AdminRoomForm"));
const AdminShows = lazy(() => import("../pages/admin/AdminShows"));
const AdminShowForm = lazy(() => import("../pages/admin/AdminShowForm"));
const AdminPayments = lazy(() => import("../pages/admin/AdminPayments"));
const AdminBookings = lazy(() => import("../pages/admin/AdminBookings"));
const AdminUsers = lazy(() => import("../pages/admin/AdminUsers"));
const AdminGenres = lazy(() => import("../pages/admin/AdminGenres"));
const AdminAuditLogs = lazy(() => import("../pages/admin/AdminAuditLogs"));
const NotFoundPage = lazy(() => import("../pages/NotFoundPage"));

const ADMIN_ONLY = [ADMIN_ROLE];
const MANAGER_UP = [ADMIN_ROLE, MANAGER_ROLE];
const CASHIER_UP = [ADMIN_ROLE, MANAGER_ROLE, CASHIER_ROLE];
const CHECKIN_ROLES = [ADMIN_ROLE, MANAGER_ROLE, CASHIER_ROLE, TICKET_CHECKER_ROLE];

const RoleGate = ({ allowed, children }) => {
  const role = useSelector((state) => state.auth.user?.role);
  if (!allowed.includes(role)) {
    return <Navigate to={roleHomePath(role)} replace />;
  }
  return children;
};

const AdminIndex = () => {
  const role = useSelector((state) => state.auth.user?.role);
  if (role === CASHIER_ROLE) {
    return <Navigate to="/admin/bookings" replace />;
  }
  if (role === TICKET_CHECKER_ROLE) {
    return <Navigate to="/admin/payments" replace />;
  }
  return <AdminDashboard />;
};

export default function AdminLayout() {
  return (
    <div className="flex min-h-screen flex-col bg-gray-900 lg:flex-row">
      <AdminSidebar />
      <div className="min-w-0 flex-1 p-3 sm:p-6">
        <Suspense fallback={<PageLoader />}>
          <Routes>
            <Route index element={<AdminIndex />} />
            <Route path="movies" element={<RoleGate allowed={ADMIN_ONLY}><AdminMovies /></RoleGate>} />
            <Route path="movies/create" element={<RoleGate allowed={ADMIN_ONLY}><AdminMovieForm /></RoleGate>} />
            <Route path="movies/edit/:id" element={<RoleGate allowed={ADMIN_ONLY}><AdminMovieForm /></RoleGate>} />
            <Route path="cinemas" element={<RoleGate allowed={MANAGER_UP}><AdminCinemas /></RoleGate>} />
            <Route path="cinemas/create" element={<RoleGate allowed={ADMIN_ONLY}><AdminCinemaForm /></RoleGate>} />
            <Route path="cinemas/edit/:id" element={<RoleGate allowed={ADMIN_ONLY}><AdminCinemaForm /></RoleGate>} />
            <Route path="rooms" element={<RoleGate allowed={MANAGER_UP}><AdminRooms /></RoleGate>} />
            <Route path="rooms/create" element={<RoleGate allowed={MANAGER_UP}><AdminRoomForm /></RoleGate>} />
            <Route path="rooms/edit/:id" element={<RoleGate allowed={MANAGER_UP}><AdminRoomForm /></RoleGate>} />
            <Route path="shows" element={<RoleGate allowed={MANAGER_UP}><AdminShows /></RoleGate>} />
            <Route path="shows/create" element={<RoleGate allowed={MANAGER_UP}><AdminShowForm /></RoleGate>} />
            <Route path="shows/edit/:id" element={<RoleGate allowed={MANAGER_UP}><AdminShowForm /></RoleGate>} />
            <Route path="payments" element={<RoleGate allowed={CHECKIN_ROLES}><AdminPayments /></RoleGate>} />
            <Route path="bookings" element={<RoleGate allowed={CASHIER_UP}><AdminBookings /></RoleGate>} />
            <Route path="users" element={<RoleGate allowed={ADMIN_ONLY}><AdminUsers /></RoleGate>} />
            <Route path="genres" element={<RoleGate allowed={ADMIN_ONLY}><AdminGenres /></RoleGate>} />
            <Route path="audit-logs" element={<RoleGate allowed={MANAGER_UP}><AdminAuditLogs /></RoleGate>} />
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </Suspense>
      </div>
    </div>
  );
}
