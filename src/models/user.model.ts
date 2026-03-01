import type { AuthProvider } from "../../prisma/generated/client.ts";
import prisma from "@db/prisma.ts";

// User Input Types
export type CreateUserInput = {
  email: string;
  name?: string;
  avatarUrl?: string;
  provider: AuthProvider;
  googleId?: string;
};

export type UpdateUserInput = Partial<
  Omit<CreateUserInput, "provider" | "googleId">
>;

// User CRUD Operations
export const createUser = (data: CreateUserInput) =>
  prisma.user.create({ data });

export const getUserById = (id: string) =>
  prisma.user.findUnique({ where: { id } });

export const getUserByEmail = (email: string) =>
  prisma.user.findUnique({ where: { email } });

export const getUserByGoogleId = (googleId: string) =>
  prisma.user.findUnique({ where: { googleId } });

export const updateUser = (id: string, data: UpdateUserInput) =>
  prisma.user.update({ where: { id }, data });

export const deleteUser = (id: string) => prisma.user.delete({ where: { id } });

export const listUsers = () =>
  prisma.user.findMany({ orderBy: { createdAt: "desc" } });

// Find or create user for OAuth providers
export const findOrCreateGoogleUser = async (profile: {
  googleId: string;
  email: string;
  name?: string;
  avatarUrl?: string;
}) => {
  const existingUser = await getUserByGoogleId(profile.googleId);

  if (existingUser) {
    // Optionally update avatar/name if changed
    return prisma.user.update({
      where: { id: existingUser.id },
      data: {
        ...(profile.name && { name: profile.name }),
        ...(profile.avatarUrl && { avatarUrl: profile.avatarUrl }),
      },
    });
  }

  // Check if user exists with this email but different provider
  const emailUser = await getUserByEmail(profile.email);
  if (emailUser) {
    // Link Google account to existing email user
    return prisma.user.update({
      where: { id: emailUser.id },
      data: {
        googleId: profile.googleId,
        ...(profile.name && { name: profile.name }),
        ...(profile.avatarUrl && { avatarUrl: profile.avatarUrl }),
      },
    });
  }

  // Create new user
  return createUser({
    email: profile.email,
    provider: "Google",
    googleId: profile.googleId,
    ...(profile.name && { name: profile.name }),
    ...(profile.avatarUrl && { avatarUrl: profile.avatarUrl }),
  });
};

// Find or create user for email OTP
export const findOrCreateEmailUser = async (email: string) => {
  const existingUser = await getUserByEmail(email);

  if (existingUser) {
    return existingUser;
  }

  return createUser({
    email,
    provider: "Email",
  });
};

// Verification Code Operations
export type CreateVerificationCodeInput = {
  code: string;
  userId: string;
  expiresAt: Date;
};

export const createVerificationCode = (data: CreateVerificationCodeInput) =>
  prisma.verificationCode.create({ data });

export const getValidVerificationCode = (userId: string, code: string) =>
  prisma.verificationCode.findFirst({
    where: {
      userId,
      code,
      expiresAt: { gt: new Date() },
      usedAt: null,
    },
  });

export const markVerificationCodeAsUsed = (id: string) =>
  prisma.verificationCode.update({
    where: { id },
    data: { usedAt: new Date() },
  });

export const deleteExpiredVerificationCodes = () =>
  prisma.verificationCode.deleteMany({
    where: {
      expiresAt: { lt: new Date() },
    },
  });

// Delete all unused codes for a user (cleanup before creating new one)
export const deleteUserVerificationCodes = (userId: string) =>
  prisma.verificationCode.deleteMany({
    where: {
      userId,
      usedAt: null,
    },
  });

// Generate a 6-digit OTP code
export const generateOtpCode = (): string => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// OTP expiry time in minutes
export const OTP_EXPIRY_MINUTES = 10;

export const getOtpExpiryDate = (): Date => {
  const expiresAt = new Date();
  expiresAt.setMinutes(expiresAt.getMinutes() + OTP_EXPIRY_MINUTES);
  return expiresAt;
};
