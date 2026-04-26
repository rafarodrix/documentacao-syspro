import { z } from "zod";

const contactOptionCompanySchema = z.object({
  id: z.string(),
  razaoSocial: z.string(),
  nomeFantasia: z.string().nullable().optional(),
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

export type CreateContactInput = z.input<typeof createContactSchema>;
export type CreateContactOutput = z.output<typeof createContactSchema>;
