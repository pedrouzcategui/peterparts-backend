import type { Response, NextFunction } from "express";
import type {
  AuthenticatedRequest,
  ErrorResponse,
  JWTPayload,
} from "@dto/index.ts";
import { verifyToken, COOKIE_NAME } from "@services/index.ts";

/**
 * Middleware to authenticate requests using JWT from cookie or Authorization header
 * Attaches user payload to req.user if valid
 */
export const authenticate = (
  req: AuthenticatedRequest,
  res: Response<ErrorResponse>,
  next: NextFunction,
): void => {
  // Try to get token from cookie first, then from Authorization header
  let token: string | undefined;

  // Check cookie
  if (req.cookies?.[COOKIE_NAME]) {
    token = req.cookies[COOKIE_NAME];
  }

  // Check Authorization header (Bearer token)
  if (!token) {
    const authHeader = req.headers.authorization;
    if (authHeader?.startsWith("Bearer ")) {
      token = authHeader.slice(7);
    }
  }

  if (!token) {
    res.status(401).json({ message: "Authentication required" });
    return;
  }

  const payload = verifyToken(token);

  if (!payload) {
    res.status(401).json({ message: "Invalid or expired token" });
    return;
  }

  req.user = payload;
  next();
};

/**
 * Middleware to optionally authenticate - doesn't fail if no token present
 * Useful for routes that work with or without authentication
 */
export const optionalAuthenticate = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): void => {
  let token: string | undefined;

  if (req.cookies?.[COOKIE_NAME]) {
    token = req.cookies[COOKIE_NAME];
  }

  if (!token) {
    const authHeader = req.headers.authorization;
    if (authHeader?.startsWith("Bearer ")) {
      token = authHeader.slice(7);
    }
  }

  if (token) {
    const payload = verifyToken(token);
    if (payload) {
      req.user = payload;
    }
  }

  next();
};

/**
 * Middleware to require specific role(s)
 * Must be used after authenticate middleware
 */
export const requireRole = (...roles: JWTPayload["role"][]) => {
  return (
    req: AuthenticatedRequest,
    res: Response<ErrorResponse>,
    next: NextFunction,
  ): void => {
    if (!req.user) {
      res.status(401).json({ message: "Authentication required" });
      return;
    }

    if (!roles.includes(req.user.role)) {
      res.status(403).json({ message: "Insufficient permissions" });
      return;
    }

    next();
  };
};

/**
 * Middleware to require Admin role
 */
export const requireAdmin = requireRole("Admin");

/**
 * Middleware to require Customer role (or higher - Admin can also access)
 */
export const requireCustomer = requireRole("Customer", "Admin");
