"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { createUserSchema, CreateUserInput } from "@/core/application/schema/user-schema";
import { getProtectedSession } from "@/lib/auth-helpers";
import { revalidatePath } from "next/cache";
import { Prisma, Role } from "@prisma/client";
import { hash } from "bcryptjs"; // Importando hash (embora estejamos usando Better Auth agora, se usar create manual precisa)

// --- Tipos ---
interface GetUsersParams {
    search?: string;
    role?: string;
}

// --- Constantes de Permissão (Tipagem Explícita) ---
const READ_ROLES = [Role.ADMIN, Role.DEVELOPER, Role.SUPORTE] as const;
const WRITE_ROLES = [Role.ADMIN, Role.DEVELOPER] as const;

// Helper para verificar permissão de forma segura
function hasRole(role: Role, allowedRoles: readonly Role[]) {
    return allowedRoles.includes(role);
}

// --- Helper de Tratamento de Erros ---
function handleActionError(error: any) {
    console.error("[UserAction Error]:", error);

    if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2002') {
            return { success: false as const, error: "Este e-mail já está em uso." };
        }
    }

    if (error?.body?.message) {
        return { success: false as const, error: error.body.message };
    }

    return { success: false as const, error: error.message || "Ocorreu um erro interno." };
}

/**
 * Lista todos os usuários
 */
export async function getUsersAction(filters?: GetUsersParams) {
    const session = await getProtectedSession();

    // Validação segura de Role
    if (!session || !hasRole(session.role, READ_ROLES)) {
        return { success: false, error: "Não autorizado." };
    }

    try {
        const whereClause: Prisma.UserWhereInput = {};

        if (filters?.search) {
            whereClause.OR = [
                { name: { contains: filters.search, mode: "insensitive" } },
                { email: { contains: filters.search, mode: "insensitive" } },
            ];
        }

        if (filters?.role && filters.role !== "ALL") {
            whereClause.role = filters.role as Role;
        }

        const users = await prisma.user.findMany({
            where: whereClause,
            include: {
                memberships: {
                    include: {
                        company: {
                            select: { id: true, nomeFantasia: true, razaoSocial: true }
                        }
                    }
                }
            },
            orderBy: { createdAt: 'desc' }
        });

        const formattedUsers = users.map(user => ({
            ...user,
            companyName: user.memberships[0]?.company?.nomeFantasia || "Sem Vínculo",
            companyId: user.memberships[0]?.companyId || null
        }));

        return { success: true, data: formattedUsers };
    } catch (error) {
        console.error("Erro ao buscar usuários:", error);
        return { success: false, error: "Erro ao carregar usuários." };
    }
}

/**
 * Cria um novo usuário
 */
export async function createUserAction(data: CreateUserInput) {
    const session = await getProtectedSession();

    if (!session || !hasRole(session.role, WRITE_ROLES)) {
        return { success: false as const, error: "Permissão negada." };
    }

    const validation = createUserSchema.safeParse(data);
    if (!validation.success) {
        return { success: false as const, error: "Dados inválidos." }; // Simplificado para evitar erro de tipo complexo
    }

    try {
        // 1. Cria no Auth (Gera hash seguro automaticamente via Better Auth)
        const newUserResponse = await auth.api.signUpEmail({
            body: {
                email: data.email,
                password: data.password,
                name: data.name,
            },
            headers: await headers()
        });

        if (!newUserResponse?.user) {
            return { success: false as const, error: "Falha ao criar conta no provedor de autenticação." };
        }

        const newUserId = newUserResponse.user.id;

        // 2. Transação para configurar Role e Empresa
        await prisma.$transaction(async (tx) => {
            await tx.user.update({
                where: { id: newUserId },
                data: {
                    role: data.role as Role,
                    emailVerified: true,
                    isActive: true,
                }
            });

            if (data.companyId) {
                await tx.membership.create({
                    data: {
                        userId: newUserId,
                        companyId: data.companyId,
                        role: (data.role === Role.CLIENTE_ADMIN || data.role === Role.ADMIN)
                            ? Role.ADMIN
                            : Role.CLIENTE_USER
                    }
                });
            }
        });

        revalidatePath("/admin/cadastros");
        revalidatePath("/app/cadastros");
        return { success: true as const };

    } catch (error) {
        return handleActionError(error);
    }
}

/**
 * Atualiza um usuário
 */
export async function updateUserAction(id: string, data: Partial<CreateUserInput>) {
    const session = await getProtectedSession();

    if (!session || !hasRole(session.role, WRITE_ROLES)) {
        return { success: false as const, error: "Permissão negada." };
    }

    if (!data.email || !data.role) {
        return { success: false as const, error: "Dados obrigatórios faltando." };
    }

    try {
        await prisma.$transaction(async (tx) => {
            await tx.user.update({
                where: { id },
                data: {
                    name: data.name,
                    email: data.email,
                    role: data.role as Role,
                }
            });

            if (data.companyId !== undefined) {
                await tx.membership.deleteMany({
                    where: { userId: id }
                });

                if (data.companyId) {
                    await tx.membership.create({
                        data: {
                            userId: id,
                            companyId: data.companyId,
                            role: (data.role === Role.CLIENTE_ADMIN || data.role === Role.ADMIN)
                                ? Role.ADMIN
                                : Role.CLIENTE_USER
                        }
                    });
                }
            }
        });

        revalidatePath("/admin/cadastros");
        revalidatePath("/app/cadastros");
        return { success: true as const };

    } catch (error) {
        return handleActionError(error);
    }
}

/**
 * Alterna Status
 */
export async function toggleUserStatusAction(id: string, currentStatus: boolean) {
    const session = await getProtectedSession();

    if (!session || !hasRole(session.role, WRITE_ROLES)) {
        return { success: false as const, error: "Permissão negada." };
    }

    if (id === session.userId) {
        return { success: false as const, error: "Você não pode desativar seu próprio usuário." };
    }

    try {
        const newStatus = !currentStatus;

        await prisma.user.update({
            where: { id },
            data: { isActive: newStatus }
        });

        revalidatePath("/admin/cadastros");
        revalidatePath("/app/cadastros");

        return {
            success: true as const,
            message: `Usuário ${newStatus ? 'ativado' : 'desativado'} com sucesso.`
        };
    } catch (error) {
        return handleActionError(error);
    }
}