import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { consumeActionRateLimit } from "@/lib/security/action-rate-limit";

export const dynamic = "force-dynamic";

function normalizeRustdeskId(value?: string | null) {
  const trimmed = value?.trim();
  if (!trimmed) return undefined;
  return trimmed.replace(/\s+/g, "");
}

export async function POST(request: Request) {
  const ip = request.headers.get("cf-connecting-ip") ?? request.headers.get("x-forwarded-for");
  const rateLimit = consumeActionRateLimit({
    action: "remote-agent-heartbeat",
    ip,
    max: 30,
    windowMs: 60_000,
  });
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { success: false, error: "Rate limit excedido para heartbeat do agente." },
      { status: 429, headers: { "Retry-After": String(rateLimit.retryAfterSeconds) } }
    );
  }

  const body = (await request.json()) as {
    installToken?: string;
    rustdeskId?: string | null;
    machineName?: string | null;
    agentVersion?: string | null;
  };

  const installToken = body.installToken?.trim();
  if (!installToken) {
    return NextResponse.json({ success: false, error: "installToken e obrigatorio." }, { status: 400 });
  }

  const host = await prisma.remoteHost.findFirst({
    where: { installToken },
    select: { id: true },
  });

  if (!host) {
    return NextResponse.json({ success: false, error: "Token de instalacao invalido." }, { status: 404 });
  }

  const updated = await prisma.remoteHost.update({
    where: { id: host.id },
    data: {
      agentExternalId: normalizeRustdeskId(body.rustdeskId),
      machineName: body.machineName?.trim() || undefined,
      agentVersion: body.agentVersion?.trim() || undefined,
      lastHeartbeatAt: new Date(),
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

  return NextResponse.json({ success: true, data: updated });
}
