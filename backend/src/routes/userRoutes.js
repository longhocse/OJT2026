const express = require("express");
const router = express.Router();

const { getAllUsers } = require("../controllers/userController");
const { authMiddleware, adminMiddleware } = require("../middleware/authMiddleware");
const validation = require("../middleware/apiValidation");

router.get("/", authMiddleware, adminMiddleware, validation.usersList, getAllUsers);

module.exports = router;
