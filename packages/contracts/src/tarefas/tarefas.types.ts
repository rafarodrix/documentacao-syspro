import { z } from "zod";
import { paginationMetaSchema, paginationQuerySchema } from "../shared/pagination.types";

export const TASK_TYPE_VALUES = ["ROTINA_MENSAL", "TAREFA"] as const;
export const taskTypeSchema = z.enum(TASK_TYPE_VALUES);

export const TASK_CANDIDATE_STATUS_VALUES = [
  "READY_TO_CONFIGURE",
  "NO_ACCOUNTING_FIRM",
  "NO_PRIMARY_CONTACT",
] as const;
export const taskCandidateStatusSchema = z.enum(TASK_CANDIDATE_STATUS_VALUES);

export const TASK_STATUS_VALUES = [
  "PENDING",
  "WAITING_CUSTOMER",
  "RECEIVED",
  "SENT_TO_ACCOUNTING",
  "COMPLETED",
  "OVERDUE",
  "CANCELED",
] as const;
export const taskStatusSchema = z.enum(TASK_STATUS_VALUES);

export const TASK_REQUEST_CHANNEL_VALUES = ["WHATSAPP"] as const;
export const TASK_REQUEST_STATUS_VALUES = ["SENT", "FAILED"] as const;
export const taskRequestChannelSchema = z.enum(TASK_REQUEST_CHANNEL_VALUES);
export const taskRequestStatusSchema = z.enum(TASK_REQUEST_STATUS_VALUES);

export const TASK_MESSAGE_TEMPLATE_VALUES = [
  "REQUEST_CONFIRMATION",
  "FIRST_REMINDER",
  "SECOND_REMINDER",
] as const;
export const taskMessageTemplateSchema = z.enum(TASK_MESSAGE_TEMPLATE_VALUES);

export const taskHistoryItemSchema = z.object({
  id: z.string(),
  type: z.string(),
  title: z.string(),
  description: z.string().nullable(),
  fromStatus: taskStatusSchema.nullable(),
  toStatus: taskStatusSchema.nullable(),
  authorUserName: z.string().nullable(),
  occurredAt: z.string(),
});

export const taskListQuerySchema = paginationQuerySchema.extend({
  search: z.string().trim().optional(),
  status: z.enum([...TASK_CANDIDATE_STATUS_VALUES, "ALL"]).optional(),
});

export const taskSummarySchema = z.object({
  totalCompanies: z.number().int().nonnegative(),
  withAccountingFirm: z.number().int().nonnegative(),
  readyToConfigure: z.number().int().nonnegative(),
  missingAccountingFirm: z.number().int().nonnegative(),
  missingPrimaryContact: z.number().int().nonnegative(),
});

export const taskCompanyItemSchema = z.object({
  companyId: z.string(),
  companyName: z.string(),
  companyTradeName: z.string().nullable(),
  companyStatus: z.string(),
  taxRegime: z.string().nullable(),
  accountingFirmId: z.string().nullable(),
  accountingFirmName: z.string().nullable(),
  primaryContactId: z.string().nullable(),
  primaryContactName: z.string().nullable(),
  primaryContactEmail: z.string().nullable(),
  contactsCount: z.number().int().nonnegative(),
  routineConfigId: z.string().nullable().optional(),
  routineEnabled: z.boolean().optional(),
  candidateStatus: taskCandidateStatusSchema,
});

export const taskListResponseSchema = z.object({
  items: z.array(taskCompanyItemSchema),
  pagination: paginationMetaSchema,
  summary: taskSummarySchema,
});

export const taskContactOptionSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string().nullable(),
  phone: z.string().nullable(),
  whatsapp: z.string().nullable(),
});

export const taskConfigSchema = z.object({
  id: z.string().nullable().optional(),
  companyId: z.string(),
  isActive: z.boolean(),
  title: z.string(),
  dueDay: z.number().int().min(1).max(31),
  reminderDays: z.number().int().min(0).max(30),
  clientContactId: z.string().nullable(),
  accountingContactId: z.string().nullable(),
  assignedToId: z.string().nullable(),
  assignedToName: z.string().nullable(),
  notes: z.string().nullable(),
  requiredDocuments: z.array(z.string()),
});

export const taskConfigUpsertSchema = z.object({
  companyId: z.string().min(1),
  data: z.object({
    isActive: z.boolean(),
    title: z.string().trim().min(3).max(120),
    dueDay: z.number().int().min(1).max(31),
    reminderDays: z.number().int().min(0).max(30),
    clientContactId: z.string().trim().nullable().optional(),
    accountingContactId: z.string().trim().nullable().optional(),
    assignedToId: z.string().trim().nullable().optional(),
    notes: z.string().trim().max(4000).nullable().optional(),
    requiredDocuments: z.array(z.string().trim().min(1).max(120)).max(20).default([]),
  }),
});

export const taskConfigViewSchema = z.object({
  company: z.object({
    companyId: z.string(),
    companyName: z.string(),
    accountingFirmId: z.string().nullable(),
    accountingFirmName: z.string().nullable(),
  }),
  config: taskConfigSchema,
  clientContacts: z.array(taskContactOptionSchema),
  accountingContacts: z.array(taskContactOptionSchema),
});

export const taskCompanySearchQuerySchema = z.object({
  q: z.string().trim().optional(),
  limit: z.number().int().min(1).max(30).optional(),
});

export const taskCompanySearchOptionSchema = z.object({
  companyId: z.string(),
  email: z.string(),
  companyName: z.string(),
  legalName: z.string().nullable().optional(),
  cnpj: z.string().nullable().optional(),
  contactName: z.string().nullable(),
});

export const taskItemListQuerySchema = paginationQuerySchema.extend({
  year: z.string().optional(),
  month: z.string().optional(),
  type: z.enum([...TASK_TYPE_VALUES, "ALL"]).optional(),
  origin: z.enum(["ALL", "MONTHLY", "MANUAL", "TICKET"]).optional(),
  status: z.enum([...TASK_STATUS_VALUES, "ALL", "OPEN"]).optional(),
  dueFrom: z.string().optional(),
  dueTo: z.string().optional(),
  reconcileCurrentCompetence: z.boolean().optional(),
  search: z.string().trim().optional(),
});

const taskManualRequestItemSchema = z.object({
  id: z.string(),
  attemptNumber: z.number().int().positive(),
  contactId: z.string(),
  contactName: z.string(),
  requestedByUserName: z.string(),
  channel: taskRequestChannelSchema,
  status: taskRequestStatusSchema,
  targetPhone: z.string(),
  message: z.string(),
  providerMessageId: z.string().nullable(),
  errorMessage: z.string().nullable(),
  requestedAt: z.string(),
  sentAt: z.string().nullable(),
});

export const taskItemSchema = z.object({
  id: z.string(),
  type: taskTypeSchema,
  configId: z.string().nullable(),
  companyId: z.string(),
  companyName: z.string(),
  accountingFirmName: z.string().nullable(),
  title: z.string(),
  description: z.string().nullable(),
  year: z.number().int().nullable(),
  month: z.number().int().nullable(),
  status: taskStatusSchema,
  dueDate: z.string(),
  requestedAt: z.string().nullable(),
  receivedAt: z.string().nullable(),
  sentAt: z.string().nullable(),
  completedAt: z.string().nullable(),
  clientContactId: z.string().nullable(),
  clientContactName: z.string().nullable(),
  accountingContactId: z.string().nullable(),
  accountingContactName: z.string().nullable(),
  assignedToId: z.string().nullable(),
  assignedToName: z.string().nullable(),
  ticketId: z.string().nullable(),
  configNotes: z.string().nullable(),
  requiredDocuments: z.array(z.string()),
  requiredDocumentsCount: z.number().int().nonnegative(),
  availableContacts: z.array(taskContactOptionSchema),
  manualRequestsCount: z.number().int().nonnegative(),
  lastManualRequestAt: z.string().nullable(),
  lastManualRequestStatus: taskRequestStatusSchema.nullable(),
  lastManualRequestContactName: z.string().nullable(),
  notes: z.string().nullable(),
  manualRequests: z.array(taskManualRequestItemSchema),
  history: z.array(taskHistoryItemSchema),
});

export const taskItemSummarySchema = z.object({
  total: z.number().int().nonnegative(),
  open: z.number().int().nonnegative(),
  pending: z.number().int().nonnegative(),
  waitingCustomer: z.number().int().nonnegative(),
  received: z.number().int().nonnegative(),
  sentToAccounting: z.number().int().nonnegative(),
  completed: z.number().int().nonnegative(),
  overdue: z.number().int().nonnegative(),
  canceled: z.number().int().nonnegative(),
});

export const taskItemListResponseSchema = z.object({
  items: z.array(taskItemSchema),
  pagination: paginationMetaSchema,
  summary: taskItemSummarySchema,
  year: z.number().int().nullable(),
  month: z.number().int().nullable(),
});

export const taskSyncCompetenciesSchema = z.object({
  year: z.number().int().min(2000).max(2100).optional(),
  month: z.number().int().min(1).max(12).optional(),
});

export const taskSyncCompetenciesResultSchema = z.object({
  success: z.boolean(),
  message: z.string(),
  generated: z.number().int().nonnegative(),
  updated: z.number().int().nonnegative(),
  year: z.number().int(),
  month: z.number().int(),
});

export const taskSendManualRequestSchema = z.object({
  taskId: z.string().min(1),
  contactId: z.string().min(1),
  template: taskMessageTemplateSchema.optional(),
  message: z.string().trim().min(8).max(4000).optional(),
});

export const taskSendManualRequestResultSchema = z.object({
  success: z.boolean(),
  message: z.string(),
  request: taskManualRequestItemSchema,
});

export const taskUpdateStatusSchema = z.object({
  taskId: z.string().min(1),
  status: taskStatusSchema,
  notes: z.string().trim().max(4000).optional(),
});

export const taskUpdateStatusResultSchema = z.object({
  success: z.boolean(),
  message: z.string(),
  task: taskItemSchema,
});

export const createTaskSchema = z.object({
  companyId: z.string().min(1),
  title: z.string().trim().min(3).max(120),
  description: z.string().trim().max(4000).optional(),
  dueDate: z.string().datetime(),
  clientContactId: z.string().trim().optional(),
  assignedToId: z.string().trim().optional(),
  requiredDocuments: z.array(z.string().trim().min(1).max(120)).max(20).default([]),
  notes: z.string().trim().max(4000).optional(),
});

export const createTaskResultSchema = z.object({
  success: z.boolean(),
  message: z.string(),
  task: taskItemSchema,
});

export type TaskType = z.output<typeof taskTypeSchema>;
export type TaskCandidateStatus = z.output<typeof taskCandidateStatusSchema>;
export type TaskStatus = z.output<typeof taskStatusSchema>;
export type TaskRequestChannel = z.output<typeof taskRequestChannelSchema>;
export type TaskRequestStatus = z.output<typeof taskRequestStatusSchema>;
export type TaskHistoryItem = z.output<typeof taskHistoryItemSchema>;
export type TaskListQuery = z.output<typeof taskListQuerySchema>;
export type TaskSummary = z.output<typeof taskSummarySchema>;
export type TaskCompanyItem = z.output<typeof taskCompanyItemSchema>;
export type TaskListResponse = z.output<typeof taskListResponseSchema>;
export type TaskContactOption = z.output<typeof taskContactOptionSchema>;
export type TaskConfig = z.output<typeof taskConfigSchema>;
export type TaskConfigUpsertInput = z.output<typeof taskConfigUpsertSchema>;
export type TaskConfigView = z.output<typeof taskConfigViewSchema>;
export type TaskCompanySearchQuery = z.output<typeof taskCompanySearchQuerySchema>;
export type TaskCompanySearchOption = z.output<typeof taskCompanySearchOptionSchema>;
export type TaskItemListQuery = z.output<typeof taskItemListQuerySchema>;
export type TaskItem = z.output<typeof taskItemSchema>;
export type TaskItemSummary = z.output<typeof taskItemSummarySchema>;
export type TaskItemListResponse = z.output<typeof taskItemListResponseSchema>;
export type TaskSyncCompetenciesInput = z.output<typeof taskSyncCompetenciesSchema>;
export type TaskSyncCompetenciesResult = z.output<typeof taskSyncCompetenciesResultSchema>;
export type TaskSendManualRequestInput = z.output<typeof taskSendManualRequestSchema>;
export type TaskSendManualRequestResult = z.output<typeof taskSendManualRequestResultSchema>;
export type TaskUpdateStatusInput = z.output<typeof taskUpdateStatusSchema>;
export type TaskUpdateStatusResult = z.output<typeof taskUpdateStatusResultSchema>;
export type CreateTaskInput = z.output<typeof createTaskSchema>;
export type CreateTaskResult = z.output<typeof createTaskResultSchema>;
