import { z } from "zod";

export const agentRegisterPayloadSchema = z.object({
  deviceId: z.string().trim().min(1),
  hostname: z.string().trim().min(1),
  os: z.string().trim().min(1),
  identitySource: z.string().trim().min(1),
  agentVersion: z.string().trim().min(1),
});

export const agentRegisterResultSchema = z.object({
  registered: z.boolean(),
  receivedAt: z.string().trim().min(1),
  deviceId: z.string().trim().min(1),
});

export type AgentRegisterPayload = z.infer<typeof agentRegisterPayloadSchema>;
export type AgentRegisterResult = z.infer<typeof agentRegisterResultSchema>;
