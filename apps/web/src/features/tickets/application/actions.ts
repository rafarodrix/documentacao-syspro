"use server";

import { headers } from "next/headers";
import { Role } from "@prisma/client";
import { getProtectedSession } from "@/lib/auth-helpers";
import { resolveServerOrigin } from "@/lib/server-origin";
import { consumeActionRateLimit } from "@dosc-syspro/api/security/action-rate-limit";
import { getRequestIp } from "@/lib/security/request-context";
import { revalidateTicketCollections, revalidateTicketViews } from "@/lib/cache-invalidation";
import { prisma } from "@/lib/prisma";
import type { TicketQueryParams, TicketsDataResponse, TicketListItem, TicketStatusCounts } from "@/components/platform/tickets/types";
import type { TicketDetailsResponse, TicketMutationResponse, ClosedTicketsWindow } from "@/features/tickets/domain/model";

const CREATE_TICKET_RATE_LIMIT = { max: 10, windowMs: 60_000 };
const SYSTEM_ROLES = new Set<Role>([Role.ADMIN, Role.DEVELOPER, Role.SUPORTE]);

type ConversationStatusApi = "NEW" | "UNASSIGNED" | "IN_PROGRESS" | "WAITING_CUSTOMER" | "RESOLVED" | "ARCHIVED";
type ConversationPriorityApi = "LOW" | "NORMAL" | "HIGH" | "CRITICAL";
type ConversationChannelApi = "WHATSAPP" | "EMAIL" | "PORTAL" | "PHONE";
type ConversationDirectionApi = "INBOUND" | "OUTBOUND" | "INTERNAL";
type ConversationMessageTypeApi = "TEXT" | "IMAGE" | "DOCUMENT" | "AUDIO";

type ApiTicketMessage = {
  id: string;
  direction: ConversationDirectionApi;
  type: ConversationMessageTypeApi;
  body: string | null;
  createdAt: string;
  authorUser?: { id: string; name: string | null; email: string } | null;
  authorContact?: { id: string; name: string | null } | null;
};

type ApiTicket = {
  id: string;
  channel: ConversationChannelApi;
  status: ConversationStatusApi;
  priority: ConversationPriorityApi;
  companyId: string | null;
  company?: { id: string; razaoSocial: string; nomeFantasia: string | null } | null;
  companyContactId: string | null;
  companyContact?: { id: string; name: string | null; email: string | null; whatsapp: string | null } | null;
  assignedUserId: string | null;
  assignedUser?: { id: string; name: string | null; email: string } | null;
  resolvedByUserId: string | null;
  ticketNumber: string | null;
  subject: string | null;
  createdAt: string;
  updatedAt: string;
  closedAt: string | null;
  messages?: ApiTicketMessage[];
};

type ApiTicketsListResponse = {
  success: boolean;
  data?: ApiTicket[];
  pagination?: {
    page: number;
    pageSize: number;
    total: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  };
  error?: string;
};

type ApiTicketDetailsResponse = {
  success: boolean;
  data?: ApiTicket;
  error?: string;
};

type ApiMutationResponse = {
  success: boolean;
  message?: string;
  error?: string;
};

function isSystemRole(role: Role): boolean {
  return SYSTEM_ROLES.has(role);
}

function mapPriorityToLevel(priority: ConversationPriorityApi | string | null | undefined): number {
  if (priority === "LOW") return 1;
  if (priority === "HIGH" || priority === "CRITICAL") return 3;
  return 2;
}

function parsePriorityFromForm(value: string): ConversationPriorityApi {
  const firstToken = (value || "").trim().toLowerCase().split(/\s+/)[0];
  if (firstToken === "1" || firstToken === "low" || firstToken === "baixa") return "LOW";
  if (firstToken === "3" || firstToken === "high" || firstToken === "alta" || firstToken === "urgent") return "HIGH";
  return "NORMAL";
}

function mapStatusLabel(status: ConversationStatusApi | string): string {
  switch (status) {
    case "NEW":
      return "Novo";
    case "UNASSIGNED":
      return "Sem dono";
    case "IN_PROGRESS":
      return "Em andamento";
    case "WAITING_CUSTOMER":
      return "Pendente cliente";
    case "RESOLVED":
      return "Resolvido";
    case "ARCHIVED":
      return "Arquivado";
    default:
      return status;
  }
}

function statusGroupFromConversation(status: ConversationStatusApi | string): "open" | "pending" | "closed" {
  if (status === "WAITING_CUSTOMER") return "pending";
  if (status === "RESOLVED" || status === "ARCHIVED") return "closed";
  return "open";
}

function inClosedWindow(dateLike: string, window: ClosedTicketsWindow): boolean {
  if (window === "all") return true;
  const days = Number(window.replace("d", ""));
  if (!Number.isFinite(days)) return true;
  const date = new Date(dateLike);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const maxMs = days * 24 * 60 * 60 * 1000;
  return diffMs <= maxMs;
}

function toTicketListItem(ticket: ApiTicket): TicketListItem {
  const companyName = ticket.company?.nomeFantasia || ticket.company?.razaoSocial || null;
  const customerName =
    ticket.companyContact?.name ||
    ticket.companyContact?.email ||
    companyName ||
    "Cliente";

  return {
    id: ticket.id,
    number: ticket.ticketNumber || ticket.id.slice(0, 8).toUpperCase(),
    title: ticket.subject || "Sem assunto",
    group: companyName || ticket.channel,
    status: ticket.status,
    statusLabel: mapStatusLabel(ticket.status),
    priority: mapPriorityToLevel(ticket.priority),
    customer: customerName,
    ownerId: ticket.assignedUserId,
    firstResponseAt: null,
    resolvedAt: ticket.closedAt,
    slaBreached: false,
    slaWarning: false,
    minutesToBreach: undefined,
    createdAt: ticket.createdAt,
    updatedAt: ticket.updatedAt,
  };
}

async function getAppOriginAndCookie() {
  const requestHeaders = await headers();
  const cookie = requestHeaders.get("cookie") || "";
  const appOrigin = resolveServerOrigin(requestHeaders);
  return { appOrigin, cookie };
}

async function callTicketsApi<T>(path: string, init?: RequestInit): Promise<T> {
  const { appOrigin, cookie } = await getAppOriginAndCookie();
  const url = `${appOrigin}/api/tickets${path}`;
  const requestHeaders = new Headers(init?.headers);
  if (cookie && !requestHeaders.has("cookie")) {
    requestHeaders.set("cookie", cookie);
  }

  const response = await fetch(url, {
    ...init,
    headers: requestHeaders,
    cache: "no-store",
  });

  let json: any = null;
  try {
    json = await response.json();
  } catch {
    json = null;
  }

  if (!response.ok) {
    const message = json?.error || json?.message || `Falha na API de tickets (${response.status}).`;
    throw new Error(message);
  }

  return json as T;
}

async function listVisibleTicketsForSession(params: { search?: string; pageSizeHint?: number }) {
  const session = await getProtectedSession();
  if (!session) return { session: null, tickets: [] as ApiTicket[] };

  const query = new URLSearchParams();
  query.set("page", "1");
  query.set("pageSize", String(Math.min(200, Math.max(20, params.pageSizeHint ?? 200))));
  if (params.search?.trim()) query.set("search", params.search.trim());

  const response = await callTicketsApi<ApiTicketsListResponse>(`?${query.toString()}`);
  const all = Array.isArray(response.data) ? response.data : [];

  if (isSystemRole(session.role)) {
    return { session, tickets: all };
  }

  const memberships = await prisma.membership.findMany({
    where: { userId: session.userId },
    select: { companyId: true },
  });
  const allowedCompanyIds = new Set(memberships.map((m) => m.companyId));
  const scoped = all.filter((ticket) => ticket.companyId && allowedCompanyIds.has(ticket.companyId));
  return { session, tickets: scoped };
}

export async function getTicketsAction(params: TicketQueryParams = {}): Promise<TicketsDataResponse> {
  const page = Math.max(1, params.page ?? 1);
  const pageSize = Math.min(50, Math.max(10, params.pageSize ?? 20));
  const queue = params.queue ?? "all";
  const statusGroup = params.statusGroup ?? "open";
  const closedWindow = params.closedWindow ?? "30d";

  const emptyResult: TicketsDataResponse = {
    success: false,
    error: "Nao autorizado",
    data: [],
    pagination: {
      page,
      pageSize,
      hasPreviousPage: false,
      hasNextPage: false,
      total: 0,
    },
    queueCounts: { all: 0, my_queue: 0, unassigned: 0, critical: 0, no_response: 0 },
    statusCounts: { open: 0, pending: 0, closed: 0 },
  };

  try {
    const { session, tickets } = await listVisibleTicketsForSession({ search: params.search, pageSizeHint: 200 });
    if (!session) return emptyResult;

    const queueFiltered = tickets.filter((ticket) => {
      if (queue === "all") return true;
      if (queue === "my_queue") return ticket.assignedUserId === session.userId;
      if (queue === "unassigned") return !ticket.assignedUserId;
      if (queue === "critical") return ticket.priority === "HIGH" || ticket.priority === "CRITICAL";
      if (queue === "no_response") return ticket.status === "NEW" || ticket.status === "UNASSIGNED";
      return true;
    });

    const queueCounts = {
      all: tickets.length,
      my_queue: tickets.filter((t) => t.assignedUserId === session.userId).length,
      unassigned: tickets.filter((t) => !t.assignedUserId).length,
      critical: tickets.filter((t) => t.priority === "HIGH" || t.priority === "CRITICAL").length,
      no_response: tickets.filter((t) => t.status === "NEW" || t.status === "UNASSIGNED").length,
    };

    const statusCounts: TicketStatusCounts = {
      open: queueFiltered.filter((t) => statusGroupFromConversation(t.status) === "open").length,
      pending: queueFiltered.filter((t) => statusGroupFromConversation(t.status) === "pending").length,
      closed: queueFiltered.filter((t) => statusGroupFromConversation(t.status) === "closed").length,
    };

    const statusFiltered = queueFiltered.filter((ticket) => {
      if (statusGroup === "all") return true;
      if (statusGroupFromConversation(ticket.status) !== statusGroup) return false;
      if (statusGroup === "closed") return inClosedWindow(ticket.updatedAt, closedWindow);
      return true;
    });

    const start = (page - 1) * pageSize;
    const paged = statusFiltered.slice(start, start + pageSize).map(toTicketListItem);

    return {
      success: true,
      data: paged,
      pagination: {
        page,
        pageSize,
        hasPreviousPage: page > 1,
        hasNextPage: start + pageSize < statusFiltered.length,
        total: statusFiltered.length,
      },
      queueCounts,
      statusCounts,
    };
  } catch (error) {
    console.error("Erro ao consultar tickets via backend:", error);
    return {
      ...emptyResult,
      success: false,
      error: "Falha ao carregar chamados.",
    };
  }
}

export async function createTicketAction(_prevState: unknown, formData: FormData) {
  try {
    const session = await getProtectedSession();
    if (!session) return { success: false, message: "Sessao expirada." };

    const ip = await getRequestIp();
    const rateLimit = consumeActionRateLimit({
      action: "createTicketAction",
      max: CREATE_TICKET_RATE_LIMIT.max,
      windowMs: CREATE_TICKET_RATE_LIMIT.windowMs,
      userId: session.userId,
      ip,
    });

    if (!rateLimit.allowed) {
      return { success: false, message: `Muitas tentativas. Aguarde ${rateLimit.retryAfterSeconds}s.` };
    }

    const subject = String(formData.get("subject") || "").trim();
    const description = String(formData.get("description") || "").trim();
    const priorityRaw = String(formData.get("priority") || "2 normal");
    const customerEmailInput = String(formData.get("customerEmail") || "").trim().toLowerCase();

    if (!subject || !description) {
      return { success: false, message: "Preencha assunto e descricao." };
    }

    let companyId: string | undefined;
    let companyContactId: string | undefined;

    if (isSystemRole(session.role) && customerEmailInput) {
      const contact = await prisma.companyContact.findFirst({
        where: { email: customerEmailInput },
        select: { id: true, companyId: true },
      });
      if (contact) {
        companyContactId = contact.id;
        companyId = contact.companyId ?? undefined;
      }
    } else {
      const selfContact = await prisma.companyContact.findFirst({
        where: { email: session.email },
        select: { id: true, companyId: true },
      });
      if (selfContact) {
        companyContactId = selfContact.id;
        companyId = selfContact.companyId ?? undefined;
      } else {
        const membership = await prisma.membership.findFirst({
          where: { userId: session.userId },
          select: { companyId: true },
        });
        companyId = membership?.companyId;
      }
    }

    const payload = {
      title: subject,
      description,
      priority: parsePriorityFromForm(priorityRaw),
      channel: "PORTAL",
      entryPoint: "INBOUND",
      ...(companyId ? { companyId } : {}),
      ...(companyContactId ? { companyContactId } : {}),
    };

    const result = await callTicketsApi<ApiMutationResponse>("", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!result.success) {
      return { success: false, message: result.error || result.message || "Erro ao criar chamado." };
    }

    revalidateTicketCollections();
    return { success: true, message: "Chamado aberto com sucesso!" };
  } catch (error) {
    console.error("Erro ao criar chamado:", error);
    return { success: false, message: "Erro ao criar chamado no suporte." };
  }
}

export async function getTicketDetailsAction(ticketId: string): Promise<TicketDetailsResponse> {
  const session = await getProtectedSession();
  if (!session) return { success: false, error: "Nao autorizado" };

  try {
    const response = await callTicketsApi<ApiTicketDetailsResponse>(`/${ticketId}`);
    if (!response.success || !response.data) {
      return { success: false, error: response.error || "Chamado nao encontrado." };
    }

    const ticket = response.data;

    if (!isSystemRole(session.role)) {
      const memberships = await prisma.membership.findMany({
        where: { userId: session.userId },
        select: { companyId: true },
      });
      const allowedCompanyIds = new Set(memberships.map((m) => m.companyId));
      if (ticket.companyId && !allowedCompanyIds.has(ticket.companyId)) {
        return { success: false, error: "Voce nao tem permissao para acessar este chamado." };
      }
    }

    return {
      success: true,
      ticket: {
        id: ticket.id,
        title: ticket.subject || "Sem assunto",
        status: mapStatusLabel(ticket.status),
        number: ticket.ticketNumber || ticket.id.slice(0, 8).toUpperCase(),
        priority: mapPriorityToLevel(ticket.priority),
        ownerId: ticket.assignedUserId,
        updatedAt: ticket.updatedAt,
        firstResponseAt: null,
        resolvedAt: ticket.closedAt,
        slaBreached: false,
        slaWarning: false,
        minutesToBreach: undefined,
        createdAt: new Date(ticket.createdAt).toLocaleDateString("pt-BR"),
      },
      articles: (ticket.messages || []).map((message) => ({
        id: message.id,
        from:
          message.authorUser?.email ||
          message.authorUser?.name ||
          message.authorContact?.name ||
          "Sistema",
        body: message.body || "",
        createdAt: new Date(message.createdAt).toLocaleString("pt-BR"),
        sender: message.direction === "INBOUND" ? "Customer" : "Agent",
        isInternal: message.direction === "INTERNAL",
      })),
    };
  } catch (error) {
    console.error("Erro ao carregar detalhes do chamado:", error);
    return { success: false, error: "Chamado nao encontrado." };
  }
}

export async function replyTicketAction(
  ticketId: string,
  message: string,
  attachments?: { filename: string; data: string; "mime-type": string }[]
): Promise<TicketMutationResponse> {
  const session = await getProtectedSession();
  if (!session) return { success: false, error: "Nao autorizado." };

  const body = message.trim();
  const hasAttachments = Boolean(attachments?.length);

  if (!body && !hasAttachments) {
    return { success: false, error: "A resposta deve conter texto ou ao menos um anexo." };
  }

  try {
    const attachmentNote = hasAttachments
      ? `\n\n[Anexos enviados via portal: ${(attachments || []).map((file) => file.filename).join(", ")}]`
      : "";
    const outbound = `${body || "Mensagem com anexos"}${attachmentNote}`.trim();

    const result = await callTicketsApi<ApiMutationResponse>(`/${ticketId}/reply`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: outbound }),
    });

    if (!result.success) {
      return { success: false, error: result.error || result.message || "Erro ao enviar." };
    }

    revalidateTicketViews(ticketId);
    return { success: true };
  } catch (error) {
    console.error("Erro ao responder chamado:", error);
    return { success: false, error: "Erro ao enviar." };
  }
}

export async function ticketQuickAction(input: {
  ticketId: string | number;
  action: "assume" | "priority_high" | "macro_followup";
}): Promise<TicketMutationResponse> {
  const session = await getProtectedSession();
  if (!session || !isSystemRole(session.role)) {
    return { success: false, error: "Nao autorizado." };
  }

  const ticketId = String(input.ticketId);

  try {
    if (input.action === "assume") {
      const result = await callTicketsApi<ApiMutationResponse>(`/${ticketId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ assignedUserId: session.userId, status: "IN_PROGRESS" }),
      });
      if (!result.success) {
        return { success: false, error: result.error || "Falha ao assumir ticket." };
      }
    }

    if (input.action === "priority_high") {
      const result = await callTicketsApi<ApiMutationResponse>(`/${ticketId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ priority: "HIGH" }),
      });
      if (!result.success) {
        return { success: false, error: result.error || "Falha ao elevar prioridade." };
      }
    }

    if (input.action === "macro_followup") {
      const result = await callTicketsApi<ApiMutationResponse>(`/${ticketId}/reply`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: "Atualizacao automatica: estamos analisando este chamado e retornaremos em breve." }),
      });
      if (!result.success) {
        return { success: false, error: result.error || "Falha ao aplicar macro." };
      }
    }

    revalidateTicketCollections();
    return { success: true };
  } catch (error) {
    console.error("Erro em ticketQuickAction:", error);
    return { success: false, error: "Falha ao executar acao rapida." };
  }
}

export const getMyTicketsAction = getTicketsAction;
export const getAdminTicketsAction = getTicketsAction;
