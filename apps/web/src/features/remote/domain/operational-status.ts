import type { RemoteOperationalStatus, RemoteProductStatus } from "@dosc-syspro/contracts/remote";
export { resolveRemoteOperationalStatus } from "@dosc-syspro/shared/remote-operational-status";
export type { RemoteOperationalStatusInput } from "@dosc-syspro/shared/remote-operational-status";

export type RemoteStatusTone = "good" | "warn" | "neutral";

export type RemoteOperationalStatusMeta = {
  label: string;
  title: string;
  description: string;
  className: string;
  tone: RemoteStatusTone;
  displayPriority: number;
};

export type RemoteProductStatusMeta = {
  label: string;
  description: string;
  className: string;
  tone: RemoteStatusTone;
  displayPriority: number;
};

export function getRemoteOperationalStatusMeta(status: RemoteOperationalStatus): RemoteOperationalStatusMeta {
  if (status === "ONLINE") {
    return {
      label: "ONLINE",
      title: "Pronto para acesso",
      description: "Host com identificacao valida e heartbeat recente.",
      className: "border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
      tone: "good",
      displayPriority: 10,
    };
  }

  if (status === "RECENT") {
    return {
      label: "RECENT",
      title: "Confirmar conectividade",
      description: "Heartbeat antigo, mas ainda com chance alta de conectividade.",
      className: "border-amber-500/20 bg-amber-500/10 text-amber-700 dark:text-amber-300",
      tone: "warn",
      displayPriority: 30,
    };
  }

  if (status === "SESSION_BUSY") {
    return {
      label: "SESSION_BUSY",
      title: "Em atendimento",
      description: "Ja existe sessao ativa ou solicitada para este host.",
      className: "border-sky-500/20 bg-sky-500/10 text-sky-700 dark:text-sky-300",
      tone: "warn",
      displayPriority: 20,
    };
  }

  if (status === "MISCONFIGURED") {
    return {
      label: "MISCONFIGURED",
      title: "Configuracao pendente",
      description: "A convergencia tecnica do modulo remoto ainda nao foi concluida.",
      className: "border-rose-500/20 bg-rose-500/10 text-rose-700 dark:text-rose-300",
      tone: "warn",
      displayPriority: 40,
    };
  }

  return {
    label: "OFFLINE",
    title: "Sem heartbeat",
    description: "Sem atividade recente do agente no portal.",
    className: "border-zinc-500/20 bg-zinc-500/10 text-zinc-700 dark:text-zinc-300",
    tone: "neutral",
    displayPriority: 50,
  };
}

export function getRemoteProductStatusMeta(status: RemoteProductStatus): RemoteProductStatusMeta {
  if (status === "AWAITING_LINK") {
    return {
      label: "Aguardando vinculo",
      description: "A maquina ja foi descoberta. Depois do vinculo, o agente instala o RustDesk se faltar ou reaproveita a instalacao existente aplicando a configuracao do portal.",
      className: "border-amber-500/20 bg-amber-500/10 text-amber-700 dark:text-amber-300",
      tone: "neutral",
      displayPriority: 20,
    };
  }

  if (status === "PROVISIONING_REMOTE") {
    return {
      label: "Provisionando remoto",
      description: "O agente ja recebeu o vinculo e agora esta executando bootstrap e convergencia do remoto. Se o RustDesk ja existir no host, a instalacao atual sera reaproveitada e reconfigurada.",
      className: "border-sky-500/20 bg-sky-500/10 text-sky-700 dark:text-sky-300",
      tone: "neutral",
      displayPriority: 30,
    };
  }

  if (status === "REMOTE_READY") {
    return {
      label: "Remoto pronto",
      description: "A maquina esta convergida e pronta para uso operacional.",
      className: "border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
      tone: "good",
      displayPriority: 10,
    };
  }

  if (status === "IN_SERVICE") {
    return {
      label: "Em atendimento",
      description: "Existe sessao ativa ou solicitada para este host.",
      className: "border-indigo-500/20 bg-indigo-500/10 text-indigo-700 dark:text-indigo-300",
      tone: "warn",
      displayPriority: 40,
    };
  }

  return {
    label: "Atencao necessaria",
    description: "O agente precisa de intervencao ou confirmou degradacao operacional.",
    className: "border-rose-500/20 bg-rose-500/10 text-rose-700 dark:text-rose-300",
    tone: "warn",
    displayPriority: 50,
  };
}
