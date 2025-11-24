import { z } from "zod";

export const createCompanySchema = z.object({
  cnpj: z.string().min(14, "CNPJ inválido").max(18, "CNPJ inválido"), // Pode adicionar regex de CNPJ depois
  razaoSocial: z.string().min(3, "Razão Social é obrigatória"),
  nomeFantasia: z.string().optional(),
  emailContato: z.string().email("E-mail inválido").optional().or(z.literal("")),
  telefone: z.string().optional(),
});

export type CreateCompanyInput = z.infer<typeof createCompanySchema>;