import { createHash, randomBytes } from "node:crypto";

export type RustDeskConfigSettings = {
  rustDeskServerHost: string;
  rustDeskServerConfig: string;
  rustDeskPublicKey: string;
  rustDeskVersion: string;
  defaultPassword: string;
  rustDeskAutoInstall: boolean;
  rustDeskAutoUpgrade: boolean;
  rustDeskInstallerUrl: string;
  rustDeskInstallerSha256: string;
  rustDeskInstallerPackageType: "AUTO" | "MSI" | "EXE";
  rustDeskInstallArgs: string;
  rustDeskRestartServiceAfterApply: boolean;
  rustDeskSuppressTrayShortcuts: boolean;
  rustDeskHideTray: boolean;
  rustDeskHideStopService: boolean;
  rustDeskAllowRemoteConfigModification: boolean;
  rustDeskAllowD3DRender: boolean;
  rustDeskEnableDirectXCapture: boolean;
};

export function normalizeRustdeskId(value?: string | null): string | null {
  const trimmed = value?.trim();
  if (!trimmed) return null;
  const normalized = trimmed.replace(/\s+/g, "");
  if (!/^[0-9]{7,12}$/.test(normalized)) return null;
  if (/^0+$/.test(normalized)) return null;
  return normalized;
}

export function normalizeRustdeskIdStrict(value?: string | null) {
  const digitsOnly = (value ?? "").replace(/\D/g, "").trim();
  if (!digitsOnly) return null;
  return /^\d{7,12}$/.test(digitsOnly) ? digitsOnly : null;
}

export function buildAgentToken() {
  return `ragent_${randomBytes(24).toString("hex")}`;
}

export function hashAgentToken(token: string) {
  return createHash("sha256").update(token, "utf8").digest("hex");
}

export function hashRustDeskPublicKey(publicKey: string) {
  return createHash("sha256").update(publicKey.trim(), "utf8").digest("hex");
}

export function resolveRustDeskAlias(input: {
  hostName: string;
  machineName?: string | null;
  companyName?: string | null;
}) {
  const machineName = input.machineName?.trim();
  if (machineName) return machineName;
  if (input.companyName?.trim()) return `${input.companyName.trim()} | ${input.hostName}`;
  return input.hostName;
}

export function buildRustDeskConfigProfile(settings: RustDeskConfigSettings) {
  const serverHost = settings.rustDeskServerHost.trim();
  const publicKey = settings.rustDeskPublicKey.trim();
  const installerUrl = settings.rustDeskInstallerUrl.trim() || null;
  const installerChecksumSha256 = settings.rustDeskInstallerSha256.trim().toLowerCase() || null;
  const installerSilentArgs = settings.rustDeskInstallArgs.trim() || "/S";
  const installerPackageType = settings.rustDeskInstallerPackageType;

  return {
    serverHost,
    apiHost: serverHost,
    publicKey,
    publicKeyHash: publicKey ? hashRustDeskPublicKey(publicKey) : null,
    serverConfig: settings.rustDeskServerConfig.trim(),
    targetVersion: settings.rustDeskVersion.trim(),
    defaultPassword: settings.defaultPassword,
    autoInstall: settings.rustDeskAutoInstall,
    autoUpgrade: settings.rustDeskAutoUpgrade,
    installerUrl,
    installerChecksumSha256,
    installerPackageType,
    installerSilentArgs,
    restartServiceAfterApply: settings.rustDeskRestartServiceAfterApply,
    suppressTrayShortcuts: settings.rustDeskSuppressTrayShortcuts,
    hideTray: settings.rustDeskHideTray,
    hideStopService: settings.rustDeskHideStopService,
    allowRemoteConfigModification: settings.rustDeskAllowRemoteConfigModification,
    allowD3DRender: settings.rustDeskAllowD3DRender,
    enableDirectXCapture: settings.rustDeskEnableDirectXCapture,
    upgradeDownloadUrl: installerUrl,
    upgradeChecksumSha256: installerChecksumSha256,
    upgradePackageType: installerPackageType === "AUTO" ? "binary" : installerPackageType.toLowerCase(),
    upgradeSilentArgs: installerSilentArgs,
  };
}

export function normalizeComparableValue(value?: string | null) {
  return (value ?? "").trim().toLowerCase();
}
