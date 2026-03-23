export type RouteHealth = {
  routeKey: string;
  stale: boolean;
  staleMinutes: number;
  staleSince: string | null;
  updatedAt: string;
};

export type RouteSnapshot = {
  routeKey: string;
  total: number;
  errors: number;
  timeouts: number;
  avgLatencyMs: number;
  errorRate: number;
  timeoutRate: number;
};

export interface IZammadObservabilityGateway {
  getRouteHealth(routeKey: string): RouteHealth;
  getMetricsSnapshot(routeKeys: string[], windowMinutes?: number): RouteSnapshot[];
}
