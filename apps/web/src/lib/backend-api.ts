import { readCommonRuntimeConfig } from "@dosc-syspro/config";

export function getBackendApiBaseUrl(): string {
  const configuredValue =
    process.env.APP_BACKEND_API_URL?.trim() ||
    process.env.APP_BACKEND_API?.trim() ||
    process.env.APP_API_URL?.trim();

  if (configuredValue) {
    return configuredValue.replace(/\/+$/, "");
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
