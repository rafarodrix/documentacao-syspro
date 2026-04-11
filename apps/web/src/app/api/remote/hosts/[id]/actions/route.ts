import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getRemoteTenantScope } from "@/features/remote/application/scope";
import { createRemoteHostAdminPort } from "@/features/remote/infrastructure/gateways/remote-domain/host-admin-port.gateway";
import { createTrilinkRemote } from "@dosc-syspro/remote-domain";
import { remoteErrorResponse, toRemoteDomainErrorResponse } from "@/app/api/remote/_shared/remote-domain-error";
import { requireRemotePermission } from "@/app/api/remote/_shared/remote-access";
import { getBackendApiBaseUrl } from "@/lib/backend-api";

export const dynamic = "force-dynamic";

type HostRemoteAction = "REBOOTSTRAP" | "RESEND_CONFIG" | "REAPPLY_ALIAS";

function parseRequestedAction(body: unknown): HostRemoteAction | null {
  if (!body || typeof body !== "object") return null;
  const value = "action" in body ? (body as { action?: unknown }).action : null;
  if (value === "REBOOTSTRAP" || value === "RESEND_CONFIG" || value === "REAPPLY_ALIAS") {
    return value;
  }
  return null;
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const access = await requireRemotePermission("tools:all", "Sem permissao para acionar comandos remotos.");
  if (!access.ok) {
    return access.response;
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

  const upstreamHeaders = new Headers(request.headers);
  upstreamHeaders.delete("host");
  upstreamHeaders.delete("content-length");
  const upstreamResponse = await fetch(`${getBackendApiBaseUrl()}/remote-admin/hosts/${id}/actions`, {
    method: "POST",
    headers: upstreamHeaders,
    body: JSON.stringify({ action }),
    redirect: "manual",
    cache: "no-store",
  });
  return new Response(upstreamResponse.body, {
    status: upstreamResponse.status,
    statusText: upstreamResponse.statusText,
    headers: upstreamResponse.headers,
  });
}
