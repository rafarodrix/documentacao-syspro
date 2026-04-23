import { createHash, randomBytes } from "node:crypto";

export type RustDeskConfigSettings = {
  rustDeskServerHost: string;
  rustDeskServerConfig: string;
  rustDeskPublicKey: string;
  rustDeskVersion: string;
  defaultPassword: string;
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
  const upgradeDownloadUrl = process.env.REMOTE_RUSTDESK_UPGRADE_URL?.trim() || null;
  const upgradeChecksumSha256 = process.env.REMOTE_RUSTDESK_UPGRADE_SHA256?.trim().toLowerCase() || null;
  const upgradePackageType = process.env.REMOTE_RUSTDESK_UPGRADE_PACKAGE_TYPE?.trim().toLowerCase() || "binary";
  const upgradeSilentArgs = process.env.REMOTE_RUSTDESK_UPGRADE_SILENT_ARGS?.trim() || "/S";

  return {
    serverHost,
    apiHost: serverHost,
    publicKey,
    publicKeyHash: publicKey ? hashRustDeskPublicKey(publicKey) : null,
    serverConfig: settings.rustDeskServerConfig.trim(),
    targetVersion: settings.rustDeskVersion.trim(),
    defaultPassword: settings.defaultPassword,
    upgradeDownloadUrl,
    upgradeChecksumSha256,
    upgradePackageType,
    upgradeSilentArgs,
  };
}

export function normalizeComparableValue(value?: string | null) {
  return (value ?? "").trim().toLowerCase();
}
