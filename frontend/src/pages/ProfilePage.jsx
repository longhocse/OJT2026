import React, { useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { User, Phone, Mail, Lock, Save, Key } from "lucide-react";
import FormAlert from "../components/common/FormAlert";
import { sessionVerified } from "../redux/slices/authSlice";
import { authService } from "../services/authService";
import { clearClientSession } from "../services/authSession";

export default function ProfilePage() {
  const user = useSelector((state) => state.auth.user);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [profile, setProfile] = useState({ name: user?.name || "", phone: user?.phone || "" });
  const [password, setPassword] = useState({ currentPassword: "", newPassword: "" });
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);

  const saveProfile = async (event) => {
    event.preventDefault();
    setBusy(true);
    setNotice("");
    try {
      const updated = await authService.updateProfile({
        name: profile.name,
        phone: profile.phone || null,
      });
      dispatch(sessionVerified(updated));
      setNotice("Đã cập nhật hồ sơ.");
    } catch (error) {
      setNotice(error.response?.data?.message || "Không thể cập nhật hồ sơ.");
    } finally {
      setBusy(false);
    }
  };

  const changePassword = async (event) => {
    event.preventDefault();
    setBusy(true);
    setNotice("");
    try {
      await authService.changePassword(password);
      await clearClientSession();
      navigate("/login", {
        replace: true,
        state: { message: "Mật khẩu đã đổi. Vui lòng đăng nhập lại." },
      });
    } catch (error) {
      setNotice(error.response?.data?.message || "Không thể đổi mật khẩu.");
      setBusy(false);
    }
  };

  return (
    // Đã sửa: w-full bg-[#F5F0EB] để nền tràn toàn màn hình, dùng flex justify-center để căn nội dung ở giữa
    <main className="min-h-screen w-full bg-[#F5F0EB] flex justify-center px-4 py-12 md:py-24">
      {/* max-w-4xl để khung nội dung không bị dãn quá to ra */}
      <div className="w-full max-w-4xl">
        <div className="mb-8">
          <h1 className="text-3xl md:text-4xl font-extrabold text-[#3E3A39]">Hồ sơ tài khoản</h1>
          <p className="text-[#6B625A] mt-1 text-sm">Quản lý thông tin cá nhân và bảo mật tài khoản của bạn.</p>
        </div>

        <FormAlert message={notice} />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">

          {/* Cột Trái: Thông tin cá nhân */}
          <form onSubmit={saveProfile} className="space-y-5 rounded-2xl bg-white p-6 md:p-8 shadow-sm border border-[#E6DFD9]">
            <div className="flex items-center gap-3 pb-4 border-b border-[#E6DFD9]">
              <div className="p-2 bg-[#B8744C]/10 rounded-xl text-[#B8744C]">
                <User className="w-5 h-5" />
              </div>
              <h2 className="text-xl font-bold text-[#3E3A39]">Thông tin cá nhân</h2>
            </div>

            <div className="space-y-4">
              <label className="block text-sm font-semibold text-[#3E3A39]">
                <span className="flex items-center gap-2 mb-1">
                  <User className="w-4 h-4 text-[#B8744C]" /> Họ tên
                </span>
                <input
                  required
                  maxLength="100"
                  value={profile.name}
                  onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                  className="mt-1 w-full rounded-xl border border-[#E6DFD9] bg-[#F9F7F5] p-2.5 px-4 focus:border-[#B8744C] focus:bg-white focus:ring-2 focus:ring-[#B8744C]/20 outline-none transition"
                />
              </label>

              <label className="block text-sm font-semibold text-[#3E3A39]">
                <span className="flex items-center gap-2 mb-1">
                  <Phone className="w-4 h-4 text-[#B8744C]" /> Điện thoại
                </span>
                <input
                  maxLength="20"
                  value={profile.phone}
                  onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                  className="mt-1 w-full rounded-xl border border-[#E6DFD9] bg-[#F9F7F5] p-2.5 px-4 focus:border-[#B8744C] focus:bg-white focus:ring-2 focus:ring-[#B8744C]/20 outline-none transition"
                />
              </label>

              <div className="bg-[#F9F7F5] rounded-xl p-3 border border-[#E6DFD9]">
                <span className="flex items-center gap-2 text-sm text-[#6B625A]">
                  <Mail className="w-4 h-4 text-[#B8744C]" /> Email: <span className="font-medium text-[#3E3A39]">{user?.email}</span>
                </span>
              </div>
            </div>

            <button
              disabled={busy}
              className="w-full flex items-center justify-center gap-2 rounded-xl bg-[#B8744C] hover:bg-[#A0653F] px-4 py-3 font-semibold text-white shadow-md shadow-[#B8744C]/30 transition disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              {busy ? "Đang lưu..." : "Lưu hồ sơ"}
            </button>
          </form>

          {/* Cột Phải: Đổi mật khẩu */}
          <form onSubmit={changePassword} className="space-y-5 rounded-2xl bg-white p-6 md:p-8 shadow-sm border border-[#E6DFD9]">
            <div className="flex items-center gap-3 pb-4 border-b border-[#E6DFD9]">
              <div className="p-2 bg-[#B8744C]/10 rounded-xl text-[#B8744C]">
                <Lock className="w-5 h-5" />
              </div>
              <h2 className="text-xl font-bold text-[#3E3A39]">Đổi mật khẩu</h2>
            </div>

            <div className="space-y-4">
              <label className="block text-sm font-semibold text-[#3E3A39]">
                <span className="flex items-center gap-2 mb-1">
                  <Key className="w-4 h-4 text-[#B8744C]" /> Mật khẩu hiện tại
                </span>
                <input
                  required
                  type="password"
                  value={password.currentPassword}
                  onChange={(e) => setPassword({ ...password, currentPassword: e.target.value })}
                  className="mt-1 w-full rounded-xl border border-[#E6DFD9] bg-[#F9F7F5] p-2.5 px-4 focus:border-[#B8744C] focus:bg-white focus:ring-2 focus:ring-[#B8744C]/20 outline-none transition"
                />
              </label>

              <label className="block text-sm font-semibold text-[#3E3A39]">
                <span className="flex items-center gap-2 mb-1">
                  <Lock className="w-4 h-4 text-[#B8744C]" /> Mật khẩu mới
                </span>
                <input
                  required
                  minLength="8"
                  type="password"
                  value={password.newPassword}
                  onChange={(e) => setPassword({ ...password, newPassword: e.target.value })}
                  className="mt-1 w-full rounded-xl border border-[#E6DFD9] bg-[#F9F7F5] p-2.5 px-4 focus:border-[#B8744C] focus:bg-white focus:ring-2 focus:ring-[#B8744C]/20 outline-none transition"
                />
              </label>
            </div>

            <button
              disabled={busy}
              className="w-full flex items-center justify-center gap-2 rounded-xl bg-[#B8744C] hover:bg-[#A0653F] px-4 py-3 font-semibold text-white shadow-md shadow-[#B8744C]/30 transition disabled:opacity-50"
            >
              <Key className="w-4 h-4" />
              {busy ? "Đang xử lý..." : "Đổi mật khẩu"}
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}