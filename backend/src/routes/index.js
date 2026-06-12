const express = require("express");
const authRoutes = require("./authRoutes");
const movieRoutes = require("./movieRoutes");
const showRoutes = require("./showRoutes");
const bookingRoutes = require("./bookingRoutes");
const recommendationRoutes = require("./recommendationRoutes");

const router = express.Router();

router.use("/auth", authRoutes);
router.use("/movies", movieRoutes);
router.use("/shows", showRoutes);
router.use("/bookings", bookingRoutes);
router.use("/recommendations", recommendationRoutes);

module.exports = router;