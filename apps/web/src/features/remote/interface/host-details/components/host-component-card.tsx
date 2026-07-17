import { ReactNode } from "react";
import { Card, CardContent } from "@dosc-syspro/ui";
import { cn } from "@/lib/utils";

export type ComponentStatus = "operational" | "attention" | "failed" | "updating" | "not_installed" | "not_configured" | "not_verified" | "disabled";

type HostComponentCardProps = {
  title: string;
  status: ComponentStatus;
  statusLabel?: string;
  details: { label: string; value: ReactNode }[];
  actions?: ReactNode;
};

export function HostComponentCard({
  title,
  status,
  statusLabel,
  details,
  actions,
}: HostComponentCardProps) {
  const statusColorMap: Record<ComponentStatus, { indicator: string; text: string }> = {
    operational: { indicator: "bg-emerald-500", text: "text-foreground" },
    attention: { indicator: "bg-amber-500", text: "text-foreground" },
    failed: { indicator: "bg-rose-500", text: "text-foreground" },
    updating: { indicator: "bg-blue-500 animate-pulse", text: "text-foreground" },
    not_installed: { indicator: "bg-muted-foreground", text: "text-muted-foreground" },
    not_configured: { indicator: "bg-muted-foreground", text: "text-muted-foreground" },
    not_verified: { indicator: "bg-muted-foreground", text: "text-muted-foreground" },
    disabled: { indicator: "bg-muted-foreground", text: "text-muted-foreground" },
  };

  const defaultStatusLabels: Record<ComponentStatus, string> = {
    operational: "Operacional",
    attention: "Atenção",
    failed: "Falha",
    updating: "Atualizando",
    not_installed: "Não instalado",
    not_configured: "Não configurado",
    not_verified: "Não verificado",
    disabled: "Desabilitado",
  };

  const currentStatusStyle = statusColorMap[status];
  const displayStatusLabel = statusLabel || defaultStatusLabels[status];

  return (
    <Card className="overflow-hidden border-border/50">
      <CardContent className="p-0">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-5">
          <div className="space-y-4 flex-1">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-base">{title}</h3>
              <div className="flex items-center gap-2">
                <span className={cn("text-sm font-medium", currentStatusStyle.text)}>
                  {displayStatusLabel}
                </span>
                <div className={cn("h-2.5 w-2.5 rounded-full", currentStatusStyle.indicator)} />
              </div>
            </div>
            
            <div className="flex flex-col gap-2 md:flex-row md:gap-8">
              {details.map((detail, index) => (
                <div key={index} className="space-y-1">
                  <p className="text-[10px] uppercase tracking-wide text-muted-foreground font-semibold">
                    {detail.label}
                  </p>
                  <div className="text-sm font-medium">
                    {detail.value}
                  </div>
                </div>
              ))}
            </div>
          </div>
          
          {actions && (
            <div className="flex flex-wrap md:flex-nowrap items-center gap-2 pt-4 md:pt-0 border-t border-border/40 md:border-t-0 md:pl-4 md:border-l">
              {actions}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
