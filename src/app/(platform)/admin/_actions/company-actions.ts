"use server";

import { prisma } from "@/lib/prisma";
import { createCompanySchema, CreateCompanyInput } from "@/core/application/schema/company-schema";
import { getProtectedSession } from "@/lib/auth-helpers";
import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";

// --- Tipagem para os parâmetros de URL que o Next.js injeta automaticamente ---
interface GetCompaniesParams {
  search?: string;
  status?: string; // Usaremos string para facilitar, mas pode ser CompanyStatus
}

// --- Constantes de Permissão ---
const READ_ROLES = ["ADMIN", "DEVELOPER", "SUPORTE"];
const WRITE_ROLES = ["ADMIN", "DEVELOPER"]; // Suporte apenas visualiza

// --- Helper de Tratamento de Erros ---
function handleActionError(error: any) {
  console.error("[CompanyAction Error]:", error); // Log para o desenvolvedor ver no terminal

  // Erro de Unicidade do Prisma (ex: CNPJ duplicado)
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
  if (!session) return { success: false, error: "Não autorizado." };

  try {
    // Construção da query dinâmica (Cláusula WHERE)
    const whereClause: any = {};

    // 1. Filtro de Busca (Nome OU CNPJ)
    if (filters?.search) {
      whereClause.OR = [
        { razaoSocial: { contains: filters.search, mode: "insensitive" } }, // Case insensitive
        { nomeFantasia: { contains: filters.search, mode: "insensitive" } },
        { cnpj: { contains: filters.search } }, // CNPJ exato ou parcial
      ];
    }

    // 2. Filtro de Status
    if (filters?.status) {
      whereClause.status = filters.status; // Ex: "ACTIVE"
    }

    const companies = await prisma.company.findMany({
      where: whereClause, // Aplica o filtro aqui
      include: {
        _count: {
          select: { users: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return { success: true, data: companies };
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

  // Validação Zod
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
        status: 'ACTIVE',

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

        // Relação com Contabilidade (Só conecta se tiver ID válido e não vazio)
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

        // Lógica para atualizar a contabilidade
        accountingFirm: data.accountingFirmId
          ? { connect: { id: data.accountingFirmId } }
          : { disconnect: true }, // Se o campo vier vazio, desconecta a contabilidade antiga
      },
    });

    revalidatePath("/admin/empresas");
    return { success: true as const };
  } catch (error: any) {
    return handleActionError(error);
  }
}

/**
 * [NOVO] Alterna o status da empresa (Ativar/Desativar)
 * Soft Delete: Não remove do banco, apenas muda o status.
 */
export async function toggleCompanyStatusAction(id: string, currentStatus: string) {
  const session = await getProtectedSession();

  if (!session || !WRITE_ROLES.includes(session.role)) {
    return { success: false as const, error: "Permissão negada." };
  }

  try {
    const newStatus = currentStatus === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';

    await prisma.company.update({
      where: { id },
      data: { status: newStatus }
    });

    revalidatePath("/admin/empresas");
    return { success: true as const, message: `Empresa ${newStatus === 'ACTIVE' ? 'ativada' : 'desativada'} com sucesso.` };
  } catch (error) {
    return handleActionError(error);
  }
}