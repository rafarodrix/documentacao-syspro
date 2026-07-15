import { readCommonRuntimeConfig } from "@dosc-syspro/config";

function isNextProductionBuildPhase(): boolean {
  return process.env.NEXT_PHASE === "phase-production-build";
}

export function getBackendApiBaseUrl(): string {
  const configuredValue =
    process.env.APP_BACKEND_API_URL?.trim() ||
    process.env.APP_BACKEND_API?.trim() ||
    process.env.APP_API_URL?.trim();

  if (configuredValue) {
    return configuredValue.replace(/\/+$/, "");
  }

  // Durante `next build`, alguns modulos server-side sao avaliados apenas para
  // gerar bundles/metadata. Nessa fase ainda nao ha chamadas reais ao backend,
  // entao um fallback local evita falha prematura de build sem afrouxar a
  // exigencia da variavel em runtime de producao.
  if (isNextProductionBuildPhase()) {
    return "http://127.0.0.1:3001/api";
  }

  if (process.env.NODE_ENV === "production") {
    throw new Error("APP_BACKEND_API_URL nao configurada em producao.");
  }

  return "http://localhost:3001/api";
}

export function getBackendApiKey(): string {
  const key = readCommonRuntimeConfig().INTERNAL_API_KEY?.trim();
  if (!key) {
    throw new Error("INTERNAL_API_KEY nao configurada para chamadas internas web -> api.");
  }
  return key;
}

export function withInternalApiHeaders(headers?: HeadersInit): Headers {
  const normalized = new Headers(headers);
  normalized.set("x-internal-api-key", getBackendApiKey());
  return normalized;
}
