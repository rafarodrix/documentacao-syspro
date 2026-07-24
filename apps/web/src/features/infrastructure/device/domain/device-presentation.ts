import type { RemotePlatformDirectory } from "@/features/remote/domain/remote-host.types";

export type HeartbeatBucket = "recent" | "stale" | "missing" | "never";

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

export function formatRustDeskDisplay(value: string | null | undefined): string {
  const compact = value?.replace(/\s+/g, "").trim() ?? "";
  if (!compact) return "—";
  if (compact.length === 9) {
    return `${compact.slice(0, 3)} ${compact.slice(3, 6)} ${compact.slice(6, 9)}`;
  }
  return compact.replace(/(\d{3})(?=\d)/g, "$1 ").trim();
}

function formatHeartbeatRelative(value: string | null, referenceNow: number): string | null {
  if (!value) return null;
  const diffMin = Math.floor((referenceNow - new Date(value).getTime()) / 60000);
  if (diffMin < 1) return "agora";
  if (diffMin < 60) return `há ${diffMin}min`;
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) return `há ${diffH}h`;
  return `há ${Math.floor(diffH / 24)}d`;
}

export function buildPendingIdentitySubtitle(
  item: Pick<
    RemotePlatformDirectory["pendingItems"][number],
    "rustdeskId" | "agentVersion" | "lastHeartbeatAt"
  >,
): string {
  const parts = [
    item.rustdeskId ? `ID ${formatRustDeskDisplay(item.rustdeskId)}` : null,
    item.agentVersion ? `agente ${item.agentVersion}` : null,
    item.lastHeartbeatAt ? formatHeartbeatRelative(item.lastHeartbeatAt, Date.now()) : null,
  ].filter(Boolean);
  return parts.join(" · ") || "Sem telemetria recente";
}
