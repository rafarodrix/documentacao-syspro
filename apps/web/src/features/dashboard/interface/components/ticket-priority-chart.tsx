"use client";

import dynamic from "next/dynamic";
import { useMemo } from "react";
import type { ApexOptions } from "apexcharts";
import { useTheme } from "next-themes";
import type { DashboardOpenTicketRecord } from "@dosc-syspro/contracts/dashboard";
import { Card, CardContent, CardHeader, CardTitle, Badge } from "@dosc-syspro/ui";

const ReactApexChart = dynamic(() => import("react-apexcharts"), { ssr: false });

type PriorityBucket = { label: string; count: number; color: string };

function buildBuckets(records: DashboardOpenTicketRecord[], isDark: boolean): PriorityBucket[] {
  let alta = 0;
  let media = 0;
  let baixa = 0;
  for (const r of records) {
    if (r.priority === "Alta") alta++;
    else if (r.priority === "Média") media++;
    else baixa++;
  }
  return [
    { label: "Alta", count: alta, color: isDark ? "#f87171" : "#dc2626" },
    { label: "Media", count: media, color: isDark ? "#fbbf24" : "#d97706" },
    { label: "Baixa", count: baixa, color: isDark ? "#34d399" : "#059669" },
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
      colors: buckets.map((b) => b.color),
      labels: buckets.map((b) => b.label),
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

  const alta = buckets[0].count;
  const altaPct = total > 0 ? Math.round((alta / total) * 100) : 0;

  return (
    <Card className="h-full border-border/60 bg-card/70 shadow-sm">
      <CardHeader className="flex flex-row items-start justify-between gap-3 pb-2">
        <div className="space-y-1">
          <CardTitle className="text-sm">Prioridade dos tickets</CardTitle>
          <p className="text-xs text-muted-foreground">
            {hasData
              ? `${alta} de prioridade alta (${altaPct}%)`
              : "Nenhum ticket aberto"}
          </p>
        </div>
        <Badge variant="outline" className="border-border/60 bg-background/70 text-muted-foreground">
          {total} abertos
        </Badge>
      </CardHeader>
      <CardContent className="px-4 pb-4">
        <div className="rounded-2xl border border-border/50 bg-linear-to-br from-background/80 via-background/70 to-primary/5 p-3">
          {hasData ? (
            <ReactApexChart
              type="donut"
              height={260}
              series={buckets.map((b) => b.count)}
              options={options}
            />
          ) : (
            <div className="flex h-[260px] items-center justify-center">
              <p className="text-sm text-muted-foreground">Nenhum ticket aberto no momento</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
