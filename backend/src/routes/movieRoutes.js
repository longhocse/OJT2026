// backend/src/routes/movieRoutes.js
const express = require("express");
const {
  getMovies,
  getMovieById,
  createMovie,
  updateMovie,
  deleteMovie,
  getReviews,
  addReview,
} = require("../controllers/movieController");
const { authMiddleware, adminMiddleware } = require("../middleware/authMiddleware");
const validation = require("../middleware/apiValidation");

const router = express.Router();

router.get("/", validation.movieList, getMovies);
router.get("/:id", validation.idParam(), getMovieById);
router.post("/", authMiddleware, adminMiddleware, validation.movieCreate, createMovie);
router.put(
  "/:id",
  authMiddleware,
  adminMiddleware,
  validation.idParam(),
  validation.movieUpdate,
  updateMovie,
);
router.delete("/:id", authMiddleware, adminMiddleware, validation.idParam(), deleteMovie);
router.get("/:movieId/reviews", validation.idParam("movieId"), getReviews);
router.post("/:movieId/reviews", authMiddleware, validation.reviewCreate, addReview);

module.exports = router;
