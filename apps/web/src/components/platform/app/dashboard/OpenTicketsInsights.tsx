"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useMemo, useState } from "react";
import type { ApexOptions } from "apexcharts";
import type { DashboardOpenTicketRecord } from "@dosc-syspro/contracts/dashboard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { humanizeModuleHierarchyValue } from "@/features/tickets/interface/lib/ticket-module-hierarchy";

const ReactApexChart = dynamic(() => import("react-apexcharts"), { ssr: false });

type TicketArea = "ALL" | "SUPORTE" | "DESENVOLVIMENTO";
type TicketScopeMode = "own" | "development" | "all";
type BreakdownKind = "module" | "category";

type OpenTicketsInsightsProps = {
  records: DashboardOpenTicketRecord[];
  scopeMode: TicketScopeMode;
  allowAreaFilter?: boolean;
};

type GroupedItem = {
  label: string;
  queryValue: string;
  value: number;
  hint: string;
};

function formatCategoryLabel(value: string | null | undefined) {
  if (!value?.trim()) return "Sem categoria";
  return value
    .trim()
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function formatModuleLabel(value: string | null | undefined) {
  if (!value?.trim()) return "Sem modulo";
  return humanizeModuleHierarchyValue(value) || formatCategoryLabel(value);
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

function groupRecords(records: DashboardOpenTicketRecord[], key: BreakdownKind): GroupedItem[] {
  const counts = new Map<string, { value: number; open: number; pending: number; queryValue: string }>();

  for (const record of records) {
    const queryValue = String(key === "module" ? record.module ?? "" : record.category ?? "").trim();
    const label = key === "module" ? formatModuleLabel(record.module) : formatCategoryLabel(record.category);
    const bucketKey = queryValue || `__empty__:${label}`;
    const current = counts.get(bucketKey) ?? { value: 0, open: 0, pending: 0, queryValue };
    current.value += 1;
    if (record.status === "Aberto") current.open += 1;
    else current.pending += 1;
    counts.set(bucketKey, current);
  }

  return Array.from(counts.entries())
    .map(([bucketKey, value]) => ({
      label: bucketKey.startsWith("__empty__:") ? bucketKey.replace("__empty__:", "") : key === "module" ? formatModuleLabel(value.queryValue) : formatCategoryLabel(value.queryValue),
      queryValue: value.queryValue,
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

function buildTicketsHref(input: {
  team?: TicketArea;
  category?: string;
  module?: string;
}) {
  const params = new URLSearchParams();
  params.set("status", "open");

  if (input.team && input.team !== "ALL") {
    params.set("team", input.team);
  }

  if (input.category?.trim()) {
    params.set("category", input.category.trim());
  }

  if (input.module?.trim()) {
    params.set("module", input.module.trim());
  }

  return `/portal/tickets?${params.toString()}`;
}

function createHorizontalChartOptions(
  items: GroupedItem[],
  selectedValue: string,
  onSelect: (item: GroupedItem) => void,
): ApexOptions {
  return {
    chart: {
      type: "bar",
      toolbar: { show: false },
      sparkline: { enabled: false },
      zoom: { enabled: false },
      foreColor: "hsl(var(--muted-foreground))",
      fontFamily: "inherit",
      events: {
        dataPointSelection: (_event, _chartContext, config) => {
          const item = items[config.dataPointIndex];
          if (item) onSelect(item);
        },
      },
    },
    colors: items.map((item) =>
      item.queryValue === selectedValue ? "hsl(var(--primary))" : "hsl(var(--primary) / 0.38)",
    ),
    plotOptions: {
      bar: {
        horizontal: true,
        borderRadius: 6,
        barHeight: "58%",
        distributed: true,
      },
    },
    grid: {
      borderColor: "hsl(var(--border) / 0.35)",
      strokeDashArray: 4,
      padding: {
        left: 4,
        right: 12,
        top: 0,
        bottom: -8,
      },
    },
    dataLabels: {
      enabled: true,
      formatter: (value) => `${Math.round(Number(value))}`,
      style: {
        colors: ["hsl(var(--foreground))"],
        fontSize: "11px",
        fontWeight: 600,
      },
      offsetX: 8,
    },
    xaxis: {
      categories: items.map((item) => item.label),
      labels: {
        style: {
          colors: ["hsl(var(--muted-foreground))"],
          fontSize: "11px",
        },
      },
      axisBorder: { show: false },
      axisTicks: { show: false },
    },
    yaxis: {
      labels: {
        maxWidth: 220,
        style: {
          colors: items.map(() => "hsl(var(--foreground))"),
          fontSize: "11px",
        },
      },
    },
    legend: { show: false },
    tooltip: {
      theme: "dark",
      y: {
        formatter: (value, context) => {
          const item = items[context.dataPointIndex];
          return `${Math.round(Number(value))} tickets • ${item?.hint ?? ""}`;
        },
      },
    },
  };
}

export function OpenTicketsInsights({
  records,
  scopeMode,
  allowAreaFilter = false,
}: OpenTicketsInsightsProps) {
  const [areaFilter, setAreaFilter] = useState<TicketArea>(getDefaultAreaFilter(scopeMode));
  const [selectedModule, setSelectedModule] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");

  const scopedRecords = useMemo(() => {
    if (scopeMode === "development") {
      return records.filter((record) => record.team === "DESENVOLVIMENTO");
    }
    return records;
  }, [records, scopeMode]);

  const areaScopedRecords = useMemo(() => {
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

  const filteredRecords = useMemo(() => {
    return areaScopedRecords.filter((record) => {
      const moduleMatch = !selectedModule || String(record.module ?? "").trim() === selectedModule;
      const categoryMatch = !selectedCategory || String(record.category ?? "").trim() === selectedCategory;
      return moduleMatch && categoryMatch;
    });
  }, [areaScopedRecords, selectedCategory, selectedModule]);

  const moduleBreakdown = useMemo(() => groupRecords(areaScopedRecords, "module"), [areaScopedRecords]);
  const categoryBreakdown = useMemo(() => groupRecords(areaScopedRecords, "category"), [areaScopedRecords]);

  const selectedModuleLabel = selectedModule ? formatModuleLabel(selectedModule) : "";
  const selectedCategoryLabel = selectedCategory ? formatCategoryLabel(selectedCategory) : "";
  const activeHref = buildTicketsHref({
    team: areaFilter,
    category: selectedCategory,
    module: selectedModule,
  });

  const filterLabel =
    areaFilter === "SUPORTE"
      ? "Suporte"
      : areaFilter === "DESENVOLVIMENTO"
        ? "Desenvolvimento"
        : "Todas as areas";

  const moduleChartOptions = useMemo(
    () =>
      createHorizontalChartOptions(moduleBreakdown, selectedModule, (item) => {
        setSelectedModule((current) => (current === item.queryValue ? "" : item.queryValue));
      }),
    [moduleBreakdown, selectedModule],
  );

  const categoryChartOptions = useMemo(
    () =>
      createHorizontalChartOptions(categoryBreakdown, selectedCategory, (item) => {
        setSelectedCategory((current) => (current === item.queryValue ? "" : item.queryValue));
      }),
    [categoryBreakdown, selectedCategory],
  );

  return (
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
      <Card className="border-border/60 bg-linear-to-br from-card via-card to-primary/5 xl:col-span-3">
        <CardHeader className="pb-3">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="space-y-1">
              <CardTitle className="text-base">Tickets abertos agora</CardTitle>
              <p className="text-sm text-muted-foreground">{getScopeDescription(scopeMode)}</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {selectedModuleLabel ? <Badge variant="outline">Modulo: {selectedModuleLabel}</Badge> : null}
              {selectedCategoryLabel ? <Badge variant="outline">Categoria: {selectedCategoryLabel}</Badge> : null}
              <Badge variant="outline" className="border-primary/20 bg-primary/5 text-primary">
                {filteredRecords.length} ativos no recorte
              </Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-[1fr_1fr_1fr_auto]">
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
          <div className="flex flex-col justify-between gap-3 rounded-xl border border-border/50 bg-background/50 p-4">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Acao rapida</p>
              <p className="mt-2 text-sm text-muted-foreground">Abra a fila ja filtrada pelo recorte atual.</p>
            </div>
            <Button asChild className="w-full gap-2">
              <Link href={activeHref}>Abrir tickets filtrados</Link>
            </Button>
          </div>
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

      <BreakdownCard
        title="Abertos por modulo"
        filterLabel={filterLabel}
        items={moduleBreakdown}
        selectedValue={selectedModule}
        selectedLabel={selectedModuleLabel}
        chartOptions={moduleChartOptions}
        onSelect={(item) => setSelectedModule((current) => (current === item.queryValue ? "" : item.queryValue))}
        hrefBuilder={(item) =>
          buildTicketsHref({
            team: areaFilter,
            module: item.queryValue,
            category: selectedCategory,
          })
        }
      />

      <BreakdownCard
        title="Abertos por categoria"
        filterLabel={filterLabel}
        items={categoryBreakdown}
        selectedValue={selectedCategory}
        selectedLabel={selectedCategoryLabel}
        chartOptions={categoryChartOptions}
        onSelect={(item) => setSelectedCategory((current) => (current === item.queryValue ? "" : item.queryValue))}
        hrefBuilder={(item) =>
          buildTicketsHref({
            team: areaFilter,
            category: item.queryValue,
            module: selectedModule,
          })
        }
      />
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

function BreakdownCard({
  title,
  filterLabel,
  items,
  selectedValue,
  selectedLabel,
  chartOptions,
  onSelect,
  hrefBuilder,
}: {
  title: string;
  filterLabel: string;
  items: GroupedItem[];
  selectedValue: string;
  selectedLabel: string;
  chartOptions: ApexOptions;
  onSelect: (item: GroupedItem) => void;
  hrefBuilder: (item: GroupedItem) => string;
}) {
  const hasData = items.length > 0;

  return (
    <Card className="border-border/50 bg-card/70">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-3">
          <div className="space-y-1">
            <CardTitle className="text-sm">{title}</CardTitle>
            <p className="text-xs text-muted-foreground">
              {selectedLabel ? `Filtro ativo: ${selectedLabel}` : "Clique para focar no recorte"}
            </p>
          </div>
          <Badge variant="outline">{filterLabel}</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {hasData ? (
          <>
            <ReactApexChart
              type="bar"
              height={260}
              series={[{ name: "Tickets", data: items.map((item) => item.value) }]}
              options={chartOptions}
            />
            <div className="space-y-2">
              {items.map((item) => (
                <div
                  key={`${title}-${item.label}`}
                  className={cn(
                    "rounded-lg border px-3 py-2 transition-colors",
                    item.queryValue === selectedValue
                      ? "border-primary/40 bg-primary/5"
                      : "border-border/50 bg-background/50",
                  )}
                >
                  <div className="flex items-center justify-between gap-3">
                    <button
                      type="button"
                      onClick={() => onSelect(item)}
                      className="min-w-0 flex-1 text-left"
                    >
                      <div className="truncate text-sm font-medium text-foreground">{item.label}</div>
                      <p className="mt-1 text-xs text-muted-foreground">{item.hint}</p>
                    </button>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold tabular-nums text-foreground">{item.value}</span>
                      <Button asChild size="sm" variant="outline" className="h-8 px-3 text-xs">
                        <Link href={hrefBuilder(item)}>Abrir</Link>
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        ) : (
          <p className="text-sm text-muted-foreground">Nenhum ticket aberto neste recorte.</p>
        )}
      </CardContent>
    </Card>
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
