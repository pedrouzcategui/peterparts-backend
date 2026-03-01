import type { Request, Response } from "express";
import type {
  AuthResponseDTO,
  ErrorResponse,
  JWTPayload,
  SendOtpRequestDTO,
  UserDTO,
  VerifyOtpRequestDTO,
  AuthenticatedRequest,
} from "@dto/index.ts";
import {
  createVerificationCode,
  deleteUserVerificationCodes,
  findOrCreateEmailUser,
  findOrCreateGoogleUser,
  generateOtpCode,
  getOtpExpiryDate,
  getValidVerificationCode,
  getUserById,
  markVerificationCodeAsUsed,
  OTP_EXPIRY_MINUTES,
} from "@models/index.ts";
import {
  signToken,
  COOKIE_NAME,
  getCookieOptions,
  getGoogleAuthUrl,
  handleGoogleCallback,
  emailService,
} from "@services/index.ts";

const isProduction = process.env.NODE_ENV === "production";

// Helper to convert User to UserDTO (strip sensitive fields)
const toUserDTO = (user: {
  id: string;
  email: string;
  name: string | null;
  avatarUrl: string | null;
  role: string;
  provider: string;
  createdAt: Date;
  updatedAt: Date;
}): UserDTO => ({
  id: user.id,
  email: user.email,
  name: user.name,
  avatarUrl: user.avatarUrl,
  role: user.role as UserDTO["role"],
  provider: user.provider as UserDTO["provider"],
  createdAt: user.createdAt,
  updatedAt: user.updatedAt,
});

// Helper to set auth cookie
const setAuthCookie = (res: Response, payload: JWTPayload) => {
  const token = signToken(payload);
  res.cookie(COOKIE_NAME, token, getCookieOptions(isProduction));
};

/**
 * POST /auth/otp/send
 * Send OTP code to email for passwordless login
 */
export const sendOtp = async (
  req: Request<{}, { message: string } | ErrorResponse, SendOtpRequestDTO>,
  res: Response<{ message: string } | ErrorResponse>,
) => {
  try {
    const { email } = req.body ?? {};

    if (!email || typeof email !== "string") {
      res.status(400).json({ message: "Email is required" });
      return;
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      res.status(400).json({ message: "Invalid email format" });
      return;
    }

    // Find or create user
    const user = await findOrCreateEmailUser(email);

    // Delete any existing unused codes for this user
    await deleteUserVerificationCodes(user.id);

    // Generate new OTP
    const code = generateOtpCode();
    const expiresAt = getOtpExpiryDate();

    // Save verification code
    await createVerificationCode({
      code,
      userId: user.id,
      expiresAt,
    });

    // Send email
    const emailResult = await emailService.sendOtpEmail({
      to: email,
      code,
      expiresInMinutes: OTP_EXPIRY_MINUTES,
    });

    if (!emailResult.success) {
      console.error("Failed to send OTP email:", emailResult.error);
      res.status(500).json({ message: "Failed to send verification email" });
      return;
    }

    res.json({ message: "Verification code sent successfully" });
  } catch (error) {
    console.error("Error in sendOtp:", error);
    res.status(500).json({ message: "Failed to send verification code" });
  }
};

/**
 * POST /auth/otp/verify
 * Verify OTP code and authenticate user
 */
export const verifyOtp = async (
  req: Request<{}, AuthResponseDTO | ErrorResponse, VerifyOtpRequestDTO>,
  res: Response<AuthResponseDTO | ErrorResponse>,
) => {
  try {
    const { email, code } = req.body ?? {};

    if (!email || !code) {
      res.status(400).json({ message: "Email and code are required" });
      return;
    }

    // Find user by email
    const user = await findOrCreateEmailUser(email);

    // Find valid verification code
    const verificationCode = await getValidVerificationCode(user.id, code);

    if (!verificationCode) {
      res.status(401).json({ message: "Invalid or expired verification code" });
      return;
    }

    // Mark code as used
    await markVerificationCodeAsUsed(verificationCode.id);

    // Create JWT payload
    const payload: JWTPayload = {
      userId: user.id,
      email: user.email,
      role: user.role,
    };

    // Set cookie
    setAuthCookie(res, payload);

    res.json({
      user: toUserDTO(user),
      message: "Authentication successful",
    });
  } catch (error) {
    console.error("Error in verifyOtp:", error);
    res.status(500).json({ message: "Failed to verify code" });
  }
};

/**
 * GET /auth/google
 * Redirect user to Google OAuth consent screen
 */
export const googleAuth = (req: Request, res: Response<ErrorResponse>) => {
  try {
    const authUrl = getGoogleAuthUrl();
    res.redirect(authUrl);
  } catch (error) {
    console.error("Error in googleAuth:", error);
    res
      .status(500)
      .json({ message: "Failed to initiate Google authentication" });
  }
};

/**
 * GET /auth/google/callback
 * Handle Google OAuth callback
 */
export const googleAuthCallback = async (
  req: Request<
    {},
    AuthResponseDTO | ErrorResponse,
    {},
    { code?: string; error?: string }
  >,
  res: Response<AuthResponseDTO | ErrorResponse>,
) => {
  try {
    const { code, error } = req.query;

    if (error) {
      res
        .status(401)
        .json({ message: `Google authentication failed: ${error}` });
      return;
    }

    if (!code || typeof code !== "string") {
      res.status(400).json({ message: "Authorization code is missing" });
      return;
    }

    // Exchange code for user info
    const googleUser = await handleGoogleCallback(code);

    // Find or create user
    const user = await findOrCreateGoogleUser({
      googleId: googleUser.sub,
      email: googleUser.email,
      name: googleUser.name,
      ...(googleUser.picture && { avatarUrl: googleUser.picture }),
    });

    // Create JWT payload
    const payload: JWTPayload = {
      userId: user.id,
      email: user.email,
      role: user.role,
    };

    // Set cookie
    setAuthCookie(res, payload);

    // Redirect to frontend (configure via env)
    const frontendUrl = process.env.FRONTEND_URL || "http://localhost:3001";
    res.redirect(`${frontendUrl}/auth/callback?success=true`);
  } catch (error) {
    console.error("Error in googleAuthCallback:", error);
    const frontendUrl = process.env.FRONTEND_URL || "http://localhost:3001";
    res.redirect(`${frontendUrl}/auth/callback?error=authentication_failed`);
  }
};

/**
 * POST /auth/logout
 * Clear auth cookie
 */
export const logout = (req: Request, res: Response<{ message: string }>) => {
  res.clearCookie(COOKIE_NAME, {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? "strict" : "lax",
    path: "/",
  });
  res.json({ message: "Logged out successfully" });
};

/**
 * GET /auth/me
 * Get current authenticated user
 */
export const getCurrentUser = async (
  req: AuthenticatedRequest,
  res: Response<UserDTO | ErrorResponse>,
) => {
  try {
    if (!req.user) {
      res.status(401).json({ message: "Not authenticated" });
      return;
    }

    const user = await getUserById(req.user.userId);

    if (!user) {
      res.status(404).json({ message: "User not found" });
      return;
    }

    res.json(toUserDTO(user));
  } catch (error) {
    console.error("Error in getCurrentUser:", error);
    res.status(500).json({ message: "Failed to get user" });
  }
};
