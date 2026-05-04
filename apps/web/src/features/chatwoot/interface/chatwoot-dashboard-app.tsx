"use client";

import { useEffect, useMemo, useState, useTransition, type ReactNode } from "react";
import Link from "next/link";
import {
  ArrowUpRight,
  Building2,
  Clock3,
  Headphones,
  Loader2,
  MessageSquare,
  Monitor,
  Ticket,
  Waypoints,
} from "lucide-react";
import { toast } from "sonner";
import {
  DEFAULT_TICKET_MODULE_SETTINGS,
  type TicketModuleSettings,
  type TicketModuleListResponse,
} from "@dosc-syspro/contracts/ticket";
import type { CompanyOption } from "@dosc-syspro/contracts/company";
import type { ContactOption } from "@dosc-syspro/contracts/contact";
import { buildSearchText, includesNormalizedSearch } from "@dosc-syspro/shared";
import { requestRemoteSessionAction } from "@/features/remote/application/session-actions";
import type { RemotePlatformDirectory } from "@/features/remote/domain/remote-host.types";
import type { TicketListItem } from "@/features/tickets/domain/ticket-model";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { TicketModuleCascadeSelect } from "@/features/tickets/interface/components/ticket-module-cascade-select";
import {
  getSuggestedCategoryForTeam,
  useTicketModuleSettings,
} from "@/features/tickets/interface/hooks/use-ticket-module-settings";
import { toTicketListItems } from "@/features/tickets/application/ticket-list.mapper";
import { cn } from "@/lib/utils";

type ChatwootAppContext = {
  conversation: {
    id?: number | string | null;
    account_id?: number | string | null;
    status?: string | null;
    custom_attributes?: Record<string, unknown> | null;
  } | null;
  contact: {
    id?: number | string | null;
    name?: string | null;
    email?: string | null;
    phone_number?: string | null;
    custom_attributes?: Record<string, unknown> | null;
  } | null;
  currentAgent: {
    id?: number | string | null;
    name?: string | null;
    email?: string | null;
  } | null;
};

type TicketListEntry = Pick<
  TicketListItem,
  "id" | "number" | "title" | "status" | "statusLabel" | "createdAt" | "updatedAt" | "customer"
>;

type RemoteHostDirectoryItem = RemotePlatformDirectory["items"][number];

type RemoteHostEntry = Pick<
  RemoteHostDirectoryItem,
  "id" | "name" | "productStatus" | "companyId" | "companyName"
> & {
  agent: Pick<RemoteHostDirectoryItem["agent"], "rustdeskId" | "lastHeartbeatAt">;
};

type ContactLookupEntry = ContactOption;
type ContactCompanyEntry = NonNullable<ContactLookupEntry["companies"]>[number];

type TicketPriorityOption = "LOW" | "NORMAL" | "HIGH" | "CRITICAL";

type EmbeddedTicketFormState = {
  title: string;
  description: string;
  priorityValue: string;
  team: "SUPORTE" | "DESENVOLVIMENTO";
  category: string;
  module: string;
};

function readString(value: unknown) {
  return String(value ?? "").trim();
}

function pickFirstValue(...values: unknown[]) {
  for (const value of values) {
    const normalized = readString(value);
    if (normalized) return normalized;
  }
  return "";
}

function normalizeDigits(value: string) {
  return value.replace(/\D/g, "");
}

function getCompanyLabel(
  company:
    | Pick<CompanyOption, "razaoSocial" | "nomeFantasia">
    | {
        razaoSocial: string;
        nomeFantasia?: string | null;
      }
    | null
    | undefined,
) {
  return company?.nomeFantasia?.trim() || company?.razaoSocial?.trim() || "Empresa sem nome";
}

function formatCompanyServerType(value?: ContactCompanyEntry["serverType"] | null) {
  return value === "IIS" ? "IIS / ISAPI" : value === "SYSPRO_SERVER" ? "Syspro Server" : "Nao informado";
}

function formatCompanyEndpoint(company: ContactCompanyEntry) {
  const host = readString(company.serverHost);
  if (!host) return "Nao informado";
  const protocol = readString(company.serverProtocol).toLowerCase() || "http";
  const port = typeof company.serverPort === "number" ? `:${company.serverPort}` : "";
  return `${protocol}://${host}${port}`;
}

function formatRemoteConnectionType(value?: string | null) {
  if (value === "DDNS_NOIP") return "DDNS / No-IP";
  if (value === "RADMIN_VPN") return "Radmin VPN";
  return "Conexao remota";
}

function hasOperationalSettings(company: ContactCompanyEntry) {
  return Boolean(
    company.serverType ||
    company.serverHost ||
    company.installationDirectory ||
    company.iisIsapiPath ||
    (Array.isArray(company.remoteConnections) && company.remoteConnections.length > 0),
  );
}

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
    conversation: data.conversation && typeof data.conversation === "object"
      ? (data.conversation as ChatwootAppContext["conversation"])
      : null,
    contact: data.contact && typeof data.contact === "object"
      ? (data.contact as ChatwootAppContext["contact"])
      : null,
    currentAgent: data.currentAgent && typeof data.currentAgent === "object"
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

export function ChatwootDashboardApp() {
  const ticketSettings = useTicketModuleSettings();
  const [context, setContext] = useState<ChatwootAppContext | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "empty">("loading");
  const [activeTab, setActiveTab] = useState("overview");
  const [latestTickets, setLatestTickets] = useState<TicketListEntry[]>([]);
  const [isLoadingTickets, setIsLoadingTickets] = useState(false);
  const [ticketError, setTicketError] = useState<string | null>(null);
  const [companyHosts, setCompanyHosts] = useState<RemoteHostEntry[]>([]);
  const [isLoadingHosts, setIsLoadingHosts] = useState(false);
  const [hostError, setHostError] = useState<string | null>(null);
  const [startingHostId, setStartingHostId] = useState<string | null>(null);
  const [isStartingSession, startSessionTransition] = useTransition();
  const [showEmbeddedTicketForm, setShowEmbeddedTicketForm] = useState(false);
  const [embeddedTicketForm, setEmbeddedTicketForm] = useState<EmbeddedTicketFormState>({
    title: "",
    description: "",
    priorityValue: DEFAULT_TICKET_MODULE_SETTINGS.defaultPriority,
    team: DEFAULT_TICKET_MODULE_SETTINGS.defaultTeam,
    category: getSuggestedCategoryForTeam(
      DEFAULT_TICKET_MODULE_SETTINGS,
      DEFAULT_TICKET_MODULE_SETTINGS.defaultTeam,
    ) || DEFAULT_TICKET_MODULE_SETTINGS.categories[0]?.value || "",
    module: DEFAULT_TICKET_MODULE_SETTINGS.modules[0]?.value || "",
  });
  const [isSubmittingEmbeddedTicket, setIsSubmittingEmbeddedTicket] = useState(false);
  const [embeddedTicketFeedback, setEmbeddedTicketFeedback] = useState<{
    tone: "success" | "error";
    message: string;
  } | null>(null);
  const [ticketReloadToken, setTicketReloadToken] = useState(0);
  const [hostReloadToken, setHostReloadToken] = useState(0);
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
  const [companyBindingFeedback, setCompanyBindingFeedback] = useState<{
    tone: "success" | "error";
    message: string;
  } | null>(null);
  const [contactNameDraft, setContactNameDraft] = useState("");
  const [isSavingContactName, setIsSavingContactName] = useState(false);
  const [hasAutoSelectedTab, setHasAutoSelectedTab] = useState(false);

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
    const effectiveCompanyId = companyId || manualLinkedCompany?.id || "";
    const effectiveCompanyName = companyName || manualLinkedCompany?.nomeFantasia || manualLinkedCompany?.razaoSocial || "";

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
      description: "Atendimento originado no Chatwoot.",
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
  const initialSuggestedTab = useMemo(() => {
    if (!resolved.companyId) return "overview";
    if (matchedExistingTicket) return "tickets";
    if (companyHosts.length > 0) return "infrastructure";
    return "tickets";
  }, [companyHosts.length, matchedExistingTicket, resolved.companyId]);
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
    const byId = new Map<string, ContactCompanyEntry>();
    for (const company of portalContactMatch?.companies ?? []) {
      if (company?.id) {
        byId.set(company.id, company);
      }
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
      linkedCompanies[0] ??
      null,
    [linkedCompanies, resolved.companyId],
  );
  const additionalLinkedCompanies = useMemo(
    () => linkedCompanies.filter((company) => company.id !== primaryCompany?.id),
    [linkedCompanies, primaryCompany?.id],
  );
  const effectiveContactName = contactNameDraft.trim() || portalContactMatch?.name || resolved.contactName || "Contato Chatwoot";
  const orderedLinkedCompanies = useMemo(
    () => (primaryCompany ? [primaryCompany, ...additionalLinkedCompanies] : []),
    [additionalLinkedCompanies, primaryCompany],
  );

  useEffect(() => {
    setHasAutoSelectedTab(false);
  }, [resolved.conversationId]);

  useEffect(() => {
    if (status !== "ready" || hasAutoSelectedTab) return;
    if (!resolved.companyId) {
      setActiveTab("overview");
      setHasAutoSelectedTab(true);
      return;
    }

    setActiveTab(initialSuggestedTab);
    setHasAutoSelectedTab(true);
  }, [hasAutoSelectedTab, initialSuggestedTab, resolved.companyId, status]);

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

  useEffect(() => {
    setContactNameDraft((current) => {
      if (current.trim()) return current;
      return portalContactMatch?.name || resolved.contactName || "";
    });
  }, [portalContactMatch?.name, resolved.contactName]);

  useEffect(() => {
    const contactLabel = effectiveContactName || resolved.companyName || "Novo ticket";
    const defaultTitle = resolved.ticketNumber
      ? `${contactLabel} - continuidade do atendimento`
      : `${contactLabel} - novo ticket`;
    const defaultDescription = [
      "Atendimento originado no Chatwoot.",
      resolved.companyName ? `Empresa: ${resolved.companyName}` : "",
      effectiveContactName ? `Contato: ${effectiveContactName}` : "",
      resolved.customerPhone ? `Telefone: ${resolved.customerPhone}` : "",
      resolved.ticketNumber ? `Ticket referenciado na conversa: #${resolved.ticketNumber}` : "",
      resolved.hostId ? `Host em contexto: ${resolved.hostId}` : "",
      "",
    ]
      .filter(Boolean)
      .join("\n");

    setEmbeddedTicketForm((current) => {
      const nextTitle = current.title.trim() ? current.title : defaultTitle;
      const nextDescription = current.description.trim() ? current.description : defaultDescription;
      if (nextTitle === current.title && nextDescription === current.description) {
        return current;
      }
      return {
        ...current,
        title: nextTitle,
        description: nextDescription,
      };
    });
  }, [
    resolved.companyName,
    effectiveContactName,
    resolved.customerPhone,
    resolved.hostId,
    resolved.ticketNumber,
  ]);

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
        const response = await fetch("/api/companies/options", {
          method: "GET",
          cache: "no-store",
          signal: controller.signal,
        });
        if (!response.ok) {
          setCompanyOptions([]);
          setCompanyOptionsError(
            response.status === 401
              ? "Faca login no portal neste navegador para buscar empresas."
              : "Nao foi possivel buscar as empresas para vinculo.",
          );
          return;
        }
        const json = (await response.json()) as CompanyOption[];
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
        const params = new URLSearchParams({
          q,
          limit: "10",
        });
        const response = await fetch(`/api/contacts?${params.toString()}`, {
          method: "GET",
          cache: "no-store",
          signal: controller.signal,
        });
        if (!response.ok) {
          setPortalContactMatch(null);
          setContactLookupError(
            response.status === 401
              ? "Faca login no portal neste navegador para localizar contatos do cadastro."
              : "Nao foi possivel verificar se o contato ja existe no portal.",
          );
          return;
        }
        const json = (await response.json()) as ContactLookupEntry[];
        const entries = Array.isArray(json) ? json : [];
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
        setPortalContactMatch(matched);
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

  async function handleBindCompany() {
    if (!selectedCompanyOption || isBindingCompany || resolved.companyId) return;

    try {
      setIsBindingCompany(true);
      setCompanyBindingFeedback(null);

      let response: Response;
      if (portalContactMatch?.id) {
        response = await fetch(`/api/contacts/${portalContactMatch.id}`, {
          method: "PATCH",
          cache: "no-store",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            companyIds: Array.from(
              new Set([...(portalContactMatch.companyIds ?? []), selectedCompanyOption.id]),
            ),
          }),
        });
      } else {
        response = await fetch("/api/contacts", {
          method: "POST",
          cache: "no-store",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: effectiveContactName,
            email: resolved.customerEmail || undefined,
            phone: resolved.customerPhone || undefined,
            whatsapp: resolved.customerPhone || undefined,
            notes: "Contato criado/vinculado pelo Dashboard App do Chatwoot.",
            companyIds: [selectedCompanyOption.id],
          }),
        });
      }

      const json = (await response.json().catch(() => null)) as
        | (ContactLookupEntry & { message?: string; error?: string })
        | null;
      if (!response.ok) {
        setCompanyBindingFeedback({
          tone: "error",
          message:
            json?.error ||
            json?.message ||
            (response.status === 401
              ? "Faca login no portal neste navegador para vincular o contato."
              : "Nao foi possivel vincular a empresa ao contato."),
        });
        return;
      }

      setPortalContactMatch(json && json.id ? json : portalContactMatch);
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
      const response = await fetch(`/api/contacts/${portalContactMatch.id}`, {
        method: "PATCH",
        cache: "no-store",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: nextName }),
      });
      const json = (await response.json().catch(() => null)) as (ContactLookupEntry & { error?: string; message?: string }) | null;
      if (!response.ok) {
        setCompanyBindingFeedback({
          tone: "error",
          message:
            json?.error ||
            json?.message ||
            (response.status === 401
              ? "Faca login no portal neste navegador para atualizar o nome do contato."
              : "Nao foi possivel atualizar o nome do contato."),
        });
        return;
      }

      if (json?.id) {
        setPortalContactMatch(json);
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

  useEffect(() => {
    if (!resolved.companyId) {
      setLatestTickets([]);
      setTicketError(null);
      return;
    }

    const controller = new AbortController();
    async function loadTickets() {
      try {
        setIsLoadingTickets(true);
        setTicketError(null);
        const params = new URLSearchParams({
          companyId: resolved.companyId,
          page: "1",
          pageSize: "50",
          sortBy: "updatedAt",
          sortOrder: "desc",
        });
        const response = await fetch(`/api/tickets?${params.toString()}`, {
          method: "GET",
          cache: "no-store",
          signal: controller.signal,
        });
        if (!response.ok) {
          setLatestTickets([]);
          setTicketError(response.status === 401 ? "Faca login no portal neste navegador para ver tickets reais." : "Nao foi possivel carregar os tickets da empresa.");
          return;
        }
        const json = (await response.json()) as TicketModuleListResponse;
        const items = Array.isArray(json.data) ? toTicketListItems(json.data) : [];
        setLatestTickets(items.filter((ticket) => ticket.status !== "RESOLVED" && ticket.status !== "ARCHIVED"));
      } catch (error) {
        if ((error as Error).name === "AbortError") return;
        setLatestTickets([]);
        setTicketError("Nao foi possivel carregar os tickets da empresa.");
      } finally {
        setIsLoadingTickets(false);
      }
    }

    void loadTickets();
    return () => controller.abort();
  }, [resolved.companyId, ticketReloadToken]);

  useEffect(() => {
    if (!resolved.companyId) {
      setCompanyHosts([]);
      setHostError(null);
      return;
    }

    const controller = new AbortController();
    async function loadHosts() {
      try {
        setIsLoadingHosts(true);
        setHostError(null);
        const response = await fetch("/api/remote-admin/directory", {
          method: "GET",
          cache: "no-store",
          signal: controller.signal,
        });
        if (!response.ok) {
          setCompanyHosts([]);
          setHostError(response.status === 401 ? "Faca login no portal neste navegador para ver os hosts reais." : "Nao foi possivel carregar os hosts da empresa.");
          return;
        }
        const json = (await response.json()) as RemotePlatformDirectory;
        const items = Array.isArray(json.items) ? json.items : [];
        const nextHosts = items
          .filter((item) => item.companyId === resolved.companyId)
          .map((item) => ({
            id: item.id,
            name: item.name.trim() || "Host sem nome",
            companyId: item.companyId,
            companyName: item.companyName,
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
      } catch (error) {
        if ((error as Error).name === "AbortError") return;
        setCompanyHosts([]);
        setHostError("Nao foi possivel carregar os hosts da empresa.");
      } finally {
        setIsLoadingHosts(false);
      }
    }

    void loadHosts();
    return () => controller.abort();
  }, [resolved.companyId, hostReloadToken]);

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

      const json = (await response.json().catch(() => null)) as
        | { success?: boolean; message?: string; error?: string }
        | null;

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

  return (
    <div className="min-h-screen bg-background px-3 py-2 text-foreground">
      <div className="mx-auto w-full max-w-none space-y-3">
        <Card className="border-border/60 shadow-sm">
          <CardHeader className="space-y-3">
            <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
              <div className="min-w-0">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <MessageSquare className="h-5 w-5 text-primary" />
                  Painel do Atendimento
                </CardTitle>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setStatus("loading");
                    requestChatwootContext();
                    setTicketReloadToken((current) => current + 1);
                    setHostReloadToken((current) => current + 1);
                  }}
                >
                  Atualizar contexto
                </Button>
                {contactEditHref ? (
                  <Button asChild variant="secondary" size="sm">
                    <Link href={contactEditHref} target="_blank" rel="noreferrer">
                      Abrir contato
                    </Link>
                  </Button>
                ) : null}
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {status === "loading" ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Aguardando dados da conversa enviados pelo Chatwoot.
              </div>
            ) : null}

            {status === "empty" ? (
              <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-700 dark:text-amber-300">
                O Chatwoot ainda nao enviou o contexto desta conversa para o app. Reabra a aba do painel ou confira se o Dashboard App foi configurado neste endpoint.
              </div>
            ) : null}

            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid h-auto w-full grid-cols-3 p-1">
                <TabsTrigger value="overview" className="gap-2 py-2">
                  Visao geral
                </TabsTrigger>
                <TabsTrigger value="tickets" className="gap-2 py-2">
                  Tickets
                  {latestTickets.length > 0 ? (
                    <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] leading-none text-muted-foreground">
                      {latestTickets.length}
                    </span>
                  ) : null}
                </TabsTrigger>
                <TabsTrigger value="infrastructure" className="gap-2 py-2">
                  Infraestrutura
                  {companyHosts.length > 0 ? (
                    <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] leading-none text-muted-foreground">
                      {companyHosts.length}
                    </span>
                  ) : null}
                </TabsTrigger>
              </TabsList>

              <TabsContent value="overview" className="space-y-3">
                <div className="grid gap-3 md:grid-cols-3">
                  <QuickStatCard
                    label="Hosts"
                    value={String(companyHosts.length)}
                    helper={recommendedHost?.name || "Sem host recomendado"}
                  />
                  <QuickStatCard
                    label="Tickets"
                    value={String(latestTickets.length)}
                    helper={priorityTicket ? `Principal: #${priorityTicket.number}` : "Nenhum ticket em contexto"}
                  />
                  <QuickStatCard
                    label="Vinculo"
                    value={resolved.companyId ? "Ativo" : "Pendente"}
                    helper={
                      resolved.companyId
                        ? `${linkedCompanies.length} empresa${linkedCompanies.length === 1 ? "" : "s"} ligada${linkedCompanies.length === 1 ? "" : "s"}`
                        : "Contato ainda sem empresa no portal"
                    }
                  />
                </div>

                <div className="grid gap-3 xl:grid-cols-[minmax(0,0.92fr)_minmax(0,1.08fr)]">
                  <Card className="border-border/60">
                    <CardHeader className="pb-3">
                      <CardTitle className="flex items-center gap-2 text-sm">
                        <Headphones className="h-4 w-4 text-primary" />
                        Contato
                      </CardTitle>
                      <CardDescription>
                        Dados recebidos da conversa e correspondencia atual no portal.
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="rounded-lg border border-border/60 bg-card px-3 py-3">
                        <p className="text-base font-semibold text-foreground">
                          {effectiveContactName || "Nao identificado"}
                        </p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {portalContactMatch?.id ? `Contato localizado no portal (${portalContactMatch.id})` : "Contato ainda nao localizado no portal"}
                        </p>
                      </div>
                      <div className="grid gap-3 sm:grid-cols-2">
                        <DetailItem label="Telefone" value={resolved.customerPhone || "Sem telefone"} />
                        <DetailItem label="E-mail" value={resolved.customerEmail || "Sem e-mail"} breakAll />
                        <DetailItem
                          label="Empresas ligadas"
                          value={`${linkedCompanies.length}`}
                          helper={linkedCompanies.length > 0 ? "Encontradas no portal" : "Nenhum vinculo encontrado"}
                        />
                        <DetailItem
                          label="Ticket na conversa"
                          value={resolved.ticketNumber ? `#${resolved.ticketNumber}` : "Nao referenciado"}
                          helper={priorityTicket?.statusLabel || "Sem ticket associado a esta conversa"}
                        />
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Button type="button" variant="outline" size="sm" onClick={handleCopySummary}>
                          Copiar resumo
                        </Button>
                        {contactEditHref ? (
                          <Button asChild variant="outline" size="sm" className="gap-2">
                            <Link href={contactEditHref} target="_blank" rel="noreferrer">
                              <ArrowUpRight className="h-4 w-4" />
                              Editar contato
                            </Link>
                          </Button>
                        ) : null}
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="border-border/60">
                    <CardHeader className="pb-3">
                      <CardTitle className="flex items-center gap-2 text-sm">
                        <Building2 className="h-4 w-4 text-primary" />
                        Empresa em contexto
                      </CardTitle>
                      <CardDescription>
                        {resolved.companyId
                          ? "Empresa liberada para ticket e infraestrutura nesta conversa."
                          : "Este contato ainda nao possui empresa vinculada no portal."}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {primaryCompany ? (
                        <>
                          <div className="rounded-lg border border-primary/20 bg-primary/5 px-3 py-3">
                            <div className="flex flex-wrap items-start justify-between gap-2">
                              <div className="min-w-0">
                                <p className="text-sm font-semibold text-foreground">{getCompanyLabel(primaryCompany)}</p>
                                <p className="mt-1 text-xs text-muted-foreground">{primaryCompany.razaoSocial}</p>
                              </div>
                              <Badge variant="outline">{resolved.companyId ? "Ativa na conversa" : "Disponivel"}</Badge>
                            </div>
                            <div className="mt-3 grid gap-3 sm:grid-cols-2">
                              <DetailItem label="Empresa principal" value={getCompanyLabel(primaryCompany)} />
                              <DetailItem
                                label="Identificador"
                                value={primaryCompany.id}
                                helper={resolved.companyId ? "Usado nas acoes do painel" : "Pronto para vinculo"}
                              />
                            </div>
                          </div>

                          <div className="space-y-2">
                            <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                              Configuracoes relevantes para o suporte
                            </p>
                            {orderedLinkedCompanies.map((company) => (
                              <CompanyOperationalSettingsCard
                                key={company.id}
                                company={company}
                                isActive={company.id === resolved.companyId}
                              />
                            ))}
                          </div>
                        </>
                      ) : (
                        <EmptyState label="Nenhuma empresa vinculada encontrada para este contato." />
                      )}
                    </CardContent>
                  </Card>
                </div>

                {!canCreateTicket ? (
                  <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-700 dark:text-amber-300">
                    Este contato ainda nao esta vinculado a uma empresa no portal. Nesse estado o app nao libera criacao manual de ticket.
                  </div>
                ) : null}

                {!resolved.companyId ? (
                  <Card className="border-amber-500/30 bg-amber-500/5">
                    <CardHeader className="pb-3">
                      <CardTitle className="flex items-center gap-2 text-sm">
                        <Building2 className="h-4 w-4 text-amber-600" />
                        Vincular empresa ao contato
                      </CardTitle>
                      <CardDescription>
                        Fluxo guiado para liberar este atendimento no portal.
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="grid gap-2 md:grid-cols-3">
                        <GuidedStep
                          index={1}
                          title="Localizar contato"
                          description="Conferir se o contato ja existe e ajustar o nome antes do vinculo."
                        />
                        <GuidedStep
                          index={2}
                          title="Escolher empresa"
                          description="Selecionar a empresa correta para esta conversa."
                        />
                        <GuidedStep
                          index={3}
                          title="Liberar operacao"
                          description="Depois do vinculo, o painel passa a abrir ticket e infraestrutura."
                        />
                      </div>

                      <div className="grid gap-3 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
                        <div className="rounded-lg border border-border/60 bg-card p-3">
                          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                            1. Situacao do contato no portal
                          </p>
                          {isLoadingPortalContact ? (
                            <div className="mt-2">
                              <InlineLoading label="Verificando contato existente..." />
                            </div>
                          ) : portalContactMatch ? (
                            <div className="mt-2 space-y-3">
                              <div className="space-y-1">
                                <p className="text-sm font-semibold text-foreground">{portalContactMatch.name}</p>
                                <p className="text-xs text-muted-foreground">
                                  Contato ja existe no portal{portalContactMatch.companyIds?.length ? " e recebera mais este vinculo." : ", mas ainda esta sem empresa vinculada."}
                                </p>
                              </div>
                              <div className="space-y-2">
                                <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                                  Nome do contato
                                </label>
                                <div className="flex flex-wrap gap-2">
                                  <Input
                                    value={contactNameDraft}
                                    onChange={(event) => {
                                      setContactNameDraft(event.target.value);
                                      setCompanyBindingFeedback(null);
                                    }}
                                    placeholder="Nome usado no portal e no Chatwoot"
                                    className="h-10 flex-1 bg-background"
                                  />
                                  <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    className="gap-2"
                                    onClick={handleSaveContactName}
                                    disabled={!contactNameDraft.trim() || contactNameDraft.trim() === (portalContactMatch.name || "").trim() || isSavingContactName}
                                  >
                                    {isSavingContactName ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowUpRight className="h-4 w-4" />}
                                    Sincronizar nome
                                  </Button>
                                </div>
                              </div>
                            </div>
                          ) : (
                            <div className="mt-2 space-y-3">
                              <div className="space-y-1">
                                <p className="text-sm font-semibold text-foreground">Contato ainda nao localizado</p>
                                <p className="text-xs text-muted-foreground">
                                  O app pode criar o contato com os dados atuais da conversa e ja aplicar o vinculo com a empresa escolhida.
                                </p>
                              </div>
                              <div className="space-y-2">
                                <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                                  Nome para criar no portal
                                </label>
                                <Input
                                  value={contactNameDraft}
                                  onChange={(event) => {
                                    setContactNameDraft(event.target.value);
                                    setCompanyBindingFeedback(null);
                                  }}
                                  placeholder="Nome que sera usado ao criar o contato"
                                  className="h-10 bg-background"
                                />
                              </div>
                            </div>
                          )}
                          {contactLookupError ? <div className="mt-2"><InlineWarning message={contactLookupError} /></div> : null}
                        </div>

                        <div className="rounded-lg border border-border/60 bg-card p-3">
                          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                            2. Escolha a empresa
                          </p>
                          <div className="mt-2 space-y-2">
                            <Input
                              value={companySearchTerm}
                              onChange={(event) => setCompanySearchTerm(event.target.value)}
                              placeholder="Buscar empresa por nome fantasia ou razao social"
                              className="bg-background"
                            />
                            {!shouldSearchCompanies ? (
                              <EmptyState label="Digite pelo menos 2 caracteres para buscar empresas e vincular este contato." />
                            ) : null}
                            {isLoadingCompanyOptions ? (
                              <InlineLoading label="Buscando empresas..." />
                            ) : null}
                            {companyOptionsError ? <InlineWarning message={companyOptionsError} /> : null}
                            {shouldSearchCompanies && !isLoadingCompanyOptions && !companyOptionsError ? (
                              <div className="grid max-h-56 gap-2 overflow-y-auto pr-1 sm:grid-cols-2">
                                {filteredCompanyOptions.length > 0 ? (
                                  filteredCompanyOptions.map((company) => {
                                    const isSelected = selectedCompanyId === company.id;
                                    return (
                                      <button
                                        key={company.id}
                                        type="button"
                                        onClick={() => {
                                          setSelectedCompanyId(company.id);
                                          setCompanyBindingFeedback(null);
                                        }}
                                        className={cn(
                                          "w-full rounded-lg border px-3 py-2 text-left transition-colors",
                                          isSelected
                                            ? "border-primary/40 bg-primary/10"
                                            : "border-border/60 bg-background hover:bg-muted/40",
                                        )}
                                      >
                                        <p className="text-sm font-semibold text-foreground">{getCompanyLabel(company)}</p>
                                        <p className="text-xs text-muted-foreground">{company.razaoSocial}</p>
                                      </button>
                                    );
                                  })
                                ) : (
                                  <div className="sm:col-span-2">
                                    <EmptyState label="Nenhuma empresa encontrada para o filtro atual." />
                                  </div>
                                )}
                              </div>
                            ) : null}
                          </div>
                        </div>
                      </div>

                      {selectedCompanyOption ? (
                        <div className="rounded-lg border border-primary/20 bg-primary/5 p-3 text-sm text-foreground">
                          Empresa selecionada: <span className="font-semibold">{getCompanyLabel(selectedCompanyOption)}</span>
                        </div>
                      ) : null}

                      {companyBindingFeedback ? (
                        <InlineNotice tone={companyBindingFeedback.tone} message={companyBindingFeedback.message} />
                      ) : null}

                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="text-xs text-muted-foreground">
                          3. Depois do vinculo, use `Atualizar contexto` se o Chatwoot ainda nao refletir a empresa imediatamente.
                        </p>
                        <Button
                          type="button"
                          className="gap-2"
                          onClick={handleBindCompany}
                          disabled={!selectedCompanyOption || isBindingCompany}
                        >
                          {isBindingCompany ? <Loader2 className="h-4 w-4 animate-spin" /> : <Building2 className="h-4 w-4" />}
                          Vincular empresa
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ) : null}
              </TabsContent>

              <TabsContent value="tickets" className="space-y-3">
                <Card className="border-border/60">
                    <CardHeader className="pb-3">
                      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                        <div className="min-w-0">
                          <CardTitle className="flex items-center gap-2 text-sm">
                            <Ticket className="h-4 w-4 text-primary" />
                            Tickets da empresa
                          </CardTitle>
                          <CardDescription>
                            Abra o ticket sem sair do Chatwoot e acompanhe somente os chamados ainda abertos desta empresa.
                          </CardDescription>
                        </div>
                      <div className="flex flex-wrap gap-2">
                        <Button
                          type="button"
                          variant={showEmbeddedTicketForm ? "secondary" : "default"}
                          size="sm"
                          className="gap-2"
                          onClick={() => {
                            setShowEmbeddedTicketForm((current) => !current);
                            setActiveTab("tickets");
                            setEmbeddedTicketFeedback(null);
                          }}
                          disabled={!canCreateTicket}
                        >
                          <Ticket className="h-4 w-4" />
                          {showEmbeddedTicketForm ? "Fechar formulario" : "Criar ticket aqui"}
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => setTicketReloadToken((current) => current + 1)}
                        >
                          Atualizar lista
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {showEmbeddedTicketForm ? (
                      <div className="overflow-hidden rounded-xl border border-border/60 bg-card shadow-sm">
                        <form className="space-y-3" onSubmit={handleEmbeddedTicketSubmit}>
                          <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_20rem]">
                            <div className="space-y-4 p-4 xl:border-r xl:border-border/60">
                              <div className="inline-flex items-center gap-2 rounded-md border border-primary/20 bg-primary/10 px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider text-primary">
                                <MessageSquare className="h-3.5 w-3.5" />
                                Resumo do chamado
                              </div>
                              <div className="space-y-1.5">
                                <label className="text-sm font-semibold text-foreground">
                                  Assunto
                                </label>
                                <Input
                                  value={embeddedTicketForm.title}
                                  onChange={(event) =>
                                    setEmbeddedTicketForm((current) => ({ ...current, title: event.target.value }))
                                  }
                                  placeholder="Ex: Erro ao emitir nota fiscal"
                                  className="h-10 bg-background"
                                />
                              </div>
                              <div className="space-y-1.5">
                                <div className="flex items-center justify-between gap-2">
                                  <label className="text-sm font-semibold text-foreground">
                                    Descricao detalhada
                                  </label>
                                  <span className="text-[11px] text-muted-foreground">Passo a passo validado pelo analista</span>
                                </div>
                                <Textarea
                                  value={embeddedTicketForm.description}
                                  onChange={(event) =>
                                    setEmbeddedTicketForm((current) => ({
                                      ...current,
                                      description: event.target.value,
                                    }))
                                  }
                                  placeholder="Informe o passo a passo, resultado esperado, mensagem de erro e usuarios impactados."
                                  className="min-h-55 bg-background leading-relaxed"
                                />
                                <p className="text-xs text-muted-foreground">
                                  Use o mesmo nivel de detalhe da abertura normal do modulo para reduzir retrabalho.
                                </p>
                              </div>
                            </div>

                            <div className="space-y-3 bg-muted/5 p-4">
                              <div className="inline-flex items-center gap-2 rounded-md border border-border/40 bg-muted px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider text-foreground">
                                <Waypoints className="h-3.5 w-3.5" />
                                Informacoes
                              </div>
                              <div className="rounded-lg border border-border/60 bg-muted/10 p-3">
                                <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Classificacao</p>
                                <p className="mt-1 text-xs text-muted-foreground">
                                  Define fila, prioridade, categoria e modulo inicial do chamado.
                                </p>
                              </div>
                              <div className="space-y-1.5">
                                <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                                  Setor
                                </label>
                                <Select
                                  value={embeddedTicketForm.team}
                                  onValueChange={(value) =>
                                    setEmbeddedTicketForm((current) => {
                                      const nextTeam = value === "DESENVOLVIMENTO" ? "DESENVOLVIMENTO" : "SUPORTE";
                                      const nextCategory =
                                        ticketSettings.categories.find(
                                          (category) => category.value === current.category && category.defaultTeam === nextTeam,
                                        )?.value ||
                                        getSuggestedCategoryForTeam(ticketSettings, nextTeam) ||
                                        ticketSettings.categories[0]?.value ||
                                        "";
                                      return {
                                        ...current,
                                        team: nextTeam,
                                        category: nextCategory,
                                      };
                                    })
                                  }
                                >
                                  <SelectTrigger className="h-10 bg-background">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {ticketSettings.teams.map((team) => (
                                      <SelectItem key={team.id} value={team.value}>
                                        {team.label}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>

                              <div className="space-y-1.5">
                                <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                                  Prioridade
                                </label>
                                <Select
                                  value={embeddedTicketForm.priorityValue}
                                  onValueChange={(value) =>
                                    setEmbeddedTicketForm((current) => ({
                                      ...current,
                                      priorityValue: value,
                                    }))
                                  }
                                >
                                  <SelectTrigger className="h-10 bg-background">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {ticketSettings.priorities.map((priority) => (
                                      <SelectItem key={priority.id} value={priority.value}>
                                        {priority.label}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>

                              <div className="space-y-1.5">
                                <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                                  Categoria
                                </label>
                                <Select
                                  value={embeddedTicketForm.category}
                                  onValueChange={(value) =>
                                    setEmbeddedTicketForm((current) => ({
                                      ...current,
                                      category: value,
                                    }))
                                  }
                                >
                                  <SelectTrigger className="h-10 bg-background">
                                    <SelectValue placeholder="Selecione a categoria" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {filteredCategories.map((category) => (
                                      <SelectItem key={category.id} value={category.value}>
                                        {category.label}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>

                              <div className="space-y-1.5">
                                <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                                  Modulo
                                </label>
                                <TicketModuleCascadeSelect
                                  options={ticketSettings.modules}
                                  value={embeddedTicketForm.module}
                                  onChange={(value) =>
                                    setEmbeddedTicketForm((current) => ({
                                      ...current,
                                      module: value,
                                    }))
                                  }
                                  mode="single"
                                  compact
                                  labels={{
                                    single: "Modulo, submodulo e tela",
                                  }}
                                />
                              </div>

                              <div className="rounded-lg border border-border/60 bg-background px-3 py-2 text-sm text-foreground">
                                <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Empresa</p>
                                <p className="mt-1 font-medium">{resolved.companyName || resolved.companyId || "Sem empresa"}</p>
                              </div>
                              <div className="rounded-lg border border-border/60 bg-background px-3 py-2 text-sm text-foreground">
                                <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Contato</p>
                                <p className="mt-1 font-medium">{effectiveContactName || "Nao identificado"}</p>
                                <p className="mt-1 text-xs text-muted-foreground">{resolved.customerPhone || resolved.customerEmail || "Sem telefone/e-mail"}</p>
                              </div>
                            </div>
                          </div>

                          {hasExistingTicket ? (
                            <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-700 dark:text-amber-300">
                              Esta conversa ja referencia o ticket #{existingTicket.number}. Abra outro apenas se a demanda realmente precisar ser separada.
                            </div>
                          ) : null}

                          {embeddedTicketFeedback ? (
                            <InlineNotice tone={embeddedTicketFeedback.tone} message={embeddedTicketFeedback.message} />
                          ) : null}

                          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border/60 px-4 pb-1 pt-3">
                            <p className="text-xs text-muted-foreground">
                              O envio usa a mesma sessao do portal neste navegador e mantem o atendente dentro da conversa.
                            </p>
                            <div className="flex flex-wrap gap-2">
                              <Button asChild type="button" variant="outline" size="sm">
                                <Link href={resolved.ticketHref} target="_blank" rel="noreferrer">
                                  Tela completa
                                </Link>
                              </Button>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  setEmbeddedTicketForm((current) => ({
                                    ...current,
                                    title: "",
                                    description: "",
                                  }));
                                  setEmbeddedTicketFeedback(null);
                                }}
                              >
                                Limpar
                              </Button>
                              <Button type="submit" size="sm" className="gap-2" disabled={isSubmittingEmbeddedTicket}>
                                {isSubmittingEmbeddedTicket ? <Loader2 className="h-4 w-4 animate-spin" /> : <Ticket className="h-4 w-4" />}
                                Criar ticket
                              </Button>
                            </div>
                          </div>
                        </form>
                      </div>
                    ) : null}

                    {hasExistingTicket ? (false ? (
                      <div className="rounded-lg border border-primary/20 bg-primary/5 p-3">
                        <div className="flex items-center justify-between gap-2">
                          <div className="min-w-0">
                            <p className="text-xs font-semibold uppercase tracking-wide text-primary/80">Ticket ja vinculado na conversa</p>
                            <p className="mt-1 truncate text-sm font-semibold text-foreground">
                              #{existingTicket.number} · {existingTicket.title}
                            </p>
                            <p className="mt-1 text-xs text-muted-foreground">
                              Status atual: {existingTicket.statusLabel}
                            </p>
                          </div>
                          <Button asChild size="sm" className="gap-2">
                            <Link href={`/portal/tickets/${existingTicket.id}`} target="_blank" rel="noreferrer">
                              <ArrowUpRight className="h-4 w-4" />
                              Abrir ticket
                            </Link>
                          </Button>
                        </div>
                      </div>
                    ) : null) : null}

                    {!hasExistingTicket && hasLatestCompanyTicket ? (false ? (
                      <div className="rounded-lg border border-border/60 bg-muted/20 p-3">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                              Ultimo ticket da empresa
                            </p>
                            <p className="mt-1 truncate text-sm font-semibold text-foreground">
                              #{latestCompanyTicket.number} · {latestCompanyTicket.title}
                            </p>
                            <p className="mt-1 text-xs text-muted-foreground">
                              Status atual: {latestCompanyTicket.statusLabel}
                            </p>
                          </div>
                          <Button asChild variant="outline" size="sm">
                            <Link href={`/portal/tickets/${latestCompanyTicket.id}`} target="_blank" rel="noreferrer">
                              Ver ultimo
                            </Link>
                          </Button>
                        </div>
                      </div>
                    ) : null) : null}

                    {priorityTicket ? (
                      <div className="rounded-lg border border-primary/20 bg-primary/5 p-3">
                        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                          <div className="min-w-0">
                            <p className="text-xs font-semibold uppercase tracking-wide text-primary/80">
                              {matchedExistingTicket ? "Ticket da conversa" : "Ticket mais relevante"}
                            </p>
                            <p className="mt-1 truncate text-sm font-semibold text-foreground">
                              #{priorityTicket.number} · {priorityTicket.title}
                            </p>
                            <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                              <ContextBadge tone={matchedExistingTicket ? "good" : "neutral"}>
                                {priorityTicket.statusLabel}
                              </ContextBadge>
                              <span>Atualizado em {formatRelativeDate(priorityTicket.updatedAt)}</span>
                            </div>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            <Button asChild size="sm" className="gap-2">
                              <Link href={`/portal/tickets/${priorityTicket.id}`} target="_blank" rel="noreferrer">
                                <ArrowUpRight className="h-4 w-4" />
                                Abrir ticket
                              </Link>
                            </Button>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={async () => {
                                try {
                                  await navigator.clipboard.writeText(String(priorityTicket.number));
                                  toast.success("Numero do ticket copiado.");
                                } catch {
                                  toast.error("Nao foi possivel copiar o numero do ticket.");
                                }
                              }}
                            >
                              Copiar numero
                            </Button>
                          </div>
                        </div>
                      </div>
                    ) : null}

                    {isLoadingTickets ? (
                      <InlineLoading label="Carregando tickets reais da empresa..." />
                    ) : null}
                    {ticketError ? (
                      <InlineWarning message={ticketError} />
                    ) : null}
                    {!isLoadingTickets && !ticketError && latestTickets.length === 0 ? (
                      <EmptyState label="Nenhum ticket aberto encontrado para esta empresa." />
                    ) : null}
                    {!isLoadingTickets && !ticketError && latestTickets.length > 0 ? (
                      <div className="space-y-2">
                        {latestTickets.filter((ticket) => ticket.id !== priorityTicket?.id).map((ticket) => (
                          <div key={ticket.id} className="rounded-lg border border-border/60 bg-card p-3">
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0">
                                <p className="truncate text-sm font-semibold text-foreground">
                                  #{ticket.number} · {ticket.title}
                                </p>
                                <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                                  {ticket.number === resolved.ticketNumber ? (
                                    <ContextBadge tone="good">Ticket da conversa</ContextBadge>
                                  ) : null}
                                  <span className="inline-flex items-center gap-1">
                                    <Clock3 className="h-3 w-3" />
                                    Criado em {formatRelativeDate(ticket.createdAt)}
                                  </span>
                                  <span className="inline-flex items-center gap-1">
                                    Estagio atual: {ticket.statusLabel}
                                  </span>
                                </div>
                              </div>
                              <Button asChild variant="outline" size="sm">
                                <Link href={`/portal/tickets/${ticket.id}`} target="_blank" rel="noreferrer">
                                  Ver
                                </Link>
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : null}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="infrastructure" className="space-y-3">
                <Card className="border-border/60">
                  <CardHeader className="pb-3">
                      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                        <div className="min-w-0">
                          <CardTitle className="flex items-center gap-2 text-sm">
                            <Monitor className="h-4 w-4 text-primary" />
                            Infraestrutura da empresa
                          </CardTitle>
                          <CardDescription>
                            Hosts vinculados a esta empresa para acesso rapido e abertura na Infraestrutura do portal.
                          </CardDescription>
                        </div>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => setHostReloadToken((current) => current + 1)}
                        >
                          Atualizar hosts
                        </Button>
                      </div>
                    </CardHeader>
                  <CardContent className="space-y-3">
                    {recommendedHost ? (
                      <div className="rounded-lg border border-primary/20 bg-primary/5 p-3">
                        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                          <div className="min-w-0">
                            <p className="text-xs font-semibold uppercase tracking-wide text-primary/80">
                              Host recomendado
                            </p>
                            <p className="mt-1 truncate text-sm font-semibold text-foreground">{recommendedHost.name}</p>
                            <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                              <span className="font-mono">{recommendedHost.agent.rustdeskId || "Sem RustDesk ID"}</span>
                              {recommendedHost.agent.lastHeartbeatAt ? (
                                <span>Heartbeat em {formatRelativeDate(recommendedHost.agent.lastHeartbeatAt)}</span>
                              ) : null}
                              <ContextBadge tone={recommendedHost.agent.rustdeskId?.trim() ? "good" : "warn"}>
                                {recommendedHost.agent.rustdeskId?.trim() ? "Pronto para acesso" : "Sem acesso remoto"}
                              </ContextBadge>
                            </div>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            <Button
                              type="button"
                              size="sm"
                              className="gap-2"
                              onClick={() => handleStartHostSession(recommendedHost)}
                              disabled={isStartingSession || !recommendedHost.agent.rustdeskId?.trim()}
                            >
                              {isStartingSession && startingHostId === recommendedHost.id ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : null}
                              {recommendedHost.agent.rustdeskId?.trim() ? "Acessar host" : "Sem acesso remoto"}
                            </Button>
                            <Button asChild variant="outline" size="sm">
                              <Link href={`/portal/infraestrutura/hosts/${recommendedHost.id}${resolved.ticketNumber ? `?ticketNumber=${encodeURIComponent(resolved.ticketNumber)}` : ""}`} target="_blank" rel="noreferrer">
                                Abrir host
                              </Link>
                            </Button>
                          </div>
                        </div>
                      </div>
                    ) : null}

                    {isLoadingHosts ? (
                      <InlineLoading label="Carregando hosts reais da infraestrutura da empresa..." />
                    ) : null}
                    {hostError ? (
                      <InlineWarning message={hostError} />
                    ) : null}
                    {!isLoadingHosts && !hostError && companyHosts.length === 0 ? (
                      <EmptyState label="Nenhum host recente encontrado para esta empresa." />
                    ) : null}
                    {!isLoadingHosts && !hostError && companyHosts.length > 0 ? (
                      <div className="space-y-2">
                        {companyHosts.filter((host) => host.id !== recommendedHost?.id).map((host) => (
                          <div key={host.id} className="rounded-lg border border-border/60 bg-card p-3">
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0">
                                <p className="truncate text-sm font-semibold text-foreground">{host.name}</p>
                                <p className="mt-1 text-xs text-muted-foreground">
                                  {host.companyName || resolved.companyName || "Empresa nao identificada"}
                                </p>
                                <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                                  <span className="break-all font-mono">{host.agent.rustdeskId || "Sem RustDesk ID"}</span>
                                  {host.agent.lastHeartbeatAt ? (
                                    <span className="inline-flex items-center gap-1">
                                      <Clock3 className="h-3 w-3" />
                                      {formatRelativeDate(host.agent.lastHeartbeatAt)}
                                    </span>
                                  ) : null}
                                </div>
                              </div>
                              <div className="flex shrink-0 items-center gap-2">
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleStartHostSession(host)}
                                  disabled={isStartingSession || !host.agent.rustdeskId?.trim()}
                                >
                                  {isStartingSession && startingHostId === host.id ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                  ) : null}
                                  Acessar
                                </Button>
                                <Button asChild variant="outline" size="sm">
                                  <Link href={`/portal/infraestrutura/hosts/${host.id}${resolved.ticketNumber ? `?ticketNumber=${encodeURIComponent(resolved.ticketNumber)}` : ""}`} target="_blank" rel="noreferrer">
                                    Abrir no portal
                                  </Link>
                                </Button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : null}
                    <Button asChild variant="secondary" className="w-full gap-2" disabled={!canOpenInfrastructureHosts}>
                      <Link href={resolved.infrastructureHostsHref} target="_blank" rel="noreferrer">
                        <Waypoints className="h-4 w-4" />
                        Abrir infraestrutura completa
                      </Link>
                    </Button>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>

          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function InlineNotice({
  tone,
  message,
}: {
  tone: "success" | "error";
  message: string;
}) {
  return (
    <div
      className={cn(
        "rounded-lg border p-3 text-sm",
        tone === "success"
          ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
          : "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300",
      )}
    >
      {message}
    </div>
  );
}

function ContextBadge({
  children,
  tone,
}: {
  children: ReactNode;
  tone: "good" | "warn" | "neutral";
}) {
  const className =
    tone === "good"
      ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
      : tone === "warn"
        ? "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300"
        : "border-border/60 bg-background text-muted-foreground";

  return (
    <Badge variant="outline" className={className}>
      {children}
    </Badge>
  );
}

function InlineLoading({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-2 text-sm text-muted-foreground">
      <Loader2 className="h-4 w-4 animate-spin" />
      {label}
    </div>
  );
}

function InlineWarning({ message }: { message: string }) {
  return (
    <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-700 dark:text-amber-300">
      {message}
    </div>
  );
}

function EmptyState({ label }: { label: string }) {
  return (
    <div className="rounded-lg border border-dashed border-border/60 bg-muted/20 p-4 text-sm text-muted-foreground">
      {label}
    </div>
  );
}

function DetailItem({
  label,
  value,
  helper,
  breakAll = false,
}: {
  label: string;
  value: string;
  helper?: string;
  breakAll?: boolean;
}) {
  return (
    <div className="rounded-lg border border-border/60 bg-background px-3 py-2">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className={cn("mt-1 text-sm font-medium text-foreground", breakAll && "break-all")}>{value}</p>
      {helper ? <p className="mt-1 text-xs text-muted-foreground">{helper}</p> : null}
    </div>
  );
}

function QuickStatCard({
  label,
  value,
  helper,
}: {
  label: string;
  value: string;
  helper: string;
}) {
  return (
    <div className="rounded-xl border border-border/60 bg-card p-3">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-2 truncate text-sm font-semibold text-foreground">{value}</p>
      <p className="mt-1 text-xs text-muted-foreground">{helper}</p>
    </div>
  );
}

function CompanyOperationalSettingsCard({
  company,
  isActive,
}: {
  company: ContactCompanyEntry;
  isActive: boolean;
}) {
  const remoteConnections = Array.isArray(company.remoteConnections) ? company.remoteConnections : [];

  return (
    <div
      className={cn(
        "rounded-lg border px-3 py-3",
        isActive ? "border-primary/20 bg-primary/5" : "border-border/60 bg-card",
      )}
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-foreground">{getCompanyLabel(company)}</p>
          <p className="mt-1 text-xs text-muted-foreground">{company.razaoSocial}</p>
        </div>
        <Badge variant="outline">{isActive ? "Em contexto" : "Vinculada"}</Badge>
      </div>

      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <DetailItem
          label="Servidor"
          value={formatCompanyServerType(company.serverType)}
          helper={formatCompanyEndpoint(company)}
        />
        <DetailItem
          label="Instalacao"
          value={readString(company.installationDirectory) || "Nao informado"}
          breakAll
        />
        {company.serverType === "IIS" ? (
          <DetailItem
            label="ISAPI"
            value={readString(company.iisIsapiPath) || "Nao informado"}
            breakAll
          />
        ) : null}
        <DetailItem
          label="Conexoes remotas"
          value={remoteConnections.length ? `${remoteConnections.length}` : "Nenhuma"}
          helper={
            remoteConnections.length
              ? remoteConnections.map((connection) => formatRemoteConnectionType(connection.type)).join(" | ")
              : hasOperationalSettings(company)
                ? "Sem conexoes cadastradas"
                : "Configuracoes ainda nao preenchidas"
          }
        />
      </div>

      {readString(company.observacoes) ? (
        <div className="mt-3 rounded-md border border-border/60 bg-background px-3 py-2">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            Observacoes
          </p>
          <p className="mt-1 whitespace-pre-wrap text-sm text-foreground">
            {readString(company.observacoes)}
          </p>
        </div>
      ) : null}

      {remoteConnections.length > 0 ? (
        <div className="mt-3 space-y-2">
          {remoteConnections.map((connection, index) => (
            <div
              key={`${company.id}-${connection.type}-${index}`}
              className="rounded-md border border-border/60 bg-background px-3 py-2"
            >
              <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                {formatRemoteConnectionType(connection.type)}
              </p>
              <p className="mt-1 break-all text-sm text-foreground">
                {readString(connection.details) || "Sem detalhes"}
              </p>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function GuidedStep({
  index,
  title,
  description,
}: {
  index: number;
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-xl border border-border/60 bg-card p-3">
      <div className="flex items-center gap-2">
        <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-primary/10 text-[11px] font-bold text-primary">
          {index}
        </span>
        <p className="text-sm font-semibold text-foreground">{title}</p>
      </div>
      <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{description}</p>
    </div>
  );
}

function formatRelativeDate(value: string | null) {
  if (!value) return "Sem registro";
  const parsed = Date.parse(value);
  if (!Number.isFinite(parsed)) return value;
  return new Date(parsed).toLocaleString("pt-BR");
}
