import React, { useState } from "react";
import { Link } from "react-router-dom";
import { Mail, ArrowLeft, CheckCircle, Send } from "lucide-react";
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

  // --- TRẠNG THÁI THÀNH CÔNG ---
  if (result?.type === "success") {
    return (
      <main className="min-h-screen w-full bg-[#F5F0EB] flex items-center justify-center px-4 py-20">
        <div className="w-full max-w-md">

          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-white rounded-full shadow-sm border border-[#E6DFD9] mb-4">
              <CheckCircle className="w-10 h-10 text-[#16A34A]" />
            </div>
            <h1 className="text-3xl font-extrabold text-[#3E3A39] tracking-tight">Kiểm tra email</h1>
            <p className="mt-2 text-[#6B625A]">
              Chúng tôi đã gửi hướng dẫn đến email của bạn.
            </p>
          </div>

          <section className="space-y-5 rounded-3xl bg-white p-8 shadow-xl border border-[#E6DFD9]">
            <div className="rounded-xl border border-green-500/20 bg-green-500/5 p-4 text-sm text-[#16A34A] flex items-start gap-3">
              <CheckCircle className="w-5 h-5 shrink-0 mt-0.5" />
              <div>
                <p className="font-medium">Email đã được gửi.</p>
                <p className="text-[#6B625A] mt-1">
                  Vui lòng kiểm tra Hộp thư đến hoặc Spam của{" "}
                  <span className="font-bold text-[#3E3A39]">{submittedEmail}</span>.
                </p>
              </div>
            </div>

            <p className="text-sm text-[#6B625A] leading-relaxed border-t border-[#E6DFD9] pt-4">
              Link đặt lại mật khẩu sẽ hết hạn sau một thời gian ngắn. Vui lòng sử dụng nó sớm nhất có thể.
            </p>

            <div className="flex flex-wrap gap-3 pt-2">
              <button
                type="button"
                disabled={isSubmitting}
                onClick={() => requestReset(submittedEmail)}
                className="flex-1 flex items-center justify-center gap-2 rounded-xl border border-[#B8744C] px-4 py-3 text-[#B8744C] font-semibold hover:bg-[#B8744C]/5 disabled:opacity-50 transition"
              >
                {isSubmitting ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-[#B8744C] border-t-transparent"></div>
                ) : (
                  <Send className="w-4 h-4" />
                )}
                {isSubmitting ? "Đang gửi lại..." : "Gửi lại email"}
              </button>
              <Link
                to="/login"
                className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-[#B8744C] hover:bg-[#A0653F] px-4 py-3 font-bold text-white shadow-md shadow-[#B8744C]/30 transition"
              >
                <ArrowLeft className="w-4 h-4" /> Quay lại đăng nhập
              </Link>
            </div>
          </section>
        </div>
      </main>
    );
  }

  // --- TRẠNG THÁI FORM NHẬP ---
  return (
    <main className="min-h-screen w-full bg-[#F5F0EB] flex items-center justify-center px-4 py-20">
      <div className="w-full max-w-md">

        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-white rounded-full shadow-sm border border-[#E6DFD9] mb-4">
            <Mail className="w-10 h-10 text-[#B8744C]" />
          </div>
          <h1 className="text-3xl font-extrabold text-[#3E3A39] tracking-tight">Quên mật khẩu?</h1>
          <p className="mt-2 text-[#6B625A]">
            Nhập email tài khoản, chúng tôi sẽ gửi link đặt lại mật khẩu.
          </p>
        </div>

        <form onSubmit={submit} className="space-y-6 rounded-3xl bg-white p-8 shadow-xl border border-[#E6DFD9]">
          <p className="text-sm text-[#6B625A] leading-relaxed border-b border-[#E6DFD9] pb-4">
            Nếu tài khoản tồn tại, bạn sẽ nhận được email hướng dẫn đặt lại mật khẩu trong vài phút.
          </p>

          <FormAlert message={result?.error} />

          <label className="flex flex-col gap-1.5 text-sm font-semibold text-[#3E3A39]">
            <span className="flex items-center gap-2">
              <Mail className="w-4 h-4 text-[#B8744C]" /> Email
            </span>
            <div className="relative">
              <input
                required
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-xl border border-[#E6DFD9] bg-[#F9F7F5] p-3 pl-4 focus:border-[#B8744C] focus:bg-white focus:ring-2 focus:ring-[#B8744C]/20 outline-none transition"
                placeholder="Nhập địa chỉ email..."
              />
            </div>
          </label>

          <div className="space-y-3 pt-2">
            <button
              disabled={isSubmitting}
              className="w-full flex items-center justify-center gap-2 rounded-xl bg-[#B8744C] hover:bg-[#A0653F] px-4 py-3.5 font-bold text-white shadow-md shadow-[#B8744C]/30 transition disabled:opacity-50"
            >
              {isSubmitting ? (
                <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
              ) : (
                <Send className="w-5 h-5" />
              )}
              {isSubmitting ? "Đang gửi..." : "Tạo yêu cầu"}
            </button>

            <Link
              to="/login"
              className="block w-full text-center rounded-xl border border-[#E6DFD9] bg-white px-4 py-3 text-[#6B625A] font-medium hover:bg-[#F9F7F5] hover:border-[#B8744C] transition"
            >
              Quay lại đăng nhập
            </Link>
          </div>
        </form>
      </div>
    </main>
  );
}