import { z } from "zod";
import { TaxRegime, CompanyStatus, IndicadorIE } from "@prisma/client";

const emptyToUndefined = z.preprocess(
  (val) => (val === "" || val === null ? undefined : val),
  z.string().optional()
);

/**
 * Schema do Endereço
 */
export const addressSchema = z.object({
  description: z.string().min(1, "Descrição é obrigatória").default("Sede"),
  cep: z
    .string()
    .min(8, "CEP incompleto")
    .transform((v) => v.replace(/\D/g, "")),
  logradouro: z.string().min(1, "Logradouro é obrigatório"),
  numero: z.string().min(1, "Número é obrigatório"),
  complemento: emptyToUndefined,
  bairro: z.string().min(1, "Bairro é obrigatório"),
  cidade: z.string().min(1, "Cidade é obrigatória"),
  estado: z.string().length(2, "UF deve ter 2 letras").toUpperCase(),
  pais: z.string().default("BR"),
  codigoIbgeCidade: emptyToUndefined,
  codigoIbgeEstado: emptyToUndefined,
});

/**
 * Schema Principal da Empresa
 */
export const createCompanySchema = z
  .object({
    // DADOS PRINCIPAIS
    cnpj: z
      .string()
      .min(14, "CNPJ incompleto")
      .transform((val) => val.replace(/\D/g, "")),
    razaoSocial: z.string().min(3, "Razão Social é obrigatória").trim(),
    nomeFantasia: emptyToUndefined,
    status: z.nativeEnum(CompanyStatus).default(CompanyStatus.ACTIVE),
    logoUrl: emptyToUndefined.pipe(z.string().url("URL inválida").optional()),

    // HIERARQUIA E RELAÇÕES
    parentCompanyId: emptyToUndefined,
    accountingFirmId: emptyToUndefined,

    // DADOS FISCAIS
    regimeTributario: z.nativeEnum(TaxRegime).nullable().optional(),
    crt: emptyToUndefined, // Código de Regime Tributário (1, 2, 3 ou 4)
    indicadorIE: z.nativeEnum(IndicadorIE).default(IndicadorIE.NAO_CONTRIBUINTE),
    inscricaoEstadual: emptyToUndefined,
    inscricaoMunicipal: emptyToUndefined,
    cnae: emptyToUndefined,
    codSuframa: emptyToUndefined,
    dataFundacao: z.preprocess(
      (val) => (val === "" || val === null ? undefined : val),
      z.coerce.date().optional()
    ),

    // CONTATO
    emailContato: emptyToUndefined.pipe(z.string().email("E-mail inválido").optional()),
    emailFinanceiro: emptyToUndefined.pipe(z.string().email("E-mail inválido").optional()),
    telefone: emptyToUndefined,
    whatsapp: emptyToUndefined,
    website: emptyToUndefined,

    // RELAÇÃO ANINHADA (Objeto de endereço para criação inicial)
    address: addressSchema.optional(),

    // EXTRAS
    observacoes: emptyToUndefined,
  })
  .refine(
    (data) => {
      // Regra de negócio: Se for contribuinte, a IE é obrigatória
      if (data.indicadorIE === IndicadorIE.CONTRIBUINTE && !data.inscricaoEstadual) {
        return false;
      }
      return true;
    },
    {
      message: "Inscrição Estadual obrigatória para Contribuintes",
      path: ["inscricaoEstadual"],
    }
  );

// Tipos para uso no Frontend (Input) e Backend (Output)
export type CreateCompanyInput = z.input<typeof createCompanySchema>;
export type CreateCompanyOutput = z.output<typeof createCompanySchema>;