"use server";

import { TICKET_CREATE_MULTIPART_FIELD_NAMES, TICKET_REPLY_MULTIPART_FIELD_NAMES } from "@dosc-syspro/contracts/ticket";
import type {
  TicketModulePriority,
  TicketModuleStatus,
  TicketModuleTriageRequest,
} from "@dosc-syspro/contracts/ticket";
import { getProtectedSession } from "@/lib/auth-helpers";
import { consumeActionRateLimit } from "@dosc-syspro/shared/action-rate-limit";
import { getRequestIp } from "@/lib/security/request-context";
import { revalidateReleasesViews, revalidateTicketCollections, revalidateTicketViews } from "@/lib/cache-invalidation";
import { trpc } from "@/lib/api/trpc-client";
import {
  createTicketMultipartGateway,
  replyTicketGateway,
} from "@/features/tickets/infrastructure";
import { mapTicketModuleDetailsResponse } from "@/features/tickets/application/ticket-details.mapper";
import { toTicketListItem } from "@/features/tickets/application/ticket-list.mapper";
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
  resolutionSummary?: string;
  resolutionVideoUrl?: string;
  releaseType?: "BUG" | "MELHORIA" | "NOVA_FUNCIONALIDADE";
  releaseTitle?: string;
  releaseModule?: string;
  publishToReleases?: boolean;
}): Promise<TicketMutationResponse> {
  const session = await getProtectedSession();
  if (!session || !(await currentUserHasPermission("tickets:manage", { acceptCompanyScope: true }))) {
    return { success: false, error: "Nao autorizado." };
  }

  const resolutionSummary = input.resolutionSummary?.trim() || undefined;
  if (input.publishToReleases && !resolutionSummary) {
    return { success: false, error: "Resolucao obrigatoria para publicar em releases." };
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
    const result = await trpc.tickets.finalize.mutate({
      id: String(input.ticketId),
      data: {
        resolutionSummary,
        resolutionVideoUrl: video,
        releaseType: input.releaseType,
        releaseTitle: input.releaseTitle?.trim() || undefined,
        releaseModule: input.releaseModule?.trim() || undefined,
        publishToReleases: Boolean(input.publishToReleases),
      },
    });

    if (!result.success) {
      return { success: false, error: result.error || result.message || "Falha ao finalizar ticket." };
    }

    revalidateTicketCollections();
    revalidateTicketViews(String(input.ticketId));
    revalidateReleasesViews();
    return { success: true, message: "Ticket finalizado com sucesso." };
  } catch (error) {
    console.error("Erro ao finalizar ticket:", error);
    return { success: false, error: "Falha ao finalizar ticket." };
  }
}

function parsePriorityFromForm(value: string): TicketModulePriority {
  const firstToken = (value || "").trim().toLowerCase().split(/\s+/)[0];
  if (firstToken === "1" || firstToken === "low" || firstToken === "baixa") return "LOW";
  if (firstToken === "3" || firstToken === "high" || firstToken === "alta" || firstToken === "urgent") return "HIGH";
  return "NORMAL";
}

export async function getTicketsAction(params: TicketQueryParams = {}): Promise<TicketsDataResponse> {
  const page = Math.max(1, params.page ?? 1);
  const pageSize = Math.min(100, Math.max(10, params.pageSize ?? 50));

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
    statusCounts: { open: 0, development: 0, testing: 0, closed: 0 },
  };

  try {
    const response = await trpc.tickets.list.query({
      page: String(page),
      pageSize: String(pageSize),
      ...(params.queue ? { queue: params.queue } : {}),
      ...(params.statusGroup ? { statusGroup: params.statusGroup } : {}),
      ...(params.team ? { team: params.team } : {}),
      ...(params.closedWindow ? { closedWindow: params.closedWindow } : {}),
      ...(params.category?.trim() ? { category: params.category.trim() } : {}),
      ...(params.module?.trim() ? { module: params.module.trim() } : {}),
      ...(params.sortBy ? { sortBy: params.sortBy } : {}),
      ...(params.sortOrder ? { sortOrder: params.sortOrder } : {}),
      ...(params.search?.trim() ? { search: params.search.trim() } : {}),
    });
    
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

    const payload = new FormData();
    payload.append("title", subject);
    payload.append("description", description);
    payload.append("priority", parsePriorityFromForm(priorityRaw));
    payload.append("channel", source === "chatwoot" ? "WHATSAPP" : "PORTAL");
    payload.append("entryPoint", "INBOUND");
    if (companyIdInput) payload.append("companyId", companyIdInput);
    if (userSelectedCompanyId) payload.append("userSelectedCompanyId", userSelectedCompanyId);
    if (customerEmailInput) payload.append("customerEmail", customerEmailInput);
    if (categoryInput) payload.append("category", categoryInput);
    if (moduleInput) payload.append("module", moduleInput);
    if (teamInput) payload.append("team", teamInput);
    if (databaseUrlInput) payload.append("databaseUrl", databaseUrlInput);
    if (developmentVideoUrlInput) payload.append("developmentVideoUrl", developmentVideoUrlInput);
    if (source === "chatwoot" && chatwootConversationId) payload.append("externalThreadId", chatwootConversationId);
    if (customerPhoneInput) payload.append("contactPhoneSnapshot", customerPhoneInput);
    if (customerWhatsappInput || customerPhoneInput) payload.append("contactWhatsappSnapshot", customerWhatsappInput || customerPhoneInput);
    if (customerNameInput) payload.append("contactNameSnapshot", customerNameInput);
    if (source === "chatwoot") {
      payload.append(
        TICKET_CREATE_MULTIPART_FIELD_NAMES.metadata,
        JSON.stringify({
          source: "chatwoot",
          chatwootConversationId: chatwootConversationId || null,
          chatwootContactId: chatwootContactId || null,
          chatwootAccountId: chatwootAccountId || null,
          chatwootConversationUrl: chatwootConversationUrl || null,
          createdFromPortalAt: new Date().toISOString(),
        }),
      );
    }

    for (const attachment of formData.getAll("attachments")) {
      if (typeof attachment !== "string") {
        payload.append(TICKET_CREATE_MULTIPART_FIELD_NAMES.attachments, attachment);
      }
    }

    const result = await createTicketMultipartGateway(payload);

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

export async function getTicketDetailsAction(ticketId: string, params?: { page?: number; pageSize?: number }): Promise<TicketDetailsResponse> {
  const session = await getProtectedSession();
  if (!session) return { success: false, error: "Nao autorizado" };

  try {
    const response = await trpc.tickets.details.query({
      id: ticketId,
      ...(params?.page ? { page: String(params.page) } : {}),
      ...(params?.pageSize ? { pageSize: String(params.pageSize) } : {}),
    });
    return mapTicketModuleDetailsResponse(response);
  } catch (error) {
    console.error("Erro ao carregar detalhes do chamado:", error);
    return { success: false, error: "Chamado nao encontrado." };
  }
}

export async function replyTicketAction(
  ticketId: string,
  message: string,
  attachments?: File[],
  visibility: "PUBLIC" | "INTERNAL" = "PUBLIC",
): Promise<TicketMutationResponse> {
  const session = await getProtectedSession();
  if (!session) return { success: false, error: "Nao autorizado." };

  const body = message.trim();
  const hasAttachments = Boolean(attachments?.length);

  if (!body && !hasAttachments) {
    return { success: false, error: "A resposta deve conter texto ou ao menos um anexo." };
  }

  try {
    const formData = new FormData();
    if (body) {
      formData.append(TICKET_REPLY_MULTIPART_FIELD_NAMES.message, body);
    }
    formData.append(TICKET_REPLY_MULTIPART_FIELD_NAMES.visibility, visibility);
    for (const attachment of attachments ?? []) {
      formData.append(TICKET_REPLY_MULTIPART_FIELD_NAMES.attachments, attachment);
    }

    const result = await replyTicketGateway(ticketId, formData);

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
      const result = await trpc.tickets.update.mutate({ id: ticketId, data: { assignedUserId: session.userId, status: "IN_PROGRESS" } });
      if (!result.success) {
        return { success: false, error: result.error || "Falha ao assumir ticket." };
      }
    }

    if (input.action === "priority_high") {
      const result = await trpc.tickets.update.mutate({ id: ticketId, data: { priority: "HIGH" } });
      if (!result.success) {
        return { success: false, error: result.error || "Falha ao elevar prioridade." };
      }
    }

    if (input.action === "macro_followup") {
      const formData = new FormData();
      formData.append(
        TICKET_REPLY_MULTIPART_FIELD_NAMES.message,
        "Atualizacao automatica: estamos analisando este chamado e retornaremos em breve.",
      );
      const result = await replyTicketGateway(ticketId, formData);
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
  try {
    const result = await trpc.tickets.assignToMe.mutate({ id: ticketId });
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

export async function unassignTicketToMeAction(ticketId: string): Promise<TicketMutationResponse> {
  const session = await getProtectedSession();
  if (!session || !(await currentUserHasPermission("tickets:manage", { acceptCompanyScope: true }))) {
    return { success: false, error: "Nao autorizado." };
  }

  try {
    const result = await trpc.tickets.update.mutate({ id: ticketId, data: { assignedUserId: "" } });
    if (!result.success) {
      return { success: false, error: result.error || "Falha ao liberar ticket." };
    }
    revalidateTicketCollections();
    revalidateTicketViews(ticketId);
    return { success: true };
  } catch (error) {
    console.error("Erro em unassignTicketToMeAction:", error);
    return { success: false, error: "Falha ao liberar chamado." };
  }
}

export async function triageTicketAction(ticketId: string, payload: TicketModuleTriageRequest): Promise<TicketMutationResponse> {
  try {
    const result = await trpc.tickets.triage.mutate({ id: ticketId, data: payload });
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

export async function updateTicketStatusAction(ticketId: string, status: TicketModuleStatus): Promise<TicketMutationResponse> {
  if (status === "RESOLVED") {
    return { success: false, error: "Use o fluxo de finalizacao para resolver o ticket." };
  }

  try {
    const result = await trpc.tickets.updateStatus.mutate({ id: ticketId, status });
    if (!result.success) {
      return { success: false, error: result.error || "Falha ao atualizar status." };
    }

    revalidateTicketCollections();
    revalidateTicketViews(ticketId);
    return { success: true };
  } catch (error) {
    console.error("Erro em updateTicketStatusAction:", error);
    return { success: false, error: "Falha ao atualizar status." };
  }
}

export async function archiveTicketAction(ticketId: string): Promise<TicketMutationResponse> {
  const session = await getProtectedSession();
  if (!session) {
    console.error("[archiveTicketAction] sessao invalida para ticket", ticketId);
    return { success: false, error: "Sessao expirada. Faca login novamente." };
  }
  const canManage = await currentUserHasPermission("tickets:manage", { acceptCompanyScope: true });
  if (!canManage) {
    console.error("[archiveTicketAction] permissao negada para usuario", session.userId, "ticket", ticketId);
    return { success: false, error: "Sem permissao para arquivar tickets." };
  }

  try {
    const result = await trpc.tickets.archive.mutate({ id: ticketId });
    if (!result.success) {
      return { success: false, error: result.error || "Falha ao arquivar ticket." };
    }

    revalidateTicketCollections();
    revalidateTicketViews(ticketId);
    return { success: true, message: result.message || "Ticket arquivado com sucesso.", status: result.status };
  } catch (error) {
    console.error("Erro em archiveTicketAction:", error);
    return { success: false, error: "Falha ao arquivar ticket." };
  }
}

export async function updateTicketClassificationAction(
  ticketId: string,
  payload: { team?: string; module?: string; category?: string; priority?: TicketModulePriority; status?: TicketModuleStatus; note?: string },
): Promise<TicketMutationResponse> {
  const session = await getProtectedSession();
  if (!session || !(await currentUserHasPermission("tickets:manage", { acceptCompanyScope: true }))) {
    return { success: false, error: "Nao autorizado." };
  }

  const team = payload.team?.trim().toUpperCase();
  const note = payload.note?.trim();
  const updatePayload = {
    ...(team ? { team } : {}),
    ...(payload.module !== undefined ? { module: payload.module.trim() } : {}),
    ...(payload.category !== undefined ? { category: payload.category.trim() } : {}),
    ...(payload.priority !== undefined ? { priority: payload.priority } : {}),
    ...(payload.status !== undefined ? { status: payload.status } : {}),
    ...(note ? { note } : team === "DESENVOLVIMENTO" ? { note: "Classificacao atualizada para Desenvolvimento pelo painel do ticket." } : {}),
  };

  if (!Object.keys(updatePayload).length) {
    return { success: false, error: "Nenhuma classificacao informada." };
  }

  try {
    const result = await trpc.tickets.update.mutate({ id: ticketId, data: updatePayload });
    if (!result.success) {
      return { success: false, error: result.error || "Falha ao atualizar classificacao." };
    }

    revalidateTicketCollections();
    revalidateTicketViews(ticketId);
    return { success: true };
  } catch (error) {
    console.error("Erro em updateTicketClassificationAction:", error);
    return { success: false, error: "Falha ao atualizar classificacao." };
  }
}

export async function updateTicketAssigneeAction(
  ticketId: string,
  payload: { assignedUserId?: string; team?: string },
): Promise<TicketMutationResponse> {
  const session = await getProtectedSession();
  if (!session || !(await currentUserHasPermission("tickets:manage", { acceptCompanyScope: true }))) {
    return { success: false, error: "Nao autorizado." };
  }

  const assignedUserId = payload.assignedUserId?.trim() ?? "";
  const team = payload.team?.trim().toUpperCase();

  try {
    const result = await trpc.tickets.update.mutate({
      id: ticketId,
      data: {
        assignedUserId,
        ...(team ? { team } : {}),
      },
    });

    if (!result.success) {
      return { success: false, error: result.error || "Falha ao atualizar responsavel." };
    }

    revalidateTicketCollections();
    revalidateTicketViews(ticketId);
    return { success: true };
  } catch (error) {
    console.error("Erro em updateTicketAssigneeAction:", error);
    return { success: false, error: "Falha ao atualizar responsavel." };
  }
}

export async function updateTicketOwnersAction(
  ticketId: string,
  payload: { supportOwnerUserId?: string; developmentOwnerUserId?: string },
): Promise<TicketMutationResponse> {
  const session = await getProtectedSession();
  if (!session || !(await currentUserHasPermission("tickets:manage", { acceptCompanyScope: true }))) {
    return { success: false, error: "Nao autorizado." };
  }

  try {
    const result = await trpc.tickets.updateOwners.mutate({
      id: ticketId,
      data: {
        ...(payload.supportOwnerUserId !== undefined ? { supportOwnerUserId: payload.supportOwnerUserId.trim() } : {}),
        ...(payload.developmentOwnerUserId !== undefined ? { developmentOwnerUserId: payload.developmentOwnerUserId.trim() } : {}),
      },
    });

    if (!result.success) {
      return { success: false, error: result.error || "Falha ao atualizar responsaveis." };
    }

    revalidateTicketCollections();
    revalidateTicketViews(ticketId);
    return { success: true };
  } catch (error) {
    console.error("Erro em updateTicketOwnersAction:", error);
    return { success: false, error: "Falha ao atualizar responsaveis." };
  }
}

export async function getUserLinkedCompaniesAction() {
  const session = await getProtectedSession();
  if (!session) return { success: false, data: [] };

  try {
    const response = await trpc.tickets.linkedCompanies.query();
    if (!response.success) {
      return { success: false, data: [] };
    }
    return { success: true, data: response.data };
  } catch (error) {
    console.error("Erro ao buscar empresas vinculadas:", error);
    return { success: false, data: [] };
  }
}

import { updateTicketModuleSettingsGateway } from "@/features/settings/infrastructure/gateways/settings.gateway";

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

export async function transferTicketAction(ticketId: string, payload: { team: string; status?: TicketModuleStatus; priority?: number; note?: string }): Promise<TicketMutationResponse> {
  const session = await getProtectedSession();
  if (!session || !(await currentUserHasPermission("tickets:manage", { acceptCompanyScope: true }))) {
    return { success: false, error: "Nao autorizado." };
  }

  const team = payload.team.trim().toUpperCase();
  const note = payload.note?.trim() || "";
  if (team === "DESENVOLVIMENTO" && note.length < 20) {
    return { success: false, error: "Nota de contexto obrigatoria ao transferir para Desenvolvimento (min. 20 caracteres)." };
  }

  try {
    let priorityStr: "LOW" | "NORMAL" | "HIGH" | "CRITICAL" | undefined;
    if (payload.priority !== undefined) {
       priorityStr = payload.priority === 3 ? "HIGH" : payload.priority === 1 ? "LOW" : "NORMAL";
    }

    const updatePayload = {
      team,
      ...(note ? { note } : {}),
      ...(payload.status ? { status: payload.status } : {}),
      ...(priorityStr ? { priority: priorityStr } : {})
    };

    const result = await trpc.tickets.update.mutate({ id: ticketId, data: updatePayload });
    if (!result.success) {
      return { success: false, error: result.error || "Falha ao transferir ticket." };
    }

    revalidateTicketCollections();
    revalidateTicketViews(ticketId);
    return { success: true };
  } catch (error) {
    console.error("Erro em transferTicketAction:", error);
    return { success: false, error: "Falha ao transferir chamado." };
  }
}
