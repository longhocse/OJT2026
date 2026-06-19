// frontend/src/App.jsx
import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useSelector } from 'react-redux';

// SỬA: Import đúng đường dẫn
import Navbar from './components/layout/Navbar';
import Footer from './components/layout/Footer';

import HomePage from './pages/HomePage';
import LoginPage from './pages/LoginPage';
import MoviesPage from './pages/MoviesPage';
import MovieDetailPage from './pages/MovieDetailPage';
import BookingPage from './pages/BookingPage';
import CheckoutPage from './pages/CheckoutPage';
import SuccessPage from './pages/SuccessPage';
import MyBookingsPage from './pages/MyBookingsPage';

import AdminRoute from './components/common/AdminRoute';
import ProtectedRoute from './components/common/ProtectedRoute';

// Admin Pages
import AdminDashboard from './pages/admin/AdminDashboard';
import AdminMovies from './pages/admin/AdminMovies';
import AdminMovieForm from './pages/admin/AdminMovieForm';
import AdminCinemas from './pages/admin/AdminCinemas';
import AdminCinemaForm from './pages/admin/AdminCinemaForm';
import AdminRooms from './pages/admin/AdminRooms';
import AdminRoomForm from './pages/admin/AdminRoomForm';
import AdminBookings from './pages/admin/AdminBookings';
import AdminUsers from './pages/admin/AdminUsers';

import './App.css';

function App() {
  const { isAuthenticated, user } = useSelector((state) => state.auth);
  const isAdmin = user?.role === 'admin';

  return (
    <Router>
      <div className="min-h-screen flex flex-col bg-gray-100 dark:bg-gray-900">
        <Navbar />
        <main className="flex-grow pt-16">
          <Routes>
            {/* Public Routes */}
            <Route path="/" element={<HomePage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/movies" element={<MoviesPage />} />
            <Route path="/movie/:id" element={<MovieDetailPage />} />

            {/* Protected Routes - Customer */}
            <Route path="/booking/:showId" element={
              <ProtectedRoute>
                <BookingPage />
              </ProtectedRoute>
            } />
            <Route path="/checkout" element={
              <ProtectedRoute>
                <CheckoutPage />
              </ProtectedRoute>
            } />
            <Route path="/success" element={
              <ProtectedRoute>
                <SuccessPage />
              </ProtectedRoute>
            } />
            <Route path="/my-bookings" element={
              <ProtectedRoute>
                <MyBookingsPage />
              </ProtectedRoute>
            } />

            {/* Admin Routes */}
            <Route path="/admin" element={
              <AdminRoute>
                <AdminDashboard />
              </AdminRoute>
            } />
            <Route path="/admin/movies" element={
              <AdminRoute>
                <AdminMovies />
              </AdminRoute>
            } />
            <Route path="/admin/movies/create" element={
              <AdminRoute>
                <AdminMovieForm />
              </AdminRoute>
            } />
            <Route path="/admin/movies/edit/:id" element={
              <AdminRoute>
                <AdminMovieForm />
              </AdminRoute>
            } />
            <Route path="/admin/cinemas" element={
              <AdminRoute>
                <AdminCinemas />
              </AdminRoute>
            } />
            <Route path="/admin/cinemas/create" element={
              <AdminRoute>
                <AdminCinemaForm />
              </AdminRoute>
            } />
            <Route path="/admin/cinemas/edit/:id" element={
              <AdminRoute>
                <AdminCinemaForm />
              </AdminRoute>
            } />
            <Route path="/admin/rooms" element={
              <AdminRoute>
                <AdminRooms />
              </AdminRoute>
            } />
            <Route path="/admin/rooms/create" element={
              <AdminRoute>
                <AdminRoomForm />
              </AdminRoute>
            } />
            <Route path="/admin/rooms/edit/:id" element={
              <AdminRoute>
                <AdminRoomForm />
              </AdminRoute>
            } />
            <Route path="/admin/bookings" element={
              <AdminRoute>
                <AdminBookings />
              </AdminRoute>
            } />
            <Route path="/admin/users" element={
              <AdminRoute>
                <AdminUsers />
              </AdminRoute>
            } />

            {/* Fallback */}
            <Route path="*" element={<Navigate to="/" />} />
          </Routes>
        </main>
        <Footer />
      </div>
    </Router>
  );
}

export default App;