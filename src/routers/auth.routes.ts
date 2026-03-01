import { Router } from "express";
import {
  sendOtp,
  verifyOtp,
  googleAuth,
  googleAuthCallback,
  logout,
  getCurrentUser,
} from "@controllers/index.ts";
import { authenticate } from "@middlewares/index.ts";

const router = Router();

// Email OTP Authentication
// POST /auth/otp/send - Send OTP to email
router.post("/otp/send", sendOtp);

// POST /auth/otp/verify - Verify OTP and authenticate
router.post("/otp/verify", verifyOtp);

// Google OAuth Authentication
// GET /auth/google - Redirect to Google consent screen
router.get("/google", googleAuth);

// GET /auth/google/callback - Handle Google callback
router.get("/google/callback", googleAuthCallback);

// Session Management
// POST /auth/logout - Clear auth cookie
router.post("/logout", logout);

// GET /auth/me - Get current authenticated user (protected)
router.get("/me", authenticate, getCurrentUser);

export default router;
