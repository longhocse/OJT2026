import React, { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import useAuth from "../hooks/useAuth";

const VerifyEmailPage = () => {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { verifyEmail } = useAuth();
  const [state, setState] = useState({ status: "verifying", message: "Đang xác thực email..." });

  useEffect(() => {
    const token = params.get("token");
    if (!token) {
      setState({ status: "error", message: "Link xác thực không hợp lệ hoặc thiếu token." });
      return;
    }

    let cancelled = false;
    verifyEmail(token)
      .then(() => {
        if (cancelled) return;
        setState({
          status: "success",
          message: "Email đã được xác thực. Đang chuyển về trang chủ...",
        });
        window.setTimeout(() => navigate("/", { replace: true }), 800);
      })
      .catch((error) => {
        if (cancelled) return;
        setState({
          status: "error",
          message: error.response?.data?.message || "Không thể xác thực email. Vui lòng thử lại.",
        });
      });

    return () => {
      cancelled = true;
    };
  }, [navigate, params, verifyEmail]);

  return (
    <main className="container-custom flex min-h-[calc(100vh-64px)] items-center justify-center py-12">
      <section className="w-full max-w-md rounded-2xl bg-white p-8 text-center shadow-xl dark:bg-gray-800">
        <h1 className="text-2xl font-bold">Xác thực email</h1>
        <p
          role={state.status === "error" ? "alert" : "status"}
          className={`mt-4 ${
            state.status === "error"
              ? "text-red-500"
              : state.status === "success"
                ? "text-green-500"
                : "text-gray-500"
          }`}
        >
          {state.message}
        </p>
        {state.status === "error" && (
          <Link
            to="/login"
            className="mt-6 inline-block rounded-lg bg-primary px-4 py-2 font-semibold text-white"
          >
            Quay lại đăng nhập
          </Link>
        )}
      </section>
    </main>
  );
};

export default VerifyEmailPage;
