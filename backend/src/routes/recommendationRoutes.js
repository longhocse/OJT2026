const express = require("express");
const {
  getUserRecommendations,
  getTrendingMovies,
} = require("../controllers/recommendationController");
const { authMiddleware } = require("../middleware/authMiddleware");

const router = express.Router();

router.get("/", authMiddleware, getUserRecommendations);
router.get("/trending", getTrendingMovies);

module.exports = router;
