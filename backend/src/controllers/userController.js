const { AppDataSource } = require("../config/database");
const { Like } = require("typeorm");
const { AppError } = require("../utils/AppError");
const { revokeUserSessions } = require("../services/authTokenService");
const { recordAuditLog } = require("../services/auditLogService");
const { ADMIN_ROLE, CUSTOMER_ROLE, toPublicAssignment } = require("../services/accessControlService");

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
  is_active: user.is_active !== false,
  created_at: user.created_at,
  theaterAssignments: Array.isArray(user.theaterAssignments)
    ? user.theaterAssignments.map(toPublicAssignment)
    : [],
});

exports.getAllUsers = async (req, res) => {
  const page = parsePositiveInteger(req.query.page, DEFAULT_PAGE);
  const limit = parsePositiveInteger(req.query.limit, DEFAULT_LIMIT);

  const search = typeof req.query.search === "string" ? req.query.search.trim() : "";
  const where = search
    ? [{ name: Like(`%${search}%`) }, { email: Like(`%${search}%`) }]
    : undefined;

  const [users, total] = await AppDataSource.getRepository("User").findAndCount({
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      role: true,
      is_active: true,
      created_at: true,
    },
    where,
    relations: { theaterAssignments: { theater: true } },
    order: { created_at: "DESC" },
    skip: (page - 1) * limit,
    take: limit,
  });

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
      relations: { theaterAssignments: { theater: true } },
      lock: { mode: "pessimistic_write" },
    });
    if (!user) throw new AppError(404, "USER_NOT_FOUND", "User not found");
    const update = res.locals.validated.body;
    const removesActiveAdmin =
      user.role === ADMIN_ROLE &&
      user.is_active !== false &&
      (update.role === CUSTOMER_ROLE || update.is_active === false);
    if (removesActiveAdmin) {
      const activeAdmins = await repository.count({ where: { role: ADMIN_ROLE, is_active: true } });
      if (activeAdmins <= 1) {
        throw new AppError(
          409,
          "LAST_ADMIN_REQUIRED",
          "The final active admin cannot be demoted or locked",
        );
      }
    }
    const accessChanged =
      (update.role && update.role !== user.role) ||
      (typeof update.is_active === "boolean" && update.is_active !== user.is_active) ||
      Array.isArray(update.theaterIds);
    const { theaterIds, ...accessUpdate } = update;
    Object.assign(user, accessUpdate);
    await repository.save(user);
    if (Array.isArray(theaterIds)) {
      const assignmentRepo = runner.manager.getRepository("UserTheater");
      const theaters = theaterIds.length
        ? await runner.manager
            .getRepository("Theater")
            .createQueryBuilder("theater")
            .where("theater.id IN (:...theaterIds)", { theaterIds })
            .getMany()
        : [];
      if (theaters.length !== theaterIds.length) {
        throw new AppError(400, "THEATER_ASSIGNMENT_INVALID", "One or more theaters are invalid");
      }
      const existing = await assignmentRepo.find({
        where: { user: { id: user.id } },
        relations: { user: true, theater: true },
      });
      if (existing.length > 0) await assignmentRepo.remove(existing);
      const roleAtTheater = user.role === ADMIN_ROLE ? "admin" : user.role;
      if (theaters.length > 0 && user.role !== CUSTOMER_ROLE) {
        await assignmentRepo.save(
          theaters.map((theater) =>
            assignmentRepo.create({
              user,
              theater,
              role_at_theater: roleAtTheater,
              is_active: true,
            }),
          ),
        );
      }
    }
    if (accessChanged) await revokeUserSessions(runner.manager, user.id);
    await runner.commitTransaction();
    const updatedUser = await AppDataSource.getRepository("User").findOne({
      where: { id: user.id },
      relations: { theaterAssignments: { theater: true } },
    });
    await recordAuditLog(req, {
      action: "user.update_access",
      resourceType: "User",
      resourceId: user.id,
      metadata: {
        role: user.role,
        is_active: user.is_active !== false,
        sessionsRevoked: accessChanged,
        theaterIds: Array.isArray(theaterIds) ? theaterIds : undefined,
      },
    });
    res.json(toPublicUser(updatedUser || user));
  } catch (error) {
    if (runner.isTransactionActive) await runner.rollbackTransaction();
    throw error;
  } finally {
    await runner.release();
  }
};
