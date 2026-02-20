// src/core/application/schema/contract-schema.ts

import { z } from "zod"
import { ContractStatus } from "@prisma/client"

export const createContractSchema = z
  .object({
    companyId: z.string().min(1, "Selecione uma empresa."),

    percentage: z.coerce
      .number()
      .min(0.01, "O percentual deve ser maior que 0.")
      .max(100, "O percentual não pode exceder 100%."),

    minimumWage: z.coerce.number().min(1, "O salário mínimo deve ser informado."),

    taxRate: z.coerce
      .number()
      .min(0, "A taxa não pode ser negativa.")
      .max(100, "Imposto não pode exceder 100%."),

    programmerRate: z.coerce
      .number()
      .min(0, "A taxa não pode ser negativa.")
      .max(100, "Repasse Dev não pode exceder 100%."),

    startDate: z.string()
      .min(1, "Data de início obrigatória")
      .transform((val) => new Date(val)),

    endDate: z.string()
      .optional()
      .transform((val) => (val ? new Date(val) : undefined)),

    status: z.nativeEnum(ContractStatus).default("ACTIVE"),

    // Número de referência interna (ex: "CTR-2025-001")
    contractNumber: z.string().optional(),

    // Observações / notas internas do contrato
    notes: z.string().max(1000, "Máximo 1000 caracteres.").optional(),
  })
  // Validação cruzada: soma das deduções não pode ultrapassar 100%
  .refine(
    (data) => (data.taxRate ?? 0) + (data.programmerRate ?? 0) <= 100,
    {
      message: "A soma de Impostos + Repasse Dev não pode ultrapassar 100%.",
      path: ["programmerRate"],
    }
  )
  // Validação cruzada: endDate deve ser após startDate
  .refine(
    (data) => {
      if (!data.endDate) return true
      return data.endDate > new Date(data.startDate)
    },
    {
      message: "Data de encerramento deve ser posterior à data de início.",
      path: ["endDate"],
    }
  )

export const updateContractSchema = createContractSchema.partial().extend({
  id: z.string().min(1, "ID do contrato obrigatório."),
})

export type CreateContractInput = z.infer<typeof createContractSchema>
export type UpdateContractInput = z.infer<typeof updateContractSchema>