import React, { useState } from "react";
import { Link } from "react-router-dom";
import FormAlert from "../components/common/FormAlert";
import { authService } from "../services/authService";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [result, setResult] = useState(null);
  const submit = async (event) => {
    event.preventDefault();
    try {
      setResult(await authService.forgotPassword(email));
    } catch (error) {
      setResult({
        error: error.response?.data?.message || "Không thể tạo yêu cầu đặt lại mật khẩu.",
      });
    }
  };
  return (
    <main className="mx-auto min-h-screen max-w-md px-4 pt-28">
      <form onSubmit={submit} className="space-y-4 rounded-xl bg-surface-container p-6">
        <h1 className="text-2xl font-bold">Quên mật khẩu</h1>
        <FormAlert message={result?.error || result?.message} />
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
        <button className="rounded bg-primary px-4 py-2 text-white">Tạo yêu cầu</button>
        {result?.resetToken && (
          <p className="break-all text-xs text-amber-400">Local reset token: {result.resetToken}</p>
        )}
        <Link className="block text-sm text-primary" to="/reset-password">
          Đã có reset token?
        </Link>
      </form>
    </main>
  );
}
