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

// --- Constantes de Permissão (Usando Enum do Prisma) ---
const READ_ROLES: Role[] = [Role.ADMIN, Role.DEVELOPER, Role.SUPORTE];
const WRITE_ROLES: Role[] = [Role.ADMIN, Role.DEVELOPER];

// --- Helper de Tratamento de Erros ---
function handleActionError(error: any) {
    console.error("[UserAction Error]:", error);

    // Erro de Unicidade do Prisma
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2002') {
            return { success: false as const, error: "Este e-mail já está em uso." };
        }
    }

    // Erro vindo da API do Better Auth (APIError)
    if (error?.body?.message) {
        return { success: false as const, error: error.body.message };
    }

    // Erro genérico
    return { success: false as const, error: error.message || "Ocorreu um erro interno." };
}

/**
 * Lista todos os usuários e suas empresas
 */
export async function getUsersAction(filters?: GetUsersParams) {
    const session = await getProtectedSession();
    if (!session || !READ_ROLES.includes(session.role)) {
        return { success: false, error: "Não autorizado." };
    }

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

        // Flatten para o Frontend
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
        return { success: false as const, error: "Permissão negada." };
    }

    const validation = createUserSchema.safeParse(data);
    if (!validation.success) {
        return { success: false as const, error: validation.error.flatten().fieldErrors };
    }

    try {
        // 1. Cria no Auth (Gera hash seguro automaticamente)
        // OBS: Passamos headers para o Better Auth saber o contexto, mas a criação é segura.
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
            // A. Atualiza dados que o signUpEmail não preenche (Role, Status, Verificação)
            await tx.user.update({
                where: { id: newUserId },
                data: {
                    role: data.role as Role,
                    emailVerified: true, // Criado por Admin = Verificado
                    isActive: true,
                }
            });

            // B. Cria o vínculo com a empresa (Membership)
            if (data.companyId) {
                await tx.membership.create({
                    data: {
                        userId: newUserId,
                        companyId: data.companyId,
                        // Define a role dentro da empresa baseada na role do sistema
                        role: (data.role === Role.CLIENTE_ADMIN || data.role === Role.ADMIN)
                            ? Role.ADMIN
                            : Role.CLIENTE_USER
                    }
                });
            }
        });

        revalidatePath("/admin/usuarios");
        return { success: true as const };

    } catch (error) {
        // Se falhar no meio, tentamos limpar o usuário criado no Auth (Rollback manual)
        // Isso é avançado, mas idealmente seria tratado aqui.
        return handleActionError(error);
    }
}

/**
 * Atualiza um usuário existente
 */
export async function updateUserAction(id: string, data: Partial<CreateUserInput>) {
    const session = await getProtectedSession();

    if (!session || !WRITE_ROLES.includes(session.role)) {
        return { success: false as const, error: "Permissão negada." };
    }

    if (!data.email || !data.role) {
        return { success: false as const, error: "Dados obrigatórios faltando." };
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

            // 2. Gerencia a troca de empresa (Single Tenant Logic)
            // Se o admin selecionou uma empresa diferente ou nenhuma:
            if (data.companyId !== undefined) {
                // Remove todos os vínculos anteriores (Garante que o usuário só tenha 1 empresa)
                await tx.membership.deleteMany({
                    where: { userId: id }
                });

                // Se houver ID, cria o novo vínculo
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

    // Impede o admin de se banir acidentalmente
    if (id === session.userId) {
        return { success: false as const, error: "Você não pode desativar seu próprio usuário." };
    }

    try {
        const newStatus = !currentStatus;

        await prisma.user.update({
            where: { id },
            data: { isActive: newStatus }
        });

        // Se desativou, podemos também invalidar as sessões do usuário (Opcional Better Auth)
        // await auth.api.revokeSessions({ ... }) 

        revalidatePath("/admin/usuarios");
        return {
            success: true as const,
            message: `Usuário ${newStatus ? 'ativado' : 'desativado'} com sucesso.`
        };
    } catch (error) {
        return handleActionError(error);
    }
}