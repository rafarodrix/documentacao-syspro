import { NextResponse } from "next/server";
import { getPlatformNotifications } from "@/features/settings/application/platform-notifications";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const data = await getPlatformNotifications();
    return NextResponse.json(data);
  } catch (error) {
    console.error("Erro ao carregar notificacoes da plataforma via backend:", error);
    return NextResponse.json({ error: "Falha ao carregar notificacoes." }, { status: 500 });
  }
}
