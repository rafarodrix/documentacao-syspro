"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import type { CompanyOption } from "@dosc-syspro/contracts/company";
import {
  cleanChatwootDisplayName,
  splitChatwootContactDisplayName,
} from "@dosc-syspro/shared/chatwoot-contact-presentation";
import { useTicketModuleSettings } from "@/features/tickets/interface/hooks/use-ticket-module-settings";
import { Button, Tabs, TabsContent, TabsList, TabsTrigger } from "@dosc-syspro/ui";
import { ChatwootDashboardContext } from "./chatwoot-dashboard-context";
import { ChatwootOverviewTab } from "./tabs/chatwoot-overview-tab";
import { ChatwootTicketsTab } from "./tabs/chatwoot-tickets-tab";
import { ChatwootInfrastructureTab } from "./tabs/chatwoot-infrastructure-tab";
import { ChatwootTarefasTab } from "./tabs/chatwoot-tarefas-tab";
import type { ChatwootAppContext } from "./chatwoot-dashboard-types";
import { pickFirstValue } from "./chatwoot-dashboard-ui";
import { buildChatwootTicketDescription, parseChatwootContext, requestChatwootContext } from "./chatwoot-dashboard-app.helpers";
import { useChatwootTickets } from "./hooks/use-chatwoot-tickets";
import { useChatwootHosts } from "./hooks/use-chatwoot-hosts";
import { useChatwootContactBinding } from "./hooks/use-chatwoot-contact-binding";
import { useChatwootTarefasCount } from "./hooks/use-chatwoot-tarefas-count";
import { ChatwootAppHeader } from "./components/chatwoot-app-header";

export function ChatwootDashboardApp() {
  const ticketSettings = useTicketModuleSettings();

  // Core Chatwoot state
  const [context, setContext] = useState<ChatwootAppContext | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "empty">("loading");
  const [activeTab, setActiveTab] = useState("overview");
  const [manualLinkedCompany, setManualLinkedCompany] = useState<CompanyOption | null>(null);

  // Chatwoot postMessage listener
  useEffect(() => {
    function handleMessage(event: MessageEvent) {
      const next = parseChatwootContext(event.data);
      if (!next || (!next.conversation && !next.contact)) return;
      setContext(next);
      setStatus("ready");
    }

    window.addEventListener("message", handleMessage);
    requestChatwootContext();
    const retryHandle = window.setTimeout(() => {
      requestChatwootContext();
      setStatus((current) => (current === "loading" ? "empty" : current));
    }, 1200);

    return () => {
      window.clearTimeout(retryHandle);
      window.removeEventListener("message", handleMessage);
    };
  }, []);

  // Derived context from raw Chatwoot data + manual company override
  const resolved = useMemo(() => {
    const conversationAttributes = context?.conversation?.custom_attributes ?? {};
    const contactAttributes = context?.contact?.custom_attributes ?? {};
    const rawChatwootContactName = pickFirstValue(context?.contact?.name);
    const chatwootDisplayNameParts = splitChatwootContactDisplayName(rawChatwootContactName);

    const companyId = pickFirstValue(
      contactAttributes.syspro_company_id,
      contactAttributes.syspro_primary_company_id,
      conversationAttributes.syspro_company_id,
      conversationAttributes.syspro_primary_company_id,
      conversationAttributes.company_id,
    );
    const companyName = pickFirstValue(
      contactAttributes.syspro_primary_company_name,
      contactAttributes.syspro_company_name,
      conversationAttributes.syspro_primary_company_name,
      conversationAttributes.syspro_company_name,
      conversationAttributes.company_name,
      chatwootDisplayNameParts.companyName,
    );
    const hostId = pickFirstValue(conversationAttributes.host_id);
    const rustdeskId = pickFirstValue(conversationAttributes.rustdesk_id);
    const ticketNumber = pickFirstValue(conversationAttributes.ticket_number);
    const contactName = pickFirstValue(
      contactAttributes.syspro_contact_name,
      conversationAttributes.syspro_contact_name,
      chatwootDisplayNameParts.contactName,
      cleanChatwootDisplayName(rawChatwootContactName),
    );
    const customerEmail = pickFirstValue(context?.contact?.email);
    const customerPhone = pickFirstValue(context?.contact?.phone_number);
    const conversationId = pickFirstValue(context?.conversation?.id);
    const accountId = pickFirstValue(context?.conversation?.account_id);
    const contactId = pickFirstValue(context?.contact?.id);
    const effectiveCompanyId = manualLinkedCompany?.id || companyId || "";
    const effectiveCompanyName =
      manualLinkedCompany?.nomeFantasia || manualLinkedCompany?.razaoSocial || companyName || "";

    const ticketParams = new URLSearchParams({
      source: "chatwoot",
      chatwootConversationId: conversationId,
      chatwootContactId: contactId,
      chatwootAccountId: accountId,
      customerName: contactName,
      customerPhone,
      customerWhatsapp: customerPhone,
      customerEmail,
      subject: contactName ? `${contactName} - Novo ticket` : "Novo ticket",
      description: buildChatwootTicketDescription({
        companyName: effectiveCompanyName,
        contactName,
        customerPhone,
        ticketNumber,
        hostId,
      }),
    });
    if (effectiveCompanyId) ticketParams.set("companyId", effectiveCompanyId);

    const remoteDirectoryParams = new URLSearchParams();
    if (effectiveCompanyId) remoteDirectoryParams.set("companyId", effectiveCompanyId);
    if (ticketNumber) remoteDirectoryParams.set("ticketNumber", ticketNumber);

    return {
      companyId: effectiveCompanyId,
      companyName: effectiveCompanyName,
      hostId,
      rustdeskId,
      ticketNumber,
      contactName,
      customerEmail,
      customerPhone,
      conversationId,
      contactId,
      accountId,
      currentAgentName: pickFirstValue(context?.currentAgent?.name),
      ticketHref: `/portal/tickets/novo?${ticketParams.toString()}`,
      infrastructureHostsHref: remoteDirectoryParams.toString()
        ? `/portal/infraestrutura?tab=hosts&${remoteDirectoryParams.toString()}`
        : "/portal/infraestrutura?tab=hosts",
    };
  }, [context, manualLinkedCompany]);

  // Reset tab and manual company when conversation changes
  useEffect(() => {
    setActiveTab("overview");
    setManualLinkedCompany(null);
  }, [resolved.conversationId]);

  const canCreateTicket = Boolean(resolved.companyId);
  const canOpenInfrastructureHosts = Boolean(resolved.companyId);

  // Ref used to wire onBindSuccess → ticket/host reloads without forward-referencing hooks
  const bumpReloadTokensRef = useRef<() => void>(() => {});

  // Domain hooks
  const contactBinding = useChatwootContactBinding({
    customerPhone: resolved.customerPhone,
    customerEmail: resolved.customerEmail,
    conversationId: resolved.conversationId,
    accountId: resolved.accountId,
    chatwootContactId: resolved.contactId,
    companyId: resolved.companyId,
    companyName: resolved.companyName,
    contactName: resolved.contactName,
    manualLinkedCompany,
    setManualLinkedCompany,
    onBindSuccess: () => {
      requestChatwootContext();
      bumpReloadTokensRef.current();
    },
  });

  // effectiveContactName is computed inside contactBinding from contactNameDraft + portalContactMatch + contactName
  const { effectiveContactName } = contactBinding;

  const tickets = useChatwootTickets({
    companyId: resolved.companyId,
    ticketNumber: resolved.ticketNumber,
    effectiveContactName,
    companyName: resolved.companyName,
    customerPhone: resolved.customerPhone,
    hostId: resolved.hostId,
    conversationId: resolved.conversationId,
    contactId: resolved.contactId,
    accountId: resolved.accountId,
    currentAgentName: resolved.currentAgentName,
    ticketSettings,
    canCreateTicket,
  });

  const hosts = useChatwootHosts({
    companyId: resolved.companyId,
    ticketNumber: resolved.ticketNumber,
  });

  const { tarefasCount } = useChatwootTarefasCount({ companyId: resolved.companyId });

  // Keep the ref current so onBindSuccess can trigger reloads after tickets/hosts are initialized
  bumpReloadTokensRef.current = () => {
    tickets.setTicketReloadToken((t) => t + 1);
    hosts.setHostReloadToken((h) => h + 1);
  };
  const canOpenTarefas = Boolean(resolved.companyId);

  // Guard: redirect away from tarefas tab when it becomes unavailable
  useEffect(() => {
    if (activeTab !== "tarefas") return;
    if (canOpenTarefas) return;
    setActiveTab("overview");
  }, [activeTab, canOpenTarefas]);

  function handleSelectContextCompany(companyId: string) {
    const nextCompany = contactBinding.linkedCompanies.find((company) => company.id === companyId);
    if (!nextCompany) return;
    setManualLinkedCompany({
      id: nextCompany.id,
      razaoSocial: nextCompany.razaoSocial,
      nomeFantasia: nextCompany.nomeFantasia ?? null,
    });
    tickets.setTicketReloadToken((current) => current + 1);
    hosts.setHostReloadToken((current) => current + 1);
  }

  async function handleCopySummary() {
    const lines = [
      `Empresa: ${resolved.companyName || "Nao vinculada"}`,
      `Contato: ${effectiveContactName || "Nao identificado"}`,
      `Telefone: ${resolved.customerPhone || "Sem telefone"}`,
      `Ticket: ${tickets.priorityTicket ? `#${tickets.priorityTicket.number} - ${tickets.priorityTicket.title}` : "Sem ticket em contexto"}`,
      `Host recomendado: ${hosts.recommendedHost ? `${hosts.recommendedHost.name} (${hosts.recommendedHost.agent.rustdeskId || "sem RustDesk ID"})` : "Sem host em contexto"}`,
    ];
    try {
      await navigator.clipboard.writeText(lines.join("\n"));
      toast.success("Resumo do atendimento copiado.");
    } catch {
      toast.error("Nao foi possivel copiar o resumo do atendimento.");
    }
  }

  function requestRefresh() {
    setStatus("loading");
    requestChatwootContext();
    tickets.setTicketReloadToken((current) => current + 1);
    hosts.setHostReloadToken((current) => current + 1);
  }

  return (
    <ChatwootDashboardContext.Provider
      value={{
        status,
        resolved,
        effectiveContactName,
        ticketSettings,
        latestTickets: tickets.latestTickets,
        isLoadingTickets: tickets.isLoadingTickets,
        ticketError: tickets.ticketError,
        showEmbeddedTicketForm: tickets.showEmbeddedTicketForm,
        embeddedTicketForm: tickets.embeddedTicketForm,
        isSubmittingEmbeddedTicket: tickets.isSubmittingEmbeddedTicket,
        embeddedTicketFeedback: tickets.embeddedTicketFeedback,
        filteredCategories: tickets.filteredCategories,
        matchedExistingTicket: tickets.matchedExistingTicket,
        hasExistingTicket: tickets.hasExistingTicket,
        existingTicket: tickets.existingTicket,
        hasLatestCompanyTicket: tickets.hasLatestCompanyTicket,
        latestCompanyTicket: tickets.latestCompanyTicket,
        priorityTicket: tickets.priorityTicket,
        canCreateTicket,
        companyHosts: hosts.companyHosts,
        isLoadingHosts: hosts.isLoadingHosts,
        hostError: hosts.hostError,
        startingHostId: hosts.startingHostId,
        isStartingSession: hosts.isStartingSession,
        recommendedHost: hosts.recommendedHost,
        canOpenInfrastructureHosts,
        portalContactMatch: contactBinding.portalContactMatch,
        isLoadingPortalContact: contactBinding.isLoadingPortalContact,
        contactLookupError: contactBinding.contactLookupError,
        contactNameDraft: contactBinding.contactNameDraft,
        isSavingContactName: contactBinding.isSavingContactName,
        companyOptions: contactBinding.companyOptions,
        isLoadingCompanyOptions: contactBinding.isLoadingCompanyOptions,
        companyOptionsError: contactBinding.companyOptionsError,
        selectedCompanyId: contactBinding.selectedCompanyId,
        selectedCompanyOption: contactBinding.selectedCompanyOption,
        filteredCompanyOptions: contactBinding.filteredCompanyOptions,
        shouldSearchCompanies: contactBinding.shouldSearchCompanies,
        companySearchTerm: contactBinding.companySearchTerm,
        isBindingCompany: contactBinding.isBindingCompany,
        companyBindingFeedback: contactBinding.companyBindingFeedback,
        primaryCompany: contactBinding.primaryCompany,
        linkedCompanies: contactBinding.linkedCompanies,
        contextCompanyId: resolved.companyId,
        contactEditHref: contactBinding.contactEditHref,
        setActiveTab,
        setTicketReloadToken: tickets.setTicketReloadToken,
        setHostReloadToken: hosts.setHostReloadToken,
        setShowEmbeddedTicketForm: tickets.setShowEmbeddedTicketForm,
        setEmbeddedTicketForm: tickets.setEmbeddedTicketForm,
        setEmbeddedTicketFeedback: tickets.setEmbeddedTicketFeedback,
        setContactNameDraft: contactBinding.setContactNameDraft,
        setCompanySearchTerm: contactBinding.setCompanySearchTerm,
        setSelectedCompanyId: contactBinding.setSelectedCompanyId,
        setCompanyBindingFeedback: contactBinding.setCompanyBindingFeedback,
        setStartingHostId: hosts.setStartingHostId,
        setStatus,
        handleSelectContextCompany,
        handleCopySummary,
        handleBindCompany: contactBinding.handleBindCompany,
        handleSaveContactName: contactBinding.handleSaveContactName,
        handleEmbeddedTicketSubmit: tickets.handleEmbeddedTicketSubmit,
        handleStartHostSession: hosts.handleStartHostSession,
        requestRefresh,
      }}
    >
      <div className="flex min-h-screen flex-col bg-background text-foreground">
        <ChatwootAppHeader />

        {status === "empty" ? (
          <div className="mx-3 mt-3 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-700 dark:text-amber-300"> {/* ds-allow */}
            O Chatwoot ainda nao enviou o contexto desta conversa. Reabra a aba ou confirme se o Dashboard App esta configurado neste endpoint.
          </div>
        ) : null}

        <div className="flex-1 px-3 py-3">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className={`grid h-auto w-full ${canOpenTarefas ? "grid-cols-4" : "grid-cols-3"} rounded-2xl border border-border/60 bg-card p-1`}>
              <TabsTrigger value="overview" className="rounded-xl py-2 text-xs">Visao geral</TabsTrigger>
              <TabsTrigger value="tickets" className="gap-1.5 rounded-xl py-2 text-xs">
                Tickets
                {tickets.latestTickets.length > 0 ? (
                  <span className="rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] leading-none text-primary">
                    {tickets.latestTickets.length}
                  </span>
                ) : null}
              </TabsTrigger>
              <TabsTrigger value="infrastructure" className="gap-1.5 rounded-xl py-2 text-xs">
                Infra
                {hosts.companyHosts.length > 0 ? (
                  <span className="rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] leading-none text-primary">
                    {hosts.companyHosts.length}
                  </span>
                ) : null}
              </TabsTrigger>
              {canOpenTarefas ? (
                <TabsTrigger value="tarefas" className="rounded-xl py-2 text-xs">
                  Tarefas
                  <span className="ml-1 rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] leading-none text-primary">
                    {tarefasCount}
                  </span>
                </TabsTrigger>
              ) : null}
            </TabsList>

            <TabsContent value="overview" className="mt-3 space-y-3">
              <ChatwootOverviewTab />
            </TabsContent>
            <TabsContent value="tickets" className="mt-3 space-y-3">
              <ChatwootTicketsTab />
            </TabsContent>
            <TabsContent value="infrastructure" className="mt-3 space-y-3">
              <ChatwootInfrastructureTab />
            </TabsContent>
            {canOpenTarefas ? (
              <TabsContent value="tarefas" className="mt-3 space-y-3">
                <ChatwootTarefasTab />
              </TabsContent>
            ) : null}
          </Tabs>
        </div>
      </div>
    </ChatwootDashboardContext.Provider>
  );
}
