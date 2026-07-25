const express = require("express");
const { authMiddleware, adminMiddleware } = require("../middleware/authMiddleware");
const {
  attachAccessScope,
  requireAnyRole,
  requireOperationRole,
} = require("../services/accessControlService");
const movieController = require("../controllers/movieController");
const showController = require("../controllers/showController");
const adminBookingController = require("../controllers/adminBookingController");
const paymentController = require("../controllers/paymentController");
const ticketController = require("../controllers/ticketController");
const auditLogController = require("../controllers/auditLogController");
const validation = require("../middleware/apiValidation");

const router = express.Router();

router.use(authMiddleware, requireOperationRole, attachAccessScope);

router.post("/movies", adminMiddleware, validation.movieCreate, movieController.createMovie);
router.put(
  "/movies/:id",
  adminMiddleware,
  validation.idParam(),
  validation.movieUpdate,
  movieController.updateMovie,
);
router.delete("/movies/:id", adminMiddleware, validation.idParam(), movieController.deleteMovie);

router.get(
  "/shows",
  requireAnyRole(["admin", "manager", "cashier", "ticket_checker"]),
  validation.adminShowList,
  showController.getAdminShows,
);
router.post(
  "/shows",
  requireAnyRole(["admin", "manager"]),
  validation.showCreate,
  showController.createShow,
);
router.post(
  "/shows/bulk",
  requireAnyRole(["admin", "manager"]),
  validation.showBulkCreate,
  showController.createBulkShows,
);
router.get(
  "/shows/:id",
  requireAnyRole(["admin", "manager", "cashier", "ticket_checker"]),
  validation.idParam(),
  showController.getAdminShowById,
);
router.put(
  "/shows/:id",
  requireAnyRole(["admin", "manager"]),
  validation.idParam(),
  validation.showUpdate,
  showController.updateShow,
);
router.post(
  "/shows/:id/cancel",
  requireAnyRole(["admin", "manager"]),
  validation.idParam(),
  validation.showCancel,
  showController.cancelShow,
);
router.delete(
  "/shows/:id",
  requireAnyRole(["admin", "manager"]),
  validation.idParam(),
  showController.deleteShow,
);

router.get(
  "/bookings",
  requireAnyRole(["admin", "manager", "cashier", "ticket_checker"]),
  validation.adminBookingList,
  adminBookingController.getAdminBookings,
);
router.get(
  "/bookings/:id",
  requireAnyRole(["admin", "manager", "cashier", "ticket_checker"]),
  validation.idParam(),
  adminBookingController.getAdminBookingById,
);
router.post(
  "/bookings/:id/cancel",
  requireAnyRole(["admin", "manager"]),
  validation.idParam(),
  validation.adminBookingCancel,
  adminBookingController.cancelAdminBooking,
);
router.get(
  "/dashboard/stats",
  requireAnyRole(["admin", "manager"]),
  validation.adminDashboardStats,
  adminBookingController.getDashboardStats,
);
router.get(
  "/audit-logs",
  requireAnyRole(["admin", "manager"]),
  validation.adminAuditLogList,
  auditLogController.getAuditLogs,
);
router.get(
  "/payments",
  requireAnyRole(["admin", "manager", "cashier", "ticket_checker"]),
  validation.adminPaymentList,
  paymentController.getAdminPayments,
);
router.post(
  "/payments/:id/confirm-cash",
  requireAnyRole(["admin", "manager", "cashier"]),
  validation.idParam(),
  paymentController.confirmCashPayment,
);
router.post(
  "/payments/:id/refund",
  requireAnyRole(["admin", "manager"]),
  validation.idParam(),
  validation.paymentRefund,
  paymentController.refundPayment,
);
router.post(
  "/tickets/check-in",
  requireAnyRole(["admin", "manager", "cashier", "ticket_checker"]),
  validation.ticketCheckIn,
  ticketController.checkInTicket,
);

module.exports = router;
