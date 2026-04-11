import { z } from "zod";
import {
  TaxRegime,
  CompanyStatus,
  IndicadorIE,
  CompanySegment,
} from "@prisma/client";
import { addressSchema } from "./address";

const emptyToUndefined = z.preprocess(
  (val) => (val === "" || val === null ? undefined : val),
  z.string().optional(),
);

export const DEFAULT_COMPANY_SERVER_TYPE = "SYSPRO_SERVER" as const;
export const DEFAULT_COMPANY_SERVER_PROTOCOL = "HTTP" as const;
export const DEFAULT_COMPANY_SERVER_PORT = 1234;
export const DEFAULT_COMPANY_SERVER_HOST = "LOCALHOST";
export const DEFAULT_COMPANY_INSTALLATION_DIRECTORY = "C:\\Syspro\\Server\\SysproServer.exe";

export const COMPANY_SERVER_TYPE_VALUES = ["SYSPRO_SERVER", "IIS"] as const;
export const COMPANY_SERVER_PROTOCOL_VALUES = ["HTTP", "HTTPS"] as const;
export const COMPANY_REMOTE_CONNECTION_TYPE_VALUES = ["DDNS_NOIP", "RADMIN_VPN"] as const;

const companyRemoteConnectionSchema = z.object({
  type: z.enum(COMPANY_REMOTE_CONNECTION_TYPE_VALUES),
  details: z.string().trim().min(1, "Informe o nome/IP/identificacao da conexao remota"),
});

const companySecondaryCnaeSchema = z.object({
  code: z.string().trim().min(1),
  description: z.string().trim().min(1),
});

const companyPartnerSchema = z.object({
  name: z.string().trim().min(1),
  qualification: emptyToUndefined,
  entryDate: emptyToUndefined,
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
    serverType: z.enum(COMPANY_SERVER_TYPE_VALUES).default(DEFAULT_COMPANY_SERVER_TYPE),
    serverPort: z.coerce.number().int().min(1, "Porta obrigatoria").default(DEFAULT_COMPANY_SERVER_PORT),
    serverHost: z.string().trim().min(1, "Servidor obrigatorio").default(DEFAULT_COMPANY_SERVER_HOST),
    serverProtocol: z.enum(COMPANY_SERVER_PROTOCOL_VALUES).default(DEFAULT_COMPANY_SERVER_PROTOCOL),
    iisIsapiPath: emptyToUndefined.default("SYSPROSERVERISAPI.DLL"),
    installationDirectory: emptyToUndefined.default(DEFAULT_COMPANY_INSTALLATION_DIRECTORY),
    remoteConnections: z.array(companyRemoteConnectionSchema).default([]),
    parentCompanyId: emptyToUndefined,
    accountingFirmId: emptyToUndefined,
    regimeTributario: z.nativeEnum(TaxRegime).nullable().optional(),
    indicadorIE: z.nativeEnum(IndicadorIE).default(IndicadorIE.NAO_CONTRIBUINTE),
    inscricaoEstadual: emptyToUndefined,
    inscricaoMunicipal: emptyToUndefined,
    cnae: emptyToUndefined,
    cnaeDescricao: emptyToUndefined,
    cnaesSecundarios: z.array(companySecondaryCnaeSchema).optional().default([]),
    codSuframa: emptyToUndefined,
    dataFundacao: z.preprocess(
      (val) => (val === "" || val === null ? undefined : val),
      z.coerce.date().optional(),
    ),
    naturezaJuridica: emptyToUndefined,
    porte: emptyToUndefined,
    matrizFilial: emptyToUndefined,
    situacaoCadastral: emptyToUndefined,
    qsa: z.array(companyPartnerSchema).optional().default([]),
    emailContato: emptyToUndefined.pipe(z.string().email("E-mail invalido").optional()),
    emailFinanceiro: emptyToUndefined.pipe(z.string().email("E-mail invalido").optional()),
    telefone: emptyToUndefined,
    whatsapp: emptyToUndefined,
    website: emptyToUndefined,
    address: addressSchema.optional().nullable().or(z.literal("")),
    observacoes: emptyToUndefined,
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
    },
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
    },
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
    },
  );

export type CreateCompanyInput = z.input<typeof createCompanySchema>;
export type CreateCompanyOutput = z.output<typeof createCompanySchema>;
