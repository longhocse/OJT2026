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
  updateReview,
  deleteOwnReview,
  moderateReview,
} = require("../controllers/movieController");
const { authMiddleware, adminMiddleware } = require("../middleware/authMiddleware");
const validation = require("../middleware/apiValidation");

// Import service AI mà bạn đã tạo (đường dẫn tùy theo vị trí thực tế của bạn)
const { generateMovieDescription } = require("../services/aiService");

const router = express.Router();

// --- CÁC ROUTE CŨ (Giữ nguyên hoàn toàn) ---
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
router.put(
  "/:movieId/reviews/:reviewId",
  authMiddleware,
  validation.reviewParams,
  validation.reviewUpdate,
  updateReview,
);
router.delete(
  "/:movieId/reviews/:reviewId",
  authMiddleware,
  validation.reviewParams,
  deleteOwnReview,
);
router.delete(
  "/:movieId/reviews/:reviewId/moderate",
  authMiddleware,
  adminMiddleware,
  validation.reviewParams,
  moderateReview,
);
// --- ROUTE MỚI: AI TẠO MÔ TẢ (Thêm vào cuối file) ---
router.post(
  "/generate-description",
  authMiddleware,
  adminMiddleware,
  async (req, res) => {
    try {
      const { title, genre, director, cast, plotOutline } = req.body;

      if (!title) {
        return res.status(400).json({
          error: "Vui lòng cung cấp tên phim.",
        });
      }

      const description = await generateMovieDescription({
        title,
        genre,
        director,
        cast,
        plotOutline,
      });

      return res.json({
        description,
      });
    } catch (error) {
      console.error(error);

      return res.status(500).json({
        error: "Không thể tạo mô tả bằng AI.",
      });
    }
  }
);

module.exports = router;