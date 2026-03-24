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

export const COMPANY_SERVER_TYPE_VALUES = ["SYSPRO_SERVER", "IIS"] as const;
export const COMPANY_SERVER_PROTOCOL_VALUES = ["HTTP", "HTTPS"] as const;
export const COMPANY_REMOTE_CONNECTION_TYPE_VALUES = ["DDNS_NOIP", "RADMIN_VPN"] as const;

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

const companyRemoteConnectionSchema = z.object({
  type: z.enum(COMPANY_REMOTE_CONNECTION_TYPE_VALUES),
  details: z.string().trim().min(1, "Informe o nome/IP/identificacao da conexao remota"),
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
    serverType: z.enum(COMPANY_SERVER_TYPE_VALUES).default("SYSPRO_SERVER"),
    serverPort: z.coerce.number().int().min(1, "Porta obrigatoria").default(1234),
    serverHost: z.string().trim().min(1, "Servidor obrigatorio").default("localhost"),
    serverProtocol: z.enum(COMPANY_SERVER_PROTOCOL_VALUES).default("HTTP"),
    iisIsapiPath: emptyToUndefined.default("SYSPROSERVERISAPI.DLL"),
    installationDirectory: z.string().trim().min(1, "Diretorio da instalacao obrigatorio"),
    remoteConnections: z.array(companyRemoteConnectionSchema).default([]),
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
  )
  .refine(
    (data) => {
      if (data.serverType === "IIS") {
        return Boolean(data.iisIsapiPath?.trim());
      }
      return true;
    },
    {
      message: "Informe o arquivo ISAPI quando o tipo de servidor for IIS.",
      path: ["iisIsapiPath"],
    }
  );

export type CreateCompanyInput = z.input<typeof createCompanySchema>;
export type CreateCompanyOutput = z.output<typeof createCompanySchema>;
