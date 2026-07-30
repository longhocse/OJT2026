const { AppError } = require("../utils/AppError");
const { AppDataSource } = require("../config/database");

const ADMIN_ROLE = "admin";
const MANAGER_ROLE = "manager";
const CASHIER_ROLE = "cashier";
const TICKET_CHECKER_ROLE = "ticket_checker";
const CUSTOMER_ROLE = "customer";

const STAFF_ROLES = [MANAGER_ROLE, CASHIER_ROLE, TICKET_CHECKER_ROLE];
const OPERATION_ROLES = [ADMIN_ROLE, ...STAFF_ROLES];
const ALL_ROLES = [ADMIN_ROLE, MANAGER_ROLE, CASHIER_ROLE, TICKET_CHECKER_ROLE, CUSTOMER_ROLE];

const isAdmin = (user) => user?.role === ADMIN_ROLE;
const isOperational = (user) => OPERATION_ROLES.includes(user?.role);

const roleHomePath = (role) => {
  if (role === ADMIN_ROLE) return "/admin";
  if (role === MANAGER_ROLE) return "/admin";
  if (role === CASHIER_ROLE) return "/admin/bookings";
  if (role === TICKET_CHECKER_ROLE) return "/admin/payments";
  return "/";
};

const toPublicAssignment = (assignment) => ({
  id: assignment.id,
  role_at_theater: assignment.role_at_theater,
  is_active: assignment.is_active !== false,
  theater: assignment.theater
    ? {
        id: assignment.theater.id,
        name: assignment.theater.name,
        address: assignment.theater.address,
        city: assignment.theater.city,
        phone: assignment.theater.phone,
      }
    : null,
});

const activeTheaterIds = (assignments = []) =>
  assignments
    .filter((assignment) => assignment?.is_active !== false && assignment.theater?.id)
    .map((assignment) => String(assignment.theater.id));

const getScopedTheaterIds = async (manager, userId) => {
  const assignments = await manager.getRepository("UserTheater").find({
    where: { user: { id: userId }, is_active: true },
    relations: { theater: true },
  });
  return activeTheaterIds(assignments);
};

const attachAccessScope = async (req, _res, next) => {
  try {
    if (!req.user || isAdmin(req.user)) {
      req.accessScope = { theaterIds: null };
      return next();
    }
    req.accessScope = { theaterIds: await getScopedTheaterIds(AppDataSource.manager, req.user.id) };
    return next();
  } catch (error) {
    return next(error);
  }
};

const requireAnyRole = (roles) => (req, _res, next) => {
  if (!roles.includes(req.user?.role)) {
    return next(new AppError(403, "ROLE_FORBIDDEN", "You do not have permission for this action"));
  }
  next();
};

const requireOperationRole = requireAnyRole(OPERATION_ROLES);

const scopedTheaterIds = (req) => {
  if (isAdmin(req.user)) return null;
  return req.accessScope?.theaterIds || [];
};

const applyTheaterScope = (qb, req, theaterAlias = "theater") => {
  const theaterIds = scopedTheaterIds(req);
  if (theaterIds === null) return qb;
  if (theaterIds.length === 0) return qb.andWhere("1 = 0");
  return qb.andWhere(`${theaterAlias}.id IN (:...scopeTheaterIds)`, {
    scopeTheaterIds: theaterIds,
  });
};

const assertTheaterAccess = (req, theaterId) => {
  const theaterIds = scopedTheaterIds(req);
  if (theaterIds === null) return;
  if (!theaterIds.includes(String(theaterId))) {
    throw new AppError(403, "THEATER_SCOPE_FORBIDDEN", "This resource is outside your branch");
  }
};

const assertScreenAccess = async (manager, req, screenId) => {
  if (isAdmin(req.user)) return;
  const screen = await manager.getRepository("Screen").findOne({
    where: { id: screenId },
    relations: { theater: true },
  });
  if (!screen) throw new AppError(404, "ROOM_NOT_FOUND", "Room not found");
  assertTheaterAccess(req, screen.theater?.id);
};

const assertShowAccess = async (manager, req, showId) => {
  if (isAdmin(req.user)) return;
  const show = await manager.getRepository("Show").findOne({
    where: { id: showId },
    relations: { screen: { theater: true } },
  });
  if (!show) throw new AppError(404, "SHOW_NOT_FOUND", "Show not found");
  assertTheaterAccess(req, show.screen?.theater?.id);
};

const assertBookingAccess = async (manager, req, bookingId) => {
  if (isAdmin(req.user)) return;
  const booking = await manager.getRepository("Booking").findOne({
    where: { id: bookingId },
    relations: { show: { screen: { theater: true } } },
  });
  if (!booking) throw new AppError(404, "BOOKING_NOT_FOUND", "Booking not found");
  assertTheaterAccess(req, booking.show?.screen?.theater?.id);
};

module.exports = {
  ADMIN_ROLE,
  MANAGER_ROLE,
  CASHIER_ROLE,
  TICKET_CHECKER_ROLE,
  CUSTOMER_ROLE,
  STAFF_ROLES,
  OPERATION_ROLES,
  ALL_ROLES,
  activeTheaterIds,
  applyTheaterScope,
  assertBookingAccess,
  assertScreenAccess,
  assertShowAccess,
  assertTheaterAccess,
  attachAccessScope,
  isAdmin,
  isOperational,
  requireAnyRole,
  requireOperationRole,
  roleHomePath,
  toPublicAssignment,
};
