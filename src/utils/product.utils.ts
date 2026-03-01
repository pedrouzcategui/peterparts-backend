import { Brand, Prisma } from "../../prisma/generated/client.ts";

export const isBrand = (value: unknown): value is Brand =>
  value === Brand.Cuisinart || value === Brand.Kitchenaid;

export const normalizePrice = (value: unknown): string | number | null => {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === "string" && value.trim().length > 0) {
    return value.trim();
  }
  return null;
};

export const normalizeImages = (value: unknown): string[] | null => {
  if (!Array.isArray(value)) {
    return null;
  }

  const images = value.filter((item) => typeof item === "string");
  return images.length === value.length ? images : null;
};

export const normalizeStock = (value: unknown): number | undefined | null => {
  if (value === undefined) {
    return undefined;
  }
  if (typeof value === "number" && Number.isFinite(value)) {
    return Math.trunc(value);
  }
  if (typeof value === "string") {
    const parsed = Number.parseInt(value, 10);
    return Number.isNaN(parsed) ? null : parsed;
  }
  return null;
};

export const isKnownPrismaNotFound = (error: unknown): boolean =>
  error instanceof Prisma.PrismaClientKnownRequestError &&
  error.code === "P2025";
