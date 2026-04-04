import { readCommonRuntimeConfig } from "@dosc-syspro/config";

export function getBackendApiBaseUrl(): string {
  const value =
    process.env.APP_API_URL?.trim() ||
    process.env.NEXT_PUBLIC_API_URL?.trim() ||
    "http://localhost:3001/api";
  return value.replace(/\/+$/, "");
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
