import { prisma } from "@dosc-syspro/database";
import { ApiError, createRouter, defineMutation, defineQuery } from "../router";

function canUseGlobalScope(role: string) {
  return role === "ADMIN" || role === "DEVELOPER" || role === "SUPORTE";
}

function resolveScopedCompanyIds(session: { role: string; companyIds?: string[] } | null | undefined) {
  if (!session) return [];
  if (canUseGlobalScope(session.role)) return null;
  return session.companyIds?.filter(Boolean) ?? [];
}

function ensureObject(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new ApiError("Payload invalido para contrato.", "BAD_REQUEST");
  }
  return value as Record<string, unknown>;
}

function readOptionalString(record: Record<string, unknown>, key: string) {
  const value = record[key];
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed || undefined;
}

function readNumber(record: Record<string, unknown>, key: string, fallback?: number) {
  const value = record[key];
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  if (typeof fallback !== "undefined") return fallback;
  throw new ApiError(`Campo numerico invalido: ${key}.`, "BAD_REQUEST");
}

function readOptionalDate(record: Record<string, unknown>, key: string) {
  const value = record[key];
  if (!value) return undefined;
  if (value instanceof Date) return value;
  if (typeof value !== "string") throw new ApiError(`Campo de data invalido: ${key}.`, "BAD_REQUEST");
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) throw new ApiError(`Campo de data invalido: ${key}.`, "BAD_REQUEST");
  return parsed;
}

function readOptionalStatus(record: Record<string, unknown>, key: string) {
  const value = readOptionalString(record, key);
  if (!value) return undefined;
  if (!["ACTIVE", "CANCELLED", "SUSPENDED"].includes(value)) {
    throw new ApiError("Status de contrato invalido.", "BAD_REQUEST");
  }
  return value as "ACTIVE" | "CANCELLED" | "SUSPENDED";
}

export const contractsRouter = createRouter({
  list: defineQuery({
    auth: "role",
    roles: ["ADMIN", "DEVELOPER", "SUPORTE", "CLIENTE_ADMIN"],
    handler: async ({ ctx }) => {
      const scopedIds = resolveScopedCompanyIds(ctx.session);

      if (Array.isArray(scopedIds) && scopedIds.length === 0) {
        return [];
      }

      const contracts = await prisma.contract.findMany({
        where: {
          ...(Array.isArray(scopedIds) ? { companyId: { in: scopedIds } } : {}),
        },
        select: {
          id: true,
          companyId: true,
          contractNumber: true,
          status: true,
          startDate: true,
          endDate: true,
          percentage: true,
          minimumWage: true,
          taxRate: true,
          programmerRate: true,
          totalValue: true,
          updatedAt: true,
          company: {
            select: {
              id: true,
              razaoSocial: true,
              nomeFantasia: true,
            },
          },
        },
        orderBy: [{ updatedAt: "desc" }],
        take: 200,
      });

      return contracts;
    },
  }),
  save: defineMutation<{ payload: unknown }, unknown>({
    auth: "role",
    roles: ["ADMIN", "DEVELOPER", "SUPORTE"],
    handler: async ({ ctx, input }) => {
      const payload = ensureObject(input.payload);
      const scopedIds = resolveScopedCompanyIds(ctx.session);
      const companyId = readOptionalString(payload, "companyId");

      if (!companyId) {
        throw new ApiError("companyId obrigatorio para salvar contrato.", "BAD_REQUEST");
      }

      if (Array.isArray(scopedIds) && !scopedIds.includes(companyId)) {
        throw new ApiError("Permissao negada para esta empresa.", "FORBIDDEN");
      }

      const contractId = readOptionalString(payload, "contractId") ?? readOptionalString(payload, "id");
      const writeData = {
        companyId,
        contractNumber: readOptionalString(payload, "contractNumber"),
        notes: readOptionalString(payload, "notes"),
        status: readOptionalStatus(payload, "status") ?? "ACTIVE",
        startDate: readOptionalDate(payload, "startDate") ?? new Date(),
        endDate: readOptionalDate(payload, "endDate") ?? null,
        percentage: readNumber(payload, "percentage", 0),
        minimumWage: readNumber(payload, "minimumWage", 0),
        taxRate: readNumber(payload, "taxRate", 0),
        programmerRate: readNumber(payload, "programmerRate", 0),
        totalValue: readNumber(payload, "totalValue", 0),
      };

      if (contractId) {
        const updated = await prisma.contract.update({
          where: { id: contractId },
          data: writeData,
          select: {
            id: true,
            companyId: true,
            contractNumber: true,
            status: true,
            updatedAt: true,
          },
        });

        return { operation: "update", contract: updated };
      }

      const created = await prisma.contract.create({
        data: writeData,
        select: {
          id: true,
          companyId: true,
          contractNumber: true,
          status: true,
          updatedAt: true,
        },
      });

      return { operation: "create", contract: created };
    },
  }),
});