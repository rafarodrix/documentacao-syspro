import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { prisma } from "@/lib/prisma";
import { sendResetPasswordEmail } from "./email";
import { nextCookies } from "better-auth/next-js";

export const auth = betterAuth({
  database: prismaAdapter(prisma, {
    provider: "postgresql",
  }),

  // Habilitar Email e Senha (PADRÃO)
  emailAndPassword: {
    enabled: true,
    disableSignUp: false, // Permite que a função signUpEmail funcione
    requireEmailVerification: false,

    // NÃO definimos 'password: { hash... }'. 
    // Assim ele usa o padrão Scrypt automaticamente.

    sendResetPassword: async ({ user, url }) => {
      await sendResetPasswordEmail(user.email, url, user.name || "Usuário");
    }
  },

  baseURL: process.env.BETTER_AUTH_URL,

  trustedOrigins: [
    "http://localhost:3000",
    "https://ajuda.trilinksoftware.com.br"
  ],

  session: {
    expiresIn: 60 * 60 * 24 * 7,
    updateAge: 60 * 60 * 24,
  },

  plugins: [nextCookies()]
});