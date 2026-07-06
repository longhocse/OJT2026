const { AppDataSource } = require("../config/database");
const { env } = require("../config/env");
const { createOpaqueToken, hashToken } = require("./authTokenService");
const { isSmtpConfigured, sendMail } = require("./mailService");

const buildVerificationUrl = (rawToken) => {
  const url = new URL("/verify-email", env.FRONTEND_URL);
  url.searchParams.set("token", rawToken);
  return url.href;
};

const createEmailVerification = async (user, manager = AppDataSource.manager) => {
  const rawToken = createOpaqueToken();
  const repository = manager.getRepository("EmailVerificationToken");
  await repository.save(
    repository.create({
      user,
      token_hash: hashToken(rawToken),
      expires_at: new Date(Date.now() + env.EMAIL_VERIFICATION_TTL_MINUTES * 60000),
    }),
  );
  return { rawToken, verificationUrl: buildVerificationUrl(rawToken) };
};

const sendVerificationEmail = async (user, verificationUrl) =>
  sendMail({
    to: user.email,
    subject: "Xác thực tài khoản MovieTap",
    text: `Chào ${user.name},\n\nBấm vào link sau để xác thực tài khoản MovieTap:\n${verificationUrl}\n\nLink sẽ hết hạn sau ${env.EMAIL_VERIFICATION_TTL_MINUTES} phút.`,
    html: `
      <div style="font-family:Arial,sans-serif;line-height:1.6">
        <h2>Xác thực tài khoản MovieTap</h2>
        <p>Chào ${user.name},</p>
        <p>Bấm nút bên dưới để xác thực tài khoản và đăng nhập MovieTap.</p>
        <p><a href="${verificationUrl}" style="display:inline-block;background:#d4af37;color:#111;padding:12px 18px;border-radius:8px;text-decoration:none;font-weight:700">Xác thực email</a></p>
        <p>Nếu nút không hoạt động, copy link này vào trình duyệt:</p>
        <p style="word-break:break-all">${verificationUrl}</p>
        <p>Link sẽ hết hạn sau ${env.EMAIL_VERIFICATION_TTL_MINUTES} phút.</p>
      </div>
    `,
  });

module.exports = {
  buildVerificationUrl,
  createEmailVerification,
  isSmtpConfigured,
  sendVerificationEmail,
};
