import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as typeof globalThis & {
  __doscPrisma?: PrismaClient;
};

export const prisma =
  globalForPrisma.__doscPrisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["query"] : [],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.__doscPrisma = prisma;
}