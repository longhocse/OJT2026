// backend/src/routes/adminRoutes.js
const express = require("express");
const { authMiddleware, adminMiddleware } = require("../middleware/authMiddleware");
const movieController = require("../controllers/movieController");
const showController = require("../controllers/showController");
const adminBookingController = require("../controllers/adminBookingController");
const paymentController = require("../controllers/paymentController");
const ticketController = require("../controllers/ticketController");
const auditLogController = require("../controllers/auditLogController");
const validation = require("../middleware/apiValidation");

const router = express.Router();

// Tất cả routes admin đều cần auth + admin
router.use(authMiddleware, adminMiddleware);

// Movie management
router.post("/movies", validation.movieCreate, movieController.createMovie);
router.put(
  "/movies/:id",
  validation.idParam(),
  validation.movieUpdate,
  movieController.updateMovie,
);
router.delete("/movies/:id", validation.idParam(), movieController.deleteMovie);

router.get("/shows", validation.adminShowList, showController.getAdminShows);
router.get("/shows/:id", validation.idParam(), showController.getAdminShowById);
router.post("/shows", validation.showCreate, showController.createShow);
router.put("/shows/:id", validation.idParam(), validation.showUpdate, showController.updateShow);
router.post(
  "/shows/:id/cancel",
  validation.idParam(),
  validation.showCancel,
  showController.cancelShow,
);
router.delete("/shows/:id", validation.idParam(), showController.deleteShow);

router.get("/bookings", validation.adminBookingList, adminBookingController.getAdminBookings);
router.get("/bookings/:id", validation.idParam(), adminBookingController.getAdminBookingById);
router.post(
  "/bookings/:id/cancel",
  validation.idParam(),
  validation.adminBookingCancel,
  adminBookingController.cancelAdminBooking,
);
router.get(
  "/dashboard/stats",
  validation.adminDashboardStats,
  adminBookingController.getDashboardStats,
);
router.get("/audit-logs", validation.adminAuditLogList, auditLogController.getAuditLogs);
router.get("/payments", validation.adminPaymentList, paymentController.getAdminPayments);
router.post(
  "/payments/:id/confirm-cash",
  validation.idParam(),
  paymentController.confirmCashPayment,
);
router.post(
  "/payments/:id/refund",
  validation.idParam(),
  validation.paymentRefund,
  paymentController.refundPayment,
);
router.post("/tickets/check-in", validation.ticketCheckIn, ticketController.checkInTicket);

// Thêm các routes admin khác...

module.exports = router;
