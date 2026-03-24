import { NextResponse } from "next/server";
import { randomBytes } from "node:crypto";
import { getProtectedSession } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import {
  normalizeCompareValue,
  normalizeSysproUpdates,
  syncRemoteHostSysproUpdates,
} from "@/features/remote/application/agent-payload";

export const dynamic = "force-dynamic";

function canManageHost(role: string): boolean {
  return role === "ADMIN" || role === "SUPORTE" || role === "DEVELOPER";
}

function buildInstallToken() {
  return `rhost_${randomBytes(12).toString("hex")}`;
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getProtectedSession();
  if (!session) {
    return NextResponse.json({ success: false, error: "Nao autorizado." }, { status: 401 });
  }

  if (!canManageHost(session.role)) {
    return NextResponse.json({ success: false, error: "Sem permissao para vincular maquina descoberta." }, { status: 403 });
  }

  const { id } = await params;
  const body = (await request.json()) as {
    companyId?: string;
    name?: string;
    description?: string | null;
  };

  const companyId = body.companyId?.trim();
  const name = body.name?.trim();

  if (!companyId || !name) {
    return NextResponse.json({ success: false, error: "companyId e name sao obrigatorios." }, { status: 400 });
  }

  const [company, discoveredHost] = await Promise.all([
    prisma.company.findFirst({
      where: { id: companyId, deletedAt: null },
      select: { id: true, nomeFantasia: true, razaoSocial: true },
    }),
    prisma.remoteDiscoveredHost.findFirst({
      where: { id },
    }),
  ]);

  if (!company) {
    return NextResponse.json({ success: false, error: "Empresa nao encontrada." }, { status: 404 });
  }

  if (!discoveredHost) {
    return NextResponse.json({ success: false, error: "Maquina descoberta nao encontrada." }, { status: 404 });
  }

  if (discoveredHost.linkedHostId) {
    return NextResponse.json(
      { success: true, data: { hostId: discoveredHost.linkedHostId, discoveredHostId: discoveredHost.id } },
      { status: 200 }
    );
  }

  const heartbeatAt = discoveredHost.lastHeartbeatAt ?? new Date();
  const normalizedPrimaryNames = [
    normalizeCompareValue(company.nomeFantasia),
    normalizeCompareValue(company.razaoSocial),
  ].filter(Boolean);
  const sysproUpdates = normalizeSysproUpdates(discoveredHost.installationsSnapshot);

  const host = await prisma.$transaction(async (tx) => {
    const createdHost = await tx.remoteHost.create({
      data: {
        companyId,
        name,
        provider: discoveredHost.provider?.trim() || "RustDesk",
        environment: discoveredHost.environment?.trim() || null,
        description: body.description?.trim() || discoveredHost.description?.trim() || null,
        agentExternalId: discoveredHost.agentExternalId?.trim() || null,
        installToken: buildInstallToken(),
        machineName: discoveredHost.machineName?.trim() || null,
        agentVersion: discoveredHost.agentVersion?.trim() || null,
        serviceStatus: discoveredHost.serviceStatus?.trim() || null,
        lastHeartbeatAt: heartbeatAt,
        status: "ACTIVE",
      } as any,
      select: {
        id: true,
        companyId: true,
      },
    });

    await syncRemoteHostSysproUpdates(tx, {
      hostId: createdHost.id,
      hostCompanyId: companyId,
      hostCompanyNames: normalizedPrimaryNames,
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

  return NextResponse.json(
    { success: true, data: { hostId: host.id, discoveredHostId: discoveredHost.id } },
    { status: 201 }
  );
}
