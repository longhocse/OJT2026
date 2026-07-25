const express = require("express");
const { authMiddleware } = require("../middleware/authMiddleware");
const validation = require("../middleware/apiValidation");
const { attachAccessScope, requireAnyRole } = require("../services/accessControlService");
const bookingController = require("../controllers/bookingController");
const paymentController = require("../controllers/paymentController");
const showController = require("../controllers/showController");
const ticketController = require("../controllers/ticketController");

const router = express.Router();
router.use(authMiddleware, requireAnyRole(["cashier"]), attachAccessScope);

router.get("/shows", validation.adminShowList, showController.getAdminShows);
router.get("/shows/:id", validation.idParam(), showController.getAdminShowById);
router.post("/bookings", validation.cashierBookingCreate, bookingController.createBooking);
router.get("/bookings/me", bookingController.getMyBookings);
router.get("/bookings/:id/ticket", validation.idParam(), ticketController.getTicket);
router.post(
  "/payments/:id/confirm-cash",
  validation.idParam(),
  paymentController.confirmCashPayment,
);

module.exports = router;
