import { z } from "zod";

export const zammadOwnerModeSchema = z.enum(["UNASSIGNED", "ASSIGN_CURRENT_AGENT"]);
export type ZammadOwnerMode = z.infer<typeof zammadOwnerModeSchema>;

export const zammadArticleTypeSchema = z.enum(["note", "phone", "email"]);
export type ZammadArticleType = z.infer<typeof zammadArticleTypeSchema>;

const zammadRoleDefaultsSchema = z.object({
  group: z.string().trim().min(1),
  stateId: z.coerce.number().int().min(1),
  ownerMode: zammadOwnerModeSchema,
  priorityId: z.coerce.number().int().min(1).max(3),
});

export const zammadGlobalSettingsSchema = z.object({
  defaultGroup: z.string().trim().min(1, "Informe o grupo padrao."),
  defaultPriorityId: z.coerce.number().int().min(1).max(3),
  defaultStateId: z.coerce.number().int().min(1),
  defaultArticleType: zammadArticleTypeSchema,
  defaultArticleInternal: z.boolean(),
  defaultOwnerMode: zammadOwnerModeSchema,
  roleDefaults: z.object({
    clienteAdmin: zammadRoleDefaultsSchema,
    clienteUser: zammadRoleDefaultsSchema,
    admin: zammadRoleDefaultsSchema,
    suporte: zammadRoleDefaultsSchema,
    developer: zammadRoleDefaultsSchema,
  }),
  titlePrefix: z.string().trim().max(32).optional().default(""),
});

export type ZammadGlobalSettings = z.infer<typeof zammadGlobalSettingsSchema>;

export const zammadCatalogGroupSchema = z.object({
  id: z.coerce.number().int().min(1),
  name: z.string().trim().min(1),
});
export type ZammadCatalogGroup = z.infer<typeof zammadCatalogGroupSchema>;

export const zammadCatalogStateSchema = z.object({
  id: z.coerce.number().int().min(1),
  name: z.string().trim().min(1),
});
export type ZammadCatalogState = z.infer<typeof zammadCatalogStateSchema>;

export const zammadCatalogPrioritySchema = z.object({
  id: z.coerce.number().int().min(1),
  name: z.string().trim().min(1),
});
export type ZammadCatalogPriority = z.infer<typeof zammadCatalogPrioritySchema>;

export const zammadCatalogOwnerSchema = z.object({
  id: z.coerce.number().int().min(1),
  name: z.string().trim().min(1),
  email: z.string().trim().email().optional().nullable(),
});
export type ZammadCatalogOwner = z.infer<typeof zammadCatalogOwnerSchema>;

export const zammadGlobalCatalogSchema = z.object({
  fetchedAt: z.string().trim().min(1),
  groups: z.array(zammadCatalogGroupSchema),
  states: z.array(zammadCatalogStateSchema),
  priorities: z.array(zammadCatalogPrioritySchema),
  owners: z.array(zammadCatalogOwnerSchema),
  articleTypes: z.array(zammadArticleTypeSchema).min(1),
});
export type ZammadGlobalCatalog = z.infer<typeof zammadGlobalCatalogSchema>;
