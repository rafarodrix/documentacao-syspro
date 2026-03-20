"use server";

import { Role } from "@prisma/client";
import { getProtectedSession } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { parseContractBlockReason } from "@/core/config/contract-blocking";

const SYSTEM_ROLES: Role[] = [Role.ADMIN, Role.DEVELOPER, Role.SUPORTE];
const CLIENT_ROLES: Role[] = [Role.CLIENTE_ADMIN, Role.CLIENTE_USER];

type ActionError = { error: string };
type SessionContext = { session: NonNullable<Awaited<ReturnType<typeof getProtectedSession>>>; isSystemRole: boolean };

const companyListSelect = {
  id: true,
  cnpj: true,
  razaoSocial: true,
  nomeFantasia: true,
  segment: true,
  status: true,
  logoUrl: true,
  parentCompanyId: true,
  accountingFirmId: true,
  inscricaoEstadual: true,
  inscricaoMunicipal: true,
  indicadorIE: true,
  regimeTributario: true,
  cnae: true,
  codSuframa: true,
  dataFundacao: true,
  emailContato: true,
  emailFinanceiro: true,
  telefone: true,
  whatsapp: true,
  website: true,
  observacoes: true,
  addresses: {
    select: {
      id: true,
      description: true,
      cep: true,
      logradouro: true,
      numero: true,
      complemento: true,
      bairro: true,
      cidade: true,
      estado: true,
      pais: true,
      codigoIbgeCidade: true,
      codigoIbgeEstado: true,
    },
  },
  _count: { select: { memberships: true } },
} as const;

const companyOptionSelect = {
  id: true,
  razaoSocial: true,
  nomeFantasia: true,
  cnpj: true,
  segment: true,
  status: true,
  _count: { select: { memberships: true } },
} as const;

const userListSelect = {
  id: true,
  name: true,
  email: true,
  image: true,
  role: true,
  isActive: true,
  jobTitle: true,
  cpf: true,
  phone: true,
  memberships: {
    select: {
      companyId: true,
      role: true,
      company: {
        select: {
          id: true,
          razaoSocial: true,
          nomeFantasia: true,
        },
      },
    },
  },
} as const;

async function getSessionContext(): Promise<SessionContext | ActionError> {
  const session = await getProtectedSession();
  if (!session) return { error: "Nao autorizado" };
  return { session, isSystemRole: SYSTEM_ROLES.includes(session.role) };
}

async function getScopedCompanyIds(userId: string): Promise<string[]> {
  const memberships = await prisma.membership.findMany({
    where: { userId },
    select: { companyId: true },
  });
  return memberships.map((m) => m.companyId);
}

function hasError(value: unknown): value is ActionError {
  return Boolean(value && typeof value === "object" && "error" in (value as Record<string, unknown>));
}

export async function getCadastrosCompaniesData() {
  const ctx = await getSessionContext();
  if (hasError(ctx)) return ctx;

  try {
    if (ctx.isSystemRole) {
      const companies = await prisma.company.findMany({
        where: { deletedAt: null },
        orderBy: { razaoSocial: "asc" },
        select: companyListSelect,
      });

      return {
        companies: companies.map((company) => {
          const block = parseContractBlockReason(company.observacoes);
          return {
            ...company,
            isBlockedByContract: Boolean(block),
            contractBlockReasonLabel: block?.label ?? null,
          };
        }),
        isGlobalView: true,
      };
    }

    const companyIds = await getScopedCompanyIds(ctx.session.userId);
    if (!companyIds.length) return { companies: [], isGlobalView: false };

    const companies = await prisma.company.findMany({
      where: { id: { in: companyIds }, deletedAt: null },
      orderBy: { razaoSocial: "asc" },
      select: companyListSelect,
    });

    return {
      companies: companies.map((company) => {
        const block = parseContractBlockReason(company.observacoes);
        return {
          ...company,
          isBlockedByContract: Boolean(block),
          contractBlockReasonLabel: block?.label ?? null,
        };
      }),
      isGlobalView: false,
    };
  } catch (error) {
    console.error(error);
    return { error: "Erro ao buscar empresas." };
  }
}

export async function getCadastrosClientUsersData() {
  const ctx = await getSessionContext();
  if (hasError(ctx)) return ctx;

  try {
    if (ctx.isSystemRole) {
      const [companies, users] = await Promise.all([
        prisma.company.findMany({
          where: { deletedAt: null },
          orderBy: { razaoSocial: "asc" },
          select: companyOptionSelect,
        }),
        prisma.user.findMany({
          where: { deletedAt: null, role: { in: CLIENT_ROLES } },
          orderBy: { name: "asc" },
          select: userListSelect,
        }),
      ]);

      return { companies, users, isGlobalView: true };
    }

    const companyIds = await getScopedCompanyIds(ctx.session.userId);
    if (!companyIds.length) return { companies: [], users: [], isGlobalView: false };

    const [companies, users] = await Promise.all([
      prisma.company.findMany({
        where: { id: { in: companyIds }, deletedAt: null },
        orderBy: { razaoSocial: "asc" },
        select: companyOptionSelect,
      }),
      prisma.user.findMany({
        where: {
          deletedAt: null,
          role: { in: CLIENT_ROLES },
          memberships: { some: { companyId: { in: companyIds } } },
        },
        select: {
          ...userListSelect,
          memberships: {
            where: { companyId: { in: companyIds } },
            select: userListSelect.memberships.select,
          },
        },
        orderBy: { name: "asc" },
      }),
    ]);

    return { companies, users, isGlobalView: false };
  } catch (error) {
    console.error(error);
    return { error: "Erro ao buscar usuarios." };
  }
}

export async function getCadastrosSystemUsersData() {
  const ctx = await getSessionContext();
  if (hasError(ctx)) return ctx;

  try {
    if (!ctx.isSystemRole) {
      return { users: [], isGlobalView: false };
    }

    const users = await prisma.user.findMany({
      where: { deletedAt: null, role: { in: SYSTEM_ROLES } },
      orderBy: { name: "asc" },
      select: userListSelect,
    });

    return { users, isGlobalView: true };
  } catch (error) {
    console.error(error);
    return { error: "Erro ao buscar equipe interna." };
  }
}

