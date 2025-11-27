import { z } from "zod";

// Schema para configurações do sistema
export const settingsSchema = z.object({
    minimumWage: z.coerce.number().min(1, "O valor deve ser maior que zero."),
    maintenanceMode: z.boolean(),
    supportEmail: z.string().email("E-mail inválido."),
    supportPhone: z.string().min(10, "Telefone inválido (mínimo 10 dígitos)."),
});

// Tipos de entrada para configurações
export type SettingsInput = z.infer<typeof settingsSchema>;

// Chaves usadas no Banco de Dados (para evitar erro de digitação)
export const SETTING_KEYS = {
    MIN_WAGE: "minimumWage",
    MAINTENANCE: "maintenanceMode",
    SUPPORT_EMAIL: "supportEmail",
    SUPPORT_PHONE: "supportPhone",
} as const;

// Schema para criação de contratos
export const createContractSchema = z.object({
    companyId: z.string().min(1, "Selecione uma empresa."),
    percentage: z.coerce.number().min(0.1, "Percentual inválido."),
    minimumWage: z.coerce.number().min(1, "Valor inválido."),
    taxRate: z.coerce.number().min(0).default(0),
    programmerRate: z.coerce.number().min(0).default(0),
    status: z.enum(["ACTIVE", "CANCELLED", "SUSPENDED"]).default("ACTIVE"),
    startDate: z.string().optional(),
});

export type CreateContractInput = z.infer<typeof createContractSchema>;