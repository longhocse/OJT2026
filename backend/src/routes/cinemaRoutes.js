// backend/src/routes/cinemaRoutes.js
const express = require('express');
const {
  getCinemas,
  getCinemaById,
  createCinema,
  updateCinema,
  deleteCinema,
} = require('../controllers/cinemaController');
const { authMiddleware, adminMiddleware } = require('../middleware/authMiddleware');

const router = express.Router();

router.get('/', getCinemas);
router.get('/:id', getCinemaById);
router.post('/', authMiddleware, adminMiddleware, createCinema);
router.put('/:id', authMiddleware, adminMiddleware, updateCinema);
router.delete('/:id', authMiddleware, adminMiddleware, deleteCinema);

module.exports = router;