import React from "react";
import { useLocation, useNavigate } from "react-router-dom";

const ApiErrorPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const message =
    typeof location.state?.message === "string"
      ? location.state.message
      : "Không thể kết nối tới dịch vụ MovieTap lúc này.";

  return (
    <main className="flex min-h-[70vh] items-center justify-center px-4 py-16 text-center">
      <section
        role="alert"
        className="max-w-lg rounded-2xl border border-red-500/30 bg-red-500/10 p-8"
      >
        <h1 className="text-3xl font-bold">Dịch vụ tạm thời gián đoạn</h1>
        <p className="mt-4 text-on-surface-variant">{message}</p>
        <div className="mt-7 flex flex-wrap justify-center gap-3">
          <button
            type="button"
            onClick={() => navigate(0)}
            className="rounded-lg bg-primary px-5 py-2 font-semibold text-white"
          >
            Thử lại
          </button>
          <button
            type="button"
            onClick={() => navigate("/")}
            className="rounded-lg border border-white/20 px-5 py-2 font-semibold"
          >
            Về trang chủ
          </button>
        </div>
      </section>
    </main>
  );
};

export default ApiErrorPage;
