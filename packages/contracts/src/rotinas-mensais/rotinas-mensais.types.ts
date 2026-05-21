import { z } from "zod";
import { paginationMetaSchema, paginationQuerySchema } from "../shared/pagination.types";

export const MONTHLY_ROUTINE_CANDIDATE_STATUS_VALUES = [
  "READY_TO_CONFIGURE",
  "NO_ACCOUNTING_FIRM",
  "NO_PRIMARY_CONTACT",
] as const;

export const monthlyRoutineCandidateStatusSchema = z.enum(MONTHLY_ROUTINE_CANDIDATE_STATUS_VALUES);

export const MONTHLY_ROUTINE_EXECUTION_STATUS_VALUES = [
  "PENDING",
  "WAITING_CUSTOMER",
  "RECEIVED",
  "SENT_TO_ACCOUNTING",
  "COMPLETED",
  "OVERDUE",
  "CANCELED",
] as const;

export const monthlyRoutineExecutionStatusSchema = z.enum(MONTHLY_ROUTINE_EXECUTION_STATUS_VALUES);

export const MONTHLY_ROUTINE_REQUEST_CHANNEL_VALUES = ["WHATSAPP"] as const;
export const MONTHLY_ROUTINE_REQUEST_STATUS_VALUES = ["SENT", "FAILED"] as const;

export const monthlyRoutineRequestChannelSchema = z.enum(MONTHLY_ROUTINE_REQUEST_CHANNEL_VALUES);
export const monthlyRoutineRequestStatusSchema = z.enum(MONTHLY_ROUTINE_REQUEST_STATUS_VALUES);

export const MONTHLY_ROUTINE_MESSAGE_TEMPLATE_VALUES = [
  "REQUEST_CONFIRMATION",
  "FIRST_REMINDER",
  "SECOND_REMINDER",
] as const;

export const monthlyRoutineMessageTemplateSchema = z.enum(MONTHLY_ROUTINE_MESSAGE_TEMPLATE_VALUES);

export const monthlyRoutineHistoryItemSchema = z.object({
  id: z.string(),
  type: z.string(),
  title: z.string(),
  description: z.string().nullable(),
  fromStatus: monthlyRoutineExecutionStatusSchema.nullable(),
  toStatus: monthlyRoutineExecutionStatusSchema.nullable(),
  authorUserName: z.string().nullable(),
  occurredAt: z.string(),
});

export const monthlyRoutineListQuerySchema = paginationQuerySchema.extend({
  search: z.string().trim().optional(),
  status: z.enum([...MONTHLY_ROUTINE_CANDIDATE_STATUS_VALUES, "ALL"]).optional(),
});

export const monthlyRoutineSummarySchema = z.object({
  totalCompanies: z.number().int().nonnegative(),
  withAccountingFirm: z.number().int().nonnegative(),
  readyToConfigure: z.number().int().nonnegative(),
  missingAccountingFirm: z.number().int().nonnegative(),
  missingPrimaryContact: z.number().int().nonnegative(),
});

export const monthlyRoutineCompanyItemSchema = z.object({
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
  candidateStatus: monthlyRoutineCandidateStatusSchema,
});

export const monthlyRoutineListResponseSchema = z.object({
  items: z.array(monthlyRoutineCompanyItemSchema),
  pagination: paginationMetaSchema,
  summary: monthlyRoutineSummarySchema,
});

export const monthlyRoutineContactOptionSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string().nullable(),
  phone: z.string().nullable(),
  whatsapp: z.string().nullable(),
});

export const monthlyRoutineCompanyConfigSchema = z.object({
  id: z.string().nullable().optional(),
  companyId: z.string(),
  isActive: z.boolean(),
  title: z.string(),
  dueDay: z.number().int().min(1).max(31),
  reminderDays: z.number().int().min(0).max(30),
  clientContactId: z.string().nullable(),
  accountingContactId: z.string().nullable(),
  notes: z.string().nullable(),
  requiredDocuments: z.array(z.string()),
});

export const monthlyRoutineCompanyConfigUpsertSchema = z.object({
  companyId: z.string().min(1),
  data: z.object({
    isActive: z.boolean(),
    title: z.string().trim().min(3).max(120),
    dueDay: z.number().int().min(1).max(31),
    reminderDays: z.number().int().min(0).max(30),
    clientContactId: z.string().trim().nullable().optional(),
    accountingContactId: z.string().trim().nullable().optional(),
    notes: z.string().trim().max(4000).nullable().optional(),
    requiredDocuments: z.array(z.string().trim().min(1).max(120)).max(20).default([]),
  }),
});

export const monthlyRoutineCompanyConfigViewSchema = z.object({
  company: z.object({
    companyId: z.string(),
    companyName: z.string(),
    accountingFirmId: z.string().nullable(),
    accountingFirmName: z.string().nullable(),
  }),
  config: monthlyRoutineCompanyConfigSchema,
  clientContacts: z.array(monthlyRoutineContactOptionSchema),
  accountingContacts: z.array(monthlyRoutineContactOptionSchema),
});

export const monthlyRoutineCompetencyListQuerySchema = paginationQuerySchema.extend({
  year: z.string().optional(),
  month: z.string().optional(),
  status: z.enum([...MONTHLY_ROUTINE_EXECUTION_STATUS_VALUES, "ALL"]).optional(),
  search: z.string().trim().optional(),
});

export const monthlyRoutineCompetencyItemSchema = z.object({
  id: z.string(),
  configId: z.string(),
  companyId: z.string(),
  companyName: z.string(),
  accountingFirmName: z.string().nullable(),
  title: z.string(),
  year: z.number().int(),
  month: z.number().int(),
  status: monthlyRoutineExecutionStatusSchema,
  dueDate: z.string(),
  requestedAt: z.string().nullable(),
  receivedAt: z.string().nullable(),
  sentAt: z.string().nullable(),
  completedAt: z.string().nullable(),
  clientContactId: z.string().nullable(),
  clientContactName: z.string().nullable(),
  accountingContactId: z.string().nullable(),
  accountingContactName: z.string().nullable(),
  requiredDocumentsCount: z.number().int().nonnegative(),
  availableContacts: z.array(monthlyRoutineContactOptionSchema),
  manualRequestsCount: z.number().int().nonnegative(),
  lastManualRequestAt: z.string().nullable(),
  lastManualRequestStatus: monthlyRoutineRequestStatusSchema.nullable(),
  lastManualRequestContactName: z.string().nullable(),
  notes: z.string().nullable(),
  manualRequests: z.array(z.object({
    id: z.string(),
    attemptNumber: z.number().int().positive(),
    contactId: z.string(),
    contactName: z.string(),
    requestedByUserName: z.string(),
    channel: monthlyRoutineRequestChannelSchema,
    status: monthlyRoutineRequestStatusSchema,
    targetPhone: z.string(),
    message: z.string(),
    providerMessageId: z.string().nullable(),
    errorMessage: z.string().nullable(),
    requestedAt: z.string(),
    sentAt: z.string().nullable(),
  })),
  history: z.array(monthlyRoutineHistoryItemSchema),
});

export const monthlyRoutineCompetencySummarySchema = z.object({
  total: z.number().int().nonnegative(),
  pending: z.number().int().nonnegative(),
  waitingCustomer: z.number().int().nonnegative(),
  received: z.number().int().nonnegative(),
  sentToAccounting: z.number().int().nonnegative(),
  completed: z.number().int().nonnegative(),
  overdue: z.number().int().nonnegative(),
});

export const monthlyRoutineCompetencyListResponseSchema = z.object({
  items: z.array(monthlyRoutineCompetencyItemSchema),
  pagination: paginationMetaSchema,
  summary: monthlyRoutineCompetencySummarySchema,
  year: z.number().int(),
  month: z.number().int(),
});

export const monthlyRoutineSyncCompetenciesSchema = z.object({
  year: z.number().int().min(2000).max(2100).optional(),
  month: z.number().int().min(1).max(12).optional(),
});

export const monthlyRoutineSyncCompetenciesResultSchema = z.object({
  success: z.boolean(),
  message: z.string(),
  generated: z.number().int().nonnegative(),
  updated: z.number().int().nonnegative(),
  year: z.number().int(),
  month: z.number().int(),
});

export const monthlyRoutineSendManualRequestSchema = z.object({
  competencyId: z.string().min(1),
  contactId: z.string().min(1),
  template: monthlyRoutineMessageTemplateSchema.optional(),
  message: z.string().trim().min(8).max(4000).optional(),
});

export const monthlyRoutineSendManualRequestResultSchema = z.object({
  success: z.boolean(),
  message: z.string(),
  request: monthlyRoutineCompetencyItemSchema.shape.manualRequests.element,
});

export const monthlyRoutineUpdateCompetencyStatusSchema = z.object({
  competencyId: z.string().min(1),
  status: monthlyRoutineExecutionStatusSchema,
  notes: z.string().trim().max(4000).optional(),
});

export const monthlyRoutineUpdateCompetencyStatusResultSchema = z.object({
  success: z.boolean(),
  message: z.string(),
  competency: monthlyRoutineCompetencyItemSchema,
});

export type MonthlyRoutineCandidateStatus = z.output<typeof monthlyRoutineCandidateStatusSchema>;
export type MonthlyRoutineExecutionStatus = z.output<typeof monthlyRoutineExecutionStatusSchema>;
export type MonthlyRoutineRequestChannel = z.output<typeof monthlyRoutineRequestChannelSchema>;
export type MonthlyRoutineRequestStatus = z.output<typeof monthlyRoutineRequestStatusSchema>;
export type MonthlyRoutineHistoryItem = z.output<typeof monthlyRoutineHistoryItemSchema>;
export type MonthlyRoutineListQuery = z.output<typeof monthlyRoutineListQuerySchema>;
export type MonthlyRoutineSummary = z.output<typeof monthlyRoutineSummarySchema>;
export type MonthlyRoutineCompanyItem = z.output<typeof monthlyRoutineCompanyItemSchema>;
export type MonthlyRoutineListResponse = z.output<typeof monthlyRoutineListResponseSchema>;
export type MonthlyRoutineContactOption = z.output<typeof monthlyRoutineContactOptionSchema>;
export type MonthlyRoutineCompanyConfig = z.output<typeof monthlyRoutineCompanyConfigSchema>;
export type MonthlyRoutineCompanyConfigUpsertInput = z.output<typeof monthlyRoutineCompanyConfigUpsertSchema>;
export type MonthlyRoutineCompanyConfigView = z.output<typeof monthlyRoutineCompanyConfigViewSchema>;
export type MonthlyRoutineCompetencyListQuery = z.output<typeof monthlyRoutineCompetencyListQuerySchema>;
export type MonthlyRoutineCompetencyItem = z.output<typeof monthlyRoutineCompetencyItemSchema>;
export type MonthlyRoutineCompetencySummary = z.output<typeof monthlyRoutineCompetencySummarySchema>;
export type MonthlyRoutineCompetencyListResponse = z.output<typeof monthlyRoutineCompetencyListResponseSchema>;
export type MonthlyRoutineSyncCompetenciesInput = z.output<typeof monthlyRoutineSyncCompetenciesSchema>;
export type MonthlyRoutineSyncCompetenciesResult = z.output<typeof monthlyRoutineSyncCompetenciesResultSchema>;
export type MonthlyRoutineSendManualRequestInput = z.output<typeof monthlyRoutineSendManualRequestSchema>;
export type MonthlyRoutineSendManualRequestResult = z.output<typeof monthlyRoutineSendManualRequestResultSchema>;
export type MonthlyRoutineUpdateCompetencyStatusInput = z.output<typeof monthlyRoutineUpdateCompetencyStatusSchema>;
export type MonthlyRoutineUpdateCompetencyStatusResult = z.output<typeof monthlyRoutineUpdateCompetencyStatusResultSchema>;
