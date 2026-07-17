import { z } from "zod";

const remoteLinkContextSchema = z.object({
  remoteHostId: z.string().trim().min(1).optional(),
  companyId: z.string().trim().min(1).optional(),
  rustdeskId: z.string().trim().min(1).optional(),
});

export const agentRegisterPayloadSchema = z.object({
  deviceId: z.string().trim().min(1),
  agentInstanceId: z.string().trim().min(1),
  credentialId: z.string().trim().min(1),
  hostname: z.string().trim().min(1),
  os: z.string().trim().min(1),
  identitySource: z.string().trim().min(1),
  agentVersion: z.string().trim().min(1),
  remoteLinkContext: remoteLinkContextSchema.optional(),
});

export const agentRegisterResultSchema = z.object({
  registered: z.boolean(),
  receivedAt: z.string().trim().min(1),
  deviceId: z.string().trim().min(1),
  agentInstanceId: z.string().trim().min(1),
});

export type AgentRegisterPayload = z.infer<typeof agentRegisterPayloadSchema>;
export type AgentRegisterResult = z.infer<typeof agentRegisterResultSchema>;
