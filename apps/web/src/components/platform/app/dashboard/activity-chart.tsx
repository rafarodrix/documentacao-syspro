/* eslint-disable trilink-tokens/no-hex-colors */
"use client";

import dynamic from "next/dynamic";
import { useMemo } from "react";
import type { ApexOptions } from "apexcharts";
import { useTheme } from "next-themes";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, Badge } from "@dosc-syspro/ui";
import { Activity } from "lucide-react";
import { formatNumber } from "@/lib/formatters";

const ReactApexChart = dynamic(() => import("react-apexcharts"), { ssr: false });

export interface ActivityPoint {
  label: string;
  value: number;
}

interface ActivityChartProps {
  title: string;
  description: string;
  points: ActivityPoint[];
  badgeLabel?: string;
  emptyLabel?: string;
}

type ChartPalette = {
  line: string;
  marker: string;
  markerStroke: string;
  foreground: string;
  muted: string;
  border: string;
  tooltipTheme: "dark" | "light";
};

export function ActivityChart({
  title,
  description,
  points,
  badgeLabel = "Ultimos 7 dias",
  emptyLabel = "Sem atividade no periodo",
}: ActivityChartProps) {
  const { resolvedTheme, theme } = useTheme();
  const values = points.map((point) => point.value);
  const labels = points.map((point) => point.label);
  const hasData = values.some((value) => value > 0);
  const peakValue = values.length > 0 ? Math.max(...values, 0) : 0;
  const activeTheme = resolvedTheme ?? theme ?? "dark";
  const isDark = activeTheme === "dark";

  const palette = useMemo<ChartPalette>(
    () => ({
      line: isDark ? "#60a5fa" : "#2563eb",
      marker: isDark ? "#93c5fd" : "#2563eb",
      markerStroke: isDark ? "#0b1220" : "#ffffff",
      foreground: isDark ? "#e5eefc" : "#0f172a",
      muted: isDark ? "#9fb0c8" : "#64748b",
      border: isDark ? "rgba(148, 163, 184, 0.24)" : "rgba(15, 23, 42, 0.12)",
      tooltipTheme: isDark ? "dark" : "light",
    }),
    [isDark],
  );

  const options = useMemo<ApexOptions>(
    () => ({
      chart: {
        type: "area",
        toolbar: { show: false },
        sparkline: { enabled: false },
        zoom: { enabled: false },
        animations: { speed: 450 },
        foreColor: palette.muted,
        fontFamily: "inherit",
        background: "transparent",
      },
      colors: [palette.line],
      stroke: {
        curve: "smooth",
        width: 4,
      },
      fill: {
        type: "gradient",
        gradient: {
          shadeIntensity: 1,
          opacityFrom: isDark ? 0.42 : 0.28,
          opacityTo: isDark ? 0.12 : 0.08,
          stops: [0, 90, 100],
        },
      },
      grid: {
        borderColor: palette.border,
        strokeDashArray: 4,
        padding: {
          left: 12,
          right: 12,
          top: 18,
          bottom: 2,
        },
      },
      xaxis: {
        categories: labels,
        axisBorder: { show: false },
        axisTicks: { show: false },
        labels: {
          style: {
            colors: labels.map(() => palette.foreground),
            fontSize: "11px",
          },
        },
        tooltip: { enabled: false },
      },
      yaxis: {
        min: 0,
        max: peakValue > 0 ? peakValue + 1 : undefined,
        tickAmount: peakValue > 0 ? Math.min(4, peakValue + 1) : 3,
        forceNiceScale: true,
        labels: {
          formatter: (value) => formatNumber(Math.round(value)),
          style: {
            colors: [palette.foreground],
            fontSize: "11px",
          },
        },
      },
      dataLabels: { enabled: false },
      markers: {
        size: 5,
        strokeWidth: 3,
        strokeColors: palette.markerStroke,
        colors: [palette.marker],
        hover: { size: 7 },
      },
      tooltip: {
        theme: palette.tooltipTheme,
        x: { show: true },
        y: {
          formatter: (value) => `${formatNumber(Math.round(value))} ${Math.round(value) !== 1 ? "atualizacoes" : "atualizacao"}`,
        },
      },
      legend: { show: false },
      noData: {
        text: emptyLabel,
        align: "center",
        verticalAlign: "middle",
        style: {
          color: palette.muted,
          fontSize: "13px",
        },
      },
    }),
    [emptyLabel, isDark, labels, palette, peakValue],
  );

  return (
    <Card className="h-full w-full border-border/60 bg-card shadow-sm">
      <CardHeader className="flex flex-row items-start justify-between gap-3 pb-2">
        <div className="space-y-1">
          <CardTitle className="text-base font-semibold">{title}</CardTitle>
          <CardDescription className="text-sm">{description}</CardDescription>
        </div>
        <Badge
          variant="outline"
          className="border-border/60 bg-background/70 px-2.5 text-muted-foreground"
        >
          {badgeLabel}
        </Badge>
      </CardHeader>

      <CardContent className="px-4 pb-4">
        <div className="relative h-full rounded-lg border border-border/50 bg-background p-3">
          {!hasData ? (
            <div className="flex h-[320px] w-full flex-col items-center justify-center text-center">
              <Activity className="mb-2 h-8 w-8 text-muted-foreground/40" />
              <p className="text-sm text-muted-foreground">{emptyLabel}</p>
            </div>
          ) : (
            <ReactApexChart
              type="area"
              height={320}
              series={[
                {
                  name: "Atualizacoes",
                  data: values,
                },
              ]}
              options={options}
            />
          )}
        </div>
      </CardContent>
    </Card>
  );
}
