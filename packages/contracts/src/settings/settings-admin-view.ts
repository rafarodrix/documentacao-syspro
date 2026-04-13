import { z } from "zod";
import { settingsPermissionKeySchema } from "./settings-permissions.js";

export const settingsContractCompanySchema = z.object({
  id: z.string().min(1),
  razaoSocial: z.string().min(1),
  cnpj: z.string().min(1),
});

export const settingsContractListItemSchema = z.object({
  id: z.string().min(1),
  companyId: z.string().min(1),
  percentage: z.number(),
  minimumWage: z.number(),
  taxRate: z.number(),
  programmerRate: z.number(),
  contractNumber: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
  status: z.enum(["ACTIVE", "CANCELLED", "SUSPENDED"]),
  startDate: z.string().min(1),
  endDate: z.string().nullable().optional(),
  createdAt: z.string().min(1),
  updatedAt: z.string().min(1),
  company: settingsContractCompanySchema,
});

export const settingsContractCompanyOptionSchema = z.object({
  id: z.string().min(1),
  razaoSocial: z.string().min(1),
  cnpj: z.string().min(1),
});

export const settingsContractsAdminViewSchema = z.object({
  contracts: z.array(settingsContractListItemSchema),
  companies: z.array(settingsContractCompanyOptionSchema),
});

export const settingsContractsAdminViewResponseSchema = z.object({
  success: z.boolean(),
  data: settingsContractsAdminViewSchema.optional(),
  error: z.string().optional(),
  message: z.string().optional(),
});

export const settingsRemoteAdminViewSchema = z.object({
  companyOptions: z.array(
    z.object({
      id: z.string().min(1),
      label: z.string().min(1),
    }),
  ),
});

export const settingsRemoteAdminViewResponseSchema = z.object({
  success: z.boolean(),
  data: settingsRemoteAdminViewSchema.optional(),
  error: z.string().optional(),
  message: z.string().optional(),
});

export const settingsAuthorizationContextSchema = z.object({
  userId: z.string().min(1),
  role: z.string().min(1),
  fallbackPermissions: z.array(settingsPermissionKeySchema),
  globalPermissions: z.array(settingsPermissionKeySchema),
  companyPermissions: z.record(z.string(), z.array(settingsPermissionKeySchema)),
  membershipCompanyIds: z.array(z.string().min(1)),
});

export const settingsAuthorizationContextResponseSchema = z.object({
  success: z.boolean(),
  data: settingsAuthorizationContextSchema.optional(),
  error: z.string().optional(),
  message: z.string().optional(),
});

export type SettingsContractCompany = z.infer<typeof settingsContractCompanySchema>;
export type SettingsContractListItem = z.infer<typeof settingsContractListItemSchema>;
export type SettingsContractCompanyOption = z.infer<typeof settingsContractCompanyOptionSchema>;
export type SettingsContractsAdminView = z.infer<typeof settingsContractsAdminViewSchema>;
export type SettingsContractsAdminViewResponse = z.infer<typeof settingsContractsAdminViewResponseSchema>;
export type SettingsRemoteAdminView = z.infer<typeof settingsRemoteAdminViewSchema>;
export type SettingsRemoteAdminViewResponse = z.infer<typeof settingsRemoteAdminViewResponseSchema>;
export type SettingsAuthorizationContext = z.infer<typeof settingsAuthorizationContextSchema>;
export type SettingsAuthorizationContextResponse = z.infer<typeof settingsAuthorizationContextResponseSchema>;
