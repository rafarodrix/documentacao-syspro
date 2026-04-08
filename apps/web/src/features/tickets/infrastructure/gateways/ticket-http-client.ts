import {
  markTicketRouteFresh,
  markTicketRouteStale,
  recordTicketMetric,
} from "@/features/tickets/infrastructure/observability/ticket-observability";
import type { TicketRequestOptions } from "@/features/tickets/domain/repositories/ticket-gateway.repository";

const TICKET_URL = process.env.TICKET_URL;
const TICKET_TOKEN = process.env.TICKET_TOKEN;
const TICKET_AUTH_SCHEME = process.env.TICKET_AUTH_SCHEME?.toLowerCase();
const TICKET_TIMEOUT_MS = Number(process.env.TICKET_TIMEOUT_MS ?? 10000);
const TICKET_RETRY_MAX_ATTEMPTS = Number(process.env.TICKET_RETRY_MAX_ATTEMPTS ?? 3);
const TICKET_RETRY_BASE_DELAY_MS = Number(process.env.TICKET_RETRY_BASE_DELAY_MS ?? 400);
const TICKET_FALLBACK_MAX_STALE_MINUTES = Number(process.env.TICKET_FALLBACK_MAX_STALE_MINUTES ?? 15);
const TICKET_CIRCUIT_COOLDOWN_MS = Number(process.env.TICKET_CIRCUIT_COOLDOWN_MS ?? 20000);
const TICKET_ENABLE_IN_MEMORY_CIRCUIT_BREAKER = process.env.TICKET_ENABLE_IN_MEMORY_CIRCUIT_BREAKER === "true";
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

type FetchTicketResponseMeta = {
  data: unknown;
  headers: Headers;
};

type FetchTicketCacheOptions = TicketRequestOptions & {
  includeResponseMeta?: boolean;
};

export function getDefaultTicketRouteKey() {
  return DEFAULT_ROUTE_KEY;
}

export function getTicketBaseUrl() {
  return TICKET_URL;
}

export function getTicketToken() {
  return TICKET_TOKEN;
}

export function buildAuthorizationHeader(token: string): string {
  const normalized = token.trim();
  const lowered = normalized.toLowerCase();

  if (lowered.startsWith("bearer ") || lowered.startsWith("token ")) {
    return normalized;
  }

  if (TICKET_AUTH_SCHEME === "bearer") {
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

  const circuitOpenUntil = TICKET_ENABLE_IN_MEMORY_CIRCUIT_BREAKER
    ? (circuitOpenUntilByRoute.get(routeKey) ?? 0)
    : 0;
  if (Date.now() < circuitOpenUntil) {
    const latencyMs = Date.now() - start;
    recordTicketMetric({
      ts: Date.now(),
      routeKey,
      endpoint: meta.endpoint,
      statusCode: null,
      ok: false,
      timeout: false,
      attempts: 0,
      latencyMs,
    });
    throw new Error("Circuit breaker ativo para rota de tickets.");
  }

  for (let attempt = 1; attempt <= TICKET_RETRY_MAX_ATTEMPTS; attempt += 1) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), TICKET_TIMEOUT_MS);

    try {
      const response = await fetch(input, {
        ...options,
        cache: options.cache ?? "no-store",
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (response.ok) {
        recordTicketMetric({
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

      if (!isRetryableStatus(response.status) || attempt === TICKET_RETRY_MAX_ATTEMPTS) {
        recordTicketMetric({
          ts: Date.now(),
          routeKey,
          endpoint: meta.endpoint,
          statusCode: response.status,
          ok: false,
          timeout: false,
          attempts: attempt,
          latencyMs: Date.now() - start,
        });
        if (isRetryableStatus(response.status) && TICKET_ENABLE_IN_MEMORY_CIRCUIT_BREAKER) {
          circuitOpenUntilByRoute.set(routeKey, Date.now() + TICKET_CIRCUIT_COOLDOWN_MS);
        }
        return response;
      }

      const retryAfterMs = response.status === 429
        ? parseRetryAfterMs(response.headers.get("retry-after"))
        : null;
      const backoffDelayMs = TICKET_RETRY_BASE_DELAY_MS * Math.pow(2, attempt - 1);
      await sleep(retryAfterMs ?? backoffDelayMs);
      continue;
    } catch (error) {
      clearTimeout(timeoutId);
      lastError = error;

      if (attempt === TICKET_RETRY_MAX_ATTEMPTS) {
        const isTimeoutError =
          error instanceof Error &&
          (error.name === "AbortError" || /aborted|timeout/i.test(error.message));

        recordTicketMetric({
          ts: Date.now(),
          routeKey,
          endpoint: meta.endpoint,
          statusCode: null,
          ok: false,
          timeout: isTimeoutError,
          attempts: attempt,
          latencyMs: Date.now() - start,
        });
        if (TICKET_ENABLE_IN_MEMORY_CIRCUIT_BREAKER) {
          circuitOpenUntilByRoute.set(routeKey, Date.now() + TICKET_CIRCUIT_COOLDOWN_MS);
        }
        break;
      }

      const delayMs = TICKET_RETRY_BASE_DELAY_MS * Math.pow(2, attempt - 1);
      await sleep(delayMs);
    }
  }

  throw lastError instanceof Error
    ? lastError
    : new Error("Falha ao consultar backend de tickets apos tentativas e timeout.");
}

export function fetchTicketApi(
  endpoint: string,
  options?: NextFetchOptions,
  requestConfig?: TicketRequestOptions
): Promise<unknown>;
export function fetchTicketApi(
  endpoint: string,
  options: NextFetchOptions | undefined,
  requestConfig: TicketRequestOptions & { includeResponseMeta: true }
): Promise<FetchTicketResponseMeta>;
export async function fetchTicketApi(
  endpoint: string,
  options: NextFetchOptions = {},
  requestConfig?: FetchTicketCacheOptions
): Promise<unknown | FetchTicketResponseMeta> {
  if (!TICKET_URL || !TICKET_TOKEN) {
    throw new Error("Ticket URL ou Token nao configurados.");
  }

  const cachePolicy = requestConfig?.cacheTtlSeconds && requestConfig.cacheTtlSeconds > 0
    ? {
        cache: "force-cache" as RequestCache,
        next: {
          revalidate: requestConfig.cacheTtlSeconds,
          tags: requestConfig.tags,
        },
      }
    : { cache: "no-store" as RequestCache };

  const routeKey = requestConfig?.routeKey ?? DEFAULT_ROUTE_KEY;
  const url = `${TICKET_URL}/api/v1/${endpoint}`;
  const fetchOptions: NextFetchOptions = {
    ...options,
    ...cachePolicy,
    headers: {
      Authorization: buildAuthorizationHeader(TICKET_TOKEN),
      ...options.headers,
    },
  };

  const method = String(fetchOptions.method ?? "GET").toUpperCase();
  const cacheKey = `${method}:${url}`;

  try {
    const res = await fetchWithRetry(url, fetchOptions, { routeKey, endpoint });
    if (!res.ok) {
      throw new Error(`Ticket API Error [${res.status}]: ${res.statusText}`);
    }

    const json = await res.json();
    if (method === "GET") {
      responseCache.set(cacheKey, { ts: Date.now(), data: json });
    }
    markTicketRouteFresh(routeKey);
    if (requestConfig?.includeResponseMeta) {
      return { data: json, headers: res.headers };
    }
    return json;
  } catch (error) {
    if (method === "GET") {
      const fallback = responseCache.get(cacheKey);
      if (fallback) {
        const staleMinutes = Math.floor((Date.now() - fallback.ts) / 60000);
        if (staleMinutes <= TICKET_FALLBACK_MAX_STALE_MINUTES) {
          markTicketRouteStale(routeKey, staleMinutes);
          if (requestConfig?.includeResponseMeta) {
            return { data: fallback.data, headers: new Headers() };
          }
          return fallback.data;
        }
      }
    }

    throw error;
  }
}




