import React from "react";

class AppErrorBoundary extends React.Component {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <main className="flex min-h-screen items-center justify-center bg-gray-950 p-6 text-white">
        <section
          role="alert"
          className="max-w-lg rounded-xl border border-red-500/30 bg-gray-900 p-8 text-center"
        >
          <h1 className="text-2xl font-bold">Ứng dụng gặp sự cố</h1>
          <p className="mt-3 text-gray-300">
            Vui lòng tải lại trang. Nếu lỗi tiếp tục xảy ra, hãy thử lại sau.
          </p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="mt-6 rounded-lg bg-primary px-5 py-2 font-semibold text-white"
          >
            Tải lại trang
          </button>
        </section>
      </main>
    );
  }
}

export default AppErrorBoundary;
