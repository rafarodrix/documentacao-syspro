"use client";

import dynamic from "next/dynamic";
import { useMemo } from "react";
import type { ApexOptions } from "apexcharts";
import { useTheme } from "next-themes";

const ReactApexChart = dynamic(() => import("react-apexcharts"), { ssr: false });

export function LatencySparkline({ data, status }: { data: number[]; status: string }) {
  const { resolvedTheme, theme } = useTheme();
  const isDark = (resolvedTheme ?? theme ?? "dark") === "dark";

  const lineColor =
    status === "ONLINE"
      ? isDark
        ? "#34d399"
        : "#059669"
      : status === "UNSTABLE"
        ? isDark
          ? "#fbbf24"
          : "#d97706"
        : isDark
          ? "#f87171"
          : "#dc2626";

  const options = useMemo<ApexOptions>(
    () => ({
      chart: {
        type: "line",
        sparkline: { enabled: true },
        background: "transparent",
        animations: { enabled: false },
      },
      stroke: { curve: "smooth", width: 1.5 },
      colors: [lineColor],
      tooltip: {
        enabled: true,
        theme: isDark ? "dark" : "light",
        y: { formatter: (val) => `${val}ms` },
        x: { show: false },
      },
    }),
    [lineColor, isDark],
  );

  if (data.length < 2) return null;

  return (
    <div className="w-24">
      <ReactApexChart
        type="line"
        height={28}
        series={[{ name: "Latencia", data }]}
        options={options}
      />
    </div>
  );
}
