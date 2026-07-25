import React from "react";
import { Link } from "react-router-dom";

const NotFoundPage = () => (
  <main className="flex min-h-[70vh] items-center justify-center px-4 py-16 text-center">
    <div className="max-w-lg">
      <p className="text-sm font-semibold uppercase tracking-widest text-primary">404</p>
      <h1 className="mt-3 text-4xl font-bold">Không tìm thấy trang</h1>
      <p className="mt-4 text-on-surface-variant">
        Đường dẫn có thể đã thay đổi hoặc không tồn tại.
      </p>
      <Link
        to="/"
        className="mt-7 inline-flex rounded-lg bg-primary px-6 py-3 font-semibold text-white"
      >
        Về trang chủ
      </Link>
    </div>
  </main>
);

export default NotFoundPage;
