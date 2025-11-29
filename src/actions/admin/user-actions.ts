"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { createUserSchema, CreateUserInput } from "@/core/application/schema/user-schema";
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
const WRITE_ROLES = ["ADMIN"];

// --- Helper de Tratamento de Erros ---
function handleActionError(error: any) {
    console.error("[UserAction Error]:", error);

    if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2002') {
            return { success: false as const, error: "Este e-mail já está em uso por outro usuário." };
        }
    }

    if (error?.body?.message) {
        return { success: false as const, error: error.body.message };
    }

    return { success: false as const, error: "Ocorreu um erro interno. Tente novamente." };
}

/**
 * Lista todos os usuários e suas empresas (via Membership)
 */
export async function getUsersAction(filters?: GetUsersParams) {
    const session = await getProtectedSession();
    if (!session) return { success: false, error: "Não autorizado." };

    try {
        const whereClause: Prisma.UserWhereInput = {};

        // 1. Busca por Texto
        if (filters?.search) {
            whereClause.OR = [
                { name: { contains: filters.search, mode: "insensitive" } },
                { email: { contains: filters.search, mode: "insensitive" } },
            ];
        }

        // 2. Filtro por Role
        if (filters?.role && filters.role !== "ALL") {
            whereClause.role = filters.role as Role;
        }

        const users = await prisma.user.findMany({
            where: whereClause,
            include: {
                // Buscamos os vínculos para saber de qual empresa ele é
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

        // Opcional: Flatten para facilitar o frontend (pega a primeira empresa encontrada)
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
 * Cria um novo usuário (Auth + Banco + Membership)
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
        // 1. Cria no Auth
        const newUserResponse = await auth.api.signUpEmail({
            body: {
                email: data.email,
                password: data.password,
                name: data.name,
            },
            headers: await headers()
        });

        if (!newUserResponse?.user) {
            return { success: false as const, error: "Erro ao registrar autenticação." };
        }

        const newUserId = newUserResponse.user.id;

        // 2. Transação para atualizar Role e Criar Vínculo
        await prisma.$transaction(async (tx) => {

            // Atualiza dados globais
            await tx.user.update({
                where: { id: newUserId },
                data: {
                    role: data.role as Role,
                    emailVerified: true,
                    isActive: true,
                }
            });

            // Se foi selecionada uma empresa, cria o registro na tabela Membership
            if (data.companyId) {
                await tx.membership.create({
                    data: {
                        userId: newUserId,
                        companyId: data.companyId,
                        // Se o usuário global é admin, damos admin na empresa também
                        role: data.role === 'CLIENTE_ADMIN' ? 'ADMIN' : 'CLIENTE_USER'
                    }
                });
            }
        });

        revalidatePath("/admin/usuarios");
        return { success: true as const };

    } catch (error) {
        return handleActionError(error);
    }
}

/**
 * Atualiza um usuário existente e troca sua empresa
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
        await prisma.$transaction(async (tx) => {
            // 1. Atualiza dados básicos
            await tx.user.update({
                where: { id },
                data: {
                    name: data.name,
                    email: data.email,
                    role: data.role as Role,
                }
            });

            // 2. Gerencia a troca de empresa (Se houver companyId no form)
            // Em um sistema Admin estrito, assumimos que o usuário só tem UMA empresa por vez.
            if (data.companyId) {
                // Remove vínculos anteriores
                await tx.membership.deleteMany({
                    where: { userId: id }
                });

                // Cria o novo vínculo
                await tx.membership.create({
                    data: {
                        userId: id,
                        companyId: data.companyId,
                        role: data.role === 'CLIENTE_ADMIN' ? 'ADMIN' : 'CLIENTE_USER'
                    }
                });
            } else if (data.companyId === "") {
                // Se mandou string vazia, remove da empresa (deixa órfão)
                await tx.membership.deleteMany({
                    where: { userId: id }
                });
            }
        });

        revalidatePath("/admin/usuarios");
        return { success: true as const };

    } catch (error) {
        return handleActionError(error);
    }
}

/**
 * Alterna o status do usuário (Ativar/Desativar)
 */
export async function toggleUserStatusAction(id: string, currentStatus: boolean) {
    const session = await getProtectedSession();

    if (!session || !WRITE_ROLES.includes(session.role)) {
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

        revalidatePath("/admin/usuarios");
        return {
            success: true as const,
            message: `Usuário ${newStatus ? 'ativado' : 'desativado'} com sucesso.`
        };
    } catch (error) {
        return handleActionError(error);
    }
}