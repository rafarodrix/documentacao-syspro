import { z } from "zod";

export const agentHeartbeatPayloadSchema = z.object({
  deviceId: z.string().trim().min(1),
  agentVersion: z.string().trim().min(1),
  at: z.union([z.string().trim().min(1), z.date()]),
});

export const agentHeartbeatResultSchema = z.object({
  received: z.boolean(),
  receivedAt: z.string().trim().min(1),
  deviceId: z.string().trim().min(1),
});

export type AgentHeartbeatPayload = z.infer<typeof agentHeartbeatPayloadSchema>;
export type AgentHeartbeatResult = z.infer<typeof agentHeartbeatResultSchema>;
