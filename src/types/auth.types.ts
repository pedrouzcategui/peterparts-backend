import type { Request } from "express";
import type { JWTPayload } from "./user.dto.ts";

// Extend Express Request to include user from JWT
export interface AuthenticatedRequest extends Request {
  user?: JWTPayload;
}

// Google OAuth profile returned from Google
export type GoogleProfile = {
  id: string;
  email: string;
  name: string;
  picture?: string;
};

// Google OAuth token response
export type GoogleTokenResponse = {
  access_token: string;
  token_type: string;
  expires_in: number;
  scope: string;
  id_token: string;
};

// Google user info from token
export type GoogleUserInfo = {
  sub: string;
  email: string;
  email_verified: boolean;
  name: string;
  picture?: string;
  given_name?: string;
  family_name?: string;
};
