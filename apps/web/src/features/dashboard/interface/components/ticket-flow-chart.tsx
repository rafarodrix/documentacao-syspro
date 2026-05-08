/* eslint-disable trilink-tokens/no-hex-colors */
"use client";

import dynamic from "next/dynamic";
import { useMemo } from "react";
import type { ApexOptions } from "apexcharts";
import { useTheme } from "next-themes";
import type { DashboardTicketFlow } from "@dosc-syspro/contracts/dashboard";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, Badge } from "@dosc-syspro/ui";

const ReactApexChart = dynamic(() => import("react-apexcharts"), { ssr: false });

type Palette = {
  opened: string;
  inProgress: string;
  closed: string;
  foreground: string;
  muted: string;
  border: string;
  tooltipTheme: "dark" | "light";
};

export function TicketFlowChart({ flow }: { flow: DashboardTicketFlow }) {
  const { resolvedTheme, theme } = useTheme();
  const isDark = (resolvedTheme ?? theme ?? "dark") === "dark";

  const labels = flow.opened.map((p) => p.label);
  const hasData =
    flow.opened.some((p) => p.value > 0) ||
    flow.inProgress.some((p) => p.value > 0) ||
    flow.closed.some((p) => p.value > 0);

  const palette = useMemo<Palette>(
    () => ({
      opened: isDark ? "#fbbf24" : "#d97706",
      inProgress: isDark ? "#60a5fa" : "#2563eb",
      closed: isDark ? "#34d399" : "#059669",
      foreground: isDark ? "#e5eefc" : "#0f172a",
      muted: isDark ? "#9fb0c8" : "#64748b",
      border: isDark ? "rgba(148,163,184,0.24)" : "rgba(15,23,42,0.12)",
      tooltipTheme: isDark ? "dark" : "light",
    }),
    [isDark],
  );

  const options = useMemo<ApexOptions>(
    () => ({
      chart: {
        type: "area",
        toolbar: { show: false },
        zoom: { enabled: false },
        animations: { speed: 450 },
        foreColor: palette.muted,
        fontFamily: "inherit",
        background: "transparent",
      },
      colors: [palette.opened, palette.inProgress, palette.closed],
      stroke: {
        curve: "smooth",
        width: 3,
      },
      fill: {
        type: "gradient",
        gradient: {
          shadeIntensity: 1,
          opacityFrom: isDark ? 0.28 : 0.18,
          opacityTo: 0.02,
          stops: [0, 90, 100],
        },
      },
      grid: {
        borderColor: palette.border,
        strokeDashArray: 4,
        padding: { left: 12, right: 12, top: 16, bottom: 2 },
      },
      xaxis: {
        categories: labels,
        axisBorder: { show: false },
        axisTicks: { show: false },
        labels: {
          style: { colors: labels.map(() => palette.foreground), fontSize: "11px" },
        },
        tooltip: { enabled: false },
      },
      yaxis: {
        min: 0,
        forceNiceScale: true,
        labels: {
          formatter: (v) => Math.round(v).toLocaleString("pt-BR"),
          style: { colors: [palette.foreground], fontSize: "11px" },
        },
      },
      dataLabels: { enabled: false },
      markers: {
        size: 4,
        strokeWidth: 2,
        strokeColors: isDark ? "#0b1220" : "#ffffff",
        hover: { size: 6 },
      },
      legend: {
        show: true,
        position: "top",
        horizontalAlign: "right",
        fontSize: "12px",
        labels: { colors: palette.foreground },
        markers: { size: 8 },
      },
      tooltip: {
        theme: palette.tooltipTheme,
        shared: true,
        intersect: false,
        y: {
          formatter: (v) => `${Math.round(v).toLocaleString("pt-BR")} ticket${Math.round(v) !== 1 ? "s" : ""}`,
        },
      },
    }),
    [isDark, labels, palette],
  );

  return (
    <Card className="w-full border-border/60 bg-card/70 shadow-sm">
      <CardHeader className="flex flex-row items-start justify-between gap-3 pb-2">
        <div className="space-y-1">
          <CardTitle className="text-base font-semibold">Fluxo de tickets</CardTitle>
          <CardDescription className="text-sm">Abertos, em execucao e fechados nos ultimos 7 dias</CardDescription>
        </div>
        <Badge variant="outline" className="border-border/60 bg-background/70 px-2.5 text-muted-foreground">
          7 dias
        </Badge>
      </CardHeader>
      <CardContent className="px-4 pb-4">
        <div className="rounded-2xl border border-border/50 bg-linear-to-br from-background/80 via-background/70 to-primary/5 p-3">
          {hasData ? (
            <ReactApexChart
              type="area"
              height={280}
              series={[
                { name: "Abertos", data: flow.opened.map((p) => p.value) },
                { name: "Em execucao", data: flow.inProgress.map((p) => p.value) },
                { name: "Fechados", data: flow.closed.map((p) => p.value) },
              ]}
              options={options}
            />
          ) : (
            <div className="flex h-[280px] items-center justify-center">
              <p className="text-sm text-muted-foreground">Sem movimentacao no periodo</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
