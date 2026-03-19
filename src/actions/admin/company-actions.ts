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
const DELETE_ROLES: Role[] = [Role.ADMIN];

function handleActionError(error: any): ActionResponse {
  console.error("[CompanyAction Error]:", error);

  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === "P2002") {
      return { success: false, message: "Este CNPJ ja esta cadastrado no sistema." };
    }
  }

  return {
    success: false,
    message: error instanceof Error ? error.message : "Ocorreu um erro interno. Tente novamente.",
  };
}

export async function getCompaniesAction(filters?: { search?: string; status?: string }) {
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
      data: companies.map((c: any) => ({
        ...c,
        usersCount: c._count?.memberships ?? 0,
        address: c.addresses?.[0] || null,
      })),
    };
  } catch (error) {
    return handleActionError(error);
  }
}

export async function createCompanyAction(data: CreateCompanyInput): Promise<ActionResponse> {
  const session = await getProtectedSession();
  if (!session || !WRITE_ROLES.includes(session.role)) {
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

    revalidatePath("/app/cadastros");
    return { success: true, message: "Empresa criada com sucesso!", data: result };
  } catch (error: any) {
    return handleActionError(error);
  }
}

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
      message: "Dados invalidos.",
    };
  }

  const { address, parentCompanyId, accountingFirmId, ...validData } = validation.data;

  try {
    await prisma.$transaction(async (tx) => {
      await tx.company.update({
        where: { id },
        data: {
          ...validData,
          cnpj: validData.cnpj.replace(/\D/g, ""),
          addresses: address
            ? {
                deleteMany: {},
                create: {
                  ...address,
                  description: address.description || "Sede",
                },
              }
            : undefined,
          accountingFirm: accountingFirmId ? { connect: { id: accountingFirmId } } : { disconnect: true },
          parentCompany: parentCompanyId ? { connect: { id: parentCompanyId } } : { disconnect: true },
        },
      });
    });

    revalidatePath("/app/cadastros");
    return { success: true, message: "Empresa atualizada com sucesso!" };
  } catch (error: any) {
    return handleActionError(error);
  }
}

export async function updateCompanyStatusAction(id: string, status: CompanyStatus): Promise<ActionResponse> {
  const session = await getProtectedSession();
  if (!session || !WRITE_ROLES.includes(session.role)) {
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

    revalidatePath("/app/cadastros");
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

    revalidatePath("/app/cadastros");
    return { success: true, message: "Empresa excluida com sucesso." };
  } catch (error) {
    return handleActionError(error);
  }
}
