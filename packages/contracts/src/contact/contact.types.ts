import { z } from "zod";

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
