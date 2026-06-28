import React, { useState } from "react";
import { Link } from "react-router-dom";
import FormAlert from "../components/common/FormAlert";
import { authService } from "../services/authService";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [result, setResult] = useState(null);
  const [submittedEmail, setSubmittedEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const requestReset = async (targetEmail) => {
    setIsSubmitting(true);
    try {
      const response = await authService.forgotPassword(targetEmail);
      setSubmittedEmail(targetEmail);
      setResult({
        type: "success",
        message:
          response.message ||
          "Nếu email tồn tại, chúng tôi đã gửi hướng dẫn đặt lại mật khẩu tới email của bạn.",
      });
    } catch (error) {
      setResult({
        type: "error",
        error: error.response?.data?.message || "Không thể tạo yêu cầu đặt lại mật khẩu.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };
  const submit = async (event) => {
    event.preventDefault();
    await requestReset(email);
  };

  if (result?.type === "success") {
    return (
      <main className="mx-auto min-h-screen max-w-md px-4 pt-28">
        <section className="space-y-4 rounded-xl bg-surface-container p-6">
          <h1 className="text-2xl font-bold">Kiểm tra email</h1>
          <div className="rounded-lg border border-green-500/30 bg-green-500/10 p-4 text-sm text-green-300">
            Nếu email tồn tại, chúng tôi đã gửi hướng dẫn đặt lại mật khẩu tới email của bạn.
          </div>
          <p className="text-sm text-on-surface-variant">
            Vui lòng kiểm tra Hộp thư đến hoặc Spam của{" "}
            <span className="font-semibold text-on-surface">{submittedEmail}</span>. Link đặt lại
            mật khẩu sẽ hết hạn sau một thời gian ngắn.
          </p>
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              disabled={isSubmitting}
              onClick={() => requestReset(submittedEmail)}
              className="rounded border border-primary px-4 py-2 text-primary disabled:opacity-50"
            >
              {isSubmitting ? "Đang gửi lại..." : "Gửi lại email"}
            </button>
            <Link className="rounded bg-primary px-4 py-2 text-white" to="/login">
              Quay lại đăng nhập
            </Link>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="mx-auto min-h-screen max-w-md px-4 pt-28">
      <form onSubmit={submit} className="space-y-4 rounded-xl bg-surface-container p-6">
        <h1 className="text-2xl font-bold">Quên mật khẩu</h1>
        <p className="text-sm text-on-surface-variant">
          Nhập email tài khoản, MovieTap sẽ gửi link đặt lại mật khẩu nếu tài khoản tồn tại.
        </p>
        <FormAlert message={result?.error} />
        <label className="block">
          Email
          <input
            required
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mt-1 w-full rounded border bg-transparent p-2"
          />
        </label>
        <button disabled={isSubmitting} className="rounded bg-primary px-4 py-2 text-white">
          {isSubmitting ? "Đang gửi..." : "Tạo yêu cầu"}
        </button>
        <Link className="block text-sm text-primary" to="/login">
          Quay lại đăng nhập
        </Link>
      </form>
    </main>
  );
}
