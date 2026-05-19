import { z } from "zod";

export const CONTRACT_STATUS_VALUES = ["ACTIVE", "CANCELLED", "SUSPENDED"] as const;
export const contractStatusSchema = z.enum(CONTRACT_STATUS_VALUES);

export const DEFAULT_CONTRACT_TAX_RATE = 6;

export const createContractSchema = z
  .object({
    companyId: z.string().min(1, "Selecione uma empresa."),
    percentage: z.coerce.number().min(0.0001, "O percentual deve ser maior que 0.").max(100, "O percentual nao pode exceder 100%."),
    minimumWage: z.coerce.number().min(1, "O salario minimo deve ser informado."),
    taxRate: z.coerce.number().min(0, "A taxa nao pode ser negativa.").max(100, "Imposto nao pode exceder 100%."),
    programmerRate: z.coerce.number().min(0, "A taxa nao pode ser negativa.").max(100, "Repasse nao pode exceder 100%."),
    startDate: z.string().min(1, "Data de inicio obrigatoria"),
    endDate: z.string().optional(),
    status: contractStatusSchema.default("ACTIVE"),
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

export const updateContractSchema = z
  .object({
    id: z.string().min(1, "ID do contrato obrigatorio."),
    companyId: z.string().min(1, "Selecione uma empresa."),
    percentage: z.coerce.number().min(0.0001, "O percentual deve ser maior que 0.").max(100, "O percentual nao pode exceder 100%."),
    minimumWage: z.coerce.number().min(1, "O salario minimo deve ser informado."),
    taxRate: z.coerce.number().min(0, "A taxa nao pode ser negativa.").max(100, "Imposto nao pode exceder 100%."),
    programmerRate: z.coerce.number().min(0, "A taxa nao pode ser negativa.").max(100, "Repasse nao pode exceder 100%."),
    startDate: z.string().min(1, "Data de inicio obrigatoria"),
    status: contractStatusSchema,
    allowTaxOverride: z.boolean().optional().default(false),
    endDate: z.string().nullable().optional(),
    contractNumber: z.string().max(80, "Maximo 80 caracteres.").nullable().optional(),
    notes: z.string().max(1000, "Maximo 1000 caracteres.").nullable().optional(),
  })
  .refine(
    (data) => data.taxRate + data.programmerRate <= 100,
    {
      message: "A soma de Impostos + Repasse nao pode ultrapassar 100%.",
      path: ["programmerRate"],
    },
  )
  .refine(
    (data) => {
      if (!data.endDate) return true;
      return new Date(data.endDate) > new Date(data.startDate);
    },
    {
      message: "Data de encerramento deve ser posterior a data de inicio.",
      path: ["endDate"],
    },
  );

export const contractCompanyOptionSchema = z.object({
  id: z.string().min(1),
  razaoSocial: z.string().min(1),
  cnpj: z.string().min(1),
});

export const contractListItemSchema = z.object({
  id: z.string().min(1),
  companyId: z.string().min(1),
  percentage: z.number(),
  minimumWage: z.number(),
  taxRate: z.number(),
  programmerRate: z.number(),
  contractNumber: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
  status: contractStatusSchema,
  startDate: z.string().min(1),
  endDate: z.string().nullable().optional(),
  createdAt: z.string().min(1),
  updatedAt: z.string().min(1),
  company: contractCompanyOptionSchema,
});

export const contractsAdminViewSchema = z.object({
  contracts: z.array(contractListItemSchema),
  companies: z.array(contractCompanyOptionSchema),
});

export const contractSystemParamsSchema = z.object({
  minimumWage: z.number(),
});

export const contractSuspendImpactSchema = z.object({
  companyName: z.string(),
  willBlockCompany: z.boolean(),
  blockedUsersCount: z.number(),
  totalLinkedUsers: z.number(),
});

export const batchReadjustContractsSchema = z.object({
  minimumWage: z.coerce.number().min(1, "Valor do novo salario minimo invalido."),
});

export type ContractStatusValue = z.infer<typeof contractStatusSchema>;
export type CreateContractInput = z.input<typeof createContractSchema>;
export type CreateContractOutput = z.output<typeof createContractSchema>;
export type UpdateContractInput = z.input<typeof updateContractSchema>;
export type UpdateContractOutput = z.output<typeof updateContractSchema>;
export type ContractCompanyOption = z.infer<typeof contractCompanyOptionSchema>;
export type ContractListItem = z.infer<typeof contractListItemSchema>;
export type ContractsAdminView = z.infer<typeof contractsAdminViewSchema>;
export type ContractSystemParams = z.infer<typeof contractSystemParamsSchema>;
export type ContractSuspendImpact = z.infer<typeof contractSuspendImpactSchema>;
export type BatchReadjustContractsInput = z.infer<typeof batchReadjustContractsSchema>;
