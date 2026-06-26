// backend/src/routes/index.js
const express = require("express");
const authRoutes = require("./authRoutes");
const movieRoutes = require("./movieRoutes");
const showRoutes = require("./showRoutes");
const bookingRoutes = require("./bookingRoutes");
const recommendationRoutes = require("./recommendationRoutes");
const genreRoutes = require("./genreRoutes");
const cinemaRoutes = require("./cinemaRoutes");
const roomRoutes = require("./roomRoutes");
const adminRoutes = require("./adminRoutes");
const userRoutes = require("./userRoutes");
const paymentRoutes = require("./paymentRoutes");
const router = express.Router();

router.use("/auth", authRoutes);
router.use("/movies", movieRoutes);
router.use("/shows", showRoutes);
router.use("/bookings", bookingRoutes);
router.use("/recommendations", recommendationRoutes);
router.use("/genres", genreRoutes);
router.use("/cinemas", cinemaRoutes);
router.use("/rooms", roomRoutes);
router.use("/admin", adminRoutes);
router.use("/users", userRoutes);
router.use("/payments", paymentRoutes);
module.exports = router;
