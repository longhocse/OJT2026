// backend/src/routes/genreRoutes.js
const express = require("express");
const {
  getGenres,
  createGenre,
  updateGenre,
  deleteGenre,
} = require("../controllers/genreController");
const { authMiddleware, adminMiddleware } = require("../middleware/authMiddleware");
const validation = require("../middleware/apiValidation");

const router = express.Router();

router.get("/", getGenres);
router.post("/", authMiddleware, adminMiddleware, validation.genreCreate, createGenre);
router.put(
  "/:id",
  authMiddleware,
  adminMiddleware,
  validation.idParam(),
  validation.genreUpdate,
  updateGenre,
);
router.delete("/:id", authMiddleware, adminMiddleware, validation.idParam(), deleteGenre);

module.exports = router;
