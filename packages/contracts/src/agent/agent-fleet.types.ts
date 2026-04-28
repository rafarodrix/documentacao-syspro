import { z } from "zod";

export const agentDeviceSummarySchema = z.object({
  id: z.string().min(1),
  deviceId: z.string().min(1),
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

export const agentDeviceListQuerySchema = z.object({
  page: z.number().int().min(1).default(1),
  pageSize: z.number().int().min(1).max(200).default(50),
  search: z.string().trim().optional(),
  status: z.enum(["all", "online", "offline"]).default("all"),
  companyId: z.string().trim().optional(),
  remoteHostId: z.string().trim().optional(),
});

export const agentDeviceListResultSchema = z.object({
  items: z.array(agentDeviceSummarySchema),
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

export type AgentDeviceSummary = z.infer<typeof agentDeviceSummarySchema>;
export type AgentDeviceListQuery = z.infer<typeof agentDeviceListQuerySchema>;
export type AgentDeviceListResult = z.infer<typeof agentDeviceListResultSchema>;
export type AgentFleetStats = z.infer<typeof agentFleetStatsSchema>;
