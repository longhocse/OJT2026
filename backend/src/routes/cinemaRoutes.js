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
const { authMiddleware, adminMiddleware, adminOrManagerMiddleware } = require("../middleware/authMiddleware");
const validation = require("../middleware/apiValidation");

const router = express.Router();

router.get(
  "/admin/list",
  authMiddleware,
  adminOrManagerMiddleware,
  validation.adminCinemaList,
  getAdminCinemas,
);
router.get("/", getCinemas);
router.get("/:id", validation.idParam(), getCinemaById);
router.post("/", authMiddleware, adminOrManagerMiddleware, validation.cinemaCreate, createCinema);
router.put(
  "/:id",
  authMiddleware,
  adminOrManagerMiddleware,
  validation.idParam(),
  validation.cinemaUpdate,
  updateCinema,
);
router.patch(
  "/:id/deactivate",
  authMiddleware,
  adminOrManagerMiddleware,
  validation.idParam(),
  deactivateCinema,
);
router.patch("/:id/restore", authMiddleware, adminOrManagerMiddleware, validation.idParam(), restoreCinema);
router.delete("/:id", authMiddleware, adminMiddleware, validation.idParam(), deleteCinema);

module.exports = router;
