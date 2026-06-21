const express = require("express");
const { register, login, getMe } = require("../controllers/authController");
const { authMiddleware } = require("../middleware/authMiddleware");
const validation = require("../middleware/apiValidation");

const router = express.Router();

router.post("/register", validation.authRegister, register);
router.post("/login", validation.authLogin, login);
router.get("/me", authMiddleware, getMe);

module.exports = router;
