import { NextResponse } from "next/server";

/**
 * Endpoint legado desativado.
 *
 * A integracao oficial de webhook Zammad e:
 * POST /api/platform/zammad/webhook (HMAC)
 * ou alias: /api/integrations/zammad/webhook
 */
export async function POST() {
  return NextResponse.json(
    {
      success: false,
      error: "Endpoint legado desativado. Use /api/platform/zammad/webhook.",
    },
    { status: 410 }
  );
}
