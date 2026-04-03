import { NextResponse } from "next/server";
import { Role } from "@prisma/client";
import { getProtectedSession } from "@/lib/auth-helpers";
import { ZammadGateway } from "@/features/tickets/infrastructure/gateways/zammad-gateway";
import {
  getZammadGlobalCatalogSnapshot,
  saveZammadGlobalCatalogSnapshot,
} from "@/features/tickets/application/zammad-global-settings-server";
import { zammadGlobalCatalogSchema } from "@/features/tickets/application/zammad-global-settings";

const WRITE_ROLES: Role[] = [Role.ADMIN, Role.SUPORTE, Role.DEVELOPER];

export async function GET() {
  const session = await getProtectedSession();
  if (!session || !WRITE_ROLES.includes(session.role)) {
    return NextResponse.json({ success: false, error: "Nao autorizado." }, { status: 401 });
  }

  try {
    const liveCatalogRaw = await ZammadGateway.getGlobalCatalog("api-zammad-catalog");
    const validation = zammadGlobalCatalogSchema.safeParse(liveCatalogRaw);
    if (!validation.success) {
      throw new Error("catalog_parse_failed");
    }
    await saveZammadGlobalCatalogSnapshot(validation.data);
    return NextResponse.json({
      success: true,
      source: "live",
      warning: null,
      data: validation.data,
    });
  } catch (error) {
    const snapshot = await getZammadGlobalCatalogSnapshot();
    if (snapshot) {
      return NextResponse.json({
        success: true,
        source: "snapshot",
        warning: "Catalogo retornado via snapshot local. Dados possivelmente desatualizados.",
        data: snapshot,
      });
    }

    console.error("Erro ao carregar catalogo Zammad:", error);
    return NextResponse.json(
      { success: false, error: "Nao foi possivel carregar catalogo do Zammad." },
      { status: 503 }
    );
  }
}
