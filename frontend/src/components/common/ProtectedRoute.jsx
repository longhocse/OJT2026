import { Navigate, useLocation } from "react-router-dom";
import { useSelector } from "react-redux";

const SessionLoading = () => (
  <div className="min-h-[40vh] flex items-center justify-center" role="status">
    <span className="sr-only">Đang xác minh phiên đăng nhập</span>
    <div className="h-10 w-10 animate-spin rounded-full border-2 border-primary border-t-transparent" />
  </div>
);

export default function ProtectedRoute({ children }) {
  const { token, isAuthenticated, verificationStatus } = useSelector((state) => state.auth);
  const location = useLocation();

  if (token && (verificationStatus === "idle" || verificationStatus === "verifying")) {
    return <SessionLoading />;
  }

  if (!token && !isAuthenticated) {
    const from = `${location.pathname}${location.search}${location.hash}`;
    return <Navigate to="/login" replace state={{ from }} />;
  }

  return children;
}
