import React, { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import FormAlert from "../components/common/FormAlert";
import { authService } from "../services/authService";

export default function ResetPasswordPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    token: params.get("token") || "",
    newPassword: "",
    confirmPassword: "",
  });
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const submit = async (event) => {
    event.preventDefault();
    setError("");
    if (!form.token) {
      setError("Link đặt lại mật khẩu không hợp lệ hoặc thiếu token.");
      return;
    }
    if (form.newPassword !== form.confirmPassword) {
      setError("Mật khẩu xác nhận không khớp.");
      return;
    }
    setIsSubmitting(true);
    try {
      await authService.resetPassword({ token: form.token, newPassword: form.newPassword });
      navigate("/login", { replace: true, state: { message: "Đặt lại mật khẩu thành công." } });
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Không thể đặt lại mật khẩu.");
    } finally {
      setIsSubmitting(false);
    }
  };
  return (
    <main className="mx-auto min-h-screen max-w-md px-4 pt-28">
      <form onSubmit={submit} className="space-y-4 rounded-xl bg-surface-container p-6">
        <h1 className="text-2xl font-bold">Đặt lại mật khẩu</h1>
        <FormAlert message={error} />
        {!form.token && (
          <p className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-300">
            Link đặt lại mật khẩu thiếu token. Vui lòng mở link trong email hoặc tạo yêu cầu mới.
          </p>
        )}
        <label className="block">
          Mật khẩu mới
          <input
            required
            minLength="8"
            type="password"
            value={form.newPassword}
            onChange={(e) => setForm({ ...form, newPassword: e.target.value })}
            className="mt-1 w-full rounded border bg-transparent p-2"
          />
        </label>
        <label className="block">
          Xác nhận mật khẩu mới
          <input
            required
            minLength="8"
            type="password"
            value={form.confirmPassword}
            onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })}
            className="mt-1 w-full rounded border bg-transparent p-2"
          />
        </label>
        <button
          disabled={isSubmitting || !form.token}
          className="rounded bg-primary px-4 py-2 text-white disabled:opacity-50"
        >
          {isSubmitting ? "Đang đặt lại..." : "Đặt lại mật khẩu"}
        </button>
      </form>
    </main>
  );
}
