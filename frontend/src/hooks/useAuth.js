import { useSelector, useDispatch } from "react-redux";
import { useNavigate } from "react-router-dom";
import { setCredentials, logout } from "../redux/slices/authSlice";
import api from "../services/api";

const useAuth = () => {
    const { user, token, isAuthenticated } = useSelector((state) => state.auth);
    const dispatch = useDispatch();
    const navigate = useNavigate();

    // Đăng nhập
    const login = async (email, password) => {
        try {
            const response = await api.post("/auth/login", { email, password });
            dispatch(setCredentials({
                user: response.data.user,
                token: response.data.token
            }));
            return { success: true, user: response.data.user };
        } catch (error) {
            return {
                success: false,
                message: error.response?.data?.message || "Đăng nhập thất bại"
            };
        }
    };

    // Đăng ký
    const register = async (userData) => {
        try {
            const response = await api.post("/auth/register", userData);
            dispatch(setCredentials({
                user: response.data.user,
                token: response.data.token
            }));
            return { success: true, user: response.data.user };
        } catch (error) {
            return {
                success: false,
                message: error.response?.data?.message || "Đăng ký thất bại"
            };
        }
    };

    // Đăng xuất
    const logoutUser = () => {
        dispatch(logout());
        navigate("/login");
    };

    // Cập nhật thông tin user (nếu cần)
    const updateUser = async (userData) => {
        try {
            const response = await api.put("/auth/me", userData);
            dispatch(setCredentials({
                user: response.data.user,
                token: token
            }));
            return { success: true, user: response.data.user };
        } catch (error) {
            return {
                success: false,
                message: error.response?.data?.message || "Cập nhật thất bại"
            };
        }
    };

    // Kiểm tra token còn hạn không
    const isTokenValid = () => {
        if (!token) return false;
        // Có thể thêm logic kiểm tra token expiration ở đây
        return true;
    };

    return {
        user,
        token,
        isAuthenticated,
        login,
        register,
        logout: logoutUser,
        updateUser,
        isTokenValid,
    };
};

export default useAuth;