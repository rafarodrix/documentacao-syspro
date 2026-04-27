"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowUpRight,
  Building2,
  Clock3,
  ExternalLink,
  Headphones,
  Loader2,
  MessageSquare,
  Monitor,
  Radio,
  ShieldAlert,
  Ticket,
  Waypoints,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
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

type TicketListEntry = {
  id: string;
  number: string;
  title: string;
  status: string;
  statusLabel: string;
  updatedAt: string;
  customer?: string | null;
};

type RemoteHostEntry = {
  id: string;
  name: string;
  rustdeskId: string | null;
  lastHeartbeatAt: string | null;
  productStatus: string;
};

type CompanyOption = {
  id: string;
  razaoSocial: string;
  nomeFantasia?: string | null;
};

type ContactLookupEntry = {
  id: string;
  name: string;
  email?: string | null;
  phone?: string | null;
  whatsapp?: string | null;
  companyId?: string | null;
  companyIds?: string[];
  companies?: CompanyOption[];
};

type TicketPriorityOption = "LOW" | "NORMAL" | "HIGH" | "CRITICAL";

type EmbeddedTicketFormState = {
  title: string;
  description: string;
  priority: TicketPriorityOption;
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

function getCompanyLabel(company: CompanyOption | null | undefined) {
  return company?.nomeFantasia?.trim() || company?.razaoSocial?.trim() || "Empresa sem nome";
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

export function ChatwootDashboardApp() {
  const [context, setContext] = useState<ChatwootAppContext | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "empty">("loading");
  const [activeTab, setActiveTab] = useState("overview");
  const [latestTickets, setLatestTickets] = useState<TicketListEntry[]>([]);
  const [isLoadingTickets, setIsLoadingTickets] = useState(false);
  const [ticketError, setTicketError] = useState<string | null>(null);
  const [companyHosts, setCompanyHosts] = useState<RemoteHostEntry[]>([]);
  const [isLoadingHosts, setIsLoadingHosts] = useState(false);
  const [hostError, setHostError] = useState<string | null>(null);
  const [showEmbeddedTicketForm, setShowEmbeddedTicketForm] = useState(false);
  const [embeddedTicketForm, setEmbeddedTicketForm] = useState<EmbeddedTicketFormState>({
    title: "",
    description: "",
    priority: "NORMAL",
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
  const [selectedCompanyId, setSelectedCompanyId] = useState("");
  const [portalContactMatch, setPortalContactMatch] = useState<ContactLookupEntry | null>(null);
  const [isLoadingPortalContact, setIsLoadingPortalContact] = useState(false);
  const [contactLookupError, setContactLookupError] = useState<string | null>(null);
  const [isBindingCompany, setIsBindingCompany] = useState(false);
  const [companyBindingFeedback, setCompanyBindingFeedback] = useState<{
    tone: "success" | "error";
    message: string;
  } | null>(null);

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
    const remoteStatus = pickFirstValue(conversationAttributes.remote_status);
    const remoteStatusText = pickFirstValue(conversationAttributes.remote_status_text);
    const companyNames = pickFirstValue(
      contactAttributes.syspro_company_names,
      conversationAttributes.syspro_company_names,
    );
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
      companyNames,
      hostId,
      rustdeskId,
      ticketNumber,
      remoteStatus,
      remoteStatusText,
      contactName,
      customerEmail,
      customerPhone,
      conversationId,
      conversationStatus: pickFirstValue(context?.conversation?.status),
      contactId,
      accountId,
      currentAgentName: pickFirstValue(context?.currentAgent?.name),
      ticketHref: `/portal/tickets/novo?${ticketParams.toString()}`,
      remoteDirectoryHref: remoteDirectoryParams.toString()
        ? `/portal/plataforma-remota?${remoteDirectoryParams.toString()}`
        : "/portal/plataforma-remota",
      remoteHostHref: hostId
        ? `/portal/plataforma-remota/${hostId}${ticketNumber ? `?ticketNumber=${encodeURIComponent(ticketNumber)}` : ""}`
        : "",
    };
  }, [context, manualLinkedCompany]);

  const canCreateTicket = Boolean(resolved.companyId);
  const canOpenRemoteDirectory = Boolean(resolved.companyId);
  const canOpenHost = Boolean(resolved.hostId);
  const recommendedAction = canOpenHost
    ? "host"
    : canOpenRemoteDirectory
      ? "hosts"
      : canCreateTicket
        ? "ticket"
        : "diagnostic";
  const existingTicket = useMemo(
    () => latestTickets.find((ticket) => ticket.number === resolved.ticketNumber) ?? null,
    [latestTickets, resolved.ticketNumber],
  );
  const latestCompanyTicket = latestTickets[0] ?? null;
  const recommendedHost = useMemo(() => {
    if (!companyHosts.length) return null;
    return companyHosts.find((host) => host.id === resolved.hostId) ?? companyHosts[0];
  }, [companyHosts, resolved.hostId]);
  const filteredCompanyOptions = useMemo(() => {
    const q = companySearchTerm.trim().toLowerCase();
    if (!q) return companyOptions.slice(0, 8);
    return companyOptions
      .filter((company) => {
        const haystack = `${company.nomeFantasia || ""} ${company.razaoSocial || ""}`.toLowerCase();
        return haystack.includes(q);
      })
      .slice(0, 8);
  }, [companyOptions, companySearchTerm]);
  const selectedCompanyOption = useMemo(
    () => companyOptions.find((company) => company.id === selectedCompanyId) ?? null,
    [companyOptions, selectedCompanyId],
  );
  const linkedCompanyCount = portalContactMatch?.companyIds?.length ?? (resolved.companyId ? 1 : 0);
  const contactEditHref = portalContactMatch?.id ? `/portal/contatos/${portalContactMatch.id}/editar` : "";
  const customerReadinessLabel = resolved.companyId
    ? linkedCompanyCount > 1
      ? `${linkedCompanyCount} empresas vinculadas`
      : "Contato pronto para uso no portal"
    : portalContactMatch?.id
      ? "Contato existe no portal, mas precisa de empresa"
      : "Contato ainda nao registrado no portal";

  useEffect(() => {
    const contactLabel = resolved.contactName || resolved.companyName || "Novo ticket";
    const defaultTitle = resolved.ticketNumber
      ? `${contactLabel} - continuidade do atendimento`
      : `${contactLabel} - novo ticket`;
    const defaultDescription = [
      "Atendimento originado no Chatwoot.",
      resolved.companyName ? `Empresa: ${resolved.companyName}` : "",
      resolved.contactName ? `Contato: ${resolved.contactName}` : "",
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
    resolved.contactName,
    resolved.customerPhone,
    resolved.hostId,
    resolved.ticketNumber,
  ]);

  useEffect(() => {
    if (resolved.companyId || companyOptions.length > 0) return;

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
              : "Nao foi possivel carregar as empresas disponiveis para vinculo.",
          );
          return;
        }
        const json = (await response.json()) as CompanyOption[];
        setCompanyOptions(Array.isArray(json) ? json : []);
      } catch (error) {
        if ((error as Error).name === "AbortError") return;
        setCompanyOptions([]);
        setCompanyOptionsError("Nao foi possivel carregar as empresas disponiveis para vinculo.");
      } finally {
        setIsLoadingCompanyOptions(false);
      }
    }

    void loadCompanyOptions();
    return () => controller.abort();
  }, [companyOptions.length, resolved.companyId]);

  useEffect(() => {
    if (resolved.companyId) {
      setPortalContactMatch(null);
      setContactLookupError(null);
      return;
    }

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
  }, [resolved.companyId, resolved.customerEmail, resolved.customerPhone]);

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
            name: resolved.contactName || "Contato Chatwoot",
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
        message: `Contato vinculado a ${getCompanyLabel(selectedCompanyOption)}. Agora o painel ja pode abrir ticket e remoto sem sair do Chatwoot.`,
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
          pageSize: "5",
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
        const json = (await response.json()) as { data?: TicketListEntry[] };
        setLatestTickets(Array.isArray(json.data) ? json.data : []);
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
        const json = (await response.json()) as { items?: Array<Record<string, unknown>> };
        const items = Array.isArray(json.items) ? json.items : [];
        const nextHosts = items
          .filter((item) => readString(item.companyId) === resolved.companyId)
          .map((item) => ({
            id: readString(item.id),
            name: readString(item.name) || "Host sem nome",
            rustdeskId: readString(item.rustdeskId) || null,
            lastHeartbeatAt: readString(item.lastHeartbeatAt) || null,
            productStatus: readString(item.productStatus) || "UNKNOWN",
          }))
          .sort((a, b) => {
            const aHeartbeat = a.lastHeartbeatAt ? Date.parse(a.lastHeartbeatAt) : 0;
            const bHeartbeat = b.lastHeartbeatAt ? Date.parse(b.lastHeartbeatAt) : 0;
            return bHeartbeat - aHeartbeat;
          })
          .slice(0, 5);
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
        priority: embeddedTicketForm.priority,
        channel: "WHATSAPP",
        entryPoint: "INBOUND",
        companyId: resolved.companyId || undefined,
        customerEmail: resolved.customerEmail || undefined,
        externalThreadId: resolved.conversationId || undefined,
        contactPhoneSnapshot: resolved.customerPhone || undefined,
        contactWhatsappSnapshot: resolved.customerPhone || undefined,
        contactNameSnapshot: resolved.contactName || undefined,
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
                <CardDescription>
                  Consulte o contexto do contato e abra ticket ou acesso remoto apenas quando o atendente decidir.
                </CardDescription>
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
                <Badge variant="outline">
                  {status === "ready" ? "Contexto carregado" : status === "loading" ? "Lendo contexto" : "Sem contexto"}
                </Badge>
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

            <div className="flex flex-wrap gap-1.5">
              <ContextBadge tone={resolved.companyId ? "good" : "warn"}>
                {resolved.companyId ? "Empresa vinculada" : "Sem empresa vinculada"}
              </ContextBadge>
              <ContextBadge tone={resolved.hostId ? "good" : "neutral"}>
                {resolved.hostId ? "Host sincronizado" : "Sem host sincronizado"}
              </ContextBadge>
              <ContextBadge tone={resolved.ticketNumber ? "good" : "neutral"}>
                {resolved.ticketNumber ? `Ticket #${resolved.ticketNumber}` : "Sem ticket vinculado"}
              </ContextBadge>
              <ContextBadge tone={resolved.remoteStatus || resolved.remoteStatusText ? "good" : "neutral"}>
                {resolved.remoteStatusText || resolved.remoteStatus || "Sem status remoto"}
              </ContextBadge>
            </div>

            <div className="grid gap-3 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)]">
              <div className="grid gap-3 sm:grid-cols-2">
                <InfoCard
                  icon={<Building2 className="h-4 w-4 text-primary" />}
                  label="Empresa"
                  value={resolved.companyName || "Nao vinculada"}
                  helper={resolved.companyNames || resolved.companyId || "Contato sem empresa no portal"}
                />
                <InfoCard
                  icon={<Headphones className="h-4 w-4 text-primary" />}
                  label="Contato"
                  value={resolved.contactName || "Nao identificado"}
                  helper={resolved.customerPhone || resolved.customerEmail || "Sem telefone/e-mail"}
                />
                <InfoCard
                  icon={<Monitor className="h-4 w-4 text-primary" />}
                  label="Host atual"
                  value={resolved.hostId || "Nao informado"}
                  helper={resolved.rustdeskId || "Sem RustDesk ID"}
                />
                <InfoCard
                  icon={<Ticket className="h-4 w-4 text-primary" />}
                  label="Ticket"
                  value={resolved.ticketNumber ? `#${resolved.ticketNumber}` : "Nao vinculado"}
                  helper={resolved.conversationId ? `Conversa ${resolved.conversationId}` : "Sem conversa"}
                />
              </div>

              <div className="rounded-xl border border-border/60 bg-card p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Cliente e contato</p>
                    <p className="mt-2 text-base font-semibold text-foreground">
                      {resolved.contactName || "Contato nao identificado"}
                    </p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {resolved.customerPhone || resolved.customerEmail || "Sem canal principal identificado"}
                    </p>
                  </div>
                  <ContextBadge tone={resolved.companyId ? "good" : "warn"}>
                    {resolved.companyId ? "Pronto" : "Pendente"}
                  </ContextBadge>
                </div>
                <div className="mt-4 space-y-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Situacao no portal</p>
                    <p className="mt-1 text-sm font-medium text-foreground">{customerReadinessLabel}</p>
                  </div>
                  <div className="grid gap-2 sm:grid-cols-2">
                    <MiniMetric
                      label="Contato local"
                      value={portalContactMatch?.id ? "Encontrado" : resolved.companyId ? "Sincronizado" : "Pendente"}
                    />
                    <MiniMetric
                      label="Empresas"
                      value={linkedCompanyCount ? String(linkedCompanyCount) : "0"}
                    />
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {contactEditHref ? (
                      <Button asChild variant="outline" size="sm">
                        <Link href={contactEditHref} target="_blank" rel="noreferrer">
                          Editar contato
                        </Link>
                      </Button>
                    ) : (
                      <Button asChild variant="outline" size="sm">
                        <Link href="/portal/contatos/novo" target="_blank" rel="noreferrer">
                          Novo contato
                        </Link>
                      </Button>
                    )}
                    <Button asChild variant="ghost" size="sm">
                      <Link href="/portal/contatos" target="_blank" rel="noreferrer">
                        Ver contatos
                      </Link>
                    </Button>
                  </div>
                </div>
              </div>
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
                    Faca o vinculo aqui mesmo para liberar criacao de ticket, busca de hosts e demais acoes do portal sem sair do Chatwoot.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid gap-3 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
                    <div className="rounded-lg border border-border/60 bg-card p-3">
                      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        Situacao do contato no portal
                      </p>
                      {isLoadingPortalContact ? (
                        <div className="mt-2">
                          <InlineLoading label="Verificando contato existente..." />
                        </div>
                      ) : portalContactMatch ? (
                        <div className="mt-2 space-y-1">
                          <p className="text-sm font-semibold text-foreground">{portalContactMatch.name}</p>
                          <p className="text-xs text-muted-foreground">
                            Contato ja existe no portal{portalContactMatch.companyIds?.length ? " e recebera mais este vinculo." : ", mas ainda esta sem empresa vinculada."}
                          </p>
                        </div>
                      ) : (
                        <div className="mt-2 space-y-1">
                          <p className="text-sm font-semibold text-foreground">Contato ainda nao localizado</p>
                          <p className="text-xs text-muted-foreground">
                            O app pode criar o contato com os dados atuais da conversa e ja aplicar o vinculo com a empresa escolhida.
                          </p>
                        </div>
                      )}
                      {contactLookupError ? <div className="mt-2"><InlineWarning message={contactLookupError} /></div> : null}
                    </div>

                    <div className="rounded-lg border border-border/60 bg-card p-3">
                      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        Escolha a empresa
                      </p>
                      <div className="mt-2 space-y-2">
                        <Input
                          value={companySearchTerm}
                          onChange={(event) => setCompanySearchTerm(event.target.value)}
                          placeholder="Buscar empresa por nome fantasia ou razao social"
                          className="bg-background"
                        />
                        {isLoadingCompanyOptions ? (
                          <InlineLoading label="Carregando empresas permitidas..." />
                        ) : null}
                        {companyOptionsError ? <InlineWarning message={companyOptionsError} /> : null}
                        {!isLoadingCompanyOptions && !companyOptionsError ? (
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
                      Depois do vinculo, use `Atualizar contexto` se o Chatwoot ainda nao refletir a empresa imediatamente.
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

            <Card className="border-primary/20 bg-primary/5">
              <CardContent className="flex flex-col gap-3 p-4 lg:flex-row lg:items-center lg:justify-between">
                <div className="min-w-0">
                  <p className="text-xs font-semibold uppercase tracking-wide text-primary/80">Acao recomendada</p>
                  <p className="mt-1 text-sm font-semibold text-foreground">
                    {recommendedAction === "host" && "Abrir host atual para atendimento imediato"}
                    {recommendedAction === "hosts" && "Ver os hosts da empresa antes de abrir ticket"}
                    {recommendedAction === "ticket" && "Contato apto para ticket manual quando necessario"}
                    {recommendedAction === "diagnostic" && "Conferir vinculo da empresa antes de seguir"}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {recommendedAction === "host" && "O contexto desta conversa ja trouxe um host especifico sincronizado."}
                    {recommendedAction === "hosts" && "Ha empresa vinculada, entao o proximo passo mais util costuma ser localizar o host correto."}
                    {recommendedAction === "ticket" && "Sem host no contexto, mas o contato ja pode virar ticket manualmente se o atendente decidir."}
                    {recommendedAction === "diagnostic" && "Sem empresa vinculada, o app fica limitado a diagnostico do contexto recebido."}
                  </p>
                </div>
                {recommendedAction === "host" && resolved.remoteHostHref ? (
                  <Button asChild className="gap-2">
                    <Link href={resolved.remoteHostHref} target="_blank" rel="noreferrer">
                      <Monitor className="h-4 w-4" />
                      Abrir host atual
                    </Link>
                  </Button>
                ) : null}
                {recommendedAction === "hosts" ? (
                  <Button asChild className="gap-2">
                    <Link href={resolved.remoteDirectoryHref} target="_blank" rel="noreferrer">
                      <Waypoints className="h-4 w-4" />
                      Ver hosts da empresa
                    </Link>
                  </Button>
                ) : null}
                {recommendedAction === "ticket" ? (
                  <Button
                    type="button"
                    className="gap-2"
                    onClick={() => {
                      setActiveTab("tickets");
                      setShowEmbeddedTicketForm(true);
                      setEmbeddedTicketFeedback(null);
                    }}
                  >
                    <Ticket className="h-4 w-4" />
                    Criar ticket manual
                  </Button>
                ) : null}
                {recommendedAction === "ticket" && resolved.ticketHref ? (
                  <Button asChild variant="secondary" className="gap-2">
                    <Link href={resolved.ticketHref} target="_blank" rel="noreferrer">
                      <ArrowUpRight className="h-4 w-4" />
                      Abrir tela completa
                    </Link>
                  </Button>
                ) : null}
                {recommendedAction === "diagnostic" ? (
                  <div className="inline-flex items-center gap-2 rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-700 dark:text-amber-300">
                    <AlertTriangle className="h-4 w-4" />
                    Falta empresa no contexto
                  </div>
                ) : null}
              </CardContent>
            </Card>

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
                <TabsTrigger value="remote" className="gap-2 py-2">
                  Remoto
                  {companyHosts.length > 0 ? (
                    <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] leading-none text-muted-foreground">
                      {companyHosts.length}
                    </span>
                  ) : null}
                </TabsTrigger>
              </TabsList>

              <TabsContent value="overview" className="space-y-3">
                <div className="grid gap-3 md:grid-cols-2">
                  <ActionCard
                    icon={<Ticket className="h-4 w-4" />}
                    title="Criar ticket"
                    description={
                      resolved.ticketNumber
                        ? `Ja existe o ticket #${resolved.ticketNumber} neste atendimento. Abra outro apenas se realmente precisar separar a demanda.`
                        : "Abre a tela de novo chamado com o contexto do atendimento. Use apenas quando a conversa precisar virar ticket."
                    }
                    actionLabel="Abrir formulario"
                    onClick={() => {
                      setActiveTab("tickets");
                      setShowEmbeddedTicketForm(true);
                      setEmbeddedTicketFeedback(null);
                    }}
                    disabled={!canCreateTicket}
                    disabledLabel="Exige empresa vinculada"
                    featured={recommendedAction === "ticket"}
                  />
                  <ActionCard
                    icon={<Waypoints className="h-4 w-4" />}
                    title="Hosts da empresa"
                    description="Abre a plataforma remota ja filtrada pela empresa deste contato para localizar hosts e iniciar atendimento."
                    href={resolved.remoteDirectoryHref}
                    disabled={!canOpenRemoteDirectory}
                    disabledLabel="Exige empresa vinculada"
                    featured={recommendedAction === "hosts"}
                  />
                  <ActionCard
                    icon={<Monitor className="h-4 w-4" />}
                    title="Host atual"
                    description={
                      resolved.remoteStatusText || resolved.remoteStatus
                        ? `Vai direto para o host sincronizado nesta conversa. Estado remoto atual: ${resolved.remoteStatusText || resolved.remoteStatus}.`
                        : "Vai direto para o host sincronizado nesta conversa, preservando o ticket quando ele ja existir."
                    }
                    href={resolved.remoteHostHref}
                    disabled={!canOpenHost}
                    disabledLabel="Sem host sincronizado"
                    featured={recommendedAction === "host"}
                  />
                </div>
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
                          Crie o ticket sem sair do Chatwoot e confira os ultimos atendimentos para evitar duplicidade.
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
                      <div className="rounded-lg border border-primary/20 bg-primary/5 p-3">
                        <form className="space-y-3" onSubmit={handleEmbeddedTicketSubmit}>
                          <div className="grid gap-3 sm:grid-cols-2">
                            <div className="space-y-1.5 sm:col-span-2">
                              <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                                Assunto
                              </label>
                              <Input
                                value={embeddedTicketForm.title}
                                onChange={(event) =>
                                  setEmbeddedTicketForm((current) => ({ ...current, title: event.target.value }))
                                }
                                placeholder="Resumo curto do problema"
                                className="bg-background"
                              />
                            </div>
                            <div className="space-y-1.5">
                              <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                                Prioridade
                              </label>
                              <Select
                                value={embeddedTicketForm.priority}
                                onValueChange={(value) =>
                                  setEmbeddedTicketForm((current) => ({
                                    ...current,
                                    priority: value as TicketPriorityOption,
                                  }))
                                }
                              >
                                <SelectTrigger className="bg-background">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="LOW">Baixa</SelectItem>
                                  <SelectItem value="NORMAL">Normal</SelectItem>
                                  <SelectItem value="HIGH">Alta</SelectItem>
                                  <SelectItem value="CRITICAL">Critica</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="space-y-1.5">
                              <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                                Empresa
                              </label>
                              <div className="rounded-md border border-border/60 bg-background px-3 py-2 text-sm text-foreground">
                                {resolved.companyName || resolved.companyId || "Sem empresa"}
                              </div>
                            </div>
                            <div className="space-y-1.5 sm:col-span-2">
                              <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                                Descricao
                              </label>
                              <Textarea
                                value={embeddedTicketForm.description}
                                onChange={(event) =>
                                  setEmbeddedTicketForm((current) => ({
                                    ...current,
                                    description: event.target.value,
                                  }))
                                }
                                placeholder="Descreva o problema validado pelo atendente"
                                className="min-h-[150px] bg-background"
                              />
                            </div>
                          </div>

                          {existingTicket ? (
                            <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-700 dark:text-amber-300">
                              Esta conversa ja referencia o ticket #{existingTicket.number}. Abra outro apenas se a demanda realmente precisar ser separada.
                            </div>
                          ) : null}

                          {embeddedTicketFeedback ? (
                            <InlineNotice tone={embeddedTicketFeedback.tone} message={embeddedTicketFeedback.message} />
                          ) : null}

                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <p className="text-xs text-muted-foreground">
                              O envio usa a mesma sessao do portal neste navegador e nao redireciona a conversa.
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

                    {existingTicket ? (
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
                    ) : null}

                    {!existingTicket && latestCompanyTicket ? (
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
                    ) : null}

                    {isLoadingTickets ? (
                      <InlineLoading label="Carregando tickets reais da empresa..." />
                    ) : null}
                    {ticketError ? (
                      <InlineWarning message={ticketError} />
                    ) : null}
                    {!isLoadingTickets && !ticketError && latestTickets.length === 0 ? (
                      <EmptyState label="Nenhum ticket recente encontrado para esta empresa." />
                    ) : null}
                    {!isLoadingTickets && !ticketError && latestTickets.length > 0 ? (
                      <div className="space-y-2">
                        {latestTickets.map((ticket) => (
                          <div key={ticket.id} className="rounded-lg border border-border/60 bg-card p-3">
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0">
                                <p className="truncate text-sm font-semibold text-foreground">
                                  #{ticket.number} · {ticket.title}
                                </p>
                                <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                                  <ContextBadge tone={ticket.number === resolved.ticketNumber ? "good" : "neutral"}>
                                    {ticket.statusLabel}
                                  </ContextBadge>
                                  <span className="inline-flex items-center gap-1">
                                    <Clock3 className="h-3 w-3" />
                                    {formatRelativeDate(ticket.updatedAt)}
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

              <TabsContent value="remote" className="space-y-3">
                <Card className="border-border/60">
                    <CardHeader className="pb-3">
                      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                        <div className="min-w-0">
                          <CardTitle className="flex items-center gap-2 text-sm">
                            <Monitor className="h-4 w-4 text-primary" />
                            Hosts da empresa
                          </CardTitle>
                          <CardDescription>
                            Lista curta dos hosts mais recentes para abrir o remoto com menos troca de tela.
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
                    {canOpenHost && resolved.remoteHostHref ? (
                      <div className="rounded-lg border border-primary/20 bg-primary/5 p-3">
                        <div className="flex items-center justify-between gap-2">
                          <div className="min-w-0">
                            <p className="text-xs font-semibold uppercase tracking-wide text-primary/80">Host recomendado</p>
                            <p className="mt-1 truncate text-sm font-semibold text-foreground">
                              {resolved.hostId}
                            </p>
                            <p className="mt-1 text-xs text-muted-foreground">
                              {resolved.remoteStatusText || resolved.remoteStatus || "Host sincronizado nesta conversa."}
                            </p>
                          </div>
                          <Button asChild size="sm" className="gap-2">
                            <Link href={resolved.remoteHostHref} target="_blank" rel="noreferrer">
                              <ArrowUpRight className="h-4 w-4" />
                              Abrir host
                            </Link>
                          </Button>
                        </div>
                      </div>
                    ) : null}

                    {!canOpenHost && recommendedHost ? (
                      <div className="rounded-lg border border-border/60 bg-muted/20 p-3">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                              Host mais recente da empresa
                            </p>
                            <p className="mt-1 truncate text-sm font-semibold text-foreground">{recommendedHost.name}</p>
                            <p className="mt-1 text-xs text-muted-foreground">
                              {recommendedHost.rustdeskId || "Sem RustDesk ID"} · {recommendedHost.productStatus}
                            </p>
                          </div>
                          <Button asChild variant="outline" size="sm">
                            <Link
                              href={`/portal/plataforma-remota/${recommendedHost.id}${resolved.ticketNumber ? `?ticketNumber=${encodeURIComponent(resolved.ticketNumber)}` : ""}`}
                              target="_blank"
                              rel="noreferrer"
                            >
                              Abrir
                            </Link>
                          </Button>
                        </div>
                      </div>
                    ) : null}

                    {isLoadingHosts ? (
                      <InlineLoading label="Carregando hosts reais da empresa..." />
                    ) : null}
                    {hostError ? (
                      <InlineWarning message={hostError} />
                    ) : null}
                    {!isLoadingHosts && !hostError && companyHosts.length === 0 ? (
                      <EmptyState label="Nenhum host recente encontrado para esta empresa." />
                    ) : null}
                    {!isLoadingHosts && !hostError && companyHosts.length > 0 ? (
                      <div className="space-y-2">
                        {companyHosts.map((host) => (
                          <div key={host.id} className="rounded-lg border border-border/60 bg-card p-3">
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0">
                                <p className="truncate text-sm font-semibold text-foreground">{host.name}</p>
                                <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                                  <ContextBadge tone={host.id === resolved.hostId ? "good" : "neutral"}>
                                    {host.productStatus}
                                  </ContextBadge>
                                  <span className="break-all font-mono">{host.rustdeskId || "Sem RustDesk ID"}</span>
                                  <span className="inline-flex items-center gap-1">
                                    <Clock3 className="h-3 w-3" />
                                    {formatRelativeDate(host.lastHeartbeatAt)}
                                  </span>
                                </div>
                              </div>
                              <Button asChild variant="outline" size="sm">
                                <Link href={`/portal/plataforma-remota/${host.id}${resolved.ticketNumber ? `?ticketNumber=${encodeURIComponent(resolved.ticketNumber)}` : ""}`} target="_blank" rel="noreferrer">
                                  Ver
                                </Link>
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : null}
                    <Button asChild variant="secondary" className="w-full gap-2">
                      <Link href={resolved.remoteDirectoryHref} target="_blank" rel="noreferrer">
                        <Waypoints className="h-4 w-4" />
                        Abrir listagem completa de remotos
                      </Link>
                    </Button>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>

            <details className="rounded-lg border border-border/60 bg-muted/20 p-3 text-xs text-muted-foreground">
              <summary className="flex cursor-pointer list-none items-center gap-2 font-semibold text-foreground">
                <Radio className="h-3.5 w-3.5 text-primary" />
                Diagnostico do contexto
              </summary>
              <p className="mt-2 text-[11px] text-muted-foreground">
                Use este bloco quando algo do Chatwoot nao bater com o cadastro do portal.
              </p>
              <div className="mt-3 grid gap-2 md:grid-cols-2">
                <DiagnosticLine label="conversation_id" value={resolved.conversationId} />
                <DiagnosticLine label="conversation_status" value={resolved.conversationStatus} />
                <DiagnosticLine label="contact_id" value={resolved.contactId} />
                <DiagnosticLine label="account_id" value={resolved.accountId} />
                <DiagnosticLine label="company_id" value={resolved.companyId} />
                <DiagnosticLine label="company_name" value={resolved.companyName} />
                <DiagnosticLine label="host_id" value={resolved.hostId} />
                <DiagnosticLine label="rustdesk_id" value={resolved.rustdeskId} />
                <DiagnosticLine label="ticket_number" value={resolved.ticketNumber} />
                <DiagnosticLine label="remote_status" value={resolved.remoteStatusText || resolved.remoteStatus} />
                <DiagnosticLine label="contact_phone" value={resolved.customerPhone} />
                <DiagnosticLine label="contact_email" value={resolved.customerEmail} />
              </div>
            </details>

            <div className="rounded-lg border border-border/60 bg-muted/20 p-3 text-xs text-muted-foreground">
              {resolved.currentAgentName ? `Agente atual: ${resolved.currentAgentName}. ` : ""}
              Este painel nao abre ticket automaticamente. Ele apenas concentra as acoes manuais de ticket e acesso remoto dentro da conversa do Chatwoot.
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function InfoCard({
  icon,
  label,
  value,
  helper,
}: {
  icon: ReactNode;
  label: string;
  value: string;
  helper: string;
}) {
  return (
    <div className="rounded-lg border border-border/60 bg-card p-3">
      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {icon}
        {label}
      </div>
      <p className="mt-2 break-words text-sm font-semibold text-foreground">{value}</p>
      <p className="mt-1 break-all text-xs text-muted-foreground">{helper}</p>
    </div>
  );
}

function MiniMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border/60 bg-background/70 px-3 py-2">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-1 text-sm font-semibold text-foreground">{value}</p>
    </div>
  );
}

function ActionCard({
  icon,
  title,
  description,
  href,
  onClick,
  disabled,
  disabledLabel,
  featured = false,
  actionLabel = "Abrir",
}: {
  icon: ReactNode;
  title: string;
  description: string;
  href?: string;
  onClick?: () => void;
  disabled: boolean;
  disabledLabel: string;
  featured?: boolean;
  actionLabel?: string;
}) {
  return (
    <div className={`rounded-lg border p-4 ${featured ? "border-primary/30 bg-primary/5" : "border-border/60 bg-card"}`}>
      <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
        {icon}
        {title}
      </div>
      <p className="mt-2 text-sm text-muted-foreground">{description}</p>
      <div className="mt-4">
        {disabled ? (
          <Button type="button" variant="outline" className="w-full gap-2" disabled>
            <ShieldAlert className="h-4 w-4" />
            {disabledLabel}
          </Button>
        ) : onClick ? (
          <Button type="button" className="w-full gap-2" variant={featured ? "default" : "secondary"} onClick={onClick}>
            <Ticket className="h-4 w-4" />
            {actionLabel}
          </Button>
        ) : (
          <Button asChild className="w-full gap-2" variant={featured ? "default" : "secondary"}>
            <Link href={href || "#"} target="_blank" rel="noreferrer">
              <ExternalLink className="h-4 w-4" />
              {actionLabel}
            </Link>
          </Button>
        )}
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

function DiagnosticLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-border/50 bg-background/70 px-3 py-2">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-1 break-all font-mono text-[11px] text-foreground">{value || "ausente"}</p>
    </div>
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

function formatRelativeDate(value: string | null) {
  if (!value) return "Sem registro";
  const parsed = Date.parse(value);
  if (!Number.isFinite(parsed)) return value;
  return new Date(parsed).toLocaleString("pt-BR");
}
