const express = require("express");
const {
  createBooking,
  getBookingById,
  getUserBookings,
  cancelBooking,
  lockSeats,
  unlockSeats,
} = require("../controllers/bookingController");
const { authMiddleware } = require("../middleware/authMiddleware");

const router = express.Router();

router.post("/", authMiddleware, createBooking);
router.get("/:id", authMiddleware, getBookingById);
router.get("/user/:userId", authMiddleware, getUserBookings);
router.put("/:id/cancel", authMiddleware, cancelBooking);
router.post("/seats/lock", authMiddleware, lockSeats);
router.post("/seats/unlock", authMiddleware, unlockSeats);

module.exports = router;