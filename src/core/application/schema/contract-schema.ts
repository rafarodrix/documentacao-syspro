import { z } from "zod";
import { ContractStatus } from "@prisma/client";

export const DEFAULT_CONTRACT_TAX_RATE = 6;

export const createContractSchema = z
  .object({
    companyId: z.string().min(1, "Selecione uma empresa."),
    percentage: z.coerce.number().min(0.01, "O percentual deve ser maior que 0.").max(100, "O percentual nao pode exceder 100%."),
    minimumWage: z.coerce.number().min(1, "O salario minimo deve ser informado."),
    taxRate: z.coerce.number().min(0, "A taxa nao pode ser negativa.").max(100, "Imposto nao pode exceder 100%."),
    programmerRate: z.coerce.number().min(0, "A taxa nao pode ser negativa.").max(100, "Repasse nao pode exceder 100%."),
    startDate: z.string().min(1, "Data de inicio obrigatoria"),
    endDate: z.string().optional(),
    status: z.nativeEnum(ContractStatus).default("ACTIVE"),
    contractNumber: z.string().max(80, "Maximo 80 caracteres.").optional(),
    notes: z.string().max(1000, "Maximo 1000 caracteres.").optional(),
    allowTaxOverride: z.boolean().optional().default(false),
  })
  .refine((data) => (data.taxRate ?? 0) + (data.programmerRate ?? 0) <= 100, {
    message: "A soma de Impostos + Repasse nao pode ultrapassar 100%.",
    path: ["programmerRate"],
  })
  .refine((data) => {
    if (!data.endDate) return true;
    return new Date(data.endDate) > new Date(data.startDate);
  }, {
    message: "Data de encerramento deve ser posterior a data de inicio.",
    path: ["endDate"],
  });

export const updateContractSchema = createContractSchema.extend({
  id: z.string().min(1, "ID do contrato obrigatorio."),
});

export type CreateContractInput = z.infer<typeof createContractSchema>;
export type UpdateContractInput = z.infer<typeof updateContractSchema>;
