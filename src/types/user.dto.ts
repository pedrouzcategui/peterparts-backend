import type { AuthProvider, Role } from "../../prisma/generated/client.ts";

export type UserDTO = {
  id: string;
  email: string;
  name: string | null;
  avatarUrl: string | null;
  role: Role;
  provider: AuthProvider;
  createdAt: Date;
  updatedAt: Date;
};

export type CreateUserDTO = {
  email: string;
  name?: string;
  avatarUrl?: string;
  provider: AuthProvider;
  googleId?: string;
};

export type UpdateUserDTO = Partial<
  Omit<CreateUserDTO, "provider" | "googleId">
>;

// Auth Request/Response DTOs
export type SendOtpRequestDTO = {
  email: string;
};

export type VerifyOtpRequestDTO = {
  email: string;
  code: string;
};

export type GoogleAuthCallbackDTO = {
  code: string;
};

export type AuthResponseDTO = {
  user: UserDTO;
  message: string;
};

export type JWTPayload = {
  userId: string;
  email: string;
  role: Role;
};
