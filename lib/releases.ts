import { z } from "zod";
import type { Release, UserTicket } from "./types"; 

// --- Esquemas de Validação e Tipos ---
const ZammadTicketAPISchema = z.object({
  id: z.number(),
  number: z.string(),
  title: z.string(),
  type: z.string().optional(),
  updated_at: z.string(),
  close_at: z.string().nullable(),
  modulo: z.string().nullable().optional(),
  video_link: z.string().nullable().optional(),
  release_summary: z.string().nullable().optional(),
  state_id: z.number(), // Adicionado para a busca de tickets do usuário
});
type ZammadTicket = z.infer<typeof ZammadTicketAPISchema>;
const ZammadResponseSchema = z.array(ZammadTicketAPISchema);

// --- Constantes ---
const ZAMMAD_RELEASE_STATE_ID = 4;
const ZAMMAD_RELEASE_GROUP_ID = 3;
const TICKET_STATUS_MAP: Record<number, string> = { 1: 'Novo', 2: 'Aberto', 3: 'Pendente', 4: 'Fechado' };

// --- Função Auxiliar Genérica de Busca ---
async function searchZammadTickets(searchQuery: string, limit = 100): Promise<ZammadTicket[]> {
  const zammadUrl = process.env.ZAMMAD_URL;
  const zammadToken = process.env.ZAMMAD_TOKEN;

  if (!zammadUrl || !zammadToken) {
    console.error("Variáveis de ambiente do Zammad não configuradas.");
    return [];
  }
  
  const fullUrl = `${zammadUrl}/api/v1/tickets/search?query=${encodeURIComponent(searchQuery)}&limit=${limit}&sort_by=updated_at&order_by=desc&expand=true`;

  try {
    const response = await fetch(fullUrl, {
      headers: { Authorization: `Token token=${zammadToken}` },
      cache: 'no-store', // Para dados do usuário, evitamos cache agressivo
    });

    if (!response.ok) throw new Error(`Falha na API do Zammad: ${response.statusText}`);
    
    const rawTickets = await response.json();
    return ZammadResponseSchema.parse(rawTickets);

  } catch (error) {
    if (error instanceof z.ZodError) console.error("Erro de validação (Zod) nos dados do Zammad:", error.issues);
    else console.error("Erro ao buscar tickets do Zammad:", error);
    return [];
  }
}

// --- Função para Releases ---
export async function getReleases(): Promise<Release[]> {
  const zammadUrl = process.env.ZAMMAD_URL!;
  const releaseQuery = `(type:"Melhoria" OR type:"Bug") AND state_id:${ZAMMAD_RELEASE_STATE_ID} AND group_id:${ZAMMAD_RELEASE_GROUP_ID}`;
  const tickets = await searchZammadTickets(releaseQuery);
  
  return tickets.map((ticket): Release => {
    const mainModule = ticket.modulo ? ticket.modulo.split("::")[0] : "Geral";
    return {
      id: ticket.number,
      type: ticket.type || "Indefinido",
      isoDate: (ticket.close_at || ticket.updated_at).split("T")[0],
      title: ticket.title,
      summary: ticket.release_summary || null,
      link: `${zammadUrl}/#ticket/zoom/${ticket.id}`,
      videoLink: ticket.video_link || null,
      tags: [mainModule],
    };
  });
}

// --- NOVA FUNÇÃO PARA TICKETS DO USUÁRIO ---
export async function getTicketsByUserId(userId: string): Promise<UserTicket[]> {
    const zammadUrl = process.env.ZAMMAD_URL!;
    if (!userId) return [];
    
    const userQuery = `customer_id:${userId}`;
    const tickets = await searchZammadTickets(userQuery, 50);

    return tickets.map(ticket => ({
        id: ticket.id,
        number: ticket.number,
        title: ticket.title,
        status: TICKET_STATUS_MAP[ticket.state_id] || 'Desconhecido',
        lastUpdate: new Date(ticket.updated_at).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' }),
        link: `${zammadUrl}/#ticket/zoom/${ticket.id}`
    }));
}