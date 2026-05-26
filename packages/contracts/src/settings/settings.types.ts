import { z } from "zod";
import {
  CONTRACT_BLOCK_REASON_LABEL,
  CONTRACT_BLOCK_REASONS,
  ENTITY_INACTIVATION_REASON_LABEL,
  ENTITY_INACTIVATION_REASON_VALUES,
} from "@dosc-syspro/core";

const settingsReasonOptionSchema = <T extends readonly [string, ...string[]]>(keys: T) =>
  z.object({
    key: z.enum(keys),
    label: z.string().trim().min(1, "Informe o rotulo do motivo."),
    isActive: z.boolean().default(true),
    requiresDetails: z.boolean().default(false),
  });

export const companyInactivationReasonOptionSchema = settingsReasonOptionSchema(ENTITY_INACTIVATION_REASON_VALUES);
export const contractBlockReasonOptionSchema = settingsReasonOptionSchema(CONTRACT_BLOCK_REASONS);

export const DEFAULT_COMPANY_INACTIVATION_REASON_OPTIONS = ENTITY_INACTIVATION_REASON_VALUES.map((key) => ({
  key,
  label: ENTITY_INACTIVATION_REASON_LABEL[key],
  isActive: true,
  requiresDetails: key === "OUTROS",
})) as Array<z.infer<typeof companyInactivationReasonOptionSchema>>;

export const DEFAULT_CONTRACT_BLOCK_REASON_OPTIONS = CONTRACT_BLOCK_REASONS.map((key) => ({
  key,
  label: CONTRACT_BLOCK_REASON_LABEL[key],
  isActive: true,
  requiresDetails: key === "OUTROS",
})) as Array<z.infer<typeof contractBlockReasonOptionSchema>>;

export const settingsPreferencesSchema = z.object({
  companyInactivationReasons: z.array(companyInactivationReasonOptionSchema).min(1),
  contractBlockReasons: z.array(contractBlockReasonOptionSchema).min(1),
});

export const settingsSchema = z.object({
  minimumWage: z.coerce.number().min(1, "O valor deve ser maior que zero."),
  maintenanceMode: z.boolean(),
  supportSiteUrl: z.url("URL do site invalida."),
  supportEmail: z.email("E-mail invalido."),
  supportPhone: z.string().min(10, "Telefone invalido (minimo 10 digitos)."),
  rbacMatrixEnabled: z.boolean().default(true),
  preferences: settingsPreferencesSchema.default({
    companyInactivationReasons: DEFAULT_COMPANY_INACTIVATION_REASON_OPTIONS,
    contractBlockReasons: DEFAULT_CONTRACT_BLOCK_REASON_OPTIONS,
  }),
});

export type SettingsInput = z.input<typeof settingsSchema>;
export type SettingsOutput = z.output<typeof settingsSchema>;
export type SettingsPreferencesOutput = z.output<typeof settingsPreferencesSchema>;
export type CompanyInactivationReasonOption = z.output<typeof companyInactivationReasonOptionSchema>;
export type ContractBlockReasonOption = z.output<typeof contractBlockReasonOptionSchema>;

export const SETTING_KEYS = {
  MIN_WAGE: "minimumWage",
  MAINTENANCE: "maintenanceMode",
  SUPPORT_SITE_URL: "supportSiteUrl",
  SUPPORT_EMAIL: "supportEmail",
  SUPPORT_PHONE: "supportPhone",
  RBAC_MATRIX_ENABLED: "rbacMatrixEnabled",
  PREFERENCES: "generalPreferences",
  SEFAZ_ROUTES: "sefazRoutes",
  INTERSTATE_ICMS: "interstateIcmsSettings",
} as const;
