import { z } from "zod";

export type RuntimeEnv = Record<string, string | undefined>;

const commonRuntimeConfigSchema = z.object({
  INTERNAL_API_KEY: z.string().trim().min(1).optional(),
  EVOLUTION_API_URL: z.string().trim().optional(),
  EVOLUTION_API_KEY: z.string().trim().optional(),
  EVOLUTION_INSTANCE: z.string().trim().optional(),
  EVOLUTION_WEBHOOK_SECRET: z.string().trim().optional(),
  ZAMMAD_URL: z.string().trim().optional(),
  ZAMMAD_TOKEN: z.string().trim().optional(),
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
