// src/actions/admin/company-actions.ts
"use server";

import { prisma } from "@/lib/prisma";
import { createCompanySchema, CreateCompanyInput } from "@/core/application/schema/company-schema";
import { getProtectedSession } from "@/lib/auth-helpers";
import { revalidatePath } from "next/cache";
import { Prisma, CompanyStatus, Role } from "@prisma/client";

export type ActionResponse = {
  success: boolean;
  message?: string;
  errors?: Record<string, string[]>;
  data?: any;
};

const READ_ROLES: Role[] = [Role.ADMIN, Role.DEVELOPER, Role.SUPORTE];
const WRITE_ROLES: Role[] = [Role.ADMIN, Role.DEVELOPER];

/**
 * Central de tratamento de erros
 */
function handleActionError(error: any): ActionResponse {
  console.error("[CompanyAction Error]:", error);

  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === 'P2002') {
      return { success: false, message: "Este CNPJ já está cadastrado no sistema." };
    }
  }

  return {
    success: false,
    message: error instanceof Error ? error.message : "Ocorreu um erro interno. Tente novamente."
  };
}

/**
 * Lista empresas vinculando o endereço mais recente da relação
 */
export async function getCompaniesAction(filters?: { search?: string; status?: string }) {
  const session = await getProtectedSession();
  if (!session || !READ_ROLES.includes(session.role)) {
    return { success: false, message: "Não autorizado." };
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

    const companies = await prisma.company.findMany({
      where: whereClause,
      include: {
        _count: { select: { memberships: true } },
        addresses: {
          take: 1,
          orderBy: { id: 'asc' }
        },
        accountingFirm: { select: { id: true, nomeFantasia: true } }
      },
      orderBy: { createdAt: 'desc' },
    });

    return {
      success: true,
      data: companies.map((c: any) => ({
        ...c,
        usersCount: c._count?.memberships ?? 0,
        address: c.addresses?.[0] || null
      }))
    };
  } catch (error) {
    return handleActionError(error);
  }
}

/**
 * Cria empresa e endereço principal
 */
export async function createCompanyAction(data: CreateCompanyInput): Promise<ActionResponse> {
  const session = await getProtectedSession();
  if (!session || !WRITE_ROLES.includes(session.role)) {
    return { success: false, message: "Permissão negada." };
  }

  // safeParse aplica transforms do Zod (como limpar CEP e CNPJ)
  const validation = createCompanySchema.safeParse(data);
  if (!validation.success) {
    return {
      success: false,
      errors: validation.error.flatten().fieldErrors as any,
      message: "Verifique os campos destacados."
    };
  }

  const { address, parentCompanyId, accountingFirmId, ...validData } = validation.data;

  try {
    const result = await prisma.company.create({
      data: {
        ...validData,
        // Garante que o CNPJ esteja limpo no banco
        cnpj: validData.cnpj.replace(/\D/g, ""),
        // Criação aninhada na tabela Address
        addresses: address ? {
          create: {
            ...address,
            description: address.description || "Sede"
          }
        } : undefined,
        accountingFirm: accountingFirmId ? { connect: { id: accountingFirmId } } : undefined,
        parentCompany: parentCompanyId ? { connect: { id: parentCompanyId } } : undefined,
      },
    });

    revalidatePath("/admin/cadastros");
    return { success: true, message: "Empresa criada com sucesso!", data: result };
  } catch (error: any) {
    return handleActionError(error);
  }
}

/**
 * Atualiza empresa com transação atômica para o endereço
 */
export async function updateCompanyAction(id: string, data: CreateCompanyInput): Promise<ActionResponse> {
  const session = await getProtectedSession();
  if (!session || !WRITE_ROLES.includes(session.role)) {
    return { success: false, message: "Acesso negado." };
  }

  const validation = createCompanySchema.safeParse(data);
  if (!validation.success) {
    return {
      success: false,
      errors: validation.error.flatten().fieldErrors as any,
      message: "Dados inválidos."
    };
  }

  const { address, parentCompanyId, accountingFirmId, ...validData } = validation.data;

  try {
    // Transação manual garante que a empresa não fique sem endereço se o create falhar
    await prisma.$transaction(async (tx) => {
      await tx.company.update({
        where: { id },
        data: {
          ...validData,
          cnpj: validData.cnpj.replace(/\D/g, ""),

          // Estratégia: Remove endereços antigos e cria o novo enviado no form
          addresses: address ? {
            deleteMany: {},
            create: {
              ...address,
              description: address.description || "Sede"
            }
          } : undefined,

          accountingFirm: accountingFirmId
            ? { connect: { id: accountingFirmId } }
            : { disconnect: true },

          parentCompany: parentCompanyId
            ? { connect: { id: parentCompanyId } }
            : { disconnect: true },
        },
      });
    });

    revalidatePath("/admin/cadastros");
    return { success: true, message: "Empresa atualizada com sucesso!" };
  } catch (error: any) {
    return handleActionError(error);
  }
}

/**
 * Soft Delete (Mantém integridade referencial)
 */
export async function deleteCompanyAction(id: string): Promise<ActionResponse> {
  const session = await getProtectedSession();
  if (!session || !WRITE_ROLES.includes(session.role)) {
    return { success: false, message: "Sem permissão." };
  }

  try {
    await prisma.company.update({
      where: { id },
      data: {
        deletedAt: new Date(),
        status: CompanyStatus.INACTIVE
      }
    });

    revalidatePath("/admin/cadastros");
    return { success: true, message: "Empresa removida com sucesso." };
  } catch (error) {
    return handleActionError(error);
  }
}