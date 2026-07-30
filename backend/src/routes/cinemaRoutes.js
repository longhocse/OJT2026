// backend/src/routes/cinemaRoutes.js
const express = require("express");
const {
  getCinemas,
  getAdminCinemas,
  getCinemaById,
  createCinema,
  updateCinema,
  deleteCinema,
  deactivateCinema,
  restoreCinema,
} = require("../controllers/cinemaController");
const { authMiddleware, adminMiddleware } = require("../middleware/authMiddleware");
const { attachAccessScope, requireAnyRole } = require("../services/accessControlService");
const validation = require("../middleware/apiValidation");

const router = express.Router();

router.get(
  "/admin/list",
  authMiddleware,
  requireAnyRole(["admin", "manager", "cashier", "ticket_checker"]),
  attachAccessScope,
  validation.adminCinemaList,
  getAdminCinemas,
);
router.get("/", getCinemas);
router.get("/:id", validation.idParam(), getCinemaById);
router.post("/", authMiddleware, adminMiddleware, validation.cinemaCreate, createCinema);
router.put(
  "/:id",
  authMiddleware,
  adminMiddleware,
  validation.idParam(),
  validation.cinemaUpdate,
  updateCinema,
);
router.patch(
  "/:id/deactivate",
  authMiddleware,
  adminMiddleware,
  validation.idParam(),
  deactivateCinema,
);
router.patch("/:id/restore", authMiddleware, adminMiddleware, validation.idParam(), restoreCinema);
router.delete("/:id", authMiddleware, adminMiddleware, validation.idParam(), deleteCinema);

module.exports = router;
