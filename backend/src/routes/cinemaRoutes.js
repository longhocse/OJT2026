// backend/src/routes/cinemaRoutes.js
const express = require("express");
const {
  getCinemas,
  getCinemaById,
  createCinema,
  updateCinema,
  deleteCinema,
} = require("../controllers/cinemaController");
const { authMiddleware, adminMiddleware } = require("../middleware/authMiddleware");
const validation = require("../middleware/apiValidation");

const router = express.Router();

router.get("/", getCinemas);
router.get("/:id", validation.idParam(), getCinemaById);
router.post("/", authMiddleware, adminMiddleware, validation.cinemaCreate, createCinema);
router.put(
  "/:id",
  authMiddleware,
  adminMiddleware,
  validation.idParam(),
  validation.cinemaUpdate,
  updateCinema,
);
router.delete("/:id", authMiddleware, adminMiddleware, validation.idParam(), deleteCinema);

module.exports = router;
