"use client";

import { ReactNode } from "react";
import { type ManagedService } from "../types/device-service.types";
import { ServiceStatus } from "./service-status";

type ServiceCardProps = {
  service: ManagedService;
  primaryAction?: ReactNode;
  secondaryActions?: ReactNode;
};

export function ServiceCard({ service, primaryAction, secondaryActions }: ServiceCardProps) {
  return (
    <div className="rounded-xl border border-border/60 bg-card p-5 shadow-sm transition-all hover:border-border">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 space-y-1">
          <h4 className="font-semibold text-foreground tracking-tight flex items-center gap-2">
            {formatServiceTitle(service.type)}
            <ServiceStatus healthStatus={service.healthStatus} />
          </h4>
          
          <div className="mt-4 grid grid-cols-2 gap-y-2 text-sm">
            <div>
              <span className="text-muted-foreground">Execução: </span>
              <span className="font-medium">{formatRuntimeStatus(service.runtimeStatus)}</span>
            </div>
            
            <div>
              <span className="text-muted-foreground">Versão: </span>
              <span className="font-medium">{service.version || "N/A"}</span>
            </div>
            
            <div>
              <span className="text-muted-foreground">Conformidade: </span>
              <span className="font-medium">{formatComplianceStatus(service.complianceStatus)}</span>
            </div>
            
            <div className="col-span-2">
              <span className="text-muted-foreground">Última validação: </span>
              <span className="font-medium">{new Date(service.lastCheckedAt).toLocaleTimeString()}</span>
            </div>
          </div>
          
          {service.reasons && service.reasons.length > 0 && (
            <div className="mt-4 rounded-md bg-destructive/10 p-3 text-sm text-destructive border border-destructive/20">
              <span className="font-semibold block mb-1">Motivo:</span>
              <ul className="list-disc pl-4 space-y-1">
                {service.reasons.map((r, i) => (
                  <li key={i}>{r.title} {r.description && `- ${r.description}`}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
        
        <div className="flex flex-col gap-2 shrink-0">
          {primaryAction}
          {secondaryActions}
        </div>
      </div>
    </div>
  );
}

function formatServiceTitle(type: ManagedService["type"]): string {
  switch (type) {
    case "TRILINK_AGENT": return "Trilink Agent";
    case "RUSTDESK": return "RustDesk";
    case "RATHOLE": return "Rathole";
    case "UPDATER": return "Updater";
    case "RCLONE": return "Rclone";
    case "BACKUP_AGENT": return "Backup Agent";
    default: return type;
  }
}

function formatRuntimeStatus(status: ManagedService["runtimeStatus"]): string {
  switch (status) {
    case "RUNNING": return "Operacional";
    case "STOPPED": return "Parado";
    case "UNKNOWN": return "Desconhecido";
    default: return status;
  }
}

function formatComplianceStatus(status: ManagedService["complianceStatus"]): string {
  switch (status) {
    case "COMPLIANT": return "Em conformidade";
    case "OUT_OF_SYNC": return "Divergente";
    case "NOT_APPLICABLE": return "Não aplicável";
    default: return status;
  }
}
