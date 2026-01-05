"use server";

import { prisma } from "@/lib/prisma";
import { createCompanySchema, CreateCompanyInput } from "@/core/application/schema/company-schema";
import { getProtectedSession } from "@/lib/auth-helpers";
import { revalidatePath } from "next/cache";
import { Prisma, CompanyStatus, Role, IndicadorIE } from "@prisma/client";

// --- Tipagem de Filtros ---
interface GetCompaniesParams {
  search?: string;
  status?: string;
}

const READ_ROLES: Role[] = [Role.ADMIN, Role.DEVELOPER, Role.SUPORTE];
const WRITE_ROLES: Role[] = [Role.ADMIN, Role.DEVELOPER];

// --- Central de Erros ---
function handleActionError(error: any) {
  console.error("[CompanyAction Error]:", error);

  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === 'P2002') {
      return { success: false as const, error: "Este CNPJ já está cadastrado no sistema." };
    }
  }

  return { success: false as const, error: "Ocorreu um erro interno. Tente novamente." };
}

/**
 * Lista empresas incluindo o endereço principal
 */
export async function getCompaniesAction(filters?: GetCompaniesParams) {
  const session = await getProtectedSession();

  if (!session || !READ_ROLES.includes(session.role)) {
    return { success: false, error: "Não autorizado." };
  }

  try {
    const whereClause: Prisma.CompanyWhereInput = {
      deletedAt: null // Garantindo que não pegamos empresas excluídas (Soft Delete)
    };

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
        addresses: { take: 1 }, // Pega o endereço principal
        accountingFirm: { select: { id: true, nomeFantasia: true } }
      },
      orderBy: { createdAt: 'desc' },
    });

    return {
      success: true,
      data: companies.map(c => ({
        ...c,
        usersCount: c._count.memberships,
        address: c.addresses[0] || null
      }))
    };
  } catch (error) {
    return { success: false, error: "Erro ao carregar empresas." };
  }
}

/**
 * Cria empresa com Nested Write para Address
 */
export async function createCompanyAction(data: CreateCompanyInput) {
  const session = await getProtectedSession();

  if (!session || !WRITE_ROLES.includes(session.role)) {
    return { success: false as const, error: "Permissão negada." };
  }

  // Validação: 'valid' conterá os dados transformados (CNPJ sem máscara, Date object, etc)
  const validation = createCompanySchema.safeParse(data);

  if (!validation.success) {
    return { success: false as const, error: validation.error.flatten().fieldErrors };
  }

  const valid = validation.data;

  try {
    await prisma.company.create({
      data: {
        cnpj: valid.cnpj,
        razaoSocial: valid.razaoSocial,
        nomeFantasia: valid.nomeFantasia,
        status: valid.status,
        logoUrl: valid.logoUrl,

        // Dados Fiscais
        inscricaoEstadual: valid.inscricaoEstadual,
        inscricaoMunicipal: valid.inscricaoMunicipal,
        indicadorIE: valid.indicadorIE,
        regimeTributario: valid.regimeTributario,
        crt: valid.crt,
        cnae: valid.cnae,
        codSuframa: valid.codSuframa,
        dataFundacao: valid.dataFundacao,

        // Contato
        emailContato: valid.emailContato,
        emailFinanceiro: valid.emailFinanceiro,
        telefone: valid.telefone,
        whatsapp: valid.whatsapp,
        website: valid.website,

        // Endereço (Nested Create)
        addresses: valid.address ? {
          create: { ...valid.address, description: "Sede" }
        } : undefined,

        // Relacionamentos
        accountingFirm: valid.accountingFirmId ? { connect: { id: valid.accountingFirmId } } : undefined,
        parentCompany: valid.parentCompanyId ? { connect: { id: valid.parentCompanyId } } : undefined,

        observacoes: valid.observacoes,
      },
    });

    revalidatePath("/admin/cadastros");
    return { success: true as const };
  } catch (error: any) {
    return handleActionError(error);
  }
}

/**
 * Atualiza empresa e seu endereço
 */
export async function updateCompanyAction(id: string, data: CreateCompanyInput) {
  const session = await getProtectedSession();
  if (!session) return { success: false, error: "Não autorizado." };

  const validation = createCompanySchema.safeParse(data);
  if (!validation.success) return { success: false as const, error: "Dados inválidos." };

  const valid = validation.data;

  try {
    await prisma.company.update({
      where: { id },
      data: {
        cnpj: valid.cnpj,
        razaoSocial: valid.razaoSocial,
        nomeFantasia: valid.nomeFantasia,
        indicadorIE: valid.indicadorIE,
        inscricaoEstadual: valid.inscricaoEstadual,
        inscricaoMunicipal: valid.inscricaoMunicipal,
        regimeTributario: valid.regimeTributario,
        crt: valid.crt,
        whatsapp: valid.whatsapp,
        emailFinanceiro: valid.emailFinanceiro,

        // Atualização de Endereço: Remove antigos e cria o novo (estratégia simples)
        addresses: valid.address ? {
          deleteMany: {},
          create: { ...valid.address, description: "Sede" }
        } : undefined,

        accountingFirm: valid.accountingFirmId
          ? { connect: { id: valid.accountingFirmId } }
          : { disconnect: true },

        parentCompany: valid.parentCompanyId
          ? { connect: { id: valid.parentCompanyId } }
          : { disconnect: true },

        observacoes: valid.observacoes,
      },
    });

    revalidatePath("/admin/cadastros");
    return { success: true as const };
  } catch (error: any) {
    return handleActionError(error);
  }
}

/**
 * Soft Delete (Marcar como excluído)
 */
export async function deleteCompanyAction(id: string) {
  const session = await getProtectedSession();
  if (!session || !WRITE_ROLES.includes(session.role)) return { success: false, error: "Sem permissão." };

  try {
    await prisma.company.update({
      where: { id },
      data: { deletedAt: new Date(), status: CompanyStatus.INACTIVE }
    });
    revalidatePath("/admin/cadastros");
    return { success: true };
  } catch (error) {
    return handleActionError(error);
  }
}