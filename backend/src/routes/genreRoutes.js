// backend/src/routes/genreRoutes.js
const express = require('express');
const {
  getGenres,
  createGenre,
  updateGenre,
  deleteGenre,
} = require('../controllers/genreController');
const { authMiddleware, adminMiddleware } = require('../middleware/authMiddleware');

const router = express.Router();

router.get('/', getGenres);
router.post('/', authMiddleware, adminMiddleware, createGenre);
router.put('/:id', authMiddleware, adminMiddleware, updateGenre);
router.delete('/:id', authMiddleware, adminMiddleware, deleteGenre);

module.exports = router;