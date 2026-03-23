import { NextResponse } from "next/server";
import { getProtectedSession } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { getRemoteTenantScope } from "@/features/remote/application/scope";

export const dynamic = "force-dynamic";

export async function POST(_request: Request, context: { params: Promise<{ id: string }> }) {
  const session = await getProtectedSession();
  if (!session) {
    return NextResponse.json({ success: false, error: "Nao autorizado." }, { status: 401 });
  }

  const { id } = await context.params;
  const tenantScope = await getRemoteTenantScope();

  const remoteSession = await prisma.remoteSession.findFirst({
    where: tenantScope.isGlobalView
      ? { id }
      : { id, companyId: { in: tenantScope.companyIds.length ? tenantScope.companyIds : ["__none__"] } },
    select: { id: true, status: true },
  });

  if (!remoteSession) {
    return NextResponse.json({ success: false, error: "Sessao nao encontrada." }, { status: 404 });
  }

  if (remoteSession.status !== "STARTED") {
    return NextResponse.json({ success: false, error: "Apenas sessoes STARTED podem ser encerradas." }, { status: 409 });
  }

  const updated = await prisma.remoteSession.update({
    where: { id },
    data: {
      status: "ENDED",
      endedAt: new Date(),
    },
  });

  return NextResponse.json({ success: true, data: updated });
}
