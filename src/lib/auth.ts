import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { prisma } from "@/lib/prisma";
import { sendResetPasswordEmail } from "./email";

export const auth = betterAuth({
  database: prismaAdapter(prisma, {
    provider: "postgresql",
  }),

  // --- ADICIONE ESTA OPÇÃO ---
  advanced: {
    cookiePrefix: "better-auth", // Garante consistência de cookie
  },
  logger: {
    level: "debug", // Isso vai mostrar o erro real nos logs da Vercel
    disabled: false
  },
  // ---------------------------

  emailAndPassword: {
    enabled: true,
    disableSignUp: false,
    requireEmailVerification: false,
    sendResetPassword: async ({ user, url }) => {
      console.log("🚀 [DEBUG] Tentando enviar email para:", user.email);
      try {
        await sendResetPasswordEmail(user.email, url, user.name || "Usuário");
        console.log("✅ [DEBUG] Email enviado com sucesso!");
      } catch (error) {
        console.error("❌ [DEBUG] Erro ao enviar email:", error);
        throw error; // Lança o erro para o Better Auth pegar
      }
    }
  },

  baseURL: process.env.BETTER_AUTH_URL,

  trustedOrigins: [
    "http://localhost:3000",
    "https://ajuda.trilinksoftware.com.br"
  ],

  session: {
    expiresIn: 60 * 60 * 24 * 7, // 7 dias (em segundos)
    updateAge: 60 * 60 * 24, // Atualiza a sessão a cada 24h se ativa
  },
});