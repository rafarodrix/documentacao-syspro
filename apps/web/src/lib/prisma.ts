import { PrismaClient } from "@prisma/client";

// Adiciona o prisma ao objeto global para persistir no Hot Reload
const globalForPrisma = global as unknown as { prisma: PrismaClient };

export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    log: ["query"], // Loga as queries no terminal (útil para debug)
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;