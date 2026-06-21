// backend/src/routes/adminRoutes.js
const express = require("express");
const { authMiddleware, adminMiddleware } = require("../middleware/authMiddleware");
const movieController = require("../controllers/movieController");
const validation = require("../middleware/apiValidation");

const router = express.Router();

// Tất cả routes admin đều cần auth + admin
router.use(authMiddleware, adminMiddleware);

// Movie management
router.post("/movies", validation.movieCreate, movieController.createMovie);
router.put(
  "/movies/:id",
  validation.idParam(),
  validation.movieUpdate,
  movieController.updateMovie,
);
router.delete("/movies/:id", validation.idParam(), movieController.deleteMovie);

// Thêm các routes admin khác...

module.exports = router;
