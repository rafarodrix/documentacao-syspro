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

export type MonthlyRoutineCandidateStatus = z.output<typeof monthlyRoutineCandidateStatusSchema>;
export type MonthlyRoutineExecutionStatus = z.output<typeof monthlyRoutineExecutionStatusSchema>;
export type MonthlyRoutineListQuery = z.output<typeof monthlyRoutineListQuerySchema>;
export type MonthlyRoutineSummary = z.output<typeof monthlyRoutineSummarySchema>;
export type MonthlyRoutineCompanyItem = z.output<typeof monthlyRoutineCompanyItemSchema>;
export type MonthlyRoutineListResponse = z.output<typeof monthlyRoutineListResponseSchema>;
export type MonthlyRoutineContactOption = z.output<typeof monthlyRoutineContactOptionSchema>;
export type MonthlyRoutineCompanyConfig = z.output<typeof monthlyRoutineCompanyConfigSchema>;
export type MonthlyRoutineCompanyConfigUpsertInput = z.output<typeof monthlyRoutineCompanyConfigUpsertSchema>;
export type MonthlyRoutineCompanyConfigView = z.output<typeof monthlyRoutineCompanyConfigViewSchema>;
