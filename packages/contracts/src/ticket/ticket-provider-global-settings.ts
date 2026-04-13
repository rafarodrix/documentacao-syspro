import { z } from "zod";

export const ticketProviderOwnerModeSchema = z.enum(["UNASSIGNED", "ASSIGN_CURRENT_AGENT"]);
export type TicketProviderOwnerMode = z.infer<typeof ticketProviderOwnerModeSchema>;

export const ticketProviderArticleTypeSchema = z.enum(["note", "phone", "email"]);
export type TicketProviderArticleType = z.infer<typeof ticketProviderArticleTypeSchema>;

const ticketProviderRoleDefaultsSchema = z.object({
  group: z.string().trim().min(1),
  stateId: z.coerce.number().int().min(1),
  ownerMode: ticketProviderOwnerModeSchema,
  priorityId: z.coerce.number().int().min(1).max(3),
});

export const ticketProviderGlobalSettingsSchema = z.object({
  defaultGroup: z.string().trim().min(1, "Informe o grupo padrao."),
  defaultPriorityId: z.coerce.number().int().min(1).max(3),
  defaultStateId: z.coerce.number().int().min(1),
  defaultArticleType: ticketProviderArticleTypeSchema,
  defaultArticleInternal: z.boolean(),
  defaultOwnerMode: ticketProviderOwnerModeSchema,
  roleDefaults: z.object({
    clienteAdmin: ticketProviderRoleDefaultsSchema,
    clienteUser: ticketProviderRoleDefaultsSchema,
    admin: ticketProviderRoleDefaultsSchema,
    suporte: ticketProviderRoleDefaultsSchema,
    developer: ticketProviderRoleDefaultsSchema,
  }),
  titlePrefix: z.string().trim().max(32).optional().default(""),
});

export type TicketProviderGlobalSettings = z.infer<typeof ticketProviderGlobalSettingsSchema>;

export const ticketProviderCatalogGroupSchema = z.object({
  id: z.coerce.number().int().min(1),
  name: z.string().trim().min(1),
});
export type TicketProviderCatalogGroup = z.infer<typeof ticketProviderCatalogGroupSchema>;

export const ticketProviderCatalogStateSchema = z.object({
  id: z.coerce.number().int().min(1),
  name: z.string().trim().min(1),
});
export type TicketProviderCatalogState = z.infer<typeof ticketProviderCatalogStateSchema>;

export const ticketProviderCatalogPrioritySchema = z.object({
  id: z.coerce.number().int().min(1),
  name: z.string().trim().min(1),
});
export type TicketProviderCatalogPriority = z.infer<typeof ticketProviderCatalogPrioritySchema>;

export const ticketProviderCatalogOwnerSchema = z.object({
  id: z.coerce.number().int().min(1),
  name: z.string().trim().min(1),
  email: z.string().trim().optional().nullable(),
});
export type TicketProviderCatalogOwner = z.infer<typeof ticketProviderCatalogOwnerSchema>;

export const ticketProviderGlobalCatalogSchema = z.object({
  fetchedAt: z.string().trim().min(1),
  groups: z.array(ticketProviderCatalogGroupSchema),
  states: z.array(ticketProviderCatalogStateSchema),
  priorities: z.array(ticketProviderCatalogPrioritySchema),
  owners: z.array(ticketProviderCatalogOwnerSchema),
  articleTypes: z.array(ticketProviderArticleTypeSchema).min(1),
});
export type TicketProviderGlobalCatalog = z.infer<typeof ticketProviderGlobalCatalogSchema>;
