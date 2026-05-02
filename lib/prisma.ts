import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
    // Handle Neon serverless cold starts: when the compute scales to zero,
    // existing pooled connections die with "Error { kind: Closed, cause: None }".
    // Shorter pool timeout forces Prisma to create fresh connections instead of
    // reusing stale ones. Connection limit prevents exhausting Neon's pool.
    datasourceUrl: appendPoolParams(process.env.DATABASE_URL),
  });

// Cache globally in ALL environments:
// - Development: prevents hot-reload from creating multiple clients
// - Production: prevents serverless cold starts from exhausting Neon pool
globalForPrisma.prisma = prisma;

function appendPoolParams(url: string | undefined): string | undefined {
  if (!url) return url;
  const separator = url.includes("?") ? "&" : "?";
  return `${url}${separator}connect_timeout=15&pool_timeout=15`;
}
