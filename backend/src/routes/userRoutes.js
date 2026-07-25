const express = require("express");
const router = express.Router();

const { getAllUsers, updateUserAccess } = require("../controllers/userController");
const { authMiddleware, adminMiddleware } = require("../middleware/authMiddleware");
const validation = require("../middleware/apiValidation");

router.get("/", authMiddleware, adminMiddleware, validation.usersList, getAllUsers);
router.patch(
  "/:id",
  authMiddleware,
  adminMiddleware,
  validation.idParam(),
  validation.adminUserUpdate,
  updateUserAccess,
);

module.exports = router;
