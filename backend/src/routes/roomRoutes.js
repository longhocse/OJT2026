// backend/src/routes/roomRoutes.js
const express = require("express");
const {
  getRooms,
  getRoomById,
  createRoom,
  updateRoom,
  deleteRoom,
} = require("../controllers/roomController");
const { authMiddleware, adminMiddleware, adminOrManagerMiddleware } = require("../middleware/authMiddleware");
const validation = require("../middleware/apiValidation");

const router = express.Router();

router.get("/", authMiddleware, validation.roomList, getRooms);
router.get("/:id", authMiddleware, validation.idParam(), getRoomById);
router.post("/", authMiddleware, adminOrManagerMiddleware, validation.roomCreate, createRoom);
router.put(
  "/:id",
  authMiddleware,
  adminOrManagerMiddleware,
  validation.idParam(),
  validation.roomUpdate,
  updateRoom,
);
router.delete("/:id", authMiddleware, adminOrManagerMiddleware, validation.idParam(), deleteRoom);

module.exports = router;
