import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { prisma } from "@/lib/prisma";
import { sendResetPasswordEmail } from "./email";
import { nextCookies } from "better-auth/next-js";
import { admin } from "better-auth/plugins";

export const auth = betterAuth({
  database: prismaAdapter(prisma, {
    provider: "postgresql",
  }),

  emailAndPassword: {
    enabled: true,
    // Registro desabilitado ? novos usu?rios s? entram via convite/admin
    // Evita que qualquer pessoa crie conta livremente.
    // Se precisar de auto-registro p?blico, reative com cautela.
    disableSignUp: true,
    requireEmailVerification: false,

    // Prote??o contra brute-force via rate limit nativo do Better Auth
    // Bloqueia a conta ap?s 5 tentativas falhas por 15 minutos.
    // O campo `failedAttempts` e `lockoutUntil` no schema Prisma j? suportam isso.
    rateLimit: {
      window: 60 * 15,   // janela de 15 minutos
      max: 5,             // m?ximo de 5 tentativas
    },

    // Validade do token de reset reduzida para 1h (padr?o era 24h)
    resetPasswordTokenExpiresIn: 60 * 60, // 1 hora

    sendResetPassword: async ({ user, url }) => {
      await sendResetPasswordEmail(user.email, url, user.name ?? "Usu?rio");
    },
  },

  // Session com expira??o razo?vel + renova??o di?ria
  // Mant?m sess?es ativas por 7 dias se o usu?rio usar o sistema,
  // mas expira silenciosamente ap?s inatividade.
  session: {
    expiresIn: 60 * 60 * 24 * 7,   // 7 dias de vida m?xima
    updateAge: 60 * 60 * 24,        // renova token se usou nas ?ltimas 24h
    // ? MELHORIA 5: Cookie seguro com SameSite=lax
    // Previne CSRF em navegadores modernos sem quebrar fluxos normais.
    cookieCache: {
      enabled: true,
      strategy: "jwt",
      maxAge: 60 * 5, // Cache de sess?o no cookie por 5 minutos (evita DB a cada request)
    },
  },

  baseURL: process.env.BETTER_AUTH_URL,

  // trustedOrigins din?mico via vari?vel de ambiente
  // Permite configurar origens adicionais sem alterar c?digo.
  trustedOrigins: [
    "http://localhost:3000",
    "https://ajuda.trilinksoftware.com.br",
    ...(process.env.EXTRA_TRUSTED_ORIGINS?.split(",").map((o) => o.trim()) ?? []),
  ],

  plugins: [admin(), nextCookies()],
});

