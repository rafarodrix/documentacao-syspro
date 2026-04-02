import { prisma } from "@dosc-syspro/database";
import { ApiError, createRouter, defineMutation, defineQuery } from "../router";

function ensureObject(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new ApiError("Payload invalido para tax.syncChunk.", "BAD_REQUEST");
  }
  return value as Record<string, unknown>;
}

function readString(record: Record<string, unknown>, key: string, fallback: string) {
  const value = record[key];
  if (typeof value === "string" && value.trim()) return value.trim();
  return fallback;
}

function readOptionalNumber(record: Record<string, unknown>, key: string) {
  const value = record[key];
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return undefined;
}

export const taxRouter = createRouter({
  overview: defineQuery({
    auth: "authenticated",
    handler: async () => {
      const [
        taxCstCount,
        taxClassificationCount,
        taxNcmCount,
        taxAnexoCount,
        taxCredPresumidoCount,
        latestSyncJob,
      ] = await Promise.all([
        prisma.taxCST.count(),
        prisma.taxClassification.count(),
        prisma.taxNcm.count(),
        prisma.taxAnexo.count(),
        prisma.taxCredPresumido.count(),
        prisma.taxSyncJob.findFirst({ orderBy: [{ createdAt: "desc" }] }),
      ]);

      return {
        catalogs: {
          cst: taxCstCount,
          classification: taxClassificationCount,
          ncm: taxNcmCount,
          anexo: taxAnexoCount,
          credPresumido: taxCredPresumidoCount,
        },
        latestSyncJob,
      };
    },
  }),
  syncChunk: defineMutation<{ payload: unknown }, unknown>({
    auth: "role",
    roles: ["ADMIN", "DEVELOPER", "SUPORTE"],
    handler: async ({ input }) => {
      const payload = ensureObject(input.payload);
      const now = new Date();

      const mode = readString(payload, "mode", "manual");
      const source = readString(payload, "source", "apps-api");
      const totalChunks = readOptionalNumber(payload, "totalChunks") ?? 1;
      const currentChunk = readOptionalNumber(payload, "currentChunk") ?? 1;
      const totalItems = readOptionalNumber(payload, "totalItems") ?? 0;
      const processedItems = readOptionalNumber(payload, "processedItems") ?? 0;

      const job = await prisma.taxSyncJob.create({
        data: {
          mode,
          source,
          status: "PENDING",
          snapshotVersion: now.toISOString(),
          totalChunks,
          currentChunk,
          totalItems,
          processedItems,
        },
        select: {
          id: true,
          mode: true,
          source: true,
          status: true,
          totalChunks: true,
          currentChunk: true,
          totalItems: true,
          processedItems: true,
          createdAt: true,
        },
      });

      return {
        accepted: true,
        job,
      };
    },
  }),
});