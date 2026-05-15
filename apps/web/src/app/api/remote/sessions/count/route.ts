import { NextResponse } from "next/server";
import { requireRemotePermission } from "@/features/remote/application/remote-access";
import { getActiveSessionsCount } from "@/features/remote/application/session-queries";
import { getRemoteTenantScope } from "@/features/remote/application/scope";

export const dynamic = "force-dynamic";

export async function GET() {
  const access = await requireRemotePermission("tools:all", "Nao autorizado");
  if (!access.ok) {
    return new Response("Nao autorizado", { status: 401 });
  }

  const scope = await getRemoteTenantScope();
  const count = await getActiveSessionsCount(scope);

  return NextResponse.json({ count });
}
