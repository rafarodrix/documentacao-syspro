import { authClient } from "@/lib/auth-client";
import { registerUser } from "@/features/auth/application/actions/register";
import type { AuthGatewayResult } from "@/features/auth/domain/auth.types";

type AuthClientPasswordApi = {
  signIn: {
    email(input: { email: string; password: string; callbackURL?: string }): Promise<{ error?: { message?: string } | null }>;
  };
  forgetPassword(input: { email: string; redirectTo: string }): Promise<unknown>;
  resetPassword(input: { newPassword: string; token: string }): Promise<{ error?: { message?: string } | null }>;
};

// Mapa de erros centralizado e extensivel.
const AUTH_ERROR_MAP: Record<string, string> = {
  "Invalid email or password": "E-mail ou senha incorretos.",
  "not found": "E-mail ou senha incorretos.",
  "Email not verified": "Confirme seu e-mail antes de entrar.",
  "Account is disabled": "Sua conta esta desativada. Entre em contato com o suporte.",
  "Too many requests": "Muitas tentativas. Aguarde 15 minutos antes de tentar novamente.",
  "Token has expired": "Link expirado. Solicite um novo link de recuperacao.",
  "Invalid token": "Link invalido. Solicite um novo link de recuperacao.",
  "Password is too short": "A senha deve ter no minimo 6 caracteres.",
};

function translateAuthError(message: string): string {
  for (const [key, translation] of Object.entries(AUTH_ERROR_MAP)) {
    if (message.includes(key)) return translation;
  }
  return "Ocorreu um erro. Tente novamente ou contate o suporte.";
}

function getPasswordApiClient(): AuthClientPasswordApi {
  return authClient as unknown as AuthClientPasswordApi;
}

export const authGateway = {
  async register(formData: FormData): Promise<AuthGatewayResult> {
    try {
      const result = await registerUser(formData);
      if (result?.error) return { success: false, error: result.error };
      return { success: true };
    } catch (err) {
      console.error("[AuthGateway] Register Error:", err);
      return { success: false, error: "Erro inesperado ao criar conta." };
    }
  },

  async login(email: string, password: string, callbackURL?: string): Promise<AuthGatewayResult> {
    if (!email?.trim() || !password) {
      return { success: false, error: "Preencha e-mail e senha." };
    }

    const client = getPasswordApiClient();

    try {
      const input: { email: string; password: string; callbackURL?: string } = { email, password };
      if (callbackURL) input.callbackURL = callbackURL;

      const { error } = await client.signIn.email(input);

      if (error) {
        console.error("[AuthGateway] Login Error raw message:", error.message);
        return { success: false, error: translateAuthError(error.message || "") };
      }

      return { success: true };
    } catch (err) {
      console.error("[AuthGateway] Login Error:", err);
      return { success: false, error: "Erro de conexao. Verifique sua internet e tente novamente." };
    }
  },

  async requestPasswordReset(email: string): Promise<AuthGatewayResult> {
    if (!email?.trim()) {
      return { success: false, error: "Informe um e-mail valido." };
    }

    const client = getPasswordApiClient();

    try {
      await client.forgetPassword({
        email,
        redirectTo: "/reset-password",
      });

      return { success: true };
    } catch {
      console.error("[AuthGateway] ForgotPassword: unexpected error for email:", email);
      return { success: true };
    }
  },

  async resetPassword(newPassword: string, token: string): Promise<AuthGatewayResult> {
    if (!token) return { success: false, error: "Token invalido ou expirado." };
    if (!newPassword || newPassword.length < 6) {
      return { success: false, error: "A senha deve ter no minimo 6 caracteres." };
    }

    const client = getPasswordApiClient();

    try {
      const response = await client.resetPassword({ newPassword, token });

      if (response.error) {
        return { success: false, error: translateAuthError(response.error.message || "") };
      }

      return { success: true };
    } catch (err) {
      console.error("[AuthGateway] Reset Error:", err);
      return { success: false, error: "Erro ao redefinir senha. O link pode ter expirado." };
    }
  },
};
