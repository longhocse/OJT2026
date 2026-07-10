import React, { Suspense, lazy } from "react";
import { Route, Routes } from "react-router-dom";
import ProtectedRoute from "../components/common/ProtectedRoute";
import PageLoader from "../components/common/PageLoader";
import Footer from "../components/layout/Footer";
import Navbar from "../components/layout/Navbar";
import ChatbotWidget from "../components/chat/ChatbotWidget"; // 1. Import ChatbotWidget

const HomePage = lazy(() => import("../pages/HomePage"));
const LoginPage = lazy(() => import("../pages/LoginPage"));
const MoviesPage = lazy(() => import("../pages/MoviesPage"));
const MovieDetailPage = lazy(() => import("../pages/MovieDetailPage"));
const BookingPage = lazy(() => import("../pages/BookingPage"));
const CheckoutPage = lazy(() => import("../pages/CheckoutPage"));
const SuccessPage = lazy(() => import("../pages/SuccessPage"));
const MyBookingsPage = lazy(() => import("../pages/MyBookingsPage"));
const ApiErrorPage = lazy(() => import("../pages/ApiErrorPage"));
const NotFoundPage = lazy(() => import("../pages/NotFoundPage"));
const ProfilePage = lazy(() => import("../pages/ProfilePage"));
const ForgotPasswordPage = lazy(() => import("../pages/ForgotPasswordPage"));
const ResetPasswordPage = lazy(() => import("../pages/ResetPasswordPage"));
const VerifyEmailPage = lazy(() => import("../pages/VerifyEmailPage"));

const protectedPage = (Page) => (
  <ProtectedRoute>
    <Page />
  </ProtectedRoute>
);

export default function UserLayout() {
  return (
    <>
      <a
        href="#main-content"
        className="sr-only z-[100] rounded bg-primary px-4 py-2 text-white focus:not-sr-only focus:fixed focus:left-4 focus:top-4"
      >
        Bỏ qua điều hướng
      </a>
      <Navbar />
      <div id="main-content" className="flex-grow pt-16">
        <Suspense fallback={<PageLoader />}>
          <Routes>
            <Route index element={<HomePage />} />
            <Route path="login" element={<LoginPage />} />
            <Route path="forgot-password" element={<ForgotPasswordPage />} />
            <Route path="reset-password" element={<ResetPasswordPage />} />
            <Route path="verify-email" element={<VerifyEmailPage />} />
            <Route path="movies" element={<MoviesPage />} />
            <Route path="movie/:id" element={<MovieDetailPage />} />
            <Route path="booking/:showId" element={protectedPage(BookingPage)} />
            <Route path="checkout" element={protectedPage(CheckoutPage)} />
            <Route path="success" element={protectedPage(SuccessPage)} />
            <Route path="my-bookings" element={protectedPage(MyBookingsPage)} />
            <Route path="profile" element={protectedPage(ProfilePage)} />
            <Route path="error" element={<ApiErrorPage />} />
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </Suspense>
      </div>
      <Footer />

      {/* 2. Đặt ChatbotWidget ngay dưới Footer để nó luôn hiển thị ở góc dưới cùng bên phải */}
      <ChatbotWidget />
    </>
  );
}