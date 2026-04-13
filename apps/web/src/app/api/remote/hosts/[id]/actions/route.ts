import { NextResponse } from "next/server";
import { proxyToBackend } from "@/app/api/_shared/backend-proxy";
import { remoteErrorResponse, toRemoteDomainErrorResponse } from "@/features/remote/application/remote-domain-error";
import { requireRemotePermission } from "@/features/remote/application/remote-access";
import {
  ensureRemoteHostIsInTenantScope,
  parseRequestedHostRemoteAction,
  requestRemoteHostRebootstrap,
} from "@/features/remote/application/host-actions";

export const dynamic = "force-dynamic";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const access = await requireRemotePermission("tools:all", "Sem permissao para acionar comandos remotos.");
  if (!access.ok) {
    return access.response;
  }

  const body = await request.json().catch(() => null);
  const action = parseRequestedHostRemoteAction(body);
  if (!action) {
    return remoteErrorResponse({
      code: "BAD_REQUEST",
      message: "Acao remota invalida.",
      httpStatus: 400,
    });
  }

  const { id } = await params;
  if (action === "REBOOTSTRAP") {
    try {
      const data = await requestRemoteHostRebootstrap(id);
      if (!data.success) {
        return remoteErrorResponse(data);
      }

      return NextResponse.json({
        success: true,
        data: data.data,
        message: data.message,
      });
    } catch (error) {
      return toRemoteDomainErrorResponse(error, {
        validationMessage: "Host remoto invalido.",
        defaultMessage: "Falha ao solicitar rebootstrap.",
      });
    }
  }

  const { host } = await ensureRemoteHostIsInTenantScope(id);
  if (!host) {
    return remoteErrorResponse({
      code: "NOT_FOUND",
      message: "Host remoto nao encontrado no escopo.",
      httpStatus: 404,
    });
  }

  return proxyToBackend(request, {
    path: `/remote-admin/hosts/${id}/actions`,
    method: "POST",
    body: JSON.stringify({ action }),
    headers: {
      ...Object.fromEntries(request.headers.entries()),
      "content-type": "application/json",
    },
  });
}
