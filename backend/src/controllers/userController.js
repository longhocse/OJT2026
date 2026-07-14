const { AppDataSource } = require("../config/database");
const { Like } = require("typeorm");
const { AppError } = require("../utils/AppError");
const { revokeUserSessions } = require("../services/authTokenService");
const { recordAuditLog } = require("../services/auditLogService");

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 20;

const parsePositiveInteger = (value, fallback) => {
  if (value === undefined) return fallback;
  if (typeof value !== "string" || !/^\d+$/.test(value)) return null;
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : null;
};

const toPublicUser = (user) => ({
  id: user.id,
  name: user.name,
  email: user.email,
  phone: user.phone,
  role: user.role,
  theater_id: user.theater_id,
  is_active: user.is_active !== false,
  created_at: user.created_at,
});

exports.getAllUsers = async (req, res) => {
  const page = parsePositiveInteger(req.query.page, DEFAULT_PAGE);
  const limit = parsePositiveInteger(req.query.limit, DEFAULT_LIMIT);

  const search = typeof req.query.search === "string" ? req.query.search.trim() : "";
  const where = search
    ? [{ name: Like(`%${search}%`) }, { email: Like(`%${search}%`) }]
    : undefined;

  const repository = AppDataSource.getRepository("User");

  let options = {
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      role: true,
      theater_id: true,
      is_active: true,
      created_at: true,
    },
    where,
    order: { created_at: "DESC" },
    skip: (page - 1) * limit,
    take: limit,
  };

  if (req.user.role === "manager") {
    options.where = search
      ? [
          { name: Like(`%${search}%`), theater_id: req.user.theater_id },
          { email: Like(`%${search}%`), theater_id: req.user.theater_id },
        ]
      : { theater_id: req.user.theater_id };
  }

  const [users, total] = await repository.findAndCount(options);

  res.json({
    success: true,
    data: users.map(toPublicUser),
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit),
    },
  });
};

exports.updateUserAccess = async (req, res) => {
  const runner = AppDataSource.createQueryRunner();
  await runner.connect();
  await runner.startTransaction("SERIALIZABLE");
  try {
    const repository = runner.manager.getRepository("User");
    const user = await repository.findOne({
      where: { id: req.params.id },
      lock: { mode: "pessimistic_write" },
    });

    if (!user) throw new AppError(404, "USER_NOT_FOUND", "User not found");

    if (req.user.role === "manager" && user.theater_id !== req.user.theater_id) {
      throw new AppError(403, "FORBIDDEN", "You can only manage users in your theater");
    }

    const update = res.locals.validated.body;
    if (update.role === "manager" && !update.theater_id) {
      throw new AppError(400, "THEATER_REQUIRED", "Manager must be assigned to a theater");
    }

    if (update.role !== "manager") {
      update.theater_id = null;
    }

    const removesActiveAdmin =
      user.role === "admin" &&
      user.is_active !== false &&
      (update.role === "customer" || update.role === "manager" || update.is_active === false);

    if (removesActiveAdmin) {
      const activeAdmins = await repository.count({ where: { role: "admin", is_active: true } });
      if (activeAdmins <= 1) {
        throw new AppError(409, "LAST_ADMIN_REQUIRED", "The final active admin cannot be demoted or locked");
      }
    }

    const accessChanged =
      (update.role && update.role !== user.role) ||
      (typeof update.is_active === "boolean" && update.is_active !== user.is_active);

    Object.assign(user, update);
    await repository.save(user);
    if (accessChanged) await revokeUserSessions(runner.manager, user.id);
    await runner.commitTransaction();

    await recordAuditLog(req, {
      action: "user.update_access",
      resourceType: "User",
      resourceId: user.id,
      metadata: {
        role: user.role,
        is_active: user.is_active !== false,
        sessionsRevoked: accessChanged,
      },
    });
    res.json(toPublicUser(user));
  } catch (error) {
    if (runner.isTransactionActive) await runner.rollbackTransaction();
    throw error;
  } finally {
    await runner.release();
  }
};

exports.assignCinema = async (req, res) => {
  const { cinemaId } = req.body;
  const userId = req.params.id;

  const repository = AppDataSource.getRepository("User");
  const user = await repository.findOneBy({ id: userId });

  if (!user) throw new AppError(404, "USER_NOT_FOUND", "User not found");

  if (req.user.role === "manager" && user.theater_id !== req.user.theater_id) {
    throw new AppError(403, "FORBIDDEN", "You can only manage users in your theater");
  }

  user.theater_id = cinemaId || null;
  await repository.save(user);

  await recordAuditLog(req, {
    action: "user.assign_cinema",
    resourceType: "User",
    resourceId: user.id,
    metadata: { cinemaId },
  });

  res.json(toPublicUser(user));
};