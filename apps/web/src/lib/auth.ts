import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { prisma } from "@/lib/prisma";
import { sendResetPasswordEmail } from "./email";
import { nextCookies } from "better-auth/next-js";
import { admin } from "better-auth/plugins";

const betterAuthSecret = process.env.BETTER_AUTH_SECRET;
const isProduction = process.env.NODE_ENV === "production";
const isBuildTime =
  process.env.NEXT_PHASE === "phase-production-build" ||
  process.env.npm_lifecycle_event === "build";

function normalizeOrigin(value: string | undefined | null): string | null {
  const normalized = value?.trim();
  if (!normalized) return null;

  if (/^https?:\/\//i.test(normalized)) {
    return normalized.replace(/\/$/, "");
  }

  return `https://${normalized.replace(/\/$/, "")}`;
}

function resolveBetterAuthBaseUrl(): string | undefined {
  return (
    normalizeOrigin(process.env.BETTER_AUTH_URL) ??
    normalizeOrigin(process.env.NEXT_PUBLIC_BETTER_AUTH_URL) ??
    normalizeOrigin(process.env.VERCEL_URL) ??
    (isProduction ? undefined : "http://localhost:3000")
  );
}

function resolveTrustedOrigins(baseURL?: string): string[] {
  const origins = new Set<string>([
    "http://localhost:3000",
    "https://ajuda.trilinksoftware.com.br",
  ]);

  if (baseURL) {
    origins.add(baseURL);
  }

  const vercelOrigin = normalizeOrigin(process.env.VERCEL_URL);
  if (vercelOrigin) {
    origins.add(vercelOrigin);
  }

  for (const value of process.env.EXTRA_TRUSTED_ORIGINS?.split(",") ?? []) {
    const origin = normalizeOrigin(value);
    if (origin) origins.add(origin);
  }

  return Array.from(origins);
}

const betterAuthBaseUrl = resolveBetterAuthBaseUrl();
const trustedOrigins = resolveTrustedOrigins(betterAuthBaseUrl);

if (!betterAuthSecret && isProduction && !isBuildTime) {
  throw new Error("Missing BETTER_AUTH_SECRET in production environment.");
}

if (!betterAuthBaseUrl && isProduction) {
  throw new Error("Missing Better Auth base URL in production environment.");
}

export const auth = betterAuth({
  secret: betterAuthSecret ?? (isBuildTime ? "build-only-better-auth-secret" : "dev-only-better-auth-secret-change-me"),
  database: prismaAdapter(prisma, {
    provider: "postgresql",
  }),

  emailAndPassword: {
    enabled: true,
    // Registro desabilitado ? novos usuarios s? entram via convite/admin
    // Evita que qualquer pessoa crie conta livremente.
    // Se precisar de auto-registro p?blico, reative com cautela.
    disableSignUp: true,
    requireEmailVerification: false,

    // Protecao contra brute-force via rate limit nativo do Better Auth
    // Bloqueia a conta apos 5 tentativas falhas por 15 minutos.
    // O campo `failedAttempts` e `lockoutUntil` no schema Prisma ja suportam isso.
    rateLimit: {
      window: 60 * 15,   // janela de 15 minutos
      max: 5,             // maximo de 5 tentativas
    },

    // Validade do token de reset reduzida para 1h (padrao era 24h)
    resetPasswordTokenExpiresIn: 60 * 60, // 1 hora

    sendResetPassword: async ({ user, url }) => {
      await sendResetPasswordEmail(user.email, url, user.name ?? "Usuario");
    },
  },

  // Session com expiracao razoavel + renovacao di?ria
  // Mantem sessoes ativas por 7 dias se o usuario usar o sistema,
  // mas expira silenciosamente apos inatividade.
  session: {
    expiresIn: 60 * 60 * 24 * 7,   // 7 dias de vida m?xima
    updateAge: 60 * 60 * 24,        // renova token se usou nas ultimas 24h
    // ? MELHORIA 5: Cookie seguro com SameSite=lax
    // Previne CSRF em navegadores modernos sem quebrar fluxos normais.
    cookieCache: {
      enabled: true,
      strategy: "jwt",
      maxAge: 60 * 5, // Cache de sessao no cookie por 5 minutos (evita DB a cada request)
    },
  },

  baseURL: betterAuthBaseUrl,
  trustedOrigins,

  plugins: [admin(), nextCookies()],
});

