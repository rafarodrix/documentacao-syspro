"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { createUserSchema, CreateUserInput } from "@/core/application/schema/user-schema";
import { getProtectedSession } from "@/lib/auth-helpers";
import { revalidatePath } from "next/cache";
import { Prisma, Role } from "@prisma/client";
import { z } from "zod";

// --- Tipos ---
interface GetUsersParams {
    search?: string;
    role?: string;
}

// Schema para validar o vínculo de usuário existente
const linkUserSchema = z.object({
    email: z.string().email("E-mail inválido"),
    role: z.nativeEnum(Role),
    companyId: z.string().min(1, "Selecione uma empresa"),
});

export type LinkUserInput = z.infer<typeof linkUserSchema>;

// --- Constantes de Permissão ---
const READ_ROLES = [Role.ADMIN, Role.DEVELOPER, Role.SUPORTE] as const;
const WRITE_ROLES = [Role.ADMIN, Role.DEVELOPER] as const;

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
 * Lista todos os usuários e suas empresas
 */
export async function getUsersAction(filters?: GetUsersParams) {
    const session = await getProtectedSession();

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
        return { success: false as const, error: "Dados inválidos." };
    }

    // --- CORREÇÃO AQUI ---
    // Como a senha é opcional no schema (para edição), precisamos garantir que ela existe na criação.
    if (!data.password) {
        return { success: false as const, error: "A senha é obrigatória para novos usuários." };
    }

    try {
        // 1. Cria no Auth
        const newUserResponse = await auth.api.signUpEmail({
            body: {
                email: data.email,
                password: data.password, // Agora o TS sabe que é string
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
                    // jobTitle e phone se você tiver adicionado ao schema
                    jobTitle: data.jobTitle || null,
                    phone: data.phone || null,
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
 * Atualiza um usuário existente
 */
export async function updateUserAction(id: string, data: Partial<CreateUserInput>) {
    const session = await getProtectedSession();

    if (!session || !hasRole(session.role, WRITE_ROLES)) {
        return { success: false as const, error: "Permissão negada." };
    }

    try {
        await prisma.$transaction(async (tx) => {
            // Atualiza dados básicos
            if (data.email || data.name || data.role) {
                await tx.user.update({
                    where: { id },
                    data: {
                        name: data.name,
                        email: data.email,
                        role: data.role as Role,
                        jobTitle: data.jobTitle || null,
                        phone: data.phone || null,
                    }
                });
            }

            // Se companyId vier preenchido, atualiza o vínculo principal
            if (data.companyId) {
                await tx.membership.deleteMany({ where: { userId: id } });
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
        });

        revalidatePath("/admin/cadastros");
        revalidatePath("/app/cadastros");
        return { success: true as const };

    } catch (error) {
        return handleActionError(error);
    }
}

/**
 * Alterna o status do usuário
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
        await prisma.user.update({
            where: { id },
            data: { isActive: !currentStatus }
        });

        revalidatePath("/admin/cadastros");
        revalidatePath("/app/cadastros");

        return {
            success: true as const,
            message: `Status alterado com sucesso.`
        };
    } catch (error) {
        return handleActionError(error);
    }
}

/**
 * VINCULAR USUÁRIO EXISTENTE A UMA EMPRESA
 */
export async function linkUserToCompanyAction(data: LinkUserInput) {
    const session = await getProtectedSession();

    if (!session || !["ADMIN", "CLIENTE_ADMIN"].includes(session.role)) {
        return { success: false, error: "Permissão negada." };
    }

    const validation = linkUserSchema.safeParse(data);
    if (!validation.success) return { success: false, error: "Dados inválidos." };

    try {
        const targetUser = await prisma.user.findUnique({
            where: { email: data.email }
        });

        if (!targetUser) {
            return { success: false, error: "Usuário não encontrado. Use a aba 'Criar Novo'." };
        }

        const existingMembership = await prisma.membership.findUnique({
            where: {
                userId_companyId: {
                    userId: targetUser.id,
                    companyId: data.companyId
                }
            }
        });

        if (existingMembership) {
            return { success: false, error: "Este usuário já está vinculado a esta empresa." };
        }

        await prisma.membership.create({
            data: {
                userId: targetUser.id,
                companyId: data.companyId,
                role: data.role
            }
        });

        revalidatePath("/admin/cadastros");
        revalidatePath("/app/cadastros");

        return { success: true, message: "Usuário vinculado com sucesso!" };

    } catch (error) {
        return handleActionError(error);
    }
}

/**
 * REMOVER VÍNCULO (Remove acesso de uma empresa específica)
 */
export async function removeUserFromCompanyAction(userId: string, companyId: string) {
    const session = await getProtectedSession();
    if (!session || !hasRole(session.role, WRITE_ROLES)) {
        return { success: false, error: "Permissão negada." };
    }

    try {
        // Impede remover o último vínculo (usuário ficaria órfão)
        const count = await prisma.membership.count({ where: { userId } });
        if (count <= 1) {
            return { success: false, error: "O usuário deve ter pelo menos uma empresa vinculada." };
        }

        await prisma.membership.delete({
            where: {
                userId_companyId: { userId, companyId }
            }
        });

        revalidatePath("/admin/cadastros");
        return { success: true, message: "Acesso removido com sucesso." };
    } catch (error) {
        return handleActionError(error);
    }
}

/**
 * ATUALIZAR ROLE EM UMA EMPRESA ESPECÍFICA
 */
export async function updateMembershipRoleAction(userId: string, companyId: string, newRole: Role) {
    const session = await getProtectedSession();
    if (!session || !hasRole(session.role, WRITE_ROLES)) {
        return { success: false, error: "Permissão negada." };
    }

    try {
        await prisma.membership.update({
            where: { userId_companyId: { userId, companyId } },
            data: { role: newRole }
        });

        revalidatePath("/admin/cadastros");
        return { success: true, message: "Permissão atualizada." };
    } catch (error) {
        return handleActionError(error);
    }
}