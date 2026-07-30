const express = require("express");
const controller = require("../controllers/paymentController");
const { authMiddleware } = require("../middleware/authMiddleware");
const validation = require("../middleware/apiValidation");
const router = express.Router();
router.post("/webhooks/:provider", controller.handleWebhook);
router.get("/payos/reconcile", authMiddleware, controller.reconcilePayOSReturn);
router.get("/:id", authMiddleware, validation.idParam(), controller.getPayment);
router.post(
  "/:id/mock-complete",
  authMiddleware,
  validation.idParam(),
  controller.completeMockPayment,
);
module.exports = router;
