const express = require("express");
const { authMiddleware } = require("../middleware/authMiddleware");
const validation = require("../middleware/apiValidation");
const { attachAccessScope, requireAnyRole } = require("../services/accessControlService");
const ticketController = require("../controllers/ticketController");

const router = express.Router();
router.use(authMiddleware, requireAnyRole(["ticket_checker"]), attachAccessScope);
router.post("/tickets/check-in", validation.ticketCheckIn, ticketController.checkInTicket);
router.get("/check-ins/me", validation.checkerHistory, ticketController.getMyCheckIns);
module.exports = router;
