import { z } from "zod";

export const agentInstallationSummarySchema = z.object({
  id: z.string().min(1),
  deviceId: z.string().min(1),
  agentInstanceId: z.string().nullable(),
  credentialId: z.string().nullable(),
  hostname: z.string().nullable(),
  os: z.string().nullable(),
  identitySource: z.string().nullable(),
  agentVersion: z.string().nullable(),
  companyId: z.string().nullable(),
  companyName: z.string().nullable(),
  remoteHostId: z.string().nullable(),
  remoteHostName: z.string().nullable(),
  firstSeenAt: z.string().min(1),
  lastHeartbeatAt: z.string().nullable(),
  lastRegisteredAt: z.string().nullable(),
  isOnline: z.boolean(),
  heartbeatLagSeconds: z.number().nullable(),
});

export const agentInstallationListQuerySchema = z.object({
  page: z.number().int().min(1).default(1),
  pageSize: z.number().int().min(1).max(200).default(50),
  search: z.string().trim().optional(),
  status: z.enum(["all", "online", "offline"]).default("all"),
  companyId: z.string().trim().optional(),
  remoteHostId: z.string().trim().optional(),
});

export const agentInstallationListResultSchema = z.object({
  items: z.array(agentInstallationSummarySchema),
  pagination: z.object({
    page: z.number().int().min(1),
    pageSize: z.number().int().min(1),
    total: z.number().int().min(0),
    totalPages: z.number().int().min(0),
  }),
});

export const agentFleetStatsSchema = z.object({
  total: z.number().int().min(0),
  online: z.number().int().min(0),
  offline: z.number().int().min(0),
  unseen: z.number().int().min(0),
  withCompany: z.number().int().min(0),
  withoutCompany: z.number().int().min(0),
  onlineThresholdSeconds: z.number().int().min(1),
});

export const agentInstallationPatchSchema = z.object({
  remoteHostId: z.string().nullable(),
});

export const agentHostOptionSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  companyId: z.string().min(1),
  companyName: z.string().nullable(),
  status: z.enum(["ACTIVE", "INACTIVE", "MAINTENANCE"]),
  linkedDeviceId: z.string().nullable(),
  linkedDeviceHostname: z.string().nullable(),
});

export const agentHostOptionListSchema = z.array(agentHostOptionSchema);

export type AgentInstallationSummary = z.infer<typeof agentInstallationSummarySchema>;
export type AgentInstallationListQuery = z.infer<typeof agentInstallationListQuerySchema>;
export type AgentInstallationListResult = z.infer<typeof agentInstallationListResultSchema>;
export type AgentFleetStats = z.infer<typeof agentFleetStatsSchema>;
export type AgentInstallationPatch = z.infer<typeof agentInstallationPatchSchema>;
export type AgentHostOption = z.infer<typeof agentHostOptionSchema>;
