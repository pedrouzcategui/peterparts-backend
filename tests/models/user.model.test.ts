import { jest } from "@jest/globals";

// Mock prisma
const mockUserCreate = jest.fn<any>();
const mockUserFindUnique = jest.fn<any>();
const mockUserFindMany = jest.fn<any>();
const mockUserUpdate = jest.fn<any>();
const mockUserDelete = jest.fn<any>();
const mockVerificationCodeCreate = jest.fn<any>();
const mockVerificationCodeFindFirst = jest.fn<any>();
const mockVerificationCodeUpdate = jest.fn<any>();
const mockVerificationCodeDeleteMany = jest.fn<any>();

jest.unstable_mockModule("@db/prisma", () => ({
  default: {
    user: {
      create: mockUserCreate,
      findUnique: mockUserFindUnique,
      findMany: mockUserFindMany,
      update: mockUserUpdate,
      delete: mockUserDelete,
    },
    verificationCode: {
      create: mockVerificationCodeCreate,
      findFirst: mockVerificationCodeFindFirst,
      update: mockVerificationCodeUpdate,
      deleteMany: mockVerificationCodeDeleteMany,
    },
  },
}));

const {
  createUser,
  getUserById,
  getUserByEmail,
  getUserByGoogleId,
  updateUser,
  deleteUser,
  listUsers,
  findOrCreateGoogleUser,
  findOrCreateEmailUser,
  createVerificationCode,
  getValidVerificationCode,
  markVerificationCodeAsUsed,
  deleteExpiredVerificationCodes,
  deleteUserVerificationCodes,
  generateOtpCode,
  OTP_EXPIRY_MINUTES,
  getOtpExpiryDate,
} = await import("@models/user.model");

describe("User Model", () => {
  const mockUser = {
    id: "user-123",
    email: "test@example.com",
    name: "Test User",
    avatarUrl: "https://example.com/avatar.jpg",
    role: "Customer",
    provider: "Email",
    googleId: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("createUser", () => {
    it("should create a user with email provider", async () => {
      mockUserCreate.mockResolvedValue(mockUser);

      const result = await createUser({
        email: "test@example.com",
        provider: "Email",
      });

      expect(mockUserCreate).toHaveBeenCalledWith({
        data: {
          email: "test@example.com",
          provider: "Email",
        },
      });
      expect(result).toEqual(mockUser);
    });

    it("should create a user with Google provider", async () => {
      const googleUser = { ...mockUser, provider: "Google", googleId: "google-123" };
      mockUserCreate.mockResolvedValue(googleUser);

      const result = await createUser({
        email: "test@example.com",
        provider: "Google",
        googleId: "google-123",
        name: "Test User",
      });

      expect(mockUserCreate).toHaveBeenCalledWith({
        data: {
          email: "test@example.com",
          provider: "Google",
          googleId: "google-123",
          name: "Test User",
        },
      });
      expect(result).toEqual(googleUser);
    });
  });

  describe("getUserById", () => {
    it("should return user when found", async () => {
      mockUserFindUnique.mockResolvedValue(mockUser);

      const result = await getUserById("user-123");

      expect(mockUserFindUnique).toHaveBeenCalledWith({
        where: { id: "user-123" },
      });
      expect(result).toEqual(mockUser);
    });

    it("should return null when user not found", async () => {
      mockUserFindUnique.mockResolvedValue(null);

      const result = await getUserById("non-existent");

      expect(result).toBeNull();
    });
  });

  describe("getUserByEmail", () => {
    it("should return user when found by email", async () => {
      mockUserFindUnique.mockResolvedValue(mockUser);

      const result = await getUserByEmail("test@example.com");

      expect(mockUserFindUnique).toHaveBeenCalledWith({
        where: { email: "test@example.com" },
      });
      expect(result).toEqual(mockUser);
    });
  });

  describe("getUserByGoogleId", () => {
    it("should return user when found by Google ID", async () => {
      const googleUser = { ...mockUser, googleId: "google-123" };
      mockUserFindUnique.mockResolvedValue(googleUser);

      const result = await getUserByGoogleId("google-123");

      expect(mockUserFindUnique).toHaveBeenCalledWith({
        where: { googleId: "google-123" },
      });
      expect(result).toEqual(googleUser);
    });
  });

  describe("updateUser", () => {
    it("should update user data", async () => {
      const updatedUser = { ...mockUser, name: "Updated Name" };
      mockUserUpdate.mockResolvedValue(updatedUser);

      const result = await updateUser("user-123", { name: "Updated Name" });

      expect(mockUserUpdate).toHaveBeenCalledWith({
        where: { id: "user-123" },
        data: { name: "Updated Name" },
      });
      expect(result).toEqual(updatedUser);
    });
  });

  describe("deleteUser", () => {
    it("should delete user by id", async () => {
      mockUserDelete.mockResolvedValue(mockUser);

      const result = await deleteUser("user-123");

      expect(mockUserDelete).toHaveBeenCalledWith({
        where: { id: "user-123" },
      });
      expect(result).toEqual(mockUser);
    });
  });

  describe("listUsers", () => {
    it("should return all users ordered by createdAt desc", async () => {
      const users = [mockUser, { ...mockUser, id: "user-456" }];
      mockUserFindMany.mockResolvedValue(users);

      const result = await listUsers();

      expect(mockUserFindMany).toHaveBeenCalledWith({
        orderBy: { createdAt: "desc" },
      });
      expect(result).toEqual(users);
    });
  });

  describe("findOrCreateGoogleUser", () => {
    it("should return existing user when found by googleId", async () => {
      const existingUser = { ...mockUser, googleId: "google-123", provider: "Google" };
      mockUserFindUnique.mockResolvedValueOnce(existingUser); // getUserByGoogleId
      mockUserUpdate.mockResolvedValue(existingUser);

      const result = await findOrCreateGoogleUser({
        googleId: "google-123",
        email: "test@example.com",
        name: "Test User",
      });

      expect(mockUserFindUnique).toHaveBeenCalledWith({
        where: { googleId: "google-123" },
      });
      expect(result).toEqual(existingUser);
    });

    it("should link Google to existing email user", async () => {
      mockUserFindUnique.mockResolvedValueOnce(null); // getUserByGoogleId
      mockUserFindUnique.mockResolvedValueOnce(mockUser); // getUserByEmail
      const linkedUser = { ...mockUser, googleId: "google-123" };
      mockUserUpdate.mockResolvedValue(linkedUser);

      const result = await findOrCreateGoogleUser({
        googleId: "google-123",
        email: "test@example.com",
        name: "New Name",
      });

      expect(mockUserUpdate).toHaveBeenCalledWith({
        where: { id: mockUser.id },
        data: {
          googleId: "google-123",
          name: "New Name",
        },
      });
      expect(result).toEqual(linkedUser);
    });

    it("should create new user when not found", async () => {
      mockUserFindUnique.mockResolvedValue(null); // Both calls return null
      const newUser = { ...mockUser, googleId: "google-123", provider: "Google" };
      mockUserCreate.mockResolvedValue(newUser);

      const result = await findOrCreateGoogleUser({
        googleId: "google-123",
        email: "new@example.com",
        name: "New User",
        avatarUrl: "https://example.com/avatar.jpg",
      });

      expect(mockUserCreate).toHaveBeenCalledWith({
        data: {
          email: "new@example.com",
          provider: "Google",
          googleId: "google-123",
          name: "New User",
          avatarUrl: "https://example.com/avatar.jpg",
        },
      });
      expect(result).toEqual(newUser);
    });
  });

  describe("findOrCreateEmailUser", () => {
    it("should return existing user when found", async () => {
      mockUserFindUnique.mockResolvedValue(mockUser);

      const result = await findOrCreateEmailUser("test@example.com");

      expect(mockUserFindUnique).toHaveBeenCalledWith({
        where: { email: "test@example.com" },
      });
      expect(result).toEqual(mockUser);
    });

    it("should create new user when not found", async () => {
      mockUserFindUnique.mockResolvedValue(null);
      mockUserCreate.mockResolvedValue(mockUser);

      const result = await findOrCreateEmailUser("new@example.com");

      expect(mockUserCreate).toHaveBeenCalledWith({
        data: {
          email: "new@example.com",
          provider: "Email",
        },
      });
      expect(result).toEqual(mockUser);
    });
  });
});

describe("Verification Code Operations", () => {
  const mockCode = {
    id: "code-123",
    code: "123456",
    userId: "user-123",
    expiresAt: new Date(Date.now() + 10 * 60 * 1000),
    usedAt: null,
    createdAt: new Date(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("createVerificationCode", () => {
    it("should create a verification code", async () => {
      mockVerificationCodeCreate.mockResolvedValue(mockCode);

      const result = await createVerificationCode({
        code: "123456",
        userId: "user-123",
        expiresAt: mockCode.expiresAt,
      });

      expect(mockVerificationCodeCreate).toHaveBeenCalledWith({
        data: {
          code: "123456",
          userId: "user-123",
          expiresAt: mockCode.expiresAt,
        },
      });
      expect(result).toEqual(mockCode);
    });
  });

  describe("getValidVerificationCode", () => {
    it("should return valid verification code", async () => {
      mockVerificationCodeFindFirst.mockResolvedValue(mockCode);

      const result = await getValidVerificationCode("user-123", "123456");

      expect(mockVerificationCodeFindFirst).toHaveBeenCalledWith({
        where: {
          userId: "user-123",
          code: "123456",
          expiresAt: { gt: expect.any(Date) },
          usedAt: null,
        },
      });
      expect(result).toEqual(mockCode);
    });

    it("should return null for invalid code", async () => {
      mockVerificationCodeFindFirst.mockResolvedValue(null);

      const result = await getValidVerificationCode("user-123", "wrong-code");

      expect(result).toBeNull();
    });
  });

  describe("markVerificationCodeAsUsed", () => {
    it("should mark code as used with timestamp", async () => {
      const usedCode = { ...mockCode, usedAt: new Date() };
      mockVerificationCodeUpdate.mockResolvedValue(usedCode);

      const result = await markVerificationCodeAsUsed("code-123");

      expect(mockVerificationCodeUpdate).toHaveBeenCalledWith({
        where: { id: "code-123" },
        data: { usedAt: expect.any(Date) },
      });
      expect(result).toEqual(usedCode);
    });
  });

  describe("deleteExpiredVerificationCodes", () => {
    it("should delete expired codes", async () => {
      mockVerificationCodeDeleteMany.mockResolvedValue({ count: 5 });

      const result = await deleteExpiredVerificationCodes();

      expect(mockVerificationCodeDeleteMany).toHaveBeenCalledWith({
        where: {
          expiresAt: { lt: expect.any(Date) },
        },
      });
      expect(result).toEqual({ count: 5 });
    });
  });

  describe("deleteUserVerificationCodes", () => {
    it("should delete unused codes for user", async () => {
      mockVerificationCodeDeleteMany.mockResolvedValue({ count: 2 });

      const result = await deleteUserVerificationCodes("user-123");

      expect(mockVerificationCodeDeleteMany).toHaveBeenCalledWith({
        where: {
          userId: "user-123",
          usedAt: null,
        },
      });
      expect(result).toEqual({ count: 2 });
    });
  });
});

describe("OTP Utilities", () => {
  describe("generateOtpCode", () => {
    it("should generate a 6-digit code", () => {
      const code = generateOtpCode();

      expect(code).toMatch(/^\d{6}$/);
    });

    it("should generate codes within valid range", () => {
      for (let i = 0; i < 100; i++) {
        const code = generateOtpCode();
        const num = parseInt(code, 10);
        expect(num).toBeGreaterThanOrEqual(100000);
        expect(num).toBeLessThan(1000000);
      }
    });

    it("should generate different codes", () => {
      const codes = new Set<string>();
      for (let i = 0; i < 100; i++) {
        codes.add(generateOtpCode());
      }
      // With 100 attempts, we should have mostly unique codes
      expect(codes.size).toBeGreaterThan(90);
    });
  });

  describe("OTP_EXPIRY_MINUTES", () => {
    it("should be 10 minutes", () => {
      expect(OTP_EXPIRY_MINUTES).toBe(10);
    });
  });

  describe("getOtpExpiryDate", () => {
    it("should return a date 10 minutes in the future", () => {
      const before = new Date();
      const expiryDate = getOtpExpiryDate();
      const after = new Date();

      const expectedMinMs = before.getTime() + 10 * 60 * 1000;
      const expectedMaxMs = after.getTime() + 10 * 60 * 1000;

      expect(expiryDate.getTime()).toBeGreaterThanOrEqual(expectedMinMs);
      expect(expiryDate.getTime()).toBeLessThanOrEqual(expectedMaxMs);
    });
  });
});
