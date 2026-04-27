import { z } from "zod";

export const REMOTE_MODULE_SETTINGS_KEY = "remote.module.settings";
export const REMOTE_RUSTDESK_PACKAGE_TYPE_VALUES = ["AUTO", "MSI", "EXE"] as const;

function isHttpInstallerSource(value: string) {
  return /^https?:\/\//i.test(value.trim());
}

function isSha256(value: string) {
  return /^[a-f0-9]{64}$/i.test(value.trim());
}

export const remoteModuleSettingsSchema = z
  .object({
    rustDeskServerHost: z.string().trim().min(3, "Informe o host do servidor RustDesk."),
    rustDeskServerConfig: z.string().trim().min(10, "Informe a configuracao exportada do RustDesk."),
    rustDeskPublicKey: z.string().trim().optional().default(""),
    rustDeskVersion: z.string().trim().min(3, "Informe a versao alvo do RustDesk."),
    defaultPassword: z.string().trim().min(4, "Informe a senha padrao do agente."),
    rustDeskAutoInstall: z.boolean().default(true),
    rustDeskAutoUpgrade: z.boolean().default(true),
    rustDeskInstallerUrl: z.string().trim().optional().default(""),
    rustDeskInstallerSha256: z.string().trim().optional().default(""),
    rustDeskInstallerPackageType: z.enum(REMOTE_RUSTDESK_PACKAGE_TYPE_VALUES).default("AUTO"),
    rustDeskInstallArgs: z.string().trim().optional().default("/S"),
    rustDeskRestartServiceAfterApply: z.boolean().default(true),
    rustDeskSuppressTrayShortcuts: z.boolean().default(true),
  })
  .superRefine((value, ctx) => {
    if (value.rustDeskInstallerSha256 && !isSha256(value.rustDeskInstallerSha256)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["rustDeskInstallerSha256"],
        message: "Informe um SHA256 valido com 64 caracteres hexadecimais.",
      });
    }

    if (isHttpInstallerSource(value.rustDeskInstallerUrl) && !value.rustDeskInstallerSha256) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["rustDeskInstallerSha256"],
        message: "Downloads HTTP/HTTPS exigem o SHA256 do instalador.",
      });
    }
  });

export const DEFAULT_REMOTE_MODULE_SETTINGS = {
  rustDeskServerHost: "rustdesk.trilinksoftware.com.br",
  rustDeskServerConfig:
    "==Qfi0TVnZTc3YHT1EldidXbJhkbRBzTJ5Wc4BjR4hlN3FHMYBnYit0KIFlbwZkNiojI5V2aiwiIiojIpBXYiwiIyJmLt92YuUmchdHdm92cr5Waslmc05ybzNXZjFmI6ISehxWZyJCLiInYu02bj5SZyF2d0Z2bztmbpxWayRnLvN3clNWYiojI0N3boJye",
  rustDeskPublicKey:
    "==Qfi0TVnZTc3YHT1EldidXbJhkbRBzTJ5Wc4BjR4hlN3FHMYBnYit0KIFlbwZkNiojI5V2aiwiIiojIpBXYiwiIyJmLt92YuUmchdHdm92cr5Waslmc05ybzNXZjFmI6ISehxWZyJCLiInYu02bj5SZyF2d0Z2bztmbpxWayRnLvN3clNWYiojI0N3boJye",
  rustDeskVersion: "1.4.6",
  defaultPassword: "Trilink098",
  rustDeskAutoInstall: true,
  rustDeskAutoUpgrade: true,
  rustDeskInstallerUrl: "",
  rustDeskInstallerSha256: "",
  rustDeskInstallerPackageType: "AUTO",
  rustDeskInstallArgs: "/S",
  rustDeskRestartServiceAfterApply: true,
  rustDeskSuppressTrayShortcuts: true,
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
