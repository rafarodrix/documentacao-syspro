import { z } from "zod";
import type { RemoteMachineProfile } from "../remote/remote-admin.types";

/**
 * Perfis de coleta do agente Windows (RMM Syspro).
 * Derivados da função do host no portal (`machineProfile`) ou do estado de vínculo.
 */
export const agentCollectionProfileSchema = z.enum([
  "server_syspro",
  "workstation",
  "terminal",
  "backup_node",
  "unlinked",
]);

export type AgentCollectionProfile = z.infer<typeof agentCollectionProfileSchema>;

export const agentCollectorIdSchema = z.enum([
  "metrics",
  "critical_services",
  "disks",
  "network",
  "system",
  "software",
  "hardware",
  "windows_update",
  "all_services",
  "syspro_versions",
  "critical_events",
  "syspro_runtime_probes",
]);

export type AgentCollectorId = z.infer<typeof agentCollectorIdSchema>;

export const agentCollectorPolicySchema = z.object({
  enabled: z.boolean(),
  /** Intervalo alvo em segundos. Omitido = usar default do runtime do agente. */
  interval_seconds: z.number().int().positive().optional(),
});

export type AgentCollectorPolicy = z.infer<typeof agentCollectorPolicySchema>;

export const agentCollectorsPolicySchema = z.object({
  metrics: agentCollectorPolicySchema,
  critical_services: agentCollectorPolicySchema,
  disks: agentCollectorPolicySchema,
  network: agentCollectorPolicySchema,
  system: agentCollectorPolicySchema,
  software: agentCollectorPolicySchema,
  hardware: agentCollectorPolicySchema,
  windows_update: agentCollectorPolicySchema,
  all_services: agentCollectorPolicySchema,
  syspro_versions: agentCollectorPolicySchema,
  critical_events: agentCollectorPolicySchema,
  syspro_runtime_probes: agentCollectorPolicySchema,
});

export type AgentCollectorsPolicy = z.infer<typeof agentCollectorsPolicySchema>;

type CollectorDefaults = Record<AgentCollectorId, AgentCollectorPolicy>;

const seconds = {
  minute: 60,
  minutes: (n: number) => n * 60,
  hour: 60 * 60,
  hours: (n: number) => n * 60 * 60,
  day: 24 * 60 * 60,
} as const;

/** Defaults alinhados a politica-coleta.mdx — servidor Syspro (RMM completo). */
const SERVER_SYSPRO_COLLECTORS: CollectorDefaults = {
  metrics: { enabled: true, interval_seconds: seconds.minute },
  critical_services: { enabled: true, interval_seconds: seconds.minutes(2) },
  disks: { enabled: true, interval_seconds: seconds.minutes(5) },
  network: { enabled: true, interval_seconds: seconds.minutes(15) },
  system: { enabled: true, interval_seconds: seconds.hours(12) },
  software: { enabled: true, interval_seconds: seconds.day },
  hardware: { enabled: true, interval_seconds: seconds.day },
  windows_update: { enabled: true, interval_seconds: seconds.hours(6) },
  all_services: { enabled: true, interval_seconds: seconds.hours(12) },
  syspro_versions: { enabled: true, interval_seconds: seconds.day },
  critical_events: { enabled: true },
  syspro_runtime_probes: { enabled: true, interval_seconds: seconds.minutes(5) },
};

/** Estação / cliente Syspro — inventário leve, sem varredura cara de SCM completo. */
const WORKSTATION_COLLECTORS: CollectorDefaults = {
  metrics: { enabled: true, interval_seconds: seconds.minutes(5) },
  critical_services: { enabled: true, interval_seconds: seconds.minutes(5) },
  disks: { enabled: true, interval_seconds: seconds.minutes(10) },
  network: { enabled: true, interval_seconds: seconds.hours(6) },
  system: { enabled: true, interval_seconds: seconds.day },
  software: { enabled: true, interval_seconds: seconds.day },
  hardware: { enabled: true, interval_seconds: seconds.day },
  windows_update: { enabled: true, interval_seconds: seconds.hours(12) },
  all_services: { enabled: false },
  syspro_versions: { enabled: true, interval_seconds: seconds.day },
  critical_events: { enabled: true },
  syspro_runtime_probes: { enabled: false },
};

/** Terminal — ainda mais leve; foco em presença, disco e RustDesk/Syspro client. */
const TERMINAL_COLLECTORS: CollectorDefaults = {
  metrics: { enabled: true, interval_seconds: seconds.minutes(5) },
  critical_services: { enabled: true, interval_seconds: seconds.minutes(10) },
  disks: { enabled: true, interval_seconds: seconds.minutes(15) },
  network: { enabled: true, interval_seconds: seconds.day },
  system: { enabled: true, interval_seconds: seconds.day },
  software: { enabled: false },
  hardware: { enabled: true, interval_seconds: seconds.day },
  windows_update: { enabled: true, interval_seconds: seconds.day },
  all_services: { enabled: false },
  syspro_versions: { enabled: true, interval_seconds: seconds.day },
  critical_events: { enabled: false },
  syspro_runtime_probes: { enabled: false },
};

/** Nó de backup — operacional + discos; inventário software opcional. */
const BACKUP_NODE_COLLECTORS: CollectorDefaults = {
  metrics: { enabled: true, interval_seconds: seconds.minutes(2) },
  critical_services: { enabled: true, interval_seconds: seconds.minutes(2) },
  disks: { enabled: true, interval_seconds: seconds.minutes(3) },
  network: { enabled: true, interval_seconds: seconds.minutes(30) },
  system: { enabled: true, interval_seconds: seconds.hours(12) },
  software: { enabled: true, interval_seconds: seconds.day },
  hardware: { enabled: true, interval_seconds: seconds.day },
  windows_update: { enabled: true, interval_seconds: seconds.hours(6) },
  all_services: { enabled: true, interval_seconds: seconds.hours(12) },
  syspro_versions: { enabled: false },
  critical_events: { enabled: true },
  syspro_runtime_probes: { enabled: false },
};

/**
 * Não vinculado — heartbeat + inventário mínimo de onboarding.
 * Sem descoberta profunda Syspro, Event Log ou SCM completo.
 */
const UNLINKED_COLLECTORS: CollectorDefaults = {
  metrics: { enabled: true, interval_seconds: seconds.minutes(5) },
  critical_services: { enabled: true, interval_seconds: seconds.minutes(5) },
  disks: { enabled: true, interval_seconds: seconds.minutes(15) },
  network: { enabled: true, interval_seconds: seconds.day },
  system: { enabled: true, interval_seconds: seconds.day },
  software: { enabled: false },
  hardware: { enabled: true, interval_seconds: seconds.day },
  windows_update: { enabled: false },
  all_services: { enabled: false },
  syspro_versions: { enabled: false },
  critical_events: { enabled: false },
  syspro_runtime_probes: { enabled: false },
};

const PROFILE_COLLECTORS: Record<AgentCollectionProfile, CollectorDefaults> = {
  server_syspro: SERVER_SYSPRO_COLLECTORS,
  workstation: WORKSTATION_COLLECTORS,
  terminal: TERMINAL_COLLECTORS,
  backup_node: BACKUP_NODE_COLLECTORS,
  unlinked: UNLINKED_COLLECTORS,
};

export const AGENT_COLLECTION_PROFILE_LABEL: Record<AgentCollectionProfile, string> = {
  server_syspro: "Servidor Syspro",
  workstation: "Estação",
  terminal: "Terminal",
  backup_node: "Nó de backup",
  unlinked: "Não vinculado",
};

export function mapMachineProfileToCollectionProfile(
  machineProfile: RemoteMachineProfile | null | undefined,
  linked: boolean,
): AgentCollectionProfile {
  if (!linked) return "unlinked";
  switch (machineProfile) {
    case "SERVER":
      return "server_syspro";
    case "TERMINAL":
      return "terminal";
    case "BACKUP_NODE":
      return "backup_node";
    case "WORKSTATION":
      return "workstation";
    default:
      // Sem função no portal: default seguro (leve). Admin marca SERVER para RMM completo.
      return "workstation";
  }
}

export function getCollectorsPolicyForProfile(
  profile: AgentCollectionProfile,
): AgentCollectorsPolicy {
  return { ...PROFILE_COLLECTORS[profile] };
}

export function resolveDeviceCollectionDesiredState(input: {
  linked: boolean;
  machineProfile?: RemoteMachineProfile | null;
}): {
  collection_profile: AgentCollectionProfile;
  collect_inventory: boolean;
  collect_metrics: boolean;
  collectors: AgentCollectorsPolicy;
} {
  const collection_profile = mapMachineProfileToCollectionProfile(
    input.machineProfile,
    input.linked,
  );
  const collectors = getCollectorsPolicyForProfile(collection_profile);
  const collect_metrics = collectors.metrics.enabled || collectors.critical_services.enabled;
  const collect_inventory =
    collectors.system.enabled ||
    collectors.network.enabled ||
    collectors.software.enabled ||
    collectors.hardware.enabled ||
    collectors.disks.enabled ||
    collectors.windows_update.enabled ||
    collectors.all_services.enabled ||
    collectors.syspro_versions.enabled;

  return {
    collection_profile,
    collect_inventory,
    collect_metrics,
    collectors,
  };
}
