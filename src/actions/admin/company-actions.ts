"use server";

import { prisma } from "@/lib/prisma";
import { createCompanySchema, CreateCompanyInput } from "@/core/application/schema/company-schema";
import { getProtectedSession } from "@/lib/auth-helpers";
import { revalidatePath } from "next/cache";
import { Prisma, CompanyStatus, Role } from "@prisma/client";

// --- Tipagem ---
interface GetCompaniesParams {
  search?: string;
  status?: string;
}

// --- Permissões com Enum ---
const READ_ROLES: Role[] = [Role.ADMIN, Role.DEVELOPER, Role.SUPORTE];
const WRITE_ROLES: Role[] = [Role.ADMIN, Role.DEVELOPER];

// --- Helper de Erro ---
function handleActionError(error: any) {
  console.error("[CompanyAction Error]:", error);

  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === 'P2002') {
      return { success: false as const, error: "Este CNPJ já está cadastrado no sistema." };
    }
  }

  return { success: false as const, error: "Ocorreu um erro interno. Tente novamente mais tarde." };
}

/**
 * Lista todas as empresas
 */
export async function getCompaniesAction(filters?: GetCompaniesParams) {
  const session = await getProtectedSession();

  // Verifica se a role do usuário está na lista de permissão
  if (!session || !READ_ROLES.includes(session.role)) {
    return { success: false, error: "Não autorizado." };
  }

  try {
    const whereClause: Prisma.CompanyWhereInput = {};

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
        _count: {
          select: { memberships: true },
        },
        accountingFirm: {
          select: { id: true, nomeFantasia: true } // Pegamos ID também para facilitar edição
        }
      },
      orderBy: { createdAt: 'desc' },
    });

    const formattedCompanies = companies.map(c => ({
      ...c,
      usersCount: c._count.memberships
    }));

    return { success: true, data: formattedCompanies };
  } catch (error) {
    console.error("Erro ao buscar empresas:", error);
    return { success: false, error: "Erro ao carregar empresas." };
  }
}

/**
 * Cria uma nova empresa
 */
export async function createCompanyAction(data: CreateCompanyInput) {
  const session = await getProtectedSession();

  if (!session || !WRITE_ROLES.includes(session.role)) {
    return { success: false as const, error: "Você não tem permissão para criar empresas." };
  }

  const validation = createCompanySchema.safeParse(data);
  if (!validation.success) {
    return { success: false as const, error: validation.error.flatten().fieldErrors };
  }

  try {
    await prisma.company.create({
      data: {
        // Dados Básicos
        cnpj: data.cnpj,
        razaoSocial: data.razaoSocial,
        nomeFantasia: data.nomeFantasia,
        emailContato: data.emailContato,
        telefone: data.telefone,
        website: data.website || null,
        status: CompanyStatus.ACTIVE,

        // Fiscal
        inscricaoEstadual: data.inscricaoEstadual,
        inscricaoMunicipal: data.inscricaoMunicipal,
        regimeTributario: data.regimeTributario,

        // Endereço
        cep: data.cep,
        logradouro: data.logradouro,
        numero: data.numero,
        complemento: data.complemento,
        bairro: data.bairro,
        cidade: data.cidade,
        estado: data.estado || null,

        // Extras
        observacoes: data.observacoes,

        // Relação com Contabilidade
        accountingFirm: data.accountingFirmId
          ? { connect: { id: data.accountingFirmId } }
          : undefined,
      },
    });

    revalidatePath("/admin/cadastros"); // Atualizamos a rota correta do admin
    return { success: true as const };
  } catch (error: any) {
    return handleActionError(error);
  }
}

/**
 * Atualiza uma empresa existente
 */
export async function updateCompanyAction(id: string, data: CreateCompanyInput) {
  const session = await getProtectedSession();

  if (!session) return { success: false, error: "Não autorizado." };

  // Permissão: Admin Global OU Admin da própria empresa
  const isGlobalAdmin = session.role === Role.ADMIN || session.role === Role.DEVELOPER;

  if (!isGlobalAdmin) {
    // Verifica vínculo se for cliente
    const isCompanyAdmin = await prisma.membership.findUnique({
      where: {
        userId_companyId: { userId: session.userId, companyId: id }
      }
    });

    if (!isCompanyAdmin || isCompanyAdmin.role !== Role.ADMIN) {
      return { success: false, error: "Permissão negada para editar esta empresa." };
    }
  }

  const validation = createCompanySchema.safeParse(data);
  if (!validation.success) {
    return { success: false as const, error: "Dados inválidos." };
  }

  try {
    await prisma.company.update({
      where: { id },
      data: {
        cnpj: data.cnpj,
        razaoSocial: data.razaoSocial,
        nomeFantasia: data.nomeFantasia,
        emailContato: data.emailContato,
        telefone: data.telefone,
        website: data.website || null,

        inscricaoEstadual: data.inscricaoEstadual,
        inscricaoMunicipal: data.inscricaoMunicipal,
        regimeTributario: data.regimeTributario,

        cep: data.cep,
        logradouro: data.logradouro,
        numero: data.numero,
        complemento: data.complemento,
        bairro: data.bairro,
        cidade: data.cidade,
        estado: data.estado || null,

        observacoes: data.observacoes,

        // Lógica segura para atualizar relacionamento opcional
        accountingFirm: data.accountingFirmId
          ? { connect: { id: data.accountingFirmId } }
          : { disconnect: true },
      },
    });

    revalidatePath("/admin/cadastros");
    revalidatePath("/app/cadastros");
    return { success: true as const };
  } catch (error: any) {
    return handleActionError(error);
  }
}

/**
 * Alterna o status da empresa
 */
export async function toggleCompanyStatusAction(id: string, currentStatus: string) {
  const session = await getProtectedSession();

  if (!session || !WRITE_ROLES.includes(session.role)) {
    return { success: false as const, error: "Permissão negada." };
  }

  try {
    const newStatus = currentStatus === CompanyStatus.ACTIVE
      ? CompanyStatus.INACTIVE
      : CompanyStatus.ACTIVE;

    await prisma.company.update({
      where: { id },
      data: { status: newStatus }
    });

    revalidatePath("/admin/cadastros");
    return { success: true as const, message: `Empresa alterada para ${newStatus}.` };
  } catch (error) {
    return handleActionError(error);
  }
}