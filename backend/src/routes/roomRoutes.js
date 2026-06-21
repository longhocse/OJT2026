// backend/src/routes/roomRoutes.js
const express = require("express");
const {
  getRooms,
  getRoomById,
  createRoom,
  updateRoom,
  deleteRoom,
} = require("../controllers/roomController");
const { authMiddleware, adminMiddleware } = require("../middleware/authMiddleware");
const validation = require("../middleware/apiValidation");

const router = express.Router();

router.get("/", validation.roomList, getRooms);
router.get("/:id", validation.idParam(), getRoomById);
router.post("/", authMiddleware, adminMiddleware, validation.roomCreate, createRoom);
router.put(
  "/:id",
  authMiddleware,
  adminMiddleware,
  validation.idParam(),
  validation.roomUpdate,
  updateRoom,
);
router.delete("/:id", authMiddleware, adminMiddleware, validation.idParam(), deleteRoom);

module.exports = router;
