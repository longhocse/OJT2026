import React, { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import FormAlert from "../components/common/FormAlert";
import { authService } from "../services/authService";

export default function ResetPasswordPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const [form, setForm] = useState({ token: params.get("token") || "", newPassword: "" });
  const [error, setError] = useState("");
  const submit = async (event) => {
    event.preventDefault();
    try {
      await authService.resetPassword(form);
      navigate("/login", { replace: true, state: { message: "Đặt lại mật khẩu thành công." } });
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Không thể đặt lại mật khẩu.");
    }
  };
  return (
    <main className="mx-auto min-h-screen max-w-md px-4 pt-28">
      <form onSubmit={submit} className="space-y-4 rounded-xl bg-surface-container p-6">
        <h1 className="text-2xl font-bold">Đặt lại mật khẩu</h1>
        <FormAlert message={error} />
        <label className="block">
          Reset token
          <textarea
            required
            value={form.token}
            onChange={(e) => setForm({ ...form, token: e.target.value })}
            className="mt-1 w-full rounded border bg-transparent p-2"
          />
        </label>
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
        <button className="rounded bg-primary px-4 py-2 text-white">Đặt lại mật khẩu</button>
      </form>
    </main>
  );
}
