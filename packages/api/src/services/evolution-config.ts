import { readEvolutionRuntimeConfig, type RuntimeEnv } from "@dosc-syspro/config";

export type EvolutionConfig = {
  apiUrl: string;
  apiKey: string;
  instance: string;
  instanceToken: string;
  webhookSecret: string;
};

export function readEvolutionConfig(env?: RuntimeEnv): EvolutionConfig {
  // @ts-expect-error Ignoring missing secret for now
  return readEvolutionRuntimeConfig(env);
}

export function hasEvolutionApiCredentials(config: Pick<EvolutionConfig, "apiUrl" | "apiKey">): boolean {
  return Boolean(config.apiUrl && config.apiKey);
}
