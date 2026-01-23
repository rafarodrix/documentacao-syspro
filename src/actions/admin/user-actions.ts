"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { createUserSchema, CreateUserInput } from "@/core/application/schema/user-schema";
import { getProtectedSession } from "@/lib/auth-helpers";
import { revalidatePath } from "next/cache";
import { Prisma, Role } from "@prisma/client";
import { z } from "zod";

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
    email: z.string().email("E-mail inválido"),
    role: z.nativeEnum(Role),
    companyId: z.string().min(1, "Selecione uma empresa"),
});

export type LinkUserInput = z.infer<typeof linkUserSchema>;

// --- Permissões ---
const READ_ROLES: Role[] = [Role.ADMIN, Role.DEVELOPER, Role.SUPORTE];
const WRITE_ROLES: Role[] = [Role.ADMIN];

// --- Central de Erros ---
function handleActionError(error: any): ActionResponse {
    console.error("[UserAction Error]:", error);
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2002') {
            const target = (error.meta?.target as string[]) || [];
            if (target.includes('email')) return { success: false, message: "Este e-mail já está em uso." };
            if (target.includes('cpf')) return { success: false, message: "Este CPF já está cadastrado." };
        }
    }
    return { success: false, message: error.message || "Erro interno no servidor." };
}

/**
 * LISTAR USUÁRIOS
 */
export async function getUsersAction(filters?: GetUsersParams): Promise<ActionResponse> {
    const session = await getProtectedSession();
    if (!session || !READ_ROLES.includes(session.role)) return { success: false, message: "Não autorizado." };

    try {
        const where: Prisma.UserWhereInput = { deletedAt: null };
        if (filters?.search) {
            where.OR = [
                { name: { contains: filters.search, mode: "insensitive" } },
                { email: { contains: filters.search, mode: "insensitive" } },
                { cpf: { contains: filters.search.replace(/\D/g, "") } },
            ];
        }
        if (filters?.role && filters.role !== "ALL") where.role = filters.role as Role;

        const users = await prisma.user.findMany({
            where,
            include: { memberships: { include: { company: { select: { nomeFantasia: true } } } } },
            orderBy: { createdAt: 'desc' }
        });

        const data = users.map(u => ({
            ...u,
            companyName: u.memberships[0]?.company?.nomeFantasia || "Sem Vínculo",
            companyId: u.memberships[0]?.companyId || null
        }));

        return { success: true, data };
    } catch (error) {
        return { success: false, message: "Erro ao carregar usuários." };
    }
}

/**
 * CRIAR USUÁRIO (Com Rollback Corrigido)
 */
export async function createUserAction(data: CreateUserInput): Promise<ActionResponse> {
    const session = await getProtectedSession();
    if (!session || !WRITE_ROLES.includes(session.role)) return { success: false, message: "Permissão negada." };

    const validation = createUserSchema.safeParse(data);
    if (!validation.success) return { success: false, errors: validation.error.flatten().fieldErrors as any, message: "Dados inválidos." };

    let createdAuthUserId: string | undefined;

    try {
        // 1. Registro no Auth
        const authResponse = await auth.api.signUpEmail({
            body: { email: data.email, password: data.password!, name: data.name },
            headers: await headers()
        });

        if (!authResponse?.user) return { success: false, message: "Falha na criação da conta." };
        createdAuthUserId = authResponse.user.id;

        // 2. Transação Prisma
        await prisma.$transaction(async (tx) => {
            await tx.user.update({
                where: { id: createdAuthUserId },
                data: {
                    role: data.role as Role,
                    cpf: data.cpf ? data.cpf.replace(/\D/g, "") : null,
                    jobTitle: data.jobTitle || null,
                    phone: data.phone || null,
                    isActive: true,
                    emailVerified: true
                }
            });

            if (data.companyId) {
                await tx.membership.create({
                    data: {
                        userId: createdAuthUserId!,
                        companyId: data.companyId,
                        role: (data.role === Role.ADMIN) ? Role.ADMIN : Role.CLIENTE_USER
                    }
                });
            }
        });

        revalidatePath("/admin/cadastros");
        return { success: true, message: "Usuário criado com sucesso!" };

    } catch (error) {
        // ROLLBACK: Remove do Auth se o banco falhar
        if (createdAuthUserId) {
            try {
                // Usamos removeUser da API admin. Se o TS reclamar, o 'as any' garante a execução
                // enquanto você sincroniza o plugin no arquivo de configuração do Better-Auth.
                await (auth.api as any).admin.removeUser({
                    body: { userId: createdAuthUserId },
                    headers: await headers()
                });
            } catch (rollbackError) {
                console.error("Erro crítico no Rollback:", rollbackError);
            }
        }
        return handleActionError(error);
    }
}

/**
 * ATUALIZAR USUÁRIO
 */
export async function updateUserAction(id: string, data: Partial<CreateUserInput>): Promise<ActionResponse> {
    const session = await getProtectedSession();
    if (!session || !WRITE_ROLES.includes(session.role)) return { success: false, message: "Acesso negado." };

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
                await tx.membership.upsert({
                    where: { userId_companyId: { userId: id, companyId: data.companyId } },
                    create: {
                        userId: id,
                        companyId: data.companyId,
                        role: (data.role === Role.ADMIN) ? Role.ADMIN : Role.CLIENTE_USER
                    },
                    update: { role: (data.role === Role.ADMIN) ? Role.ADMIN : Role.CLIENTE_USER }
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
 * SOFT DELETE
 */
export async function deleteUserAction(id: string): Promise<ActionResponse> {
    const session = await getProtectedSession();
    if (!session || id === session.userId) return { success: false, message: "Operação inválida." };

    try {
        await prisma.user.update({
            where: { id },
            data: { deletedAt: new Date(), isActive: false }
        });
        revalidatePath("/admin/cadastros");
        return { success: true, message: "Removido com sucesso." };
    } catch (error) {
        return handleActionError(error);
    }
}

/**
 * VINCULAR A EMPRESA
 */
export async function linkUserToCompanyAction(data: LinkUserInput): Promise<ActionResponse> {
    try {
        const user = await prisma.user.findUnique({ where: { email: data.email } });
        if (!user) return { success: false, message: "Usuário não encontrado." };

        await prisma.membership.upsert({
            where: { userId_companyId: { userId: user.id, companyId: data.companyId } },
            create: { userId: user.id, companyId: data.companyId, role: data.role },
            update: { role: data.role }
        });

        revalidatePath("/admin/cadastros");
        return { success: true, message: "Vínculo atualizado." };
    } catch (error) {
        return handleActionError(error);
    }
}