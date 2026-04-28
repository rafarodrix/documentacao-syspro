import { z } from "zod";
import { addressSchema } from "../shared/address.types";
import { paginationMetaSchema, paginationQuerySchema } from "../shared/pagination.types";
import { ENTITY_INACTIVATION_REASON_VALUES } from "@dosc-syspro/core";

const emptyToUndefined = z.preprocess(
  (val) => (val === "" || val === null ? undefined : val),
  z.string().optional(),
);

export const DEFAULT_COMPANY_SERVER_TYPE = "SYSPRO_SERVER" as const;
export const DEFAULT_COMPANY_SERVER_PROTOCOL = "HTTP" as const;
export const DEFAULT_COMPANY_SERVER_PORT = 1234;
export const DEFAULT_COMPANY_SERVER_HOST = "LOCALHOST";
export const DEFAULT_COMPANY_INSTALLATION_DIRECTORY = "C:\\Syspro\\Server\\SysproServer.exe";

export const COMPANY_STATUS_VALUES = ["ACTIVE", "INACTIVE", "SUSPENDED", "PENDING_DOCS"] as const;
export const COMPANY_SEGMENT_VALUES = [
  "AUTO_PECAS",
  "COMERCIAL",
  "FARMACIA",
  "PANIFICACAO",
  "AGRICOLA",
  "PETSHOP",
  "ESQUADRIAS",
  "MARMORARIA",
  "ASSISTENCIA",
] as const;
export const TAX_REGIME_VALUES = [
  "SIMPLES_NACIONAL",
  "SIMPLES_NACIONAL_EXCESSO",
  "LUCRO_PRESUMIDO",
  "LUCRO_REAL",
  "MEI",
] as const;
export const INDICADOR_IE_VALUES = ["CONTRIBUINTE", "ISENTO", "NAO_CONTRIBUINTE"] as const;
export const COMPANY_SERVER_TYPE_VALUES = ["SYSPRO_SERVER", "IIS"] as const;
export const COMPANY_SERVER_PROTOCOL_VALUES = ["HTTP", "HTTPS"] as const;
export const COMPANY_REMOTE_CONNECTION_TYPE_VALUES = ["DDNS_NOIP", "RADMIN_VPN"] as const;
export const COMPANY_INACTIVATION_REASON_VALUES = ENTITY_INACTIVATION_REASON_VALUES;

export type CompanyStatusValue = (typeof COMPANY_STATUS_VALUES)[number];
export type CompanySegmentValue = (typeof COMPANY_SEGMENT_VALUES)[number];
export type TaxRegimeValue = (typeof TAX_REGIME_VALUES)[number];
export type IndicadorIEValue = (typeof INDICADOR_IE_VALUES)[number];
export type CompanyInactivationReasonValue = (typeof COMPANY_INACTIVATION_REASON_VALUES)[number];

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
    segment: z.enum(COMPANY_SEGMENT_VALUES).nullable().optional(),
    status: z.enum(COMPANY_STATUS_VALUES).default("ACTIVE"),
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
    regimeTributario: z.enum(TAX_REGIME_VALUES).nullable().optional(),
    indicadorIE: z.enum(INDICADOR_IE_VALUES).default("NAO_CONTRIBUINTE"),
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
    emailContato: emptyToUndefined.pipe(z.email("E-mail invalido").optional()),
    emailFinanceiro: emptyToUndefined.pipe(z.email("E-mail invalido").optional()),
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
      if (data.indicadorIE === "CONTRIBUINTE" && !data.inscricaoEstadual) {
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

export const companyOptionSchema = z.object({
  id: z.string(),
  razaoSocial: z.string(),
  nomeFantasia: z.string().nullable(),
});

export type CompanyOption = z.output<typeof companyOptionSchema>;
export type CompanyAddressView = z.output<typeof companyAddressViewSchema>;
export type CompanyListItem = z.output<typeof companyListItemSchema>;
export type CompanyListQuery = z.infer<typeof companyListQuerySchema>;
export type CompanyListResponse = z.output<typeof companyListResponseSchema>;

export const companyAddressViewSchema = z.object({
  description: z.string().nullable().optional(),
  cep: z.string().nullable().optional(),
  logradouro: z.string().nullable().optional(),
  numero: z.string().nullable().optional(),
  complemento: z.string().nullable().optional(),
  bairro: z.string().nullable().optional(),
  cidade: z.string().nullable().optional(),
  estado: z.string().nullable().optional(),
  pais: z.string().nullable().optional(),
  codigoIbgeCidade: z.string().nullable().optional(),
  codigoIbgeEstado: z.string().nullable().optional(),
});

export const companyListItemSchema = z.object({
  id: z.string(),
  cnpj: z.string(),
  razaoSocial: z.string(),
  nomeFantasia: z.string().nullable(),
  segment: z.enum(COMPANY_SEGMENT_VALUES).nullable().optional(),
  status: z.enum(COMPANY_STATUS_VALUES),
  serverType: z.enum(COMPANY_SERVER_TYPE_VALUES).nullable().optional(),
  serverPort: z.number().int().nullable().optional(),
  serverHost: z.string().nullable().optional(),
  serverProtocol: z.enum(COMPANY_SERVER_PROTOCOL_VALUES).nullable().optional(),
  contractBlockReasonLabel: z.string().nullable().optional(),
  isBlockedByContract: z.boolean().optional(),
  usersCount: z.number().int().optional(),
  contactsCount: z.number().int().optional(),
  address: companyAddressViewSchema.nullable().optional(),
  accountingFirm: z.object({
    id: z.string(),
    nomeFantasia: z.string().nullable(),
  }).nullable().optional(),
  _count: z.object({
    memberships: z.number().int(),
    contactLinks: z.number().int().optional(),
    contracts: z.number().int().optional(),
    branches: z.number().int().optional(),
    accountingClients: z.number().int().optional(),
  }).optional(),
});

export const companyListQuerySchema = paginationQuerySchema.extend({
  search: z.string().optional(),
  status: z.enum([...COMPANY_STATUS_VALUES, "ALL"]).optional(),
});

export const companyListResponseSchema = z.object({
  items: z.array(companyListItemSchema),
  pagination: paginationMetaSchema,
});

export const companyStatusUpdateSchema = z.object({
  status: z.enum(COMPANY_STATUS_VALUES),
  reason: z.enum(COMPANY_INACTIVATION_REASON_VALUES).nullable().optional(),
  details: z.string().trim().nullable().optional(),
}).superRefine((input, ctx) => {
  if (input.status === "INACTIVE" && !input.reason) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["reason"],
      message: "Informe o motivo da inativacao.",
    });
  }

  if (input.status === "INACTIVE" && input.reason === "OUTROS" && !input.details?.trim()) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["details"],
      message: "Descreva o motivo da inativacao.",
    });
  }
});

export type CompanyStatusUpdateInput = z.infer<typeof companyStatusUpdateSchema>;
