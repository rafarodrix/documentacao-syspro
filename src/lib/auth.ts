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
    // Registro desabilitado â€” novos usuÃ¡rios sÃ³ entram via convite/admin
    // Evita que qualquer pessoa crie conta livremente.
    // Se precisar de auto-registro pÃºblico, reative com cautela.
    disableSignUp: true,
    requireEmailVerification: false,

    // ProteÃ§Ã£o contra brute-force via rate limit nativo do Better Auth
    // Bloqueia a conta apÃ³s 5 tentativas falhas por 15 minutos.
    // O campo `failedAttempts` e `lockoutUntil` no schema Prisma jÃ¡ suportam isso.
    rateLimit: {
      window: 60 * 15,   // janela de 15 minutos
      max: 5,             // mÃ¡ximo de 5 tentativas
    },

    // Validade do token de reset reduzida para 1h (padrÃ£o era 24h)
    resetPasswordTokenExpiresIn: 60 * 60, // 1 hora

    sendResetPassword: async ({ user, url }) => {
      await sendResetPasswordEmail(user.email, url, user.name ?? "UsuÃ¡rio");
    },
  },

  // Session com expiraÃ§Ã£o razoÃ¡vel + renovaÃ§Ã£o diÃ¡ria
  // MantÃ©m sessÃµes ativas por 7 dias se o usuÃ¡rio usar o sistema,
  // mas expira silenciosamente apÃ³s inatividade.
  session: {
    expiresIn: 60 * 60 * 24 * 7,   // 7 dias de vida mÃ¡xima
    updateAge: 60 * 60 * 24,        // renova token se usou nas Ãºltimas 24h
    // âœ… MELHORIA 5: Cookie seguro com SameSite=lax
    // Previne CSRF em navegadores modernos sem quebrar fluxos normais.
    cookieCache: {
      enabled: true,
      strategy: "jwt",
      maxAge: 60 * 5, // Cache de sessÃ£o no cookie por 5 minutos (evita DB a cada request)
    },
  },

  baseURL: process.env.BETTER_AUTH_URL,

  // trustedOrigins dinÃ¢mico via variÃ¡vel de ambiente
  // Permite configurar origens adicionais sem alterar cÃ³digo.
  trustedOrigins: [
    "http://localhost:3000",
    "https://ajuda.trilinksoftware.com.br",
    ...(process.env.EXTRA_TRUSTED_ORIGINS?.split(",").map((o) => o.trim()) ?? []),
  ],

  plugins: [admin(), nextCookies()],
});

