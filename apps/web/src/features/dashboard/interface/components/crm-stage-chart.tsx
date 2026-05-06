"use client";

import dynamic from "next/dynamic";
import { useMemo } from "react";
import type { ApexOptions } from "apexcharts";
import { useTheme } from "next-themes";
import type { DashboardCrmStageSummary } from "@dosc-syspro/contracts/dashboard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const ReactApexChart = dynamic(() => import("react-apexcharts"), { ssr: false });

export function CrmStageChart({ distribution }: { distribution: DashboardCrmStageSummary[] }) {
  const { resolvedTheme, theme } = useTheme();
  const isDark = (resolvedTheme ?? theme ?? "dark") === "dark";

  const items = useMemo(
    () => distribution.filter((item) => item.stage !== "LOST").sort((a, b) => b.count - a.count),
    [distribution],
  );

  const hasData = items.some((item) => item.count > 0);
  const total = items.reduce((sum, item) => sum + item.count, 0);

  const activeBar = isDark ? "#60a5fa" : "#2563eb";
  const passiveBar = isDark ? "#334155" : "#e2e8f0";
  const foreground = isDark ? "#e5eefc" : "#0f172a";
  const muted = isDark ? "#a3b3ca" : "#64748b";
  const border = isDark ? "rgba(148,163,184,0.24)" : "rgba(15,23,42,0.12)";

  const colors = items.map((_, i) => {
    const fade = Math.max(0.35, 1 - i * 0.12);
    if (isDark) {
      const r = Math.round(96 + (148 - 96) * (1 - fade));
      const g = Math.round(165 + (163 - 165) * (1 - fade));
      const b = Math.round(250 + (184 - 250) * (1 - fade));
      return `rgba(${r},${g},${b},${fade})`;
    }
    return i === 0 ? activeBar : passiveBar;
  });

  const options = useMemo<ApexOptions>(
    () => ({
      chart: {
        type: "bar",
        toolbar: { show: false },
        background: "transparent",
        fontFamily: "inherit",
        foreColor: muted,
      },
      colors,
      plotOptions: {
        bar: {
          horizontal: true,
          borderRadius: 7,
          barHeight: "56%",
          distributed: true,
        },
      },
      grid: {
        borderColor: border,
        strokeDashArray: 4,
        padding: { left: 8, right: 16, top: 2, bottom: -8 },
      },
      dataLabels: {
        enabled: true,
        formatter: (val: number) => (val > 0 ? String(val) : ""),
        style: { fontSize: "11px", fontWeight: 700, colors: [foreground] },
        offsetX: 8,
        background: { enabled: false },
      },
      xaxis: {
        categories: items.map((item) => item.label),
        axisBorder: { show: false },
        axisTicks: { show: false },
        labels: {
          style: { colors: items.map(() => foreground), fontSize: "11px" },
        },
      },
      yaxis: {
        labels: {
          maxWidth: 160,
          style: { colors: items.map(() => foreground), fontSize: "11px" },
        },
      },
      legend: { show: false },
      tooltip: {
        theme: isDark ? "dark" : "light",
        y: { formatter: (val: number) => `${val} lead${val !== 1 ? "s" : ""}` },
      },
    }),
    [border, colors, foreground, isDark, items, muted],
  );

  return (
    <Card className="border-border/60 bg-card/70 shadow-sm">
      <CardHeader className="flex flex-row items-start justify-between gap-3 pb-2">
        <div className="space-y-1">
          <CardTitle className="text-sm">Distribuicao do funil</CardTitle>
          <p className="text-xs text-muted-foreground">
            {hasData ? `${total} leads no pipeline` : "Pipeline sem dados"}
          </p>
        </div>
        <Badge variant="outline" className="border-border/60 bg-background/70 text-muted-foreground">
          CRM
        </Badge>
      </CardHeader>
      <CardContent className="px-4 pb-4">
        <div className="rounded-2xl border border-border/50 bg-linear-to-br from-background/80 via-background/70 to-primary/5 px-2 py-3">
          {hasData ? (
            <ReactApexChart
              type="bar"
              height={Math.max(160, items.length * 44)}
              series={[{ name: "Leads", data: items.map((item) => item.count) }]}
              options={options}
            />
          ) : (
            <div className="flex h-[160px] items-center justify-center">
              <p className="text-sm text-muted-foreground">Nenhum lead no pipeline</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
