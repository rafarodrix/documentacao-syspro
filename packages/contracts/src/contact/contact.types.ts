import { z } from "zod";
import { paginationMetaSchema, paginationQuerySchema } from "../shared/pagination.types";

const contactOptionCompanySchema = z.object({
  id: z.string(),
  razaoSocial: z.string(),
  nomeFantasia: z.string().nullable().optional(),
  cnpj: z.string().nullable().optional(),
  observacoes: z.string().nullable().optional(),
  serverType: z.enum(["SYSPRO_SERVER", "IIS"]).nullable().optional(),
  serverPort: z.number().int().nullable().optional(),
  serverHost: z.string().nullable().optional(),
  serverProtocol: z.enum(["HTTP", "HTTPS"]).nullable().optional(),
  iisIsapiPath: z.string().nullable().optional(),
  installationDirectory: z.string().nullable().optional(),
  remoteConnections: z
    .array(
      z.object({
        type: z.enum(["DDNS_NOIP", "RADMIN_VPN"]),
        details: z.string(),
      }),
    )
    .optional(),
});

export const contactOptionSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string().nullable().optional(),
  phone: z.string().nullable().optional(),
  whatsapp: z.string().nullable().optional(),
  companyId: z.string().nullable().optional(),
  companyIds: z.array(z.string()).optional(),
  company: contactOptionCompanySchema.nullable().optional(),
  companies: z.array(contactOptionCompanySchema).optional(),
});

export type ContactOption = z.output<typeof contactOptionSchema>;

export const contactListItemSchema = contactOptionSchema.extend({
  cpf: z.string().nullable().optional(),
  jobTitle: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const contactListQuerySchema = paginationQuerySchema.extend({
  q: z.string().optional(),
  unlinked: z.enum(["true", "false"]).optional(),
  companyId: z.string().optional(),
  limit: z.string().optional(),
});

export const contactListResponseSchema = z.object({
  items: z.array(contactListItemSchema),
  pagination: paginationMetaSchema,
});

export const contactStatsSchema = z.object({
  all: z.number().int().nonnegative(),
  linked: z.number().int().nonnegative(),
  unlinked: z.number().int().nonnegative(),
  withEmail: z.number().int().nonnegative(),
  withPhone: z.number().int().nonnegative(),
});

export const createContactSchema = z.object({
  name: z.string().min(1, "Informe o nome do contato").trim(),
  email: z
    .string()
    .trim()
    .email("Informe um e-mail valido")
    .optional()
    .or(z.literal("")),
  phone: z.string().trim().optional().or(z.literal("")),
  cpf: z.string().trim().optional().or(z.literal("")),
  jobTitle: z.string().trim().optional().or(z.literal("")),
  whatsapp: z.string().trim().optional().or(z.literal("")),
  notes: z.string().trim().optional().or(z.literal("")),
  companyIds: z.array(z.string()).default([]),
});

export const updateContactSchema = z.object({
  name: z.string().min(1, "Informe o nome do contato").trim().optional(),
  email: z.string().email("Informe um e-mail valido").nullable().optional(),
  phone: z.string().nullable().optional(),
  cpf: z.string().nullable().optional(),
  jobTitle: z.string().nullable().optional(),
  whatsapp: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
  companyIds: z.array(z.string()).optional(),
});

export type CreateContactInput = z.input<typeof createContactSchema>;
export type CreateContactOutput = z.output<typeof createContactSchema>;
export type UpdateContactInput = z.input<typeof updateContactSchema>;
export type ContactListItem = z.output<typeof contactListItemSchema>;
export type ContactListQuery = z.infer<typeof contactListQuerySchema>;
export type ContactListResponse = z.output<typeof contactListResponseSchema>;
export type ContactStats = z.output<typeof contactStatsSchema>;
