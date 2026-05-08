"use client";

import type { ReactNode } from "react";
import { Badge } from "@dosc-syspro/ui";
import { Loader2 } from "lucide-react";
import { getRemoteOperationalStatusMeta, getRemoteProductStatusMeta } from "@/features/remote/domain";
import { cn } from "@/lib/utils";
import type { ContactCompanyEntry, RemoteHostEntry } from "./chatwoot-dashboard-types";

export function InlineNotice({ tone, message }: { tone: "success" | "error"; message: string }) {
  return (
    <div
      className={cn(
        "rounded-xl border px-3 py-2.5 text-sm shadow-sm",
        tone === "success"
          ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
          : "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300",
      )}
    >
      {message}
    </div>
  );
}

export function ContextBadge({ children, tone }: { children: ReactNode; tone: "good" | "warn" | "neutral" }) {
  const className =
    tone === "good"
      ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
      : tone === "warn"
        ? "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300"
        : "border-border/60 bg-background text-muted-foreground";
  return <Badge variant="outline" className={cn("h-6 rounded-full px-2.5 text-[11px] font-medium", className)}>{children}</Badge>;
}

export function InlineLoading({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-2 text-sm text-muted-foreground">
      <Loader2 className="h-4 w-4 animate-spin" />
      {label}
    </div>
  );
}

export function InlineWarning({ message }: { message: string }) {
  return (
    <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2.5 text-sm text-amber-700 shadow-sm dark:text-amber-300">
      {message}
    </div>
  );
}

export function EmptyState({ label }: { label: string }) {
  return (
    <div className="rounded-xl border border-dashed border-border/60 bg-muted/20 px-4 py-6 text-center text-sm text-muted-foreground">
      {label}
    </div>
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
    <div className="rounded-xl border border-border/60 bg-background px-3 py-2.5">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className={cn("mt-1 text-sm font-medium text-foreground", breakAll && "break-all")}>{value}</p>
      {helper ? <p className="mt-1 text-xs text-muted-foreground">{helper}</p> : null}
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

export function GuidedStep({ index, title, description }: { index: number; title: string; description: string }) {
  return (
    <div className="rounded-2xl border border-border/60 bg-card p-3 shadow-sm">
      <div className="flex items-center gap-2">
        <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-primary/10 text-[11px] font-bold text-primary">
          {index}
        </span>
        <p className="text-sm font-semibold text-foreground">{title}</p>
      </div>
      <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{description}</p>
    </div>
  );
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
    <div className={cn("rounded-lg border px-3 py-3", isActive ? "border-primary/20 bg-primary/5" : "border-border/60 bg-card")}>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-foreground">{getCompanyLabel(company)}</p>
          <p className="mt-1 text-xs text-muted-foreground">{company.razaoSocial}</p>
        </div>
        <Badge variant="outline">{isActive ? "Em contexto" : "Vinculada"}</Badge>
      </div>

      <div className="mt-3 grid gap-3 sm:grid-cols-2">
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
        <div className="mt-3 rounded-md border border-border/60 bg-background px-3 py-2">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Observacoes</p>
          <p className="mt-1 whitespace-pre-wrap text-sm text-foreground">{readString(company.observacoes)}</p>
        </div>
      ) : null}

      {remoteConnections.length > 0 ? (
        <div className="mt-3 space-y-2">
          {remoteConnections.map((connection, index) => (
            <div key={`${company.id}-${connection.type}-${index}`} className="rounded-md border border-border/60 bg-background px-3 py-2">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                {formatRemoteConnectionType(connection.type)}
              </p>
              <p className="mt-1 break-all text-sm text-foreground">{readString(connection.details) || "Sem detalhes"}</p>
            </div>
          ))}
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
  return value.replace(/\D/g, "");
}

export function formatRelativeDate(value: string | null) {
  if (!value) return "Sem registro";
  const parsed = Date.parse(value);
  if (!Number.isFinite(parsed)) return value;
  return new Date(parsed).toLocaleString("pt-BR");
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
