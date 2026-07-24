import { createHash, randomBytes } from "node:crypto";
import path from "node:path";
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

export function canonicalizeWindowsPath(rawPath?: string | null): string {
  if (!rawPath) return "";
  let cleaned = rawPath.trim().replace(/\//g, "\\");
  cleaned = path.win32.normalize(cleaned);
  if (cleaned.length > 3 && cleaned.endsWith("\\")) {
    cleaned = cleaned.slice(0, -1);
  }
  return cleaned.toLowerCase();
}

export function computeInstallationFingerprint(
  deviceId: string,
  executablePath?: string | null,
  configOrDataPath?: string | null
): string {
  const normExe = canonicalizeWindowsPath(executablePath).toLowerCase();
  const normSecondary = canonicalizeWindowsPath(configOrDataPath).toLowerCase();
  const input = `${deviceId}|${normExe}|${normSecondary}`;
  return createHash("sha256").update(input).digest("hex").slice(0, 32);
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
    const pathStr = rawPath.trim().slice(0, MAX_SYSPRO_PATH_LENGTH);
    if (!companyLabel || !pathStr) continue;

    const key = `${companyLabel.toLowerCase()}::${pathStr.toLowerCase()}`;
    if (unique.has(key)) continue;

    unique.set(key, {
      companyLabel,
      path: pathStr,
      lastFileWriteAt: parseSysproDate(rawLastFileWriteAt),
      isServerHost: rawIsServerHost ?? pathStr.toLowerCase().endsWith("\\syspro\\server\\sysproserver.exe"),
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

export type NormalizedErpInstallationPayload = {
  rootPath: string;
  serverPath?: string | null;
  executablePath?: string | null;
  configPath?: string | null;
  dataPath?: string | null;
  version?: string | null;
  serviceName?: string | null;
  serviceStatus?: string | null;
  processPid?: number | null;
  sources?: string[];
  companies?: Array<{
    code: string;
    name: string;
    companyId?: string | null;
    role?: "PRIMARY" | "SECONDARY";
  }>;
};

function readRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : null;
}

function readRecords(value: unknown): Record<string, unknown>[] {
  return Array.isArray(value) ? value.map(readRecord).filter((value): value is Record<string, unknown> => !!value) : [];
}

function readString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

/**
 * Projects the agent's topology snapshot into the installation domain. The
 * snapshot remains useful as raw telemetry; this is the single boundary that
 * turns its validated server evidence into durable ERP installations.
 */
export function buildErpInstallationsFromSysproSnapshot(snapshot: unknown): NormalizedErpInstallationPayload[] {
  const installationGroups = readRecords(readRecord(snapshot)?.installationGroups);
  const candidates: NormalizedErpInstallationPayload[] = [];

  for (const group of installationGroups) {
    const rootPath = readString(group.rootPath);
    if (!rootPath) continue;
    const sources = Array.isArray(group.discoveryEvidence)
      ? group.discoveryEvidence.filter((value): value is string => typeof value === "string" && !!value.trim())
      : [];
    const servers = readRecords(group.serverInstances);

    if (!servers.length) {
      candidates.push({ rootPath, sources });
      continue;
    }

    for (const server of servers) {
      const validation = readRecord(server.validation);
      if (readString(validation?.status)?.toUpperCase() !== "VALIDATED") continue;

      const version = readRecord(server.version);
      const execution = readRecord(server.execution);
      const dataPath = readString(readRecord(readRecords(server.dataDirectories)[0])?.path);
      const companies = readRecords(server.companyHints)
        .map((hint, index) => {
          const companyId = readString(hint.companyId);
          const name = readString(hint.companyName);
          const code = companyId ?? name;
          return code && name
            ? { code, name, companyId, role: index === 0 ? "PRIMARY" as const : "SECONDARY" as const }
            : null;
        })
        .filter((company): company is NonNullable<typeof company> => !!company);

      candidates.push({
        rootPath,
        serverPath: readString(server.rootPath),
        executablePath: readString(server.executablePath),
        configPath: readString(server.configurationPath),
        dataPath,
        version: readString(version?.productVersion) ?? readString(version?.fileVersion),
        serviceStatus: readString(execution?.serviceStatus),
        processPid: typeof execution?.pid === "number" && Number.isInteger(execution.pid) ? execution.pid : null,
        sources,
        companies,
      });
    }
  }

  return candidates;
}

export async function syncErpInstallations(
  tx: Prisma.TransactionClient,
  input: {
    hostId: string;
    heartbeatAt: Date;
    installations: NormalizedErpInstallationPayload[];
  }
) {
  if (!input.installations || !Array.isArray(input.installations)) return;

  const candidateCompanies = await tx.company.findMany({
    where: { deletedAt: null },
    select: { id: true, nomeFantasia: true, razaoSocial: true },
  });

  const installationsByFingerprint = new Map<string, NormalizedErpInstallationPayload>();
  for (const item of input.installations) {
    if (!item.rootPath) continue;

    const fingerprint = computeInstallationFingerprint(
      input.hostId,
      item.executablePath ?? item.rootPath,
      item.configPath ?? item.dataPath,
    );
    const previous = installationsByFingerprint.get(fingerprint);
    if (previous) {
      previous.sources = Array.from(new Set([...(previous.sources ?? []), ...(item.sources ?? [])]));
      previous.companies = [...(previous.companies ?? []), ...(item.companies ?? [])];
      continue;
    }
    installationsByFingerprint.set(fingerprint, { ...item });
  }

  for (const item of installationsByFingerprint.values()) {
    if (!item.rootPath) continue;

    const canonicalRootPath = canonicalizeWindowsPath(item.rootPath);
    if (!canonicalRootPath) continue;

    const serverPath = item.serverPath ? canonicalizeWindowsPath(item.serverPath) : null;
    const executablePath = item.executablePath ? canonicalizeWindowsPath(item.executablePath) : null;
    const configPath = item.configPath ? canonicalizeWindowsPath(item.configPath) : null;
    const dataPath = item.dataPath ? canonicalizeWindowsPath(item.dataPath) : null;

    const fingerprint = computeInstallationFingerprint(input.hostId, executablePath ?? canonicalRootPath, configPath ?? dataPath);
    const existingInstallation = await tx.erpInstallation.findFirst({
      where: {
        deviceId: input.hostId,
        OR: [
          { installationFingerprint: fingerprint },
          { canonicalRootPath: { equals: canonicalRootPath, mode: "insensitive" } },
        ],
      },
      select: { id: true },
    });
    const data = {
      rootPath: item.rootPath,
      canonicalRootPath,
      serverPath,
      executablePath,
      configPath,
      dataPath,
      version: item.version ?? null,
      serviceName: item.serviceName ?? null,
      serviceStatus: item.serviceStatus ?? null,
      processPid: item.processPid ?? null,
      installationFingerprint: fingerprint,
      discoverySources: Array.from(new Set(item.sources ?? ["FILESYSTEM"])),
      lastSeenAt: input.heartbeatAt,
    };
    const installation = existingInstallation
      ? await tx.erpInstallation.update({ where: { id: existingInstallation.id }, data })
      : await tx.erpInstallation.create({
        data: {
        deviceId: input.hostId,
          ...data,
        },
      });

    if (item.companies && Array.isArray(item.companies)) {
      for (const compHint of item.companies) {
        const compCode = (compHint.code || "1").trim();
        const compName = (compHint.name || "").trim();
        const normName = normalizeCompareValue(compName);

        const matchedCompany = candidateCompanies.find(
          (c) =>
            c.id === compHint.companyId ||
            normalizeCompareValue(c.nomeFantasia) === normName ||
            normalizeCompareValue(c.razaoSocial) === normName
        );

        const role = compHint.role === "SECONDARY" ? "SECONDARY" : "PRIMARY";

        await tx.erpInstallationCompany.upsert({
          where: {
            installationId_companyCode: {
              installationId: installation.id,
              companyCode: compCode,
            },
          },
          create: {
            installationId: installation.id,
            companyCode: compCode,
            companyName: compName,
            companyId: matchedCompany?.id ?? null,
            role,
            active: true,
          },
          update: {
            companyName: compName,
            companyId: matchedCompany?.id ?? null,
            role,
            active: true,
          },
        });
      }
    }
  }

  if (installationsByFingerprint.size > 0) {
    await tx.remoteHost.updateMany({
      where: { id: input.hostId, machineProfile: null },
      data: { machineProfile: "SERVER" },
    });
  }
}

export type ErpRuntimeProbeResultPayload = {
  installationId: string;
  status: "VERIFIED" | "UNREACHABLE";
  runtimeType?: string | null;
  port?: number | null;
  checkedAt?: Date | null;
};

export function normalizeErpRuntimeProbeResults(snapshot: unknown): ErpRuntimeProbeResultPayload[] {
  if (!snapshot || typeof snapshot !== "object" || Array.isArray(snapshot)) {
    return [];
  }
  const results = (snapshot as { results?: unknown }).results;
  if (!Array.isArray(results)) {
    return [];
  }

  const out: ErpRuntimeProbeResultPayload[] = [];
  for (const entry of results) {
    if (!entry || typeof entry !== "object" || Array.isArray(entry)) continue;
    const record = entry as Record<string, unknown>;
    const installationId =
      typeof record.installationId === "string"
        ? record.installationId.trim()
        : typeof record.installation_id === "string"
          ? record.installation_id.trim()
          : "";
    const statusRaw = typeof record.status === "string" ? record.status.trim().toUpperCase() : "";
    if (!installationId || (statusRaw !== "VERIFIED" && statusRaw !== "UNREACHABLE")) continue;

    const port =
      typeof record.port === "number" && Number.isInteger(record.port) && record.port > 0 && record.port <= 65535
        ? record.port
        : null;
    const runtimeType = typeof record.runtimeType === "string" ? record.runtimeType.trim() : null;
    const checkedAtRaw = typeof record.checkedAt === "string" ? record.checkedAt : null;
    const checkedAt = checkedAtRaw ? new Date(checkedAtRaw) : null;

    out.push({
      installationId,
      status: statusRaw,
      runtimeType: runtimeType || null,
      port,
      checkedAt: checkedAt && !Number.isNaN(checkedAt.getTime()) ? checkedAt : null,
    });
  }
  return out;
}

export async function applyErpRuntimeProbeResults(
  tx: Prisma.TransactionClient,
  input: {
    hostId: string;
    heartbeatAt: Date;
    probes: unknown;
  },
) {
  const results = normalizeErpRuntimeProbeResults(input.probes);
  if (results.length === 0) return;

  for (const result of results) {
    const existing = await tx.erpInstallation.findFirst({
      where: { id: result.installationId, deviceId: input.hostId },
      select: { id: true },
    });
    if (!existing) continue;

    const checkedAt = result.checkedAt ?? input.heartbeatAt;
    await tx.erpInstallation.update({
      where: { id: existing.id },
      data: {
        runtimeStatus: result.status,
        lastRuntimeCheckAt: checkedAt,
        ...(result.port ? { detectedPort: result.port } : {}),
        ...(result.runtimeType === "SYSPRO_SERVER" || result.runtimeType === "IIS"
          ? { detectedRuntimeType: result.runtimeType }
          : {}),
      },
    });
  }
}
