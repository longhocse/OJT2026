// backend/src/routes/movieRoutes.js
const express = require('express');
const {
  getMovies,
  getMovieById,
  createMovie,
  updateMovie,
  deleteMovie,
  getReviews,
  addReview,
} = require('../controllers/movieController');
const { authMiddleware, adminMiddleware } = require('../middleware/authMiddleware');

const router = express.Router();

router.get('/', getMovies);
router.get('/:id', getMovieById);
router.post('/', authMiddleware, adminMiddleware, createMovie);
router.put('/:id', authMiddleware, adminMiddleware, updateMovie);
router.delete('/:id', authMiddleware, adminMiddleware, deleteMovie);
router.get('/:movieId/reviews', getReviews);
router.post('/:movieId/reviews', authMiddleware, addReview);

module.exports = router;