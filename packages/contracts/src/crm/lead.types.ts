import { z } from "zod";
import { paginationMetaSchema, paginationQuerySchema } from "../shared/pagination.types";

export const CRM_LEAD_STAGE_VALUES = [
  "LEAD",
  "MQL",
  "SQL",
  "PROPOSAL",
  "NEGOTIATION",
  "WON",
  "LOST",
] as const;

export const CRM_LEAD_SOURCE_VALUES = [
  "MANUAL",
  "WHATSAPP",
  "REFERRAL",
  "FORM",
  "EVENT",
  "OUTBOUND",
  "CAMPAIGN",
  "OTHER",
] as const;

export const crmLeadStageSchema = z.enum(CRM_LEAD_STAGE_VALUES);
export const crmLeadSourceSchema = z.enum(CRM_LEAD_SOURCE_VALUES);

export const CRM_ACTIVITY_TYPE_VALUES = [
  "NOTE",
  "CALL",
  "MEETING",
  "EMAIL",
  "WHATSAPP",
  "SYSTEM_EVENT",
] as const;

export const CRM_TASK_STATUS_VALUES = [
  "PENDING",
  "COMPLETED",
  "CANCELED",
] as const;

export const crmActivityTypeSchema = z.enum(CRM_ACTIVITY_TYPE_VALUES);
export const crmTaskStatusSchema = z.enum(CRM_TASK_STATUS_VALUES);

export const crmActivitySchema = z.object({
  id: z.string(),
  leadId: z.string(),
  type: crmActivityTypeSchema,
  title: z.string().nullable().optional(),
  body: z.string().nullable().optional(),
  authorUserId: z.string().nullable().optional(),
  authorName: z.string().nullable().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const crmTaskSchema = z.object({
  id: z.string(),
  leadId: z.string(),
  title: z.string(),
  description: z.string().nullable().optional(),
  status: crmTaskStatusSchema,
  dueDate: z.string(),
  assigneeUserId: z.string().nullable().optional(),
  assigneeName: z.string().nullable().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

const nullableTrimmedString = (max: number) =>
  z.union([z.string().trim().max(max), z.literal(""), z.null(), z.undefined()]);

export const crmLeadManualContactSchema = z.object({
  name: z.string().trim().min(2).max(160),
  role: nullableTrimmedString(120),
  email: z.union([z.string().trim().email(), z.literal(""), z.null(), z.undefined()]),
  phone: nullableTrimmedString(40),
  whatsapp: nullableTrimmedString(40),
  isPrimary: z.boolean().optional().default(false),
});

const crmLeadMutableFieldsSchema = z.object({
  title: z.string().trim().min(3).max(160),
  stage: crmLeadStageSchema,
  source: crmLeadSourceSchema,
  ownerUserId: nullableTrimmedString(80),
  companyName: z.string().trim().min(2).max(160),
  tradeName: nullableTrimmedString(160),
  document: nullableTrimmedString(32),
  contacts: z.array(crmLeadManualContactSchema).optional().default([]),
  industry: nullableTrimmedString(120),
  companySize: nullableTrimmedString(120),
  city: nullableTrimmedString(120),
  state: nullableTrimmedString(8),
  estimatedValue: z.union([z.coerce.number().nonnegative(), z.null(), z.undefined()]),
  licenseValue: z.union([z.coerce.number().nonnegative(), z.null(), z.undefined()]),
  monthlyFee: z.union([z.coerce.number().nonnegative(), z.null(), z.undefined()]),
  minimumWagePercentage: z.union([z.coerce.number().nonnegative(), z.null(), z.undefined()]),
  expectedCloseAt: nullableTrimmedString(40),
  nextStep: nullableTrimmedString(240),
  qualificationNotes: nullableTrimmedString(4000),
  lostReason: nullableTrimmedString(240),
});

export const crmLeadSchema = z.object({
  id: z.string(),
  title: z.string(),
  stage: crmLeadStageSchema,
  source: crmLeadSourceSchema,
  ownerUserId: z.string().nullable().optional(),
  ownerName: z.string().nullable().optional(),
  companyName: z.string(),
  tradeName: z.string().nullable().optional(),
  document: z.string().nullable().optional(),
  contacts: z.array(crmLeadManualContactSchema).optional().default([]),
  primaryContactName: z.string().nullable().optional(),
  industry: z.string().nullable().optional(),
  companySize: z.string().nullable().optional(),
  city: z.string().nullable().optional(),
  state: z.string().nullable().optional(),
  estimatedValue: z.number().nullable().optional(),
  licenseValue: z.number().nullable().optional(),
  monthlyFee: z.number().nullable().optional(),
  minimumWagePercentage: z.number().nullable().optional(),
  expectedCloseAt: z.string().nullable().optional(),
  nextStep: z.string().nullable().optional(),
  qualificationNotes: z.string().nullable().optional(),
  lostReason: z.string().nullable().optional(),
  convertedCompanyId: z.string().nullable().optional(),
  convertedCompanyName: z.string().nullable().optional(),
  activities: z.array(crmActivitySchema).optional().default([]),
  tasks: z.array(crmTaskSchema).optional().default([]),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const crmLeadCreateSchema = crmLeadMutableFieldsSchema.extend({
  stage: crmLeadStageSchema.default("LEAD"),
  source: crmLeadSourceSchema.default("MANUAL"),
});

export const crmLeadUpdateSchema = crmLeadMutableFieldsSchema.partial().refine(
  (input) => Object.keys(input).length > 0,
  { message: "Informe ao menos um campo para atualizar." },
);

export const crmLeadListFiltersSchema = paginationQuerySchema.extend({
  q: z.string().trim().optional(),
  stage: crmLeadStageSchema.optional(),
  source: crmLeadSourceSchema.optional(),
  ownerUserId: z.string().trim().optional(),
});

export const crmLeadListResponseSchema = z.object({
  success: z.boolean(),
  data: z.array(crmLeadSchema),
  pagination: paginationMetaSchema.optional(),
  error: z.string().optional(),
  message: z.string().optional(),
});

export const crmLeadResponseSchema = z.object({
  success: z.boolean(),
  data: crmLeadSchema.optional(),
  error: z.string().optional(),
  message: z.string().optional(),
});

export const crmLeadContactOptionSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string().nullable().optional(),
  phone: z.string().nullable().optional(),
  whatsapp: z.string().nullable().optional(),
  companies: z.array(z.string()),
});

export const crmSupportDataSchema = z.object({
  contacts: z.array(crmLeadContactOptionSchema),
});

export const crmSupportDataResponseSchema = z.object({
  success: z.boolean(),
  data: crmSupportDataSchema.optional(),
  error: z.string().optional(),
  message: z.string().optional(),
});

export type CrmLeadStage = z.output<typeof crmLeadStageSchema>;
export type CrmLeadSource = z.output<typeof crmLeadSourceSchema>;
export type CrmLead = z.output<typeof crmLeadSchema>;
export type CrmLeadCreateInput = z.output<typeof crmLeadCreateSchema>;
export type CrmLeadUpdateInput = z.output<typeof crmLeadUpdateSchema>;
export type CrmLeadListFilters = z.output<typeof crmLeadListFiltersSchema>;
export type CrmLeadListResponse = z.output<typeof crmLeadListResponseSchema>;
export type CrmLeadResponse = z.output<typeof crmLeadResponseSchema>;
export type CrmLeadManualContact = z.output<typeof crmLeadManualContactSchema>;
export type CrmLeadContactOption = z.output<typeof crmLeadContactOptionSchema>;
export type CrmSupportData = z.output<typeof crmSupportDataSchema>;
export type CrmSupportDataResponse = z.output<typeof crmSupportDataResponseSchema>;
export type CrmActivityType = z.output<typeof crmActivityTypeSchema>;
export type CrmActivity = z.output<typeof crmActivitySchema>;
export type CrmTaskStatus = z.output<typeof crmTaskStatusSchema>;
export type CrmTask = z.output<typeof crmTaskSchema>;
