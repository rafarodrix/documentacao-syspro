"use client";

import type { ReactNode } from "react";
import { Badge } from "@dosc-syspro/ui";
import { Loader2, Copy } from "lucide-react";
import { toast } from "sonner";
import { getRemoteOperationalStatusMeta, getRemoteProductStatusMeta } from "@/features/remote/domain";
import { cn, onlyDigits } from "@/lib/utils";
import { formatRelativeDate as formatRelativeDateShared } from "@/lib/date";
import { EmptyState as StandardEmptyState } from "@/components/patterns/empty-state";
import type { ContactCompanyEntry, RemoteHostEntry } from "./chatwoot-dashboard-types";

export function InlineNotice({ tone, message }: { tone: "success" | "error"; message: string }) {
  return (
    <div
      className={cn(
        "rounded-xl border px-3 py-2.5 text-xs shadow-sm transition-all duration-300 backdrop-blur",
        tone === "success"
          ? "border-emerald-500/20 bg-emerald-500/5 text-emerald-600 dark:text-emerald-400"
          : "border-amber-500/20 bg-amber-500/5 text-amber-600 dark:text-amber-400",
      )}
    >
      {message}
    </div>
  );
}

export function ContextBadge({ children, tone }: { children: ReactNode; tone: "good" | "warn" | "neutral" }) {
  const className =
    tone === "good"
      ? "border-emerald-500/25 bg-emerald-500/5 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10"
      : tone === "warn"
        ? "border-amber-500/25 bg-amber-500/5 text-amber-600 dark:text-amber-400 hover:bg-amber-500/10"
        : "border-border/40 bg-background/50 text-muted-foreground hover:bg-muted/20";
  return (
    <Badge
      variant="outline"
      className={cn(
        "h-5 rounded-full px-2 text-[10px] font-semibold transition-colors duration-200 backdrop-blur shadow-sm",
        className,
      )}
    >
      {children}
    </Badge>
  );
}

export function InlineLoading({ label }: { label: string }) {
  return (
    <div className="flex items-center justify-center gap-2 py-3 px-3 text-xs font-semibold text-muted-foreground/80 bg-background/20 rounded-xl border border-border/20 backdrop-blur animate-pulse shadow-sm">
      <Loader2 className="h-3.5 w-3.5 animate-spin text-primary opacity-80" />
      {label}
    </div>
  );
}

export function InlineWarning({ message }: { message: string }) {
  return (
    <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 px-3 py-2.5 text-xs text-amber-600 shadow-sm backdrop-blur dark:text-amber-400">
      {message}
    </div>
  );
}

export function EmptyState({ label }: { label: string }) {
  return (
    <StandardEmptyState
      title={label}
      compact
      dashed
      className="bg-background/20 rounded-xl border border-dashed border-border/30 px-4 py-5 shadow-sm text-xs"
    />
  );
}

export function DetailItem({
  label,
  value,
  helper,
  breakAll = false,
}: {
  label: string;
  value: string;
  helper?: string;
  breakAll?: boolean;
}) {
  return (
    <div className="group rounded-xl border border-border/30 bg-background/40 hover:bg-background/60 hover:border-primary/20 backdrop-blur px-3 py-2 transition-all duration-300 shadow-sm">
      <p className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground/80 group-hover:text-primary/70 transition-colors">
        {label}
      </p>
      <p className={cn("mt-0.5 text-xs font-semibold leading-normal text-foreground transition-colors group-hover:text-foreground/95", breakAll && "break-all")}>
        {value}
      </p>
      {helper ? (
        <p className="mt-0.5 text-[10px] leading-tight text-muted-foreground/70 transition-colors group-hover:text-muted-foreground">
          {helper}
        </p>
      ) : null}
    </div>
  );
}

export function RemoteHostStatusBadges({ host }: { host: RemoteHostEntry }) {
  const operationalMeta = getRemoteOperationalStatusMeta(host.operationalStatus);
  const productMeta = getRemoteProductStatusMeta(host.productStatus);

  return (
    <>
      <ContextBadge tone={operationalMeta.tone}>{operationalMeta.title}</ContextBadge>
      <ContextBadge tone={productMeta.tone}>{productMeta.label}</ContextBadge>
    </>
  );
}

export function getRemoteHostSummary(host: RemoteHostEntry | null) {
  if (!host) {
    return {
      value: "Sem host em destaque",
      helper: "Nenhum host em contexto para esta conversa.",
    };
  }

  const operationalMeta = getRemoteOperationalStatusMeta(host.operationalStatus);
  const productMeta = getRemoteProductStatusMeta(host.productStatus);

  return {
    value: host.name,
    helper: `${operationalMeta.title} | ${productMeta.label}`,
  };
}

export function CompanyOperationalSettingsCard({
  company,
  isActive,
}: {
  company: ContactCompanyEntry;
  isActive: boolean;
}) {
  const remoteConnections = Array.isArray(company.remoteConnections) ? company.remoteConnections : [];

  return (
    <div className={cn(
      "rounded-2xl border px-3 py-3 shadow-md backdrop-blur transition-all duration-300", 
      isActive 
        ? "border-primary/20 bg-background/55" 
        : "border-border/30 bg-background/35"
    )}>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-sm font-bold text-foreground tracking-tight">{getCompanyLabel(company)}</p>
          <p className="mt-0.5 text-xs text-muted-foreground/90">{company.razaoSocial}</p>
        </div>
        <ContextBadge tone={isActive ? "good" : "neutral"}>{isActive ? "Em contexto" : "Vinculada"}</ContextBadge>
      </div>

      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        <DetailItem label="CNPJ" value={readString(company.cnpj) || "Nao informado"} />
        <DetailItem label="Servidor" value={formatCompanyServerType(company.serverType)} helper={formatCompanyEndpoint(company)} />
        <DetailItem label="Instalacao" value={readString(company.installationDirectory) || "Nao informado"} breakAll />
        {company.serverType === "IIS" ? (
          <DetailItem label="ISAPI" value={readString(company.iisIsapiPath) || "Nao informado"} breakAll />
        ) : null}
        <DetailItem
          label="Conexoes remotas"
          value={remoteConnections.length ? `${remoteConnections.length}` : "Nenhuma"}
          helper={
            remoteConnections.length
              ? remoteConnections.map((connection) => formatRemoteConnectionType(connection.type)).join(" | ")
              : hasOperationalSettings(company)
                ? "Sem conexoes cadastradas"
                : "Configuracoes ainda nao preenchidas"
          }
        />
      </div>

      {readString(company.observacoes) ? (
        <div className="group mt-3 rounded-xl border border-border/30 bg-background/40 hover:bg-background/60 hover:border-primary/20 backdrop-blur px-3 py-2 transition-all duration-300 shadow-sm">
          <p className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground/80 group-hover:text-primary/70 transition-colors">Observacoes</p>
          <p className="mt-1 whitespace-pre-wrap text-xs font-medium text-foreground">{readString(company.observacoes)}</p>
        </div>
      ) : null}

      {remoteConnections.length > 0 ? (
        <div className="mt-3 space-y-2">
          {remoteConnections.map((connection, index) => {
            const details = readString(connection.details) || "Sem detalhes";
            return (
              <div
                key={`${company.id}-${connection.type}-${index}`}
                className="group relative flex items-center justify-between rounded-xl border border-border/30 bg-background/40 hover:bg-background/60 hover:border-primary/20 backdrop-blur px-3 py-2 transition-all duration-300 shadow-sm"
              >
                <div className="min-w-0 pr-8">
                  <p className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground/80 group-hover:text-primary/70 transition-colors">
                    {formatRemoteConnectionType(connection.type)}
                  </p>
                  <p className="mt-0.5 break-all text-xs font-semibold leading-normal text-foreground transition-colors group-hover:text-foreground/95 select-all">
                    {details}
                  </p>
                </div>
                {details !== "Sem detalhes" ? (
                  <button
                    type="button"
                    onClick={async () => {
                      try {
                        await navigator.clipboard.writeText(details);
                        toast.success(`${formatRemoteConnectionType(connection.type)} copiado!`);
                      } catch {
                        toast.error("Erro ao copiar.");
                      }
                    }}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-lg text-muted-foreground/50 hover:text-primary hover:bg-primary/5 transition-all opacity-0 group-hover:opacity-100 duration-200"
                    title="Copiar"
                  >
                    <Copy className="h-3.5 w-3.5" />
                  </button>
                ) : null}
              </div>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}

// ──────────────────────────────────────────────────────
// Pure utility functions
// ──────────────────────────────────────────────────────

export function readString(value: unknown) {
  return String(value ?? "").trim();
}

export function normalizeDigits(value: string) {
  return onlyDigits(value);
}

export function formatRelativeDate(value: string | null) {
  return formatRelativeDateShared(value, "Sem registro");
}

export function getCompanyLabel(
  company: Pick<ContactCompanyEntry, "razaoSocial" | "nomeFantasia"> | null | undefined,
) {
  return company?.nomeFantasia?.trim() || company?.razaoSocial?.trim() || "Empresa sem nome";
}

export function formatCompanyServerType(value?: ContactCompanyEntry["serverType"] | null) {
  return value === "IIS" ? "IIS / ISAPI" : value === "SYSPRO_SERVER" ? "Syspro Server" : "Nao informado";
}

export function formatCompanyEndpoint(company: ContactCompanyEntry) {
  const host = readString(company.serverHost);
  if (!host) return "Nao informado";
  const protocol = readString(company.serverProtocol).toLowerCase() || "http";
  const port = typeof company.serverPort === "number" ? `:${company.serverPort}` : "";
  return `${protocol}://${host}${port}`;
}

export function formatRemoteConnectionType(value?: string | null) {
  if (value === "DDNS_NOIP") return "DDNS / No-IP";
  if (value === "RADMIN_VPN") return "Radmin VPN";
  return "Conexao remota";
}

export function hasOperationalSettings(company: ContactCompanyEntry) {
  return Boolean(
    company.serverType ||
    company.serverHost ||
    company.installationDirectory ||
    company.iisIsapiPath ||
    (Array.isArray(company.remoteConnections) && company.remoteConnections.length > 0),
  );
}

export function pickFirstValue(...values: unknown[]) {
  for (const value of values) {
    const normalized = readString(value);
    if (normalized) return normalized;
  }
  return "";
}
