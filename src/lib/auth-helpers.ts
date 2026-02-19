import { auth } from "./auth";
import { headers } from 'next/headers';
import { prisma } from "@/lib/prisma";
import { Role } from "@prisma/client";

// -----------------------------------------------------
// DEFINIÇÃO DE TIPOS E INTERFACE
// -----------------------------------------------------

// Usamos o Role do Prisma diretamente. 
// Se precisar de fallback, o TypeScript vai avisar se algo não bater.
export type UserRole = Role;

export interface ProtectedSession {
    image: null;
    name: string;
    userId: string;
    email: string;
    role: UserRole;
}

// -----------------------------------------------------
// FUNÇÃO PRINCIPAL DE CHECAGEM DE SESSÃO
// -----------------------------------------------------

export async function getProtectedSession(): Promise<ProtectedSession | null> {
    const headersList = await headers();

    // 1. Valida a sessão com o Better Auth
    const sessionData = await auth.api.getSession({
        headers: headersList
    });

    if (!sessionData || !sessionData.user) {
        return null;
    }

    // 2. Busca a Role REAL no banco de dados (Segurança RBAC)
    const dbUser = await prisma.user.findUnique({
        where: { id: sessionData.user.id },
        select: {
            id: true,
            email: true,
            role: true
        }
    });

    if (!dbUser) {
        return null;
    }

    // 3. Retorna sessão segura
    return {
        userId: dbUser.id,
        email: dbUser.email,
        // O Prisma garante que dbUser.role é do tipo Role, então o cast é seguro
        role: dbUser.role
    };
}