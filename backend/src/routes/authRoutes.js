const express = require("express");
const controller = require("../controllers/authController");
const { authMiddleware } = require("../middleware/authMiddleware");
const validation = require("../middleware/apiValidation");

const router = express.Router();

router.post("/register", validation.authRegister, controller.register);
router.post("/login", validation.authLogin, controller.login);
router.post("/refresh", controller.refresh);
router.post("/logout", controller.logout);
router.post("/forgot-password", validation.forgotPassword, controller.forgotPassword);
router.post("/reset-password", validation.resetPassword, controller.resetPassword);
router.post("/verify-email", validation.verifyEmail, controller.verifyEmail);
router.post("/resend-verification", validation.resendVerification, controller.resendVerification);
router.get("/me", authMiddleware, controller.getMe);
router.put("/profile", authMiddleware, validation.profileUpdate, controller.updateProfile);
router.post(
  "/change-password",
  authMiddleware,
  validation.changePassword,
  controller.changePassword,
);

module.exports = router;
