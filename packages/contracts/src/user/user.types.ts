import { z } from "zod";

export const USER_ROLE_VALUES = [
  "ADMIN",
  "DEVELOPER",
  "SUPORTE",
  "CLIENTE_ADMIN",
  "CLIENTE_USER",
] as const;

export const createUserSchema = z.object({
  name: z.string().min(3, "O nome deve ter no minimo 3 caracteres").trim(),
  email: z.email("Insira um e-mail valido").toLowerCase().trim(),
  password: z.string().min(6, "A senha deve ter no minimo 6 caracteres").optional().or(z.literal("")),
  role: z.enum(USER_ROLE_VALUES),
  contactId: z.string().optional().or(z.literal("")),
  companyId: z.string().optional().or(z.literal("")),
});

export type CreateUserInput = z.input<typeof createUserSchema>;
export type CreateUserOutput = z.output<typeof createUserSchema>;
