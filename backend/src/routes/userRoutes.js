const express = require("express");
const router = express.Router();

const { getAllUsers, updateUserAccess, assignCinema } = require("../controllers/userController");
const { authMiddleware, adminMiddleware, adminOrManagerMiddleware } = require("../middleware/authMiddleware");
const validation = require("../middleware/apiValidation");

router.get("/", authMiddleware, adminOrManagerMiddleware, validation.usersList, getAllUsers);
router.patch(
  "/:id",
  authMiddleware,
  adminOrManagerMiddleware,
  validation.idParam(),
  validation.adminUserUpdate,
  updateUserAccess,
);

router.patch(
  "/:id/assign-cinema",
  authMiddleware,
  adminOrManagerMiddleware,
  validation.idParam(),
  assignCinema
);

module.exports = router;
