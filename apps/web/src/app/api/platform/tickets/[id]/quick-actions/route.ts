import { NextResponse } from "next/server";
import { ticketQuickAction } from "@/features/tickets/application/ticket-actions";

type Params = {
  params: Promise<{ id: string }>;
};

export async function POST(request: Request, { params }: Params) {
  try {
    const { id } = await params;
    const body = (await request.json()) as { action?: "assume" | "priority_high" | "macro_followup" };

    if (!body?.action) {
      return NextResponse.json({ success: false, error: "Acao obrigatoria." }, { status: 400 });
    }

    const result = await ticketQuickAction({ ticketId: id, action: body.action });
    return NextResponse.json(result, { status: result.success ? 200 : 400 });
  } catch (error) {
    console.error("quick-actions route error:", error);
    return NextResponse.json({ success: false, error: "Erro interno." }, { status: 500 });
  }
}


