import { authClient } from "@/lib/auth-client";

/**
 * AuthGateway
 * Responsável por encapsular as chamadas diretas à biblioteca de autenticação (Better Auth).
 * Aqui é o único lugar onde permitimos "hacks" de tipagem para isolar o resto do sistema.
 */
export const authGateway = {

    /**
     * Envia o e-mail de recuperação de senha.
     */
    async requestPasswordReset(email: string) {
        // AQUI aplicamos a correção de tipagem, longe da vista do componente
        const client = authClient as any;

        try {
            const response = await client.forgetPassword({
                email,
                redirectTo: "/reset-password", // Define a rota de retorno
            });

            return {
                success: !response.error,
                error: response.error ? response.error.message : null
            };
        } catch (err) {
            return {
                success: false,
                error: "Erro inesperado de comunicação."
            };
        }
    },

    /**
     * Redefine a senha usando o token.
     */
    async resetPassword(newPassword: string, token: string) {
        const client = authClient as any;

        try {
            const response = await client.resetPassword({
                newPassword,
                token
            });

            return {
                success: !response.error,
                error: response.error ? response.error.message : null
            };
        } catch (err) {
            return {
                success: false,
                error: "Erro ao tentar redefinir senha."
            };
        }
    }
};