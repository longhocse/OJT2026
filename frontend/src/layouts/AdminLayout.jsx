import React, { Suspense, lazy } from "react";
import { Route, Routes } from "react-router-dom";
import AdminSidebar from "../components/admin/AdminSidebar";
import PageLoader from "../components/common/PageLoader";

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

export default function AdminLayout() {
  return (
    <div className="flex min-h-screen flex-col bg-[#0B1120] lg:flex-row">

      {/* Sidebar (Tách biệt với content) */}
      <AdminSidebar />

      {/* Main Content Area - Với hiệu ứng kính mờ nhẹ */}
      <div className="min-w-0 flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto">
        <div className="relative h-full rounded-2xl border border-white/5 bg-slate-900/40 p-4 sm:p-6 backdrop-blur-sm shadow-2xl">

          <Suspense fallback={<PageLoader />}>
            <Routes>
              <Route index element={<AdminDashboard />} />
              <Route path="movies" element={<AdminMovies />} />
              <Route path="movies/create" element={<AdminMovieForm />} />
              <Route path="movies/edit/:id" element={<AdminMovieForm />} />
              <Route path="cinemas" element={<AdminCinemas />} />
              <Route path="cinemas/create" element={<AdminCinemaForm />} />
              <Route path="cinemas/edit/:id" element={<AdminCinemaForm />} />
              <Route path="rooms" element={<AdminRooms />} />
              <Route path="rooms/create" element={<AdminRoomForm />} />
              <Route path="rooms/edit/:id" element={<AdminRoomForm />} />
              <Route path="shows" element={<AdminShows />} />
              <Route path="shows/create" element={<AdminShowForm />} />
              <Route path="shows/edit/:id" element={<AdminShowForm />} />
              <Route path="payments" element={<AdminPayments />} />
              <Route path="bookings" element={<AdminBookings />} />
              <Route path="users" element={<AdminUsers />} />
              <Route path="genres" element={<AdminGenres />} />
              <Route path="audit-logs" element={<AdminAuditLogs />} />
              <Route path="*" element={<NotFoundPage />} />
            </Routes>
          </Suspense>

        </div>
      </div>
    </div>
  );
}