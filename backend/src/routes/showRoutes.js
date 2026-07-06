const express = require("express");
const {
  getShows,
  getShowById,
  getSeatsByShow,
  createShow,
} = require("../controllers/showController");
const { authMiddleware, adminMiddleware } = require("../middleware/authMiddleware");
const validation = require("../middleware/apiValidation");

const router = express.Router();

router.get("/", validation.showList, getShows);
router.get("/:id", validation.idParam(), getShowById);
router.get("/:showId/seats", validation.idParam("showId"), getSeatsByShow);
router.post("/", authMiddleware, adminMiddleware, validation.showCreate, createShow);

module.exports = router;
