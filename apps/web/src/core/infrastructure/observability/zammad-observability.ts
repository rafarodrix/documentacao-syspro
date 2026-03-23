import type {
  IZammadObservabilityGateway,
  RouteHealth,
  RouteSnapshot,
} from "@/core/domain/interfaces/observability-gateway.interface";

type ZammadMetricEntry = {
  ts: number;
  routeKey: string;
  endpoint: string;
  statusCode: number | null;
  ok: boolean;
  timeout: boolean;
  attempts: number;
  latencyMs: number;
};

const MAX_METRICS = 2000;
const metrics: ZammadMetricEntry[] = [];
const staleByRoute = new Map<string, { sinceTs: number; staleMinutes: number; updatedAt: number }>();

function nowMs(): number {
  return Date.now();
}

export function recordZammadMetric(entry: ZammadMetricEntry) {
  metrics.push(entry);
  if (metrics.length > MAX_METRICS) {
    metrics.splice(0, metrics.length - MAX_METRICS);
  }

  // structured log for external log collectors
  console.info(
    JSON.stringify({
      type: "zammad_request",
      ts: new Date(entry.ts).toISOString(),
      routeKey: entry.routeKey,
      endpoint: entry.endpoint,
      statusCode: entry.statusCode,
      ok: entry.ok,
      timeout: entry.timeout,
      attempts: entry.attempts,
      latencyMs: entry.latencyMs,
    })
  );
}

export function markZammadRouteFresh(routeKey: string) {
  staleByRoute.delete(routeKey);
}

export function markZammadRouteStale(routeKey: string, staleMinutes: number) {
  const now = nowMs();
  const current = staleByRoute.get(routeKey);
  staleByRoute.set(routeKey, {
    sinceTs: current?.sinceTs ?? now,
    staleMinutes,
    updatedAt: now,
  });
}

export function getZammadRouteHealth(routeKey: string): RouteHealth {
  const entry = staleByRoute.get(routeKey);
  if (!entry) {
    return {
      routeKey,
      stale: false,
      staleMinutes: 0,
      staleSince: null,
      updatedAt: new Date().toISOString(),
    };
  }

  return {
    routeKey,
    stale: true,
    staleMinutes: entry.staleMinutes,
    staleSince: new Date(entry.sinceTs).toISOString(),
    updatedAt: new Date(entry.updatedAt).toISOString(),
  };
}

export function getZammadMetricsSnapshot(routeKeys: string[], windowMinutes = 60): RouteSnapshot[] {
  const fromTs = nowMs() - windowMinutes * 60 * 1000;
  const filtered = metrics.filter((m) => m.ts >= fromTs);

  return routeKeys.map((routeKey) => {
    const items = filtered.filter((m) => m.routeKey === routeKey);
    const total = items.length;
    const errors = items.filter((m) => !m.ok).length;
    const timeouts = items.filter((m) => m.timeout).length;
    const avgLatencyMs = total ? Math.round(items.reduce((acc, i) => acc + i.latencyMs, 0) / total) : 0;

    return {
      routeKey,
      total,
      errors,
      timeouts,
      avgLatencyMs,
      errorRate: total ? Number(((errors / total) * 100).toFixed(1)) : 0,
      timeoutRate: total ? Number(((timeouts / total) * 100).toFixed(1)) : 0,
    };
  });
}

export const zammadObservabilityGateway: IZammadObservabilityGateway = {
  getRouteHealth: getZammadRouteHealth,
  getMetricsSnapshot: getZammadMetricsSnapshot,
};
