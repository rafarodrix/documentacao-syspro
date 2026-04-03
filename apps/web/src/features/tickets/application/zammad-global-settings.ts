import { z } from "zod";

export const ZAMMAD_GLOBAL_SETTINGS_KEY = "zammad.global.settings";

export const zammadGlobalSettingsSchema = z.object({
  defaultGroup: z.string().trim().min(1, "Informe o grupo padrao."),
  defaultPriorityId: z.coerce.number().int().min(1).max(3),
  defaultArticleType: z.enum(["note", "phone", "email"]),
  defaultArticleInternal: z.boolean(),
  titlePrefix: z.string().trim().max(32).optional().default(""),
});

export type ZammadGlobalSettings = z.infer<typeof zammadGlobalSettingsSchema>;

const DEFAULT_ZAMMAD_GLOBAL_SETTINGS: ZammadGlobalSettings = {
  defaultGroup: "Users",
  defaultPriorityId: 2,
  defaultArticleType: "note",
  defaultArticleInternal: false,
  titlePrefix: "",
};

export function getDefaultZammadGlobalSettings(): ZammadGlobalSettings {
  return { ...DEFAULT_ZAMMAD_GLOBAL_SETTINGS };
}

