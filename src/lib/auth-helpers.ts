import { auth } from "./auth";
import { headers } from 'next/headers';
import { prisma } from "@/lib/prisma"; // Import necessário para buscar a role real

// -----------------------------------------------------
// DEFINIÇÃO DE TIPOS E INTERFACE
// -----------------------------------------------------

// Adicionado 'SUPORTE' para bater com seu Enum do Prisma
export type UserRole = 'USER' | 'ADMIN' | 'DEVELOPER' | 'CLIENTE' | 'SUPORTE';

export interface ProtectedSession {
    userId: string;
    email: string;
    role: UserRole; // Tipagem estrita para evitar erros de comparação
}

// -----------------------------------------------------
// FUNÇÃO PRINCIPAL DE CHECAGEM DE SESSÃO
// -----------------------------------------------------

/**
 * Valida a sessão no Better Auth e busca as permissões mais recentes no Banco de Dados.
 * Garante que a Role seja a real, mesmo que o cookie esteja desatualizado.
 */
export async function getProtectedSession(): Promise<ProtectedSession | null> {

    // 1. Obtém headers para validação do cookie
    const headersList = await headers();

    // 2. Valida a sessão com o Better Auth
    const sessionData = await auth.api.getSession({
        headers: headersList
    });

    // Se não houver sessão válida ou usuário, retorna null imediatamente
    if (!sessionData || !sessionData.user) {
        return null;
    }

    // 3. BUSCA A VERDADEIRA ROLE NO BANCO
    // O objeto sessionData.user pode não ter a role ou ter uma role antiga.
    // Buscamos no banco para garantir segurança total (RBAC).
    const dbUser = await prisma.user.findUnique({
        where: { id: sessionData.user.id },
        select: {
            id: true,
            email: true,
            role: true
        }
    });

    // Se o usuário foi deletado do banco mas o cookie ainda existe
    if (!dbUser) {
        return null;
    }

    // 4. Retorna o objeto de sessão seguro
    return {
        userId: dbUser.id,
        email: dbUser.email,
        // Forçamos o tipo aqui porque o Prisma retorna uma string/enum que bate com nosso UserRole
        // O fallback para 'CLIENTE' garante que nunca quebre se a role vier nula por algum erro de banco
        role: (dbUser.role as UserRole) || 'CLIENTE',
    };
}