import { z } from "zod";

export const ZAMMAD_GLOBAL_SETTINGS_KEY = "zammad.global.settings";
export const ZAMMAD_GLOBAL_CATALOG_SNAPSHOT_KEY = "zammad.global.catalog.snapshot";

export const zammadOwnerModeSchema = z.enum(["UNASSIGNED", "ASSIGN_CURRENT_AGENT"]);
export type ZammadOwnerMode = z.infer<typeof zammadOwnerModeSchema>;

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
  defaultArticleType: z.enum(["note", "phone", "email"]),
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

const zammadCatalogGroupSchema = z.object({
  id: z.coerce.number().int().min(1),
  name: z.string().trim().min(1),
});

const zammadCatalogStateSchema = z.object({
  id: z.coerce.number().int().min(1),
  name: z.string().trim().min(1),
});

const zammadCatalogPrioritySchema = z.object({
  id: z.coerce.number().int().min(1),
  name: z.string().trim().min(1),
});

const zammadCatalogOwnerSchema = z.object({
  id: z.coerce.number().int().min(1),
  name: z.string().trim().min(1),
  email: z.string().trim().email().optional().nullable(),
});

export const zammadGlobalCatalogSchema = z.object({
  fetchedAt: z.string().trim().min(1),
  groups: z.array(zammadCatalogGroupSchema),
  states: z.array(zammadCatalogStateSchema),
  priorities: z.array(zammadCatalogPrioritySchema),
  owners: z.array(zammadCatalogOwnerSchema),
  articleTypes: z.array(z.enum(["note", "phone", "email"])).min(1),
});

export type ZammadGlobalCatalog = z.infer<typeof zammadGlobalCatalogSchema>;

const DEFAULT_ZAMMAD_GLOBAL_SETTINGS: ZammadGlobalSettings = {
  defaultGroup: "Users",
  defaultPriorityId: 2,
  defaultStateId: 2,
  defaultArticleType: "note",
  defaultArticleInternal: false,
  defaultOwnerMode: "UNASSIGNED",
  roleDefaults: {
    clienteAdmin: { group: "Users", stateId: 2, ownerMode: "UNASSIGNED", priorityId: 2 },
    clienteUser: { group: "Users", stateId: 2, ownerMode: "UNASSIGNED", priorityId: 2 },
    admin: { group: "Users", stateId: 2, ownerMode: "ASSIGN_CURRENT_AGENT", priorityId: 2 },
    suporte: { group: "Users", stateId: 2, ownerMode: "ASSIGN_CURRENT_AGENT", priorityId: 2 },
    developer: { group: "Users", stateId: 2, ownerMode: "ASSIGN_CURRENT_AGENT", priorityId: 2 },
  },
  titlePrefix: "",
};

export function getDefaultZammadGlobalSettings(): ZammadGlobalSettings {
  return { ...DEFAULT_ZAMMAD_GLOBAL_SETTINGS };
}
