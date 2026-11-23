
import express from "express";

import {
  registerEmployee,
  loginEmployee,
  verifyLoginOTP,
  logoutEmployee,
  forgotPassword,
  verifyResetOTP,
  resetPassword,
  changePassword,
} from "../controllers/authController.js";

import { protect } from "../Middleware/authMiddleware.js";

const router = express.Router();

// Registration
router.post("/register", registerEmployee);

// Login and OTP
router.post("/login", loginEmployee);
router.post("/verify-login-otp", verifyLoginOTP);

// Forgot password
router.post("/forgot-password", forgotPassword);
router.post("/verify-reset-otp", verifyResetOTP);
router.post("/reset-password", resetPassword);

// Change password - Login required
router.post("/change-password", protect, changePassword);

// Logout
router.post("/logout", logoutEmployee);

export default router;