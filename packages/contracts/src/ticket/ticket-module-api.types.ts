import { z } from "zod";

export const TICKET_MODULE_STATUS_VALUES = [
  "NEW",
  "UNASSIGNED",
  "TRIAGE",
  "IN_PROGRESS",
  "WAITING_CUSTOMER",
  "WAITING_INTERNAL",
  "TESTING",
  "RESOLVED",
  "ARCHIVED",
] as const;

export const TICKET_MODULE_PRIORITY_VALUES = ["LOW", "NORMAL", "HIGH", "CRITICAL"] as const;
export const TICKET_MODULE_CHANNEL_VALUES = ["WHATSAPP", "EMAIL", "PORTAL", "PHONE"] as const;
export const TICKET_MODULE_ENTRY_POINT_VALUES = ["INBOUND", "OUTBOUND", "INTERNAL"] as const;
export const TICKET_MODULE_DIRECTION_VALUES = ["INBOUND", "OUTBOUND", "INTERNAL"] as const;
export const TICKET_MODULE_MESSAGE_TYPE_VALUES = ["TEXT", "IMAGE", "DOCUMENT", "AUDIO", "VIDEO", "SYSTEM_EVENT"] as const;

export const ticketModuleStatusSchema = z.enum(TICKET_MODULE_STATUS_VALUES);
export const ticketModulePrioritySchema = z.enum(TICKET_MODULE_PRIORITY_VALUES);
export const ticketModuleChannelSchema = z.enum(TICKET_MODULE_CHANNEL_VALUES);
export const ticketModuleEntryPointSchema = z.enum(TICKET_MODULE_ENTRY_POINT_VALUES);
export const ticketModuleDirectionSchema = z.enum(TICKET_MODULE_DIRECTION_VALUES);
export const ticketModuleMessageTypeSchema = z.enum(TICKET_MODULE_MESSAGE_TYPE_VALUES);

const optionalTrimmedStringSchema = z.preprocess(
  (value) => (typeof value === "string" && value.trim() === "" ? undefined : value),
  z.string().trim().optional(),
);

const optionalTrimmedEmailSchema = z.preprocess(
  (value) => (typeof value === "string" && value.trim() === "" ? undefined : value),
  z.string().trim().email().optional(),
);

export const ticketModuleStatusCountsSchema = z.object({
  open: z.number().int().nonnegative(),
  pending: z.number().int().nonnegative(),
  closed: z.number().int().nonnegative(),
});

export const ticketModuleQueueCountsSchema = z.object({
  all: z.number().int().nonnegative(),
  my_queue: z.number().int().nonnegative(),
  unassigned: z.number().int().nonnegative(),
  critical: z.number().int().nonnegative(),
  no_response: z.number().int().nonnegative(),
});

export const ticketModuleCreateRequestSchema = z.object({
  title: z.string().trim().min(1),
  description: z.string().trim().min(1),
  priority: ticketModulePrioritySchema.optional(),
  channel: ticketModuleChannelSchema.optional(),
  entryPoint: ticketModuleEntryPointSchema.optional(),
  companyId: optionalTrimmedStringSchema,
  companyContactId: optionalTrimmedStringSchema,
  externalThreadId: optionalTrimmedStringSchema,
  contactPhoneSnapshot: optionalTrimmedStringSchema,
  contactWhatsappSnapshot: optionalTrimmedStringSchema,
  contactNameSnapshot: optionalTrimmedStringSchema,
  metadata: z.record(z.string(), z.unknown()).optional(),
  userSelectedCompanyId: optionalTrimmedStringSchema,
  customerEmail: optionalTrimmedEmailSchema,
  category: optionalTrimmedStringSchema,
  module: optionalTrimmedStringSchema,
  team: optionalTrimmedStringSchema,
  developmentVideoUrl: optionalTrimmedStringSchema,
});

export const ticketModuleUpdateRequestSchema = z.object({
  status: ticketModuleStatusSchema.optional(),
  priority: ticketModulePrioritySchema.optional(),
  assignedUserId: z.string().trim().optional(),
  resolutionSummary: z.string().trim().optional(),
  resolutionVideoUrl: z.string().trim().optional(),
  releaseType: z.string().trim().optional(),
  releaseTitle: z.string().trim().optional(),
  releaseModule: z.string().trim().optional(),
  publishToReleases: z.boolean().optional(),
  category: z.string().trim().optional(),
  module: z.string().trim().optional(),
  team: z.string().trim().optional(),
  note: z.string().trim().optional(),
});

export const ticketModuleReplyRequestSchema = z.object({
  message: z.string().trim().optional(),
  visibility: z.enum(["PUBLIC", "INTERNAL"]).optional(),
});

export const ticketModuleTriageRequestSchema = z.object({
  priority: ticketModulePrioritySchema.optional(),
  team: optionalTrimmedStringSchema,
  category: optionalTrimmedStringSchema,
});

export const ticketModuleListQuerySchema = z.object({
  page: z.string().optional(),
  pageSize: z.string().optional(),
  search: z.string().optional(),
  status: z.string().optional(),
  statusGroup: z.enum(["open", "pending", "closed", "all"]).optional(),
  queue: z.enum(["all", "my_queue", "unassigned", "critical", "no_response"]).optional(),
  team: z.enum(["SUPORTE", "DESENVOLVIMENTO"]).optional(),
  closedWindow: z.enum(["30d", "60d", "90d", "180d", "365d", "all"]).optional(),
  assignedUserId: z.string().optional(),
  companyId: z.string().optional(),
});

export const ticketModuleUserSchema = z.object({
  id: z.string(),
  name: z.string().nullable(),
  email: z.string().email(),
});

export const ticketModuleContactSchema = z.object({
  id: z.string(),
  name: z.string().nullable(),
  email: z.string().email().nullable().optional(),
  whatsapp: z.string().nullable().optional(),
});

export const ticketModuleCompanySchema = z.object({
  id: z.string(),
  razaoSocial: z.string(),
  nomeFantasia: z.string().nullable(),
});

export const ticketModuleMessageSchema = z.object({
  id: z.string(),
  direction: ticketModuleDirectionSchema,
  type: ticketModuleMessageTypeSchema,
  body: z.string().nullable(),
  createdAt: z.string(),
  authorUser: ticketModuleUserSchema.nullable().optional(),
  authorContact: z.object({
    id: z.string(),
    name: z.string().nullable(),
  }).nullable().optional(),
});

export const ticketModuleRecordSchema = z.object({
  id: z.string(),
  channel: ticketModuleChannelSchema,
  status: ticketModuleStatusSchema,
  priority: ticketModulePrioritySchema,
  companyId: z.string().nullable(),
  company: ticketModuleCompanySchema.nullable().optional(),
  companyContactId: z.string().nullable(),
  companyContact: ticketModuleContactSchema.nullable().optional(),
  assignedUserId: z.string().nullable(),
  assignedUser: ticketModuleUserSchema.nullable().optional(),
  resolvedByUserId: z.string().nullable(),
  resolvedByUser: ticketModuleUserSchema.nullable().optional(),
  ticketNumber: z.string().nullable(),
  subject: z.string().nullable(),
  resolutionSummary: z.string().nullable().optional(),
  resolutionVideoUrl: z.string().nullable().optional(),
  releaseType: z.string().nullable().optional(),
  releaseTitle: z.string().nullable().optional(),
  releaseModule: z.string().nullable().optional(),
  publishToReleases: z.boolean().optional(),
  externalThreadId: z.string().nullable().optional(),
  metadata: z.record(z.string(), z.unknown()).nullable().optional(),
  contactPhoneSnapshot: z.string().nullable().optional(),
  contactWhatsappSnapshot: z.string().nullable().optional(),
  contactNameSnapshot: z.string().nullable().optional(),
  slaResponseDueAt: z.string().nullable().optional(),
  slaResolutionDueAt: z.string().nullable().optional(),
  slaResponseHitAt: z.string().nullable().optional(),
  slaResolutionHitAt: z.string().nullable().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
  closedAt: z.string().nullable(),
  messages: z.array(ticketModuleMessageSchema).optional(),
});

export const ticketModuleMutationResponseSchema = z.object({
  success: z.boolean(),
  message: z.string().optional(),
  error: z.string().optional(),
});

export const ticketModuleListResponseSchema = z.object({
  success: z.boolean(),
  data: z.array(ticketModuleRecordSchema).optional(),
  pagination: z.object({
    page: z.number().int().positive(),
    pageSize: z.number().int().positive(),
    total: z.number().int().nonnegative(),
    hasNextPage: z.boolean(),
    hasPreviousPage: z.boolean(),
  }).optional(),
  queueCounts: ticketModuleQueueCountsSchema.optional(),
  statusCounts: ticketModuleStatusCountsSchema.optional(),
  error: z.string().optional(),
});

export const ticketModuleDetailsResponseSchema = z.object({
  success: z.boolean(),
  data: ticketModuleRecordSchema.optional(),
  error: z.string().optional(),
});

export const ticketModuleLinkedCompanySchema = z.object({
  id: z.string(),
  name: z.string(),
});

export const ticketModuleLinkedCompaniesResponseSchema = z.object({
  success: z.boolean(),
  data: z.array(ticketModuleLinkedCompanySchema),
});

export type TicketModuleStatus = z.infer<typeof ticketModuleStatusSchema>;
export type TicketModulePriority = z.infer<typeof ticketModulePrioritySchema>;
export type TicketModuleChannel = z.infer<typeof ticketModuleChannelSchema>;
export type TicketModuleEntryPoint = z.infer<typeof ticketModuleEntryPointSchema>;
export type TicketModuleDirection = z.infer<typeof ticketModuleDirectionSchema>;
export type TicketModuleMessageType = z.infer<typeof ticketModuleMessageTypeSchema>;
export type TicketModuleStatusCounts = z.infer<typeof ticketModuleStatusCountsSchema>;
export type TicketModuleQueueCounts = z.infer<typeof ticketModuleQueueCountsSchema>;
export type TicketModuleCreateRequest = z.infer<typeof ticketModuleCreateRequestSchema>;
export type TicketModuleUpdateRequest = z.infer<typeof ticketModuleUpdateRequestSchema>;
export type TicketModuleReplyRequest = z.infer<typeof ticketModuleReplyRequestSchema>;
export type TicketModuleTriageRequest = z.infer<typeof ticketModuleTriageRequestSchema>;
export type TicketModuleListQuery = z.infer<typeof ticketModuleListQuerySchema>;
export type TicketModuleUser = z.infer<typeof ticketModuleUserSchema>;
export type TicketModuleContact = z.infer<typeof ticketModuleContactSchema>;
export type TicketModuleCompany = z.infer<typeof ticketModuleCompanySchema>;
export type TicketModuleMessage = z.infer<typeof ticketModuleMessageSchema>;
export type TicketModuleRecord = z.infer<typeof ticketModuleRecordSchema>;
export type TicketModuleMutationResponse = z.infer<typeof ticketModuleMutationResponseSchema>;
export type TicketModuleListResponse = z.infer<typeof ticketModuleListResponseSchema>;
export type TicketModuleDetailsResponse = z.infer<typeof ticketModuleDetailsResponseSchema>;
export type TicketModuleLinkedCompany = z.infer<typeof ticketModuleLinkedCompanySchema>;
export type TicketModuleLinkedCompaniesResponse = z.infer<typeof ticketModuleLinkedCompaniesResponseSchema>;
