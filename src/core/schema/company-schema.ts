import { z } from "zod";

// Definindo o Enum igual ao do Prisma para validação
export const TaxRegimeEnum = z.enum([
  "SIMPLES_NACIONAL",
  "SIMPLES_NACIONAL_EXCESSO",
  "LUCRO_PRESUMIDO",
  "LUCRO_REAL",
  "MEI"
]);

export const createCompanySchema = z.object({
  // --- DADOS PRINCIPAIS ---
  cnpj: z.string().min(14, "CNPJ inválido").max(18, "CNPJ inválido"),
  razaoSocial: z.string().min(3, "Razão Social é obrigatória"),
  nomeFantasia: z.string().optional(),

  // --- DADOS DE CONTATO ---
  emailContato: z.string().email("E-mail inválido").optional().or(z.literal("")),
  telefone: z.string().optional(),
  website: z.string().url("URL inválida").optional().or(z.literal("")), // Novo

  // --- DADOS FISCAIS ---
  inscricaoEstadual: z.string().optional(),
  inscricaoMunicipal: z.string().optional(),
  regimeTributario: TaxRegimeEnum.optional(),

  // --- ENDEREÇO ---
  cep: z.string().optional(),
  logradouro: z.string().optional(),
  numero: z.string().optional(),
  complemento: z.string().optional(),
  bairro: z.string().optional(),
  cidade: z.string().optional(),
  estado: z.string().length(2, "UF deve ter 2 letras").optional().or(z.literal("")),

  // --- VÍNCULOS E EXTRAS ---
  // ID da contabilidade (se houver). Se vier string vazia, tratamos como undefined.
  accountingFirmId: z.string().optional().or(z.literal("")),
  observacoes: z.string().optional(),
});

export type CreateCompanyInput = z.infer<typeof createCompanySchema>;