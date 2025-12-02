import { z } from "zod";
import { TaxRegime } from "@prisma/client";

// Helper para converter string vazia ("") em undefined para o Prisma ignorar
const emptyToUndefined = z.string().transform((val) => val === "" ? undefined : val);

export const createCompanySchema = z.object({
  // --- DADOS PRINCIPAIS ---
  cnpj: z.string()
    .min(14, "CNPJ incompleto")
    .max(18, "CNPJ inválido")
    .transform((val) => val.replace(/\D/g, "")),

  razaoSocial: z.string()
    .min(3, "Razão Social é obrigatória")
    .trim(),

  nomeFantasia: z.string().optional().or(emptyToUndefined),

  // Data de Fundação recebe string do input date ("2023-10-25") e converte para Date do JS para o Prisma
  dataFundacao: z.string()
    .optional()
    .or(z.literal(""))
    .transform((val) => (val ? new Date(val) : undefined)),

  // --- DADOS DE CONTATO ---
  emailContato: z.string()
    .email("E-mail inválido")
    .optional()
    .or(z.literal("")),

  // Email Financeiro
  emailFinanceiro: z.string()
    .email("E-mail financeiro inválido")
    .optional()
    .or(z.literal("")),

  telefone: z.string().optional().or(emptyToUndefined),

  website: z.string().url("URL inválida").optional().or(z.literal("")),

  // --- DADOS FISCAIS ---
  inscricaoEstadual: z.string().optional().or(emptyToUndefined),
  inscricaoMunicipal: z.string().optional().or(emptyToUndefined),

  // CNAE e Suframa
  cnae: z.string().optional().or(emptyToUndefined),
  codSuframa: z.string().optional().or(emptyToUndefined),

  regimeTributario: z.nativeEnum(TaxRegime).optional(),

  // --- ENDEREÇO ---
  cep: z.string().optional().or(emptyToUndefined),
  logradouro: z.string().optional().or(emptyToUndefined),
  numero: z.string().optional().or(emptyToUndefined),
  complemento: z.string().optional().or(emptyToUndefined),
  bairro: z.string().optional().or(emptyToUndefined),
  cidade: z.string().optional().or(emptyToUndefined),

  estado: z.string()
    .length(2, "UF deve ter 2 letras")
    .toUpperCase()
    .optional()
    .or(z.literal("")),

  // --- VÍNCULOS E EXTRAS ---
  accountingFirmId: z.string().optional().transform(val => val || undefined),

  observacoes: z.string().optional(),
});

export type CreateCompanyInput = z.infer<typeof createCompanySchema>;