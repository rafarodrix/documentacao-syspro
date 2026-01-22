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

function handleActionError(error: any): ActionResponse {
  console.error("[CompanyAction Error]:", error);
  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
    return { success: false, message: "Este CNPJ já está cadastrado no sistema." };
  }
  return { success: false, message: "Ocorreu um erro interno. Tente novamente." };
}

/**
 * Lista empresas incluindo o endereço principal da tabela 'address'
 */
export async function getCompaniesAction(filters?: { search?: string; status?: string }) {
  const session = await getProtectedSession();
  if (!session || !READ_ROLES.includes(session.role)) {
    return { success: false, message: "Não autorizado." };
  }

  try {
    const whereClause: Prisma.CompanyWhereInput = { deletedAt: null };

    if (filters?.search) {
      whereClause.OR = [
        { razaoSocial: { contains: filters.search, mode: "insensitive" } },
        { nomeFantasia: { contains: filters.search, mode: "insensitive" } },
        { cnpj: { contains: filters.search } },
      ];
    }

    if (filters?.status && filters.status !== "ALL") {
      whereClause.status = filters.status as CompanyStatus;
    }

    const companies = await prisma.company.findMany({
      where: whereClause,
      include: {
        _count: { select: { memberships: true } },
        addresses: { take: 1 }, // Busca o endereço na tabela relacionada
        accountingFirm: { select: { id: true, nomeFantasia: true } }
      },
      orderBy: { createdAt: 'desc' },
    });

    return {
      success: true,
      data: companies.map(c => ({
        ...c,
        usersCount: c._count.memberships,
        address: c.addresses[0] || null // Mapeia para o formato esperado pelo frontend
      }))
    };
  } catch (error) {
    return { success: false, message: "Erro ao carregar empresas." };
  }
}

/**
 * Cria empresa com criação aninhada (Nested Create) do endereço
 */
export async function createCompanyAction(data: CreateCompanyInput): Promise<ActionResponse> {
  const session = await getProtectedSession();
  if (!session || !WRITE_ROLES.includes(session.role)) {
    return { success: false, message: "Permissão negada." };
  }

  const validation = createCompanySchema.safeParse(data);
  if (!validation.success) {
    return {
      success: false,
      errors: validation.error.flatten().fieldErrors as Record<string, string[]>,
      message: "Verifique os campos destacados."
    };
  }

  // Destruturação: Separamos o objeto 'address' das relações de ID
  const { address, parentCompanyId, accountingFirmId, ...validData } = validation.data;

  try {
    await prisma.company.create({
      data: {
        ...validData,
        // Criação na tabela 'address' vinculada a esta empresa
        addresses: address ? {
          create: { ...address, description: address.description || "Sede" }
        } : undefined,

        accountingFirm: accountingFirmId ? { connect: { id: accountingFirmId } } : undefined,
        parentCompany: parentCompanyId ? { connect: { id: parentCompanyId } } : undefined,
      },
    });

    revalidatePath("/admin/cadastros");
    return { success: true, message: "Empresa criada com sucesso!" };
  } catch (error: any) {
    return handleActionError(error);
  }
}

/**
 * Atualiza empresa e sincroniza o endereço principal (Estratégia: Recreate)
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
      errors: validation.error.flatten().fieldErrors as Record<string, string[]>,
      message: "Dados inválidos."
    };
  }

  const { address, parentCompanyId, accountingFirmId, ...validData } = validation.data;

  try {
    await prisma.company.update({
      where: { id },
      data: {
        ...validData,

        /**
         * Lógica de Endereço: Para garantir que o endereço principal seja atualizado 
         * sem precisar do ID do endereço no form, removemos o antigo e criamos o novo.
         */
        addresses: address ? {
          deleteMany: {}, // Remove todos os endereços vinculados (limpa sede anterior)
          create: { ...address, description: address.description || "Sede" }
        } : undefined,

        accountingFirm: accountingFirmId
          ? { connect: { id: accountingFirmId } }
          : { disconnect: true },

        parentCompany: parentCompanyId
          ? { connect: { id: parentCompanyId } }
          : { disconnect: true },
      },
    });

    revalidatePath("/admin/cadastros");
    return { success: true, message: "Empresa atualizada com sucesso!" };
  } catch (error: any) {
    return handleActionError(error);
  }
}

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