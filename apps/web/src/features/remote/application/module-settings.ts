import { z } from "zod";
import type { RemoteModuleSettings } from "@/features/remote/domain/model";

export const REMOTE_MODULE_SETTINGS_KEY = "remote.module.settings";

export const remoteModuleSettingsSchema = z.object({
  rustDeskServerHost: z.string().trim().min(3, "Informe o host do servidor RustDesk."),
  rustDeskServerConfig: z.string().trim().min(10, "Informe a configuracao exportada do RustDesk."),
  rustDeskPublicKey: z.string().trim().optional().default(""),
  rustDeskVersion: z.string().trim().min(3, "Informe a versao alvo do RustDesk."),
  heartbeatIntervalMinutes: z.coerce.number().int().min(1, "Minimo de 1 minuto.").max(120, "Maximo de 120 minutos."),
  defaultPassword: z.string().trim().min(4, "Informe a senha padrao do agente."),
});

const REMOTE_MODULE_SETTINGS_DEFAULTS: RemoteModuleSettings = {
  rustDeskServerHost: "acesso.trilinksoftware.com.br",
  rustDeskServerConfig:
    "==Qfi0TVnZTc3YHT1EldidXbJhkbRBzTJ5Wc4BjR4hlN3FHMYBnYit0KIFlbwZkNiojI5V2aiwiIiojIpBXYiwiIyJmLt92YuUmchdHdm92cr5Waslmc05ybzNXZjFmI6ISehxWZyJCLiInYu02bj5SZyF2d0Z2bztmbpxWayRnLvN3clNWYiojI0N3boJye",
  rustDeskPublicKey: "",
  rustDeskVersion: "1.4.6",
  heartbeatIntervalMinutes: 5,
  defaultPassword: "Trilink098",
};

export function getDefaultRemoteModuleSettings(): RemoteModuleSettings {
  return { ...REMOTE_MODULE_SETTINGS_DEFAULTS };
}
