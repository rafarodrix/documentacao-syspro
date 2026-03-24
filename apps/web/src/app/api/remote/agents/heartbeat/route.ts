import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { consumeActionRateLimit } from "@/lib/security/action-rate-limit";
import { createRequestLogger } from "@/lib/observability/logger";

export const dynamic = "force-dynamic";

function normalizeRustdeskId(value?: string | null) {
  const trimmed = value?.trim();
  if (!trimmed) return undefined;
  return trimmed.replace(/\s+/g, "");
}

function parseSysproDate(value?: string | null) {
  const trimmed = value?.trim();
  if (!trimmed) return null;
  const isoCandidate = trimmed.replace(" ", "T");
  const parsed = new Date(isoCandidate);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function normalizeSysproUpdates(
  value: unknown
): Array<{ companyLabel: string; path: string; lastFileWriteAt: Date | null }> {
  if (!Array.isArray(value)) return [];

  return value
    .map((entry) => {
      if (!entry || typeof entry !== "object") return null;

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

      const companyLabel = rawCompany.trim();
      const path = rawPath.trim();
      if (!companyLabel || !path) return null;

      return {
        companyLabel,
        path,
        lastFileWriteAt: parseSysproDate(rawLastFileWriteAt),
      };
    })
    .filter((entry): entry is { companyLabel: string; path: string; lastFileWriteAt: Date | null } => !!entry);
}

type ExistingSysproRow = {
  id: string;
  companyLabel: string;
  path: string;
};

export async function POST(request: Request) {
  const { logger, responseHeaders } = createRequestLogger(request, {
    area: "api",
    feature: "remote-agent-heartbeat",
  });
  const ip = request.headers.get("cf-connecting-ip") ?? request.headers.get("x-forwarded-for");
  const rateLimit = consumeActionRateLimit({
    action: "remote-agent-heartbeat",
    ip,
    max: 30,
    windowMs: 60_000,
  });
  if (!rateLimit.allowed) {
    logger.warn("remote.agent.heartbeat.rate_limited", {
      retryAfterSeconds: rateLimit.retryAfterSeconds,
    });
    return NextResponse.json(
      { success: false, error: "Rate limit excedido para heartbeat do agente." },
      {
        status: 429,
        headers: {
          ...responseHeaders,
          "Retry-After": String(rateLimit.retryAfterSeconds),
        },
      }
    );
  }

  const body = (await request.json()) as {
    installToken?: string;
    rustdeskId?: string | null;
    machineName?: string | null;
    agentVersion?: string | null;
    sysproUpdates?: unknown;
  };

  const installToken = body.installToken?.trim();
  if (!installToken) {
    logger.warn("remote.agent.heartbeat.missing_install_token");
    return NextResponse.json({ success: false, error: "installToken e obrigatorio." }, { status: 400, headers: responseHeaders });
  }

  const host = await prisma.remoteHost.findFirst({
    where: { installToken },
    select: { id: true },
  });

  if (!host) {
    logger.warn("remote.agent.heartbeat.invalid_install_token");
    return NextResponse.json({ success: false, error: "Token de instalacao invalido." }, { status: 404, headers: responseHeaders });
  }

  const heartbeatAt = new Date();
  const sysproUpdates = normalizeSysproUpdates(body.sysproUpdates);

  const updated = await prisma.$transaction(async (tx) => {
    const remoteHost = await tx.remoteHost.update({
      where: { id: host.id },
      data: {
        agentExternalId: normalizeRustdeskId(body.rustdeskId),
        machineName: body.machineName?.trim() || undefined,
        agentVersion: body.agentVersion?.trim() || undefined,
        lastHeartbeatAt: heartbeatAt,
        status: "ACTIVE",
      },
      select: {
        id: true,
        lastHeartbeatAt: true,
        status: true,
        agentExternalId: true,
        machineName: true,
        agentVersion: true,
      },
    });

    if (sysproUpdates.length) {
      const existingUpdates = await tx.$queryRaw<ExistingSysproRow[]>`
        SELECT
          "id",
          "companyLabel",
          "path"
        FROM "remote_host_syspro_update"
        WHERE "hostId" = ${host.id}
      `;

      const existingKeyMap = new Map(
        existingUpdates.map((entry) => [`${entry.companyLabel}::${entry.path}`.toLowerCase(), entry.id])
      );
      const incomingKeys = new Set<string>();

      for (const entry of sysproUpdates) {
        const compositeKey = `${entry.companyLabel}::${entry.path}`.toLowerCase();
        incomingKeys.add(compositeKey);
        const existingId = existingKeyMap.get(compositeKey);

        if (existingId) {
          await tx.$executeRaw`
            UPDATE "remote_host_syspro_update"
            SET
              "companyLabel" = ${entry.companyLabel},
              "path" = ${entry.path},
              "lastFileWriteAt" = ${entry.lastFileWriteAt},
              "lastHeartbeatAt" = ${heartbeatAt},
              "updatedAt" = ${heartbeatAt}
            WHERE "id" = ${existingId}
          `;
          continue;
        }

        await tx.$executeRaw`
          INSERT INTO "remote_host_syspro_update" (
            "id",
            "hostId",
            "companyLabel",
            "path",
            "lastFileWriteAt",
            "lastHeartbeatAt",
            "createdAt",
            "updatedAt"
          ) VALUES (
            ${crypto.randomUUID()},
            ${host.id},
            ${entry.companyLabel},
            ${entry.path},
            ${entry.lastFileWriteAt},
            ${heartbeatAt},
            ${heartbeatAt},
            ${heartbeatAt}
          )
        `;
      }

      const staleIds = existingUpdates
        .filter((entry) => !incomingKeys.has(`${entry.companyLabel}::${entry.path}`.toLowerCase()))
        .map((entry) => entry.id);

      if (staleIds.length) {
        for (const staleId of staleIds) {
          await tx.$executeRaw`
            DELETE FROM "remote_host_syspro_update"
            WHERE "id" = ${staleId}
          `;
        }
      }
    }

    return remoteHost;
  });

  logger.info("remote.agent.heartbeat.succeeded", {
    hostId: updated.id,
    machineName: updated.machineName,
    sysproUpdateCount: sysproUpdates.length,
  });

  return NextResponse.json({ success: true, data: updated }, { headers: responseHeaders });
}
