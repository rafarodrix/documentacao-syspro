import { NextResponse } from "next/server";
import { Role } from "@prisma/client";
import { getProtectedSession } from "@/lib/auth-helpers";
import { cleanupExpiredRemoteSessions } from "@/features/remote/application/session-queries";

export const dynamic = "force-dynamic";
const OPERATOR_ROLES: Role[] = [Role.ADMIN, Role.SUPORTE, Role.DEVELOPER];

function hasValidInternalKey(request: Request) {
  const expected = process.env.INTERNAL_API_KEY?.trim();
  if (!expected) return false;
  const received = request.headers.get("x-internal-api-key")?.trim();
  return Boolean(received && received === expected);
}

export async function POST(request: Request) {
  const session = await getProtectedSession();
  const isOperator = Boolean(session && OPERATOR_ROLES.includes(session.role));

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
