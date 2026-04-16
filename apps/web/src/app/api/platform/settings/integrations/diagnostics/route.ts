import { NextResponse } from "next/server";

import { fetchIntegrationDiagnosticsGateway } from "@/features/settings/infrastructure/settings.gateway";

export async function GET() {
  try {
    const response = await fetchIntegrationDiagnosticsGateway();
    return NextResponse.json(response, { status: response.success ? 200 : 400 });
  } catch (error) {
    console.error("integration diagnostics GET route error:", error);
    return NextResponse.json({ success: false, error: "Falha ao carregar diagnostico das integracoes." }, { status: 500 });
  }
}
