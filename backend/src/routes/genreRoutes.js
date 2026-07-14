// backend/src/routes/genreRoutes.js
const express = require("express");
const {
  getGenres,
  createGenre,
  updateGenre,
  deleteGenre,
} = require("../controllers/genreController");
const { authMiddleware, adminMiddleware, adminOrManagerMiddleware } = require("../middleware/authMiddleware");
const validation = require("../middleware/apiValidation");

const router = express.Router();

router.get("/", getGenres);
router.post("/", authMiddleware,  adminOrManagerMiddleware, validation.genreCreate, createGenre);
router.put(
  "/:id",
  authMiddleware,
   adminOrManagerMiddleware,
  validation.idParam(),
  validation.genreUpdate,
  updateGenre,
);
router.delete("/:id", authMiddleware, adminMiddleware, validation.idParam(), deleteGenre);

module.exports = router;
