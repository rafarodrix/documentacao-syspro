import { NextResponse } from "next/server";
import { Role } from "@prisma/client";
import { getProtectedSession } from "@/lib/auth-helpers";
import { loadZammadCatalogWithFallback } from "@/features/tickets/application/services/zammad-global-catalog.service";

const WRITE_ROLES: Role[] = [Role.ADMIN, Role.SUPORTE, Role.DEVELOPER];

export async function GET() {
  const session = await getProtectedSession();
  if (!session || !WRITE_ROLES.includes(session.role)) {
    return NextResponse.json({ success: false, error: "Nao autorizado." }, { status: 401 });
  }

  const result = await loadZammadCatalogWithFallback("api-zammad-catalog");
  if (!result.catalog || !result.source) {
    return NextResponse.json(
      { success: false, error: result.warning ?? "Nao foi possivel carregar catalogo do Zammad." },
      { status: 503 }
    );
  }

  return NextResponse.json({
    success: true,
    source: result.source,
    warning: result.warning,
    data: result.catalog,
  });
}
