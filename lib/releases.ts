// Em: lib/releases.ts

import { z } from "zod";
import type { Release } from "./types";

// Validação dos dados que vêm do Zammad (mesma lógica da sua antiga API)
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

// Função `getReleases` atualizada
export async function getReleases(): Promise<Release[]> {
  const zammadUrl = process.env.ZAMMAD_URL;
  const zammadToken = process.env.ZAMMAD_TOKEN;

  if (!zammadUrl || !zammadToken) {
    console.error("Variáveis de ambiente do Zammad não configuradas.");
    return [];
  }

  // Mesma lógica de busca que estava na sua API
  const stateIdParaRelease = 4;
  const groupIdParaRelease = 3;
  const searchQuery = `(type:"Melhoria" OR type:"Bug") AND state_id:${stateIdParaRelease} AND group_id:${groupIdParaRelease}`;
  const fullUrl = `${zammadUrl}/api/v1/tickets/search?query=${encodeURIComponent(
    searchQuery
  )}&limit=100&sort_by=updated_at&order_by=desc&expand=true`;

  try {
    const response = await fetch(fullUrl, {
      headers: { Authorization: `Token token=${zammadToken}` },
      next: { tags: ['releases'] }
    });

    if (!response.ok) {
      throw new Error(`Falha ao buscar tickets do Zammad: ${response.statusText}`);
    }

    const rawTickets = await response.json();
    const validatedTickets = ZammadResponseSchema.parse(rawTickets);

    // Mapeia os dados para o formato que o Fumadocs espera
    const releases: Release[] = validatedTickets.map((ticket) => {
      const mainModule = ticket.modulo ? ticket.modulo.split("::")[0] : "Geral";
      return {
        id: ticket.number,
        type: ticket.type || "Indefinido",
        isoDate: (ticket.close_at || ticket.updated_at).split("T")[0],
        title: ticket.release_summary || ticket.title,
        link: `${zammadUrl}/#ticket/zoom/${ticket.id}`,
        videoLink: ticket.video_link || null,
        tags: [mainModule],
      };
    });

    return releases;

  } catch (error) {
    console.error("Erro ao buscar e processar releases do Zammad:", error);
    return [];
  }
}