import { jest } from "@jest/globals";

// Mock jsonwebtoken before importing
const mockSign = jest.fn<any>();
const mockVerify = jest.fn<any>();
const mockDecode = jest.fn<any>();

jest.unstable_mockModule("jsonwebtoken", () => ({
  default: {
    sign: mockSign,
    verify: mockVerify,
    decode: mockDecode,
  },
}));

// Import after mocking
const { signToken, verifyToken, decodeToken, COOKIE_NAME, getCookieOptions } =
  await import("@services/jwt/jwt.service");

describe("JWT Service", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("signToken", () => {
    it("should sign a token with the payload", () => {
      const payload = {
        userId: "user-123",
        email: "test@example.com",
        role: "Customer" as const,
      };
      const mockToken = "signed-jwt-token";
      mockSign.mockReturnValue(mockToken);

      const result = signToken(payload);

      expect(mockSign).toHaveBeenCalledWith(
        payload,
        expect.any(String),
        expect.objectContaining({
          expiresIn: expect.any(Number),
        }),
      );
      expect(result).toBe(mockToken);
    });

    it("should sign token with Admin role", () => {
      const payload = {
        userId: "admin-123",
        email: "admin@example.com",
        role: "Admin" as const,
      };
      mockSign.mockReturnValue("admin-token");

      const result = signToken(payload);

      expect(mockSign).toHaveBeenCalledWith(
        payload,
        expect.any(String),
        expect.any(Object),
      );
      expect(result).toBe("admin-token");
    });
  });

  describe("verifyToken", () => {
    it("should return payload for valid token", () => {
      const expectedPayload = {
        userId: "user-123",
        email: "test@example.com",
        role: "Customer",
      };
      mockVerify.mockReturnValue(expectedPayload);

      const result = verifyToken("valid-token");

      expect(mockVerify).toHaveBeenCalledWith("valid-token", expect.any(String));
      expect(result).toEqual(expectedPayload);
    });

    it("should return null for invalid token", () => {
      mockVerify.mockImplementation(() => {
        throw new Error("invalid token");
      });

      const result = verifyToken("invalid-token");

      expect(result).toBeNull();
    });

    it("should return null for expired token", () => {
      mockVerify.mockImplementation(() => {
        throw new Error("jwt expired");
      });

      const result = verifyToken("expired-token");

      expect(result).toBeNull();
    });
  });

  describe("decodeToken", () => {
    it("should decode a valid token without verification", () => {
      const expectedPayload = {
        userId: "user-123",
        email: "test@example.com",
        role: "Customer",
      };
      mockDecode.mockReturnValue(expectedPayload);

      const result = decodeToken("some-token");

      expect(mockDecode).toHaveBeenCalledWith("some-token");
      expect(result).toEqual(expectedPayload);
    });

    it("should return null for invalid token", () => {
      mockDecode.mockImplementation(() => {
        throw new Error("invalid token");
      });

      const result = decodeToken("invalid-token");

      expect(result).toBeNull();
    });
  });

  describe("COOKIE_NAME", () => {
    it("should be defined as auth_token", () => {
      expect(COOKIE_NAME).toBe("auth_token");
    });
  });

  describe("getCookieOptions", () => {
    it("should return production options when isProduction is true", () => {
      const options = getCookieOptions(true);

      expect(options).toEqual({
        httpOnly: true,
        secure: true,
        sameSite: "strict",
        maxAge: 7 * 24 * 60 * 60 * 1000,
        path: "/",
      });
    });

    it("should return development options when isProduction is false", () => {
      const options = getCookieOptions(false);

      expect(options).toEqual({
        httpOnly: true,
        secure: false,
        sameSite: "lax",
        maxAge: 7 * 24 * 60 * 60 * 1000,
        path: "/",
      });
    });

    it("should always set httpOnly to true for security", () => {
      expect(getCookieOptions(true).httpOnly).toBe(true);
      expect(getCookieOptions(false).httpOnly).toBe(true);
    });

    it("should set maxAge to 7 days in milliseconds", () => {
      const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;
      expect(getCookieOptions(true).maxAge).toBe(sevenDaysMs);
      expect(getCookieOptions(false).maxAge).toBe(sevenDaysMs);
    });
  });
});
