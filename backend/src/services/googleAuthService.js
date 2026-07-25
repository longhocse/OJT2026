const { OAuth2Client } = require("google-auth-library");
const bcrypt = require("bcryptjs");
const { randomBytes } = require("node:crypto");
const { env } = require("../config/env");
const { AppError } = require("../utils/AppError");

const verifyGoogleIdToken = async (
  credential,
  { clientId = env.GOOGLE_CLIENT_ID, client = clientId ? new OAuth2Client(clientId) : null } = {},
) => {
  if (!clientId || !client) {
    throw new AppError(503, "GOOGLE_AUTH_NOT_CONFIGURED", "Google login is not configured");
  }

  let ticket;
  try {
    ticket = await client.verifyIdToken({ idToken: credential, audience: clientId });
  } catch (_error) {
    throw new AppError(401, "GOOGLE_TOKEN_INVALID", "Google credential is invalid or expired");
  }

  const payload = ticket.getPayload();
  const email = String(payload?.email || "").trim().toLowerCase();
  if (!payload?.sub || !email || payload.email_verified !== true) {
    throw new AppError(401, "GOOGLE_EMAIL_NOT_VERIFIED", "Google email is not verified");
  }

  return {
    subject: String(payload.sub),
    email,
    name: String(payload.name || email.split("@")[0] || "MovieTap User").trim().slice(0, 100),
  };
};

const findOrCreateGoogleUser = async (profile, repository, relations = undefined) => {
  let user = await repository.findOne({ where: { email: profile.email }, relations });
  if (user?.is_active === false) {
    throw new AppError(403, "ACCOUNT_LOCKED", "Account is locked");
  }

  if (!user) {
    const unusablePassword = randomBytes(64).toString("base64url");
    user = repository.create({
      email: profile.email,
      password_hash: await bcrypt.hash(unusablePassword, 12),
      name: profile.name,
      phone: null,
      role: "customer",
      is_active: true,
      email_verified_at: new Date(),
    });
    await repository.save(user);
  } else if (!user.email_verified_at) {
    user.email_verified_at = new Date();
    await repository.save(user);
  }

  return user;
};

module.exports = { findOrCreateGoogleUser, verifyGoogleIdToken };
