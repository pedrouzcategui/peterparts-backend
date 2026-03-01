import "dotenv/config";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../../prisma/generated/client.ts";

const ensureDatabaseUrl = (): void => {
  if (process.env.DATABASE_URL) {
    return;
  }

  const {
    PGHOST,
    PGDATABASE,
    PGUSER,
    PGPASSWORD,
    PGSSLMODE,
    PGCHANNELBINDING,
  } = process.env;

  if (!PGHOST || !PGDATABASE || !PGUSER || !PGPASSWORD) {
    return;
  }

  const params = new URLSearchParams();
  if (PGSSLMODE) {
    params.set("sslmode", PGSSLMODE);
  }
  if (PGCHANNELBINDING) {
    params.set("channel_binding", PGCHANNELBINDING);
  }

  const credentials = `${encodeURIComponent(PGUSER)}:${encodeURIComponent(PGPASSWORD)}`;
  const baseUrl = `postgresql://${credentials}@${PGHOST}/${PGDATABASE}`;
  const query = params.toString();

  process.env.DATABASE_URL = query ? `${baseUrl}?${query}` : baseUrl;
};

ensureDatabaseUrl();

const globalForPrisma = globalThis as typeof globalThis & {
  prisma?: PrismaClient;
};

const createPrismaClient = () => {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const adapter = new PrismaPg(pool);
  return new PrismaClient({ adapter });
};

const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

export const checkDatabaseConnection = async () => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    console.log("✅ Database connection successful");
  } catch (error) {
    console.error("❌ Database connection failed:", error);
    process.exit(1);
  }
};

export default prisma;
