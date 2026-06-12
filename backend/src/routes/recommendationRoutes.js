const express = require("express");
const { getUserRecommendations, getTrendingMovies } = require("../controllers/recommendationController");

const router = express.Router();

router.get("/", getUserRecommendations);
router.get("/trending", getTrendingMovies);

module.exports = router;