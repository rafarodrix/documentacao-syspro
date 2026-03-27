import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { consumeActionRateLimit } from "@/lib/security/action-rate-limit";
import { createRequestLogger } from "@/lib/observability/logger";
import {
  normalizeRustdeskId,
  normalizeSysproUpdates,
  serializeSysproUpdatesSnapshot,
} from "@/features/remote/application/agent-payload";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const { logger, responseHeaders } = createRequestLogger(request, {
    area: "api",
    feature: "remote-agent-discover",
  });
  const ip = request.headers.get("cf-connecting-ip") ?? request.headers.get("x-forwarded-for");
  const rateLimit = consumeActionRateLimit({
    action: "remote-agent-discover",
    ip,
    max: 30,
    windowMs: 60_000,
  });
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { success: false, error: "Rate limit excedido para descoberta do agente." },
      {
        status: 429,
        headers: {
          ...responseHeaders,
          "Retry-After": String(rateLimit.retryAfterSeconds),
        },
      }
    );
  }

  const expectedToken = process.env.REMOTE_DISCOVERY_TOKEN?.trim();
  if (!expectedToken) {
    logger.error("remote.agent.discover.token_missing");
    return NextResponse.json(
      { success: false, error: "REMOTE_DISCOVERY_TOKEN nao configurado." },
      { status: 503, headers: responseHeaders }
    );
  }

  const body = (await request.json()) as {
    discoveryToken?: string;
    rustdeskId?: string | null;
    machineName?: string | null;
    agentVersion?: string | null;
    serviceStatus?: string | null;
    environment?: string | null;
    provider?: string | null;
    description?: string | null;
    sysproUpdates?: unknown;
  };

  const discoveryToken = body.discoveryToken?.trim();
  if (!discoveryToken || discoveryToken !== expectedToken) {
    logger.warn("remote.agent.discover.invalid_token");
    return NextResponse.json(
      { success: false, error: "Token de descoberta invalido." },
      { status: 403, headers: responseHeaders }
    );
  }

  const rustdeskId = normalizeRustdeskId(body.rustdeskId);
  const machineName = body.machineName?.trim() || null;
  if (!rustdeskId && !machineName) {
    return NextResponse.json(
      { success: false, error: "machineName ou rustdeskId e obrigatorio." },
      { status: 400, headers: responseHeaders }
    );
  }

  const heartbeatAt = new Date();
  const sysproUpdates = normalizeSysproUpdates(body.sysproUpdates);
  const serviceStatus = body.serviceStatus?.trim() || null;

  const discoveredHost = await prisma.remoteDiscoveredHost.findFirst({
    where: rustdeskId
      ? {
          OR: [{ agentExternalId: rustdeskId }, ...(machineName ? [{ machineName }] : [])],
        }
      : { machineName: machineName ?? undefined },
    orderBy: [{ updatedAt: "desc" }],
  });

  if (discoveredHost?.linkedHostId) {
    const linkedHost = await prisma.remoteHost.findFirst({
      where: { id: discoveredHost.linkedHostId },
      select: {
        id: true,
        name: true,
        agentTokenHash: true,
        lastHeartbeatErrorMessage: true,
        company: {
          select: {
            nomeFantasia: true,
            razaoSocial: true,
          },
        },
      },
    });

    if (linkedHost) {
      await prisma.remoteDiscoveredHost.update({
        where: { id: discoveredHost.id },
        data: {
          machineName,
          agentExternalId: rustdeskId,
          agentVersion: body.agentVersion?.trim() || null,
          environment: body.environment?.trim() || null,
          provider: body.provider?.trim() || "RustDesk",
          description: body.description?.trim() || null,
          serviceStatus,
          installationsSnapshot: serializeSysproUpdatesSnapshot(sysproUpdates) as any,
          lastHeartbeatAt: heartbeatAt,
          linkedAt: discoveredHost.linkedAt ?? heartbeatAt,
          status: "LINKED",
        },
      });

      const bootstrapRequired =
        !linkedHost.agentTokenHash ||
        !!linkedHost.lastHeartbeatErrorMessage?.toLowerCase().match(/agenttoken (invalido|expirado|rotacionado|indisponivel)/);

      return NextResponse.json(
        {
          success: true,
          data: {
            mode: "linked",
            discoveredHostId: discoveredHost.id,
            hostId: linkedHost.id,
            hostName: linkedHost.name,
            heartbeatAuth: "agentToken",
            bootstrapFlow: bootstrapRequired ? "host_installer_required" : "linked_host_detected",
            message: bootstrapRequired
              ? "Esta maquina ja esta vinculada a um host do portal. O fluxo discover nao emite agentToken; execute o instalador dedicado do host para concluir o bootstrap."
              : "Esta maquina ja esta vinculada a um host do portal. O fluxo discover continua apenas como descoberta e nao substitui o heartbeat autenticado do host.",
          },
        },
        { headers: responseHeaders }
      );
    }
  }

  const payload = {
    machineName,
    agentExternalId: rustdeskId ?? null,
    agentVersion: body.agentVersion?.trim() || null,
    environment: body.environment?.trim() || null,
    provider: body.provider?.trim() || "RustDesk",
    description: body.description?.trim() || null,
    serviceStatus,
    installationsSnapshot: serializeSysproUpdatesSnapshot(sysproUpdates) as any,
    lastHeartbeatAt: heartbeatAt,
    status: "PENDING_LINK" as const,
  };

  const record = discoveredHost
    ? await prisma.remoteDiscoveredHost.update({
        where: { id: discoveredHost.id },
        data: payload,
      })
    : await prisma.remoteDiscoveredHost.create({
        data: payload,
      });

  return NextResponse.json(
    {
      success: true,
      data: {
        mode: "pending",
        discoveredHostId: record.id,
        heartbeatAuth: "discoveryToken",
        bootstrapFlow: "pending_link",
        message:
          "Maquina descoberta com sucesso. Este fluxo serve apenas para triagem inicial; depois do vinculo, use o instalador do host para emitir agentToken.",
      },
    },
    { headers: responseHeaders }
  );
}
