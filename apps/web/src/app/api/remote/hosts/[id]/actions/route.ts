import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getProtectedSession } from "@/lib/auth-helpers";
import { getRemoteTenantScope } from "@/features/remote/application/scope";
import { createRemoteHostAdminPort } from "@/features/remote/infrastructure/gateways/remote-domain/host-admin-port.gateway";
import { createTrilinkRemote } from "@dosc-syspro/remote-domain";
import { remoteErrorResponse, toRemoteDomainErrorResponse } from "@/app/api/remote/_shared/remote-domain-error";

export const dynamic = "force-dynamic";

type HostRemoteAction = "REBOOTSTRAP" | "RESEND_CONFIG" | "REAPPLY_ALIAS";

function canManageHost(role: string): boolean {
  return role === "ADMIN" || role === "SUPORTE" || role === "DEVELOPER";
}

function parseRequestedAction(body: unknown): HostRemoteAction | null {
  if (!body || typeof body !== "object") return null;
  const value = "action" in body ? (body as { action?: unknown }).action : null;
  if (value === "REBOOTSTRAP" || value === "RESEND_CONFIG" || value === "REAPPLY_ALIAS") {
    return value;
  }
  return null;
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getProtectedSession();
  if (!session) {
    return remoteErrorResponse({ code: "UNAUTHORIZED", message: "Nao autorizado.", httpStatus: 401 });
  }

  if (!canManageHost(session.role)) {
    return remoteErrorResponse({
      code: "FORBIDDEN",
      message: "Sem permissao para acionar comandos remotos.",
      httpStatus: 403,
    });
  }

  const body = await request.json().catch(() => null);
  const action = parseRequestedAction(body);
  if (!action) {
    return remoteErrorResponse({
      code: "BAD_REQUEST",
      message: "Acao remota invalida.",
      httpStatus: 400,
    });
  }

  const { id } = await params;
  const tenantScope = await getRemoteTenantScope();
  const host = await prisma.remoteHost.findFirst({
    where: tenantScope.isGlobalView
      ? { id }
      : { id, companyId: { in: tenantScope.companyIds.length ? tenantScope.companyIds : ["__none__"] } },
    select: { id: true, name: true },
  });

  if (!host) {
    return remoteErrorResponse({
      code: "NOT_FOUND",
      message: "Host remoto nao encontrado no escopo.",
      httpStatus: 404,
    });
  }

  if (action === "REBOOTSTRAP") {
    const hostAdminPort = createRemoteHostAdminPort();
    const trilinkRemote = createTrilinkRemote({ hostAdminPort });
    try {
      const data = await trilinkRemote.rotateHostAgentToken({
        scope: {
          isGlobalView: tenantScope.isGlobalView,
          companyIds: tenantScope.companyIds,
        },
        hostId: id,
      });

      return NextResponse.json({
        success: true,
        data: data.host,
        message: data.message ?? "Rebootstrap solicitado com sucesso.",
      });
    } catch (error) {
      return toRemoteDomainErrorResponse(error, {
        validationMessage: "Host remoto invalido.",
        defaultMessage: "Falha ao solicitar rebootstrap.",
      });
    }
  }

  const commandType = action === "RESEND_CONFIG" ? "REAPPLY_CONFIG" : "REAPPLY_ALIAS";
  const reason =
    action === "RESEND_CONFIG"
      ? "Acao manual do portal: reenviar configuracao para o agente."
      : "Acao manual do portal: reaplicar alias no agente.";

  const existing = await prisma.remoteAgentCommand.findFirst({
    where: {
      hostId: id,
      type: commandType,
      status: { in: ["PENDING", "DELIVERED"] },
    },
    orderBy: [{ createdAt: "desc" }],
    select: { id: true, type: true, status: true, createdAt: true },
  });

  if (existing) {
    return NextResponse.json({
      success: true,
      data: existing,
      message: "Ja existe comando pendente deste tipo para o host.",
    });
  }

  const command = await prisma.remoteAgentCommand.create({
    data: {
      hostId: id,
      type: commandType,
      status: "PENDING",
      reason,
      payload: {
        source: "portal.manual_action",
        requestedByUserId: session.userId,
        requestedAt: new Date().toISOString(),
        action,
      },
    },
    select: {
      id: true,
      type: true,
      status: true,
      reason: true,
      createdAt: true,
    },
  });

  return NextResponse.json({
    success: true,
    data: command,
    message: "Comando remoto enfileirado. Aguarde ciclo de sync/ack do agente.",
  });
}
