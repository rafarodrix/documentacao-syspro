"use client";

import { useMemo, useState } from "react";
import type { DashboardOpenTicketRecord } from "@dosc-syspro/contracts/dashboard";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type TicketArea = "ALL" | "SUPORTE" | "DESENVOLVIMENTO";
type TicketScopeMode = "own" | "development" | "all";

type OpenTicketsInsightsProps = {
  records: DashboardOpenTicketRecord[];
  scopeMode: TicketScopeMode;
  allowAreaFilter?: boolean;
};

type GroupedItem = {
  label: string;
  value: number;
  hint: string;
};

function formatTicketDimensionLabel(value: string | null | undefined, fallback: string) {
  if (!value?.trim()) return fallback;
  return value
    .trim()
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function getDefaultAreaFilter(scopeMode: TicketScopeMode): TicketArea {
  if (scopeMode === "development") return "DESENVOLVIMENTO";
  return "ALL";
}

function getScopeDescription(scopeMode: TicketScopeMode) {
  if (scopeMode === "own") return "Seus tickets abertos no escopo atual.";
  if (scopeMode === "development") return "Tickets abertos atualmente na fila de desenvolvimento.";
  return "Tickets abertos no escopo operacional carregado para este perfil.";
}

function getAreaShare(value: number, total: number) {
  if (total <= 0) return "0%";
  return `${Math.round((value / total) * 100)}%`;
}

function groupRecords(
  records: DashboardOpenTicketRecord[],
  key: "module" | "category",
): GroupedItem[] {
  const counts = new Map<string, { value: number; open: number; pending: number }>();

  for (const record of records) {
    const label = formatTicketDimensionLabel(
      key === "module" ? record.module : record.category,
      key === "module" ? "Sem modulo" : "Sem categoria",
    );
    const current = counts.get(label) ?? { value: 0, open: 0, pending: 0 };
    current.value += 1;
    if (record.status === "Aberto") current.open += 1;
    else current.pending += 1;
    counts.set(label, current);
  }

  return Array.from(counts.entries())
    .map(([label, value]) => ({
      label,
      value: value.value,
      hint:
        value.open > 0 && value.pending > 0
          ? `${value.open} novos • ${value.pending} em andamento`
          : value.open > 0
            ? `${value.open} novo${value.open === 1 ? "" : "s"}`
            : `${value.pending} em andamento`,
    }))
    .sort((left, right) => right.value - left.value || left.label.localeCompare(right.label))
    .slice(0, 6);
}

export function OpenTicketsInsights({
  records,
  scopeMode,
  allowAreaFilter = false,
}: OpenTicketsInsightsProps) {
  const [areaFilter, setAreaFilter] = useState<TicketArea>(getDefaultAreaFilter(scopeMode));

  const scopedRecords = useMemo(() => {
    if (scopeMode === "development") {
      return records.filter((record) => record.team === "DESENVOLVIMENTO");
    }
    return records;
  }, [records, scopeMode]);

  const filteredRecords = useMemo(() => {
    if (areaFilter === "ALL") return scopedRecords;
    return scopedRecords.filter((record) => record.team === areaFilter);
  }, [areaFilter, scopedRecords]);

  const areaCounts = useMemo(() => {
    const support = scopedRecords.filter((record) => record.team === "SUPORTE").length;
    const development = scopedRecords.filter((record) => record.team === "DESENVOLVIMENTO").length;
    const withoutArea = scopedRecords.filter((record) => !record.team).length;
    return {
      support,
      development,
      withoutArea,
      total: scopedRecords.length,
    };
  }, [scopedRecords]);

  const moduleBreakdown = useMemo(() => groupRecords(filteredRecords, "module"), [filteredRecords]);
  const categoryBreakdown = useMemo(() => groupRecords(filteredRecords, "category"), [filteredRecords]);

  const filterLabel =
    areaFilter === "SUPORTE"
      ? "Suporte"
      : areaFilter === "DESENVOLVIMENTO"
        ? "Desenvolvimento"
        : "Todas as areas";

  return (
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
      <Card className="border-border/60 bg-linear-to-br from-card via-card to-primary/5 xl:col-span-3">
        <CardHeader className="pb-3">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="space-y-1">
              <CardTitle className="text-base">Tickets abertos agora</CardTitle>
              <p className="text-sm text-muted-foreground">{getScopeDescription(scopeMode)}</p>
            </div>
            <Badge variant="outline" className="border-primary/20 bg-primary/5 text-primary">
              {filteredRecords.length} ativos no recorte
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-3">
          <SummaryMetric
            label="Total em aberto"
            value={areaCounts.total}
            tone="default"
            helper={scopeMode === "own" ? "Chamados do seu contexto atual" : "Volume aberto disponivel agora"}
          />
          <SummaryMetric
            label="Fila de suporte"
            value={areaCounts.support}
            tone="support"
            helper={`${getAreaShare(areaCounts.support, areaCounts.total)} do volume aberto`}
          />
          <SummaryMetric
            label="Fila de desenvolvimento"
            value={areaCounts.development}
            tone="development"
            helper={`${getAreaShare(areaCounts.development, areaCounts.total)} do volume aberto`}
          />
        </CardContent>
      </Card>

      <Card className="border-border/50 bg-card/70">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Tickets abertos por area</CardTitle>
          <p className="text-xs text-muted-foreground">{getScopeDescription(scopeMode)}</p>
        </CardHeader>
        <CardContent className="space-y-3">
          <AreaLine label="Total no escopo" value={areaCounts.total} emphasis="text-foreground" />
          <AreaLine label="Suporte" value={areaCounts.support} emphasis="text-sky-500" />
          <AreaLine label="Desenvolvimento" value={areaCounts.development} emphasis="text-violet-500" />
          {areaCounts.withoutArea > 0 ? (
            <AreaLine label="Sem area definida" value={areaCounts.withoutArea} emphasis="text-amber-500" />
          ) : null}
          {allowAreaFilter ? (
            <div className="flex flex-wrap gap-2 pt-2">
              {([
                ["ALL", "Todas"],
                ["SUPORTE", "Suporte"],
                ["DESENVOLVIMENTO", "Desenvolvimento"],
              ] as const).map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setAreaFilter(value)}
                  className={cn(
                    "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                    areaFilter === value
                      ? "border-primary/40 bg-primary/10 text-primary"
                      : "border-border/60 bg-background text-muted-foreground hover:text-foreground",
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
          ) : null}
        </CardContent>
      </Card>

      <Card className="border-border/50 bg-card/70">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between gap-3">
            <CardTitle className="text-sm">Abertos por modulo</CardTitle>
            <Badge variant="outline">{filterLabel}</Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-2">
          {moduleBreakdown.length > 0 ? (
            moduleBreakdown.map((item) => <BreakdownLine key={item.label} item={item} />)
          ) : (
            <p className="text-sm text-muted-foreground">Nenhum ticket aberto neste recorte.</p>
          )}
        </CardContent>
      </Card>

      <Card className="border-border/50 bg-card/70">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between gap-3">
            <CardTitle className="text-sm">Abertos por categoria</CardTitle>
            <Badge variant="outline">{filterLabel}</Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-2">
          {categoryBreakdown.length > 0 ? (
            categoryBreakdown.map((item) => <BreakdownLine key={item.label} item={item} />)
          ) : (
            <p className="text-sm text-muted-foreground">Nenhum ticket aberto neste recorte.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function AreaLine({
  label,
  value,
  emphasis,
}: {
  label: string;
  value: number;
  emphasis: string;
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border border-border/50 bg-background/50 px-3 py-2">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className={cn("text-sm font-semibold tabular-nums", emphasis)}>{value}</span>
    </div>
  );
}

function BreakdownLine({ item }: { item: GroupedItem }) {
  return (
    <div className="rounded-lg border border-border/50 bg-background/50 px-3 py-2">
      <div className="flex items-center justify-between gap-3">
        <span className="text-sm font-medium text-foreground">{item.label}</span>
        <span className="text-sm font-semibold tabular-nums text-foreground">{item.value}</span>
      </div>
      <p className="mt-1 text-xs text-muted-foreground">{item.hint}</p>
    </div>
  );
}

function SummaryMetric({
  label,
  value,
  helper,
  tone,
}: {
  label: string;
  value: number;
  helper: string;
  tone: "default" | "support" | "development";
}) {
  const toneClass = {
    default: "border-primary/15 bg-primary/5 text-foreground",
    support: "border-sky-500/15 bg-sky-500/5 text-sky-500",
    development: "border-violet-500/15 bg-violet-500/5 text-violet-500",
  }[tone];

  return (
    <div className={cn("rounded-xl border px-4 py-3", toneClass)}>
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
      <div className="mt-2 text-3xl font-bold tracking-tight tabular-nums">{value}</div>
      <p className="mt-1 text-xs text-muted-foreground">{helper}</p>
    </div>
  );
}
