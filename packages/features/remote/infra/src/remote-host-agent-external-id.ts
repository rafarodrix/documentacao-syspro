import { Prisma } from "@prisma/client";
import { prisma } from "@dosc-syspro/database";

function withDataError(message: string, data?: unknown) {
  const error = new Error(message) as Error & { data?: unknown };
  if (data !== undefined) {
    error.data = data;
  }
  return error;
}

function normalizeCompanyLabel(input: { nomeFantasia: string | null; razaoSocial: string | null } | null | undefined) {
  const nomeFantasia = input?.nomeFantasia?.trim();
  const razaoSocial = input?.razaoSocial?.trim();
  return nomeFantasia || razaoSocial || "empresa";
}

export async function assertRemoteHostAgentExternalIdAvailable(input: {
  agentExternalId: string;
  excludingHostId?: string;
}) {
  const conflictingHost = await prisma.remoteHost.findFirst({
    where: {
      agentExternalId: input.agentExternalId,
      ...(input.excludingHostId ? { id: { not: input.excludingHostId } } : {}),
    },
    select: {
      id: true,
      company: {
        select: {
          nomeFantasia: true,
          razaoSocial: true,
        },
      },
    },
  });

  if (!conflictingHost) {
    return;
  }

  throw withDataError("HOST_AGENT_EXTERNAL_ID_CONFLICT", {
    companyLabel: normalizeCompanyLabel(conflictingHost.company),
  });
}

export function isRemoteHostAgentExternalIdUniqueError(error: unknown) {
  if (!(error instanceof Prisma.PrismaClientKnownRequestError) || error.code !== "P2002") {
    return false;
  }

  const metaTarget = error.meta?.target;
  const targets = Array.isArray(metaTarget)
    ? metaTarget.map((value) => String(value))
    : typeof metaTarget === "string"
      ? [metaTarget]
      : [];

  return targets.length === 0 || targets.some((target) => target.includes("agentExternalId"));
}

export function throwRemoteHostAgentExternalIdConflict() {
  throw withDataError("HOST_AGENT_EXTERNAL_ID_CONFLICT");
}
