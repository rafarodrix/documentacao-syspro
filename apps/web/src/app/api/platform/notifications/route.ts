import { NextResponse } from "next/server";
import { fetchPlatformNotificationsGateway } from "@/features/settings/infrastructure/settings.gateway";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const data = await fetchPlatformNotificationsGateway();
    return NextResponse.json(data);
  } catch (error) {
    console.error("Erro ao carregar notificacoes da plataforma via backend:", error);
    return NextResponse.json({ error: "Falha ao carregar notificacoes." }, { status: 500 });
  }
}
