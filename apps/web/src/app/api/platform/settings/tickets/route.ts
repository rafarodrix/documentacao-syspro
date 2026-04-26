import { NextResponse } from "next/server";

import {
  fetchTicketModuleSettingsGateway,
  updateTicketModuleSettingsGateway,
} from "@/features/settings/infrastructure/gateways/settings.gateway";

export async function GET() {
  try {
    const response = await fetchTicketModuleSettingsGateway();
    return NextResponse.json(response, { status: response.success ? 200 : 400 });
  } catch (error) {
    console.error("ticket settings GET route error:", error);
    return NextResponse.json({ success: false, error: "Falha ao carregar configuracoes de tickets." }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const response = await updateTicketModuleSettingsGateway(body);
    return NextResponse.json(response, { status: response.success ? 200 : 400 });
  } catch (error) {
    console.error("ticket settings PUT route error:", error);
    return NextResponse.json({ success: false, error: "Falha ao salvar configuracoes de tickets." }, { status: 500 });
  }
}
