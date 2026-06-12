const express = require("express");
const { getShows, getShowById, getSeatsByShow, createShow } = require("../controllers/showController");
const { authMiddleware, adminMiddleware } = require("../middleware/authMiddleware");

const router = express.Router();

router.get("/", getShows);
router.get("/:id", getShowById);
router.get("/:showId/seats", getSeatsByShow);
router.post("/", authMiddleware, adminMiddleware, createShow);

module.exports = router;