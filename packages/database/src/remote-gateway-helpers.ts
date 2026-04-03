import { createHash, randomBytes } from "node:crypto";
import type { Prisma } from "@prisma/client";

export type NormalizedSysproUpdate = {
  companyLabel: string;
  path: string;
  lastFileWriteAt: Date | null;
  isServerHost: boolean;
  hasClientFolder: boolean;
  hasDllFolder: boolean;
  firebirdVersion: string | null;
  firebirdPath: string | null;
};

const MAX_SYSPRO_UPDATES_PER_CYCLE = 200;
const MAX_SYSPRO_LABEL_LENGTH = 120;
const MAX_SYSPRO_PATH_LENGTH = 1024;

export function buildScopedWhere(companyIds: string[], isGlobalView: boolean) {
  return isGlobalView ? {} : { companyId: { in: companyIds.length ? companyIds : ["__none__"] } };
}

function parseSysproDate(value?: string | null) {
  const trimmed = value?.trim();
  if (!trimmed) return null;

  const directParsed = new Date(trimmed);
  if (!Number.isNaN(directParsed.getTime())) return directParsed;

  const isoCandidate = trimmed.replace(" ", "T");
  const isoParsed = new Date(isoCandidate);
  if (!Number.isNaN(isoParsed.getTime())) return isoParsed;

  const legacyPtBr = /^(\d{2})\/(\d{2})\/(\d{4})(?:\s+(\d{2}):(\d{2})(?::(\d{2}))?)?$/.exec(trimmed);
  if (legacyPtBr) {
    const [, dd, mm, yyyy, hh = "00", min = "00", ss = "00"] = legacyPtBr;
    const parsed = new Date(
      Number(yyyy),
      Number(mm) - 1,
      Number(dd),
      Number(hh),
      Number(min),
      Number(ss),
    );
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  return null;
}

export function normalizeCompareValue(value?: string | null) {
  return (value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

export function normalizeRustdeskIdStrict(value?: string | null) {
  const digitsOnly = (value ?? "").replace(/\D/g, "").trim();
  if (!digitsOnly) return null;
  return /^\d{7,12}$/.test(digitsOnly) ? digitsOnly : null;
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

export function normalizeSysproUpdates(value: unknown): NormalizedSysproUpdate[] {
  if (!Array.isArray(value)) return [];
  const unique = new Map<string, NormalizedSysproUpdate>();

  for (const entry of value) {
    if (!entry || typeof entry !== "object") continue;

    const source = entry as Record<string, unknown>;
    const rawCompany =
      typeof source.empresa === "string"
        ? source.empresa
        : typeof source.companyLabel === "string"
          ? source.companyLabel
          : "";
    const rawPath =
      typeof source.caminho === "string"
        ? source.caminho
        : typeof source.path === "string"
          ? source.path
          : "";
    const rawLastFileWriteAt =
      typeof source.lastUpdateUtc === "string"
        ? source.lastUpdateUtc
        : typeof source.ultimaAtualizacao === "string"
          ? source.ultimaAtualizacao
          : typeof source.lastFileWriteAt === "string"
            ? source.lastFileWriteAt
            : null;
    const rawIsServerHost = typeof source.isServerHost === "boolean" ? source.isServerHost : null;
    const rawHasClientFolder = typeof source.hasClientFolder === "boolean" ? source.hasClientFolder : null;
    const rawHasDllFolder = typeof source.hasDllFolder === "boolean" ? source.hasDllFolder : null;
    const rawFirebirdVersion = typeof source.firebirdVersion === "string" ? source.firebirdVersion : null;
    const rawFirebirdPath = typeof source.firebirdPath === "string" ? source.firebirdPath : null;

    const companyLabel = rawCompany.trim().slice(0, MAX_SYSPRO_LABEL_LENGTH);
    const path = rawPath.trim().slice(0, MAX_SYSPRO_PATH_LENGTH);
    if (!companyLabel || !path) continue;

    const key = `${companyLabel.toLowerCase()}::${path.toLowerCase()}`;
    if (unique.has(key)) continue;

    unique.set(key, {
      companyLabel,
      path,
      lastFileWriteAt: parseSysproDate(rawLastFileWriteAt),
      isServerHost: rawIsServerHost ?? path.toLowerCase().endsWith("\\syspro\\server\\sysproserver.exe"),
      hasClientFolder: rawHasClientFolder ?? false,
      hasDllFolder: rawHasDllFolder ?? false,
      firebirdVersion: rawFirebirdVersion?.trim() ? rawFirebirdVersion.trim() : null,
      firebirdPath: rawFirebirdPath?.trim() ? rawFirebirdPath.trim() : null,
    });

    if (unique.size >= MAX_SYSPRO_UPDATES_PER_CYCLE) break;
  }

  return Array.from(unique.values());
}

export function serializeSysproUpdatesSnapshot(value: NormalizedSysproUpdate[]) {
  return value.map((entry) => ({
    companyLabel: entry.companyLabel,
    path: entry.path,
    lastFileWriteAt: entry.lastFileWriteAt?.toISOString() ?? null,
    isServerHost: entry.isServerHost,
    hasClientFolder: entry.hasClientFolder,
    hasDllFolder: entry.hasDllFolder,
    firebirdVersion: entry.firebirdVersion ?? null,
    firebirdPath: entry.firebirdPath ?? null,
  }));
}

export async function syncRemoteHostSysproUpdates(
  tx: Prisma.TransactionClient,
  input: {
    hostId: string;
    hostCompanyId: string;
    hostCompanyNames: string[];
    heartbeatAt: Date;
    sysproUpdates: NormalizedSysproUpdate[];
  },
) {
  if (!input.sysproUpdates.length) return;

  const candidateCompanies = await tx.company.findMany({
    where: { deletedAt: null },
    select: { id: true, nomeFantasia: true, razaoSocial: true },
  });

  const existingUpdates = await tx.$queryRaw<Array<{ id: string; companyLabel: string; path: string }>>`
    SELECT
      "id",
      "companyLabel",
      "path"
    FROM "remote_host_syspro_update"
    WHERE "hostId" = ${input.hostId}
  `;

  const existingKeyMap = new Map(existingUpdates.map((entry) => [`${entry.companyLabel}::${entry.path}`.toLowerCase(), entry.id]));
  const existingPathMap = new Map(existingUpdates.map((entry) => [entry.path.toLowerCase(), entry.id]));
  const incomingPaths = new Set<string>();

  for (const entry of input.sysproUpdates) {
    const compositeKey = `${entry.companyLabel}::${entry.path}`.toLowerCase();
    incomingPaths.add(entry.path.toLowerCase());
    const existingId = existingKeyMap.get(compositeKey) ?? existingPathMap.get(entry.path.toLowerCase());
    const normalizedLabel = normalizeCompareValue(entry.companyLabel);

    const resolvedCompanyId =
      input.hostCompanyNames.includes(normalizedLabel)
        ? input.hostCompanyId
        : candidateCompanies.find(
            (company) =>
              normalizeCompareValue(company.nomeFantasia) === normalizedLabel ||
              normalizeCompareValue(company.razaoSocial) === normalizedLabel,
          )?.id ?? null;

    if (existingId) {
      await tx.remoteHostSysproUpdate.update({
        where: { id: existingId },
        data: {
          companyId: resolvedCompanyId,
          companyLabel: entry.companyLabel,
          path: entry.path,
          lastFileWriteAt: entry.lastFileWriteAt,
          isServerHost: entry.isServerHost,
          hasClientFolder: entry.hasClientFolder,
          hasDllFolder: entry.hasDllFolder,
          firebirdVersion: entry.firebirdVersion,
          firebirdPath: entry.firebirdPath,
          lastHeartbeatAt: input.heartbeatAt,
          updatedAt: input.heartbeatAt,
        },
      });
      continue;
    }

    await tx.remoteHostSysproUpdate.create({
      data: {
        hostId: input.hostId,
        companyId: resolvedCompanyId,
        companyLabel: entry.companyLabel,
        path: entry.path,
        
        lastFileWriteAt: entry.lastFileWriteAt,
        isServerHost: entry.isServerHost,
        hasClientFolder: entry.hasClientFolder,
        hasDllFolder: entry.hasDllFolder,
        firebirdVersion: entry.firebirdVersion,
        firebirdPath: entry.firebirdPath,
        lastHeartbeatAt: input.heartbeatAt,
        createdAt: input.heartbeatAt,
        updatedAt: input.heartbeatAt,
      },
    });
  }

  const staleIds = existingUpdates
    .filter((entry) => !incomingPaths.has(entry.path.toLowerCase()))
    .map((entry) => entry.id);

  for (const staleId of staleIds) {
    await tx.remoteHostSysproUpdate.delete({ where: { id: staleId } });
  }
}

export const ADDRESS_BOOK_TOKEN_PREFIX = "trlabk_";

export function hashAddressBookToken(token: string) {
  return createHash("sha256").update(token, "utf8").digest("hex");
}

export function buildAddressBookToken() {
  const raw = randomBytes(24).toString("base64url");
  const token = `${ADDRESS_BOOK_TOKEN_PREFIX}${raw}`;
  return {
    token,
    tokenHash: hashAddressBookToken(token),
    tokenPreview: `${token.slice(0, 14)}...`,
  };
}


