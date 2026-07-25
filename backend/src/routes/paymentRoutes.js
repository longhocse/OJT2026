const express = require("express");
const controller = require("../controllers/paymentController");
const { authMiddleware } = require("../middleware/authMiddleware");
const validation = require("../middleware/apiValidation");
const router = express.Router();
router.post("/webhooks/:provider", controller.handleWebhook);
// PayOS redirects can return after the browser session has expired. The
// controller verifies the payment directly with PayOS before changing state.
router.get("/payos/reconcile", controller.reconcilePayOSReturn);
router.get("/:id", authMiddleware, validation.idParam(), controller.getPayment);
router.post(
  "/:id/mock-complete",
  authMiddleware,
  validation.idParam(),
  controller.completeMockPayment,
);
module.exports = router;
