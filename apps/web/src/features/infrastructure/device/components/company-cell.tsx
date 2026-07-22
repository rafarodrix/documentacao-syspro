"use client";

import type { DeviceListItem } from "@dosc-syspro/contracts";
import { Building2 } from "lucide-react";
import { Button } from "@dosc-syspro/ui";

type CompanyCellProps = {
  item: DeviceListItem;
  onLinkCompany?: (device: DeviceListItem) => void;
};

export function CompanyCell({ item, onLinkCompany }: CompanyCellProps) {
  const { company } = item;

  if (!company.id && item.lifecycle === "DISCOVERED") {
    return (
      <div className="flex flex-col gap-1 min-w-0">
        <span className="truncate text-xs font-semibold text-amber-600 dark:text-amber-400 flex items-center gap-1">
          <Building2 className="h-3 w-3 shrink-0" />
          Empresa não definida
        </span>
        <span className="truncate text-[11px] text-muted-foreground">
          Aguardando vínculo
        </span>
        {onLinkCompany && (
          <div className="pt-0.5">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-6 px-2 text-[10px] font-semibold text-primary border-primary/30 hover:bg-primary/10"
              onClick={(e) => {
                e.stopPropagation();
                onLinkCompany(item);
              }}
            >
              Vincular empresa
            </Button>
          </div>
        )}
      </div>
    );
  }

  const tradeName = company.tradeName?.trim();
  const legalName = company.legalName?.trim();
  const documentFormatted = company.document?.trim();

  const line1Text = tradeName ? tradeName.toUpperCase() : (legalName?.toUpperCase() ?? "EMPRESA DESCONHECIDA");
  const line2Parts = [legalName, documentFormatted].filter(Boolean);
  const line2Text = line2Parts.join(" • ");

  const tooltipText = [
    legalName ?? tradeName ?? "Empresa",
    documentFormatted ? `CNPJ ${documentFormatted}` : null,
  ]
    .filter(Boolean)
    .join("\n");

  return (
    <div className="flex flex-col gap-0.5 min-w-0" title={tooltipText}>
      {/* Line 1: Trade name in bold */}
      <span className="truncate text-xs font-bold uppercase tracking-wide text-foreground">
        {line1Text}
      </span>

      {/* Line 2: Legal name • CNPJ */}
      <span className="truncate text-[11px] font-mono tabular-nums text-muted-foreground">
        {line2Text}
      </span>
    </div>
  );
}
