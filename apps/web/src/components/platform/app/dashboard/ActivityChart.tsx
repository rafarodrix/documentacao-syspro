"use client";

import dynamic from "next/dynamic";
import type { ApexOptions } from "apexcharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Activity } from "lucide-react";

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

export function ActivityChart({
  title,
  description,
  points,
  badgeLabel = "Ultimos 7 dias",
  emptyLabel = "Sem atividade no periodo",
}: ActivityChartProps) {
  const values = points.map((point) => point.value);
  const labels = points.map((point) => point.label);
  const hasData = values.some((value) => value > 0);

  const options: ApexOptions = {
    chart: {
      type: "area",
      toolbar: { show: false },
      sparkline: { enabled: false },
      zoom: { enabled: false },
      animations: { speed: 450 },
      foreColor: "hsl(var(--muted-foreground))",
      fontFamily: "inherit",
    },
    colors: ["hsl(var(--primary))"],
    stroke: {
      curve: "smooth",
      width: 3,
    },
    fill: {
      type: "gradient",
      gradient: {
        shadeIntensity: 1,
        opacityFrom: 0.28,
        opacityTo: 0.04,
        stops: [0, 90, 100],
      },
    },
    grid: {
      borderColor: "hsl(var(--border) / 0.45)",
      strokeDashArray: 4,
      padding: {
        left: 6,
        right: 10,
        top: 10,
        bottom: 2,
      },
    },
    xaxis: {
      categories: labels,
      axisBorder: { show: false },
      axisTicks: { show: false },
      labels: {
        style: {
          colors: labels.map(() => "hsl(var(--muted-foreground))"),
          fontSize: "11px",
        },
      },
      tooltip: { enabled: false },
    },
    yaxis: {
      min: 0,
      forceNiceScale: true,
      labels: {
        formatter: (value) => Math.round(value).toLocaleString("pt-BR"),
        style: {
          colors: ["hsl(var(--muted-foreground))"],
          fontSize: "11px",
        },
      },
    },
    dataLabels: { enabled: false },
    markers: {
      size: 4,
      strokeWidth: 0,
      hover: { size: 6 },
    },
    tooltip: {
      theme: "dark",
      x: { show: true },
      y: {
        formatter: (value) => `${Math.round(value).toLocaleString("pt-BR")} atualizacao(oes)`,
      },
    },
    legend: { show: false },
    noData: {
      text: emptyLabel,
      align: "center",
      verticalAlign: "middle",
      style: {
        color: "hsl(var(--muted-foreground))",
        fontSize: "13px",
      },
    },
  };

  return (
    <Card className="h-full w-full border-border/60 bg-card/70 shadow-sm">
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
        <div className="relative h-full rounded-2xl border border-border/50 bg-background/40 p-3">
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
