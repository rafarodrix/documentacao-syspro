"use server";

import { prisma } from "@/lib/prisma";
import {
  createCompanySchema,
  type CreateCompanyInput,
  type CreateCompanyOutput,
} from "@/features/company/application/company-schema";
import { getProtectedSession } from "@/lib/auth-helpers";
import { Prisma, CompanyStatus, Role } from "@prisma/client";
import { z } from "zod";
import { resolveCompanySegmentTriggers } from "@/features/company/domain/company-segments";
import { consumeActionRateLimit } from "@/lib/security/action-rate-limit";
import { getRequestIp } from "@/lib/security/request-context";
import { CompanyRegistryGateway } from "@/features/company/infrastructure/gateways/company-registry-gateway";
import { revalidateCadastrosViews } from "@/lib/cache-invalidation";
import type {
  CompanyActionResponse as ActionResponse,
  CompanyContactInput,
  CompanyRegistryLookupResponse,
  CompanyValidationErrors,
  CompanyZammadEmailInput,
} from "@/features/company/domain/model";

const SYSTEM_ROLES: Role[] = [Role.ADMIN, Role.DEVELOPER, Role.SUPORTE];
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

function toValidationErrors(
  fieldErrors: z.inferFlattenedErrors<typeof createCompanySchema>["fieldErrors"],
): CompanyValidationErrors {
  return fieldErrors as CompanyValidationErrors;
}

function normalizeCompanyContacts(items: CompanyContactInput[] | undefined): CompanyContactInput[] {
  if (!Array.isArray(items)) return [];

  return items
    .map((item) => ({
      name: typeof item?.name === "string" ? item.name.trim() : "",
      email: typeof item?.email === "string" ? item.email.trim().toLowerCase() || undefined : undefined,
      phone: typeof item?.phone === "string" ? item.phone.trim() || undefined : undefined,
      whatsapp: typeof item?.whatsapp === "string" ? item.whatsapp.trim() || undefined : undefined,
      notes: typeof item?.notes === "string" ? item.notes.trim() || undefined : undefined,
      isPrimary: item?.isPrimary ?? false,
      source: item?.source,
      status: item?.status,
    }))
    .filter((item) => item.name.length > 0);
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

async function replaceCompanyContacts(companyId: string, items: CompanyContactInput[] | undefined) {
  const normalized = normalizeCompanyContacts(items).map((item, index) => ({
    ...item,
    isPrimary: index === 0 ? true : Boolean(item.isPrimary),
  }));

  await prisma.companyContact.deleteMany({
    where: { companyId },
  });

  if (normalized.length === 0) return;

  await prisma.companyContact.createMany({
    data: normalized.map((item) => ({
      companyId,
      name: item.name,
      email: item.email,
      phone: item.phone,
      whatsapp: item.whatsapp,
      notes: item.notes,
      isPrimary: item.isPrimary ?? false,
      source: item.source,
      status: item.status,
    })),
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
    const handled = handleActionError(error);
    return { success: false, message: handled.message, errors: handled.errors };
  }
}

export async function createCompanyAction(
  data: CreateCompanyInput | CreateCompanyOutput,
  zammadEmails?: CompanyZammadEmailInput[],
  contacts?: CompanyContactInput[],
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
      errors: toValidationErrors(validation.error.flatten().fieldErrors),
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
    if (contacts !== undefined) {
      await replaceCompanyContacts(result.id, contacts);
    }

    const segmentTriggers = resolveCompanySegmentTriggers(result.segment);

    revalidateCadastrosViews();
    return { success: true, message: "Empresa criada com sucesso!", data: { ...result, segmentTriggers } };
  } catch (error) {
    return handleActionError(error);
  }
}

export async function updateCompanyAction(
  id: string,
  data: CreateCompanyInput | CreateCompanyOutput,
  zammadEmails?: CompanyZammadEmailInput[],
  contacts?: CompanyContactInput[],
): Promise<ActionResponse> {
  const session = await getProtectedSession();
  if (!session || !UPDATE_ROLES.includes(session.role)) {
    return { success: false, message: "Permissao negada." };
  }

  const validation = createCompanySchema.safeParse(data);
  if (!validation.success) {
    return {
      success: false,
      errors: toValidationErrors(validation.error.flatten().fieldErrors),
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
    if (contacts !== undefined) {
      await replaceCompanyContacts(id, contacts);
    }

    revalidateCadastrosViews();
    return { success: true, message: "Empresa atualizada com sucesso!" };
  } catch (error) {
    return handleActionError(error);
  }
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

    revalidateCadastrosViews();
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

    revalidateCadastrosViews();
    return { success: true, message: "Empresa excluida com sucesso." };
  } catch (error) {
    return handleActionError(error);
  }
}

