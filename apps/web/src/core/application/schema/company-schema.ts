import { z } from "zod";
import { TaxRegime, CompanyStatus, IndicadorIE, CompanySegment } from "@prisma/client";

const emptyToUndefined = z.preprocess(
  (val) => (val === "" || val === null ? undefined : val),
  z.string().optional()
);

/**
 * Schema do Endereco
 */
export const addressSchema = z.object({
  description: emptyToUndefined.default("Sede"),
  cep: z
    .string()
    .min(8, "CEP incompleto")
    .transform((v) => v.replace(/\D/g, "")),
  logradouro: z.string().min(1, "Logradouro ? obrigatorio"),
  numero: z.string().min(1, "N?mero ? obrigatorio"),
  complemento: emptyToUndefined,
  bairro: z.string().min(1, "Bairro ? obrigatorio"),
  cidade: z.string().min(1, "Cidade ? obrigatoria"),
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
    razaoSocial: z.string().min(3, "Raz?o Social ? obrigatoria").trim(),
    nomeFantasia: emptyToUndefined,
    segment: z.nativeEnum(CompanySegment).nullable().optional(),
    status: z.nativeEnum(CompanyStatus).default(CompanyStatus.ACTIVE),
    logoUrl: emptyToUndefined.pipe(z.string().url("URL inv?lida").optional()),

    // HIERARQUIA E RELACOES
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
    emailContato: emptyToUndefined.pipe(z.string().email("E-mail invalido").optional()),
    emailFinanceiro: emptyToUndefined.pipe(z.string().email("E-mail invalido").optional()),
    telefone: emptyToUndefined,
    whatsapp: emptyToUndefined,
    website: emptyToUndefined,

    // RELACAO ANINHADA (Objeto de endereco para criacao)
    address: addressSchema.optional().nullable().or(z.literal("")),
    observacoes: emptyToUndefined,
  })
  // 1a VALIDACAO: Regra do Endereco
  .refine(
    (data) => {
      if (data.address && typeof data.address === "object" && data.address.cep) {
        return !!data.address.logradouro && !!data.address.numero;
      }
      return true;
    },
    {
      message: "Endereco incompleto. Preencha Logradouro e N?mero.",
      path: ["address"],
    }
  )
  // 2a VALIDACAO: Regra da Inscricao Estadual
  .refine(
    (data) => {
      if (data.indicadorIE === IndicadorIE.CONTRIBUINTE && !data.inscricaoEstadual) {
        return false;
      }
      return true;
    },
    {
      message: "Inscricao Estadual obrigatoria para Contribuintes",
      path: ["inscricaoEstadual"],
    }
  );

// Tipos para uso no Frontend (Input) e Backend (Output)
export type CreateCompanyInput = z.input<typeof createCompanySchema>;
export type CreateCompanyOutput = z.output<typeof createCompanySchema>;
