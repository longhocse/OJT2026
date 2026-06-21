const express = require("express");
const {
  createBooking,
  getBookingById,
  getMyBookings,
  getUserBookings,
  cancelBooking,
  lockSeats,
  unlockSeats,
} = require("../controllers/bookingController");
const { authMiddleware } = require("../middleware/authMiddleware");
const validation = require("../middleware/apiValidation");

const router = express.Router();

router.post("/", authMiddleware, validation.bookingCreate, createBooking);
router.get("/me", authMiddleware, getMyBookings);
router.get("/user/:userId", authMiddleware, validation.userIdParam, getUserBookings);
router.get("/:id", authMiddleware, validation.idParam(), getBookingById);
router.put("/:id/cancel", authMiddleware, validation.idParam(), cancelBooking);
router.post("/seats/lock", authMiddleware, validation.seatLock, lockSeats);
router.post("/seats/unlock", authMiddleware, validation.seatUnlock, unlockSeats);

module.exports = router;
