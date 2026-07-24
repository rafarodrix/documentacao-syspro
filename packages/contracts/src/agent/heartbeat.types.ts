import { z } from "zod";

const remoteLinkContextSchema = z.object({
  remoteHostId: z.string().trim().min(1).optional(),
  companyId: z.string().trim().min(1).optional(),
  rustdeskId: z.string().trim().min(1).optional(),
});

export const agentHeartbeatPayloadSchema = z.object({
  deviceId: z.string().trim().min(1),
  agentInstanceId: z.string().trim().min(1),
  credentialId: z.string().trim().min(1),
  agentVersion: z.string().trim().min(1),
  at: z.union([z.string().trim().min(1), z.date()]),
  remoteLinkContext: remoteLinkContextSchema.optional(),
});

export const agentHeartbeatResultSchema = z.object({
  received: z.boolean(),
  receivedAt: z.string().trim().min(1),
  deviceId: z.string().trim().min(1),
  agentInstanceId: z.string().trim().min(1),
  /** Emitido uma vez para migrar instalações legadas sem token. */
  installationToken: z.string().trim().min(1).optional(),
});

export type AgentHeartbeatPayload = z.infer<typeof agentHeartbeatPayloadSchema>;
export type AgentHeartbeatResult = z.infer<typeof agentHeartbeatResultSchema>;
