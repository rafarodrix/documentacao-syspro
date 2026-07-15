import { randomUUID } from "node:crypto";
import { prisma, buildScopedWhere, normalizeCompareValue, normalizeSysproUpdates, syncRemoteHostSysproUpdates } from "@dosc-syspro/database";
import { normalizeRustdeskIdStrict } from "./rustdesk-helpers";
import {
  assertRemoteHostAgentExternalIdAvailable,
  isRemoteHostAgentExternalIdUniqueError,
  throwRemoteHostAgentExternalIdConflict,
} from "./remote-host-agent-external-id";
import { buildCompanyDisplayLabel, resolveScopedCompanyContext, type ScopedCompanyContext } from "./scoped-company-context";

function buildInstallToken() {
  return `rhost_${randomUUID().replace(/-/g, "").slice(0, 24)}`;
}

async function resolveCompanyContextForLink(input: {
  companyId: string;
  scope?: { isGlobalView: boolean; companyIds: string[] };
}): Promise<ScopedCompanyContext> {
  if (input.scope) {
    return resolveScopedCompanyContext({
      scope: input.scope,
      companyId: input.companyId,
    });
  }

  const company = await prisma.company.findFirst({
    where: { id: input.companyId, deletedAt: null },
    select: { id: true, nomeFantasia: true, razaoSocial: true },
  });

  if (!company) {
    throw new Error("HOST_COMPANY_NOT_FOUND");
  }

  return {
    ...company,
    displayLabel: buildCompanyDisplayLabel(company),
    normalizedPrimaryNames: [normalizeCompareValue(company.nomeFantasia), normalizeCompareValue(company.razaoSocial)].filter(Boolean),
  };
}

export async function resolveAutoLinkCompanyId(input: {
  installationsSnapshot: unknown;
}): Promise<string | null> {
  const sysproUpdates = normalizeSysproUpdates(input.installationsSnapshot);
  if (!sysproUpdates.length) {
    return null;
  }

  const companies = await prisma.company.findMany({
    where: { deletedAt: null },
    select: { id: true, nomeFantasia: true, razaoSocial: true },
  });

  const matchedCompanyIds = new Set<string>();
  for (const entry of sysproUpdates) {
    const normalizedLabel = normalizeCompareValue(entry.companyLabel);
    if (!normalizedLabel) {
      continue;
    }

    const matches = companies.filter((company) => {
      return (
        normalizeCompareValue(company.nomeFantasia) === normalizedLabel ||
        normalizeCompareValue(company.razaoSocial) === normalizedLabel
      );
    });

    if (matches.length !== 1) {
      continue;
    }

    matchedCompanyIds.add(matches[0].id);
    if (matchedCompanyIds.size > 1) {
      return null;
    }
  }

  const [companyId] = Array.from(matchedCompanyIds);
  return companyId ?? null;
}

export async function linkDiscoveredHostRecord(input: {
  discoveredHostId: string;
  companyId: string;
  name: string;
  description?: string | null;
  scope?: { isGlobalView: boolean; companyIds: string[] };
}) {
  const [company, discoveredHost] = await Promise.all([
    resolveCompanyContextForLink({ scope: input.scope, companyId: input.companyId }),
    prisma.remoteDiscoveredHost.findFirst({ where: { id: input.discoveredHostId } }),
  ]);

  if (!discoveredHost) {
    throw new Error("DISCOVERED_HOST_NOT_FOUND");
  }

  if (discoveredHost.status === "IGNORED") {
    throw new Error("DISCOVERED_HOST_IGNORED");
  }

  if (discoveredHost.linkedHostId) {
    const linkedHost = await prisma.remoteHost.findFirst({
      where: { id: discoveredHost.linkedHostId },
      select: {
        id: true,
        name: true,
        installToken: true,
        agentTokenHash: true,
        lastHeartbeatErrorMessage: true,
      },
    });

    if (!linkedHost) {
      throw new Error("HOST_NOT_FOUND");
    }

    return {
      hostId: linkedHost.id,
      hostName: linkedHost.name,
      discoveredHostId: discoveredHost.id,
      created: false,
      installToken: linkedHost.installToken,
      agentTokenHash: linkedHost.agentTokenHash,
      lastHeartbeatErrorMessage: linkedHost.lastHeartbeatErrorMessage,
    };
  }

  const scopedWhere = buildScopedWhere(input.scope?.companyIds ?? [], input.scope?.isGlobalView ?? true);
  const heartbeatAt = discoveredHost.lastHeartbeatAt ?? new Date();
  const sysproUpdates = normalizeSysproUpdates(discoveredHost.installationsSnapshot);
  const incomingAgentExternalId = discoveredHost.agentExternalId?.trim() || null;
  const agentExternalId = normalizeRustdeskIdStrict(incomingAgentExternalId);
  const machineName = discoveredHost.machineName?.trim() || null;

  if (incomingAgentExternalId && !agentExternalId) {
    throw new Error("HOST_AGENT_EXTERNAL_ID_INVALID");
  }

  let existingHostId: string | null = null;

  if (agentExternalId) {
    const existingByRustdesk = await prisma.remoteHost.findFirst({
      where: {
        agentExternalId,
        ...scopedWhere,
      },
      select: { id: true, companyId: true, agentExternalId: true },
    });

    if (existingByRustdesk) {
      if (existingByRustdesk.companyId !== input.companyId) {
        throw new Error("HOST_AGENT_EXTERNAL_ID_CONFLICT");
      }
      existingHostId = existingByRustdesk.id;
    }
  }

  if (!existingHostId && machineName) {
    const existingByMachine = await prisma.remoteHost.findFirst({
      where: {
        companyId: input.companyId,
        machineName: { equals: machineName, mode: "insensitive" },
        ...scopedWhere,
      },
      select: { id: true, agentExternalId: true },
      orderBy: [{ lastHeartbeatAt: "desc" }],
    });

    if (existingByMachine) {
      if (
        agentExternalId &&
        existingByMachine.agentExternalId &&
        existingByMachine.agentExternalId !== agentExternalId
      ) {
        throw new Error("HOST_MACHINE_NAME_CONFLICT");
      }
      existingHostId = existingByMachine.id;
    }
  }

  const finalizeLink = async (hostId: string, created: boolean) => {
    await prisma.$transaction(async (tx) => {
      const hostRecord = await tx.remoteHost.findUnique({
        where: { id: hostId },
        select: {
          id: true,
          installToken: true,
        },
      });

      if (!hostRecord) {
        throw new Error("HOST_NOT_FOUND");
      }

      await tx.remoteHost.update({
        where: { id: hostId },
        data: {
          name: input.name,
          provider: discoveredHost.provider?.trim() || "RustDesk",
          environment: discoveredHost.environment?.trim() || null,
          description: input.description?.trim() || discoveredHost.description?.trim() || null,
          ...(agentExternalId ? { agentExternalId } : {}),
          ...(machineName ? { machineName } : {}),
          agentVersion: discoveredHost.agentVersion?.trim() || undefined,
          serviceStatus: discoveredHost.serviceStatus?.trim() || undefined,
          lastHeartbeatAt: heartbeatAt,
          status: "ACTIVE",
          ...(!hostRecord.installToken ? { installToken: buildInstallToken() } : {}),
        },
      });

      await syncRemoteHostSysproUpdates(tx, {
        hostId,
        hostCompanyId: input.companyId,
        hostCompanyNames: company.normalizedPrimaryNames,
        heartbeatAt,
        sysproUpdates,
      });

      await tx.remoteDiscoveredHost.update({
        where: { id: discoveredHost.id },
        data: {
          linkedHostId: hostId,
          linkedAt: new Date(),
          status: "LINKED",
        },
      });
    });

    const linkedHost = await prisma.remoteHost.findFirst({
      where: { id: hostId },
      select: {
        id: true,
        name: true,
        installToken: true,
        agentTokenHash: true,
        lastHeartbeatErrorMessage: true,
      },
    });

    if (!linkedHost) {
      throw new Error("HOST_NOT_FOUND");
    }

    return {
      hostId: linkedHost.id,
      hostName: linkedHost.name,
      discoveredHostId: discoveredHost.id,
      created,
      installToken: linkedHost.installToken,
      agentTokenHash: linkedHost.agentTokenHash,
      lastHeartbeatErrorMessage: linkedHost.lastHeartbeatErrorMessage,
    };
  };

  if (existingHostId) {
    if (agentExternalId) {
      await assertRemoteHostAgentExternalIdAvailable({
        agentExternalId,
        excludingHostId: existingHostId,
      });
    }
    return finalizeLink(existingHostId, false);
  }

  if (agentExternalId) {
    await assertRemoteHostAgentExternalIdAvailable({ agentExternalId });
  }

  try {
    const host = await prisma.$transaction(async (tx) => {
      const createdHost = await tx.remoteHost.create({
        data: {
          companyId: input.companyId,
          name: input.name,
          provider: discoveredHost.provider?.trim() || "RustDesk",
          environment: discoveredHost.environment?.trim() || null,
          description: input.description?.trim() || discoveredHost.description?.trim() || null,
          agentExternalId,
          installToken: buildInstallToken(),
          machineName,
          agentVersion: discoveredHost.agentVersion?.trim() || null,
          serviceStatus: discoveredHost.serviceStatus?.trim() || null,
          lastHeartbeatAt: heartbeatAt,
          status: "ACTIVE",
        },
        select: { id: true },
      });

      await syncRemoteHostSysproUpdates(tx, {
        hostId: createdHost.id,
        hostCompanyId: input.companyId,
        hostCompanyNames: company.normalizedPrimaryNames,
        heartbeatAt,
        sysproUpdates,
      });

      await tx.remoteDiscoveredHost.update({
        where: { id: discoveredHost.id },
        data: {
          linkedHostId: createdHost.id,
          linkedAt: new Date(),
          status: "LINKED",
        },
      });

      return createdHost;
    });

    return finalizeLink(host.id, true);
  } catch (error) {
    if (!isRemoteHostAgentExternalIdUniqueError(error)) {
      throw error;
    }
    throwRemoteHostAgentExternalIdConflict();
    throw error;
  }
}
