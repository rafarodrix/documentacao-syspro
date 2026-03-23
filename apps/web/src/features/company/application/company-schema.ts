import { z } from "zod";
import {
  TaxRegime,
  CompanyStatus,
  IndicadorIE,
  CompanySegment,
  CompanyContactSource,
  CompanyContactStatus,
} from "@prisma/client";
import { addressSchema } from "@dosc-syspro/contracts";

const emptyToUndefined = z.preprocess(
  (val) => (val === "" || val === null ? undefined : val),
  z.string().optional()
);

const companyContactSchema = z.object({
  name: z.string().min(2, "Nome do contato obrigatorio").trim(),
  email: emptyToUndefined.pipe(z.string().email("E-mail invalido").optional()),
  phone: emptyToUndefined,
  whatsapp: emptyToUndefined,
  notes: emptyToUndefined,
  isPrimary: z.boolean().optional().default(false),
  source: z.nativeEnum(CompanyContactSource).optional().default(CompanyContactSource.MANUAL),
  status: z.nativeEnum(CompanyContactStatus).optional().default(CompanyContactStatus.LINKED),
});

export const createCompanySchema = z
  .object({
    cnpj: z
      .string()
      .min(14, "CNPJ incompleto")
      .transform((val) => val.replace(/\D/g, "")),
    razaoSocial: z.string().min(3, "Razao Social obrigatoria").trim(),
    nomeFantasia: emptyToUndefined,
    segment: z.nativeEnum(CompanySegment).nullable().optional(),
    status: z.nativeEnum(CompanyStatus).default(CompanyStatus.ACTIVE),
    logoUrl: emptyToUndefined.pipe(z.string().url("URL invalida").optional()),
    parentCompanyId: emptyToUndefined,
    accountingFirmId: emptyToUndefined,
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
    emailContato: emptyToUndefined.pipe(z.string().email("E-mail invalido").optional()),
    emailFinanceiro: emptyToUndefined.pipe(z.string().email("E-mail invalido").optional()),
    telefone: emptyToUndefined,
    whatsapp: emptyToUndefined,
    website: emptyToUndefined,
    address: addressSchema.optional().nullable().or(z.literal("")),
    observacoes: emptyToUndefined,
    contacts: z.array(companyContactSchema).optional().default([]),
  })
  .refine(
    (data) => {
      if (data.address && typeof data.address === "object" && data.address.cep) {
        return !!data.address.logradouro && !!data.address.numero;
      }
      return true;
    },
    {
      message: "Endereco incompleto. Preencha Logradouro e Numero.",
      path: ["address"],
    }
  )
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

export type CreateCompanyInput = z.input<typeof createCompanySchema>;
export type CreateCompanyOutput = z.output<typeof createCompanySchema>;
