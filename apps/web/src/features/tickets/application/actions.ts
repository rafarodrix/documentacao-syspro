"use server";

import { Role } from "@prisma/client";
import { getProtectedSession } from "@/lib/auth-helpers";
import { ZammadGateway } from "@/features/tickets/infrastructure/gateways/zammad-gateway";
import { ZammadTicketArticle } from "@dosc-syspro/contracts";
import { computeTicketSla } from "@dosc-syspro/core";
import { queryTicketsForViewer } from "@/features/tickets/application/services/ticket-query.service";
import { mapTicketStateLabel } from "@/features/tickets/infrastructure/mappers/zammad-ticket.mapper";
import { consumeActionRateLimit } from "@dosc-syspro/api/security/action-rate-limit";
import { getRequestIp } from "@/lib/security/request-context";
import { revalidateTicketCollections, revalidateTicketViews } from "@/lib/cache-invalidation";
import { getScopedCompanyZammadEmails, isSystemRole } from "@/features/tickets/application/services/ticket-scope.service";
import { prisma } from "@/lib/prisma";
import { getZammadGlobalSettingsSnapshot } from "@/features/tickets/application/zammad-global-settings-server";
import type { TicketQueryParams, TicketsDataResponse } from "@/components/platform/tickets/types";
import type { TicketDetailsResponse, TicketMutationResponse } from "@/features/tickets/domain/model";
import type { ZammadGlobalSettings } from "@dosc-syspro/contracts";

const CREATE_TICKET_RATE_LIMIT = { max: 10, windowMs: 60_000 };

function resolveRoleDefaults(role: Role, config: ZammadGlobalSettings) {
    switch (role) {
        case Role.ADMIN:
            return config.roleDefaults.admin;
        case Role.SUPORTE:
            return config.roleDefaults.suporte;
        case Role.DEVELOPER:
            return config.roleDefaults.developer;
        case Role.CLIENTE_ADMIN:
            return config.roleDefaults.clienteAdmin;
        case Role.CLIENTE_USER:
        default:
            return config.roleDefaults.clienteUser;
    }
}

export async function getTicketsAction(params: TicketQueryParams = {}): Promise<TicketsDataResponse> {
  const session = await getProtectedSession();

    if (!session) {
        return {
            success: false,
            error: "Nao autorizado",
            data: [],
            pagination: {
                page: Math.max(1, params.page ?? 1),
                pageSize: Math.min(20, Math.max(10, params.pageSize ?? 20)),
                hasPreviousPage: false,
                hasNextPage: false,
                total: 0,
            },
            queueCounts: { all: 0, my_queue: 0, unassigned: 0, critical: 0, no_response: 0 },
            statusCounts: { open: 0, pending: 0, closed: 0 },
        };
    }

  try {
    return await queryTicketsForViewer(
      {
        userId: session.userId,
        email: session.email,
        role: session.role,
      },
      params
    );
  } catch (error) {
    console.error("Erro inesperado ao consultar tickets:", error);
    return {
      success: false,
      error: "Falha ao carregar chamados.",
      data: [],
      pagination: {
        page: Math.max(1, params.page ?? 1),
        pageSize: Math.min(20, Math.max(10, params.pageSize ?? 20)),
        hasPreviousPage: false,
        hasNextPage: false,
        total: 0,
      },
      queueCounts: { all: 0, my_queue: 0, unassigned: 0, critical: 0, no_response: 0 },
      statusCounts: { open: 0, pending: 0, closed: 0 },
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
        const priorityStr = String(formData.get("priority") || "2 normal");
        const parsedPriorityId = parseInt(priorityStr.charAt(0), 10);
        const customerEmailInput = String(formData.get("customerEmail") || "").trim().toLowerCase();
        const systemUser = isSystemRole(session.role);

        if (!subject || !description) {
            return { success: false, message: "Preencha assunto e descricao." };
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (systemUser && !customerEmailInput) {
            return { success: false, message: "Informe o e-mail do cliente." };
        }

        if (systemUser && !emailRegex.test(customerEmailInput)) {
            return { success: false, message: "Informe um e-mail de cliente valido." };
        }

        const zammadGlobal = await getZammadGlobalSettingsSnapshot();
        const roleDefaults = resolveRoleDefaults(session.role, zammadGlobal);
        const group = roleDefaults.group || zammadGlobal.defaultGroup;
        const priorityId = Number.isFinite(parsedPriorityId)
            ? parsedPriorityId
            : (roleDefaults.priorityId ?? zammadGlobal.defaultPriorityId);
        const stateId = roleDefaults.stateId ?? zammadGlobal.defaultStateId;
        const ownerMode = roleDefaults.ownerMode ?? zammadGlobal.defaultOwnerMode;
        const shouldAssignCurrentAgent = systemUser && ownerMode === "ASSIGN_CURRENT_AGENT";
        const ownerId = shouldAssignCurrentAgent
            ? await ZammadGateway.getUserIdByEmail(session.email, "app-chamados")
            : null;
        const normalizedSubject = zammadGlobal.titlePrefix
            ? `${zammadGlobal.titlePrefix} ${subject}`.trim()
            : subject;

        if (systemUser && customerEmailInput) {
            const configured = await prisma.companyZammadEmail.findFirst({
                where: {
                    email: customerEmailInput,
                    isActive: true,
                    company: { deletedAt: null },
                },
                select: { id: true },
            });

            if (!configured) {
                return {
                    success: false,
                    message: "E-mail nao encontrado entre os contatos Zammad ativos das empresas.",
                };
            }
        }

        const newTicket = await ZammadGateway.createTicket({
            title: normalizedSubject,
            group,
            customer: systemUser ? customerEmailInput : session.email,
            priority_id: priorityId,
            state_id: stateId,
            owner_id: ownerId,
            article: {
                subject: normalizedSubject,
                body: description,
                type: zammadGlobal.defaultArticleType,
                internal: zammadGlobal.defaultArticleInternal,
            },
        });

        revalidateTicketCollections();
        return { success: true, message: "Chamado aberto com sucesso!", data: newTicket };
    } catch (error) {
        console.error("Erro ao criar chamado:", error);
        return { success: false, message: "Erro ao criar chamado no suporte." };
    }
}

export async function getTicketDetailsAction(ticketId: string): Promise<TicketDetailsResponse> {
    const session = await getProtectedSession();
    if (!session) return { success: false, error: "Nao autorizado" };

    const systemUser = isSystemRole(session.role);

    try {
        if (!systemUser) {
            const scopedEmails = await getScopedCompanyZammadEmails(session.userId);
            if (!scopedEmails.length) {
                return { success: false, error: "Chamado nao encontrado." };
            }

            const canAccess = await ZammadGateway.canAccessTicketForCustomerEmails(ticketId, scopedEmails);
            if (!canAccess) {
                return { success: false, error: "Voce nao tem permissao para acessar este chamado." };
            }
        }

        const [ticket, articles] = await Promise.all([
            ZammadGateway.getTicketById(ticketId),
            ZammadGateway.getTicketArticles(ticketId),
        ]);

        const visibleArticles = articles.filter((article: ZammadTicketArticle) => {
            if (systemUser) return true;
            return article.internal === false;
        });

        return {
            success: true,
            ticket: (() => {
                const sla = computeTicketSla({
                    createdAt: new Date(ticket.created_at),
                    firstResponseAt: ticket.first_response_at ? new Date(ticket.first_response_at) : null,
                    resolvedAt: ticket.close_at ? new Date(ticket.close_at) : null,
                    priorityId: ticket.priority_id ?? null,
                });

                return {
                    id: ticket.id,
                    title: ticket.title,
                    status: mapTicketStateLabel(ticket.state || ""),
                    number: ticket.number,
                    priority: ticket.priority_id ?? 2,
                    ownerId: ticket.owner_id ?? null,
                    updatedAt: ticket.updated_at ?? null,
                    firstResponseAt: ticket.first_response_at ?? null,
                    resolvedAt: ticket.close_at ?? null,
                    slaBreached: sla.breached,
                    slaWarning: sla.warning,
                    minutesToBreach: sla.minutesToBreach,
                    createdAt: new Date(ticket.created_at).toLocaleDateString("pt-BR"),
                };
            })(),
            articles: visibleArticles.map((article: ZammadTicketArticle) => ({
                id: article.id,
                from: article.from || "Sistema",
                body: article.body,
                createdAt: new Date(article.created_at).toLocaleString("pt-BR"),
                sender:
                    article.sender ||
                    ((article.from || "").toLowerCase().includes(session.email.toLowerCase()) ? "Customer" : "Agent"),
                isInternal: article.internal ?? false,
            })),
        };
    } catch (error) {
        console.error("Erro ao carregar detalhes do chamado:", error);
        return { success: false, error: "Chamado nao encontrado." };
    }
}

export async function replyTicketAction(ticketId: string, message: string): Promise<TicketMutationResponse> {
    const session = await getProtectedSession();
    if (!session) return { success: false, error: "Nao autorizado." };

    const body = message.trim();
    if (!body) return { success: false, error: "Mensagem vazia." };

    const systemUser = isSystemRole(session.role);

    try {
        if (!systemUser) {
            const scopedEmails = await getScopedCompanyZammadEmails(session.userId);
            if (!scopedEmails.length) {
                return { success: false, error: "Voce nao pode responder este chamado." };
            }

            const canAccess = await ZammadGateway.canAccessTicketForCustomerEmails(ticketId, scopedEmails);
            if (!canAccess) {
                return { success: false, error: "Voce nao pode responder este chamado." };
            }
        }

        await ZammadGateway.addTicketReply(ticketId, body);
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

    try {
        const zammadUserId = await ZammadGateway.getUserIdByEmail(session.email, "app-chamados");

        if (input.action === "assume") {
            if (!zammadUserId) return { success: false, error: "Usuario Zammad nao encontrado para assumir ticket." };
            await ZammadGateway.updateTicket(input.ticketId, { owner_id: zammadUserId });
        }

        if (input.action === "priority_high") {
            await ZammadGateway.updateTicket(input.ticketId, { priority_id: 3 });
        }

        if (input.action === "macro_followup") {
            await ZammadGateway.addTicketReply(
                input.ticketId,
                "Atualizacao automatica: estamos analisando este chamado e retornaremos em breve."
            );
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


