import { readEvolutionRuntimeConfig, type RuntimeEnv } from "@dosc-syspro/config";

export type EvolutionConfig = {
  apiUrl: string;
  apiKey: string;
  instance: string;
  webhookSecret: string;
};

export function readEvolutionConfig(env?: RuntimeEnv): EvolutionConfig {
  return readEvolutionRuntimeConfig(env);
}

export function hasEvolutionApiCredentials(config: Pick<EvolutionConfig, "apiUrl" | "apiKey">): boolean {
  return Boolean(config.apiUrl && config.apiKey);
}
