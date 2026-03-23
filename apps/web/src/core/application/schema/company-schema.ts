import { z } from "zod";
import { TaxRegime, CompanyStatus, IndicadorIE, CompanySegment } from "@prisma/client";

const emptyToUndefined = z.preprocess(
  (val) => (val === "" || val === null ? undefined : val),
  z.string().optional()
);

/**
 * Schema do Endere?o
 */
export const addressSchema = z.object({
  description: emptyToUndefined.default("Sede"),
  cep: z
    .string()
    .min(8, "CEP incompleto")
    .transform((v) => v.replace(/\D/g, "")),
  logradouro: z.string().min(1, "Logradouro ? obrigat?rio"),
  numero: z.string().min(1, "N?mero ? obrigat?rio"),
  complemento: emptyToUndefined,
  bairro: z.string().min(1, "Bairro ? obrigat?rio"),
  cidade: z.string().min(1, "Cidade ? obrigat?ria"),
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
    razaoSocial: z.string().min(3, "Raz?o Social ? obrigat?ria").trim(),
    nomeFantasia: emptyToUndefined,
    segment: z.nativeEnum(CompanySegment).nullable().optional(),
    status: z.nativeEnum(CompanyStatus).default(CompanyStatus.ACTIVE),
    logoUrl: emptyToUndefined.pipe(z.string().url("URL inv?lida").optional()),

    // HIERARQUIA E RELA??ES
    parentCompanyId: emptyToUndefined,
    accountingFirmId: emptyToUndefined,

    // DADOS FISCAIS
    regimeTributario: z.nativeEnum(TaxRegime).nullable().optional(),
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
    emailContato: emptyToUndefined.pipe(z.string().email("E-mail inv?lido").optional()),
    emailFinanceiro: emptyToUndefined.pipe(z.string().email("E-mail inv?lido").optional()),
    telefone: emptyToUndefined,
    whatsapp: emptyToUndefined,
    website: emptyToUndefined,

    // RELA??O ANINHADA (Objeto de endere?o para cria??o)
    address: addressSchema.optional().nullable().or(z.literal("")),
    observacoes: emptyToUndefined,
  })
  // 1? VALIDA??O: Regra do Endere?o
  .refine(
    (data) => {
      if (data.address && typeof data.address === "object" && data.address.cep) {
        return !!data.address.logradouro && !!data.address.numero;
      }
      return true;
    },
    {
      message: "Endere?o incompleto. Preencha Logradouro e N?mero.",
      path: ["address"],
    }
  )
  // 2? VALIDA??O: Regra da Inscri??o Estadual
  .refine(
    (data) => {
      if (data.indicadorIE === IndicadorIE.CONTRIBUINTE && !data.inscricaoEstadual) {
        return false;
      }
      return true;
    },
    {
      message: "Inscri??o Estadual obrigat?ria para Contribuintes",
      path: ["inscricaoEstadual"],
    }
  );

// Tipos para uso no Frontend (Input) e Backend (Output)
export type CreateCompanyInput = z.input<typeof createCompanySchema>;
export type CreateCompanyOutput = z.output<typeof createCompanySchema>;
