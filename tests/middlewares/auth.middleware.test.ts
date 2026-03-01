import { jest } from "@jest/globals";
import type { Response, NextFunction } from "express";
import type { AuthenticatedRequest, ErrorResponse } from "@dto/index";

// Mock the services
const mockVerifyToken = jest.fn<any>();
const MOCK_COOKIE_NAME = "auth_token";

jest.unstable_mockModule("@services/index", () => ({
  verifyToken: mockVerifyToken,
  COOKIE_NAME: MOCK_COOKIE_NAME,
}));

const { authenticate, optionalAuthenticate, requireRole, requireAdmin, requireCustomer } =
  await import("@middlewares/auth.middleware");

describe("Auth Middleware", () => {
  let mockRequest: Partial<AuthenticatedRequest>;
  let mockResponse: Partial<Response<ErrorResponse>>;
  let mockNext: NextFunction;
  let jsonMock: jest.Mock;
  let statusMock: jest.Mock;

  beforeEach(() => {
    jsonMock = jest.fn<any>() as any;
    statusMock = jest.fn<any>().mockReturnThis() as any;
    mockNext = jest.fn() as any;

    mockRequest = {
      cookies: {},
      headers: {},
    };

    mockResponse = {
      json: jsonMock,
      status: statusMock,
    } as any;

    jest.clearAllMocks();
  });

  describe("authenticate", () => {
    it("should authenticate with valid cookie token", () => {
      const payload = {
        userId: "user-123",
        email: "test@example.com",
        role: "Customer",
      };
      mockRequest.cookies = { [MOCK_COOKIE_NAME]: "valid-token" };
      mockVerifyToken.mockReturnValue(payload);

      authenticate(
        mockRequest as AuthenticatedRequest,
        mockResponse as Response<ErrorResponse>,
        mockNext,
      );

      expect(mockVerifyToken).toHaveBeenCalledWith("valid-token");
      expect(mockRequest.user).toEqual(payload);
      expect(mockNext).toHaveBeenCalled();
      expect(statusMock).not.toHaveBeenCalled();
    });

    it("should authenticate with valid Bearer token", () => {
      const payload = {
        userId: "user-123",
        email: "test@example.com",
        role: "Customer",
      };
      mockRequest.headers = { authorization: "Bearer valid-token" };
      mockVerifyToken.mockReturnValue(payload);

      authenticate(
        mockRequest as AuthenticatedRequest,
        mockResponse as Response<ErrorResponse>,
        mockNext,
      );

      expect(mockVerifyToken).toHaveBeenCalledWith("valid-token");
      expect(mockRequest.user).toEqual(payload);
      expect(mockNext).toHaveBeenCalled();
    });

    it("should prefer cookie token over Authorization header", () => {
      const payload = { userId: "user-123", email: "test@example.com", role: "Customer" };
      mockRequest.cookies = { [MOCK_COOKIE_NAME]: "cookie-token" };
      mockRequest.headers = { authorization: "Bearer header-token" };
      mockVerifyToken.mockReturnValue(payload);

      authenticate(
        mockRequest as AuthenticatedRequest,
        mockResponse as Response<ErrorResponse>,
        mockNext,
      );

      expect(mockVerifyToken).toHaveBeenCalledWith("cookie-token");
    });

    it("should return 401 when no token provided", () => {
      authenticate(
        mockRequest as AuthenticatedRequest,
        mockResponse as Response<ErrorResponse>,
        mockNext,
      );

      expect(statusMock).toHaveBeenCalledWith(401);
      expect(jsonMock).toHaveBeenCalledWith({ message: "Authentication required" });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it("should return 401 when token is invalid", () => {
      mockRequest.cookies = { [MOCK_COOKIE_NAME]: "invalid-token" };
      mockVerifyToken.mockReturnValue(null);

      authenticate(
        mockRequest as AuthenticatedRequest,
        mockResponse as Response<ErrorResponse>,
        mockNext,
      );

      expect(statusMock).toHaveBeenCalledWith(401);
      expect(jsonMock).toHaveBeenCalledWith({ message: "Invalid or expired token" });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it("should handle malformed Authorization header", () => {
      mockRequest.headers = { authorization: "NotBearer token" };

      authenticate(
        mockRequest as AuthenticatedRequest,
        mockResponse as Response<ErrorResponse>,
        mockNext,
      );

      expect(statusMock).toHaveBeenCalledWith(401);
      expect(jsonMock).toHaveBeenCalledWith({ message: "Authentication required" });
    });
  });

  describe("optionalAuthenticate", () => {
    it("should set user when valid token present", () => {
      const payload = {
        userId: "user-123",
        email: "test@example.com",
        role: "Customer",
      };
      mockRequest.cookies = { [MOCK_COOKIE_NAME]: "valid-token" };
      mockVerifyToken.mockReturnValue(payload);

      optionalAuthenticate(
        mockRequest as AuthenticatedRequest,
        mockResponse as Response,
        mockNext,
      );

      expect(mockRequest.user).toEqual(payload);
      expect(mockNext).toHaveBeenCalled();
    });

    it("should continue without user when no token present", () => {
      optionalAuthenticate(
        mockRequest as AuthenticatedRequest,
        mockResponse as Response,
        mockNext,
      );

      expect(mockRequest.user).toBeUndefined();
      expect(mockNext).toHaveBeenCalled();
      expect(statusMock).not.toHaveBeenCalled();
    });

    it("should continue without user when token is invalid", () => {
      mockRequest.cookies = { [MOCK_COOKIE_NAME]: "invalid-token" };
      mockVerifyToken.mockReturnValue(null);

      optionalAuthenticate(
        mockRequest as AuthenticatedRequest,
        mockResponse as Response,
        mockNext,
      );

      expect(mockRequest.user).toBeUndefined();
      expect(mockNext).toHaveBeenCalled();
    });

    it("should authenticate with Bearer token", () => {
      const payload = { userId: "user-123", email: "test@example.com", role: "Customer" };
      mockRequest.headers = { authorization: "Bearer valid-token" };
      mockVerifyToken.mockReturnValue(payload);

      optionalAuthenticate(
        mockRequest as AuthenticatedRequest,
        mockResponse as Response,
        mockNext,
      );

      expect(mockRequest.user).toEqual(payload);
      expect(mockNext).toHaveBeenCalled();
    });
  });

  describe("requireRole", () => {
    it("should allow access for matching role", () => {
      mockRequest.user = {
        userId: "user-123",
        email: "test@example.com",
        role: "Admin",
      };

      const middleware = requireRole("Admin");
      middleware(
        mockRequest as AuthenticatedRequest,
        mockResponse as Response<ErrorResponse>,
        mockNext,
      );

      expect(mockNext).toHaveBeenCalled();
      expect(statusMock).not.toHaveBeenCalled();
    });

    it("should allow access when user has one of multiple allowed roles", () => {
      mockRequest.user = {
        userId: "user-123",
        email: "test@example.com",
        role: "Customer",
      };

      const middleware = requireRole("Admin", "Customer");
      middleware(
        mockRequest as AuthenticatedRequest,
        mockResponse as Response<ErrorResponse>,
        mockNext,
      );

      expect(mockNext).toHaveBeenCalled();
    });

    it("should return 401 when user is not authenticated", () => {
      const middleware = requireRole("Admin");
      middleware(
        mockRequest as AuthenticatedRequest,
        mockResponse as Response<ErrorResponse>,
        mockNext,
      );

      expect(statusMock).toHaveBeenCalledWith(401);
      expect(jsonMock).toHaveBeenCalledWith({ message: "Authentication required" });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it("should return 403 when user role does not match", () => {
      mockRequest.user = {
        userId: "user-123",
        email: "test@example.com",
        role: "Customer",
      };

      const middleware = requireRole("Admin");
      middleware(
        mockRequest as AuthenticatedRequest,
        mockResponse as Response<ErrorResponse>,
        mockNext,
      );

      expect(statusMock).toHaveBeenCalledWith(403);
      expect(jsonMock).toHaveBeenCalledWith({ message: "Insufficient permissions" });
      expect(mockNext).not.toHaveBeenCalled();
    });
  });

  describe("requireAdmin", () => {
    it("should allow Admin users", () => {
      mockRequest.user = {
        userId: "admin-123",
        email: "admin@example.com",
        role: "Admin",
      };

      requireAdmin(
        mockRequest as AuthenticatedRequest,
        mockResponse as Response<ErrorResponse>,
        mockNext,
      );

      expect(mockNext).toHaveBeenCalled();
    });

    it("should deny Customer users", () => {
      mockRequest.user = {
        userId: "user-123",
        email: "user@example.com",
        role: "Customer",
      };

      requireAdmin(
        mockRequest as AuthenticatedRequest,
        mockResponse as Response<ErrorResponse>,
        mockNext,
      );

      expect(statusMock).toHaveBeenCalledWith(403);
      expect(jsonMock).toHaveBeenCalledWith({ message: "Insufficient permissions" });
    });
  });

  describe("requireCustomer", () => {
    it("should allow Customer users", () => {
      mockRequest.user = {
        userId: "user-123",
        email: "user@example.com",
        role: "Customer",
      };

      requireCustomer(
        mockRequest as AuthenticatedRequest,
        mockResponse as Response<ErrorResponse>,
        mockNext,
      );

      expect(mockNext).toHaveBeenCalled();
    });

    it("should allow Admin users (Admin has elevated access)", () => {
      mockRequest.user = {
        userId: "admin-123",
        email: "admin@example.com",
        role: "Admin",
      };

      requireCustomer(
        mockRequest as AuthenticatedRequest,
        mockResponse as Response<ErrorResponse>,
        mockNext,
      );

      expect(mockNext).toHaveBeenCalled();
    });
  });
});
