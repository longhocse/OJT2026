const nodemailer = require("nodemailer");
const { env } = require("../config/env");
const logger = require("../utils/logger");

const isPlaceholder = (value = "") =>
  value.includes("your_gmail_address") || value.includes("your_gmail_app_password");
const isSmtpConfigured = () =>
  Boolean(env.SMTP_HOST && env.SMTP_PORT && env.SMTP_USER && env.SMTP_PASS) &&
  !isPlaceholder(env.SMTP_USER) &&
  !isPlaceholder(env.SMTP_PASS);

let transporter;

const getTransporter = () => {
  if (!isSmtpConfigured()) return null;
  transporter ||= nodemailer.createTransport({
    host: env.SMTP_HOST,
    port: env.SMTP_PORT,
    secure: env.SMTP_SECURE,
    auth: {
      user: env.SMTP_USER,
      pass: env.SMTP_PASS,
    },
  });
  return transporter;
};

const sendMail = async ({ to, subject, text, html }) => {
  const smtp = getTransporter();
  if (!smtp) {
    logger.info("smtp_not_configured", { to, subject });
    return { sent: false, skipped: true };
  }
  await smtp.sendMail({
    from: env.MAIL_FROM || env.SMTP_USER,
    to,
    subject,
    text,
    html,
  });
  return { sent: true };
};

module.exports = { isSmtpConfigured, sendMail };
