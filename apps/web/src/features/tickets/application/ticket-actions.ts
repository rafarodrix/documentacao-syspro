"use server";

import type {
  TicketModuleCreateRequest,
  TicketModulePriority,
  TicketModuleStatus,
  TicketModuleTriageRequest,
} from "@dosc-syspro/contracts/ticket";
import { getProtectedSession } from "@/lib/auth-helpers";
import { consumeActionRateLimit } from "@dosc-syspro/shared/action-rate-limit";
import { getRequestIp } from "@/lib/security/request-context";
import { revalidateReleasesViews, revalidateTicketCollections, revalidateTicketViews } from "@/lib/cache-invalidation";
import {
  createTicketGateway,
  fetchLinkedCompaniesGateway,
  fetchTicketDetailsPageGateway,
  fetchTicketsGateway,
  replyTicketGateway,
  updateTicketGateway,
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

  const query = new URLSearchParams();
  query.set("page", String(page));
  query.set("pageSize", String(pageSize));
  if (params.queue) query.set("queue", params.queue);
  if (params.statusGroup) query.set("statusGroup", params.statusGroup);
  if (params.team) query.set("team", params.team);
  if (params.closedWindow) query.set("closedWindow", params.closedWindow);
  if (params.category?.trim()) query.set("category", params.category.trim());
  if (params.module?.trim()) query.set("module", params.module.trim());
  if (params.sortBy) query.set("sortBy", params.sortBy);
  if (params.sortOrder) query.set("sortOrder", params.sortOrder);
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
    statusCounts: { open: 0, development: 0, testing: 0, closed: 0 },
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

export async function getTicketDetailsAction(ticketId: string, params?: { page?: number; pageSize?: number }): Promise<TicketDetailsResponse> {
  const session = await getProtectedSession();
  if (!session) return { success: false, error: "Nao autorizado" };

  try {
    const response = await fetchTicketDetailsPageGateway(ticketId, params);
    return mapTicketModuleDetailsResponse(response);
  } catch (error) {
    console.error("Erro ao carregar detalhes do chamado:", error);
    return { success: false, error: "Chamado nao encontrado." };
  }
}

export async function replyTicketAction(
  ticketId: string,
  message: string,
  attachments?: { filename: string; data: string; "mime-type": string }[],
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
    const outbound = buildTicketReplyMarkdown(body, attachments ?? []);

    const result = await replyTicketGateway(ticketId, { message: outbound, visibility });

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

function buildTicketReplyMarkdown(
  body: string,
  attachments: { filename: string; data: string; "mime-type": string }[],
) {
  const sections: string[] = [];

  if (body) {
    sections.push(body);
  }

  if (!attachments.length) {
    return body;
  }

  const imageBlocks = attachments
    .filter((file) => file["mime-type"].startsWith("image/") && file.data.trim())
    .map((file) => {
      const mimeType = file["mime-type"] || "image/png";
      const filename = escapeMarkdown(file.filename || "imagem");
      const base64 = String(file.data || "").replace(/\s+/g, "");
      return `![${filename}](data:${mimeType};base64,${base64})`;
    });

  if (imageBlocks.length) {
    sections.push(imageBlocks.join("\n\n"));
  }

  const otherAttachments = attachments.filter((file) => !file["mime-type"].startsWith("image/"));
  if (otherAttachments.length) {
    const items = otherAttachments
      .map((file) => `- ${escapeMarkdown(file.filename || "anexo")}`)
      .join("\n");
    sections.push(["**Anexos enviados via portal**", items].join("\n"));
  }

  return sections.join("\n\n").trim();
}

function escapeMarkdown(value: string) {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/([\[\]\(\)`*_!#>~-])/g, "\\$1");
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

export async function unassignTicketToMeAction(ticketId: string): Promise<TicketMutationResponse> {
  const session = await getProtectedSession();
  if (!session || !(await currentUserHasPermission("tickets:manage", { acceptCompanyScope: true }))) {
    return { success: false, error: "Nao autorizado." };
  }

  try {
    const { updateTicketGateway } = await import("@/features/tickets/infrastructure/gateways/tickets.gateway");
    // Enviando explicitamente uma string vazia para limpar o assignedUserId, que o backend entende como unassign.
    const result = await updateTicketGateway(ticketId, { assignedUserId: "" });
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

export async function updateTicketStatusAction(ticketId: string, status: TicketModuleStatus): Promise<TicketMutationResponse> {
  const session = await getProtectedSession();
  if (!session || !(await currentUserHasPermission("tickets:manage", { acceptCompanyScope: true }))) {
    return { success: false, error: "Nao autorizado." };
  }

  if (status === "RESOLVED") {
    return { success: false, error: "Use o fluxo de finalizacao para resolver o ticket." };
  }

  try {
    const result = await updateTicketGateway(ticketId, { status });
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
  if (!session || !(await currentUserHasPermission("tickets:manage", { acceptCompanyScope: true }))) {
    return { success: false, error: "Nao autorizado." };
  }

  try {
    const result = await updateTicketGateway(ticketId, { status: "ARCHIVED" });
    if (!result.success) {
      return { success: false, error: result.error || "Falha ao arquivar ticket." };
    }

    revalidateTicketCollections();
    revalidateTicketViews(ticketId);
    return { success: true, message: "Ticket arquivado com sucesso." };
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
    const result = await updateTicketGateway(ticketId, updatePayload);
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
    const result = await updateTicketGateway(ticketId, {
      assignedUserId,
      ...(team ? { team } : {}),
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
    const result = await updateTicketGateway(ticketId, {
      ...(payload.supportOwnerUserId !== undefined ? { supportOwnerUserId: payload.supportOwnerUserId.trim() } : {}),
      ...(payload.developmentOwnerUserId !== undefined ? { developmentOwnerUserId: payload.developmentOwnerUserId.trim() } : {}),
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
    const { updateTicketGateway } = await import("@/features/tickets/infrastructure/gateways/tickets.gateway");
    
    // Convert priority back to TicketModulePriority format if needed
    // Assuming backend handles it or we map it properly inside the gateway.
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

    const result = await updateTicketGateway(ticketId, updatePayload);
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
