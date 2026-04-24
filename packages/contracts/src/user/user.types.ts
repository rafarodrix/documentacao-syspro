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

export const userAccessCompanyOptionSchema = z.object({
  id: z.string(),
  razaoSocial: z.string(),
  nomeFantasia: z.string().nullable(),
});

export const userAccessMembershipSummarySchema = z.object({
  companyId: z.string(),
  role: userRoleSchema,
  company: z.object({
    nomeFantasia: z.string().nullable(),
    razaoSocial: z.string(),
  }),
});

export const userAccessContactSummarySchema = z.object({
  id: z.string(),
  name: z.string(),
  whatsapp: z.string().nullable(),
  email: z.string().nullable(),
  phone: z.string().nullable().optional(),
  companyId: z.string().nullable(),
  company: z.object({
    id: z.string(),
    nomeFantasia: z.string().nullable(),
    razaoSocial: z.string(),
  }).nullable(),
});

export const userAccessListItemSchema = z.object({
  id: z.string(),
  name: z.string().nullable(),
  email: z.string(),
  image: z.string().nullable(),
  role: userRoleSchema,
  isActive: z.boolean(),
  deletedAt: z.union([z.date(), z.null()]).optional(),
  createdAt: z.date().optional(),
  memberships: z.array(userAccessMembershipSummarySchema),
  contact: userAccessContactSummarySchema.nullable(),
  companyName: z.string(),
  companyId: z.string().nullable(),
});

export const userAccessEditInitialDataSchema = z.object({
  name: z.string(),
  email: z.string(),
  role: userRoleSchema,
  contactId: z.string().optional(),
  password: z.string(),
});

export const userAccessEditViewDataSchema = z.object({
  userId: z.string(),
  companies: z.array(userAccessCompanyOptionSchema),
  isAdmin: z.boolean(),
  initialData: userAccessEditInitialDataSchema,
  context: z.enum(["CLIENT", "SYSTEM"]),
});

export const userAccessAdminViewDataSchema = z.object({
  companies: z.array(userAccessCompanyOptionSchema),
  users: z.array(userAccessListItemSchema),
  isGlobalView: z.boolean(),
});

export type CreateUserInput = z.input<typeof createUserSchema>;
export type CreateUserOutput = z.output<typeof createUserSchema>;
export type UpdateUserInput = z.input<typeof updateUserSchema>;
export type UpdateUserOutput = z.output<typeof updateUserSchema>;
export type UserEmailAvailabilityCode = z.output<typeof userEmailAvailabilityCodeSchema>;
export type UserEmailAvailabilityResult = z.output<typeof userEmailAvailabilitySchema>;
export type UserAccessCompanyOption = z.output<typeof userAccessCompanyOptionSchema>;
export type UserAccessMembershipSummary = z.output<typeof userAccessMembershipSummarySchema>;
export type UserAccessContactSummary = z.output<typeof userAccessContactSummarySchema>;
export type UserAccessListItem = z.output<typeof userAccessListItemSchema>;
export type UserAccessEditInitialData = z.output<typeof userAccessEditInitialDataSchema>;
export type UserAccessEditViewData = z.output<typeof userAccessEditViewDataSchema>;
export type UserAccessAdminViewData = z.output<typeof userAccessAdminViewDataSchema>;
