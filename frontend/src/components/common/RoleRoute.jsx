import { Navigate, useLocation } from "react-router-dom";
import { useSelector } from "react-redux";
import { roleHomePath } from "../../utils/roles";

export default function RoleRoute({ role, children }) {
  const { token, isAuthenticated, user, verificationStatus } = useSelector((state) => state.auth);
  const location = useLocation();

  if (token && (verificationStatus === "idle" || verificationStatus === "verifying")) {
    return <div role="status" className="grid min-h-screen place-items-center bg-[#0B1120] text-slate-300">Đang xác minh quyền truy cập...</div>;
  }
  if (!isAuthenticated) {
    const from = `${location.pathname}${location.search}${location.hash}`;
    return <Navigate to="/login" replace state={{ from }} />;
  }
  if (user?.role !== role) return <Navigate to={roleHomePath(user?.role)} replace />;
  return children;
}
