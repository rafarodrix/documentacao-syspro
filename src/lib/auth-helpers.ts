import { auth } from "./auth";
import { headers } from 'next/headers';

// -----------------------------------------------------
// DEFINIÇÃO DE TIPOS E INTERFACE
// -----------------------------------------------------

export type UserRole = 'USER' | 'ADMIN' | 'DEVELOPER' | 'CLIENTE';

export interface ProtectedSession {
    userId: string;
    email: string;
    role: string;
}

// -----------------------------------------------------
// FUNÇÃO PRINCIPAL DE CHECAGEM DE SESSÃO
// -----------------------------------------------------

/**
 * Valida a sessão no Better Auth e retorna o objeto de usuário.
 * Usado em layouts de Server Component para checagem de RBAC.
 */
export async function getProtectedSession(): Promise<ProtectedSession | null> {
    
    // 1. Obtém os headers da requisição (Necessário para o Better Auth ler os cookies automaticamente)
    // Nota: headers() também é async no Next.js 15
    const headersList = await headers();

    // 2. Chama a API do Better Auth para validar a sessão
    // Não precisamos ler o cookie manualmente, passamos os headers e ele resolve.
    const session = await auth.api.getSession({
        headers: headersList
    });

    // 3. Validação: Se não houver sessão ou usuário, retorna null
    if (!session || !session.user) {
        return null;
    }

    // 4. Retorna o objeto de sessão limpo
    // Nota: O TypeScript pode reclamar de 'role' se você não tiver tipado ele no schema do Better Auth.
    // O cast (session.user as any) é temporário caso o TS não infira o plugin de roles.
    const userRole = (session.user as any).role || 'USER'; 

    return {
        userId: session.user.id,
        email: session.user.email,
        role: userRole.toUpperCase(), 
    };
}