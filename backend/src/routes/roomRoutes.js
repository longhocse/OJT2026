// backend/src/routes/roomRoutes.js
const express = require('express');
const {
  getRooms,
  getRoomById,
  createRoom,
  updateRoom,
  deleteRoom,
} = require('../controllers/roomController');
const { authMiddleware, adminMiddleware } = require('../middleware/authMiddleware');

const router = express.Router();

router.get('/', getRooms);
router.get('/:id', getRoomById);
router.post('/', authMiddleware, adminMiddleware, createRoom);
router.put('/:id', authMiddleware, adminMiddleware, updateRoom);
router.delete('/:id', authMiddleware, adminMiddleware, deleteRoom);

module.exports = router;