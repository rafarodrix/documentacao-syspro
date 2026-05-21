"use client";

import Link from "next/link";
import { ArrowLeft, Building2, Cpu, Activity, Fingerprint, Monitor, PlayCircle, RefreshCcw } from "lucide-react";
import { Button } from "@dosc-syspro/ui";
import { cn } from "@/lib/utils";
import type { RemoteHostDetails } from "@/features/remote/domain/remote-host.types";

type Heartbeat = {
  label: string;
  tone: string;
  description: string;
};

type Props = {
  host: RemoteHostDetails["host"];
  heartbeat: Heartbeat;
  normalizedRustdeskId: string | null;
  machineIpv4: string | null;
  ticketNumber: string | null;
  isStartingSession: boolean;
  isMobileClient: boolean;
  onStartSession: () => void;
};

export function HostHeroHeader({
  host,
  heartbeat,
  normalizedRustdeskId,
  machineIpv4,
  ticketNumber,
  isStartingSession,
  isMobileClient,
  onStartSession,
}: Props) {
  return (
    <div className="sticky top-0 z-30 -mx-6 -mt-6 mb-6 border-b border-border/40 bg-background/60 px-6 py-4 backdrop-blur-xl transition-all animate-in fade-in slide-in-from-top-4 duration-500">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-4 min-w-0">
          <Link
            href="/portal/infraestrutura?tab=hosts"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-border/60 bg-background/40 hover:bg-muted/80 hover:scale-105 transition-all text-muted-foreground hover:text-foreground"
            title="Voltar para a lista"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div className="min-w-0 space-y-0.5">
            <div className="flex items-center gap-2">
              <h1 className="truncate text-xl font-bold tracking-tight text-foreground md:text-2xl">
                {host.name}
              </h1>
              <div
                className={`h-2.5 w-2.5 shrink-0 rounded-full border-2 ${
                  heartbeat.label === "Contato recente"
                    ? "animate-pulse border-emerald-500 bg-emerald-500"
                    : "border-muted-foreground/30 bg-muted-foreground/20"
                }`}
              />
            </div>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
              <span className="flex items-center gap-1 font-mono text-primary/80">
                <Fingerprint className="h-3 w-3" />
                {normalizedRustdeskId ?? "---"}
              </span>
              <span className="flex items-center gap-1">
                <Building2 className="h-3 w-3" />
                {host.companyName ?? "Sem empresa"}
              </span>
              {machineIpv4 && (
                <span className="flex items-center gap-1 font-mono">
                  <Monitor className="h-3 w-3" />
                  {machineIpv4}
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="hidden items-center gap-1.5 border-x border-border/40 px-4 md:flex text-muted-foreground">
            {host.lastAgentMetrics?.cpuLoad != null && (
              <div
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-muted/30 text-[11px] font-medium transition-colors hover:bg-muted/50"
                title="CPU Load"
              >
                <Cpu className="h-3.5 w-3.5 text-primary/70" />
                {host.lastAgentMetrics.cpuLoad}%
              </div>
            )}
            {host.lastAgentMetrics?.ramUsedPc != null && (
              <div
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-muted/30 text-[11px] font-medium transition-colors hover:bg-muted/50"
                title="RAM usage"
              >
                <Activity className="h-3.5 w-3.5 text-sky-500/70" />
                {host.lastAgentMetrics.ramUsedPc}%
              </div>
            )}
          </div>

          <Button
            onClick={onStartSession}
            disabled={!normalizedRustdeskId || isStartingSession}
            className={cn(
              "gap-2 px-6 shadow-lg shadow-primary/10 transition-all hover:scale-[1.02] active:scale-[0.98] h-10 font-semibold",
              ticketNumber ? "bg-primary border-primary hover:bg-primary/90" : "bg-primary/90 hover:bg-primary",
            )}
          >
            {isStartingSession ? (
              <RefreshCcw className="h-4 w-4 animate-spin" />
            ) : (
              <PlayCircle className="h-4 w-4" />
            )}
            {isStartingSession ? "Iniciando..." : isMobileClient ? "App" : "Sessão auditada"}
          </Button>
        </div>
      </div>
    </div>
  );
}
