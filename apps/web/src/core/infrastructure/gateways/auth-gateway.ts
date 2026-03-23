import { authClient } from "@/lib/auth-client";
import { Result } from "@/core/application/dto/result.dto";
import { registerUser } from "@/actions/auth/register";

// ✅ MELHORIA 11: Mapa de erros centralizado e extensível
// Evita strings espalhadas em múltiplos lugares. Adicione novos casos aqui.
const AUTH_ERROR_MAP: Record<string, string> = {
  "Invalid email or password": "E-mail ou senha incorretos.",
  "not found":                 "E-mail ou senha incorretos.", // mesma msg — evita user enumeration
  "Email not verified":        "Confirme seu e-mail antes de entrar.",
  "Account is disabled":       "Sua conta está desativada. Entre em contato com o suporte.",
  "Too many requests":         "Muitas tentativas. Aguarde 15 minutos antes de tentar novamente.",
  "Token has expired":         "Link expirado. Solicite um novo link de recuperação.",
  "Invalid token":             "Link inválido. Solicite um novo link de recuperação.",
  "Password is too short":     "A senha deve ter no mínimo 6 caracteres.",
}

function translateAuthError(message: string): string {
  for (const [key, translation] of Object.entries(AUTH_ERROR_MAP)) {
    if (message.includes(key)) return translation
  }
  // Fallback genérico — não expõe mensagem técnica ao usuário
  return "Ocorreu um erro. Tente novamente ou contate o suporte."
}

export const authGateway = {

  /**
   * Registra um novo usuário (via convite/admin).
   */
  async register(formData: FormData): Promise<Result> {
    try {
      const result = await registerUser(formData)
      if (result?.error) return { success: false, error: result.error }
      return { success: true }
    } catch (err) {
      console.error("[AuthGateway] Register Error:", err)
      return { success: false, error: "Erro inesperado ao criar conta." }
    }
  },

  /**
   * Realiza o login com e-mail e senha.
   * ✅ MELHORIA 11: Usa mapa centralizado de erros.
   * ✅ MELHORIA 12: Validação de entrada antes de chamar a API.
   */
  async login(email: string, password: string, callbackURL: string): Promise<Result> {
    if (!email?.trim() || !password) {
      return { success: false, error: "Preencha e-mail e senha." }
    }

    const client = authClient as any

    try {
      const { error } = await client.signIn.email({ email, password, callbackURL })

      if (error) {
        return { success: false, error: translateAuthError(error.message || "") }
      }

      return { success: true }
    } catch (err) {
      console.error("[AuthGateway] Login Error:", err)
      return { success: false, error: "Erro de conexão. Verifique sua internet e tente novamente." }
    }
  },

  /**
   * Envia o e-mail de recuperação de senha.
   * ✅ MELHORIA 12: Não revela se o e-mail existe (anti user-enumeration).
   * Sempre retorna sucesso — o e-mail não é enviado se não existir, mas o usuário
   * não sabe disso. Evita que atacantes descubram quais emails estão cadastrados.
   */
  async requestPasswordReset(email: string): Promise<Result> {
    if (!email?.trim()) {
      return { success: false, error: "Informe um e-mail válido." }
    }

    const client = authClient as any

    try {
      await client.forgetPassword({
        email,
        redirectTo: "/reset-password",
      })

      // Sempre retorna sucesso independente de o email existir
      return { success: true }
    } catch {
      console.error("[AuthGateway] ForgotPassword: unexpected error for email:", email)
      // Ainda retorna sucesso para não revelar informação
      return { success: true }
    }
  },

  /**
   * Define a nova senha usando o token recebido no e-mail.
   */
  async resetPassword(newPassword: string, token: string): Promise<Result> {
    if (!token) return { success: false, error: "Token inválido ou expirado." }
    if (!newPassword || newPassword.length < 6) {
      return { success: false, error: "A senha deve ter no mínimo 6 caracteres." }
    }

    const client = authClient as any

    try {
      const response = await client.resetPassword({ newPassword, token })

      if (response.error) {
        return { success: false, error: translateAuthError(response.error.message || "") }
      }

      return { success: true }
    } catch (err) {
      console.error("[AuthGateway] Reset Error:", err)
      return { success: false, error: "Erro ao redefinir senha. O link pode ter expirado." }
    }
  },
}