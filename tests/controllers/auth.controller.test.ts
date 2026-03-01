import { jest } from "@jest/globals";
import type { Request, Response } from "express";
import type {
  AuthResponseDTO,
  ErrorResponse,
  AuthenticatedRequest,
  UserDTO,
} from "@dto/index";

// Mock models
const mockFindOrCreateEmailUser = jest.fn<any>();
const mockFindOrCreateGoogleUser = jest.fn<any>();
const mockCreateVerificationCode = jest.fn<any>();
const mockDeleteUserVerificationCodes = jest.fn<any>();
const mockGetValidVerificationCode = jest.fn<any>();
const mockMarkVerificationCodeAsUsed = jest.fn<any>();
const mockGetUserById = jest.fn<any>();
const mockGenerateOtpCode = jest.fn<any>();
const mockGetOtpExpiryDate = jest.fn<any>();

jest.unstable_mockModule("@models/index", () => ({
  findOrCreateEmailUser: mockFindOrCreateEmailUser,
  findOrCreateGoogleUser: mockFindOrCreateGoogleUser,
  createVerificationCode: mockCreateVerificationCode,
  deleteUserVerificationCodes: mockDeleteUserVerificationCodes,
  getValidVerificationCode: mockGetValidVerificationCode,
  markVerificationCodeAsUsed: mockMarkVerificationCodeAsUsed,
  getUserById: mockGetUserById,
  generateOtpCode: mockGenerateOtpCode,
  getOtpExpiryDate: mockGetOtpExpiryDate,
  OTP_EXPIRY_MINUTES: 10,
}));

// Mock services
const mockSignToken = jest.fn<any>();
const mockGetGoogleAuthUrl = jest.fn<any>();
const mockHandleGoogleCallback = jest.fn<any>();
const mockSendOtpEmail = jest.fn<any>();

jest.unstable_mockModule("@services/index", () => ({
  signToken: mockSignToken,
  COOKIE_NAME: "auth_token",
  getCookieOptions: () => ({
    httpOnly: true,
    secure: false,
    sameSite: "lax",
    maxAge: 7 * 24 * 60 * 60 * 1000,
    path: "/",
  }),
  getGoogleAuthUrl: mockGetGoogleAuthUrl,
  handleGoogleCallback: mockHandleGoogleCallback,
  emailService: {
    sendOtpEmail: mockSendOtpEmail,
  },
}));

const { sendOtp, verifyOtp, googleAuth, googleAuthCallback, logout, getCurrentUser } =
  await import("@controllers/auth.controller");

describe("Auth Controller", () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let jsonMock: jest.Mock;
  let statusMock: jest.Mock;
  let redirectMock: jest.Mock;
  let cookieMock: jest.Mock;
  let clearCookieMock: jest.Mock;

  const mockUser = {
    id: "user-123",
    email: "test@example.com",
    name: "Test User",
    avatarUrl: null,
    role: "Customer",
    provider: "Email",
    googleId: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(() => {
    jsonMock = jest.fn<any>() as any;
    statusMock = jest.fn<any>().mockReturnThis() as any;
    redirectMock = jest.fn<any>() as any;
    cookieMock = jest.fn<any>() as any;
    clearCookieMock = jest.fn<any>() as any;

    mockRequest = {
      body: {},
      params: {},
      query: {},
      cookies: {},
      headers: {},
    };

    mockResponse = {
      json: jsonMock,
      status: statusMock,
      redirect: redirectMock,
      cookie: cookieMock,
      clearCookie: clearCookieMock,
    } as any;

    jest.clearAllMocks();
  });

  describe("sendOtp", () => {
    it("should send OTP successfully", async () => {
      mockRequest.body = { email: "test@example.com" };
      mockFindOrCreateEmailUser.mockResolvedValue(mockUser);
      mockDeleteUserVerificationCodes.mockResolvedValue({ count: 0 });
      mockGenerateOtpCode.mockReturnValue("123456");
      mockGetOtpExpiryDate.mockReturnValue(new Date(Date.now() + 10 * 60 * 1000));
      mockCreateVerificationCode.mockResolvedValue({});
      mockSendOtpEmail.mockResolvedValue({ success: true });

      await sendOtp(
        mockRequest as Request,
        mockResponse as Response<{ message: string } | ErrorResponse>,
      );

      expect(mockFindOrCreateEmailUser).toHaveBeenCalledWith("test@example.com");
      expect(mockDeleteUserVerificationCodes).toHaveBeenCalledWith(mockUser.id);
      expect(mockCreateVerificationCode).toHaveBeenCalled();
      expect(mockSendOtpEmail).toHaveBeenCalledWith({
        to: "test@example.com",
        code: "123456",
        expiresInMinutes: 10,
      });
      expect(jsonMock).toHaveBeenCalledWith({
        message: "Verification code sent successfully",
      });
    });

    it("should return 400 when email is missing", async () => {
      mockRequest.body = {};

      await sendOtp(
        mockRequest as Request,
        mockResponse as Response<{ message: string } | ErrorResponse>,
      );

      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith({ message: "Email is required" });
    });

    it("should return 400 for invalid email format", async () => {
      mockRequest.body = { email: "invalid-email" };

      await sendOtp(
        mockRequest as Request,
        mockResponse as Response<{ message: string } | ErrorResponse>,
      );

      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith({ message: "Invalid email format" });
    });

    it("should return 500 when email fails to send", async () => {
      mockRequest.body = { email: "test@example.com" };
      mockFindOrCreateEmailUser.mockResolvedValue(mockUser);
      mockDeleteUserVerificationCodes.mockResolvedValue({ count: 0 });
      mockGenerateOtpCode.mockReturnValue("123456");
      mockGetOtpExpiryDate.mockReturnValue(new Date());
      mockCreateVerificationCode.mockResolvedValue({});
      mockSendOtpEmail.mockResolvedValue({ success: false, error: "SMTP error" });

      await sendOtp(
        mockRequest as Request,
        mockResponse as Response<{ message: string } | ErrorResponse>,
      );

      expect(statusMock).toHaveBeenCalledWith(500);
      expect(jsonMock).toHaveBeenCalledWith({
        message: "Failed to send verification email",
      });
    });

    it("should return 500 when database error occurs", async () => {
      mockRequest.body = { email: "test@example.com" };
      mockFindOrCreateEmailUser.mockRejectedValue(new Error("Database error"));

      await sendOtp(
        mockRequest as Request,
        mockResponse as Response<{ message: string } | ErrorResponse>,
      );

      expect(statusMock).toHaveBeenCalledWith(500);
      expect(jsonMock).toHaveBeenCalledWith({
        message: "Failed to send verification code",
      });
    });
  });

  describe("verifyOtp", () => {
    const mockVerificationCode = {
      id: "code-123",
      code: "123456",
      userId: "user-123",
      expiresAt: new Date(Date.now() + 10 * 60 * 1000),
      usedAt: null,
    };

    it("should verify OTP and authenticate user", async () => {
      mockRequest.body = { email: "test@example.com", code: "123456" };
      mockFindOrCreateEmailUser.mockResolvedValue(mockUser);
      mockGetValidVerificationCode.mockResolvedValue(mockVerificationCode);
      mockMarkVerificationCodeAsUsed.mockResolvedValue({});
      mockSignToken.mockReturnValue("jwt-token");

      await verifyOtp(
        mockRequest as Request,
        mockResponse as Response<AuthResponseDTO | ErrorResponse>,
      );

      expect(mockFindOrCreateEmailUser).toHaveBeenCalledWith("test@example.com");
      expect(mockGetValidVerificationCode).toHaveBeenCalledWith(mockUser.id, "123456");
      expect(mockMarkVerificationCodeAsUsed).toHaveBeenCalledWith(mockVerificationCode.id);
      expect(cookieMock).toHaveBeenCalledWith(
        "auth_token",
        "jwt-token",
        expect.any(Object),
      );
      expect(jsonMock).toHaveBeenCalledWith({
        user: expect.objectContaining({
          id: mockUser.id,
          email: mockUser.email,
        }),
        message: "Authentication successful",
      });
    });

    it("should return 400 when email or code is missing", async () => {
      mockRequest.body = { email: "test@example.com" };

      await verifyOtp(
        mockRequest as Request,
        mockResponse as Response<AuthResponseDTO | ErrorResponse>,
      );

      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith({
        message: "Email and code are required",
      });
    });

    it("should return 401 for invalid verification code", async () => {
      mockRequest.body = { email: "test@example.com", code: "wrong-code" };
      mockFindOrCreateEmailUser.mockResolvedValue(mockUser);
      mockGetValidVerificationCode.mockResolvedValue(null);

      await verifyOtp(
        mockRequest as Request,
        mockResponse as Response<AuthResponseDTO | ErrorResponse>,
      );

      expect(statusMock).toHaveBeenCalledWith(401);
      expect(jsonMock).toHaveBeenCalledWith({
        message: "Invalid or expired verification code",
      });
    });

    it("should return 500 on database error", async () => {
      mockRequest.body = { email: "test@example.com", code: "123456" };
      mockFindOrCreateEmailUser.mockRejectedValue(new Error("Database error"));

      await verifyOtp(
        mockRequest as Request,
        mockResponse as Response<AuthResponseDTO | ErrorResponse>,
      );

      expect(statusMock).toHaveBeenCalledWith(500);
      expect(jsonMock).toHaveBeenCalledWith({ message: "Failed to verify code" });
    });
  });

  describe("googleAuth", () => {
    it("should redirect to Google auth URL", () => {
      mockGetGoogleAuthUrl.mockReturnValue("https://accounts.google.com/oauth");

      googleAuth(mockRequest as Request, mockResponse as Response<ErrorResponse>);

      expect(mockGetGoogleAuthUrl).toHaveBeenCalled();
      expect(redirectMock).toHaveBeenCalledWith("https://accounts.google.com/oauth");
    });

    it("should return 500 when Google auth URL fails", () => {
      mockGetGoogleAuthUrl.mockImplementation(() => {
        throw new Error("Missing client ID");
      });

      googleAuth(mockRequest as Request, mockResponse as Response<ErrorResponse>);

      expect(statusMock).toHaveBeenCalledWith(500);
      expect(jsonMock).toHaveBeenCalledWith({
        message: "Failed to initiate Google authentication",
      });
    });
  });

  describe("googleAuthCallback", () => {
    const googleUser = {
      sub: "google-123",
      email: "test@example.com",
      name: "Test User",
      picture: "https://example.com/avatar.jpg",
    };

    const googleCreatedUser = {
      ...mockUser,
      provider: "Google",
      googleId: "google-123",
    };

    it("should authenticate with Google and redirect to frontend", async () => {
      mockRequest.query = { code: "auth-code" };
      mockHandleGoogleCallback.mockResolvedValue(googleUser);
      mockFindOrCreateGoogleUser.mockResolvedValue(googleCreatedUser);
      mockSignToken.mockReturnValue("jwt-token");

      await googleAuthCallback(
        mockRequest as Request,
        mockResponse as Response<AuthResponseDTO | ErrorResponse>,
      );

      expect(mockHandleGoogleCallback).toHaveBeenCalledWith("auth-code");
      expect(mockFindOrCreateGoogleUser).toHaveBeenCalledWith({
        googleId: "google-123",
        email: "test@example.com",
        name: "Test User",
        avatarUrl: "https://example.com/avatar.jpg",
      });
      expect(cookieMock).toHaveBeenCalled();
      expect(redirectMock).toHaveBeenCalledWith(
        "http://localhost:3001/auth/callback?success=true",
      );
    });

    it("should return 401 when Google returns an error", async () => {
      mockRequest.query = { error: "access_denied" };

      await googleAuthCallback(
        mockRequest as Request,
        mockResponse as Response<AuthResponseDTO | ErrorResponse>,
      );

      expect(statusMock).toHaveBeenCalledWith(401);
      expect(jsonMock).toHaveBeenCalledWith({
        message: "Google authentication failed: access_denied",
      });
    });

    it("should return 400 when authorization code is missing", async () => {
      mockRequest.query = {};

      await googleAuthCallback(
        mockRequest as Request,
        mockResponse as Response<AuthResponseDTO | ErrorResponse>,
      );

      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith({
        message: "Authorization code is missing",
      });
    });

    it("should redirect to error page on callback failure", async () => {
      mockRequest.query = { code: "auth-code" };
      mockHandleGoogleCallback.mockRejectedValue(new Error("Token exchange failed"));

      await googleAuthCallback(
        mockRequest as Request,
        mockResponse as Response<AuthResponseDTO | ErrorResponse>,
      );

      expect(redirectMock).toHaveBeenCalledWith(
        "http://localhost:3001/auth/callback?error=authentication_failed",
      );
    });
  });

  describe("logout", () => {
    it("should clear auth cookie and return success message", () => {
      logout(mockRequest as Request, mockResponse as Response<{ message: string }>);

      expect(clearCookieMock).toHaveBeenCalledWith(
        "auth_token",
        expect.objectContaining({
          httpOnly: true,
          path: "/",
        }),
      );
      expect(jsonMock).toHaveBeenCalledWith({ message: "Logged out successfully" });
    });
  });

  describe("getCurrentUser", () => {
    it("should return current user when authenticated", async () => {
      const authRequest = {
        ...mockRequest,
        user: {
          userId: "user-123",
          email: "test@example.com",
          role: "Customer",
        },
      } as AuthenticatedRequest;
      mockGetUserById.mockResolvedValue(mockUser);

      await getCurrentUser(authRequest, mockResponse as Response<UserDTO | ErrorResponse>);

      expect(mockGetUserById).toHaveBeenCalledWith("user-123");
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          id: mockUser.id,
          email: mockUser.email,
          name: mockUser.name,
        }),
      );
    });

    it("should return 401 when user is not authenticated", async () => {
      const authRequest = {
        ...mockRequest,
        user: undefined,
      } as AuthenticatedRequest;

      await getCurrentUser(authRequest, mockResponse as Response<UserDTO | ErrorResponse>);

      expect(statusMock).toHaveBeenCalledWith(401);
      expect(jsonMock).toHaveBeenCalledWith({ message: "Not authenticated" });
    });

    it("should return 404 when user not found in database", async () => {
      const authRequest = {
        ...mockRequest,
        user: {
          userId: "non-existent",
          email: "test@example.com",
          role: "Customer",
        },
      } as AuthenticatedRequest;
      mockGetUserById.mockResolvedValue(null);

      await getCurrentUser(authRequest, mockResponse as Response<UserDTO | ErrorResponse>);

      expect(statusMock).toHaveBeenCalledWith(404);
      expect(jsonMock).toHaveBeenCalledWith({ message: "User not found" });
    });

    it("should return 500 on database error", async () => {
      const authRequest = {
        ...mockRequest,
        user: {
          userId: "user-123",
          email: "test@example.com",
          role: "Customer",
        },
      } as AuthenticatedRequest;
      mockGetUserById.mockRejectedValue(new Error("Database error"));

      await getCurrentUser(authRequest, mockResponse as Response<UserDTO | ErrorResponse>);

      expect(statusMock).toHaveBeenCalledWith(500);
      expect(jsonMock).toHaveBeenCalledWith({ message: "Failed to get user" });
    });
  });
});
