import { PrismaClient } from "@prisma/client";

import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";
const { Pool } = pg;

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);

const globalForPrisma = global as unknown as { prisma: PrismaClient };

const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    adapter,
    log:
      process.env.NODE_ENV === "development"
        ? ["query", "error", "warn"]
        : ["error"],
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

/** Close Prisma and the underlying pg pool (used on graceful shutdown). */
export async function closeDb(): Promise<void> {
  await prisma.$disconnect();
  // The adapter may already have closed the pool; ending twice throws.
  try {
    await pool.end();
  } catch {
    /* already closed */
  }
}

export default prisma;
