import { z } from "zod";

export const REMOTE_MODULE_SETTINGS_KEY = "remote.module.settings";

export const remoteModuleSettingsSchema = z.object({
  rustDeskServerHost: z.string().trim().min(3, "Informe o host do servidor RustDesk."),
  rustDeskServerConfig: z.string().trim().min(10, "Informe a configuracao exportada do RustDesk."),
  rustDeskPublicKey: z.string().trim().optional().default(""),
  rustDeskVersion: z.string().trim().min(3, "Informe a versao alvo do RustDesk."),
  defaultPassword: z.string().trim().min(4, "Informe a senha padrao do agente."),
});

export const DEFAULT_REMOTE_MODULE_SETTINGS = {
  rustDeskServerHost: "rustdesk.trilinksoftware.com.br",
  rustDeskServerConfig:
    "==Qfi0TVnZTc3YHT1EldidXbJhkbRBzTJ5Wc4BjR4hlN3FHMYBnYit0KIFlbwZkNiojI5V2aiwiIiojIpBXYiwiIyJmLt92YuUmchdHdm92cr5Waslmc05ybzNXZjFmI6ISehxWZyJCLiInYu02bj5SZyF2d0Z2bztmbpxWayRnLvN3clNWYiojI0N3boJye",
  rustDeskPublicKey: "",
  rustDeskVersion: "1.4.6",
  defaultPassword: "Trilink098",
} satisfies z.infer<typeof remoteModuleSettingsSchema>;

export const remoteModuleSettingsResponseSchema = z.object({
  success: z.boolean(),
  data: remoteModuleSettingsSchema.optional(),
  error: z.string().optional(),
  message: z.string().optional(),
});

export type RemoteModuleSettingsInput = z.input<typeof remoteModuleSettingsSchema>;
export type RemoteModuleSettings = z.output<typeof remoteModuleSettingsSchema>;
export type RemoteModuleSettingsResponse = z.infer<typeof remoteModuleSettingsResponseSchema>;
