import { NextResponse } from "next/server";
import { cleanupExpiredRemoteSessions } from "@/features/remote/application/session-queries";
import { requireRemotePermission } from "@/app/api/remote/_shared/remote-access";

export const dynamic = "force-dynamic";

function hasValidInternalKey(request: Request) {
  const expected = process.env.INTERNAL_API_KEY?.trim();
  if (!expected) return false;
  const received = request.headers.get("x-internal-api-key")?.trim();
  return Boolean(received && received === expected);
}

export async function POST(request: Request) {
  const access = await requireRemotePermission("tools:all", "Nao autorizado.");
  const isOperator = access.ok;

  if (!isOperator && !hasValidInternalKey(request)) {
    return NextResponse.json(
      { success: false, error: "UNAUTHORIZED", message: "Nao autorizado." },
      { status: 401 },
    );
  }

  try {
    const result = await cleanupExpiredRemoteSessions();
    return NextResponse.json({ success: true, data: result });
  } catch {
    return NextResponse.json(
      { success: false, error: "INTERNAL_ERROR", message: "Falha ao limpar sessoes expiradas." },
      { status: 500 },
    );
  }
}
