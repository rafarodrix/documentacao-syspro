export interface ZammadArticlePayload {
  ticket_id: number;
  subject: string;
  body: string;
  content_type: "text/plain" | "text/html";
  type: "note" | "phone" | "email";
  internal: boolean;
}

export class ZammadService {
  constructor(
    private readonly baseUrl: string,
    private readonly apiToken: string
  ) {}

  async addInternalNote(ticketId: number, body: string): Promise<void> {
    const url = `${this.baseUrl}/api/v1/ticket_articles`;
    
    const payload: ZammadArticlePayload = {
      ticket_id: ticketId,
      subject: "LOG: Sessão de Acesso Remoto",
      body,
      content_type: "text/plain",
      type: "note",
      internal: true,
    };

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Authorization": `Token token=${this.apiToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Erro ao criar nota no Zammad: ${response.status} - ${errorText}`);
    }
  }
}
