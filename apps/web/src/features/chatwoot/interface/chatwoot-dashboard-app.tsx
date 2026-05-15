"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { Loader2, MessageSquare, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import {
  DEFAULT_TICKET_MODULE_SETTINGS,
} from "@dosc-syspro/contracts/ticket";
import type { CompanyOption } from "@dosc-syspro/contracts/company";
import type { ContactOption } from "@dosc-syspro/contracts/contact";
import { buildSearchText, includesNormalizedSearch } from "@dosc-syspro/shared";
import { requestRemoteSessionAction } from "@/features/remote/application/session-actions";
import type { RemoteConfiguredHostItem } from "@/features/remote/domain/remote-host.types";
import type { TicketListItem } from "@/features/tickets/domain/ticket-model";
import { Button, Tabs, TabsContent, TabsList, TabsTrigger } from "@dosc-syspro/ui";
import {
  getSuggestedCategoryForTeam,
  useTicketModuleSettings,
} from "@/features/tickets/interface/hooks/use-ticket-module-settings";
import { toTicketListItems } from "@/features/tickets/application/ticket-list.mapper";
import { trpc } from "@/lib/api/trpc-client";
import { ChatwootDashboardContext } from "./chatwoot-dashboard-context";
import { ChatwootOverviewTab } from "./tabs/chatwoot-overview-tab";
import { ChatwootTicketsTab } from "./tabs/chatwoot-tickets-tab";
import { ChatwootInfrastructureTab } from "./tabs/chatwoot-infrastructure-tab";
import type {
  ChatwootAppContext,
  ContactLookupEntry,
  EmbeddedTicketFormState,
  FeedbackState,
  RemoteHostEntry,
  TicketListEntry,
  TicketPriorityOption,
} from "./chatwoot-dashboard-types";
import { normalizeDigits, pickFirstValue, getCompanyLabel } from "./chatwoot-dashboard-ui";

// ──────────────────────────────────────────────────────
// Module-level utilities (no React dependency)
// ──────────────────────────────────────────────────────

function parseChatwootContext(raw: unknown): ChatwootAppContext | null {
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

function requestChatwootContext() {
  if (typeof window === "undefined") return;
  window.parent.postMessage("chatwoot-dashboard-app:fetch-info", "*");
}

function resolveApiPriorityFromSettingValue(value: string): TicketPriorityOption {
  const normalized = value.trim().toLowerCase();
  if (normalized.includes("critical")) return "CRITICAL";
  if (normalized.startsWith("3") || normalized.includes("high") || normalized.includes("alta")) return "HIGH";
  if (normalized.startsWith("1") || normalized.includes("low") || normalized.includes("baixa")) return "LOW";
  return "NORMAL";
}

function buildChatwootTicketDescription(input: {
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

// ──────────────────────────────────────────────────────
// Root component — state + effects + context provider
// ──────────────────────────────────────────────────────

export function ChatwootDashboardApp() {
  const ticketSettings = useTicketModuleSettings();

  // Core context
  const [context, setContext] = useState<ChatwootAppContext | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "empty">("loading");
  const [activeTab, setActiveTab] = useState("overview");

  // Tickets
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

  // Infrastructure
  const [companyHosts, setCompanyHosts] = useState<RemoteHostEntry[]>([]);
  const [isLoadingHosts, setIsLoadingHosts] = useState(false);
  const [hostError, setHostError] = useState<string | null>(null);
  const [hostReloadToken, setHostReloadToken] = useState(0);
  const [startingHostId, setStartingHostId] = useState<string | null>(null);
  const [isStartingSession, startSessionTransition] = useTransition();

  // Company / contact binding
  const [manualLinkedCompany, setManualLinkedCompany] = useState<CompanyOption | null>(null);
  const [companySearchTerm, setCompanySearchTerm] = useState("");
  const [companyOptions, setCompanyOptions] = useState<CompanyOption[]>([]);
  const [isLoadingCompanyOptions, setIsLoadingCompanyOptions] = useState(false);
  const [companyOptionsError, setCompanyOptionsError] = useState<string | null>(null);
  const [hasLoadedCompanyOptions, setHasLoadedCompanyOptions] = useState(false);
  const [selectedCompanyId, setSelectedCompanyId] = useState("");
  const [portalContactMatch, setPortalContactMatch] = useState<ContactLookupEntry | null>(null);
  const [isLoadingPortalContact, setIsLoadingPortalContact] = useState(false);
  const [contactLookupError, setContactLookupError] = useState<string | null>(null);
  const [isBindingCompany, setIsBindingCompany] = useState(false);
  const [companyBindingFeedback, setCompanyBindingFeedback] = useState<FeedbackState>(null);
  const [contactNameDraft, setContactNameDraft] = useState("");
  const [isSavingContactName, setIsSavingContactName] = useState(false);

  // ── Chatwoot postMessage listener ──────────────────

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

  // ── Derived context ─────────────────────────────────

  const resolved = useMemo(() => {
    const conversationAttributes = context?.conversation?.custom_attributes ?? {};
    const contactAttributes = context?.contact?.custom_attributes ?? {};

    const companyId = pickFirstValue(
      contactAttributes.syspro_company_id,
      conversationAttributes.syspro_company_id,
      conversationAttributes.company_id,
    );
    const companyName = pickFirstValue(
      contactAttributes.syspro_company_name,
      conversationAttributes.syspro_company_name,
      conversationAttributes.company_name,
    );
    const hostId = pickFirstValue(conversationAttributes.host_id);
    const rustdeskId = pickFirstValue(conversationAttributes.rustdesk_id);
    const ticketNumber = pickFirstValue(conversationAttributes.ticket_number);
    const contactName = pickFirstValue(context?.contact?.name, contactAttributes.syspro_contact_name);
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

  const canCreateTicket = Boolean(resolved.companyId);
  const canOpenInfrastructureHosts = Boolean(resolved.companyId);

  const matchedExistingTicket = useMemo(
    () => latestTickets.find((ticket) => ticket.number === resolved.ticketNumber) ?? null,
    [latestTickets, resolved.ticketNumber],
  );
  const hasExistingTicket = matchedExistingTicket != null;
  const existingTicket: TicketListEntry = matchedExistingTicket ?? {
    id: "",
    number: "-",
    title: "Sem titulo",
    status: "",
    statusLabel: "-",
    createdAt: "",
    updatedAt: "",
    customer: "",
  };
  const hasLatestCompanyTicket = latestTickets.length > 0;
  const latestCompanyTicket: TicketListEntry = latestTickets[0] ?? {
    id: "",
    number: "-",
    title: "Sem titulo",
    status: "",
    statusLabel: "-",
    createdAt: "",
    updatedAt: "",
    customer: "",
  };
  const priorityTicket = matchedExistingTicket ?? latestTickets[0] ?? null;
  const recommendedHost = companyHosts[0] ?? null;

  const filteredCompanyOptions = useMemo(() => {
    const q = companySearchTerm.trim();
    if (!q) return companyOptions.slice(0, 8);
    return companyOptions
      .filter((company) =>
        includesNormalizedSearch(buildSearchText([company.nomeFantasia, company.razaoSocial]), q),
      )
      .slice(0, 8);
  }, [companyOptions, companySearchTerm]);

  const selectedCompanyOption = useMemo(
    () => companyOptions.find((company) => company.id === selectedCompanyId) ?? null,
    [companyOptions, selectedCompanyId],
  );

  const trimmedCompanySearchTerm = companySearchTerm.trim();
  const shouldSearchCompanies = !resolved.companyId && trimmedCompanySearchTerm.length >= 2;

  const filteredCategories = useMemo(
    () => ticketSettings.categories.filter((category) => category.defaultTeam === embeddedTicketForm.team),
    [embeddedTicketForm.team, ticketSettings.categories],
  );

  const contactEditHref = portalContactMatch?.id ? `/portal/contatos/${portalContactMatch.id}/editar` : "";

  const linkedCompanies = useMemo(() => {
    const byId = new Map<string, NonNullable<ContactOption["companies"]>[number]>();
    for (const company of portalContactMatch?.companies ?? []) {
      if (company?.id) byId.set(company.id, company);
    }
    if (manualLinkedCompany?.id) {
      byId.set(manualLinkedCompany.id, {
        id: manualLinkedCompany.id,
        razaoSocial: manualLinkedCompany.razaoSocial,
        nomeFantasia: manualLinkedCompany.nomeFantasia ?? null,
      });
    }
    if (byId.size === 0 && resolved.companyId) {
      byId.set(resolved.companyId, {
        id: resolved.companyId,
        razaoSocial: resolved.companyName || resolved.companyId,
        nomeFantasia: resolved.companyName || null,
      });
    }
    return Array.from(byId.values());
  }, [manualLinkedCompany, portalContactMatch?.companies, resolved.companyId, resolved.companyName]);

  const primaryCompany = useMemo(
    () =>
      linkedCompanies.find((company) => company.id === resolved.companyId) ??
      (linkedCompanies.length === 1 ? linkedCompanies[0] ?? null : null),
    [linkedCompanies, resolved.companyId],
  );

  const effectiveContactName =
    contactNameDraft.trim() || portalContactMatch?.name || resolved.contactName || "Contato Chatwoot";

  // ── Auto tab selection ──────────────────────────────

  useEffect(() => {
    setActiveTab("overview");
    setManualLinkedCompany(null);
  }, [resolved.conversationId]);

  useEffect(() => {
    if (manualLinkedCompany?.id) return;
    if (resolved.companyId) return;
    if (linkedCompanies.length !== 1) return;

    const [onlyCompany] = linkedCompanies;
    setManualLinkedCompany({
      id: onlyCompany.id,
      razaoSocial: onlyCompany.razaoSocial,
      nomeFantasia: onlyCompany.nomeFantasia ?? null,
    });
  }, [linkedCompanies, manualLinkedCompany?.id, resolved.companyId]);

  // ── Sync ticket form fields from settings ──────────

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

  // ── Sync contact name draft ─────────────────────────

  useEffect(() => {
    setContactNameDraft((current) => {
      if (current.trim()) return current;
      return portalContactMatch?.name || resolved.contactName || "";
    });
  }, [portalContactMatch?.name, resolved.contactName]);

  // ── Sync ticket form title/description from context ─

  useEffect(() => {
    const contactLabel = effectiveContactName || resolved.companyName || "Novo ticket";
    const defaultTitle = resolved.ticketNumber
      ? `${contactLabel} - continuidade do atendimento`
      : `${contactLabel} - novo ticket`;
    const defaultDescription = buildChatwootTicketDescription({
      companyName: resolved.companyName,
      contactName: effectiveContactName,
      customerPhone: resolved.customerPhone,
      ticketNumber: resolved.ticketNumber,
      hostId: resolved.hostId,
    });

    setEmbeddedTicketForm((current) => {
      const nextTitle = current.title.trim() ? current.title : defaultTitle;
      const nextDescription = current.description.trim() ? current.description : defaultDescription;
      if (nextTitle === current.title && nextDescription === current.description) return current;
      return { ...current, title: nextTitle, description: nextDescription };
    });
  }, [
    resolved.companyName,
    effectiveContactName,
    resolved.customerPhone,
    resolved.hostId,
    resolved.ticketNumber,
  ]);

  // ── Load company options (lazy, once) ───────────────

  useEffect(() => {
    if (resolved.companyId) return;
    if (!shouldSearchCompanies) {
      setCompanyOptionsError(null);
      setIsLoadingCompanyOptions(false);
      return;
    }
    if (hasLoadedCompanyOptions) return;

    const controller = new AbortController();
    async function loadCompanyOptions() {
      try {
        setIsLoadingCompanyOptions(true);
        setCompanyOptionsError(null);
        const json = await trpc.companies.getOptions.query();
        setCompanyOptions(Array.isArray(json) ? json : []);
        setHasLoadedCompanyOptions(true);
      } catch (error) {
        if ((error as Error).name === "AbortError") return;
        setCompanyOptions([]);
        setCompanyOptionsError("Nao foi possivel buscar as empresas para vinculo.");
      } finally {
        setIsLoadingCompanyOptions(false);
      }
    }

    void loadCompanyOptions();
    return () => controller.abort();
  }, [hasLoadedCompanyOptions, resolved.companyId, shouldSearchCompanies]);

  // ── Portal contact lookup ───────────────────────────

  useEffect(() => {
    const phone = normalizeDigits(resolved.customerPhone);
    const email = resolved.customerEmail.trim().toLowerCase();
    const q = phone || email;
    if (!q) {
      setPortalContactMatch(null);
      setContactLookupError("Sem telefone ou e-mail para localizar o contato no portal.");
      return;
    }

    const controller = new AbortController();
    async function loadPortalContact() {
      try {
        setIsLoadingPortalContact(true);
        setContactLookupError(null);
        const result = await trpc.contacts.list.query({
          q,
          page: "1",
          pageSize: "10",
        });
        const entries = result.items as ContactLookupEntry[];
        const matched =
          entries.find((entry) => {
            const entryWhatsapp = normalizeDigits(String(entry.whatsapp || ""));
            const entryPhone = normalizeDigits(String(entry.phone || ""));
            const entryEmail = String(entry.email || "").trim().toLowerCase();
            return Boolean(
              (phone && (entryWhatsapp === phone || entryPhone === phone)) ||
                (email && entryEmail === email),
            );
          }) ?? null;
        setPortalContactMatch(matched as ContactLookupEntry | null);
      } catch (error) {
        if ((error as Error).name === "AbortError") return;
        setPortalContactMatch(null);
        setContactLookupError("Nao foi possivel verificar se o contato ja existe no portal.");
      } finally {
        setIsLoadingPortalContact(false);
      }
    }

    void loadPortalContact();
    return () => controller.abort();
  }, [resolved.customerEmail, resolved.customerPhone]);

  // ── Ticket list loader ──────────────────────────────

  useEffect(() => {
    if (!resolved.companyId) {
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
          companyId: resolved.companyId,
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
        if (active) {
          setIsLoadingTickets(false);
        }
      }
    }

    void loadTickets();
    return () => {
      active = false;
    };
  }, [resolved.companyId, ticketReloadToken]);

  // ── Host list loader ────────────────────────────────

  useEffect(() => {
    if (!resolved.companyId) {
      setCompanyHosts([]);
      setHostError(null);
      return;
    }

    let cancelled = false;
    async function loadHosts() {
      try {
        setIsLoadingHosts(true);
        setHostError(null);
        const json = await trpc.remote.directory.query();
        if (cancelled) return;
        const items: RemoteConfiguredHostItem[] = Array.isArray(json.items) ? json.items : [];
        const nextHosts = items
          .filter((item) => item.companyId === resolved.companyId)
          .map((item) => ({
            id: item.id,
            name: item.name.trim() || "Host sem nome",
            companyId: item.companyId,
            companyName: item.companyName,
            operationalStatus: item.operationalStatus,
            productStatus: item.productStatus,
            agent: {
              rustdeskId: item.agent.rustdeskId,
              lastHeartbeatAt: item.agent.lastHeartbeatAt,
            },
          }))
          .sort((a, b) => {
            const aHeartbeat = a.agent.lastHeartbeatAt ? Date.parse(a.agent.lastHeartbeatAt) : 0;
            const bHeartbeat = b.agent.lastHeartbeatAt ? Date.parse(b.agent.lastHeartbeatAt) : 0;
            return bHeartbeat - aHeartbeat;
          });
        setCompanyHosts(nextHosts);
      } catch {
        if (cancelled) return;
        setCompanyHosts([]);
        setHostError("Nao foi possivel carregar os hosts da empresa.");
      } finally {
        if (!cancelled) setIsLoadingHosts(false);
      }
    }

    void loadHosts();
    return () => { cancelled = true; };
  }, [resolved.companyId, hostReloadToken]);

  // ── Action handlers ─────────────────────────────────

  function handleStartHostSession(host: RemoteHostEntry) {
    const rustdeskId = host.agent.rustdeskId?.trim() || "";
    if (!rustdeskId) {
      toast.error("Host sem identificador remoto. Nao e possivel iniciar acesso.");
      return;
    }

    startSessionTransition(async () => {
      try {
        setStartingHostId(host.id);
        const result = await requestRemoteSessionAction({
          hostId: host.id,
          companyId: host.companyId,
          ticketNumber: resolved.ticketNumber || undefined,
          reason: resolved.ticketNumber
            ? `Acesso via Chatwoot para Ticket #${resolved.ticketNumber}`
            : "Acesso tecnico via Chatwoot",
        });

        if (!result.success) {
          toast.error(result.error ?? "Falha ao iniciar sessao auditada.");
          return;
        }

        toast.success("Sessao auditada iniciada.");
        window.location.href = `rustdesk://${rustdeskId}`;
      } catch {
        toast.error("Erro ao iniciar sessao remota.");
      } finally {
        setStartingHostId(null);
      }
    });
  }

  async function handleCopySummary() {
    const lines = [
      `Empresa: ${resolved.companyName || "Nao vinculada"}`,
      `Contato: ${effectiveContactName || "Nao identificado"}`,
      `Telefone: ${resolved.customerPhone || "Sem telefone"}`,
      `Ticket: ${priorityTicket ? `#${priorityTicket.number} - ${priorityTicket.title}` : "Sem ticket em contexto"}`,
      `Host recomendado: ${recommendedHost ? `${recommendedHost.name} (${recommendedHost.agent.rustdeskId || "sem RustDesk ID"})` : "Sem host em contexto"}`,
    ];

    try {
      await navigator.clipboard.writeText(lines.join("\n"));
      toast.success("Resumo do atendimento copiado.");
    } catch {
      toast.error("Nao foi possivel copiar o resumo do atendimento.");
    }
  }

  function handleSelectContextCompany(companyId: string) {
    const nextCompany = linkedCompanies.find((company) => company.id === companyId);
    if (!nextCompany) return;

    setManualLinkedCompany({
      id: nextCompany.id,
      razaoSocial: nextCompany.razaoSocial,
      nomeFantasia: nextCompany.nomeFantasia ?? null,
    });
    setTicketReloadToken((current) => current + 1);
    setHostReloadToken((current) => current + 1);
  }

  async function handleBindCompany() {
    if (!selectedCompanyOption || isBindingCompany || resolved.companyId) return;

    try {
      setIsBindingCompany(true);
      setCompanyBindingFeedback(null);

      let updatedContact: ContactLookupEntry | null = null;
      if (portalContactMatch?.id) {
        const result = await trpc.contacts.update.mutate({
          id: portalContactMatch.id,
          data: {
            companyIds: Array.from(
              new Set([...(portalContactMatch.companyIds ?? []), selectedCompanyOption.id]),
            ),
          },
        });
        updatedContact = result as unknown as ContactLookupEntry;
      } else {
        const result = await trpc.contacts.create.mutate({
          name: effectiveContactName,
          email: resolved.customerEmail || undefined,
          phone: resolved.customerPhone || undefined,
          whatsapp: resolved.customerPhone || undefined,
          notes: "Contato criado/vinculado pelo Dashboard App do Chatwoot.",
          companyIds: [selectedCompanyOption.id],
        });
        updatedContact = result as unknown as ContactLookupEntry;
      }

      setPortalContactMatch(updatedContact?.id ? updatedContact : portalContactMatch);
      setManualLinkedCompany(selectedCompanyOption);
      setCompanyBindingFeedback({
        tone: "success",
        message: `Contato vinculado a ${getCompanyLabel(selectedCompanyOption)}. Agora o painel ja pode abrir ticket e infraestrutura sem sair do Chatwoot.`,
      });
      requestChatwootContext();
      setTicketReloadToken((current) => current + 1);
      setHostReloadToken((current) => current + 1);
    } catch {
      setCompanyBindingFeedback({
        tone: "error",
        message: "Nao foi possivel vincular a empresa ao contato.",
      });
    } finally {
      setIsBindingCompany(false);
    }
  }

  async function handleSaveContactName() {
    const nextName = contactNameDraft.trim();
    if (!nextName || isSavingContactName || !portalContactMatch?.id) return;

    try {
      setIsSavingContactName(true);
      setCompanyBindingFeedback(null);
      const updated = await trpc.contacts.update.mutate({
        id: portalContactMatch.id,
        data: { name: nextName },
      });

      if (updated?.id) {
        setPortalContactMatch(updated as unknown as ContactLookupEntry);
      }
      setCompanyBindingFeedback({
        tone: "success",
        message: "Nome do contato atualizado no portal e sincronizado com o Chatwoot.",
      });
      requestChatwootContext();
    } catch {
      setCompanyBindingFeedback({
        tone: "error",
        message: "Nao foi possivel atualizar o nome do contato.",
      });
    } finally {
      setIsSavingContactName(false);
    }
  }

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
        companyId: resolved.companyId || undefined,
        category: embeddedTicketForm.category || undefined,
        module: embeddedTicketForm.module || undefined,
        team: embeddedTicketForm.team || undefined,
        customerEmail: resolved.customerEmail || undefined,
        externalThreadId: resolved.conversationId || undefined,
        contactPhoneSnapshot: resolved.customerPhone || undefined,
        contactWhatsappSnapshot: resolved.customerPhone || undefined,
        contactNameSnapshot: effectiveContactName || undefined,
        metadata: {
          source: "chatwoot",
          chatwootConversationId: resolved.conversationId || null,
          chatwootContactId: resolved.contactId || null,
          chatwootAccountId: resolved.accountId || null,
          createdFromPortalAt: new Date().toISOString(),
          chatwootAgentName: resolved.currentAgentName || null,
          hostId: resolved.hostId || null,
          ticketNumberFromConversation: resolved.ticketNumber || null,
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

  function requestRefresh() {
    setStatus("loading");
    requestChatwootContext();
    setTicketReloadToken((current) => current + 1);
    setHostReloadToken((current) => current + 1);
  }

  // ── Render ──────────────────────────────────────────

  return (
    <ChatwootDashboardContext.Provider
      value={{
        status,
        resolved,
        effectiveContactName,
        ticketSettings,
        latestTickets,
        isLoadingTickets,
        ticketError,
        showEmbeddedTicketForm,
        embeddedTicketForm,
        isSubmittingEmbeddedTicket,
        embeddedTicketFeedback,
        filteredCategories,
        matchedExistingTicket,
        hasExistingTicket,
        existingTicket,
        hasLatestCompanyTicket,
        latestCompanyTicket,
        priorityTicket,
        canCreateTicket,
        companyHosts,
        isLoadingHosts,
        hostError,
        startingHostId,
        isStartingSession,
        recommendedHost,
        canOpenInfrastructureHosts,
        portalContactMatch,
        isLoadingPortalContact,
        contactLookupError,
        contactNameDraft,
        isSavingContactName,
        companyOptions,
        isLoadingCompanyOptions,
        companyOptionsError,
        selectedCompanyId,
        selectedCompanyOption,
        filteredCompanyOptions,
        shouldSearchCompanies,
        companySearchTerm,
        isBindingCompany,
        companyBindingFeedback,
        primaryCompany,
        linkedCompanies,
        contextCompanyId: resolved.companyId,
        contactEditHref,
        setActiveTab,
        setTicketReloadToken,
        setHostReloadToken,
        setShowEmbeddedTicketForm,
        setEmbeddedTicketForm,
        setEmbeddedTicketFeedback,
        setContactNameDraft,
        setCompanySearchTerm,
        setSelectedCompanyId,
        setCompanyBindingFeedback,
        setStartingHostId,
        setStatus,
        handleSelectContextCompany,
        handleCopySummary,
        handleBindCompany,
        handleSaveContactName,
        handleEmbeddedTicketSubmit,
        handleStartHostSession,
        requestRefresh,
      }}
    >
      <div className="flex min-h-screen flex-col bg-[linear-gradient(180deg,rgba(59,130,246,0.05),transparent_28%),hsl(var(--background))] text-foreground">
        {/* App header — compact, no wrapping card */}
        <div className="border-b border-border/60 bg-background/85 backdrop-blur">
          <div className="space-y-3 px-3 py-3">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <div className="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <MessageSquare className="h-4 w-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-foreground">Painel do Atendimento</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {resolved.companyName || (linkedCompanies.length > 1 ? "Selecionar empresa em contexto" : "Sem empresa em contexto")}
                      {resolved.contactName ? ` - ${resolved.contactName}` : ""}
                    </p>
                  </div>
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-1.5">
                {status === "loading" ? <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" /> : null}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-8 gap-1.5 px-2.5 text-xs"
                  onClick={requestRefresh}
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                  Atualizar
                </Button>
                {contactEditHref ? (
                  <Button asChild variant="ghost" size="sm" className="h-8 px-2.5 text-xs">
                    <Link href={contactEditHref} target="_blank" rel="noreferrer">
                      Contato
                    </Link>
                  </Button>
                ) : null}
              </div>
            </div>

            {linkedCompanies.length > 0 ? (
              <div className="rounded-2xl border border-border/60 bg-card px-3 py-3">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                      Empresa em contexto
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {linkedCompanies.length > 1
                        ? "A selecao abaixo altera tickets, infraestrutura e os detalhes exibidos nas abas."
                        : "O contexto abaixo guia tickets, infraestrutura e os detalhes exibidos nas abas."}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {linkedCompanies.map((company) => {
                      const isActive = company.id === resolved.companyId;

                      return (
                        <button
                          key={company.id}
                          type="button"
                          onClick={() => handleSelectContextCompany(company.id)}
                          className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
                            isActive
                              ? "border-primary/40 bg-primary/10 text-primary"
                              : "border-border/60 bg-background text-muted-foreground hover:bg-muted/40 hover:text-foreground"
                          }`}
                        >
                          {getCompanyLabel(company)}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        </div>

        {/* Empty state banner */}
        {status === "empty" ? (
          <div className="mx-3 mt-3 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-700 dark:text-amber-300">
            O Chatwoot ainda nao enviou o contexto desta conversa. Reabra a aba ou confirme se o Dashboard App esta configurado neste endpoint.
          </div>
        ) : null}

        {/* Tab navigation + content */}
        <div className="flex-1 px-3 py-3">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid h-auto w-full grid-cols-3 rounded-2xl border border-border/60 bg-card p-1">
              <TabsTrigger value="overview" className="rounded-xl py-2 text-xs">
                Visao geral
              </TabsTrigger>
              <TabsTrigger value="tickets" className="gap-1.5 rounded-xl py-2 text-xs">
                Tickets
                {latestTickets.length > 0 ? (
                  <span className="rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] leading-none text-primary">
                    {latestTickets.length}
                  </span>
                ) : null}
              </TabsTrigger>
              <TabsTrigger value="infrastructure" className="gap-1.5 rounded-xl py-2 text-xs">
                Infra
                {companyHosts.length > 0 ? (
                  <span className="rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] leading-none text-primary">
                    {companyHosts.length}
                  </span>
                ) : null}
              </TabsTrigger>
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
          </Tabs>
        </div>
      </div>
    </ChatwootDashboardContext.Provider>
  );
}
