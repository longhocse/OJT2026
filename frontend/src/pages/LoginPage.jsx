import React, { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { useLocation, useNavigate } from "react-router-dom";
import { Eye, EyeOff, Lock, Mail, Phone, User } from "lucide-react";
import FormAlert from "../components/common/FormAlert";
import useAuth from "../hooks/useAuth";
import { roleHomePath } from "../utils/roles";
import { applyBackendErrors } from "../validation/formErrors";
import { loginSchema, registerSchema } from "../validation/schemas";

const LoginPage = () => {
  const [mode, setMode] = useState("login");
  return (
    <main className="flex min-h-[calc(100vh-64px)] items-center justify-center px-4 py-12">
      <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-xl dark:bg-gray-800">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold">{mode === "login" ? "Đăng nhập" : "Đăng ký"}</h1>
          <p className="mt-2 text-gray-500">
            {mode === "login" ? "Chào mừng bạn trở lại!" : "Tạo tài khoản để đặt vé."}
          </p>
        </div>
        <AuthForm key={mode} mode={mode} />
        {mode === "login" && (
          <button
            type="button"
            onClick={() => (window.location.href = "/forgot-password")}
            className="mt-4 w-full text-sm text-blue-600"
          >
            Quên mật khẩu?
          </button>
        )}
        <button
          type="button"
          onClick={() => setMode((value) => (value === "login" ? "register" : "login"))}
          className="mt-6 w-full text-sm text-blue-600"
        >
          {mode === "login" ? "Chưa có tài khoản? Đăng ký ngay" : "Đã có tài khoản? Đăng nhập"}
        </button>
      </div>
    </main>
  );
};

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
      navigate(typeof requested === "string" ? requested : roleHomePath(response.user.role), {
        replace: true,
      });
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
        <p role="status" className="rounded-lg bg-green-500/10 p-3 text-sm text-green-500">
          {notice}
        </p>
      )}
      {!isLogin && (
        <Field
          label="Họ tên"
          icon={User}
          error={errors.name}
          inputProps={register("name")}
          autoComplete="name"
        />
      )}
      {!isLogin && (
        <Field
          label="Số điện thoại"
          icon={Phone}
          error={errors.phone}
          inputProps={register("phone")}
          autoComplete="tel"
        />
      )}
      <Field
        label="Email"
        icon={Mail}
        error={errors.email}
        inputProps={register("email")}
        type="email"
        autoComplete="username"
      />
      <label className="block text-sm font-medium">
        <span className="mb-1 block">Mật khẩu</span>
        <span className="relative block">
          <Lock className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
          <input
            {...register("password")}
            type={showPassword ? "text" : "password"}
            autoComplete={isLogin ? "current-password" : "new-password"}
            aria-invalid={Boolean(errors.password)}
            className="w-full rounded-lg border py-2 pl-10 pr-10 dark:bg-gray-700"
          />
          <button
            type="button"
            onClick={() => setShowPassword((value) => !value)}
            aria-label={showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
            className="absolute right-3 top-1/2 -translate-y-1/2"
          >
            {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
          </button>
        </span>
        <FieldError error={errors.password} />
      </label>
      {!isLogin && (
        <Field
          label="Xác nhận mật khẩu"
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
        className="w-full rounded-lg bg-blue-600 py-3 font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
      >
        {isSubmitting ? "Đang xử lý..." : isLogin ? "Đăng nhập" : "Đăng ký"}
      </button>
    </form>
  );
};

const Field = ({ label, icon: Icon, error, inputProps, type = "text", ...rest }) => (
  <label className="block text-sm font-medium">
    <span className="mb-1 block">{label}</span>
    <span className="relative block">
      <Icon className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
      <input
        {...inputProps}
        {...rest}
        type={type}
        aria-invalid={Boolean(error)}
        className="w-full rounded-lg border py-2 pl-10 pr-3 dark:bg-gray-700"
      />
    </span>
    <FieldError error={error} />
  </label>
);

const FieldError = ({ error }) =>
  error ? (
    <span role="alert" className="mt-1 block text-sm text-red-500">
      {error.message}
    </span>
  ) : null;

export default LoginPage;
