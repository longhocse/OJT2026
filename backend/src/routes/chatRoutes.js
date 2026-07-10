// backend/src/routes/chatRoutes.js
const express = require("express");
const { handleChatMessage } = require("../controllers/chatController");
const { authMiddleware } = require("../middleware/authMiddleware");
// const validation = require("../middleware/apiValidation"); // Tạm thời comment nếu chưa dùng

const router = express.Router();

// ✅ Cấu trúc đúng: authMiddleware, sau đó là controller
router.post(
    "/message",
    authMiddleware,
    handleChatMessage
);

module.exports = router;