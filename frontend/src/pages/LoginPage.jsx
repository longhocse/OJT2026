// frontend/src/pages/LoginPage.jsx
import React, { useState } from "react";
import { useDispatch } from "react-redux";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Eye, EyeOff, Mail, Lock, User, Phone } from "lucide-react";
import { authService } from "../services/authService";
import { setCredentials } from "../redux/slices/authSlice";

const LoginPage = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    email: "customer1@gmail.com",
    password: "123456",
    name: "",
    phone: "",
    confirmPassword: ""
  });
  
  const dispatch = useDispatch();
  const navigate = useNavigate();

  // Xử lý thay đổi input
  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  // Xử lý submit form
  const handleSubmit = async (e) => {
    e.preventDefault();
    console.log("🚀 Form submitted!");
    console.log("📝 Form data:", formData);
    
    setError("");
    setLoading(true);

    try {
      let response;

      if (isLogin) {
        // Kiểm tra email và password không được rỗng
        if (!formData.email || !formData.password) {
          throw new Error("Vui lòng nhập email và mật khẩu");
        }
        
        console.log("🔐 Attempting login...");
        response = await authService.login({
          email: formData.email,
          password: formData.password,
        });
      } else {
        // Kiểm tra confirm password
        if (formData.password !== formData.confirmPassword) {
          throw new Error("Mật khẩu xác nhận không khớp");
        }
        
        console.log("📝 Attempting register...");
        response = await authService.register({
          name: formData.name,
          email: formData.email,
          phone: formData.phone,
          password: formData.password,
        });
      }

      console.log("✅ Response:", response);

      if (!response || !response.user || !response.token) {
        throw new Error("Invalid response from server");
      }

      // Dispatch credentials
      dispatch(
        setCredentials({
          user: response.user,
          token: response.token,
        })
      );

      console.log("✅ Login successful! Redirecting...");
      navigate("/");

    } catch (err) {
      console.error("❌ Login error:", err);
      
      let errorMessage = "Đã có lỗi xảy ra. Vui lòng thử lại.";
      
      if (err.response) {
        console.error("Server response:", err.response.data);
        if (err.response.status === 401) {
          errorMessage = "Email hoặc mật khẩu không đúng";
        } else if (err.response.data?.message) {
          errorMessage = err.response.data.message;
        }
      } else if (err.request) {
        errorMessage = "Không thể kết nối đến server. Vui lòng kiểm tra kết nối.";
      } else {
        errorMessage = err.message || "Đã có lỗi xảy ra";
      }
      
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // Test API connection
  const testApiConnection = async () => {
    try {
      console.log("Testing API connection...");
      const response = await fetch("http://localhost:5000/api/health");
      const data = await response.json();
      console.log("API health check:", data);
      alert("✅ Kết nối API thành công!");
    } catch (error) {
      console.error("❌ API connection failed:", error);
      alert("❌ Không thể kết nối đến API server!\n\nVui lòng kiểm tra:\n1. Backend đang chạy tại http://localhost:5000\n2. CORS đã được cấu hình đúng");
    }
  };

  return (
    <div className="min-h-[calc(100vh-64px)] flex items-center justify-center py-12 px-4">
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md w-full bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8"
      >
        <div className="text-center mb-8">
          <h1 className="font-heading text-2xl font-bold">{isLogin ? "Đăng nhập" : "Đăng ký"}</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            {isLogin ? "Chào mừng bạn trở lại!" : "Tạo tài khoản để đặt vé dễ dàng hơn"}
          </p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-lg text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {!isLogin && (
            <>
              <div>
                <label className="block text-sm font-medium mb-1">Họ tên</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    className="w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700"
                    placeholder="Nguyễn Văn A"
                    required={!isLogin}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Số điện thoại</label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="text"
                    name="phone"
                    value={formData.phone}
                    onChange={handleChange}
                    className="w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700"
                    placeholder="0912345678"
                    required={!isLogin}
                  />
                </div>
              </div>
            </>
          )}

          <div>
            <label className="block text-sm font-medium mb-1">Email</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                className="w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700"
                placeholder="you@example.com"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Mật khẩu</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type={showPassword ? "text" : "password"}
                name="password"
                value={formData.password}
                onChange={handleChange}
                className="w-full pl-10 pr-10 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700"
                placeholder="••••••"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2"
              >
                {showPassword ? (
                  <EyeOff className="w-5 h-5 text-gray-400" />
                ) : (
                  <Eye className="w-5 h-5 text-gray-400" />
                )}
              </button>
            </div>
          </div>

          {!isLogin && (
            <div>
              <label className="block text-sm font-medium mb-1">Xác nhận mật khẩu</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type={showPassword ? "text" : "password"}
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  className="w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700"
                  placeholder="••••••"
                  required={!isLogin}
                />
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors disabled:opacity-50"
          >
            {loading ? "Đang xử lý..." : isLogin ? "Đăng nhập" : "Đăng ký"}
          </button>
        </form>

        <div className="mt-6 text-center">
          <button
            onClick={() => {
              setIsLogin(!isLogin);
              setError("");
              setFormData({
                ...formData,
                name: "",
                phone: "",
                confirmPassword: ""
              });
            }}
            className="text-blue-600 hover:text-blue-700 text-sm"
          >
            {isLogin ? "Chưa có tài khoản? Đăng ký ngay" : "Đã có tài khoản? Đăng nhập"}
          </button>
        </div>

        <div className="mt-4 text-center">
          <button
            onClick={testApiConnection}
            className="text-gray-500 hover:text-gray-700 text-xs underline"
          >
            Kiểm tra kết nối API
          </button>
        </div>
      </motion.div>
    </div>
  );
};

export default LoginPage;