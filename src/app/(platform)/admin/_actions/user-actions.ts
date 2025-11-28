"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { createUserSchema, CreateUserInput } from "@/core/schema/user-schema";
import { getProtectedSession } from "@/lib/auth-helpers";
import { revalidatePath } from "next/cache";
import { Prisma, Role } from "@prisma/client";

// --- Tipos ---
interface GetUsersParams {
    search?: string;
    role?: string;
}

// --- Constantes de Permissão ---
const READ_ROLES = ["ADMIN", "DEVELOPER", "SUPORTE"];
const WRITE_ROLES = ["ADMIN", "DEVELOPER"];

// --- Helper de Tratamento de Erros ---
function handleActionError(error: any) {
    console.error("[UserAction Error]:", error);

    // Erro do Prisma (ex: Email já existe - Código P2002)
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2002') {
            return { success: false as const, error: "Este e-mail já está em uso por outro usuário." };
        }
    }

    // Erro da API do Better Auth
    if (error?.body?.message) {
        return { success: false as const, error: error.body.message };
    }

    return { success: false as const, error: "Ocorreu um erro interno. Tente novamente." };
}

/**
 * Lista todos os usuários com suas empresas
 */
export async function getUsersAction(filters?: GetUsersParams) {
    const session = await getProtectedSession();
    if (!session) return { success: false, error: "Não autorizado." };

    try {
        // Construção dinâmica do WHERE
        const whereClause: any = {};

        // 1. Busca por Texto (Nome ou Email)
        if (filters?.search) {
            whereClause.OR = [
                { name: { contains: filters.search, mode: "insensitive" } },
                { email: { contains: filters.search, mode: "insensitive" } },
            ];
        }

        // 2. Filtro por Role
        if (filters?.role) {
            // Faz um cast seguro se estiver usando TypeScript estrito com Enums
            whereClause.role = filters.role as Role;
        }

        const users = await prisma.user.findMany({
            where: whereClause,
            include: {
                companies: {
                    select: { id: true, razaoSocial: true }
                }
            },
            orderBy: { createdAt: 'desc' }
        });

        return { success: true, data: users };
    } catch (error) {
        console.error("Erro ao buscar usuários:", error);
        return { success: false, error: "Erro ao carregar usuários." };
    }
}

/**
 * Cria um novo usuário (Auth + Banco)
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
        // 1. Cria no Auth (Garante hash de senha seguro e validações de email)
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

        // 2. Atualiza dados complementares no Banco (Role e Empresa) via Prisma
        // O Better Auth já criou o registro básico, agora fazemos o "enrichment"
        await prisma.user.update({
            where: { email: data.email },
            data: {
                role: data.role as any,
                emailVerified: true, // Opcional: Auto-verificar se criado por admin
                isActive: true,      // Garante que nasce ativo
                companies: data.companyId ? {
                    connect: { id: data.companyId }
                } : undefined
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
 */
export async function updateUserAction(id: string, data: Partial<CreateUserInput>) {
    const session = await getProtectedSession();

    if (!session || !WRITE_ROLES.includes(session.role)) {
        return { success: false as const, error: "Você não tem permissão para editar usuários." };
    }

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
                // Atualização da Empresa: Substitui vínculos anteriores pelo novo
                companies: {
                    set: [], // Limpa vínculos existentes
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

/**
 * [NOVO] Alterna o status do usuário (Ativar/Desativar)
 */
export async function toggleUserStatusAction(id: string, currentStatus: boolean) {
    const session = await getProtectedSession();

    if (!session || !WRITE_ROLES.includes(session.role)) {
        return { success: false as const, error: "Permissão negada." };
    }

    // Segurança: Admin não pode se auto-desativar
    if (id === session.userId) {
        return { success: false as const, error: "Você não pode desativar seu próprio usuário." };
    }

    try {
        const newStatus = !currentStatus;

        await prisma.user.update({
            where: { id },
            data: { isActive: newStatus }
        });

        revalidatePath("/admin/usuarios");
        return {
            success: true as const,
            message: `Usuário ${newStatus ? 'ativado' : 'desativado'} com sucesso.`
        };
    } catch (error) {
        return handleActionError(error);
    }
}