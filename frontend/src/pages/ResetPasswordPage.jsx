import React, { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Lock, Key, AlertCircle, CheckCircle } from "lucide-react";
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
    <main className="min-h-screen w-full bg-[#F5F0EB] flex items-center justify-center px-4 py-20">
      <div className="w-full max-w-md">

        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-white rounded-full shadow-sm border border-[#E6DFD9] mb-4">
            <Lock className="w-10 h-10 text-[#B8744C]" />
          </div>
          <h1 className="text-3xl font-extrabold text-[#3E3A39] tracking-tight">Đặt lại mật khẩu</h1>
          <p className="mt-2 text-[#6B625A]">
            Nhập mật khẩu mới của bạn để tiếp tục.
          </p>
        </div>

        <form onSubmit={submit} className="space-y-6 rounded-3xl bg-white p-8 shadow-xl border border-[#E6DFD9]">
          <FormAlert message={error} />

          {!form.token && (
            <div className="flex items-start gap-3 rounded-xl border border-amber-500/20 bg-amber-500/5 p-4 text-sm text-amber-600">
              <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
              <p>
                Link đặt lại mật khẩu thiếu token. Vui lòng mở link trong email hoặc tạo yêu cầu mới.
              </p>
            </div>
          )}

          <div className="space-y-5">
            <label className="flex flex-col gap-1.5 text-sm font-semibold text-[#3E3A39]">
              <span className="flex items-center gap-2">
                <Key className="w-4 h-4 text-[#B8744C]" /> Mật khẩu mới
              </span>
              <div className="relative">
                <input
                  required
                  minLength="8"
                  type="password"
                  value={form.newPassword}
                  onChange={(e) => setForm({ ...form, newPassword: e.target.value })}
                  className="w-full rounded-xl border border-[#E6DFD9] bg-[#F9F7F5] p-3 pl-4 focus:border-[#B8744C] focus:bg-white focus:ring-2 focus:ring-[#B8744C]/20 outline-none transition placeholder:text-[#C4B5AC]"
                  placeholder="Nhập mật khẩu mới..."
                />
              </div>
            </label>

            <label className="flex flex-col gap-1.5 text-sm font-semibold text-[#3E3A39]">
              <span className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-[#B8744C]" /> Xác nhận mật khẩu mới
              </span>
              <div className="relative">
                <input
                  required
                  minLength="8"
                  type="password"
                  value={form.confirmPassword}
                  onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })}
                  className="w-full rounded-xl border border-[#E6DFD9] bg-[#F9F7F5] p-3 pl-4 focus:border-[#B8744C] focus:bg-white focus:ring-2 focus:ring-[#B8744C]/20 outline-none transition placeholder:text-[#C4B5AC]"
                  placeholder="Nhập lại mật khẩu mới..."
                />
              </div>
            </label>
          </div>

          <button
            disabled={isSubmitting || !form.token}
            className="w-full flex items-center justify-center gap-2 rounded-xl bg-[#B8744C] hover:bg-[#A0653F] px-4 py-3.5 font-bold text-white shadow-md shadow-[#B8744C]/30 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? (
              <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
            ) : (
              <CheckCircle className="w-5 h-5" />
            )}
            {isSubmitting ? "Đang đặt lại..." : "Đặt lại mật khẩu"}
          </button>
        </form>

        <div className="text-center mt-6">
          <p className="text-sm text-[#6B625A]">
            Đã nhớ mật khẩu?{" "}
            <button
              type="button"
              onClick={() => navigate("/login")}
              className="text-[#B8744C] font-bold hover:text-[#A0653F] hover:underline transition"
            >
              Đăng nhập ngay
            </button>
          </p>
        </div>
      </div>
    </main>
  );
}