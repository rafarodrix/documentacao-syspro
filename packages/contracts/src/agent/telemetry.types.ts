import { z } from "zod";

export const AGENT_TELEMETRY_SCHEMA_VERSION = "agent.telemetry.v1" as const;

export const agentTelemetryPayloadSchema = z.object({
  schemaVersion: z.literal(AGENT_TELEMETRY_SCHEMA_VERSION).default(AGENT_TELEMETRY_SCHEMA_VERSION),
  deviceId: z.string().trim().min(1),
  agentInstanceId: z.string().trim().min(1),
  credentialId: z.string().trim().min(1),
  agentVersion: z.string().trim().min(1).optional(),
  collectedAt: z.string().datetime().optional(),
  systemSnapshot: z.unknown().optional(),
  networkSnapshot: z.unknown().optional(),
  softwareSnapshot: z.unknown().optional(),
  hardwareIdentity: z.unknown().optional(),
  diskSnapshot: z.unknown().optional(),
  sysproProcesses: z.unknown().optional(),
  sysproVersions: z.unknown().optional(),
  sysproRuntimeProbes: z.unknown().optional(),
  windowsUpdateStatus: z.unknown().optional(),
  allServicesSnapshot: z.unknown().optional(),
  rebootPending: z.unknown().optional(),
  agentMetrics: z.unknown().optional(),
  criticalEvents: z.unknown().optional(),
});

export const agentTelemetryResultSchema = z.object({
  accepted: z.boolean(),
  receivedAt: z.string().trim().min(1),
  deviceId: z.string().trim().min(1),
  remoteHostId: z.string().trim().min(1).nullable(),
  publishedCollectors: z.array(z.string()),
});

export type AgentTelemetryPayload = z.infer<typeof agentTelemetryPayloadSchema>;
export type AgentTelemetryResult = z.infer<typeof agentTelemetryResultSchema>;
