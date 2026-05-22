import type { ChatwootAppContext, TicketPriorityOption } from "./chatwoot-dashboard-types";

export function parseChatwootContext(raw: unknown): ChatwootAppContext | null {
  let payload = raw;
  if (typeof payload === "string") {
    try {
      payload = JSON.parse(payload);
    } catch {
      return null;
    }
  }

  if (!payload || typeof payload !== "object") return null;
  const candidate = payload as Record<string, unknown>;
  const data =
    candidate.event === "appContext" && candidate.data && typeof candidate.data === "object"
      ? (candidate.data as Record<string, unknown>)
      : candidate;

  return {
    conversation:
      data.conversation && typeof data.conversation === "object"
        ? (data.conversation as ChatwootAppContext["conversation"])
        : null,
    contact:
      data.contact && typeof data.contact === "object"
        ? (data.contact as ChatwootAppContext["contact"])
        : null,
    currentAgent:
      data.currentAgent && typeof data.currentAgent === "object"
        ? (data.currentAgent as ChatwootAppContext["currentAgent"])
        : null,
  };
}

export function requestChatwootContext() {
  if (typeof window === "undefined") return;
  window.parent.postMessage("chatwoot-dashboard-app:fetch-info", "*");
}

export function resolveApiPriorityFromSettingValue(value: string): TicketPriorityOption {
  const normalized = value.trim().toLowerCase();
  if (normalized.includes("critical")) return "CRITICAL";
  if (normalized.startsWith("3") || normalized.includes("high") || normalized.includes("alta")) return "HIGH";
  if (normalized.startsWith("1") || normalized.includes("low") || normalized.includes("baixa")) return "LOW";
  return "NORMAL";
}

export function buildChatwootTicketDescription(input: {
  companyName?: string;
  contactName?: string;
  customerPhone?: string;
  ticketNumber?: string;
  hostId?: string;
}) {
  return [
    "## Atendimento originado no Chatwoot",
    "",
    input.companyName ? `- Empresa: ${input.companyName}` : "",
    input.contactName ? `- Contato: ${input.contactName}` : "",
    input.customerPhone ? `- Telefone/WhatsApp: ${input.customerPhone}` : "",
    input.ticketNumber ? `- Ticket referenciado na conversa: #${input.ticketNumber}` : "",
    input.hostId ? `- Host em contexto: ${input.hostId}` : "",
    "",
    "## Descricao do problema",
    "",
    "## Passos para reproduzir",
    "1. ",
    "2. ",
    "3. ",
    "",
    "## Evidencias",
  ]
    .filter(Boolean)
    .join("\n");
}
