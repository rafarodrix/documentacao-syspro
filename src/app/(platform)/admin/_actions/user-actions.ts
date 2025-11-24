"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { createUserSchema, CreateUserInput } from "@/core/validation/user-schema";
import { getProtectedSession } from "@/lib/auth-helpers";
import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";

// --- Constantes de Permissão ---
const READ_ROLES = ["ADMIN", "DEVELOPER", "SUPORTE"];
const WRITE_ROLES = ["ADMIN", "DEVELOPER"];

// --- Helper de Tratamento de Erros ---
function handleActionError(error: any) {
    console.error("[UserAction Error]:", error);

    // Erro do Prisma (ex: Email já existe)
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2002') {
            return { success: false as const, error: "Este e-mail já está em uso por outro usuário." };
        }
    }

    // Erro do Better Auth (APIError)
    if (error?.body?.message) {
        return { success: false as const, error: error.body.message };
    }

    return { success: false as const, error: "Ocorreu um erro interno. Tente novamente." };
}

/**
 * Lista todos os usuários com suas empresas
 */
export async function getUsersAction() {
    const session = await getProtectedSession();

    if (!session || !READ_ROLES.includes(session.role)) {
        return { success: false as const, error: "Acesso negado." };
    }

    try {
        const users = await prisma.user.findMany({
            orderBy: { createdAt: "desc" },
            include: {
                companies: {
                    select: { id: true, razaoSocial: true }
                }
            }
        });
        return { success: true as const, data: users };
    } catch (error) {
        return handleActionError(error);
    }
}

/**
 * Cria um novo usuário
 */
export async function createUserAction(data: CreateUserInput) {
    const session = await getProtectedSession();

    if (!session || !WRITE_ROLES.includes(session.role)) {
        return { success: false as const, error: "Você não tem permissão para criar usuários." };
    }

    const validation = createUserSchema.safeParse(data);
    if (!validation.success) {
        return { success: false as const, error: validation.error.flatten().fieldErrors };
    }

    try {
        // 1. Cria no Auth (Garante hash de senha correto e validações de email)
        const newUser = await auth.api.signUpEmail({
            body: {
                email: data.email,
                password: data.password,
                name: data.name,
            }
        });

        if (!newUser) {
            return { success: false as const, error: "Erro ao registrar autenticação." };
        }

        // 2. Atualiza dados complementares no Banco (Role e Empresa)
        await prisma.user.update({
            where: { email: data.email },
            data: {
                role: data.role as any,
                emailVerified: true,
                companies: {
                    connect: { id: data.companyId }
                }
            }
        });

        revalidatePath("/admin/usuarios");
        return { success: true as const };

    } catch (error) {
        return handleActionError(error);
    }
}

/**
 * Atualiza um usuário existente
 * Nota: Não atualiza a senha por aqui (complexidade de hash).
 */
export async function updateUserAction(id: string, data: Partial<CreateUserInput>) {
    const session = await getProtectedSession();

    if (!session || !WRITE_ROLES.includes(session.role)) {
        return { success: false as const, error: "Você não tem permissão para editar usuários." };
    }

    // Na edição, aceitamos dados parciais (senha não é obrigatória)
    if (!data.email || !data.role) {
        return { success: false as const, error: "Dados incompletos para atualização." };
    }

    try {
        await prisma.user.update({
            where: { id },
            data: {
                name: data.name,
                email: data.email,
                role: data.role as any,
                // Atualização da Empresa (Relação N:N)
                // Substitui todas as empresas anteriores pela nova selecionada
                companies: {
                    set: [], // Remove vínculos
                    connect: data.companyId ? { id: data.companyId } : undefined
                }
            }
        });

        revalidatePath("/admin/usuarios");
        return { success: true as const };

    } catch (error) {
        return handleActionError(error);
    }
}