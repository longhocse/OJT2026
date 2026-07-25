import React from "react";

const ApiErrorState = ({
  message = "Không thể tải dữ liệu từ máy chủ.",
  onRetry,
  retrying = false,
}) => (
  <section
    role="alert"
    className="rounded-xl border border-red-500/30 bg-red-500/10 p-6 text-center text-error"
  >
    <h2 className="text-lg font-semibold">Không thể tải dữ liệu</h2>
    <p className="mt-2">{message}</p>
    {onRetry && (
      <button
        type="button"
        onClick={onRetry}
        disabled={retrying}
        className="mt-4 rounded-lg bg-primary px-5 py-2 font-semibold text-white disabled:opacity-50"
      >
        {retrying ? "Đang thử lại..." : "Thử lại"}
      </button>
    )}
  </section>
);

export default ApiErrorState;
