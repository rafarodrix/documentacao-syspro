import { createHash, randomBytes } from "node:crypto";
import type { RemoteModuleSettings } from "./model";

export function normalizeRustdeskId(value?: string | null) {
  const trimmed = value?.trim();
  if (!trimmed) return null;
  const normalized = trimmed.replace(/\s+/g, "");
  return /^\d{7,12}$/.test(normalized) ? normalized : null;
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

export function buildRustDeskConfigProfile(settings: RemoteModuleSettings) {
  const serverHost = settings.rustDeskServerHost.trim();
  return {
    serverHost,
    apiHost: serverHost,
    publicKey: settings.rustDeskPublicKey.trim(),
    publicKeyHash: settings.rustDeskPublicKey.trim()
      ? hashRustDeskPublicKey(settings.rustDeskPublicKey)
      : null,
    serverConfig: settings.rustDeskServerConfig.trim(),
    targetVersion: settings.rustDeskVersion.trim(),
    defaultPassword: settings.defaultPassword,
  };
}

export function normalizeComparableValue(value?: string | null) {
  return (value ?? "").trim().toLowerCase();
}
