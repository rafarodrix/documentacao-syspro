// src\core\application\schema\company-schema.ts
import { z } from "zod";
import { TaxRegime, CompanyStatus, IndicadorIE } from "@prisma/client";

const emptyToUndefined = z.string().transform((val) => (val === "" ? undefined : val));

export const addressSchema = z.object({
  description: z.string().optional().default("Sede"),
  cep: z.string().min(8, "CEP incompleto").transform((v) => v.replace(/\D/g, "")),
  logradouro: z.string().min(1, "Logradouro é obrigatório"),
  numero: z.string().min(1, "Número é obrigatório"),
  complemento: z.string().optional().or(emptyToUndefined),
  bairro: z.string().min(1, "Bairro é obrigatório"),
  cidade: z.string().min(1, "Cidade é obrigatória"),
  estado: z.string().length(2, "UF deve ter 2 letras").toUpperCase(),
  pais: z.string().default("BR"),
  codigoIbgeCidade: z.string().optional().or(emptyToUndefined),
  codigoIbgeEstado: z.string().optional().or(emptyToUndefined),
});

export const createCompanySchema = z.object({
  cnpj: z.string()
    .min(14, "CNPJ incompleto")
    .max(18, "CNPJ inválido")
    .transform((val) => val.replace(/\D/g, "")),
  razaoSocial: z.string().min(3, "Razão Social é obrigatória").trim(),
  nomeFantasia: z.string().optional().or(emptyToUndefined),
  status: z.nativeEnum(CompanyStatus).default(CompanyStatus.ACTIVE),
  logoUrl: z.string().url("URL do logo inválida").optional().or(emptyToUndefined),
  parentCompanyId: z.string().optional().or(emptyToUndefined),
  regimeTributario: z.nativeEnum(TaxRegime).optional().nullable(),
  crt: z.string().optional().or(emptyToUndefined),
  indicadorIE: z.nativeEnum(IndicadorIE).default(IndicadorIE.NAO_CONTRIBUINTE),
  inscricaoEstadual: z.string().optional().or(emptyToUndefined),
  inscricaoMunicipal: z.string().optional().or(emptyToUndefined),
  cnae: z.string().optional().or(emptyToUndefined),
  codSuframa: z.string().optional().or(emptyToUndefined),
  dataFundacao: z.string()
    .optional()
    .or(z.literal(""))
    .transform((val) => (val ? new Date(val) : undefined)),
  emailContato: z.string().email("E-mail inválido").optional().or(z.literal("")),
  emailFinanceiro: z.string().email("E-mail financeiro inválido").optional().or(z.literal("")),
  telefone: z.string().optional().or(emptyToUndefined),
  whatsapp: z.string().optional().or(emptyToUndefined),
  website: z.string().url("URL inválida").optional().or(z.literal("")),
  address: addressSchema.optional(),
  accountingFirmId: z.string().optional().or(emptyToUndefined),
  observacoes: z.string().optional().or(emptyToUndefined),
}).refine((data) => {
  if (data.indicadorIE === "CONTRIBUINTE" && !data.inscricaoEstadual) return false;
  return true;
}, {
  message: "Inscrição Estadual obrigatória para Contribuintes",
  path: ["inscricaoEstadual"],
});

// CreateCompanyInput: Usado pelo React Hook Form (Tipos de entrada/Strings)
export type CreateCompanyInput = z.input<typeof createCompanySchema>;

// CreateCompanyOutput: Usado pela Server Action/Prisma (Tipos transformados/Date/Numbers)
export type CreateCompanyOutput = z.output<typeof createCompanySchema>;