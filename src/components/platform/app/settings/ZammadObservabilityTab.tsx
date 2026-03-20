"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

type MetricRow = {
  routeKey: string;
  total: number;
  errors: number;
  timeouts: number;
  avgLatencyMs: number;
  errorRate: number;
  timeoutRate: number;
};

type HealthRow = {
  routeKey: string;
  stale: boolean;
  staleMinutes: number;
  staleSince: string | null;
  updatedAt: string;
};

type ApiResponse = {
  metrics: MetricRow[];
  health: HealthRow[];
  generatedAt: string;
};

const ROUTE_LABELS: Record<string, string> = {
  "app-dashboard": "/app",
  "app-chamados": "/app/chamados",
  notifications: "notificações",
};

export function ZammadObservabilityTab() {
  const [data, setData] = useState<ApiResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/platform/observability/zammad", { cache: "no-store" });
      if (!response.ok) throw new Error("Falha ao carregar observabilidade.");
      const json = (await response.json()) as ApiResponse;
      setData(json);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro inesperado.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
    const interval = setInterval(() => void load(), 30_000);
    return () => clearInterval(interval);
  }, []);

  if (loading && !data) {
    return <p className="text-sm text-muted-foreground">Carregando métricas do Zammad...</p>;
  }

  if (error && !data) {
    return <p className="text-sm text-destructive">{error}</p>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium">Observabilidade da Integração Zammad</h3>
          <p className="text-sm text-muted-foreground">Janela de 60 minutos, com atualização a cada 30 segundos.</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => void load()} disabled={loading}>
          Atualizar
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {data?.metrics.map((metric) => {
          const health = data.health.find((h) => h.routeKey === metric.routeKey);
          return (
            <Card key={metric.routeKey} className="border-border/60">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center justify-between">
                  <span>{ROUTE_LABELS[metric.routeKey] ?? metric.routeKey}</span>
                  {health?.stale ? (
                    <Badge variant="secondary">Stale {health.staleMinutes} min</Badge>
                  ) : (
                    <Badge variant="outline">Fresh</Badge>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-1 text-sm">
                <p>Total: <strong>{metric.total}</strong></p>
                <p>Erro: <strong>{metric.errorRate}%</strong> ({metric.errors})</p>
                <p>Timeout: <strong>{metric.timeoutRate}%</strong> ({metric.timeouts})</p>
                <p>Latência média: <strong>{metric.avgLatencyMs} ms</strong></p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <p className="text-xs text-muted-foreground">
        Última atualização: {data?.generatedAt ? new Date(data.generatedAt).toLocaleString("pt-BR") : "-"}
      </p>
    </div>
  );
}

