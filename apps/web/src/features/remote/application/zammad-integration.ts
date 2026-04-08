import { prisma } from "@/lib/prisma";
import {
  buildRequestedSessionExpiresAt,
  isSessionExpired,
} from "@/features/remote/application/session-policy";
import { normalizeRustdeskId } from "@/features/remote/application/rustdesk-sync";
import { TicketGateway } from "@/features/tickets/infrastructure/gateways/ticket-gateway";

type ZammadRemoteContext = {
  eventType: string;
  ticketId: string;
  ticketNumber: string;
  title: string;
  state: string | null;
  closeAt: string | null;
  customerEmail: string | null;
  rustdeskId: string | null;
  tags: string[];
};

function toStringOrNull(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function normalizeTags(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value
      .flatMap((item) => (typeof item === "string" ? item.split(",") : []))
      .map((item) => item.trim().toLowerCase())
      .filter(Boolean);
  }

  if (typeof value === "string") {
    return value
      .split(",")
      .map((item) => item.trim().toLowerCase())
      .filter(Boolean);
  }

  return [];
}

function extractTicketPayload(payload: Record<string, unknown>): Record<string, unknown> {
  if (payload.ticket && typeof payload.ticket === "object") return payload.ticket as Record<string, unknown>;
  if (payload.data && typeof payload.data === "object") {
    const data = payload.data as Record<string, unknown>;
    if (data.ticket && typeof data.ticket === "object") return data.ticket as Record<string, unknown>;
  }
  return payload;
}

function getCustomerEmailFromTicket(ticket: Record<string, unknown>): string | null {
  const customer = ticket.customer;
  if (typeof customer === "string" && customer.includes("@")) {
    return customer;
  }

  if (customer && typeof customer === "object") {
    const email = (customer as Record<string, unknown>).email;
    return toStringOrNull(email);
  }

  return null;
}

function parseZammadRemoteContext(payload: Record<string, unknown>): ZammadRemoteContext {
  const ticket = extractTicketPayload(payload);
  const ticketId = String(ticket.id ?? payload.ticket_id ?? "");
  const ticketNumber = String(ticket.number ?? ticket.id ?? payload.ticket_number ?? "");
  const title = String(ticket.title ?? payload.title ?? "Ticket Zammad");
  const state = toStringOrNull(ticket.state);
  const closeAt = toStringOrNull(ticket.close_at);
  const customerEmail =
    toStringOrNull(payload.customerEmail) ??
    toStringOrNull(ticket.customer_email) ??
    getCustomerEmailFromTicket(ticket);
  const rustdeskId =
    normalizeRustdeskId(
      toStringOrNull(payload.rustdeskId) ??
      toStringOrNull(ticket.rustdesk_id) ??
      toStringOrNull(ticket.rustdeskId)
    );
  const tags = normalizeTags(ticket.tags ?? payload.tags);
  const eventType = typeof payload.event === "string" ? payload.event : "webhook";

  return {
    eventType,
    ticketId,
    ticketNumber,
    title,
    state,
    closeAt,
    customerEmail,
    rustdeskId,
    tags,
  };
}

function shouldHandleRemoteEvent(context: ZammadRemoteContext): boolean {
  if (context.rustdeskId) return true;
  return context.tags.includes("suporte-remoto") || context.tags.includes("remote-support");
}

function buildReason(context: ZammadRemoteContext): string {
  return `Zammad ticket #${context.ticketNumber} - ${context.title}`;
}

function buildSessionMetadata(context: ZammadRemoteContext, rustdeskId: string | null) {
  return {
    source: "zammad",
    eventType: context.eventType,
    ticketId: context.ticketId,
    ticketNumber: context.ticketNumber,
    customerEmail: context.customerEmail,
    rustdeskId,
    tags: context.tags,
  };
}

function buildTicketLocator(context: ZammadRemoteContext) {
  if (context.ticketId) {
    return { ticketId: context.ticketId };
  }

  if (context.ticketNumber) {
    return { ticketNumber: context.ticketNumber };
  }

  return {};
}

function isClosedLike(context: ZammadRemoteContext): boolean {
  const state = context.state?.toLowerCase() ?? "";
  return Boolean(context.closeAt) || state.includes("close") || state.includes("fech");
}

async function resolveCompanyIdByCustomerEmail(customerEmail: string | null): Promise<string | null> {
  if (!customerEmail) return null;

  const companyEmail = await prisma.companyTicketEmail.findFirst({
    where: { email: customerEmail.toLowerCase(), isActive: true },
    select: { companyId: true },
  });

  return companyEmail?.companyId ?? null;
}

async function resolveRemoteHost(companyId: string, rustdeskId: string | null) {
  if (rustdeskId) {
    const exactHost = await prisma.remoteHost.findFirst({
      where: {
        companyId,
        agentExternalId: rustdeskId,
      },
      orderBy: [{ updatedAt: "desc" }],
    });

    if (exactHost) return exactHost;
  }

  return prisma.remoteHost.findFirst({
    where: {
      companyId,
      provider: { contains: "rustdesk", mode: "insensitive" },
    },
    orderBy: [{ status: "asc" }, { updatedAt: "desc" }],
  });
}

async function resolveRequesterUserId(companyId: string, customerEmail: string | null): Promise<string | null> {
  if (customerEmail) {
    const directUser = await prisma.user.findFirst({
      where: { email: customerEmail.toLowerCase(), deletedAt: null, isActive: true },
      select: { id: true },
    });

    if (directUser) return directUser.id;
  }

  const membership = await prisma.membership.findFirst({
    where: { companyId, user: { deletedAt: null, isActive: true } },
    orderBy: [{ createdAt: "asc" }],
    select: { userId: true },
  });

  return membership?.userId ?? null;
}

export async function resolveRustdeskDeepLink(input: {
  ticketId: string;
  customerEmail?: string | null;
  rustdeskId?: string | null;
}) {
  const ticket = await TicketGateway.getTicketById(input.ticketId);
  const ticketNumber =
    typeof ticket.number === "string" && ticket.number.trim()
      ? ticket.number.trim()
      : typeof ticket.number === "number"
        ? String(ticket.number)
        : null;
  const activeSession = await prisma.remoteSession.findFirst({
    where: {
      status: "STARTED",
      OR: [{ ticketId: input.ticketId }, ...(ticketNumber ? [{ ticketNumber }] : [])],
    },
    include: {
      host: {
        select: {
          id: true,
          companyId: true,
          agentExternalId: true,
        },
      },
    },
    orderBy: [{ startedAt: "desc" }, { createdAt: "desc" }],
  });

  if (!activeSession || isSessionExpired(activeSession.expiresAt)) return null;
  if (!activeSession.host.agentExternalId) return null;

  return {
    rustdeskId: activeSession.host.agentExternalId,
    deepLink: `rustdesk://${activeSession.host.agentExternalId}`,
    companyId: activeSession.host.companyId,
    hostId: activeSession.host.id,
  };
}

export async function handleZammadRemoteWebhook(payload: Record<string, unknown>) {
  const context = parseZammadRemoteContext(payload);
  if (!shouldHandleRemoteEvent(context)) {
    return { handled: false, reason: "Evento sem sinalizacao remota." };
  }

  const companyId = await resolveCompanyIdByCustomerEmail(context.customerEmail);
  if (!companyId) {
    return { handled: false, reason: "Empresa nao encontrada para o e-mail do ticket." };
  }

  const host = await resolveRemoteHost(companyId, context.rustdeskId);
  if (!host) {
    return { handled: false, reason: "Host remoto nao encontrado para o ticket." };
  }

  const reason = buildReason(context);

  if (isClosedLike(context)) {
    const activeSession = await prisma.remoteSession.findFirst({
      where: {
        companyId,
        hostId: host.id,
        ...buildTicketLocator(context),
        status: { in: ["REQUESTED", "STARTED"] },
      },
      orderBy: [{ createdAt: "desc" }],
    });

    if (!activeSession) {
      return { handled: false, reason: "Nenhuma sessao ativa encontrada para encerramento." };
    }

    const nextStatus = activeSession.status === "STARTED" ? "ENDED" : "CANCELLED";
    const now = new Date();
    const updated = await prisma.remoteSession.update({
      where: { id: activeSession.id },
      data: {
        status: nextStatus,
        endedAt: now,
        expiresAt: null,
        metadata: buildSessionMetadata(context, context.rustdeskId ?? host.agentExternalId ?? null),
      },
    });

    // Auditoria Zammad no Encerramento via Webhook
    (async () => {
      try {
        const start = activeSession.startedAt || activeSession.createdAt;
        let durationText = "";
        if (start) {
          const diffMs = now.getTime() - new Date(start).getTime();
          const diffMins = Math.round(diffMs / 60000);
          durationText = ` Duração aproximada: <b>${diffMins} minutos</b>.`;
        }
        
        const note = `<b>Portal Trilink:</b> Sessão remota encerrada (via status do ticket Zammad).${durationText}`;
        await TicketGateway.addInternalTicketNote(context.ticketId, note);
      } catch (err) {
        console.error("Erro ao adicionar nota de auditoria via webhook:", err);
      }
    })();

    return { handled: true, action: "closed", sessionId: updated.id };
  }

  const existing = await prisma.remoteSession.findFirst({
    where: {
      companyId,
      hostId: host.id,
      ...buildTicketLocator(context),
      status: { in: ["REQUESTED", "STARTED"] },
    },
    orderBy: [{ createdAt: "desc" }],
  });

  if (existing) {
    return { handled: true, action: "noop", sessionId: existing.id };
  }

  const requestedByUserId = await resolveRequesterUserId(companyId, context.customerEmail);
  if (!requestedByUserId) {
    return { handled: false, reason: "Nao foi possivel resolver usuario solicitante." };
  }

  const created = await prisma.remoteSession.create({
    data: {
      companyId,
      ticketId: context.ticketId,
      ticketNumber: context.ticketNumber,
      hostId: host.id,
      requestedByUserId,
      reason,
      status: "REQUESTED",
      expiresAt: buildRequestedSessionExpiresAt(),
      metadata: buildSessionMetadata(context, context.rustdeskId ?? host.agentExternalId ?? null),
    },
  });

  return { handled: true, action: "created", sessionId: created.id };
}


