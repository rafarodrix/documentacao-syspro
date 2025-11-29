import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { prisma } from "@/lib/prisma";
import { sendResetPasswordEmail } from "./email";

export const auth = betterAuth({
  database: prismaAdapter(prisma, {
    provider: "postgresql",
  }),

  // Configuração do envio de e-mail
  emailAndPassword: {
    enabled: true, // <--- Tem que ser true
    disableSignUp: false, // Permite cadastros
    requireEmailVerification: false, // Ajuste conforme necessidade

    // Função de envio de e-mail (que configuramos antes)
    sendResetPassword: async ({ user, url, token }) => {
      console.log("Enviando email para:", user.email);
      await sendResetPasswordEmail(user.email, url, user.name || "Usuário");
    }
  },

  baseURL: process.env.BETTER_AUTH_URL,

  trustedOrigins: [
    "http://localhost:3000",
    "https://ajuda.trilinksoftware.com.br/"
  ],

  session: {
    expiresIn: 60 * 60 * 24 * 7, // 7 dias (em segundos)
    updateAge: 60 * 60 * 24, // Atualiza a sessão a cada 24h se ativa
  },
});