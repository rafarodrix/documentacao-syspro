import { normalizeSearchText } from "@dosc-syspro/shared";
import { getRemoteProductStatusMeta } from "@/features/remote/domain";
import type { RemotePlatformDirectory } from "@/features/remote/domain/remote-host.types";

export type DirectoryItem = RemotePlatformDirectory["items"][number];

export type HeartbeatBucket = "recent" | "stale" | "missing" | "never";

export type UnifiedHealthMeta = {
  label: string;
  detail: string;
  className: string;
  dotClass: string;
};

export function getHeartbeatMetaAt(lastHeartbeatAt: string | null, referenceNow: number | null) {
  if (!lastHeartbeatAt) {
    return {
      label: "Nunca conectado",
      shortLabel: "Sem dados",
      className: "border-border/60 bg-muted/30 text-muted-foreground",
      dotClass: "bg-muted shadow-[0_0_0_4px_rgba(156,163,175,0.12)]",
      bucket: "never" as const satisfies HeartbeatBucket,
    };
  }

  if (referenceNow == null) {
    return {
      label: "Contato recente",
      shortLabel: "Online",
      className: "border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
      dotClass: "animate-pulse bg-emerald-500 shadow-[0_0_0_4px_rgba(16,185,129,0.12)]",
      bucket: "recent" as const satisfies HeartbeatBucket,
    };
  }

  const diffMinutes = Math.floor((referenceNow - new Date(lastHeartbeatAt).getTime()) / 60000);
  if (diffMinutes <= 5) {
    return {
      label: "Contato recente",
      shortLabel: "Online",
      className: "border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
      dotClass: "animate-pulse bg-emerald-500 shadow-[0_0_0_4px_rgba(16,185,129,0.12)]",
      bucket: "recent" as const satisfies HeartbeatBucket,
    };
  }

  if (diffMinutes <= 30) {
    return {
      label: "Comunicação atrasada",
      shortLabel: "Atrasado",
      className: "border-amber-500/20 bg-amber-500/10 text-amber-700 dark:text-amber-300",
      dotClass: "bg-amber-500 shadow-[0_0_0_4px_rgba(245,158,11,0.12)]",
      bucket: "stale" as const satisfies HeartbeatBucket,
    };
  }

  return {
    label: "Offline",
    shortLabel: "Offline",
    className: "border-red-500/20 bg-red-500/10 text-red-700 dark:text-red-300",
    dotClass: "bg-red-500 shadow-[0_0_0_4px_rgba(239,68,68,0.12)]",
    bucket: "missing" as const satisfies HeartbeatBucket,
  };
}

export function formatHeartbeatRelative(
  value: string | null,
  hasHydrated: boolean,
  referenceNow: number | null,
): string | null {
  if (!value || !hasHydrated || referenceNow == null) return null;
  const diffMin = Math.floor((referenceNow - new Date(value).getTime()) / 60000);
  if (diffMin < 1) return "agora";
  if (diffMin < 60) return `há ${diffMin}min`;
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) return `há ${diffH}h`;
  return `há ${Math.floor(diffH / 24)}d`;
}

export function formatRustDeskDisplay(value: string | null | undefined): string {
  const compact = value?.replace(/\s+/g, "").trim() ?? "";
  if (!compact) return "—";
  if (compact.length === 9) {
    return `${compact.slice(0, 3)} ${compact.slice(3, 6)} ${compact.slice(6, 9)}`;
  }
  return compact.replace(/(\d{3})(?=\d)/g, "$1 ").trim();
}

export function buildHostIdentitySubtitle(item: DirectoryItem): string {
  const parts = [item.agent.machineName?.trim(), item.agent.lastKnownIp?.trim()].filter(Boolean);
  if (parts.length > 0) return parts.join(" · ");
  if (item.agent.rustdeskId?.trim()) return `ID ${formatRustDeskDisplay(item.agent.rustdeskId)}`;
  return "Identidade pendente";
}

function collectHealthSignals(item: DirectoryItem): string[] {
  const signals: string[] = [];
  if (item.inventorySignals.rebootPending) signals.push("Reboot pendente");
  if (item.inventorySignals.diskLow) signals.push("Disco baixo");
  if (item.inventorySignals.sysproProcessDown) signals.push("Syspro parado");
  if (item.contractErrorCode) signals.push(`Contrato ${item.contractErrorCode}`);
  return signals;
}

function formatContactDetail(
  lastHeartbeatAt: string | null,
  hasHydrated: boolean,
  referenceNow: number | null,
): string {
  return formatHeartbeatRelative(lastHeartbeatAt, hasHydrated, referenceNow) ?? "sem contato recente";
}

export function buildUnifiedHealthMeta(
  item: DirectoryItem,
  referenceNow: number | null,
  hasHydrated: boolean,
): UnifiedHealthMeta {
  const heartbeat = getHeartbeatMetaAt(item.agent.lastHeartbeatAt, referenceNow);
  const product = getRemoteProductStatusMeta(item.productStatus);
  const signals = collectHealthSignals(item);
  const contactDetail = formatContactDetail(item.agent.lastHeartbeatAt, hasHydrated, referenceNow);

  if (item.productStatus === "IN_SERVICE") {
    return {
      label: "Em atendimento",
      detail: "Serviço em execução",
      className: "border-indigo-500/20 bg-indigo-500/10 text-indigo-700 dark:text-indigo-300",
      dotClass: "bg-indigo-500 shadow-[0_0_0_4px_rgba(99,102,241,0.12)]",
    };
  }

  if (item.productStatus === "PROVISIONING_REMOTE" || item.productStatus === "AWAITING_LINK") {
    return {
      label: "Sem avaliação",
      detail: "Dispositivo em configuração",
      className: "border-border/60 bg-muted/30 text-muted-foreground",
      dotClass: "bg-muted shadow-[0_0_0_4px_rgba(156,163,175,0.12)]",
    };
  }

  if (item.productStatus === "ATTENTION_REQUIRED" || signals.length > 0) {
    return {
      label: "Atenção",
      detail: signals[0] ?? "Verificar capacidades",
      className: "border-amber-500/20 bg-amber-500/10 text-amber-700 dark:text-amber-400",
      dotClass: "bg-amber-500 shadow-[0_0_0_4px_rgba(245,158,11,0.12)]",
    };
  }

  return {
    label: "Saudável",
    detail: "Todos os serviços operacionais",
    className: "border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
    dotClass: "bg-emerald-500 shadow-[0_0_0_4px_rgba(16,185,129,0.12)]",
  };
}

export function getPrimaryCompanyLabel(item: DirectoryItem): string {
  const installationNames = item.installationCompanies.length
    ? item.installationCompanies
    : item.companyName
      ? [item.companyName]
      : [];
  return installationNames[0] ?? "—";
}

export function getExtraCompanyCount(item: DirectoryItem): number {
  const installationNames = item.installationCompanies.length
    ? item.installationCompanies
    : item.companyName
      ? [item.companyName]
      : [];
  return Math.max(0, installationNames.length - 1);
}

export function buildPendingIdentitySubtitle(item: RemotePlatformDirectory["pendingItems"][number]): string {
  const parts = [
    item.rustdeskId ? `ID ${formatRustDeskDisplay(item.rustdeskId)}` : null,
    item.agentVersion ? `agente ${item.agentVersion}` : null,
    item.lastHeartbeatAt ? formatHeartbeatRelative(item.lastHeartbeatAt, true, Date.now()) : null,
  ].filter(Boolean);
  return parts.join(" · ") || "Sem telemetria recente";
}

export function buildPendingTooltip(item: RemotePlatformDirectory["pendingItems"][number]): string {
  if (item.installationCompanies.length) {
    return `Instalações: ${item.installationCompanies.join(" | ")}`;
  }
  return "Nenhuma instalação Syspro detectada no último heartbeat.";
}

export function matchesPendingCompanyFilter(
  item: RemotePlatformDirectory["pendingItems"][number],
  companyFilter: string,
): boolean {
  if (companyFilter === "all") return true;
  return item.suggestedCompanyId == null || item.suggestedCompanyId === companyFilter;
}
