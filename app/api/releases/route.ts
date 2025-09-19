import { NextResponse } from "next/server";
import { z } from "zod";
import type { Release } from "@/lib/types";


const ZammadTicketSchema = z.object({
  id: z.number(),
  number: z.string(),
  title: z.string(), 
  type: z.string().optional(),
  updated_at: z.string(),
  close_at: z.string().nullable(),
  modulo: z.string().nullable().optional(),
  video_link: z.string().nullable().optional(),
  release_summary: z.string().nullable().optional(), 
});

const ZammadResponseSchema = z.array(ZammadTicketSchema);

export async function GET() {
  const zammadUrl = process.env.ZAMMAD_URL;
  const zammadToken = process.env.ZAMMAD_TOKEN;

  if (!zammadUrl || !zammadToken) {
    return NextResponse.json({ error: "Variáveis de ambiente do Zammad não configuradas." }, { status: 500 });
  }

  const stateIdParaRelease = 4;
  const groupIdParaRelease = 3;
  const searchQuery = `(type:"Melhoria" OR type:"Bug") AND state_id:${stateIdParaRelease} AND group_id:${groupIdParaRelease}`;
  const fullUrl = `${zammadUrl}/api/v1/tickets/search?query=${encodeURIComponent(searchQuery)}&limit=100&sort_by=updated_at&order_by=desc&expand=true`;

  try {
    const response = await fetch(fullUrl, {
      headers: { Authorization: `Token token=${zammadToken}` },
      //next: { revalidate: 3600 }, // Cache de 1 hora
    });

    if (!response.ok) {
      // ... (código de erro)
    }

    const rawTickets = await response.json();
    const validatedTickets = ZammadResponseSchema.parse(rawTickets);
    
    const releases: Release[] = validatedTickets.map((ticket) => {
      const mainModule = ticket.modulo ? ticket.modulo.split("::")[0] : "Geral";
      return {
        id: ticket.number,
        type: ticket.type || "Indefinido",
        isoDate: (ticket.close_at || ticket.updated_at).split("T")[0],
        title: ticket.release_summary || ticket.title, // Usa o resumo, ou o título se o resumo for nulo/vazio
        link: `${zammadUrl}/#ticket/zoom/${ticket.id}`,
        videoLink: ticket.video_link || null,
        tags: [mainModule],
      };
    });

    return NextResponse.json(releases);

  } catch (error) {
    // ... (código de erro)
  }
}