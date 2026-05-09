import { z } from "zod";
import { adminViewScopeSchema } from "../shared/admin-view.types";

export const USER_ROLE_VALUES = [
  "ADMIN",
  "DEVELOPER",
  "SUPORTE",
  "CLIENTE_ADMIN",
  "CLIENTE_USER",
] as const;

export const userRoleSchema = z.enum(USER_ROLE_VALUES);
export type UserRoleValue = z.infer<typeof userRoleSchema>;

export const createUserSchema = z.object({
  name: z.string().min(3, "O nome deve ter no minimo 3 caracteres").trim(),
  email: z.email("Insira um e-mail valido").toLowerCase().trim(),
  password: z.string().min(6, "A senha deve ter no minimo 6 caracteres").optional().or(z.literal("")),
  role: userRoleSchema,
  contactId: z.string().optional().or(z.literal("")),
});

export const updateUserSchema = z.object({
  name: z.string().min(3, "O nome deve ter no minimo 3 caracteres").trim().optional(),
  email: z.email("Insira um e-mail valido").toLowerCase().trim().optional(),
  role: userRoleSchema.optional(),
  contactId: z.string().trim().nullable().optional(),
  isActive: z.boolean().optional(),
});

const emptyStringToNull = z.preprocess(
  (value) => {
    if (value === null || value === undefined) return null;
    const normalized = String(value).trim();
    return normalized.length ? normalized : null;
  },
  z.string().nullable(),
);

const userProfileCompanyAddressSchema = z.object({
  description: z.string().trim().default("Sede"),
  cep: z.string().trim().default(""),
  logradouro: z.string().trim().default(""),
  numero: z.string().trim().default(""),
  complemento: z.string().trim().default(""),
  bairro: z.string().trim().default(""),
  cidade: z.string().trim().default(""),
  estado: z.string().trim().default(""),
  pais: z.string().trim().default("BR"),
  codigoIbgeCidade: z.string().trim().default(""),
  codigoIbgeEstado: z.string().trim().default(""),
});

export const userProfileCompanySchema = z.object({
  id: z.string().min(1),
  isPrimary: z.boolean().default(false),
  cnpj: z.string().min(1),
  razaoSocial: z.string().min(1),
  nomeFantasia: z.string().nullable(),
  emailContato: z.string().nullable(),
  emailFinanceiro: z.string().nullable(),
  telefone: z.string().nullable(),
  whatsapp: z.string().nullable(),
  website: z.string().nullable(),
  address: userProfileCompanyAddressSchema.nullable(),
});

export const userTicketDefaultTeamFilterSchema = z.enum(["all", "SUPORTE", "DESENVOLVIMENTO"]);

export const currentUserPreferencesSchema = z.object({
  tickets: z.object({
    defaultTeamFilter: userTicketDefaultTeamFilterSchema.default("all"),
  }).default({
    defaultTeamFilter: "all",
  }),
});

export const currentUserProfileSchema = z.object({
  name: z.string().min(1),
  email: z.string().min(1),
  image: z.string().nullable(),
  role: userRoleSchema,
  preferences: currentUserPreferencesSchema,
  permissions: z.object({
    canEditPersonal: z.boolean(),
    canEditCompany: z.boolean(),
  }),
  selectedCompanyId: z.string().nullable(),
  companies: z.array(userProfileCompanySchema),
});

export const updateCurrentUserProfileSchema = z
  .object({
    name: z.string().min(3, "O nome deve ter no minimo 3 caracteres").trim().optional(),
    preferences: currentUserPreferencesSchema.optional(),
    companyId: z.string().trim().min(1).nullable().optional(),
    company: z
      .object({
        razaoSocial: z.string().min(3, "Razao social obrigatoria").trim(),
        nomeFantasia: emptyStringToNull,
        emailContato: z.email("E-mail invalido").nullable().or(z.literal("")).transform((value) => {
          if (value === "") return null;
          return value;
        }),
        emailFinanceiro: z.email("E-mail invalido").nullable().or(z.literal("")).transform((value) => {
          if (value === "") return null;
          return value;
        }),
        telefone: emptyStringToNull,
        whatsapp: emptyStringToNull,
        website: emptyStringToNull,
        address: userProfileCompanyAddressSchema.nullable().optional(),
      })
      .optional(),
  })
  .refine((input) => Boolean(input.name !== undefined || input.company !== undefined || input.preferences !== undefined), {
    message: "Informe ao menos uma alteracao.",
  });

export const userEmailAvailabilityCodeSchema = z.enum([
  "AVAILABLE",
  "INVALID_EMAIL",
  "LOCAL_ACTIVE_EXISTS",
  "LOCAL_INACTIVE_EXISTS",
  "AUTH_PROVIDER_EXISTS",
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
  deletedAt: z.string().nullable().optional(),
  createdAt: z.string().optional(),
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
  canAssignAdminRole: z.boolean(),
  initialData: userAccessEditInitialDataSchema,
  context: z.enum(["CLIENT", "SYSTEM"]),
});

export const userAccessAdminViewDataSchema = z.object({
  companies: z.array(userAccessCompanyOptionSchema),
  users: z.array(userAccessListItemSchema),
  isGlobalView: z.boolean(),
});

export const userAdminViewSchema = adminViewScopeSchema;

export type CreateUserInput = z.input<typeof createUserSchema>;
export type CreateUserOutput = z.output<typeof createUserSchema>;
export type UpdateUserInput = z.input<typeof updateUserSchema>;
export type UpdateUserOutput = z.output<typeof updateUserSchema>;
export type UserProfileCompany = z.output<typeof userProfileCompanySchema>;
export type CurrentUserPreferences = z.output<typeof currentUserPreferencesSchema>;
export type UserTicketDefaultTeamFilter = z.output<typeof userTicketDefaultTeamFilterSchema>;
export type CurrentUserProfile = z.output<typeof currentUserProfileSchema>;
export type UpdateCurrentUserProfileInput = z.input<typeof updateCurrentUserProfileSchema>;
export type UpdateCurrentUserProfileOutput = z.output<typeof updateCurrentUserProfileSchema>;
export type UserEmailAvailabilityCode = z.output<typeof userEmailAvailabilityCodeSchema>;
export type UserEmailAvailabilityResult = z.output<typeof userEmailAvailabilitySchema>;
export type UserAccessCompanyOption = z.output<typeof userAccessCompanyOptionSchema>;
export type UserAccessMembershipSummary = z.output<typeof userAccessMembershipSummarySchema>;
export type UserAccessContactSummary = z.output<typeof userAccessContactSummarySchema>;
export type UserAccessListItem = z.output<typeof userAccessListItemSchema>;
export type UserAccessEditInitialData = z.output<typeof userAccessEditInitialDataSchema>;
export type UserAccessEditViewData = z.output<typeof userAccessEditViewDataSchema>;
export type UserAccessAdminViewData = z.output<typeof userAccessAdminViewDataSchema>;
export type UserAdminView = z.output<typeof userAdminViewSchema>;
