import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { prisma } from "@/lib/prisma";
import { sendResetPasswordEmail } from "./email";
import { nextCookies } from "better-auth/next-js";

export const auth = betterAuth({
  database: prismaAdapter(prisma, {
    provider: "postgresql",
  }),

  // 1. Configuração de Usuário: Adicionamos o campo 'role' explicitamente
  // para que o TypeScript reconheça no cliente e no servidor.
  user: {
    additionalFields: {
      role: {
        type: "string",
        required: false,
        defaultValue: "USER",
      },
    },
  },

  emailAndPassword: {
    enabled: true,
    disableSignUp: false,
    requireEmailVerification: false,
    sendResetPassword: async ({ user, url }) => {
      await sendResetPasswordEmail(user.email, url, user.name || "Usuário");
    },
  },

  // 2. Ajuste de Sessão para Múltiplos Dispositivos
  session: {
    expiresIn: 60 * 60 * 24 * 7, // 7 dias
    updateAge: 60 * 60 * 24,    // Atualiza o cookie a cada 1 dia
    // Se desejar limitar, use maxSessions, mas o padrão é ilimitado.
    // Garante que a renovação de uma aba não invalide o cookie da outra imediatamente
    freshAge: 0,
  },

  // 3. Configuração de Cookies (Crucial para evitar conflitos de domínio)
  advanced: {
    cookiePrefix: "cadens-auth", // Prefixo único evita conflito com outros apps em localhost
    useSecureCookies: process.env.NODE_ENV === "production",
  },

  baseURL: process.env.BETTER_AUTH_URL,

  trustedOrigins: [
    "http://localhost:3000",
    "https://ajuda.trilinksoftware.com.br"
  ],

  plugins: [nextCookies()]
});