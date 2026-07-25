const { AppDataSource } = require("../config/database");
const { env } = require("../config/env");
const { createOpaqueToken, hashToken } = require("./authTokenService");
const { isSmtpConfigured, sendMail } = require("./mailService");

const buildPasswordResetUrl = (rawToken) => {
  const url = new URL("/reset-password", env.FRONTEND_URL);
  url.searchParams.set("token", rawToken);
  return url.href;
};

const createPasswordReset = async (user, manager) => {
  const rawToken = createOpaqueToken();
  const repository = manager
    ? manager.getRepository("PasswordResetToken")
    : AppDataSource.getRepository("PasswordResetToken");
  await repository
    .createQueryBuilder()
    .update()
    .set({ used_at: new Date() })
    .where("user_id = :userId", { userId: user.id })
    .andWhere("used_at IS NULL")
    .execute();
  await repository.save(
    repository.create({
      user,
      token_hash: hashToken(rawToken),
      expires_at: new Date(Date.now() + env.PASSWORD_RESET_TTL_MINUTES * 60000),
    }),
  );
  return { rawToken, resetUrl: buildPasswordResetUrl(rawToken) };
};

const sendPasswordResetEmail = async (user, resetUrl) =>
  sendMail({
    to: user.email,
    subject: "Đặt lại mật khẩu MovieTap",
    text: `Chào ${user.name || user.email},\n\nBấm vào link sau để đặt lại mật khẩu MovieTap:\n${resetUrl}\n\nLink sẽ hết hạn sau ${env.PASSWORD_RESET_TTL_MINUTES} phút. Nếu bạn không yêu cầu đặt lại mật khẩu, hãy bỏ qua email này.`,
    html: `
      <div style="font-family:Arial,sans-serif;line-height:1.6">
        <h2>Đặt lại mật khẩu MovieTap</h2>
        <p>Chào ${user.name || user.email},</p>
        <p>Bấm nút bên dưới để đặt lại mật khẩu MovieTap.</p>
        <p><a href="${resetUrl}" style="display:inline-block;background:#d4af37;color:#111;padding:12px 18px;border-radius:8px;text-decoration:none;font-weight:700">Đặt lại mật khẩu</a></p>
        <p>Nếu nút không hoạt động, copy link này vào trình duyệt:</p>
        <p style="word-break:break-all">${resetUrl}</p>
        <p>Link sẽ hết hạn sau ${env.PASSWORD_RESET_TTL_MINUTES} phút.</p>
        <p>Nếu bạn không yêu cầu đặt lại mật khẩu, hãy bỏ qua email này.</p>
      </div>
    `,
  });

module.exports = {
  buildPasswordResetUrl,
  createPasswordReset,
  isSmtpConfigured,
  sendPasswordResetEmail,
};
