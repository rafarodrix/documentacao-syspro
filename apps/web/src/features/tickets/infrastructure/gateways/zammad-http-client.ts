import {
  markZammadRouteFresh,
  markZammadRouteStale,
  recordZammadMetric,
} from "@/features/tickets/infrastructure/observability/zammad-observability";
import type { ZammadCacheOptions } from "@/features/tickets/domain/repositories/zammad-gateway.repository";

const ZAMMAD_URL = process.env.ZAMMAD_URL;
const ZAMMAD_TOKEN = process.env.ZAMMAD_TOKEN;
const ZAMMAD_AUTH_SCHEME = process.env.ZAMMAD_AUTH_SCHEME?.toLowerCase();
const ZAMMAD_TIMEOUT_MS = Number(process.env.ZAMMAD_TIMEOUT_MS ?? 10000);
const ZAMMAD_RETRY_MAX_ATTEMPTS = Number(process.env.ZAMMAD_RETRY_MAX_ATTEMPTS ?? 3);
const ZAMMAD_RETRY_BASE_DELAY_MS = Number(process.env.ZAMMAD_RETRY_BASE_DELAY_MS ?? 400);
const ZAMMAD_FALLBACK_MAX_STALE_MINUTES = Number(process.env.ZAMMAD_FALLBACK_MAX_STALE_MINUTES ?? 15);
const ZAMMAD_CIRCUIT_COOLDOWN_MS = Number(process.env.ZAMMAD_CIRCUIT_COOLDOWN_MS ?? 20000);
const ZAMMAD_ENABLE_IN_MEMORY_CIRCUIT_BREAKER = process.env.ZAMMAD_ENABLE_IN_MEMORY_CIRCUIT_BREAKER === "true";
const DEFAULT_ROUTE_KEY = "unknown";

type ResponseCacheEntry = {
  ts: number;
  data: unknown;
};

const responseCache = new Map<string, ResponseCacheEntry>();
const circuitOpenUntilByRoute = new Map<string, number>();

export type NextFetchOptions = RequestInit & {
  next?: {
    revalidate?: number;
    tags?: string[];
  };
};

export type FetchMeta = {
  routeKey: string;
  endpoint: string;
};

export function getDefaultZammadRouteKey() {
  return DEFAULT_ROUTE_KEY;
}

export function getZammadBaseUrl() {
  return ZAMMAD_URL;
}

export function getZammadToken() {
  return ZAMMAD_TOKEN;
}

export function buildAuthorizationHeader(token: string): string {
  const normalized = token.trim();
  const lowered = normalized.toLowerCase();

  if (lowered.startsWith("bearer ") || lowered.startsWith("token ")) {
    return normalized;
  }

  if (ZAMMAD_AUTH_SCHEME === "bearer") {
    return `Bearer ${normalized}`;
  }

  return `Token token=${normalized}`;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isRetryableStatus(status: number): boolean {
  return status === 429 || status >= 500;
}

function parseRetryAfterMs(retryAfterHeader: string | null): number | null {
  if (!retryAfterHeader) return null;

  const asSeconds = Number.parseInt(retryAfterHeader, 10);
  if (Number.isFinite(asSeconds) && asSeconds >= 0) {
    return asSeconds * 1000;
  }

  const asDateMs = Date.parse(retryAfterHeader);
  if (Number.isNaN(asDateMs)) return null;
  return Math.max(0, asDateMs - Date.now());
}

export async function fetchWithRetry(input: string, options: NextFetchOptions, meta: FetchMeta): Promise<Response> {
  let lastError: unknown;
  const start = Date.now();
  const routeKey = meta.routeKey || DEFAULT_ROUTE_KEY;

  const circuitOpenUntil = ZAMMAD_ENABLE_IN_MEMORY_CIRCUIT_BREAKER
    ? (circuitOpenUntilByRoute.get(routeKey) ?? 0)
    : 0;
  if (Date.now() < circuitOpenUntil) {
    const latencyMs = Date.now() - start;
    recordZammadMetric({
      ts: Date.now(),
      routeKey,
      endpoint: meta.endpoint,
      statusCode: null,
      ok: false,
      timeout: false,
      attempts: 0,
      latencyMs,
    });
    throw new Error("Circuit breaker ativo para rota Zammad.");
  }

  for (let attempt = 1; attempt <= ZAMMAD_RETRY_MAX_ATTEMPTS; attempt += 1) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), ZAMMAD_TIMEOUT_MS);

    try {
      const response = await fetch(input, {
        ...options,
        cache: options.cache ?? "no-store",
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (response.ok) {
        recordZammadMetric({
          ts: Date.now(),
          routeKey,
          endpoint: meta.endpoint,
          statusCode: response.status,
          ok: true,
          timeout: false,
          attempts: attempt,
          latencyMs: Date.now() - start,
        });
        return response;
      }

      if (!isRetryableStatus(response.status) || attempt === ZAMMAD_RETRY_MAX_ATTEMPTS) {
        recordZammadMetric({
          ts: Date.now(),
          routeKey,
          endpoint: meta.endpoint,
          statusCode: response.status,
          ok: false,
          timeout: false,
          attempts: attempt,
          latencyMs: Date.now() - start,
        });
        if (isRetryableStatus(response.status) && ZAMMAD_ENABLE_IN_MEMORY_CIRCUIT_BREAKER) {
          circuitOpenUntilByRoute.set(routeKey, Date.now() + ZAMMAD_CIRCUIT_COOLDOWN_MS);
        }
        return response;
      }

      const retryAfterMs = response.status === 429
        ? parseRetryAfterMs(response.headers.get("retry-after"))
        : null;
      const backoffDelayMs = ZAMMAD_RETRY_BASE_DELAY_MS * Math.pow(2, attempt - 1);
      await sleep(retryAfterMs ?? backoffDelayMs);
      continue;
    } catch (error) {
      clearTimeout(timeoutId);
      lastError = error;

      if (attempt === ZAMMAD_RETRY_MAX_ATTEMPTS) {
        const isTimeoutError =
          error instanceof Error &&
          (error.name === "AbortError" || /aborted|timeout/i.test(error.message));

        recordZammadMetric({
          ts: Date.now(),
          routeKey,
          endpoint: meta.endpoint,
          statusCode: null,
          ok: false,
          timeout: isTimeoutError,
          attempts: attempt,
          latencyMs: Date.now() - start,
        });
        if (ZAMMAD_ENABLE_IN_MEMORY_CIRCUIT_BREAKER) {
          circuitOpenUntilByRoute.set(routeKey, Date.now() + ZAMMAD_CIRCUIT_COOLDOWN_MS);
        }
        break;
      }

      const delayMs = ZAMMAD_RETRY_BASE_DELAY_MS * Math.pow(2, attempt - 1);
      await sleep(delayMs);
    }
  }

  throw lastError instanceof Error
    ? lastError
    : new Error("Falha ao consultar Zammad apos tentativas e timeout.");
}

export async function fetchZammad(endpoint: string, options: NextFetchOptions = {}, cacheOptions?: ZammadCacheOptions) {
  if (!ZAMMAD_URL || !ZAMMAD_TOKEN) {
    throw new Error("Zammad URL ou Token nao configurados.");
  }

  const cachePolicy = cacheOptions?.cacheTtlSeconds && cacheOptions.cacheTtlSeconds > 0
    ? {
        cache: "force-cache" as RequestCache,
        next: {
          revalidate: cacheOptions.cacheTtlSeconds,
          tags: cacheOptions.tags,
        },
      }
    : { cache: "no-store" as RequestCache };

  const routeKey = cacheOptions?.routeKey ?? DEFAULT_ROUTE_KEY;
  const url = `${ZAMMAD_URL}/api/v1/${endpoint}`;
  const requestOptions: NextFetchOptions = {
    ...options,
    ...cachePolicy,
    headers: {
      Authorization: buildAuthorizationHeader(ZAMMAD_TOKEN),
      ...options.headers,
    },
  };

  const method = String(requestOptions.method ?? "GET").toUpperCase();
  const cacheKey = `${method}:${url}`;

  try {
    const res = await fetchWithRetry(url, requestOptions, { routeKey, endpoint });
    if (!res.ok) {
      throw new Error(`Zammad API Error [${res.status}]: ${res.statusText}`);
    }

    const json = await res.json();
    if (method === "GET") {
      responseCache.set(cacheKey, { ts: Date.now(), data: json });
    }
    markZammadRouteFresh(routeKey);
    return json;
  } catch (error) {
    if (method === "GET") {
      const fallback = responseCache.get(cacheKey);
      if (fallback) {
        const staleMinutes = Math.floor((Date.now() - fallback.ts) / 60000);
        if (staleMinutes <= ZAMMAD_FALLBACK_MAX_STALE_MINUTES) {
          markZammadRouteStale(routeKey, staleMinutes);
          return fallback.data;
        }
      }
    }

    throw error;
  }
}
