export type EvolutionConfig = {
  apiUrl: string;
  apiKey: string;
  instance: string;
  webhookSecret: string;
};

export function readEvolutionConfig(env: NodeJS.ProcessEnv = process.env): EvolutionConfig {
  return {
    apiUrl: env.EVOLUTION_API_URL?.trim() ?? "",
    apiKey: env.EVOLUTION_API_KEY?.trim() ?? "",
    instance: env.EVOLUTION_INSTANCE?.trim() || "Syspro",
    webhookSecret: env.EVOLUTION_WEBHOOK_SECRET?.trim() ?? "",
  };
}

export function hasEvolutionApiCredentials(config: Pick<EvolutionConfig, "apiUrl" | "apiKey">): boolean {
  return Boolean(config.apiUrl && config.apiKey);
}
