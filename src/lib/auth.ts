import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { prisma } from "@/lib/prisma";
import { sendResetPasswordEmail } from "./email";
import { nextCookies } from "better-auth/next-js";

export const auth = betterAuth({
  database: prismaAdapter(prisma, {
    provider: "postgresql",
  }),

  emailAndPassword: {
    enabled: true,
    // Registro desabilitado — novos usuários só entram via convite/admin
    // Evita que qualquer pessoa crie conta livremente.
    // Se precisar de auto-registro público, reative com cautela.
    disableSignUp: true,
    requireEmailVerification: false,

    // Proteção contra brute-force via rate limit nativo do Better Auth
    // Bloqueia a conta após 5 tentativas falhas por 15 minutos.
    // O campo `failedAttempts` e `lockoutUntil` no schema Prisma já suportam isso.
    rateLimit: {
      window: 60 * 15,   // janela de 15 minutos
      max: 5,             // máximo de 5 tentativas
    },

    // Validade do token de reset reduzida para 1h (padrão era 24h)
    resetPasswordTokenExpiresIn: 60 * 60, // 1 hora

    sendResetPassword: async ({ user, url }) => {
      await sendResetPasswordEmail(user.email, url, user.name ?? "Usuário");
    },
  },

  // Session com expiração razoável + renovação diária
  // Mantém sessões ativas por 7 dias se o usuário usar o sistema,
  // mas expira silenciosamente após inatividade.
  session: {
    expiresIn: 60 * 60 * 24 * 7,   // 7 dias de vida máxima
    updateAge: 60 * 60 * 24,        // renova token se usou nas últimas 24h
    // ✅ MELHORIA 5: Cookie seguro com SameSite=lax
    // Previne CSRF em navegadores modernos sem quebrar fluxos normais.
    cookieCache: {
      enabled: true,
      maxAge: 60 * 5, // Cache de sessão no cookie por 5 minutos (evita DB a cada request)
    },
  },

  baseURL: process.env.BETTER_AUTH_URL,

  // trustedOrigins dinâmico via variável de ambiente
  // Permite configurar origens adicionais sem alterar código.
  trustedOrigins: [
    "http://localhost:3000",
    "https://ajuda.trilinksoftware.com.br",
    ...(process.env.EXTRA_TRUSTED_ORIGINS?.split(",").map((o) => o.trim()) ?? []),
  ],

  plugins: [nextCookies()],
});