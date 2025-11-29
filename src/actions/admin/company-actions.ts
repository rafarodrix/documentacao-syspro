"use server";

import { prisma } from "@/lib/prisma";
import { createCompanySchema, CreateCompanyInput } from "@/core/application/schema/company-schema";
import { getProtectedSession } from "@/lib/auth-helpers";
import { revalidatePath } from "next/cache";
import { Prisma, CompanyStatus } from "@prisma/client"; // Importe o Enum do Prisma

// --- Tipagem para os parâmetros de URL ---
interface GetCompaniesParams {
  search?: string;
  status?: string;
}

// --- Constantes de Permissão ---
const READ_ROLES = ["ADMIN", "DEVELOPER", "SUPORTE"];
const WRITE_ROLES = ["ADMIN", "DEVELOPER"];

// --- Helper de Tratamento de Erros ---
function handleActionError(error: any) {
  console.error("[CompanyAction Error]:", error);

  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    // P2002: Unique constraint failed
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
  if (!session) return { success: false, error: "Não autorizado." };

  try {
    const whereClause: Prisma.CompanyWhereInput = {};

    // 1. Filtro de Busca
    if (filters?.search) {
      whereClause.OR = [
        { razaoSocial: { contains: filters.search, mode: "insensitive" } },
        { nomeFantasia: { contains: filters.search, mode: "insensitive" } },
        { cnpj: { contains: filters.search } },
      ];
    }

    // 2. Filtro de Status
    if (filters?.status && filters.status !== "ALL") {
      // Convertendo string para o Enum, se necessário
      whereClause.status = filters.status as CompanyStatus;
    }

    const companies = await prisma.company.findMany({
      where: whereClause,
      include: {
        _count: {
          // --- MUDANÇA IMPORTANTE AQUI ---
          // Antes era 'users', agora contamos 'memberships'
          // pois a relação é através da tabela pivô.
          select: { memberships: true },
        },
        // Opcional: Se quiser mostrar o nome da contabilidade na lista
        accountingFirm: {
          select: { nomeFantasia: true }
        }
      },
      orderBy: { createdAt: 'desc' },
    });

    // Mapeamos para facilitar o uso no frontend (para chamar .usersCount ao invés de ._count.memberships)
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
        status: CompanyStatus.ACTIVE, // Usando Enum

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

    revalidatePath("/admin/empresas");
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

  if (!session || !WRITE_ROLES.includes(session.role)) {
    return { success: false as const, error: "Você não tem permissão para editar empresas." };
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

        accountingFirm: data.accountingFirmId
          ? { connect: { id: data.accountingFirmId } }
          : { disconnect: true },
      },
    });

    revalidatePath("/admin/empresas");
    return { success: true as const };
  } catch (error: any) {
    return handleActionError(error);
  }
}

/**
 * Alterna o status da empresa (Ativar/Desativar)
 */
export async function toggleCompanyStatusAction(id: string, currentStatus: string) {
  const session = await getProtectedSession();

  if (!session || !WRITE_ROLES.includes(session.role)) {
    return { success: false as const, error: "Permissão negada." };
  }

  try {
    // Lógica com Enum para garantir segurança
    const newStatus = currentStatus === CompanyStatus.ACTIVE
      ? CompanyStatus.INACTIVE
      : CompanyStatus.ACTIVE;

    await prisma.company.update({
      where: { id },
      data: { status: newStatus }
    });

    revalidatePath("/admin/empresas");
    return { success: true as const, message: `Empresa alterada para ${newStatus}.` };
  } catch (error) {
    return handleActionError(error);
  }
}