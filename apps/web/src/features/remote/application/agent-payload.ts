import type { Prisma } from "@prisma/client";

export type NormalizedSysproUpdate = {
  companyLabel: string;
  path: string;
  lastFileWriteAt: Date | null;
};

const MAX_SYSPRO_UPDATES_PER_CYCLE = 200;
const MAX_SYSPRO_LABEL_LENGTH = 120;
const MAX_SYSPRO_PATH_LENGTH = 1024;

type ExistingSysproRow = {
  id: string;
  companyLabel: string;
  path: string;
};

function parseSysproDate(value?: string | null) {
  const trimmed = value?.trim();
  if (!trimmed) return null;
  const isoCandidate = trimmed.replace(" ", "T");
  const parsed = new Date(isoCandidate);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
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

    const rawCompany =
      "empresa" in entry && typeof entry.empresa === "string"
        ? entry.empresa
        : "companyLabel" in entry && typeof entry.companyLabel === "string"
          ? entry.companyLabel
          : "";
    const rawPath =
      "caminho" in entry && typeof entry.caminho === "string"
        ? entry.caminho
        : "path" in entry && typeof entry.path === "string"
          ? entry.path
          : "";
    const rawLastFileWriteAt =
      "ultimaAtualizacao" in entry && typeof entry.ultimaAtualizacao === "string"
        ? entry.ultimaAtualizacao
        : "lastFileWriteAt" in entry && typeof entry.lastFileWriteAt === "string"
          ? entry.lastFileWriteAt
          : null;

    const companyLabel = rawCompany.trim().slice(0, MAX_SYSPRO_LABEL_LENGTH);
    const path = rawPath.trim().slice(0, MAX_SYSPRO_PATH_LENGTH);
    if (!companyLabel || !path) continue;

    const key = `${companyLabel.toLowerCase()}::${path.toLowerCase()}`;
    if (unique.has(key)) continue;

    unique.set(key, {
      companyLabel,
      path,
      lastFileWriteAt: parseSysproDate(rawLastFileWriteAt),
    });

    if (unique.size >= MAX_SYSPRO_UPDATES_PER_CYCLE) {
      break;
    }
  }

  return Array.from(unique.values())
    .map((entry) => {
      return {
        companyLabel: entry.companyLabel,
        path: entry.path,
        lastFileWriteAt: entry.lastFileWriteAt,
      };
    })
    .filter((entry): entry is NormalizedSysproUpdate => !!entry);
}

export function serializeSysproUpdatesSnapshot(value: NormalizedSysproUpdate[]) {
  return value.map((entry) => ({
    companyLabel: entry.companyLabel,
    path: entry.path,
    lastFileWriteAt: entry.lastFileWriteAt?.toISOString() ?? null,
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
  }
) {
  if (!input.sysproUpdates.length) return;

  const candidateCompanies = await tx.company.findMany({
    where: {
      deletedAt: null,
    },
    select: {
      id: true,
      nomeFantasia: true,
      razaoSocial: true,
    },
  });

  const existingUpdates = await tx.$queryRaw<ExistingSysproRow[]>`
    SELECT
      "id",
      "companyLabel",
      "path"
    FROM "remote_host_syspro_update"
    WHERE "hostId" = ${input.hostId}
  `;

  const existingKeyMap = new Map(
    existingUpdates.map((entry) => [`${entry.companyLabel}::${entry.path}`.toLowerCase(), entry.id])
  );
  const incomingKeys = new Set<string>();
  const incomingPaths = new Set<string>();

  for (const entry of input.sysproUpdates) {
    const compositeKey = `${entry.companyLabel}::${entry.path}`.toLowerCase();
    incomingKeys.add(compositeKey);
    incomingPaths.add(entry.path.toLowerCase());
    const existingId = existingKeyMap.get(compositeKey);
    const normalizedLabel = normalizeCompareValue(entry.companyLabel);
    const resolvedCompanyId =
      input.hostCompanyNames.includes(normalizedLabel)
        ? input.hostCompanyId
        : candidateCompanies.find((company) => {
            return (
              normalizeCompareValue(company.nomeFantasia) === normalizedLabel ||
              normalizeCompareValue(company.razaoSocial) === normalizedLabel
            );
          })?.id ?? null;

    if (existingId) {
      await tx.$executeRaw`
        UPDATE "remote_host_syspro_update"
        SET
          "companyId" = ${resolvedCompanyId},
          "companyLabel" = ${entry.companyLabel},
          "path" = ${entry.path},
          "lastFileWriteAt" = ${entry.lastFileWriteAt},
          "lastHeartbeatAt" = ${input.heartbeatAt},
          "updatedAt" = ${input.heartbeatAt}
        WHERE "id" = ${existingId}
      `;
      await tx.$executeRaw`
        UPDATE "remote_host_syspro_update"
        SET
          "lastFileWriteAt" = ${entry.lastFileWriteAt},
          "lastHeartbeatAt" = ${input.heartbeatAt},
          "updatedAt" = ${input.heartbeatAt}
        WHERE "hostId" = ${input.hostId}
          AND LOWER("path") = ${entry.path.toLowerCase()}
      `;
      continue;
    }

    await tx.$executeRaw`
      INSERT INTO "remote_host_syspro_update" (
        "id",
        "hostId",
        "companyId",
        "companyLabel",
        "path",
        "lastFileWriteAt",
        "lastHeartbeatAt",
        "createdAt",
        "updatedAt"
      ) VALUES (
        ${crypto.randomUUID()},
        ${input.hostId},
        ${resolvedCompanyId},
        ${entry.companyLabel},
        ${entry.path},
        ${entry.lastFileWriteAt},
        ${input.heartbeatAt},
        ${input.heartbeatAt},
        ${input.heartbeatAt}
      )
    `;

    await tx.$executeRaw`
      UPDATE "remote_host_syspro_update"
      SET
        "lastFileWriteAt" = ${entry.lastFileWriteAt},
        "lastHeartbeatAt" = ${input.heartbeatAt},
        "updatedAt" = ${input.heartbeatAt}
      WHERE "hostId" = ${input.hostId}
        AND LOWER("path") = ${entry.path.toLowerCase()}
    `;
  }

  const staleIds = existingUpdates
    .filter((entry) => !incomingPaths.has(entry.path.toLowerCase()))
    .map((entry) => entry.id);

  for (const staleId of staleIds) {
    await tx.$executeRaw`
      DELETE FROM "remote_host_syspro_update"
      WHERE "id" = ${staleId}
    `;
  }
}
