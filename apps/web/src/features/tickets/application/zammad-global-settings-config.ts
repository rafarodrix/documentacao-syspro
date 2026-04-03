import type { ZammadGlobalSettings } from "@dosc-syspro/contracts";

export const ZAMMAD_GLOBAL_SETTINGS_KEY = "zammad.global.settings";
export const ZAMMAD_GLOBAL_CATALOG_SNAPSHOT_KEY = "zammad.global.catalog.snapshot";

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
