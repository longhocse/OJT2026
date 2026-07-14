// backend/src/routes/adminRoutes.js
const express = require("express");
const { authMiddleware, adminMiddleware, adminOrManagerMiddleware } = require("../middleware/authMiddleware");
const movieController = require("../controllers/movieController");
const showController = require("../controllers/showController");
const adminBookingController = require("../controllers/adminBookingController");
const paymentController = require("../controllers/paymentController");
const ticketController = require("../controllers/ticketController");
const auditLogController = require("../controllers/auditLogController");
const validation = require("../middleware/apiValidation");

const router = express.Router();

// Tất cả routes admin đều cần auth + admin
router.use(authMiddleware);

// Movie management
router.post("/movies",adminOrManagerMiddleware, validation.movieCreate, movieController.createMovie);
router.put(
  "/movies/:id",
  adminOrManagerMiddleware,
  validation.idParam(),
  validation.movieUpdate,
  movieController.updateMovie,
);
router.delete("/movies/:id",adminMiddleware, validation.idParam(), movieController.deleteMovie);

router.get("/shows",adminOrManagerMiddleware, validation.adminShowList, showController.getAdminShows);
router.post("/shows",adminOrManagerMiddleware, validation.showCreate, showController.createShow);
router.post("/shows/bulk",adminOrManagerMiddleware, validation.showBulkCreate, showController.createBulkShows);
router.get("/shows/:id",adminOrManagerMiddleware, validation.idParam(), showController.getAdminShowById);
router.put("/shows/:id",adminOrManagerMiddleware, validation.idParam(), validation.showUpdate, showController.updateShow);
router.post(
  "/shows/:id/cancel",
  adminOrManagerMiddleware,
  validation.idParam(),
  validation.showCancel,
  showController.cancelShow,
);
router.delete("/shows/:id",adminMiddleware, validation.idParam(), showController.deleteShow);

router.get("/bookings",adminOrManagerMiddleware, validation.adminBookingList, adminBookingController.getAdminBookings);
router.get("/bookings/:id",adminOrManagerMiddleware, validation.idParam(), adminBookingController.getAdminBookingById);
router.post(
  "/bookings/:id/cancel",
  adminOrManagerMiddleware,
  validation.idParam(),
  validation.adminBookingCancel,
  adminBookingController.cancelAdminBooking,
);
router.get(
  "/dashboard/stats",
  adminOrManagerMiddleware,
  validation.adminDashboardStats,
  adminBookingController.getDashboardStats,
);
router.get("/audit-logs",adminMiddleware, validation.adminAuditLogList, auditLogController.getAuditLogs);
router.get("/payments",adminOrManagerMiddleware, validation.adminPaymentList, paymentController.getAdminPayments);
router.post(
  "/payments/:id/confirm-cash",
  adminOrManagerMiddleware,
  validation.idParam(),
  paymentController.confirmCashPayment,
);
router.post(
  "/payments/:id/refund",
  adminOrManagerMiddleware,
  validation.idParam(),
  validation.paymentRefund,
  paymentController.refundPayment,
);
router.post("/tickets/check-in",adminOrManagerMiddleware, validation.ticketCheckIn, ticketController.checkInTicket);

// Thêm các routes admin khác...

module.exports = router;
