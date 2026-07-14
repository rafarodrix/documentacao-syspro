"use client";

import dynamic from "next/dynamic";
import { useMemo } from "react";
import type { ApexOptions } from "apexcharts";
import { useTheme } from "next-themes";
import type { DashboardOpenTicketRecord } from "@dosc-syspro/contracts/dashboard";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, Badge } from "@dosc-syspro/ui";
import { EmptyState } from "@/components/patterns";

const ReactApexChart = dynamic(() => import("react-apexcharts"), { ssr: false });

type PriorityBucket = { label: string; count: number; color: string };

function buildBuckets(records: DashboardOpenTicketRecord[], isDark: boolean): PriorityBucket[] {
  let critical = 0;
  let high = 0;
  let normal = 0;
  let low = 0;
  for (const record of records) {
    const priority = String(record.priority ?? "").trim().toUpperCase();
    if (priority === "CRITICAL") critical++;
    else if (priority === "HIGH") high++;
    else if (priority === "NORMAL") normal++;
    else if (priority === "LOW") low++;
  }
  return [
    { label: "Crítica", count: critical, color: isDark ? "#f43f5e" : "#e11d48" },
    { label: "Alta", count: high, color: isDark ? "#f87171" : "#dc2626" },
    { label: "Média", count: normal, color: isDark ? "#fbbf24" : "#d97706" },
    { label: "Baixa", count: low, color: isDark ? "#34d399" : "#059669" },
  ];
}

export function TicketPriorityChart({ records }: { records: DashboardOpenTicketRecord[] }) {
  const { resolvedTheme, theme } = useTheme();
  const isDark = (resolvedTheme ?? theme ?? "dark") === "dark";
  const total = records.length;

  const buckets = useMemo(() => buildBuckets(records, isDark), [records, isDark]);
  const hasData = total > 0;

  const options = useMemo<ApexOptions>(
    () => ({
      chart: {
        type: "donut",
        toolbar: { show: false },
        background: "transparent",
        fontFamily: "inherit",
      },
      colors: buckets.map((bucket) => bucket.color),
      labels: buckets.map((bucket) => bucket.label),
      legend: {
        show: true,
        position: "bottom",
        fontSize: "12px",
        labels: { colors: isDark ? "#e5eefc" : "#0f172a" },
      },
      dataLabels: {
        enabled: true,
        formatter: (val: number) => `${Math.round(val)}%`,
        style: {
          fontSize: "11px",
          fontWeight: 600,
          colors: ["#ffffff"],
        },
        dropShadow: { enabled: false },
      },
      plotOptions: {
        pie: {
          donut: {
            size: "62%",
            labels: {
              show: true,
              total: {
                show: true,
                label: "Total",
                color: isDark ? "#a3b3ca" : "#64748b",
                fontSize: "12px",
                fontWeight: 400,
                formatter: () => String(total),
              },
              value: {
                color: isDark ? "#e5eefc" : "#0f172a",
                fontSize: "22px",
                fontWeight: 700,
              },
            },
          },
        },
      },
      stroke: { width: 0 },
      tooltip: {
        theme: isDark ? "dark" : "light",
        y: { formatter: (val: number) => `${val} ticket${val !== 1 ? "s" : ""}` },
      },
    }),
    [buckets, isDark, total],
  );

  const criticalOrHigh = buckets[0].count + buckets[1].count;
  const altaPct = total > 0 ? Math.round((criticalOrHigh / total) * 100) : 0;

  return (
    <Card className="h-full border-border/60 bg-card shadow-sm">
      <CardHeader className="flex flex-row items-start justify-between gap-3 pb-2">
        <div className="space-y-1">
          <CardTitle className="text-sm">Prioridade dos tickets</CardTitle>
          <CardDescription className="text-sm">
            {hasData
              ? `${criticalOrHigh} ticket${criticalOrHigh === 1 ? "" : "s"} de prioridade alta ou crítica, equivalente a ${altaPct}% da fila aberta.`
              : "Nenhum ticket aberto no recorte atual."}
          </CardDescription>
        </div>
        <Badge variant="outline" className="border-border/60 bg-background/70 text-muted-foreground">
          {total} abertos
        </Badge>
      </CardHeader>
      <CardContent className="px-4 pb-4">
        <div className="rounded-lg border border-border/50 bg-background p-3">
          {hasData ? (
            <ReactApexChart
              type="donut"
              height={260}
              series={buckets.map((bucket) => bucket.count)}
              options={options}
            />
          ) : (
            <EmptyState
              title="Nenhuma prioridade em aberto"
              description="A fila atual nao possui tickets ativos para comparar criticidade."
              compact
              dashed
              className="h-[260px] border-border/40"
            />
          )}
        </div>
      </CardContent>
    </Card>
  );
}
