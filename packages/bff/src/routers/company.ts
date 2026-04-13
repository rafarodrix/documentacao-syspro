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
    throw new ApiError("Payload invalido para empresa.", "BAD_REQUEST");
  }
  return value as Record<string, unknown>;
}

function readOptionalString(record: Record<string, unknown>, key: string) {
  const value = record[key];
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed || undefined;
}

function readOptionalStatus(record: Record<string, unknown>, key: string) {
  const value = readOptionalString(record, key);
  if (!value) return undefined;
  if (!["ACTIVE", "INACTIVE", "SUSPENDED", "PENDING_DOCS"].includes(value)) {
    throw new ApiError("Status de empresa invalido.", "BAD_REQUEST");
  }
  return value as "ACTIVE" | "INACTIVE" | "SUSPENDED" | "PENDING_DOCS";
}

export const companyRouter = createRouter({
  list: defineQuery({
    auth: "role",
    roles: ["ADMIN", "DEVELOPER", "SUPORTE", "CLIENTE_ADMIN"],
    handler: async ({ ctx }) => {
      const scopedIds = resolveScopedCompanyIds(ctx.session);

      if (Array.isArray(scopedIds) && scopedIds.length === 0) {
        return [];
      }

      const companies = await prisma.company.findMany({
        where: {
          deletedAt: null,
          ...(Array.isArray(scopedIds) ? { id: { in: scopedIds } } : {}),
        },
        select: {
          id: true,
          cnpj: true,
          razaoSocial: true,
          nomeFantasia: true,
          status: true,
          updatedAt: true,
        },
        orderBy: [{ razaoSocial: "asc" }],
        take: 200,
      });

      return companies;
    },
  }),
  byId: defineQuery<{ companyId: string }, unknown>({
    auth: "role",
    roles: ["ADMIN", "DEVELOPER", "SUPORTE", "CLIENTE_ADMIN"],
    handler: async ({ ctx, input }) => {
      const companyId = input.companyId?.trim();
      if (!companyId) {
        throw new ApiError("companyId obrigatorio.", "BAD_REQUEST");
      }

      const scopedIds = resolveScopedCompanyIds(ctx.session);
      if (Array.isArray(scopedIds) && !scopedIds.includes(companyId)) {
        throw new ApiError("Permissao negada para esta empresa.", "FORBIDDEN");
      }

      const company = await prisma.company.findFirst({
        where: { id: companyId, deletedAt: null },
        select: {
          id: true,
          cnpj: true,
          razaoSocial: true,
          nomeFantasia: true,
          status: true,
          emailContato: true,
          telefone: true,
          whatsapp: true,
          observacoes: true,
          updatedAt: true,
        },
      });

      if (!company) {
        throw new ApiError("Empresa nao encontrada.", "BAD_REQUEST");
      }

      return company;
    },
  }),
  save: defineMutation<{ companyId?: string; payload: unknown }, unknown>({
    auth: "role",
    roles: ["ADMIN", "DEVELOPER", "SUPORTE", "CLIENTE_ADMIN"],
    handler: async ({ ctx, input }) => {
      const data = ensureObject(input.payload);
      const scopedIds = resolveScopedCompanyIds(ctx.session);

      const companyId = input.companyId?.trim() || undefined;
      if (companyId) {
        if (Array.isArray(scopedIds) && !scopedIds.includes(companyId)) {
          throw new ApiError("Permissao negada para atualizar esta empresa.", "FORBIDDEN");
        }

        const updated = await prisma.company.update({
          where: { id: companyId },
          data: {
            razaoSocial: readOptionalString(data, "razaoSocial"),
            nomeFantasia: readOptionalString(data, "nomeFantasia"),
            cnpj: readOptionalString(data, "cnpj"),
            emailContato: readOptionalString(data, "emailContato"),
            telefone: readOptionalString(data, "telefone"),
            whatsapp: readOptionalString(data, "whatsapp"),
            observacoes: readOptionalString(data, "observacoes"),
            status: readOptionalStatus(data, "status"),
          },
          select: {
            id: true,
            cnpj: true,
            razaoSocial: true,
            nomeFantasia: true,
            status: true,
            updatedAt: true,
          },
        });

        return { operation: "update", company: updated };
      }

      if (Array.isArray(scopedIds)) {
        throw new ApiError("Somente perfis internos podem criar empresa por esta rota.", "FORBIDDEN");
      }

      const cnpj = readOptionalString(data, "cnpj");
      const razaoSocial = readOptionalString(data, "razaoSocial");
      if (!cnpj || !razaoSocial) {
        throw new ApiError("Campos obrigatorios: cnpj e razaoSocial.", "BAD_REQUEST");
      }

      const created = await prisma.company.create({
        data: {
          cnpj,
          razaoSocial,
          nomeFantasia: readOptionalString(data, "nomeFantasia"),
          emailContato: readOptionalString(data, "emailContato"),
          telefone: readOptionalString(data, "telefone"),
          whatsapp: readOptionalString(data, "whatsapp"),
          observacoes: readOptionalString(data, "observacoes"),
          status: readOptionalStatus(data, "status") ?? "ACTIVE",
        },
        select: {
          id: true,
          cnpj: true,
          razaoSocial: true,
          nomeFantasia: true,
          status: true,
          updatedAt: true,
        },
      });

      return { operation: "create", company: created };
    },
  }),
});