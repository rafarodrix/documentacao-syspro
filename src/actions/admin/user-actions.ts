// src/actions/admin/user-actions.ts
"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { createUserSchema, CreateUserInput } from "@/core/application/schema/user-schema";
import { getProtectedSession } from "@/lib/auth-helpers";
import { revalidatePath } from "next/cache";
import { Prisma, Role } from "@prisma/client";
import { z } from "zod";

// --- Tipagens Padronizadas ---
export type ActionResponse = {
    success: boolean;
    message?: string;
    errors?: Record<string, string[]>;
    data?: any;
};

interface GetUsersParams {
    search?: string;
    role?: string;
}

const linkUserSchema = z.object({
    email: z.string().email("E-mail inválido"),
    role: z.nativeEnum(Role),
    companyId: z.string().min(1, "Selecione uma empresa"),
});

export type LinkUserInput = z.infer<typeof linkUserSchema>;

// --- Permissões ---
const READ_ROLES: Role[] = [Role.ADMIN, Role.DEVELOPER, Role.SUPORTE];
const WRITE_ROLES: Role[] = [Role.ADMIN, Role.DEVELOPER];

// --- Central de Erros ---
function handleActionError(error: any): ActionResponse {
    console.error("[UserAction Error]:", error);

    if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2002') {
            const target = (error.meta?.target as string[]) || [];
            if (target.includes('email')) return { success: false, message: "Este e-mail já está em uso." };
            if (target.includes('cpf')) return { success: false, message: "Este CPF já está cadastrado no sistema." };
        }
    }

    return { success: false, message: error.message || "Ocorreu um erro interno no servidor." };
}

/**
 * Lista usuários ativos (Soft Delete aplicado)
 */
export async function getUsersAction(filters?: GetUsersParams) {
    const session = await getProtectedSession();
    if (!session || !READ_ROLES.includes(session.role)) {
        return { success: false, message: "Não autorizado." };
    }

    try {
        const whereClause: Prisma.UserWhereInput = {
            deletedAt: null // Filtro para ignorar usuários deletados
        };

        if (filters?.search) {
            whereClause.OR = [
                { name: { contains: filters.search, mode: "insensitive" } },
                { email: { contains: filters.search, mode: "insensitive" } },
                { cpf: { contains: filters.search.replace(/\D/g, "") } },
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
                        company: { select: { id: true, nomeFantasia: true, razaoSocial: true } }
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
        return { success: false, message: "Erro ao carregar usuários." };
    }
}

/**
 * Cria usuário integrando Auth e novos campos (CPF, JobTitle)
 */
export async function createUserAction(data: CreateUserInput): Promise<ActionResponse> {
    const session = await getProtectedSession();
    if (!session || !WRITE_ROLES.includes(session.role)) {
        return { success: false, message: "Permissão negada." };
    }

    const validation = createUserSchema.safeParse(data);
    if (!validation.success) {
        return { success: false, errors: validation.error.flatten().fieldErrors as any, message: "Dados inválidos." };
    }

    if (!data.password) return { success: false, message: "Senha obrigatória para novos usuários." };

    try {
        // 1. Registro no Provedor de Auth (Better-Auth / Next-Auth)
        const authResponse = await auth.api.signUpEmail({
            body: {
                email: data.email,
                password: data.password,
                name: data.name,
            },
            headers: await headers()
        });

        if (!authResponse?.user) return { success: false, message: "Falha na criação da conta de autenticação." };

        // 2. Transação para configurar Role, CPF e Vínculo inicial
        await prisma.$transaction(async (tx) => {
            await tx.user.update({
                where: { id: authResponse.user.id },
                data: {
                    role: data.role as Role,
                    cpf: data.cpf ? data.cpf.replace(/\D/g, "") : null, // Limpa máscara
                    jobTitle: data.jobTitle || null,
                    phone: data.phone || null,
                    isActive: true,
                    emailVerified: true
                }
            });

            if (data.companyId) {
                await tx.membership.create({
                    data: {
                        userId: authResponse.user.id,
                        companyId: data.companyId,
                        role: (data.role === Role.ADMIN) ? Role.ADMIN : Role.CLIENTE_USER
                    }
                });
            }
        });

        revalidatePath("/admin/cadastros");
        return { success: true, message: "Usuário criado com sucesso!" };
    } catch (error) {
        return handleActionError(error);
    }
}

/**
 * Atualiza usuário incluindo suporte aos novos campos profissionais
 */
export async function updateUserAction(id: string, data: Partial<CreateUserInput>): Promise<ActionResponse> {
    const session = await getProtectedSession();
    if (!session || !WRITE_ROLES.includes(session.role)) {
        return { success: false, message: "Acesso negado." };
    }

    try {
        await prisma.$transaction(async (tx) => {
            await tx.user.update({
                where: { id },
                data: {
                    name: data.name,
                    email: data.email,
                    role: data.role as Role,
                    jobTitle: data.jobTitle,
                    phone: data.phone,
                    cpf: data.cpf ? data.cpf.replace(/\D/g, "") : undefined,
                }
            });

            if (data.companyId) {
                // Atualiza vínculo: remove antigos e cria o novo principal
                await tx.membership.deleteMany({ where: { userId: id } });
                await tx.membership.create({
                    data: {
                        userId: id,
                        companyId: data.companyId,
                        role: (data.role === Role.ADMIN) ? Role.ADMIN : Role.CLIENTE_USER
                    }
                });
            }
        });

        revalidatePath("/admin/cadastros");
        return { success: true, message: "Usuário atualizado com sucesso." };
    } catch (error) {
        return handleActionError(error);
    }
}

/**
 * Soft Delete do Usuário
 */
export async function deleteUserAction(id: string): Promise<ActionResponse> {
    const session = await getProtectedSession();
    if (!session || !WRITE_ROLES.includes(session.role)) {
        return { success: false, message: "Permissão negada." };
    }

    if (id === session.userId) return { success: false, message: "Você não pode excluir a si mesmo." };

    try {
        await prisma.user.update({
            where: { id },
            data: {
                deletedAt: new Date(),
                isActive: false
            }
        });

        revalidatePath("/admin/cadastros");
        return { success: true, message: "Usuário removido com sucesso." };
    } catch (error) {
        return handleActionError(error);
    }
}

/**
 * Alterna Ativo/Inativo
 */
export async function toggleUserStatusAction(id: string, currentStatus: boolean): Promise<ActionResponse> {
    const session = await getProtectedSession();
    if (!session || !WRITE_ROLES.includes(session.role)) {
        return { success: false, message: "Permissão negada." };
    }

    try {
        await prisma.user.update({
            where: { id },
            data: { isActive: !currentStatus }
        });

        revalidatePath("/admin/cadastros");
        return { success: true, message: `Usuário ${!currentStatus ? 'ativado' : 'desativado'} com sucesso.` };
    } catch (error) {
        return handleActionError(error);
    }
}

// Adicione estas funções ao seu arquivo src/actions/admin/user-actions.ts

/**
 * VINCULAR USUÁRIO EXISTENTE A UMA EMPRESA
 */
export async function linkUserToCompanyAction(data: LinkUserInput): Promise<ActionResponse> {
    const session = await getProtectedSession();
    if (!session || !WRITE_ROLES.includes(session.role)) {
        return { success: false, message: "Permissão negada." };
    }

    const validation = linkUserSchema.safeParse(data);
    if (!validation.success) return { success: false, message: "Dados inválidos." };

    try {
        const targetUser = await prisma.user.findUnique({ where: { email: data.email } });
        if (!targetUser) return { success: false, message: "Usuário não encontrado." };

        await prisma.membership.upsert({
            where: { userId_companyId: { userId: targetUser.id, companyId: data.companyId } },
            create: { userId: targetUser.id, companyId: data.companyId, role: data.role },
            update: { role: data.role }
        });

        revalidatePath("/admin/cadastros");
        return { success: true, message: "Vínculo realizado com sucesso!" };
    } catch (error) {
        return handleActionError(error);
    }
}

/**
 * REMOVER ACESSO DE UMA EMPRESA
 */
export async function removeUserFromCompanyAction(userId: string, companyId: string): Promise<ActionResponse> {
    const session = await getProtectedSession();
    if (!session || !WRITE_ROLES.includes(session.role)) {
        return { success: false, message: "Permissão negada." };
    }

    try {
        const count = await prisma.membership.count({ where: { userId } });
        if (count <= 1) return { success: false, message: "O usuário deve ter pelo menos um vínculo ativo." };

        await prisma.membership.delete({ where: { userId_companyId: { userId, companyId } } });

        revalidatePath("/admin/cadastros");
        return { success: true, message: "Vínculo removido." };
    } catch (error) {
        return handleActionError(error);
    }
}

/**
 * ATUALIZAR ROLE EM UMA UNIDADE
 */
export async function updateMembershipRoleAction(userId: string, companyId: string, newRole: Role): Promise<ActionResponse> {
    const session = await getProtectedSession();
    if (!session || !WRITE_ROLES.includes(session.role)) {
        return { success: false, message: "Permissão negada." };
    }

    try {
        await prisma.membership.update({
            where: { userId_companyId: { userId, companyId } },
            data: { role: newRole }
        });

        revalidatePath("/admin/cadastros");
        return { success: true, message: "Nível de acesso atualizado." };
    } catch (error) {
        return handleActionError(error);
    }
}