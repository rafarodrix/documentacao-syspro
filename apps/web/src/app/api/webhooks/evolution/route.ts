import { NextRequest, NextResponse } from "next/server";
import { readEvolutionConfig } from "@dosc-syspro/api/services/evolution-config";
import { getBackendApiBaseUrl, withInternalApiHeaders } from "@/lib/backend-api";

export async function POST(req: NextRequest) {
  try {
    const config = readEvolutionConfig(process.env);
    const apiKey = req.headers.get("apikey");

    if (config.webhookSecret && apiKey !== config.webhookSecret) {
      console.warn("[WebhookEvolution] Chamada com apikey invalida.");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const payloadRaw = await req.json();
    const backendRes = await fetch(`${getBackendApiBaseUrl()}/webhooks/evolution`, {
      method: "POST",
      headers: withInternalApiHeaders({
        "Content-Type": "application/json",
        apikey: apiKey ?? "",
      }),
      body: JSON.stringify(payloadRaw),
      cache: "no-store",
    });

    const body = await backendRes.json().catch(() => ({ status: "backend_error" }));
    return NextResponse.json(body, { status: backendRes.status });
  } catch (error) {
    console.error("[WebhookEvolution] Erro no processamento:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
