import { z } from "zod";
import { ContractStatus } from "@prisma/client";

export const createContractSchema = z.object({
    companyId: z.string().min(1, "Selecione uma empresa."),

    // Coerce converte string "10.5" para number 10.5
    // Usamos number no Zod, mas o Prisma vai salvar como Decimal
    percentage: z.coerce.number()
        .min(0.01, "O percentual deve ser maior que 0."),

    minimumWage: z.coerce.number()
        .min(1, "O salário mínimo deve ser informado."),

    taxRate: z.coerce.number()
        .min(0, "A taxa não pode ser negativa")
        .default(0),

    programmerRate: z.coerce.number()
        .min(0, "A taxa não pode ser negativa")
        .default(0),

    // TRANSFORM: Converte String do Input HTML -> Date do JS
    startDate: z.string()
        .min(1, "Data de início obrigatória")
        .transform((val) => new Date(val)), // "2024-01-01" -> Date Object

    // Opcional: Se vier vazio, vira undefined (contrato sem fim)
    endDate: z.string()
        .optional()
        .transform((val) => (val ? new Date(val) : undefined)),

    // Sincronia com Banco de Dados
    status: z.nativeEnum(ContractStatus).default("ACTIVE"),
});

export type CreateContractInput = z.infer<typeof createContractSchema>;