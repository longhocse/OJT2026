import { useCallback } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { setCredentials } from "../redux/slices/authSlice";
import { authService } from "../services/authService";
import { clearClientSession } from "../services/authSession";

const assertAuthResponse = (response) => {
  if (!response?.user || !response?.token) {
    throw new Error("Phản hồi đăng nhập từ máy chủ không hợp lệ.");
  }
  return response;
};

const useAuth = () => {
  const auth = useSelector((state) => state.auth);
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const login = useCallback(
    async (credentials) => {
      const response = assertAuthResponse(await authService.login(credentials));
      dispatch(setCredentials(response));
      return response;
    },
    [dispatch],
  );

  const register = useCallback(
    async (userData) => {
      const response = assertAuthResponse(await authService.register(userData));
      dispatch(setCredentials(response));
      return response;
    },
    [dispatch],
  );

  const logoutUser = useCallback(
    async (destination = "/login") => {
      try {
        await authService.logout();
      } catch (_error) {
        // Local cleanup must still happen if the session is already unavailable.
      }
      void clearClientSession();
      navigate(destination, { replace: true });
    },
    [navigate],
  );

  return {
    ...auth,
    login,
    register,
    logout: logoutUser,
  };
};

export default useAuth;
