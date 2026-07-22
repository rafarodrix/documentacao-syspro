import { z } from "zod";

export const deviceLifecycleStatusSchema = z.enum([
  "MANAGED",
  "AWAITING_LINK",
  "DISCOVERED",
  "ARCHIVED",
]);
export type DeviceLifecycleStatus = z.infer<typeof deviceLifecycleStatusSchema>;

export const deviceConnectivityStatusSchema = z.enum([
  "ONLINE",
  "STALE",
  "OFFLINE",
  "MISSING",
]);
export type DeviceConnectivityStatus = z.infer<typeof deviceConnectivityStatusSchema>;

export const deviceHealthStatusSchema = z.enum([
  "HEALTHY",
  "WARNING",
  "CRITICAL",
  "UNEVALUATED",
]);
export type DeviceHealthStatus = z.infer<typeof deviceHealthStatusSchema>;

export const deviceCapabilitySchema = z.enum([
  "AGENT",
  "REMOTE",
  "ERP",
  "BACKUP",
  "TUNNEL",
]);
export type DeviceCapability = z.infer<typeof deviceCapabilitySchema>;

export const deviceListQuerySchema = z.object({
  query: z.string().optional(),
  lifecycle: z.enum(["MANAGED", "AWAITING_LINK", "DISCOVERED", "ARCHIVED", "ALL"]).default("MANAGED"),
  connectivity: z.enum(["ONLINE", "STALE", "OFFLINE", "MISSING", "ALL"]).default("ALL"),
  health: z.enum(["HEALTHY", "WARNING", "CRITICAL", "UNEVALUATED", "ALL"]).default("ALL"),
  companyId: z.string().optional(),
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(25),
  sort: z.string().optional(),
});
export type DeviceListQueryParams = z.infer<typeof deviceListQuerySchema>;

export const deviceCompanyInfoSchema = z.object({
  id: z.string().nullable(),
  tradeName: z.string().nullable(),
  legalName: z.string().nullable(),
  document: z.string().nullable(),
  documentDigits: z.string().nullable(),
});
export type DeviceCompanyInfo = z.infer<typeof deviceCompanyInfoSchema>;

export const deviceConnectivityInfoSchema = z.object({
  status: deviceConnectivityStatusSchema,
  lastHeartbeatAt: z.string().nullable(),
  lastHeartbeatDiffMinutes: z.number().nullable(),
});
export type DeviceConnectivityInfo = z.infer<typeof deviceConnectivityInfoSchema>;

export const deviceHealthInfoSchema = z.object({
  status: deviceHealthStatusSchema,
  primaryReason: z.string().nullable(),
  activeAlerts: z.number(),
  alertsList: z.array(z.string()).optional(),
});
export type DeviceHealthInfo = z.infer<typeof deviceHealthInfoSchema>;

export const deviceRemoteInfoSchema = z.object({
  provider: z.string().nullable(),
  externalId: z.string().nullable(),
  externalIdFormatted: z.string().nullable(),
  alias: z.string().nullable(),
  status: z.string(),
  isOperational: z.boolean(),
});
export type DeviceRemoteInfo = z.infer<typeof deviceRemoteInfoSchema>;

export const deviceListItemSchema = z.object({
  id: z.string(),
  displayName: z.string(),
  hostname: z.string(),
  lifecycle: deviceLifecycleStatusSchema,
  statusLabel: z.string(),
  connectivity: deviceConnectivityInfoSchema,
  health: deviceHealthInfoSchema,
  company: deviceCompanyInfoSchema,
  network: z.object({
    primaryIp: z.string().nullable(),
    publicIp: z.string().nullable(),
    localIp: z.string().nullable(),
  }),
  remote: deviceRemoteInfoSchema,
  capabilities: z.array(deviceCapabilitySchema),
  agentVersion: z.string().nullable(),
  agentInstallationId: z.string().nullable(),
  tags: z.array(z.string()),
  notes: z.string().nullable(),
  lastTicketNumber: z.string().nullable(),
  sysproUpdate: z.object({
    installationPath: z.string().nullable(),
    instanceName: z.string().nullable(),
    environment: z.string().nullable(),
    sysproVersion: z.string().nullable(),
    databaseName: z.string().nullable(),
  }).nullable().optional(),
});
export type DeviceListItem = z.infer<typeof deviceListItemSchema>;

export const deviceListSummarySchema = z.object({
  total: z.number(),
  managedCount: z.number(),
  awaitingLinkCount: z.number(),
  discoveredCount: z.number(),
  archivedCount: z.number(),
  online: z.number(),
  stale: z.number(),
  offline: z.number(),
  missing: z.number(),
  healthy: z.number(),
  warning: z.number(),
  critical: z.number(),
});
export type DeviceListSummary = z.infer<typeof deviceListSummarySchema>;

export const deviceListPaginationSchema = z.object({
  page: z.number(),
  pageSize: z.number(),
  totalItems: z.number(),
  totalPages: z.number(),
});
export type DeviceListPagination = z.infer<typeof deviceListPaginationSchema>;

export const deviceListResponseSchema = z.object({
  items: z.array(deviceListItemSchema),
  pagination: deviceListPaginationSchema,
  summary: deviceListSummarySchema,
});
export type DeviceListResponse = z.infer<typeof deviceListResponseSchema>;
