import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { prisma } from "@/lib/prisma";
import { sendResetPasswordEmail } from "./email";
import { nextCookies } from "better-auth/next-js";

export const auth = betterAuth({
  database: prismaAdapter(prisma, {
    provider: "postgresql",
  }),

  baseURL: process.env.BETTER_AUTH_URL,

  // Configuração de Email e Senha
  emailAndPassword: {
    enabled: true,
    // Se você seguiu nossa conversa anterior e criou a página de registro manual,
    // mantenha disableSignUp: false.
    disableSignUp: false,
    sendResetPassword: async ({ user, url }) => {
      await sendResetPasswordEmail(user.email, url, user.name || "Usuário");
    }
  },

  trustedOrigins: [
    "http://localhost:3000",
    "https://ajuda.trilinksoftware.com.br"
  ],

  session: {
    expiresIn: 60 * 60 * 24 * 7, // 7 dias
    updateAge: 60 * 60 * 24, // 24 horas
  },

  // A documentação recomenda que plugins fiquem por último
  plugins: [
    nextCookies()
  ]
});