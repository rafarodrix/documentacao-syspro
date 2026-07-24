import { createHash, randomBytes } from "node:crypto";
import { ForbiddenException, UnauthorizedException } from "@nestjs/common";
import { readCommonRuntimeConfig } from "@dosc-syspro/config";

export const AGENT_INSTALLATION_TOKEN_HEADER = "x-agent-installation-token";

export function buildAgentInstallationToken() {
  return `ainst_${randomBytes(24).toString("hex")}`;
}

export function hashAgentInstallationToken(token: string) {
  return createHash("sha256").update(token, "utf8").digest("hex");
}

export function readInstallationTokenHeader(headers: Record<string, unknown> | undefined): string | undefined {
  if (!headers) return undefined;
  const raw = headers[AGENT_INSTALLATION_TOKEN_HEADER] ?? headers[AGENT_INSTALLATION_TOKEN_HEADER.toUpperCase()];
  if (typeof raw === "string" && raw.trim()) return raw.trim();
  if (Array.isArray(raw) && typeof raw[0] === "string" && raw[0].trim()) return raw[0].trim();
  return undefined;
}

/** Register continua exigindo chave interna. Heartbeat/desired/telemetry preferem token por instalação. */
export function assertInternalApiKeyOrThrow(internalApiKeyHeader: string | undefined) {
  const expected = readCommonRuntimeConfig().INTERNAL_API_KEY?.trim();
  if (!expected) {
    throw new UnauthorizedException("INTERNAL_API_KEY_NOT_CONFIGURED");
  }
  if (!internalApiKeyHeader) {
    throw new UnauthorizedException("MISSING_INTERNAL_API_KEY");
  }
  if (internalApiKeyHeader !== expected) {
    throw new ForbiddenException("INVALID_INTERNAL_API_KEY");
  }
}

export function isInternalApiKeyValid(internalApiKeyHeader: string | undefined): boolean {
  const expected = readCommonRuntimeConfig().INTERNAL_API_KEY?.trim();
  if (!expected || !internalApiKeyHeader) return false;
  return internalApiKeyHeader === expected;
}
