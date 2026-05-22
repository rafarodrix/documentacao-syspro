import { useEffect, useMemo, useState } from "react";
import { DEFAULT_TICKET_MODULE_SETTINGS } from "@dosc-syspro/contracts/ticket";
import type { TicketModuleSettings } from "@dosc-syspro/contracts/ticket";
import {
  getSuggestedCategoryForTeam,
} from "@/features/tickets/interface/hooks/use-ticket-module-settings";
import { toTicketListItems } from "@/features/tickets/application/ticket-list.mapper";
import { trpc } from "@/lib/api/trpc-client";
import { buildChatwootTicketDescription, resolveApiPriorityFromSettingValue } from "../chatwoot-dashboard-app.helpers";
import type { EmbeddedTicketFormState, FeedbackState, TicketListEntry } from "../chatwoot-dashboard-types";

interface UseTicketsParams {
  companyId: string;
  ticketNumber: string;
  effectiveContactName: string;
  companyName: string;
  customerPhone: string;
  hostId: string;
  conversationId: string;
  contactId: string;
  accountId: string;
  currentAgentName: string;
  ticketSettings: TicketModuleSettings;
  canCreateTicket: boolean;
}

const EMPTY_TICKET: TicketListEntry = {
  id: "",
  number: "-",
  title: "Sem titulo",
  status: "",
  statusLabel: "-",
  createdAt: "",
  updatedAt: "",
  customer: "",
};

export function useChatwootTickets({
  companyId,
  ticketNumber,
  effectiveContactName,
  companyName,
  customerPhone,
  hostId,
  conversationId,
  contactId,
  accountId,
  currentAgentName,
  ticketSettings,
  canCreateTicket,
}: UseTicketsParams) {
  const [latestTickets, setLatestTickets] = useState<TicketListEntry[]>([]);
  const [isLoadingTickets, setIsLoadingTickets] = useState(false);
  const [ticketError, setTicketError] = useState<string | null>(null);
  const [ticketReloadToken, setTicketReloadToken] = useState(0);
  const [showEmbeddedTicketForm, setShowEmbeddedTicketForm] = useState(false);
  const [embeddedTicketForm, setEmbeddedTicketForm] = useState<EmbeddedTicketFormState>({
    title: "",
    description: "",
    priorityValue: DEFAULT_TICKET_MODULE_SETTINGS.defaultPriority,
    team: DEFAULT_TICKET_MODULE_SETTINGS.defaultTeam,
    category:
      getSuggestedCategoryForTeam(DEFAULT_TICKET_MODULE_SETTINGS, DEFAULT_TICKET_MODULE_SETTINGS.defaultTeam) ||
      DEFAULT_TICKET_MODULE_SETTINGS.categories[0]?.value ||
      "",
    module: DEFAULT_TICKET_MODULE_SETTINGS.modules[0]?.value || "",
  });
  const [isSubmittingEmbeddedTicket, setIsSubmittingEmbeddedTicket] = useState(false);
  const [embeddedTicketFeedback, setEmbeddedTicketFeedback] = useState<FeedbackState>(null);

  const filteredCategories = useMemo(
    () => ticketSettings.categories.filter((category) => category.defaultTeam === embeddedTicketForm.team),
    [embeddedTicketForm.team, ticketSettings.categories],
  );

  // Sync form fields to current ticket settings
  useEffect(() => {
    setEmbeddedTicketForm((current) => {
      const nextTeam = current.team || ticketSettings.defaultTeam;
      const nextCategory =
        filteredCategories.find((category) => category.value === current.category)?.value ||
        getSuggestedCategoryForTeam(ticketSettings, nextTeam) ||
        ticketSettings.categories[0]?.value ||
        "";
      const nextModule =
        ticketSettings.modules.find((module) => module.value === current.module)?.value ||
        ticketSettings.modules[0]?.value ||
        "";
      const nextPriorityValue =
        ticketSettings.priorities.find((priority) => priority.value === current.priorityValue)?.value ||
        ticketSettings.defaultPriority;

      if (
        nextTeam === current.team &&
        nextCategory === current.category &&
        nextModule === current.module &&
        nextPriorityValue === current.priorityValue
      ) {
        return current;
      }

      return {
        ...current,
        team: nextTeam as "SUPORTE" | "DESENVOLVIMENTO",
        category: nextCategory,
        module: nextModule,
        priorityValue: nextPriorityValue,
      };
    });
  }, [filteredCategories, ticketSettings]);

  // Sync title and description from conversation context
  useEffect(() => {
    const contactLabel = effectiveContactName || companyName || "Novo ticket";
    const defaultTitle = ticketNumber
      ? `${contactLabel} - continuidade do atendimento`
      : `${contactLabel} - novo ticket`;
    const defaultDescription = buildChatwootTicketDescription({
      companyName,
      contactName: effectiveContactName,
      customerPhone,
      ticketNumber,
      hostId,
    });

    setEmbeddedTicketForm((current) => {
      const nextTitle = current.title.trim() ? current.title : defaultTitle;
      const nextDescription = current.description.trim() ? current.description : defaultDescription;
      if (nextTitle === current.title && nextDescription === current.description) return current;
      return { ...current, title: nextTitle, description: nextDescription };
    });
  }, [companyName, effectiveContactName, customerPhone, hostId, ticketNumber]);

  // Load tickets for active company
  useEffect(() => {
    if (!companyId) {
      setLatestTickets([]);
      setTicketError(null);
      return;
    }

    let active = true;

    async function loadTickets() {
      try {
        if (active) {
          setIsLoadingTickets(true);
          setTicketError(null);
        }

        const response = await trpc.tickets.list.query({
          companyId,
          page: "1",
          pageSize: "50",
          sortBy: "updatedAt",
          sortOrder: "desc",
        });

        if (!active) return;

        if (!response.success) {
          setLatestTickets([]);
          setTicketError(response.error || "Nao foi possivel carregar os tickets da empresa.");
          return;
        }

        const items = Array.isArray(response.data) ? toTicketListItems(response.data) : [];
        setLatestTickets(items.filter((ticket) => ticket.status !== "RESOLVED" && ticket.status !== "ARCHIVED"));
      } catch (error) {
        if (!active) return;
        setLatestTickets([]);
        setTicketError(error instanceof Error ? error.message : "Nao foi possivel carregar os tickets da empresa.");
      } finally {
        if (active) setIsLoadingTickets(false);
      }
    }

    void loadTickets();
    return () => {
      active = false;
    };
  }, [companyId, ticketReloadToken]);

  async function handleEmbeddedTicketSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canCreateTicket || isSubmittingEmbeddedTicket) return;

    const title = embeddedTicketForm.title.trim();
    const description = embeddedTicketForm.description.trim();
    if (!title || !description) {
      setEmbeddedTicketFeedback({
        tone: "error",
        message: "Preencha assunto e descricao para criar o ticket aqui no Chatwoot.",
      });
      return;
    }

    try {
      setIsSubmittingEmbeddedTicket(true);
      setEmbeddedTicketFeedback(null);

      const payload = {
        title,
        description,
        priority: resolveApiPriorityFromSettingValue(embeddedTicketForm.priorityValue),
        channel: "WHATSAPP",
        entryPoint: "INBOUND",
        companyId: companyId || undefined,
        category: embeddedTicketForm.category || undefined,
        module: embeddedTicketForm.module || undefined,
        team: embeddedTicketForm.team || undefined,
        customerEmail: undefined as string | undefined,
        externalThreadId: conversationId || undefined,
        contactPhoneSnapshot: customerPhone || undefined,
        contactWhatsappSnapshot: customerPhone || undefined,
        contactNameSnapshot: effectiveContactName || undefined,
        metadata: {
          source: "chatwoot",
          chatwootConversationId: conversationId || null,
          chatwootContactId: contactId || null,
          chatwootAccountId: accountId || null,
          createdFromPortalAt: new Date().toISOString(),
          chatwootAgentName: currentAgentName || null,
          hostId: hostId || null,
          ticketNumberFromConversation: ticketNumber || null,
        },
      };

      const response = await fetch("/api/tickets", {
        method: "POST",
        cache: "no-store",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const json = (await response.json().catch(() => null)) as {
        success?: boolean;
        message?: string;
        error?: string;
      } | null;

      if (!response.ok || !json?.success) {
        setEmbeddedTicketFeedback({
          tone: "error",
          message:
            response.status === 401
              ? "Faca login no portal neste navegador para criar tickets direto do Chatwoot."
              : json?.error || json?.message || "Nao foi possivel criar o ticket agora.",
        });
        return;
      }

      setEmbeddedTicketFeedback({
        tone: "success",
        message: "Ticket criado com sucesso. A lista abaixo sera atualizada com o novo atendimento.",
      });
      setShowEmbeddedTicketForm(false);
      setTicketReloadToken((current) => current + 1);
    } catch {
      setEmbeddedTicketFeedback({
        tone: "error",
        message: "Nao foi possivel criar o ticket agora.",
      });
    } finally {
      setIsSubmittingEmbeddedTicket(false);
    }
  }

  const matchedExistingTicket = useMemo(
    () => latestTickets.find((ticket) => ticket.number === ticketNumber) ?? null,
    [latestTickets, ticketNumber],
  );
  const hasExistingTicket = matchedExistingTicket != null;
  const existingTicket: TicketListEntry = matchedExistingTicket ?? EMPTY_TICKET;
  const hasLatestCompanyTicket = latestTickets.length > 0;
  const latestCompanyTicket: TicketListEntry = latestTickets[0] ?? EMPTY_TICKET;
  const priorityTicket = matchedExistingTicket ?? latestTickets[0] ?? null;

  return {
    latestTickets,
    isLoadingTickets,
    ticketError,
    ticketReloadToken,
    setTicketReloadToken,
    showEmbeddedTicketForm,
    setShowEmbeddedTicketForm,
    embeddedTicketForm,
    setEmbeddedTicketForm,
    isSubmittingEmbeddedTicket,
    embeddedTicketFeedback,
    setEmbeddedTicketFeedback,
    filteredCategories,
    matchedExistingTicket,
    hasExistingTicket,
    existingTicket,
    hasLatestCompanyTicket,
    latestCompanyTicket,
    priorityTicket,
    handleEmbeddedTicketSubmit,
  };
}
