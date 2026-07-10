import React, { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { useLocation, useNavigate } from "react-router-dom";
import { Eye, EyeOff, Lock, Mail, Phone, User, ArrowRight } from "lucide-react";
import FormAlert from "../components/common/FormAlert";
import useAuth from "../hooks/useAuth";
import { applyBackendErrors } from "../validation/formErrors";
import { loginSchema, registerSchema } from "../validation/schemas";
import MovieTapMascot from "../components/MovieTapMascot";

const LoginPage = () => {
  const [mode, setMode] = useState("login");

  return (
    <main className="min-h-screen bg-[#FAFAFA] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-5xl bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col md:flex-row border border-gray-100">

        {/* LEFT SIDE - Hình ảnh trang trí */}
        <div className="hidden md:flex md:w-1/2 bg-gradient-to-br from-[#FEE2E2] via-[#FEF3C7] to-[#FCE7F3] p-12 items-center justify-center relative">
          <div className="absolute top-10 right-10 w-32 h-32 bg-[#FCA5A5] rounded-full blur-3xl opacity-40"></div>
          <div className="absolute bottom-10 left-10 w-40 h-40 bg-[#FCD34D] rounded-full blur-3xl opacity-40"></div>

          <div className="relative z-10 flex flex-col items-center text-center gap-6">
            <MovieTapMascot className="w-56 h-56 drop-shadow-xl" />
            <div>
              <h1 className="text-3xl font-bold text-slate-900">Chào mừng bạn!</h1>
              <p className="text-slate-600 mt-2">Đặt vé xem phim nhanh chóng và dễ dàng.</p>
            </div>
          </div>
        </div>

        {/* RIGHT SIDE - Form */}
        <div className="w-full md:w-1/2 p-8 md:p-12 bg-white">
          <div className="flex flex-col h-full justify-center max-w-md mx-auto">
            <div className="mb-8 text-center md:text-left">
              <h1 className="text-3xl font-extrabold text-[#2b2d42]">
                {mode === "login" ? "Đăng nhập" : "Đăng ký tài khoản"}
              </h1>
              <p className="mt-2 text-gray-500">
                {mode === "login"
                  ? "Chào mừng bạn trở lại! Hãy nhập thông tin để tiếp tục."
                  : "Tạo tài khoản để không bỏ lỡ những bộ phim hay nhất."}
              </p>
            </div>

            <AuthForm key={mode} mode={mode} />

            <div className="mt-6 flex flex-col gap-3 items-center text-sm">
              {mode === "login" && (
                <button
                  type="button"
                  onClick={() => (window.location.href = "/forgot-password")}
                  className="text-[#DC2626] hover:text-[#B91C1C] hover:underline transition font-medium"
                >
                  Quên mật khẩu?
                </button>
              )}

              <div className="border-t border-gray-200 w-full my-2"></div>

              <button
                type="button"
                onClick={() => setMode((value) => (value === "login" ? "register" : "login"))}
                className="flex items-center gap-2 text-[#2b2d42] hover:text-[#DC2626] transition font-semibold group"
              >
                {mode === "login" ? "Chưa có tài khoản? Đăng ký ngay" : "Đã có tài khoản? Đăng nhập"}
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
};

// ----------------- COMPONENT FORM ----------------- //

const AuthForm = ({ mode }) => {
  const isLogin = mode === "login";
  const [showPassword, setShowPassword] = useState(false);
  const [formError, setFormError] = useState("");
  const [notice, setNotice] = useState("");
  const { login, register: registerUser } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const {
    register,
    handleSubmit,
    setError,
    setFocus,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(isLogin ? loginSchema : registerSchema),
    defaultValues: { email: "", password: "", name: "", phone: "", confirmPassword: "" },
    shouldFocusError: true,
  });

  const submit = async (values) => {
    setFormError("");
    setNotice("");
    try {
      const response = isLogin ? await login(values) : await registerUser(values);
      if (!isLogin) {
        setNotice(response.message || "Đăng ký thành công. Vui lòng kiểm tra email để xác thực.");
        return;
      }
      const requested = location.state?.from;
      navigate(
        typeof requested === "string" ? requested : response.user.role === "admin" ? "/admin" : "/",
        { replace: true },
      );
    } catch (error) {
      setFormError(
        applyBackendErrors(error, {
          setError,
          setFocus,
          allowedFields: isLogin ? ["email", "password"] : ["email", "password", "name", "phone"],
        }),
      );
    }
  };

  return (
    <form onSubmit={handleSubmit(submit)} className="space-y-4" noValidate>
      <FormAlert message={formError} />
      {notice && (
        <p role="status" className="rounded-xl bg-[#DCFCE7] p-3 text-sm text-[#166534] font-medium border border-[#BBF7D0]">
          {notice}
        </p>
      )}

      {!isLogin && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field
            label="Họ tên *"
            icon={User}
            error={errors.name}
            inputProps={register("name")}
            autoComplete="name"
          />
          <Field
            label="Số điện thoại *"
            icon={Phone}
            error={errors.phone}
            inputProps={register("phone")}
            autoComplete="tel"
          />
        </div>
      )}

      <Field
        label="Email *"
        icon={Mail}
        error={errors.email}
        inputProps={register("email")}
        type="email"
        autoComplete="username"
      />

      <div className="relative">
        <label className="block text-sm font-medium text-[#2b2d42] mb-1">
          Mật khẩu *
        </label>
        <div className="relative">
          <Lock className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-[#2b2d42]" />
          <input
            {...register("password")}
            type={showPassword ? "text" : "password"}
            autoComplete={isLogin ? "current-password" : "new-password"}
            aria-invalid={Boolean(errors.password)}
            // Đã sửa: Bỏ nền xám, dùng nền trắng kem, chữ đen đậm, viền mỏng
            className="w-full rounded-xl bg-[#FAFAFA] border border-gray-200 text-[#2b2d42] py-2.5 pl-10 pr-10 placeholder:text-gray-400 focus:bg-white focus:border-[#DC2626] focus:ring-2 focus:ring-[#DC2626]/20 outline-none transition"
          />
          <button
            type="button"
            onClick={() => setShowPassword((value) => !value)}
            aria-label={showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-[#2b2d42] transition"
          >
            {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
          </button>
        </div>
        <FieldError error={errors.password} />
      </div>

      {!isLogin && (
        <Field
          label="Xác nhận mật khẩu *"
          icon={Lock}
          error={errors.confirmPassword}
          inputProps={register("confirmPassword")}
          type={showPassword ? "text" : "password"}
          autoComplete="new-password"
        />
      )}

      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full mt-6 rounded-xl bg-[#DC2626] py-3.5 font-bold text-white shadow-md shadow-[#DC2626]/30 hover:bg-[#B91C1C] transition disabled:cursor-not-allowed disabled:opacity-50"
      >
        {isSubmitting ? "Đang xử lý..." : isLogin ? "Đăng nhập" : "Đăng ký"}
      </button>
    </form>
  );
};

// ----------------- COMPONENT FIELD ----------------- //

const Field = ({ label, icon: Icon, error, inputProps, type = "text", ...rest }) => (
  <label className="block text-sm font-medium text-[#2b2d42]">
    <span className="mb-1 block">{label}</span>
    <span className="relative block">
      <Icon className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-[#2b2d42]" />
      <input
        {...inputProps}
        {...rest}
        type={type}
        aria-invalid={Boolean(error)}
        // Đã sửa: Bỏ dark:bg-gray-700, sửa thành nền sáng, chữ đen rõ
        className="w-full rounded-xl bg-[#FAFAFA] border border-gray-200 text-[#2b2d42] py-2.5 pl-10 pr-3 placeholder:text-gray-400 focus:bg-white focus:border-[#DC2626] focus:ring-2 focus:ring-[#DC2626]/20 outline-none transition"
      />
    </span>
    <FieldError error={error} />
  </label>
);

const FieldError = ({ error }) =>
  error ? (
    <span role="alert" className="mt-1 block text-sm text-[#DC2626] font-medium">
      {error.message}
    </span>
  ) : null;

export default LoginPage;