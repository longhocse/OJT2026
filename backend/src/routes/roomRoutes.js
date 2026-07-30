// backend/src/routes/roomRoutes.js
const express = require("express");
const {
  getRooms,
  getRoomById,
  createRoom,
  updateRoom,
  deleteRoom,
} = require("../controllers/roomController");
const { authMiddleware } = require("../middleware/authMiddleware");
const { attachAccessScope, requireAnyRole } = require("../services/accessControlService");
const validation = require("../middleware/apiValidation");

const router = express.Router();

router.get("/", validation.roomList, getRooms);
router.get("/:id", validation.idParam(), getRoomById);
router.post(
  "/",
  authMiddleware,
  requireAnyRole(["admin", "manager"]),
  attachAccessScope,
  validation.roomCreate,
  createRoom,
);
router.put(
  "/:id",
  authMiddleware,
  requireAnyRole(["admin", "manager"]),
  attachAccessScope,
  validation.idParam(),
  validation.roomUpdate,
  updateRoom,
);
router.delete(
  "/:id",
  authMiddleware,
  requireAnyRole(["admin", "manager"]),
  attachAccessScope,
  validation.idParam(),
  deleteRoom,
);

module.exports = router;
