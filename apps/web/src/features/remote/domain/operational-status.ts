export type RemoteOperationalStatus =
  | "ONLINE"
  | "RECENT"
  | "OFFLINE"
  | "MISCONFIGURED"
  | "SESSION_BUSY";

type RemoteOperationalStatusInput = {
  rustdeskId: string | null;
  installToken: string | null;
  lastHeartbeatAt: string | Date | null;
  openSessionCount: number;
};

export function resolveRemoteOperationalStatus(
  input: RemoteOperationalStatusInput,
): RemoteOperationalStatus {
  if (!input.rustdeskId || !input.installToken) {
    return "MISCONFIGURED";
  }

  if (input.openSessionCount > 0) {
    return "SESSION_BUSY";
  }

  if (!input.lastHeartbeatAt) {
    return "OFFLINE";
  }

  const lastHeartbeatAt = new Date(input.lastHeartbeatAt);
  const diffMinutes = Math.floor((Date.now() - lastHeartbeatAt.getTime()) / 60000);

  if (diffMinutes <= 5) return "ONLINE";
  if (diffMinutes <= 60) return "RECENT";
  return "OFFLINE";
}

export function getRemoteOperationalStatusMeta(status: RemoteOperationalStatus) {
  if (status === "ONLINE") {
    return {
      label: "ONLINE",
      title: "Pronto para acesso",
      description: "Host com identificacao valida e heartbeat recente.",
      className: "border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
    };
  }

  if (status === "RECENT") {
    return {
      label: "RECENT",
      title: "Confirmar conectividade",
      description: "Heartbeat antigo, mas ainda com chance alta de conectividade.",
      className: "border-amber-500/20 bg-amber-500/10 text-amber-700 dark:text-amber-300",
    };
  }

  if (status === "SESSION_BUSY") {
    return {
      label: "SESSION_BUSY",
      title: "Em atendimento",
      description: "Ja existe sessao ativa ou solicitada para este host.",
      className: "border-sky-500/20 bg-sky-500/10 text-sky-700 dark:text-sky-300",
    };
  }

  if (status === "MISCONFIGURED") {
    return {
      label: "MISCONFIGURED",
      title: "Configuracao pendente",
      description: "Falta RustDesk ID ou token de instalacao para operacao segura.",
      className: "border-rose-500/20 bg-rose-500/10 text-rose-700 dark:text-rose-300",
    };
  }

  return {
    label: "OFFLINE",
    title: "Sem heartbeat",
    description: "Sem atividade recente do agente no portal.",
    className: "border-zinc-500/20 bg-zinc-500/10 text-zinc-700 dark:text-zinc-300",
  };
}
