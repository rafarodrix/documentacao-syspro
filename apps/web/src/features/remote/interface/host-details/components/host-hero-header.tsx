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
  windowsComputerName: string | null;
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
  windowsComputerName,
  normalizedRustdeskId,
  machineIpv4,
  ticketNumber,
  isStartingSession,
  isMobileClient,
  onStartSession,
}: Props) {
  const resolvedHostname = windowsComputerName?.trim() || null;
  const resolvedTitle = host.name?.trim() || resolvedHostname || "Dispositivo";
  const showHostname = !!resolvedHostname && resolvedHostname.localeCompare(resolvedTitle, "pt-BR", { sensitivity: "base" }) !== 0;

  return (
    <div className="sticky top-0 z-30 -mx-6 -mt-6 mb-6 border-b border-border/45 bg-gradient-to-r from-background/80 via-background/75 to-muted/20 px-6 py-4 backdrop-blur-xl shadow-sm transition-all animate-in fade-in slide-in-from-top-4 duration-500">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-4 min-w-0">
          <Link
            href="/portal/infraestrutura"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-border/60 bg-background/40 hover:bg-muted/80 hover:scale-105 transition-all text-muted-foreground hover:text-foreground"
            title="Voltar para a lista"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div className="min-w-0 space-y-0.5">
            <div className="flex items-center gap-2.5">
              <h1 className="truncate text-xl font-bold tracking-tight text-foreground md:text-2xl">
                {resolvedTitle}
              </h1>
              
              <div className="relative flex h-2.5 w-2.5 shrink-0 items-center justify-center">
                {heartbeat.label === "Contato recente" ? (
                  <>
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-500 opacity-60" />
                    <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.75)]" />
                  </>
                ) : (
                  <span className="relative inline-flex h-2.5 w-2.5 rounded-full border border-muted-foreground/35 bg-muted-foreground/20" />
                )}
              </div>
            </div>
            {showHostname ? (
              <p className="text-xs text-muted-foreground">
                Hostname: <span className="font-mono text-foreground">{resolvedHostname}</span>
              </p>
            ) : null}
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
              <span className="flex items-center gap-1 font-mono text-primary/85 font-medium">
                <Fingerprint className="h-3 w-3" />
                RustDesk {normalizedRustdeskId ?? "---"}
              </span>
              <span className="flex items-center gap-1">
                <Building2 className="h-3 w-3 text-muted-foreground/80" />
                {host.companyName ?? "Sem empresa"}
              </span>
              {machineIpv4 && (
                <span className="flex items-center gap-1 font-mono">
                  <Monitor className="h-3 w-3 text-muted-foreground/80" />
                  {machineIpv4}
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">


          <Button
            onClick={onStartSession}
            disabled={!normalizedRustdeskId || isStartingSession}
            className={cn(
              "gap-2 px-6 shadow-md transition-all duration-300 hover:scale-[1.03] hover:-translate-y-0.5 active:scale-[0.97] active:translate-y-0 h-10 font-bold tracking-wide border-0",
              ticketNumber 
                ? "bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-indigo-500/20 hover:shadow-indigo-500/35" 
                : "bg-gradient-to-r from-primary to-primary/95 text-primary-foreground shadow-primary/15 hover:shadow-primary/25",
            )}
          >
            {isStartingSession ? (
              <RefreshCcw className="h-4 w-4 animate-spin" />
            ) : (
              <PlayCircle className="h-4 w-4" />
            )}
            {isStartingSession ? "Iniciando..." : isMobileClient ? "App" : "Conectar"}
          </Button>
        </div>
      </div>
    </div>
  );
}
