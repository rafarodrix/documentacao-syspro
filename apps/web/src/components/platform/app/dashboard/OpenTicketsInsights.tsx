"use client";

import dynamic from "next/dynamic";
import { useMemo, useState } from "react";
import type { ApexOptions } from "apexcharts";
import type { DashboardOpenTicketRecord } from "@dosc-syspro/contracts/dashboard";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
    colors: items.map((item) => (item.queryValue === selectedValue ? "#38bdf8" : "#64748b")),
    plotOptions: {
      bar: {
        horizontal: true,
        borderRadius: 6,
        barHeight: "58%",
        distributed: true,
      },
    },
    grid: {
      borderColor: "hsl(var(--border) / 0.55)",
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
          colors: items.map(() => "hsl(var(--foreground) / 0.82)"),
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
          colors: items.map(() => "hsl(var(--foreground) / 0.92)"),
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

  const moduleBreakdown = useMemo(() => groupRecords(areaScopedRecords, "module"), [areaScopedRecords]);
  const categoryBreakdown = useMemo(() => groupRecords(areaScopedRecords, "category"), [areaScopedRecords]);

  const selectedModuleLabel = selectedModule ? formatModuleLabel(selectedModule) : "";
  const selectedCategoryLabel = selectedCategory ? formatCategoryLabel(selectedCategory) : "";

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
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border/50 bg-card/40 px-4 py-3">
        <div className="space-y-1">
          <h3 className="text-base font-semibold text-foreground">Distribuicao operacional</h3>
          <p className="text-sm text-muted-foreground">{getScopeDescription(scopeMode)}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {allowAreaFilter ? (
            <>
              {([
                ["ALL", "Todas as areas"],
                ["SUPORTE", "Suporte"],
                ["DESENVOLVIMENTO", "Desenvolvimento"],
              ] as const).map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setAreaFilter(value)}
                  className={cn(
                    "rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
                    areaFilter === value
                      ? "border-primary/40 bg-primary/10 text-primary"
                      : "border-border/60 bg-background text-muted-foreground hover:text-foreground",
                  )}
                >
                  {label}
                </button>
              ))}
            </>
          ) : (
            <Badge variant="outline" className="border-border/60 bg-background/70 text-foreground">
              {filterLabel}
            </Badge>
          )}
          {selectedModuleLabel ? (
            <Badge variant="outline" className="border-border/60 bg-background/70">
              Modulo: {selectedModuleLabel}
            </Badge>
          ) : null}
          {selectedCategoryLabel ? (
            <Badge variant="outline" className="border-border/60 bg-background/70">
              Categoria: {selectedCategoryLabel}
            </Badge>
          ) : null}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <BreakdownCard
          title="Abertos por modulo"
          filterLabel={filterLabel}
          items={moduleBreakdown}
          selectedLabel={selectedModuleLabel}
          chartOptions={moduleChartOptions}
        />

        <BreakdownCard
          title="Abertos por categoria"
          filterLabel={filterLabel}
          items={categoryBreakdown}
          selectedLabel={selectedCategoryLabel}
          chartOptions={categoryChartOptions}
        />
      </div>
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
}: {
  title: string;
  filterLabel: string;
  items: GroupedItem[];
  selectedLabel: string;
  chartOptions: ApexOptions;
}) {
  const hasData = items.length > 0;

  return (
    <Card className="border-border/60 bg-card/70 shadow-sm">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-3">
          <div className="space-y-1">
            <CardTitle className="text-sm">{title}</CardTitle>
            <p className="text-xs text-muted-foreground">
              {selectedLabel ? `Filtro ativo: ${selectedLabel}` : "Clique para focar no recorte"}
            </p>
          </div>
          <Badge variant="outline" className="border-border/60 bg-background/70">{filterLabel}</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {hasData ? (
          <div className="rounded-2xl border border-border/50 bg-linear-to-br from-background/80 via-background/70 to-primary/5 px-2 py-3">
            <ReactApexChart
              type="bar"
              height={260}
              series={[{ name: "Tickets", data: items.map((item) => item.value) }]}
              options={chartOptions}
            />
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">Nenhum ticket aberto neste recorte.</p>
        )}
      </CardContent>
    </Card>
  );
}
