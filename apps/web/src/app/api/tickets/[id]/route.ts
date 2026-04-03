import { NextRequest, NextResponse } from "next/server";
import { getProtectedSession } from "@/lib/auth-helpers";
import { ZammadGateway } from "@/features/tickets/infrastructure/gateways/zammad-gateway";

/**
 * GET /api/tickets/[id]
 * Retorna informacoes resumidas de um ticket do Zammad para a UI.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getProtectedSession();
  if (!session) {
    return NextResponse.json({ error: "Nao autorizado" }, { status: 401 });
  }

  const { id } = await params;

  try {
    const ticket = await ZammadGateway.getTicketById(id);
    
    // Retorna apenas o essencial para a UI de suporte remoto
    return NextResponse.json({
      id: ticket.id,
      number: ticket.number,
      title: ticket.title,
      state: ticket.state || "Aberto",
      priority: ticket.priority_id === 3 ? "Alta" : ticket.priority_id === 1 ? "Baixa" : "Normal",
      customer: ticket.customer,
      createdAt: ticket.created_at,
    });
  } catch (error) {
    console.error(`Erro ao buscar ticket ${id} via API:`, error);
    return NextResponse.json({ error: "Chamado nao encontrado ou erro no Zammad" }, { status: 404 });
  }
}
