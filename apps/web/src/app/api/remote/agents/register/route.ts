import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const body = (await request.json()) as {
    installToken?: string;
    rustdeskId?: string | null;
    machineName?: string | null;
    agentVersion?: string | null;
    environment?: string | null;
  };

  const installToken = body.installToken?.trim();
  if (!installToken) {
    return NextResponse.json({ success: false, error: "installToken e obrigatorio." }, { status: 400 });
  }

  const host = await prisma.remoteHost.findFirst({
    where: { installToken },
  });

  if (!host) {
    return NextResponse.json({ success: false, error: "Token de instalacao invalido." }, { status: 404 });
  }

  const updated = await prisma.remoteHost.update({
    where: { id: host.id },
    data: {
      agentExternalId: body.rustdeskId?.trim() || host.agentExternalId,
      machineName: body.machineName?.trim() || host.machineName,
      agentVersion: body.agentVersion?.trim() || host.agentVersion,
      environment: body.environment?.trim() || host.environment,
      lastHeartbeatAt: new Date(),
      status: "ACTIVE",
    },
    select: {
      id: true,
      companyId: true,
      name: true,
      agentExternalId: true,
      installToken: true,
      machineName: true,
      agentVersion: true,
      lastHeartbeatAt: true,
      status: true,
    },
  });

  return NextResponse.json({ success: true, data: updated });
}
