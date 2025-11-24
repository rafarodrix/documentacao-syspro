"use server";

import { prisma } from "@/lib/prisma";
import { createCompanySchema, CreateCompanyInput } from "@/core/validation/company-schema";
import { getProtectedSession } from "@/lib/auth-helpers";
import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";

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
export async function getCompaniesAction() {
  const session = await getProtectedSession();

  if (!session || !READ_ROLES.includes(session.role)) {
    return { success: false as const, error: "Acesso negado." }; // Retornar objeto consistente em vez de throw
  }

  try {
    const companies = await prisma.company.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        _count: {
          select: { users: true }
        }
      }
    });
    return { success: true as const, data: companies };
  } catch (error) {
    return handleActionError(error);
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
        cnpj: data.cnpj,
        razaoSocial: data.razaoSocial,
        nomeFantasia: data.nomeFantasia,
        emailContato: data.emailContato,
        telefone: data.telefone,
      },
    });

    revalidatePath("/admin/empresas");
    return { success: true as const };
  } catch (error) {
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
      },
    });

    revalidatePath("/admin/empresas");
    return { success: true as const };
  } catch (error) {
    return handleActionError(error);
  }
}