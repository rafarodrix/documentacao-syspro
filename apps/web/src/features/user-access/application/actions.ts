"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { createUserSchema, CreateUserInput } from "@dosc-syspro/contracts";
import { getProtectedSession } from "@/lib/auth-helpers";
import { revalidatePath } from "next/cache";
import { Prisma, Role } from "@prisma/client";
import { z } from "zod";
import { consumeActionRateLimit } from "@/lib/security/action-rate-limit";
import { getRequestIp } from "@/lib/security/request-context";

// --- Tipagens ---
export type ActionResponse<T = any> = {
    success: boolean;
    message?: string;
    errors?: Record<string, string[]>;
    data?: T;
};

interface GetUsersParams {
    search?: string;
    role?: string;
}

const linkUserSchema = z.object({
    email: z.string().email("E-mail invÃ¡lido"),
    role: z.nativeEnum(Role),
    companyId: z.string().min(1, "Selecione uma empresa"),
});

export type LinkUserInput = z.infer<typeof linkUserSchema>;

// --- PermissÃµes ---
const SYSTEM_ROLES: Role[] = [Role.ADMIN, Role.DEVELOPER, Role.SUPORTE];
const CLIENT_ROLES: Role[] = [Role.CLIENTE_ADMIN, Role.CLIENTE_USER];
const READ_ROLES: Role[] = [Role.ADMIN, Role.DEVELOPER, Role.SUPORTE, Role.CLIENTE_ADMIN];
const CREATE_USER_RATE_LIMIT = { max: 8, windowMs: 60_000 };

const userListSelect = {
    id: true,
    name: true,
    email: true,
    image: true,
    role: true,
    isActive: true,
    jobTitle: true,
    cpf: true,
    phone: true,
    deletedAt: true,
    createdAt: true,
    memberships: {
        select: {
            companyId: true,
            role: true,
            company: { select: { nomeFantasia: true, razaoSocial: true } }
        }
    }
} as const;

async function getSessionCompanyIds(userId: string): Promise<string[]> {
    const memberships = await prisma.membership.findMany({
        where: { userId },
        select: { companyId: true }
    });
    return memberships.map((m) => m.companyId);
}

async function canManageTargetUser(session: NonNullable<Awaited<ReturnType<typeof getProtectedSession>>>, targetUserId: string): Promise<boolean> {
    if (SYSTEM_ROLES.includes(session.role)) return true;
    if (session.role !== Role.CLIENTE_ADMIN) return false;

    const targetUser = await prisma.user.findUnique({
        where: { id: targetUserId },
        select: { role: true, deletedAt: true },
    });
    if (!targetUser || targetUser.deletedAt) return false;
    if (!CLIENT_ROLES.includes(targetUser.role)) return false;

    const managedCompanyIds = await getSessionCompanyIds(session.userId);
    if (managedCompanyIds.length === 0) return false;
    const targetMembership = await prisma.membership.findFirst({
        where: { userId: targetUserId, companyId: { in: managedCompanyIds } },
        select: { id: true },
    });
    return !!targetMembership;
}

type RemoveUserInput = {
    body: { userId: string };
    headers: Awaited<ReturnType<typeof headers>>;
};

type AdminApiShape = {
    removeUser: (input: RemoveUserInput) => Promise<unknown>;
};

function getAdminApi(): AdminApiShape | null {
    const candidate = auth.api.removeUser;
    if (typeof candidate !== "function") return null;
    return { removeUser: candidate as AdminApiShape["removeUser"] };
}

function revalidateCadastrosPaths() {
    revalidatePath("/app/cadastros");
    revalidatePath("/app/cadastros/empresa");
    revalidatePath("/app/cadastros/usuarios");
    revalidatePath("/app/cadastros/sistema");
}

// --- Central de Erros ---
function handleActionError(error: any): ActionResponse {
    console.error("[UserAction Error]:", error);
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2002') {
            const target = (error.meta?.target as string[]) || [];
            if (target.includes('email')) return { success: false, message: "Este e-mail jÃ¡ estÃ¡ em uso." };
            if (target.includes('cpf')) return { success: false, message: "Este CPF jÃ¡ estÃ¡ cadastrado." };
        }
    }
    return { success: false, message: error.message || "Erro interno no servidor." };
}

/**
 * LISTAR USUÃRIOS
 */
export async function getUsersAction(filters?: GetUsersParams): Promise<ActionResponse> {
    const session = await getProtectedSession();
    if (!session || !READ_ROLES.includes(session.role)) return { success: false, message: "NÃ£o autorizado." };

    try {
        const where: Prisma.UserWhereInput = { deletedAt: null };
        const isSystemRole = SYSTEM_ROLES.includes(session.role);

        if (!isSystemRole) {
            const companyIds = await getSessionCompanyIds(session.userId);
            if (!companyIds.length) return { success: true, data: [] };

            where.role = { in: [Role.CLIENTE_ADMIN, Role.CLIENTE_USER] };
            where.memberships = { some: { companyId: { in: companyIds } } };
        }
        if (filters?.search) {
            where.OR = [
                { name: { contains: filters.search, mode: "insensitive" } },
                { email: { contains: filters.search, mode: "insensitive" } },
                { cpf: { contains: filters.search.replace(/\D/g, "") } },
            ];
        }
        if (filters?.role && filters.role !== "ALL" && isSystemRole) where.role = filters.role as Role;

        const users = await prisma.user.findMany({
            where,
            select: userListSelect,
            orderBy: { createdAt: 'desc' }
        });

        const data = users.map(u => ({
            ...u,
            companyName: u.memberships[0]?.company?.nomeFantasia || "Sem VÃ­nculo",
            companyId: u.memberships[0]?.companyId || null
        }));

        return { success: true, data };
    } catch (error) {
        return { success: false, message: "Erro ao carregar usuÃ¡rios." };
    }
}

/**
 * CRIAR USUÃRIO (Com Rollback Corrigido)
 */
type UserUpsertInput = CreateUserInput & {
    additionalCompanyIds?: string[];
};

export async function createUserAction(data: UserUpsertInput): Promise<ActionResponse> {
    const session = await getProtectedSession();
    if (!session) return { success: false, message: "PermissÃ£o negada." };

    const isSystemRole = SYSTEM_ROLES.includes(session.role);
    const isClientManager = session.role === Role.CLIENTE_ADMIN;
    if (!isSystemRole && !isClientManager) return { success: false, message: "PermissÃ£o negada." };

    const validation = createUserSchema.safeParse(data);
    if (!validation.success) return { success: false, errors: validation.error.flatten().fieldErrors as any, message: "Dados invÃ¡lidos." };
    const ip = await getRequestIp();
    const rateLimit = consumeActionRateLimit({
        action: "createUserAction",
        max: CREATE_USER_RATE_LIMIT.max,
        windowMs: CREATE_USER_RATE_LIMIT.windowMs,
        userId: session.userId,
        ip,
    });
    if (!rateLimit.allowed) {
        return {
            success: false,
            message: `Muitas tentativas. Aguarde ${rateLimit.retryAfterSeconds}s e tente novamente.`,
        };
    }

    const additionalCompanyIds = Array.isArray(data.additionalCompanyIds)
        ? data.additionalCompanyIds.filter(Boolean)
        : [];
    const desiredCompanyIds = Array.from(new Set([data.companyId, ...additionalCompanyIds].filter(Boolean) as string[]));

    if (isClientManager) {
        const managedCompanyIds = await getSessionCompanyIds(session.userId);
        if (!data.companyId || !managedCompanyIds.includes(data.companyId)) {
            return { success: false, message: "Empresa invÃ¡lida para este gestor." };
        }
        if (desiredCompanyIds.some((companyId) => !managedCompanyIds.includes(companyId))) {
            return { success: false, message: "Uma ou mais empresas informadas sao invalidas para este gestor." };
        }

        if (data.role !== Role.CLIENTE_USER && data.role !== Role.CLIENTE_ADMIN) {
            return { success: false, message: "Gestor pode cadastrar apenas usuÃ¡rios da unidade." };
        }
    }

    let createdAuthUserId: string | undefined;
    const adminApi = getAdminApi();
    if (!adminApi) {
        return {
            success: false,
            message: "Configuracao incompleta do auth: plugin admin.removeUser indisponivel.",
        };
    }

    try {
        // 1. Registro no Auth
        const authResponse = await auth.api.signUpEmail({
            body: {
                email: validation.data.email,
                password: validation.data.password || data.password || "",
                name: validation.data.name,
            },
            headers: await headers()
        });

        if (!authResponse?.user) return { success: false, message: "Falha na criaÃ§Ã£o da conta." };
        createdAuthUserId = authResponse.user.id;

        // 2. TransaÃ§Ã£o Prisma
        await prisma.$transaction(async (tx) => {
            await tx.user.update({
                where: { id: createdAuthUserId },
                data: {
                    role: validation.data.role as Role,
                    cpf: validation.data.cpf ?? null,
                    jobTitle: validation.data.jobTitle || null,
                    phone: validation.data.phone || null,
                    isActive: true,
                    emailVerified: true
                }
            });

            if (desiredCompanyIds.length) {
                await tx.membership.createMany({
                    data: desiredCompanyIds.map((companyId) => ({
                        userId: createdAuthUserId!,
                        companyId,
                        role: validation.data.role === Role.CLIENTE_ADMIN ? Role.CLIENTE_ADMIN : Role.CLIENTE_USER,
                    })),
                    skipDuplicates: true,
                });
            }
        });

        revalidateCadastrosPaths();
        return { success: true, message: "UsuÃ¡rio criado com sucesso!" };

    } catch (error) {
        // ROLLBACK: Remove do Auth se o banco falhar
        if (createdAuthUserId) {
            try {
                const adminApi = getAdminApi();
                if (!adminApi) throw new Error("Rollback indisponivel: admin.removeUser nao configurado.");
                await adminApi.removeUser({
                    body: { userId: createdAuthUserId },
                    headers: await headers()
                });
            } catch (rollbackError) {
                console.error("Erro crÃ­tico no Rollback:", rollbackError);
            }
        }
        return handleActionError(error);
    }
}

/**
 * ATUALIZAR USUÃRIO
 */
export async function updateUserAction(id: string, data: Partial<UserUpsertInput>): Promise<ActionResponse> {
    const session = await getProtectedSession();
    if (!session) return { success: false, message: "Acesso negado." };

    const isSystemRole = SYSTEM_ROLES.includes(session.role);
    const isClientManager = session.role === Role.CLIENTE_ADMIN;
    if (!isSystemRole && !isClientManager) return { success: false, message: "Acesso negado." };
    const updateValidation = createUserSchema.partial().safeParse(data);
    if (!updateValidation.success) {
        return {
            success: false,
            errors: updateValidation.error.flatten().fieldErrors as any,
            message: "Dados invÃ¡lidos.",
        };
    }

    const additionalCompanyIds = Array.isArray(data.additionalCompanyIds)
        ? data.additionalCompanyIds.filter(Boolean)
        : [];
    const desiredCompanyIds = data.companyId
        ? Array.from(new Set([data.companyId, ...additionalCompanyIds]))
        : null;

    let managedCompanyIdsForClientManager: string[] = [];

    if (isClientManager) {
        const canManage = await canManageTargetUser(session, id);
        if (!canManage) return { success: false, message: "VocÃª nÃ£o pode editar este usuÃ¡rio." };

        if (data.role && data.role !== Role.CLIENTE_USER && data.role !== Role.CLIENTE_ADMIN) {
            return { success: false, message: "Gestor nÃ£o pode atribuir perfil interno." };
        }

        if (desiredCompanyIds?.length) {
            managedCompanyIdsForClientManager = await getSessionCompanyIds(session.userId);
            if (desiredCompanyIds.some((companyId) => !managedCompanyIdsForClientManager.includes(companyId))) {
                return { success: false, message: "Uma ou mais empresas informadas sao invalidas para este gestor." };
            }
        }
    }

    try {
        await prisma.$transaction(async (tx) => {
            await tx.user.update({
                where: { id },
                data: {
                    name: updateValidation.data.name,
                    email: updateValidation.data.email,
                    role: updateValidation.data.role as Role | undefined,
                    jobTitle: updateValidation.data.jobTitle,
                    phone: updateValidation.data.phone,
                    cpf: updateValidation.data.cpf,
                }
            });

            if (desiredCompanyIds?.length) {
                const membershipRole =
                    updateValidation.data.role === Role.CLIENTE_ADMIN
                        ? Role.CLIENTE_ADMIN
                        : Role.CLIENTE_USER;

                if (isClientManager) {
                    await tx.membership.deleteMany({
                        where: {
                            userId: id,
                            companyId: { in: managedCompanyIdsForClientManager, notIn: desiredCompanyIds },
                        },
                    });
                } else {
                    await tx.membership.deleteMany({
                        where: {
                            userId: id,
                            companyId: { notIn: desiredCompanyIds },
                        },
                    });
                }

                await Promise.all(desiredCompanyIds.map((companyId) => tx.membership.upsert({
                    where: { userId_companyId: { userId: id, companyId } },
                    create: {
                        userId: id,
                        companyId,
                        role: membershipRole,
                    },
                    update: { role: membershipRole },
                })));
            } else if (!isClientManager) {
                await tx.membership.deleteMany({
                    where: { userId: id },
                });
            }
        });

        revalidateCadastrosPaths();
        return { success: true, message: "UsuÃ¡rio atualizado com sucesso." };
    } catch (error) {
        return handleActionError(error);
    }
}

/**
 * SOFT DELETE
 */
export async function deleteUserAction(id: string): Promise<ActionResponse> {
    const session = await getProtectedSession();
    if (!session || id === session.userId) return { success: false, message: "OperaÃ§Ã£o invÃ¡lida." };

    const isSystemRole = SYSTEM_ROLES.includes(session.role);
    const isClientManager = session.role === Role.CLIENTE_ADMIN;
    if (!isSystemRole && !isClientManager) return { success: false, message: "Acesso negado." };
    if (isClientManager && !(await canManageTargetUser(session, id))) {
        return { success: false, message: "VocÃª nÃ£o pode remover este usuÃ¡rio." };
    }

    try {
        await prisma.user.update({
            where: { id },
            data: { deletedAt: new Date(), isActive: false }
        });
        revalidateCadastrosPaths();
        return { success: true, message: "Removido com sucesso." };
    } catch (error) {
        return handleActionError(error);
    }
}

/**
 * VINCULAR A EMPRESA
 */
export async function linkUserToCompanyAction(data: LinkUserInput): Promise<ActionResponse> {
    const session = await getProtectedSession();
    if (!session) return { success: false, message: "Acesso negado." };

    const isSystemRole = SYSTEM_ROLES.includes(session.role);
    const isClientManager = session.role === Role.CLIENTE_ADMIN;
    if (!isSystemRole && !isClientManager) return { success: false, message: "Acesso negado." };

    try {
        if (isClientManager) {
            const managedCompanyIds = await getSessionCompanyIds(session.userId);
            if (!managedCompanyIds.includes(data.companyId)) {
                return { success: false, message: "Empresa invÃ¡lida para este gestor." };
            }
            if (data.role !== Role.CLIENTE_ADMIN && data.role !== Role.CLIENTE_USER) {
                return { success: false, message: "Perfil invÃ¡lido para contexto de cliente." };
            }
        }

        const user = await prisma.user.findUnique({ where: { email: data.email } });
        if (!user) return { success: false, message: "UsuÃ¡rio nÃ£o encontrado." };
        if (isClientManager && !CLIENT_ROLES.includes(user.role)) {
            return { success: false, message: "NÃ£o Ã© permitido vincular usuÃ¡rio interno." };
        }

        await prisma.membership.upsert({
            where: { userId_companyId: { userId: user.id, companyId: data.companyId } },
            create: { userId: user.id, companyId: data.companyId, role: data.role },
            update: { role: data.role }
        });

        revalidateCadastrosPaths();
        return { success: true, message: "VÃ­nculo atualizado." };
    } catch (error) {
        return handleActionError(error);
    }
}

/**
 * ALTERAR STATUS (Ativo/Inativo)
 */
export async function toggleUserStatusAction(id: string, active: boolean): Promise<ActionResponse> {
    const session = await getProtectedSession();
    if (!session) return { success: false, message: "Acesso negado." };

    const isSystemRole = SYSTEM_ROLES.includes(session.role);
    const isClientManager = session.role === Role.CLIENTE_ADMIN;
    if (!isSystemRole && !isClientManager) return { success: false, message: "Acesso negado." };
    if (isClientManager && !(await canManageTargetUser(session, id))) {
        return { success: false, message: "VocÃª nÃ£o pode alterar este usuÃ¡rio." };
    }

    try {
        await prisma.user.update({
            where: { id },
            data: { isActive: active }
        });
        revalidateCadastrosPaths();
        return { success: true, message: `UsuÃ¡rio ${active ? 'ativado' : 'desativado'} com sucesso.` };
    } catch (error) {
        return handleActionError(error);
    }
}

/**
 * REMOVER USUÃRIO DE UMA EMPRESA (Remover Membership)
 */
export async function removeUserFromCompanyAction(userId: string, companyId: string): Promise<ActionResponse> {
    const session = await getProtectedSession();
    if (!session) return { success: false, message: "Acesso negado." };

    const isSystemRole = SYSTEM_ROLES.includes(session.role);
    const isClientManager = session.role === Role.CLIENTE_ADMIN;
    if (!isSystemRole && !isClientManager) return { success: false, message: "Acesso negado." };
    if (isClientManager) {
        if (!(await canManageTargetUser(session, userId))) {
            return { success: false, message: "VocÃª nÃ£o pode alterar este usuÃ¡rio." };
        }
        const managedCompanyIds = await getSessionCompanyIds(session.userId);
        if (!managedCompanyIds.includes(companyId)) {
            return { success: false, message: "Empresa invÃ¡lida para este gestor." };
        }
    }

    try {
        await prisma.membership.delete({
            where: {
                userId_companyId: { userId, companyId }
            }
        });
        revalidateCadastrosPaths();
        return { success: true, message: "VÃ­nculo removido com sucesso." };
    } catch (error) {
        return handleActionError(error);
    }
}

/**
 * ATUALIZAR CARGO NA EMPRESA
 */
export async function updateMembershipRoleAction(userId: string, companyId: string, role: Role): Promise<ActionResponse> {
    const session = await getProtectedSession();
    if (!session) return { success: false, message: "Acesso negado." };

    const isSystemRole = SYSTEM_ROLES.includes(session.role);
    const isClientManager = session.role === Role.CLIENTE_ADMIN;
    if (!isSystemRole && !isClientManager) return { success: false, message: "Acesso negado." };
    if (isClientManager) {
        if (!(await canManageTargetUser(session, userId))) {
            return { success: false, message: "VocÃª nÃ£o pode alterar este usuÃ¡rio." };
        }
        const managedCompanyIds = await getSessionCompanyIds(session.userId);
        if (!managedCompanyIds.includes(companyId)) {
            return { success: false, message: "Empresa invÃ¡lida para este gestor." };
        }
        if (role !== Role.CLIENTE_ADMIN && role !== Role.CLIENTE_USER) {
            return { success: false, message: "Perfil invÃ¡lido para contexto de cliente." };
        }
    }

    try {
        await prisma.membership.update({
            where: {
                userId_companyId: { userId, companyId }
            },
            data: { role }
        });
        revalidateCadastrosPaths();
        return { success: true, message: "Cargo atualizado com sucesso." };
    } catch (error) {
        return handleActionError(error);
    }
}
