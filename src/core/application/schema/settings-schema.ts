import { z } from "zod";

export const settingsSchema = z.object({
    minimumWage: z.coerce.number().min(1, "O valor deve ser maior que zero."),
    maintenanceMode: z.boolean(),
    supportEmail: z.string().email("E-mail invalido."),
    supportPhone: z.string().min(10, "Telefone invalido (minimo 10 digitos)."),
    rbacMatrixEnabled: z.boolean().default(true),
});

export type SettingsInput = z.infer<typeof settingsSchema>;

export const SETTING_KEYS = {
    MIN_WAGE: "minimumWage",
    MAINTENANCE: "maintenanceMode",
    SUPPORT_EMAIL: "supportEmail",
    SUPPORT_PHONE: "supportPhone",
    RBAC_MATRIX_ENABLED: "rbacMatrixEnabled",
} as const;
