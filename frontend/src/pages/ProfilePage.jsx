import React, { useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
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
    <main className="mx-auto min-h-screen max-w-3xl px-4 pb-16 pt-24">
      <h1 className="mb-6 text-3xl font-bold">Hồ sơ tài khoản</h1>
      <FormAlert message={notice} />
      <div className="grid gap-6 md:grid-cols-2">
        <form onSubmit={saveProfile} className="space-y-4 rounded-xl bg-surface-container p-6">
          <h2 className="text-xl font-semibold">Thông tin cá nhân</h2>
          <label className="block">
            Họ tên
            <input
              required
              maxLength="100"
              value={profile.name}
              onChange={(e) => setProfile({ ...profile, name: e.target.value })}
              className="mt-1 w-full rounded border bg-transparent p-2"
            />
          </label>
          <label className="block">
            Điện thoại
            <input
              maxLength="20"
              value={profile.phone}
              onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
              className="mt-1 w-full rounded border bg-transparent p-2"
            />
          </label>
          <p className="text-sm text-on-surface-variant">Email: {user?.email}</p>
          <button
            disabled={busy}
            className="rounded bg-primary px-4 py-2 text-white disabled:opacity-50"
          >
            Lưu hồ sơ
          </button>
        </form>
        <form onSubmit={changePassword} className="space-y-4 rounded-xl bg-surface-container p-6">
          <h2 className="text-xl font-semibold">Đổi mật khẩu</h2>
          <label className="block">
            Mật khẩu hiện tại
            <input
              required
              type="password"
              value={password.currentPassword}
              onChange={(e) => setPassword({ ...password, currentPassword: e.target.value })}
              className="mt-1 w-full rounded border bg-transparent p-2"
            />
          </label>
          <label className="block">
            Mật khẩu mới
            <input
              required
              minLength="8"
              type="password"
              value={password.newPassword}
              onChange={(e) => setPassword({ ...password, newPassword: e.target.value })}
              className="mt-1 w-full rounded border bg-transparent p-2"
            />
          </label>
          <button
            disabled={busy}
            className="rounded bg-amber-600 px-4 py-2 text-white disabled:opacity-50"
          >
            Đổi mật khẩu
          </button>
        </form>
      </div>
    </main>
  );
}
