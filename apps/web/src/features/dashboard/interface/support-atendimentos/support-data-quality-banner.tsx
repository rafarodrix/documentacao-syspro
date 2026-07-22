"use client";

import Link from "next/link";
import { DashboardDataQualitySummary } from "@dosc-syspro/contracts/dashboard";
import { Button } from "@dosc-syspro/ui";
import { AlertTriangle, ChevronRight, Database } from "lucide-react";

type SupportDataQualityBannerProps = {
  unlinkedCount: number;
  dataQuality?: DashboardDataQualitySummary;
};

export function SupportDataQualityBanner({
  unlinkedCount,
  dataQuality,
}: SupportDataQualityBannerProps) {
  const count = dataQuality?.unlinkedCompaniesCount ?? unlinkedCount;

  if (count <= 0) return null;

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-xs text-amber-200">
      <div className="flex items-center gap-2.5">
        <Database className="h-4 w-4 shrink-0 text-amber-500" />
        <div>
          <span className="font-semibold text-foreground">Qualidade dos dados: </span>
          <span>
            {count} conversas sem vínculo direto com empresa cadastrada no Syspro.
          </span>
        </div>
      </div>

      <Button asChild variant="outline" size="sm" className="border-amber-500/40 bg-amber-500/20 text-amber-300 hover:bg-amber-500/30 hover:text-white">
        <Link href="/portal/contatos">
          Revisar vínculos
          <ChevronRight className="ml-1 h-3.5 w-3.5" />
        </Link>
      </Button>
    </div>
  );
}
