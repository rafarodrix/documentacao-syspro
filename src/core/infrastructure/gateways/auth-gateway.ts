import { authClient } from "@/lib/auth-client";
import { Result } from "@/core/application/dto/result.dto";
import { registerUser } from "@/actions/auth/register";

/**
 * AuthGateway
 * Responsável por encapsular as chamadas diretas à biblioteca de autenticação (Better Auth).
 * Aqui é o único lugar onde permitimos "hacks" de tipagem para isolar o resto do sistema.
 */
export const authGateway = {

    /**
     * Registra um novo usuário (Colaborador)
     */
    async register(formData: FormData): Promise<Result> {
        try {
            // Chama a Server Action
            const result = await registerUser(formData);

            if (result?.error) {
                return { success: false, error: result.error };
            }

            return { success: true };
        } catch (err) {
            console.error("[AuthGateway] Register Error:", err);
            return { success: false, error: "Erro inesperado ao criar conta." };
        }
    },

    /**
     * Realiza o login com e-mail e senha.
     */
    async login(email: string, password: string, callbackURL: string): Promise<Result> {
        if (!email || !password) {
            return { success: false, error: "Credenciais inválidas." };
        }

        const client = authClient as any;

        try {
            const { error } = await client.signIn.email({
                email,
                password,
                callbackURL
            });

            if (error) {
                // Tradução de erros comuns para PT-BR amigável
                const msg = error.message || "";
                if (msg.includes("Invalid email or password") || msg.includes("not found")) {
                    return { success: false, error: "E-mail ou senha incorretos." };
                }
                return { success: false, error: msg };
            }

            return { success: true };

        } catch (err) {
            console.error("[AuthGateway] Login Error:", err);
            return { success: false, error: "Erro de conexão. Tente novamente." };
        }
    },

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
     * Define a nova senha usando o token recebido no e-mail.
     */

    async resetPassword(newPassword: string, token: string): Promise<Result> {
        if (!token) return { success: false, error: "Token inválido." };
        if (newPassword.length < 6) return { success: false, error: "Senha muito curta." };

        const client = authClient as any;

        try {
            const response = await client.resetPassword({
                newPassword,
                token
            });

            if (response.error) {
                return { success: false, error: response.error.message };
            }

            return { success: true };
        } catch (err) {
            console.error("[AuthGateway] Reset Error:", err);
            return { success: false, error: "Erro ao redefinir senha." };
        }
    }
};