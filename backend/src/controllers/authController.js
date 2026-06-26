const bcrypt = require("bcryptjs");
const { AppDataSource } = require("../config/database");
const { env } = require("../config/env");
const { AppError } = require("../utils/AppError");
const {
  clearRefreshCookie,
  createOpaqueToken,
  hashToken,
  issueSession,
  publicUser,
  readRefreshCookie,
  revokeUserSessions,
  rotateRefreshToken,
  setRefreshCookie,
} = require("../services/authTokenService");

const getUserRepository = () => AppDataSource.getRepository("User");

exports.register = async (req, res) => {
  const { email, password, name, phone } = res.locals.validated.body;
  const repository = getUserRepository();
  if (await repository.findOne({ where: { email } })) {
    throw new AppError(409, "EMAIL_ALREADY_EXISTS", "Email is already registered");
  }
  const user = repository.create({
    email,
    password_hash: await bcrypt.hash(password, 12),
    name,
    phone: phone || null,
    role: "customer",
    is_active: true,
  });
  await repository.save(user);
  res
    .status(201)
    .json({ message: "User registered successfully", ...(await issueSession(user, res)) });
};

exports.login = async (req, res) => {
  const { email, password } = res.locals.validated.body;
  const user = await getUserRepository().findOne({ where: { email } });
  if (!user || !(await bcrypt.compare(password, user.password_hash))) {
    throw new AppError(401, "INVALID_CREDENTIALS", "Invalid credentials");
  }
  if (user.is_active === false) throw new AppError(403, "ACCOUNT_LOCKED", "Account is locked");
  res.json({ message: "Login successful", ...(await issueSession(user, res)) });
};

exports.refresh = async (req, res) => {
  const session = await rotateRefreshToken(readRefreshCookie(req));
  setRefreshCookie(res, session.rawToken);
  res.json({ token: session.token, user: session.user });
};

exports.logout = async (req, res) => {
  const rawToken = readRefreshCookie(req);
  if (rawToken) {
    const repository = AppDataSource.getRepository("RefreshToken");
    const token = await repository.findOne({ where: { token_hash: hashToken(rawToken) } });
    if (token && !token.revoked_at) {
      token.revoked_at = new Date();
      await repository.save(token);
    }
  }
  clearRefreshCookie(res);
  res.json({ message: "Logged out" });
};

exports.getMe = async (req, res) => {
  const user = await getUserRepository().findOne({ where: { id: req.user.id } });
  if (!user) throw new AppError(404, "USER_NOT_FOUND", "User not found");
  res.json(publicUser(user));
};

exports.updateProfile = async (req, res) => {
  const repository = getUserRepository();
  const user = await repository.findOne({ where: { id: req.user.id } });
  if (!user) throw new AppError(404, "USER_NOT_FOUND", "User not found");
  Object.assign(user, res.locals.validated.body);
  await repository.save(user);
  res.json(publicUser(user));
};

exports.changePassword = async (req, res) => {
  const runner = AppDataSource.createQueryRunner();
  await runner.connect();
  await runner.startTransaction("SERIALIZABLE");
  try {
    const repository = runner.manager.getRepository("User");
    const user = await repository.findOne({
      where: { id: req.user.id },
      lock: { mode: "pessimistic_write" },
    });
    if (!user) throw new AppError(404, "USER_NOT_FOUND", "User not found");
    if (!(await bcrypt.compare(res.locals.validated.body.currentPassword, user.password_hash))) {
      throw new AppError(400, "CURRENT_PASSWORD_INVALID", "Current password is invalid");
    }
    user.password_hash = await bcrypt.hash(res.locals.validated.body.newPassword, 12);
    await repository.save(user);
    await revokeUserSessions(runner.manager, user.id);
    await runner.commitTransaction();
    clearRefreshCookie(res);
    res.json({ message: "Password changed" });
  } catch (error) {
    if (runner.isTransactionActive) await runner.rollbackTransaction();
    throw error;
  } finally {
    await runner.release();
  }
};

exports.forgotPassword = async (req, res) => {
  const user = await getUserRepository().findOne({
    where: { email: res.locals.validated.body.email },
  });
  let developmentResetToken;
  if (user?.is_active !== false) {
    const rawToken = createOpaqueToken();
    const repository = AppDataSource.getRepository("PasswordResetToken");
    await repository.save(
      repository.create({
        user,
        token_hash: hashToken(rawToken),
        expires_at: new Date(Date.now() + env.PASSWORD_RESET_TTL_MINUTES * 60000),
      }),
    );
    if (env.NODE_ENV !== "production") developmentResetToken = rawToken;
  }
  res.json({
    message: "If the account exists, password reset instructions have been created",
    ...(developmentResetToken && { resetToken: developmentResetToken }),
  });
};

exports.resetPassword = async (req, res) => {
  const runner = AppDataSource.createQueryRunner();
  await runner.connect();
  await runner.startTransaction("SERIALIZABLE");
  try {
    const tokenRepository = runner.manager.getRepository("PasswordResetToken");
    const resetToken = await tokenRepository.findOne({
      where: { token_hash: hashToken(res.locals.validated.body.token) },
      relations: { user: true },
      lock: { mode: "pessimistic_write" },
    });
    if (!resetToken || resetToken.used_at) {
      throw new AppError(400, "RESET_TOKEN_INVALID", "Reset token is invalid");
    }
    if (new Date(resetToken.expires_at) <= new Date()) {
      throw new AppError(400, "RESET_TOKEN_EXPIRED", "Reset token has expired");
    }
    if (resetToken.user.is_active === false) {
      throw new AppError(403, "ACCOUNT_LOCKED", "Account is locked");
    }
    resetToken.user.password_hash = await bcrypt.hash(res.locals.validated.body.newPassword, 12);
    resetToken.used_at = new Date();
    await runner.manager.getRepository("User").save(resetToken.user);
    await tokenRepository.save(resetToken);
    await revokeUserSessions(runner.manager, resetToken.user.id);
    await runner.commitTransaction();
    clearRefreshCookie(res);
    res.json({ message: "Password reset successful" });
  } catch (error) {
    if (runner.isTransactionActive) await runner.rollbackTransaction();
    throw error;
  } finally {
    await runner.release();
  }
};
