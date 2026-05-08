"use client"

import { Info, FileCode, Database, AlertTriangle, X, LucideIcon } from "lucide-react";
import { FIELD_METADATA } from "@dosc-syspro/contracts";
import { Button } from "@dosc-syspro/ui";
import { cn } from "@/lib/utils";

interface TechnicalPanelProps {
  focusedField: string | null;
  onClose: () => void;
}

interface InfoBoxProps {
  icon: LucideIcon;
  title: string;
  children: React.ReactNode;
  variant: "warning" | "danger" | "success";
}

function InfoBox({ icon: Icon, title, children, variant }: InfoBoxProps) {
  const styles = {
    warning: {
      container: "bg-amber-50 border-amber-200 dark:bg-muted/50 dark:border-border",
      text: "text-amber-600 dark:text-amber-400",
      iconColor: "text-amber-600 dark:text-amber-400"
    },
    danger: {
      container: "bg-red-50 border-red-200 dark:bg-red-950/30 dark:border-red-900/50",
      text: "text-red-800 dark:text-red-200/80",
      iconColor: "text-red-600 dark:text-red-400"
    },
    success: {
      container: "bg-emerald-50 border-emerald-200 dark:bg-emerald-950/30 dark:border-emerald-900/50",
      text: "text-emerald-800 dark:text-emerald-200",
      iconColor: "text-emerald-600 dark:text-emerald-400"
    }
  };

  const style = styles[variant];

  return (
    <div className={cn("p-3 rounded border", style.container)}>
      <div className="flex items-center gap-2 mb-1">
        <Icon size={14} className={style.iconColor} />
        <span className={cn("text-xs font-mono font-bold uppercase", style.iconColor)}>
          {title}
        </span>
      </div>
      <div className={cn("text-sm", style.text)}>
        {children}
      </div>
    </div>
  );
}

export function TechnicalPanel({ focusedField, onClose }: TechnicalPanelProps) {
  const data = FIELD_METADATA[focusedField || "default"] || FIELD_METADATA["default"];

  return (
    <div className="h-fit sticky top-6 space-y-4">
      <div className="bg-card text-card-foreground rounded-lg p-5 shadow-lg border border-border transition-all duration-300">
        <div className="flex items-center justify-between mb-4 border-b border-border pb-3">
          <div className="flex items-center gap-2">
            <Info className="text-blue-600 dark:text-blue-400" size={20} />
            <h3 className="font-bold text-lg tracking-wide">Raio-X Técnico</h3>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8 rounded-full" aria-label="Fechar painel">
            <X size={16} />
          </Button>
        </div>

        <div className="space-y-5 animate-in fade-in slide-in-from-right-2 duration-300" key={focusedField}>
          <div>
            <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider font-bold">
              Campo Selecionado
            </span>
            <h4 className="text-xl font-semibold text-primary leading-tight mt-1">
              {data.label}
            </h4>
          </div>

          <InfoBox icon={FileCode} title="XML / DANFE" variant="warning">
            <code className="font-mono text-foreground break-all bg-background/50 px-1 py-0.5 rounded">
              {data.xmlTag}
            </code>
          </InfoBox>

          <div>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {data.description}
            </p>
          </div>

          <InfoBox icon={AlertTriangle} title="Impacto e Validação" variant="danger">
            {data.impact}
          </InfoBox>

          {data.sped && (
            <InfoBox icon={Database} title="SPED" variant="success">
              <strong>Registro:</strong> {data.sped}
            </InfoBox>
          )}
        </div>
      </div>
    </div>
  );
}
