import { ZammadTicketAPISchema, ZammadTicketAPI } from "@/core/schema/zammad-schema";

const ZAMMAD_URL = process.env.ZAMMAD_URL;
const ZAMMAD_TOKEN = process.env.ZAMMAD_TOKEN;

/**
 * Serviço genérico para buscar tickets no Zammad usando SEARCH.
 * Esta função é usada exclusivamente para Releases, Changelog,
 * e pesquisas complexas.
 */
export async function searchZammadTickets(
    query: string,
    limit = 100
): Promise<ZammadTicketAPI[]> {

    if (!ZAMMAD_URL || !ZAMMAD_TOKEN) {
        console.error("Zammad URL ou token ausentes.");
        return [];
    }

    const fullUrl = `${ZAMMAD_URL}/api/v1/tickets/search?query=${encodeURIComponent(
        query
    )}&limit=${limit}&sort_by=updated_at&order_by=desc&expand=true`;

    try {
        const response = await fetch(fullUrl, {
            headers: {
                Authorization: `Token token=${ZAMMAD_TOKEN}`,
            },
            next: {
                revalidate: 3600,
                tags: ["releases", "tickets"],
            },
        });

        if (!response.ok) {
            console.error("Erro na API Zammad:", response.status, response.statusText);
            return [];
        }

        const raw = await response.json();

        // Quando expand=true, o Zammad retorna os tickets em:
        // assets.Ticket
        let rawTickets: any[] = [];

        if (raw.assets?.Ticket) {
            rawTickets = Object.values(raw.assets.Ticket);
        } else if (Array.isArray(raw)) {
            rawTickets = raw;
        }

        // Validação com Zod
        return rawTickets
            .map((t) => ZammadTicketAPISchema.safeParse(t))
            .filter((r) => r.success)
            .map((r) => r.data as ZammadTicketAPI);

    } catch (err) {
        console.error("Erro ao consultar a API do Zammad:", err);
        return [];
    }
}
