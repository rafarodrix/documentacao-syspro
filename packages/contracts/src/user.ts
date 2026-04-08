import { z } from "zod";

export const USER_ROLE_VALUES = [
  "ADMIN",
  "DEVELOPER",
  "SUPORTE",
  "CLIENTE_ADMIN",
  "CLIENTE_USER",
] as const;

const phoneRegex = /^(\(?\d{2}\)?\s?)?9?\d{4}-?\d{4}$/;
const optionalCpfSchema = z
  .string()
  .optional()
  .or(z.literal(""))
  .transform((value) => {
    if (!value) return undefined;
    const digits = value.replace(/\D/g, "");
    return digits || undefined;
  })
  .refine((value) => value === undefined || value.length === 11, {
    message: "CPF deve conter 11 digitos",
  });

export const createUserSchema = z.object({
  name: z.string().min(3, "O nome deve ter no minimo 3 caracteres").trim(),
  email: z.string().email("Insira um e-mail valido").toLowerCase().trim(),
  password: z.string().min(6, "A senha deve ter no minimo 6 caracteres").optional().or(z.literal("")),
  role: z.enum(USER_ROLE_VALUES),
  contactId: z.string().optional().or(z.literal("")),
  jobTitle: z.string().max(50, "Cargo muito longo").optional().or(z.literal("")),
  phone: z.string().regex(phoneRegex, "Formato invalido. Use (DD) 99999-9999").optional().or(z.literal("")),
  cpf: optionalCpfSchema,
});

export const linkUserToCompanySchema = z.object({
  email: z.string().email("E-mail invalido"),
  role: z.enum(USER_ROLE_VALUES),
  companyId: z.string().min(1, "Selecione uma empresa"),
});

export type CreateUserInput = z.input<typeof createUserSchema>;
export type CreateUserOutput = z.output<typeof createUserSchema>;
export type LinkUserToCompanyInput = z.infer<typeof linkUserToCompanySchema>;
