import { z } from "zod";
import type { Release, UserTicket } from "./types";

// --- Esquemas de Validação ---
const ZammadTicketAPISchema = z.object({
  id: z.number(),
  number: z.string(),
  title: z.string(),
  type: z.string().optional(),
  updated_at: z.string(),
  close_at: z.string().nullable(),
  state_id: z.number(),
  group_id: z.number().optional(),
  modulo: z.string().nullable().optional(),
  video_link: z.string().nullable().optional(),
  release_summary: z.string().nullable().optional(),
});

type ZammadTicket = z.infer<typeof ZammadTicketAPISchema>;

// --- Constantes ---
const ZAMMAD_RELEASE_STATE_ID = 4;
const ZAMMAD_RELEASE_GROUP_ID = 3;
const TICKET_STATUS_MAP: Record<number, string> = {
  1: "Novo",
  2: "Aberto",
  3: "Pendente",
  4: "Fechado",
};

// --- Função Auxiliar de Busca ---
async function searchZammadTickets(searchQuery: string, limit = 100): Promise<ZammadTicket[]> {
  const zammadUrl = process.env.ZAMMAD_URL;
  const zammadToken = process.env.ZAMMAD_TOKEN;

  if (!zammadUrl || !zammadToken) {
    console.error("Variáveis de ambiente não configuradas.");
    return [];
  }

  const fullUrl = `${zammadUrl}/api/v1/tickets/search?query=${encodeURIComponent(
    searchQuery
  )}&limit=${limit}&sort_by=updated_at&order_by=desc&expand=true`;

  try {
    const response = await fetch(fullUrl, {
      headers: { Authorization: `Token token=${zammadToken}` },
      next: {
        revalidate: 3600, // 1 hora
        tags: ["releases", "tickets"],
      },
    });

    if (!response.ok) {
      throw new Error(`Falha na API do Zammad: ${response.status} ${response.statusText}`);
    }

    const rawTickets = await response.json();
    return z.array(ZammadTicketAPISchema).parse(rawTickets);
  } catch (error) {
    console.error("Erro ao buscar tickets", error);
    return [];
  }
}

// --- Releases ---
export async function getReleases(): Promise<Release[]> {
  const zammadUrl = process.env.ZAMMAD_URL!;
  const releaseQuery = `(type:"Melhoria" OR type:"Bug") AND state_id:${ZAMMAD_RELEASE_STATE_ID} AND group_id:${ZAMMAD_RELEASE_GROUP_ID}`;

  const tickets = await searchZammadTickets(releaseQuery);

  return tickets.map((ticket): Release => {
    const mainModule = ticket.modulo?.split("::")[0] || "Geral";
    const releaseSummary = ticket.release_summary?.trim() || ticket.title;

    return {
      id: ticket.number,
      type: ticket.type || "Indefinido",
      isoDate: (ticket.close_at || ticket.updated_at).split("T")[0],
      title: ticket.title,
      summary: releaseSummary,
      link: `${zammadUrl}/#ticket/zoom/${ticket.id}`,
      videoLink: ticket.video_link || null,
      tags: [mainModule],
    };
  });
}

// --- Tickets do Usuário ---
export async function getTicketsByUserId(userId: string): Promise<UserTicket[]> {
  const zammadUrl = process.env.ZAMMAD_URL!;
  if (!userId) return [];

  const userQuery = `customer_id:${userId}`;
  const tickets = await searchZammadTickets(userQuery, 50);

  return tickets.map((ticket) => ({
    id: ticket.id,
    number: ticket.number,
    title: ticket.title,
    status: TICKET_STATUS_MAP[ticket.state_id] || "Desconhecido",
    lastUpdate: new Date(ticket.updated_at).toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    }),
    link: `${zammadUrl}/#ticket/zoom/${ticket.id}`,
  }));
}