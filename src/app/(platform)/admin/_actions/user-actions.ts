"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth"; // Importe sua config do auth
import { createUserSchema, CreateUserInput } from "@/core/validation/user-schema";
import { getProtectedSession } from "@/lib/auth-helpers";
import { revalidatePath } from "next/cache";

/**
 * Lista todos os usuários com suas empresas
 */
export async function getUsersAction() {
    const session = await getProtectedSession();
    if (!session || !["ADMIN", "DEVELOPER", "SUPORTE"].includes(session.role)) {
        throw new Error("Não autorizado");
    }

    try {
        const users = await prisma.user.findMany({
            orderBy: { createdAt: "desc" },
            include: {
                companies: {
                    select: { razaoSocial: true } // Trazemos o nome da empresa
                }
            }
        });
        return { success: true, data: users };
    } catch (error) {
        return { success: false, error: "Erro ao buscar usuários" };
    }
}

/**
 * Cria um novo usuário, define senha e vincula a empresa
 */
export async function createUserAction(data: CreateUserInput) {
    const session = await getProtectedSession();

    if (!session || !["ADMIN", "DEVELOPER"].includes(session.role)) {
        return { success: false, error: "Sem permissão." };
    }

    // 1. Validação
    const validation = createUserSchema.safeParse(data);
    if (!validation.success) {
        return { success: false, error: "Dados inválidos." };
    }

    try {
        // 2. Criação via Better Auth (Garante hash de senha correto)
        const newUser = await auth.api.signUpEmail({
            body: {
                email: data.email,
                password: data.password,
                name: data.name,
            }
        });

        if (!newUser) {
            return { success: false, error: "Erro ao criar usuário no Auth." };
        }

        // 3. Atualização via Prisma (Define Role e Empresa)
        // O signUp cria como 'USER' padrão e sem empresa. Vamos corrigir isso agora.
        await prisma.user.update({
            where: { email: data.email },
            data: {
                role: data.role as any, // Cast para o Enum do Prisma
                emailVerified: true, // Já marcamos como verificado pois foi criado por um admin
                companies: {
                    connect: { id: data.companyId } // Vincula à empresa selecionada
                }
            }
        });

        revalidatePath("/admin/usuarios");
        return { success: true };

    } catch (error: any) {
        if (error?.body?.message) {
            return { success: false, error: error.body.message }; // Erro do Better Auth (ex: email já existe)
        }
        return { success: false, error: "Erro interno ao criar usuário." };
    }
}

