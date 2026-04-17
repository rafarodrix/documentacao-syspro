"use server";

import type {
  TicketModuleCreateRequest,
  TicketModulePriority,
  TicketModuleRecord,
} from "@dosc-syspro/contracts/ticket";
import { getProtectedSession } from "@/lib/auth-helpers";
import { consumeActionRateLimit } from "@dosc-syspro/shared/action-rate-limit";
import { getRequestIp } from "@/lib/security/request-context";
import { revalidateTicketCollections, revalidateTicketViews } from "@/lib/cache-invalidation";
import {
  createTicketGateway,
  fetchLinkedCompaniesGateway,
  fetchTicketDetailsGateway,
  fetchTicketsGateway,
  replyTicketGateway,
  updateTicketGateway,
} from "@/features/tickets/infrastructure";
import type {
  TicketDetailsResponse,
  TicketMutationResponse,
  TicketQueryParams,
  TicketsDataResponse,
  TicketListItem,
} from "@/features/tickets/domain/ticket-model";
import { currentUserHasPermission } from "@/features/user-access/application/current-user-access";

const CREATE_TICKET_RATE_LIMIT = { max: 10, windowMs: 60_000 };

export async function finalizeTicketAction(input: {
  ticketId: string | number;
  resolutionSummary: string;
  resolutionVideoUrl?: string;
  releaseType?: "BUG" | "MELHORIA";
  releaseTitle?: string;
  releaseModule?: string;
  publishToReleases?: boolean;
}): Promise<TicketMutationResponse> {
  const session = await getProtectedSession();
  if (!session || !(await currentUserHasPermission("tickets:manage", { acceptCompanyScope: true }))) {
    return { success: false, error: "Nao autorizado." };
  }

  const resolutionSummary = input.resolutionSummary.trim();
  if (!resolutionSummary) {
    return { success: false, error: "Resolucao obrigatoria para finalizar o ticket." };
  }

  const video = input.resolutionVideoUrl?.trim() || undefined;
  if (video) {
    try {
      new URL(video);
    } catch {
      return { success: false, error: "Link de video invalido." };
    }
  }

  try {
    const result = await updateTicketGateway(String(input.ticketId), {
      status: "RESOLVED",
      resolutionSummary,
      resolutionVideoUrl: video,
      releaseType: input.releaseType,
      releaseTitle: input.releaseTitle?.trim() || undefined,
      releaseModule: input.releaseModule?.trim() || undefined,
      publishToReleases: Boolean(input.publishToReleases),
    });

    if (!result.success) {
      return { success: false, error: result.error || result.message || "Falha ao finalizar ticket." };
    }

    revalidateTicketCollections();
    revalidateTicketViews(String(input.ticketId));
    return { success: true, message: "Ticket finalizado com sucesso." };
  } catch (error) {
    console.error("Erro ao finalizar ticket:", error);
    return { success: false, error: "Falha ao finalizar ticket." };
  }
}

function mapPriorityToLevel(priority: TicketModulePriority | string | null | undefined): number {
  if (priority === "LOW") return 1;
  if (priority === "HIGH" || priority === "CRITICAL") return 3;
  return 2;
}

function parsePriorityFromForm(value: string): TicketModulePriority {
  const firstToken = (value || "").trim().toLowerCase().split(/\s+/)[0];
  if (firstToken === "1" || firstToken === "low" || firstToken === "baixa") return "LOW";
  if (firstToken === "3" || firstToken === "high" || firstToken === "alta" || firstToken === "urgent") return "HIGH";
  return "NORMAL";
}

function mapStatusLabel(status: TicketModuleRecord["status"] | string): string {
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

function readStringMetadata(metadata: Record<string, unknown> | null | undefined, key: string): string | null {
  const value = metadata?.[key];
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function readNullableMetadata(metadata: Record<string, unknown> | null | undefined, key: string): string | null {
  const value = metadata?.[key];
  if (typeof value !== "string") return null;
  const normalized = value.trim();
  return normalized ? normalized : null;
}

function toTicketListItem(ticket: TicketModuleRecord): TicketListItem {
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

export async function getTicketsAction(params: TicketQueryParams = {}): Promise<TicketsDataResponse> {
  const page = Math.max(1, params.page ?? 1);
  const pageSize = Math.min(50, Math.max(10, params.pageSize ?? 20));

  const query = new URLSearchParams();
  query.set("page", String(page));
  query.set("pageSize", String(pageSize));
  if (params.queue) query.set("queue", params.queue);
  if (params.statusGroup) query.set("statusGroup", params.statusGroup);
  if (params.closedWindow) query.set("closedWindow", params.closedWindow);
  if (params.search?.trim()) query.set("search", params.search.trim());

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
    const response = await fetchTicketsGateway(query);
    
    if (!response.success || !response.data) {
      return { ...emptyResult, error: response.error || "Falha ao carregar chamados." };
    }

    const paged = response.data.map(toTicketListItem);

    return {
      success: true,
      data: paged,
      pagination: response.pagination ?? emptyResult.pagination,
      queueCounts: response.queueCounts ?? emptyResult.queueCounts,
      statusCounts: response.statusCounts ?? emptyResult.statusCounts,
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
    const companyIdInput = String(formData.get("companyId") || "").trim();
    const categoryInput = String(formData.get("category") || "").trim();
    const moduleInput = String(formData.get("module") || "").trim();
    const environmentInput = String(formData.get("environment") || "").trim();
    const teamInput = String(formData.get("team") || "").trim().toUpperCase();
    const databaseUrlInput = String(formData.get("databaseUrl") || "").trim();
    const developmentVideoUrlInput = String(formData.get("developmentVideoUrl") || "").trim();
    const source = String(formData.get("source") || "").trim().toLowerCase();
    const chatwootConversationId = String(formData.get("chatwootConversationId") || "").trim();
    const chatwootContactId = String(formData.get("chatwootContactId") || "").trim();
    const chatwootAccountId = String(formData.get("chatwootAccountId") || "").trim();
    const chatwootConversationUrl = String(formData.get("chatwootConversationUrl") || "").trim();
    const customerNameInput = String(formData.get("customerName") || "").trim();
    const customerPhoneInput = String(formData.get("customerPhone") || "").trim();
    const customerWhatsappInput = String(formData.get("customerWhatsapp") || "").trim();

    if (!subject || !description) {
      return { success: false, message: "Preencha assunto e descricao." };
    }

    const userSelectedCompanyId = String(formData.get("userSelectedCompanyId") || "").trim() || undefined;

    const payload: TicketModuleCreateRequest = {
      title: subject,
      description,
      priority: parsePriorityFromForm(priorityRaw),
      channel: source === "chatwoot" ? "WHATSAPP" : "PORTAL",
      entryPoint: "INBOUND",
      companyId: companyIdInput || undefined,
      userSelectedCompanyId,
      customerEmail: customerEmailInput || undefined,
      category: categoryInput || undefined,
      module: moduleInput || undefined,
      environment: environmentInput || undefined,
      team: teamInput || undefined,
      databaseUrl: databaseUrlInput || undefined,
      developmentVideoUrl: developmentVideoUrlInput || undefined,
      ...(source === "chatwoot" && chatwootConversationId ? { externalThreadId: chatwootConversationId } : {}),
      ...(customerPhoneInput ? { contactPhoneSnapshot: customerPhoneInput } : {}),
      ...(customerWhatsappInput || customerPhoneInput
        ? { contactWhatsappSnapshot: customerWhatsappInput || customerPhoneInput }
        : {}),
      ...(customerNameInput ? { contactNameSnapshot: customerNameInput } : {}),
      ...(source === "chatwoot"
        ? {
            metadata: {
              source: "chatwoot",
              chatwootConversationId: chatwootConversationId || null,
              chatwootContactId: chatwootContactId || null,
              chatwootAccountId: chatwootAccountId || null,
              chatwootConversationUrl: chatwootConversationUrl || null,
              createdFromPortalAt: new Date().toISOString(),
            },
          }
        : {}),
    };

    const result = await createTicketGateway(payload);

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
    const response = await fetchTicketDetailsGateway(ticketId);
    if (!response.success || !response.data) {
      return { success: false, error: response.error || "Chamado nao encontrado." };
    }

    const ticket = response.data;

    return {
      success: true,
      ticket: {
        id: ticket.id,
        title: ticket.subject || "Sem assunto",
        status: mapStatusLabel(ticket.status),
        number: ticket.ticketNumber || ticket.id.slice(0, 8).toUpperCase(),
        priority: mapPriorityToLevel(ticket.priority),
        ownerId: ticket.assignedUserId,
        ownerName: ticket.assignedUser?.name || ticket.assignedUser?.email || readStringMetadata(ticket.metadata, "currentOwnerName"),
        updatedAt: ticket.updatedAt,
        firstResponseAt: null,
        resolvedAt: ticket.closedAt,
        resolvedByName: ticket.resolvedByUser?.name || ticket.resolvedByUser?.email || readStringMetadata(ticket.metadata, "resolvedByName"),
        resolutionSummary: ticket.resolutionSummary || null,
        resolutionVideoUrl: ticket.resolutionVideoUrl || null,
        releaseType: ticket.releaseType || null,
        releaseTitle: ticket.releaseTitle || readStringMetadata(ticket.metadata, "releaseTitle"),
        releaseModule: ticket.releaseModule || null,
        publishToReleases: Boolean(ticket.publishToReleases),
        slaBreached: false,
        slaWarning: false,
        minutesToBreach: undefined,
        origin: {
          source: readStringMetadata(ticket.metadata, "source"),
          externalThreadId: ticket.externalThreadId || null,
          contactName: ticket.contactNameSnapshot || null,
          contactPhone: ticket.contactPhoneSnapshot || null,
          contactWhatsapp: ticket.contactWhatsappSnapshot || null,
          chatwootConversationId: readStringMetadata(ticket.metadata, "chatwootConversationId"),
          chatwootContactId: readStringMetadata(ticket.metadata, "chatwootContactId"),
          chatwootAccountId: readStringMetadata(ticket.metadata, "chatwootAccountId"),
          chatwootConversationUrl: readStringMetadata(ticket.metadata, "chatwootConversationUrl"),
        },
        operations: {
          openedByName: readNullableMetadata(ticket.metadata, "openedByName"),
          openedByEmail: readNullableMetadata(ticket.metadata, "openedByEmail"),
          openedByRole: readNullableMetadata(ticket.metadata, "openedByRole"),
          currentTeam: readNullableMetadata(ticket.metadata, "currentTeam"),
          category: readNullableMetadata(ticket.metadata, "category"),
          module: readNullableMetadata(ticket.metadata, "module"),
          environment: readNullableMetadata(ticket.metadata, "environment"),
          databaseUrl: readNullableMetadata(ticket.metadata, "databaseUrl"),
          developmentVideoUrl: readNullableMetadata(ticket.metadata, "developmentVideoUrl"),
          supportOwnerName: readNullableMetadata(ticket.metadata, "supportOwnerName"),
          developmentOwnerName: readNullableMetadata(ticket.metadata, "developmentOwnerName"),
        },
        createdAt: new Date(ticket.createdAt).toLocaleDateString("pt-BR"),
      },
      articles: (ticket.messages || []).map((message: NonNullable<TicketModuleRecord["messages"]>[number]) => ({
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

    const result = await replyTicketGateway(ticketId, { message: outbound });

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
  if (!session || !(await currentUserHasPermission("tickets:manage", { acceptCompanyScope: true }))) {
    return { success: false, error: "Nao autorizado." };
  }

  const ticketId = String(input.ticketId);

  try {
    if (input.action === "assume") {
      const result = await updateTicketGateway(ticketId, { assignedUserId: session.userId, status: "IN_PROGRESS" });
      if (!result.success) {
        return { success: false, error: result.error || "Falha ao assumir ticket." };
      }
    }

    if (input.action === "priority_high") {
      const result = await updateTicketGateway(ticketId, { priority: "HIGH" });
      if (!result.success) {
        return { success: false, error: result.error || "Falha ao elevar prioridade." };
      }
    }

    if (input.action === "macro_followup") {
      const result = await replyTicketGateway(ticketId, {
        message: "Atualizacao automatica: estamos analisando este chamado e retornaremos em breve.",
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

export async function assignTicketToMeAction(ticketId: string): Promise<TicketMutationResponse> {
  const session = await getProtectedSession();
  if (!session || !(await currentUserHasPermission("tickets:manage", { acceptCompanyScope: true }))) {
    return { success: false, error: "Nao autorizado." };
  }

  try {
    const { assignTicketToMeGateway } = await import("@/features/tickets/infrastructure/gateways/tickets.gateway");
    const result = await assignTicketToMeGateway(ticketId);
    if (!result.success) {
      return { success: false, error: result.error || "Falha ao assumir ticket." };
    }
    revalidateTicketCollections();
    revalidateTicketViews(ticketId);
    return { success: true };
  } catch (error) {
    console.error("Erro em assignTicketToMeAction:", error);
    return { success: false, error: "Falha ao assumir chamado." };
  }
}

export async function triageTicketAction(ticketId: string, payload: { priority?: string; team?: string; category?: string; }): Promise<TicketMutationResponse> {
  const session = await getProtectedSession();
  if (!session || !(await currentUserHasPermission("tickets:manage", { acceptCompanyScope: true }))) {
    return { success: false, error: "Nao autorizado." };
  }

  try {
    const { triageTicketGateway } = await import("@/features/tickets/infrastructure/gateways/tickets.gateway");
    const result = await triageTicketGateway(ticketId, payload);
    if (!result.success) {
      return { success: false, error: result.error || "Falha ao iniciar triagem." };
    }
    revalidateTicketCollections();
    revalidateTicketViews(ticketId);
    return { success: true };
  } catch (error) {
    console.error("Erro em triageTicketAction:", error);
    return { success: false, error: "Falha ao realizar triagem." };
  }
}

export async function getUserLinkedCompaniesAction() {
  const session = await getProtectedSession();
  if (!session) return { success: false, data: [] };

  try {
    const response = await fetchLinkedCompaniesGateway();
    if (!response.success) {
      return { success: false, data: [] };
    }
    return { success: true, data: response.data };
  } catch (error) {
    console.error("Erro ao buscar empresas vinculadas:", error);
    return { success: false, data: [] };
  }
}

import { updateTicketModuleSettingsGateway } from "@/features/settings/infrastructure/settings.gateway";

export async function saveTicketSettingsAction(settings: import("@dosc-syspro/contracts/ticket").TicketModuleSettings): Promise<{success: boolean, message?: string, error?: string}> {
  const session = await getProtectedSession();
  if (!session || !(await currentUserHasPermission("tickets:manage", { acceptCompanyScope: true }))) {
    return { success: false, error: "Nao autorizado." };
  }

  try {
    const result = await updateTicketModuleSettingsGateway(settings);
    
    if (!result.success) {
      return { success: false, error: result.error || "Erro ao salvar configuracoes." };
    }
    return { success: true, message: result.message || "Salvo com sucesso." };
  } catch(error) {
    console.error("error saving ticket settings", error);
    return { success: false, error: "Falha ao salvar. Verifique se o backend esta ativo." };
  }
}
