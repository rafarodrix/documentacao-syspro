import { Injectable } from "@nestjs/common";

type ZammadTicket = {
  id: number;
  number: string;
};

type RequestInitLike = {
  method?: string;
  headers?: Record<string, string>;
  body?: string;
};

type FetchResponseLike = {
  ok: boolean;
  status: number;
  text: () => Promise<string>;
  json: () => Promise<unknown>;
};

type FetchLike = (input: string, init?: RequestInitLike) => Promise<FetchResponseLike>;

function readRuntimeEnv(): Record<string, string | undefined> {
  const runtime = globalThis as Record<string, unknown>;
  const processLike = runtime["process"] as { env?: Record<string, string | undefined> } | undefined;
  return processLike?.env ?? {};
}

@Injectable()
export class ZammadClient {
  private readonly baseUrl = readRuntimeEnv().ZAMMAD_URL?.trim() ?? "";
  private readonly token = readRuntimeEnv().ZAMMAD_TOKEN?.trim() ?? "";

  private buildAuthHeader() {
    if (!this.token) return "";
    const lowered = this.token.toLowerCase();
    if (lowered.startsWith("bearer ") || lowered.startsWith("token ")) return this.token;
    return `Token token=${this.token}`;
  }

  private ensureConfigured() {
    if (!this.baseUrl || !this.token) {
      throw new Error("Zammad URL ou token nao configurados.");
    }
  }

  private async request(path: string, init?: RequestInitLike): Promise<any> {
    this.ensureConfigured();
    const fetchFn = (globalThis as { fetch?: FetchLike }).fetch;
    if (!fetchFn) {
      throw new Error("Fetch API indisponivel no runtime atual.");
    }

    const res = await fetchFn(`${this.baseUrl}/api/v1/${path}`, {
      ...init,
      headers: {
        Authorization: this.buildAuthHeader(),
        "Content-Type": "application/json",
        ...(init?.headers ?? {}),
      },
    });
    if (!res.ok) {
      const body = await res.text();
      throw new Error(`Zammad ${res.status}: ${body}`);
    }
    return res.json();
  }

  async getTicketsForCustomerEmailsPaged(emails: string[], limit = 1): Promise<ZammadTicket[]> {
    const normalized = Array.from(new Set(emails.map((e) => e.trim().toLowerCase()).filter(Boolean)));
    if (!normalized.length) return [];

    const query = `(${normalized.map((email) => `customer.email:${email}`).join(" OR ")}) AND (state_id:1 OR state_id:2 OR state_id:4)`;
    const data = await this.request(
      `tickets/search?query=${encodeURIComponent(query)}&expand=true&sort_by=updated_at&order_by=desc&limit=${limit}&page=1`
    );

    const rows = Array.isArray(data)
      ? data
      : typeof data === "object" && data !== null && "assets" in data
        ? Object.values((data as { assets?: { Ticket?: Record<string, unknown> } }).assets?.Ticket ?? {})
        : [];

    return rows
      .map((row) => {
        const ticket = row as { id?: unknown; number?: unknown };
        if (typeof ticket.id !== "number") return null;
        return {
          id: ticket.id,
          number: String(ticket.number ?? ticket.id),
        };
      })
      .filter((row): row is ZammadTicket => Boolean(row));
  }

  async createTicket(payload: unknown): Promise<any> {
    return this.request("tickets", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  }

  async addTicketReply(ticketId: string | number, body: string): Promise<any> {
    return this.request("ticket_articles", {
      method: "POST",
      body: JSON.stringify({
        ticket_id: ticketId,
        body,
        type: "note",
        content_type: "text/html",
        internal: false,
      }),
    });
  }

  async updateTicket(ticketId: string | number, payload: { owner_id?: number | null; priority_id?: number; state_id?: number }): Promise<any> {
    return this.request(`tickets/${ticketId}`, {
      method: "PUT",
      body: JSON.stringify(payload),
    });
  }
}
