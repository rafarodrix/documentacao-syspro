"use server";

import { prisma } from "@/lib/prisma";
import { createCompanySchema, CreateCompanyInput } from "@/core/application/schema/company-schema";
import { getProtectedSession } from "@/lib/auth-helpers";
import { revalidatePath } from "next/cache";
import { Prisma, CompanyStatus, Role } from "@prisma/client";
import { resolveCompanySegmentTriggers } from "@/core/config/company-segments";
import { consumeActionRateLimit } from "@/lib/security/action-rate-limit";
import { getRequestIp } from "@/lib/security/request-context";
import { CompanyRegistryGateway } from "@/core/infrastructure/gateways/company-registry-gateway";
import type {
  CompanyActionResponse as ActionResponse,
  CompanyRegistryLookupResponse,
  CompanyZammadEmailInput,
  CompanyListItem,
} from "@/features/company/domain/model";

const SYSTEM_ROLES: Role[] = [Role.ADMIN, Role.DEVELOPER, Role.SUPORTE];
const READ_ROLES: Role[] = [Role.ADMIN, Role.DEVELOPER, Role.SUPORTE, Role.CLIENTE_ADMIN];
const CREATE_ROLES: Role[] = SYSTEM_ROLES;
const UPDATE_ROLES: Role[] = [Role.ADMIN, Role.DEVELOPER, Role.SUPORTE, Role.CLIENTE_ADMIN];
const DELETE_ROLES: Role[] = [Role.ADMIN];
const CREATE_COMPANY_RATE_LIMIT = { max: 6, windowMs: 60_000 };

async function getSessionCompanyIds(userId: string): Promise<string[]> {
  const memberships = await prisma.membership.findMany({
    where: { userId },
    select: { companyId: true },
  });
  return memberships.map((m) => m.companyId);
}

function revalidateCadastrosPaths() {
  revalidatePath("/app/cadastros");
  revalidatePath("/app/cadastros/empresa");
  revalidatePath("/app/cadastros/usuarios");
  revalidatePath("/app/cadastros/sistema");
}

function normalizeZammadEmails(items: CompanyZammadEmailInput[] | undefined): CompanyZammadEmailInput[] {
  if (!Array.isArray(items)) return [];
  const map = new Map<string, CompanyZammadEmailInput>();
  for (const item of items) {
    const rawEmail = typeof item?.email === "string" ? item.email.trim().toLowerCase() : "";
    if (!rawEmail) continue;
    const valid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(rawEmail);
    if (!valid) continue;
    map.set(rawEmail, {
      email: rawEmail,
      label: typeof item?.label === "string" ? item.label.trim() || undefined : undefined,
      isActive: item?.isActive ?? true,
    });
  }
  return Array.from(map.values());
}

async function replaceCompanyZammadEmails(companyId: string, items: CompanyZammadEmailInput[] | undefined) {
  const normalized = normalizeZammadEmails(items);

  await prisma.companyZammadEmail.deleteMany({
    where: { companyId },
  });

  if (normalized.length === 0) return;

  await prisma.companyZammadEmail.createMany({
    data: normalized.map((item) => ({
      companyId,
      email: item.email,
      label: item.label,
      isActive: item.isActive ?? true,
    })),
    skipDuplicates: true,
  });
}

function handleActionError(error: unknown): ActionResponse {
  console.error("[CompanyAction Error]:", error);

  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
    return { success: false, message: "Este CNPJ ja esta cadastrado no sistema." };
  }

  return {
    success: false,
    message: error instanceof Error ? error.message : "Ocorreu um erro interno. Tente novamente.",
  };
}

export async function lookupCompanyProfileByCnpjAction(
  cnpj: string,
): Promise<ActionResponse<CompanyRegistryLookupResponse>> {
  const session = await getProtectedSession();
  if (!session || !UPDATE_ROLES.includes(session.role)) {
    return { success: false, message: "Permissao negada." };
  }

  const normalizedCnpj = String(cnpj || "").replace(/\D/g, "");
  if (normalizedCnpj.length !== 14) {
    return { success: false, message: "Informe um CNPJ completo para consulta." };
  }

  if (!CompanyRegistryGateway.isConfigured()) {
    return {
      success: false,
      message: "Integracao oficial de CNPJ nao configurada.",
      data: {
        configured: false,
        provider: CompanyRegistryGateway.getProviderLabel(),
      } satisfies CompanyRegistryLookupResponse,
    };
  }

  try {
    const profile = await CompanyRegistryGateway.getProfileByCnpj(normalizedCnpj);
    return {
      success: true,
      data: {
        configured: true,
        provider: CompanyRegistryGateway.getProviderLabel(),
        profile,
      } satisfies CompanyRegistryLookupResponse,
    };
  } catch (error) {
    return handleActionError(error) as ActionResponse<CompanyRegistryLookupResponse>;
  }
}

export async function getCompaniesAction(filters?: { search?: string; status?: string }): Promise<ActionResponse<CompanyListItem[]>> {
  const session = await getProtectedSession();
  if (!session || !READ_ROLES.includes(session.role)) {
    return { success: false, message: "Nao autorizado." };
  }

  try {
    const whereClause: Prisma.CompanyWhereInput = { deletedAt: null };

    if (filters?.search) {
      const search = filters.search.trim();
      whereClause.OR = [
        { razaoSocial: { contains: search, mode: "insensitive" } },
        { nomeFantasia: { contains: search, mode: "insensitive" } },
        { cnpj: { contains: search.replace(/\D/g, "") } },
      ];
    }

    if (filters?.status && filters.status !== "ALL") {
      whereClause.status = filters.status as CompanyStatus;
    }

    const companyIds = session.role === Role.CLIENTE_ADMIN ? await getSessionCompanyIds(session.userId) : [];
    if (session.role === Role.CLIENTE_ADMIN) {
      whereClause.id = { in: companyIds.length ? companyIds : ["__none__"] };
    }

    const companies = await prisma.company.findMany({
      where: whereClause,
      include: {
        _count: {
          select: {
            memberships: true,
            contracts: true,
            branches: true,
            accountingClients: true,
          },
        },
        addresses: {
          take: 1,
          orderBy: { id: "asc" },
        },
        accountingFirm: { select: { id: true, nomeFantasia: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    return {
      success: true,
      data: companies.map((c: any): CompanyListItem => ({
        ...c,
        usersCount: c._count?.memberships ?? 0,
        address: c.addresses?.[0] || null,
      })),
    };
  } catch (error) {
    return handleActionError(error);
  }
}

export async function createCompanyAction(
  data: CreateCompanyInput,
  zammadEmails?: CompanyZammadEmailInput[],
): Promise<ActionResponse> {
  const session = await getProtectedSession();
  if (!session || !CREATE_ROLES.includes(session.role)) {
    return { success: false, message: "Permissao negada." };
  }

  const ip = await getRequestIp();
  const rateLimit = consumeActionRateLimit({
    action: "createCompanyAction",
    max: CREATE_COMPANY_RATE_LIMIT.max,
    windowMs: CREATE_COMPANY_RATE_LIMIT.windowMs,
    userId: session.userId,
    ip,
  });
  if (!rateLimit.allowed) {
    return { success: false, message: `Muitas tentativas. Aguarde ${rateLimit.retryAfterSeconds}s.` };
  }

  const validation = createCompanySchema.safeParse(data);
  if (!validation.success) {
    return {
      success: false,
      errors: validation.error.flatten().fieldErrors as any,
      message: "Verifique os campos destacados.",
    };
  }

  const { address, parentCompanyId, accountingFirmId, ...validData } = validation.data;

  try {
    const result = await prisma.company.create({
      data: {
        ...validData,
        cnpj: validData.cnpj,
        addresses:
          address && address.cep
            ? {
                create: {
                  ...address,
                  description: address.description || "Sede",
                },
              }
            : undefined,
        accountingFirm: accountingFirmId ? { connect: { id: accountingFirmId } } : undefined,
        parentCompany: parentCompanyId ? { connect: { id: parentCompanyId } } : undefined,
      },
    });

    if (zammadEmails !== undefined) {
      await replaceCompanyZammadEmails(result.id, zammadEmails);
    }

    const segmentTriggers = resolveCompanySegmentTriggers(result.segment);

    revalidateCadastrosPaths();
    return { success: true, message: "Empresa criada com sucesso!", data: { ...result, segmentTriggers } };
  } catch (error) {
    return handleActionError(error);
  }
}

export async function updateCompanyAction(
  id: string,
  data: CreateCompanyInput,
  zammadEmails?: CompanyZammadEmailInput[],
): Promise<ActionResponse> {
  const session = await getProtectedSession();
  if (!session || !UPDATE_ROLES.includes(session.role)) {
    return { success: false, message: "Permissao negada." };
  }

  const validation = createCompanySchema.safeParse(data);
  if (!validation.success) {
    return {
      success: false,
      errors: validation.error.flatten().fieldErrors as any,
      message: "Verifique os campos destacados.",
    };
  }

  const companyScopeIds = session.role === Role.CLIENTE_ADMIN ? await getSessionCompanyIds(session.userId) : null;
  if (session.role === Role.CLIENTE_ADMIN && (!companyScopeIds?.length || !companyScopeIds.includes(id))) {
    return { success: false, message: "Sem permissao para editar esta empresa." };
  }

  try {
    const existing = await prisma.company.findUnique({
      where: { id },
      select: {
        id: true,
        cnpj: true,
        addresses: {
          select: { id: true },
          take: 1,
          orderBy: { id: "asc" },
        },
      },
    });

    if (!existing) {
      return { success: false, message: "Empresa nao encontrada." };
    }

    const { address, parentCompanyId, accountingFirmId, ...validData } = validation.data;
    const nextCnpj = session.role === Role.CLIENTE_ADMIN ? existing.cnpj : validData.cnpj;

    await prisma.company.update({
      where: { id },
      data: {
        ...validData,
        cnpj: nextCnpj,
        accountingFirm: accountingFirmId ? { connect: { id: accountingFirmId } } : { disconnect: true },
        parentCompany: parentCompanyId ? { connect: { id: parentCompanyId } } : { disconnect: true },
        addresses:
          address && typeof address === "object" && address.cep
            ? existing.addresses[0]
              ? {
                  update: {
                    where: { id: existing.addresses[0].id },
                    data: {
                      ...address,
                      description: address.description || "Sede",
                    },
                  },
                }
              : {
                  create: {
                    ...address,
                    description: address.description || "Sede",
                  },
                }
            : existing.addresses[0]
              ? {
                  delete: {
                    id: existing.addresses[0].id,
                  },
                }
              : undefined,
      },
    });

    if (zammadEmails !== undefined) {
      await replaceCompanyZammadEmails(id, zammadEmails);
    }

    revalidateCadastrosPaths();
    return { success: true, message: "Empresa atualizada com sucesso!" };
  } catch (error) {
    return handleActionError(error);
  }
}

export async function getCompanyZammadEmailsAction(companyId: string): Promise<ActionResponse> {
  const session = await getProtectedSession();
  if (!session || !READ_ROLES.includes(session.role)) {
    return { success: false, message: "Nao autorizado." };
  }

  const companyScopeIds = session.role === Role.CLIENTE_ADMIN ? await getSessionCompanyIds(session.userId) : null;
  if (session.role === Role.CLIENTE_ADMIN && (!companyScopeIds?.length || !companyScopeIds.includes(companyId))) {
    return { success: false, message: "Sem permissao para esta empresa." };
  }

  const rows = await prisma.companyZammadEmail.findMany({
    where: { companyId },
    orderBy: [{ isActive: "desc" }, { email: "asc" }],
    select: { id: true, email: true, label: true, isActive: true },
  });

  return { success: true, data: rows };
}

export async function updateCompanyStatusAction(id: string, status: CompanyStatus): Promise<ActionResponse> {
  const session = await getProtectedSession();
  if (!session || !SYSTEM_ROLES.includes(session.role)) {
    return { success: false, message: "Sem permissao." };
  }

  try {
    await prisma.company.update({
      where: { id },
      data: {
        status,
        deletedAt: status === CompanyStatus.INACTIVE ? new Date() : null,
      },
    });

    revalidateCadastrosPaths();
    return {
      success: true,
      message: status === CompanyStatus.INACTIVE ? "Empresa inativada com sucesso." : "Empresa reativada com sucesso.",
    };
  } catch (error) {
    return handleActionError(error);
  }
}

export async function deleteCompanyAction(id: string): Promise<ActionResponse> {
  const session = await getProtectedSession();
  if (!session || !DELETE_ROLES.includes(session.role)) {
    return { success: false, message: "Sem permissao." };
  }

  try {
    const company = await prisma.company.findUnique({
      where: { id },
      select: {
        id: true,
        _count: {
          select: {
            memberships: true,
            contracts: true,
            branches: true,
            accountingClients: true,
          },
        },
      },
    });

    if (!company) {
      return { success: false, message: "Empresa nao encontrada." };
    }

    const linkedRecords =
      company._count.memberships +
      company._count.contracts +
      company._count.branches +
      company._count.accountingClients;

    if (linkedRecords > 0) {
      return {
        success: false,
        message: "Empresa possui registros vinculados. Inative em vez de excluir.",
      };
    }

    await prisma.company.delete({ where: { id } });

    revalidateCadastrosPaths();
    return { success: true, message: "Empresa excluida com sucesso." };
  } catch (error) {
    return handleActionError(error);
  }
}
