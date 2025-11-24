"use server";

import { prisma } from "@/lib/prisma"; 
import { createCompanySchema, CreateCompanyInput } from "@/core/validation/company-schema";
import { getProtectedSession } from "@/lib/auth-helpers";
import { revalidatePath } from "next/cache";

/**
 * Lista todas as empresas (Apenas para ADMIN/DEVELOPER/SUPORTE)
 */
export async function getCompaniesAction() {
  const session = await getProtectedSession();
  
  // Segurança: Apenas staff da Trilink pode ver todas as empresas
  const allowedRoles = ["ADMIN", "DEVELOPER", "SUPORTE"];
  if (!session || !allowedRoles.includes(session.role)) {
    throw new Error("Não autorizado");
  }

  try {
    const companies = await prisma.company.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        _count: {
          select: { users: true } // Já traz a contagem de usuários vinculados
        }
      }
    });
    return { success: true, data: companies };
  } catch (error) {
    return { success: false, error: "Erro ao buscar empresas" };
  }
}

/**
 * Cria uma nova empresa
 */
export async function createCompanyAction(data: CreateCompanyInput) {
  const session = await getProtectedSession();
  
  if (!session || !["ADMIN", "DEVELOPER"].includes(session.role)) {
    return { success: false, error: "Sem permissão para criar empresas." };
  }

  // 1. Validação Zod no servidor
  const validation = createCompanySchema.safeParse(data);
  if (!validation.success) {
    return { success: false, error: validation.error.flatten().fieldErrors };
  }

  try {
    // 2. Persistência
    await prisma.company.create({
      data: {
        cnpj: data.cnpj,
        razaoSocial: data.razaoSocial,
        nomeFantasia: data.nomeFantasia,
        emailContato: data.emailContato,
        telefone: data.telefone,
      },
    });

    // 3. Atualiza a cache da página de lista
    revalidatePath("/admin/empresas");
    
    return { success: true };
  } catch (error: any) {
    // Tratamento de erro de CNPJ duplicado (código P2002 do Prisma)
    if (error.code === 'P2002') {
      return { success: false, error: "Este CNPJ já está cadastrado." };
    }
    return { success: false, error: "Erro interno ao criar empresa." };
  }
}