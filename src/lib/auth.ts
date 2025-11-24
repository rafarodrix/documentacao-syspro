import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { prisma } from "@/lib/prisma"; 

export const auth = betterAuth({
  database: prismaAdapter(prisma, {
    provider: "postgresql",
  }),

  baseURL: process.env.BETTER_AUTH_URL,
  
  trustedOrigins: [
    "http://localhost:3000",
    "https://ajuda.trilinksoftware.com.br"
  ],

  emailAndPassword: {
    enabled: true,
    disableSignUp: true, 
  },

  session: {
    expiresIn: 60 * 60 * 24 * 7, // 7 dias (em segundos)
    updateAge: 60 * 60 * 24, // Atualiza a sessão a cada 24h se ativa
  },
});