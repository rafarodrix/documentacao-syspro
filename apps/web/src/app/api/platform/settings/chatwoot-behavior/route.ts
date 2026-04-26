import { NextResponse } from "next/server";
import { chatwootBehaviorSettingsSchema } from "@dosc-syspro/contracts/chatwoot";

import {
  fetchChatwootBehaviorSettingsGateway,
  updateChatwootBehaviorSettingsGateway,
} from "@/features/settings/infrastructure/gateways/settings.gateway";

export async function GET() {
  try {
    const response = await fetchChatwootBehaviorSettingsGateway();
    return NextResponse.json(response, { status: response.success ? 200 : 400 });
  } catch (error) {
    console.error("chatwoot behavior GET route error:", error);
    return NextResponse.json({ success: false, error: "Falha ao carregar configuracoes do Chatwoot." }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const json = await request.json().catch(() => ({}));
    const payload = chatwootBehaviorSettingsSchema.parse(json);
    const response = await updateChatwootBehaviorSettingsGateway(payload);
    return NextResponse.json(response, { status: response.success ? 200 : 400 });
  } catch (error) {
    console.error("chatwoot behavior PUT route error:", error);
    return NextResponse.json({ success: false, error: "Falha ao salvar configuracoes do Chatwoot." }, { status: 500 });
  }
}
