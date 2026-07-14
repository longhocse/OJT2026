const { createHash, randomBytes, randomUUID } = require("node:crypto");
const jwt = require("jsonwebtoken");
const { AppDataSource } = require("../config/database");
const { env } = require("../config/env");
const { AppError } = require("../utils/AppError");

const REFRESH_COOKIE = "movietap_refresh";
const hashToken = (token) => createHash("sha256").update(token).digest("hex");
const createOpaqueToken = () => randomBytes(48).toString("base64url");
const durationMs = (value) => {
  const match = /^(\d+)([smhd])$/.exec(value || "7d");
  if (!match) return 7 * 24 * 60 * 60 * 1000;
  const units = { s: 1000, m: 60000, h: 3600000, d: 86400000 };
  return Number(match[1]) * units[match[2]];
};

const publicUser = (user) => ({
  id: user.id,
  email: user.email,
  name: user.name,
  phone: user.phone ?? null,
  role: user.role,
  theater_id: user.theater_id ?? null,
  is_active: user.is_active !== false,
  email_verified_at: user.email_verified_at ?? null,
  created_at: user.created_at,
});

const signAccessToken = (user) =>
  jwt.sign({ id: user.id, email: user.email, role: user.role, theater_id: user.theater_id }, env.JWT_SECRET, {
    expiresIn: env.JWT_EXPIRES_IN,
  });

const cookieOptions = () => ({
  httpOnly: true,
  secure: env.NODE_ENV === "production",
  sameSite: "strict",
  path: "/api/auth",
  maxAge: durationMs(env.JWT_REFRESH_EXPIRES_IN),
});

const setRefreshCookie = (res, token) => res.cookie(REFRESH_COOKIE, token, cookieOptions());
const clearRefreshCookie = (res) =>
  res.clearCookie(REFRESH_COOKIE, { ...cookieOptions(), maxAge: undefined });

const readRefreshCookie = (req) => {
  const cookies = String(req.headers.cookie || "")
    .split(";")
    .map((part) => part.trim().split("="));
  const value = cookies
    .find(([name]) => name === REFRESH_COOKIE)
    ?.slice(1)
    .join("=");
  return value ? decodeURIComponent(value) : null;
};

const issueRefreshToken = async (repository, user, familyId = randomUUID()) => {
  const rawToken = createOpaqueToken();
  const entity = repository.create({
    user,
    token_hash: hashToken(rawToken),
    family_id: familyId,
    expires_at: new Date(Date.now() + durationMs(env.JWT_REFRESH_EXPIRES_IN)),
  });
  await repository.save(entity);
  return { rawToken, entity };
};

const issueSession = async (user, res) => {
  const { rawToken } = await issueRefreshToken(AppDataSource.getRepository("RefreshToken"), user);
  setRefreshCookie(res, rawToken);
  return { token: signAccessToken(user), user: publicUser(user) };
};

const revokeUserSessions = (manager, userId, now = new Date()) =>
  manager
    .getRepository("RefreshToken")
    .createQueryBuilder()
    .update()
    .set({ revoked_at: now })
    .where("user_id = :userId AND revoked_at IS NULL", { userId })
    .execute();

const rotateRefreshToken = async (rawToken) => {
  if (!rawToken) throw new AppError(401, "REFRESH_TOKEN_REQUIRED", "Refresh token required");
  const runner = AppDataSource.createQueryRunner();
  await runner.connect();
  await runner.startTransaction("SERIALIZABLE");
  try {
    const repository = runner.manager.getRepository("RefreshToken");
    const current = await repository.findOne({
      where: { token_hash: hashToken(rawToken) },
      relations: { user: true },
      lock: { mode: "pessimistic_write" },
    });
    if (!current) throw new AppError(401, "REFRESH_TOKEN_INVALID", "Invalid refresh token");
    if (current.revoked_at) {
      await repository
        .createQueryBuilder()
        .update()
        .set({ revoked_at: new Date() })
        .where("family_id = :familyId AND revoked_at IS NULL", { familyId: current.family_id })
        .execute();
      await runner.commitTransaction();
      throw new AppError(401, "REFRESH_TOKEN_REUSED", "Refresh token reuse detected");
    }
    if (new Date(current.expires_at) <= new Date()) {
      current.revoked_at = new Date();
      await repository.save(current);
      throw new AppError(401, "REFRESH_TOKEN_EXPIRED", "Refresh token expired");
    }
    if (current.user.is_active === false) {
      current.revoked_at = new Date();
      await repository.save(current);
      throw new AppError(403, "ACCOUNT_LOCKED", "Account is locked");
    }
    if (!current.user.email_verified_at) {
      current.revoked_at = new Date();
      await repository.save(current);
      throw new AppError(403, "EMAIL_NOT_VERIFIED", "Email verification is required");
    }

    const next = await issueRefreshToken(repository, current.user, current.family_id);
    current.revoked_at = new Date();
    current.replaced_by_hash = next.entity.token_hash;
    await repository.save(current);
    await runner.commitTransaction();
    return {
      rawToken: next.rawToken,
      token: signAccessToken(current.user),
      user: publicUser(current.user),
    };
  } catch (error) {
    if (runner.isTransactionActive) await runner.rollbackTransaction();
    throw error;
  } finally {
    await runner.release();
  }
};

module.exports = {
  clearRefreshCookie,
  createOpaqueToken,
  hashToken,
  issueSession,
  publicUser,
  readRefreshCookie,
  revokeUserSessions,
  rotateRefreshToken,
  setRefreshCookie,
};
