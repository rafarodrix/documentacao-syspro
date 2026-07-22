"use client";

import { DashboardActivityPoint } from "@dosc-syspro/contracts/dashboard";
import { Card, CardContent, CardHeader, CardTitle } from "@dosc-syspro/ui";
import { ActivityChart } from "@/components/platform/app/dashboard/activity-chart";

type SupportVolumeBacklogChartProps = {
  activity: DashboardActivityPoint[];
  resolvedCount: number;
  openCount: number;
  totalCount: number;
  loading?: boolean;
};

export function SupportVolumeBacklogChart({
  activity,
  resolvedCount,
  openCount,
  totalCount,
  loading = false,
}: SupportVolumeBacklogChartProps) {
  return (
    <Card className="border-border/60 bg-card shadow-sm">
      <CardHeader className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between pb-2">
        <div>
          <CardTitle className="text-base font-semibold text-foreground">
            Tendência de Volume & Resolutividade
          </CardTitle>
          <p className="text-xs text-muted-foreground">
            Evolução de novas conversas criadas versus capacidade de resolução no período.
          </p>
        </div>
        <div className="flex items-center gap-4 text-xs">
          <div className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-primary" />
            <span className="text-muted-foreground">Criados: <strong className="text-foreground tabular-nums">{totalCount}</strong></span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
            <span className="text-muted-foreground">Resolvidos: <strong className="text-foreground tabular-nums">{resolvedCount}</strong></span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-amber-500" />
            <span className="text-muted-foreground">Fila Atual: <strong className="text-foreground tabular-nums">{openCount}</strong></span>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-2">
        <ActivityChart
          title=""
          description={loading ? "Carregando serie temporal..." : "Volume de conversas por dia"}
          points={activity}
          badgeLabel="Chatwoot"
          emptyLabel="Sem movimentação registrada no recorte selecionado"
        />
      </CardContent>
    </Card>
  );
}
