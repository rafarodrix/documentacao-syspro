import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export const auth = betterAuth({
  database: prismaAdapter(prisma, {
    provider: "postgresql",
  }),

  baseURL: process.env.BETTER_AUTH_URL, // Garanta que está lendo a variável
    trustedOrigins: [
        "http://localhost:3000", // Desenvolvimento
        "https://ajuda.trilinksoftware.com.br" // Produção (O SEU DOMÍNIO)
    ],

  emailAndPassword: {
    enabled: true,
    disableSignUp: true,
  },

  session: {
    expiresIn: 1000 * 60 * 60 * 24 * 7, // 7 dias
  },
});