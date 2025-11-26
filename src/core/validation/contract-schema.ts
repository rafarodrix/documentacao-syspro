import { z } from "zod";

export const createContractSchema = z.object({
    companyId: z.string().min(1, "Selecione uma empresa."),
    percentage: z.coerce.number().min(0.1, "O percentual deve ser maior que 0."),
    minimumWage: z.coerce.number().min(1, "O salário mínimo deve ser informado."),
    taxRate: z.coerce.number().min(0, "A taxa de imposto não pode ser negativa.").default(0),
    startDate: z.string().optional(), // Pode vir como string do input date
    status: z.enum(["ACTIVE", "CANCELLED", "SUSPENDED"]).default("ACTIVE"),
});

export type CreateContractInput = z.infer<typeof createContractSchema>;