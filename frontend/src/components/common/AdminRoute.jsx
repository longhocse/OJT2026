import { Link, Navigate, useLocation } from "react-router-dom";
import { useSelector } from "react-redux";

const SessionLoading = () => (
  <div
    className="min-h-screen bg-gray-950 text-white flex items-center justify-center"
    role="status"
  >
    Đang xác minh quyền truy cập...
  </div>
);

const AccessDenied = () => (
  <main className="min-h-screen bg-gray-950 text-white flex items-center justify-center p-6">
    <div className="max-w-md rounded-2xl border border-red-500/30 bg-gray-900 p-8 text-center">
      <h1 className="text-2xl font-bold">Không đủ quyền truy cập</h1>
      <p className="mt-3 text-gray-400">Tài khoản của bạn không có quyền quản trị.</p>
      <Link
        to="/"
        className="mt-6 inline-block rounded-lg bg-yellow-500 px-5 py-2 font-semibold text-black"
      >
        Về trang chủ
      </Link>
    </div>
  </main>
);

export default function AdminRoute({ children }) {
  const { token, isAuthenticated, user, verificationStatus } = useSelector((state) => state.auth);
  const location = useLocation();

  if (token && (verificationStatus === "idle" || verificationStatus === "verifying")) {
    return <SessionLoading />;
  }

  if (!isAuthenticated) {
    const from = `${location.pathname}${location.search}${location.hash}`;
    return <Navigate to="/login" replace state={{ from }} />;
  }

  if (user?.role !== "admin") return <AccessDenied />;

  return children;
}
