import { z } from "zod";

export type RuntimeEnv = Record<string, string | undefined>;

const commonRuntimeConfigSchema = z.object({
  INTERNAL_API_KEY: z.string().trim().min(1).optional(),
  EVOLUTION_API_URL: z.string().trim().optional(),
  EVOLUTION_API_KEY: z.string().trim().optional(),
  EVOLUTION_INSTANCE: z.string().trim().optional(),
  EVOLUTION_WEBHOOK_SECRET: z.string().trim().optional(),
  CHATWOOT_URL: z.string().trim().optional(),
  CHATWOOT_ACCOUNT_ID: z.string().trim().optional(),
  CHATWOOT_API_TOKEN: z.string().trim().optional(),
  CHATWOOT_INBOX_ID: z.string().trim().optional(),
  CHATWOOT_INBOX_IDENTIFIER: z.string().trim().optional(),
  CHATWOOT_WEBHOOK_SECRET: z.string().trim().optional(),
  CHATWOOT_WEBHOOK_MAX_SKEW_SECONDS: z.coerce.number().int().positive().optional(),
  TICKET_URL: z.string().trim().optional(),
  TICKET_TOKEN: z.string().trim().optional(),
});

export type CommonRuntimeConfig = z.infer<typeof commonRuntimeConfigSchema>;

export function readRuntimeEnvFromGlobal(): RuntimeEnv {
  const runtime = globalThis as Record<string, unknown>;
  const processLike = runtime["process"] as { env?: RuntimeEnv } | undefined;
  return processLike?.env ?? {};
}

export function readCommonRuntimeConfig(env: RuntimeEnv = readRuntimeEnvFromGlobal()): CommonRuntimeConfig {
  const parsed = commonRuntimeConfigSchema.safeParse(env);
  if (!parsed.success) {
    return {};
  }
  return parsed.data;
}

export function readEvolutionRuntimeConfig(env: RuntimeEnv = readRuntimeEnvFromGlobal()) {
  const config = readCommonRuntimeConfig(env);
  return {
    apiUrl: config.EVOLUTION_API_URL?.trim() ?? "",
    apiKey: config.EVOLUTION_API_KEY?.trim() ?? "",
    instance: config.EVOLUTION_INSTANCE?.trim() || "Syspro",
    webhookSecret: config.EVOLUTION_WEBHOOK_SECRET?.trim() ?? "",
  };
}

export function readChatwootRuntimeConfig(env: RuntimeEnv = readRuntimeEnvFromGlobal()) {
  const config = readCommonRuntimeConfig(env);
  return {
    url: config.CHATWOOT_URL?.trim() ?? "",
    accountId: config.CHATWOOT_ACCOUNT_ID?.trim() ?? "",
    apiToken: config.CHATWOOT_API_TOKEN?.trim() ?? "",
    inboxId: config.CHATWOOT_INBOX_ID?.trim() ?? "",
    inboxIdentifier: config.CHATWOOT_INBOX_IDENTIFIER?.trim() ?? "",
    webhookSecret: config.CHATWOOT_WEBHOOK_SECRET?.trim() ?? "",
    webhookMaxSkewSeconds: config.CHATWOOT_WEBHOOK_MAX_SKEW_SECONDS ?? 300,
  };
}
