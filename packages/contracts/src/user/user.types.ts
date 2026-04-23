import { z } from "zod";

export const USER_ROLE_VALUES = [
  "ADMIN",
  "DEVELOPER",
  "SUPORTE",
  "CLIENTE_ADMIN",
  "CLIENTE_USER",
] as const;

export const userRoleSchema = z.enum(USER_ROLE_VALUES);

export const createUserSchema = z.object({
  name: z.string().min(3, "O nome deve ter no minimo 3 caracteres").trim(),
  email: z.email("Insira um e-mail valido").toLowerCase().trim(),
  password: z.string().min(6, "A senha deve ter no minimo 6 caracteres").optional().or(z.literal("")),
  role: userRoleSchema,
  contactId: z.string().optional().or(z.literal("")),
  companyId: z.string().optional().or(z.literal("")),
});

export const updateUserSchema = z.object({
  name: z.string().min(3, "O nome deve ter no minimo 3 caracteres").trim().optional(),
  email: z.email("Insira um e-mail valido").toLowerCase().trim().optional(),
  role: userRoleSchema.optional(),
  contactId: z.string().trim().nullable().optional(),
  isActive: z.boolean().optional(),
});

export const userEmailAvailabilityCodeSchema = z.enum([
  "AVAILABLE",
  "INVALID_EMAIL",
  "LOCAL_ACTIVE_EXISTS",
  "LOCAL_INACTIVE_EXISTS",
]);

export const userEmailAvailabilitySchema = z.object({
  available: z.boolean(),
  code: userEmailAvailabilityCodeSchema,
  message: z.string(),
});

export type CreateUserInput = z.input<typeof createUserSchema>;
export type CreateUserOutput = z.output<typeof createUserSchema>;
export type UpdateUserInput = z.input<typeof updateUserSchema>;
export type UpdateUserOutput = z.output<typeof updateUserSchema>;
export type UserEmailAvailabilityCode = z.output<typeof userEmailAvailabilityCodeSchema>;
export type UserEmailAvailabilityResult = z.output<typeof userEmailAvailabilitySchema>;
