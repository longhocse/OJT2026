// backend/src/routes/adminRoutes.js
const express = require('express');
const { authMiddleware, adminMiddleware } = require('../middleware/authMiddleware');
const movieController = require('../controllers/movieController');

const router = express.Router();

// Tất cả routes admin đều cần auth + admin
router.use(authMiddleware, adminMiddleware);

// Movie management
router.post('/movies', movieController.createMovie);
router.put('/movies/:id', movieController.updateMovie);
router.delete('/movies/:id', movieController.deleteMovie);

// Thêm các routes admin khác...

module.exports = router;