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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

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

export function ChatwootDashboardApp() {
  const [context, setContext] = useState<ChatwootAppContext | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "empty">("loading");
  const [latestTickets, setLatestTickets] = useState<TicketListEntry[]>([]);
  const [isLoadingTickets, setIsLoadingTickets] = useState(false);
  const [ticketError, setTicketError] = useState<string | null>(null);
  const [companyHosts, setCompanyHosts] = useState<RemoteHostEntry[]>([]);
  const [isLoadingHosts, setIsLoadingHosts] = useState(false);
  const [hostError, setHostError] = useState<string | null>(null);

  useEffect(() => {
    function requestContext() {
      window.parent.postMessage("chatwoot-dashboard-app:fetch-info", "*");
    }

    function handleMessage(event: MessageEvent) {
      const next = parseChatwootContext(event.data);
      if (!next || (!next.conversation && !next.contact)) return;
      setContext(next);
      setStatus("ready");
    }

    window.addEventListener("message", handleMessage);
    requestContext();
    const retryHandle = window.setTimeout(() => {
      requestContext();
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
    if (companyId) ticketParams.set("companyId", companyId);

    const remoteDirectoryParams = new URLSearchParams();
    if (companyId) remoteDirectoryParams.set("companyId", companyId);
    if (ticketNumber) remoteDirectoryParams.set("ticketNumber", ticketNumber);

    return {
      companyId,
      companyName,
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
  }, [context]);

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
  }, [resolved.companyId]);

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
  }, [resolved.companyId]);

  return (
    <div className="min-h-screen bg-background p-4 text-foreground">
      <div className="mx-auto max-w-4xl space-y-4">
        <Card className="border-border/60 shadow-sm">
          <CardHeader className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <MessageSquare className="h-5 w-5 text-primary" />
                  Painel do Atendimento
                </CardTitle>
                <CardDescription>
                  Consulte o contexto do contato e abra ticket ou acesso remoto apenas quando o atendente decidir.
                </CardDescription>
              </div>
              <Badge variant="outline">
                {status === "ready" ? "Contexto carregado" : status === "loading" ? "Lendo contexto" : "Sem contexto"}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
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

            <div className="flex flex-wrap gap-2">
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

            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
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

            {!canCreateTicket ? (
              <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-700 dark:text-amber-300">
                Este contato ainda nao esta vinculado a uma empresa no portal. Nesse estado o app nao libera criacao manual de ticket.
              </div>
            ) : null}

            <Card className="border-primary/20 bg-primary/5">
              <CardContent className="flex flex-col gap-3 p-4 md:flex-row md:items-center md:justify-between">
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
                  <Button asChild className="gap-2">
                    <Link href={resolved.ticketHref} target="_blank" rel="noreferrer">
                      <Ticket className="h-4 w-4" />
                      Criar ticket manual
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

            <Tabs defaultValue="overview" className="w-full">
              <TabsList className="grid h-auto w-full grid-cols-3 p-1">
                <TabsTrigger value="overview" className="py-2">Visao geral</TabsTrigger>
                <TabsTrigger value="tickets" className="py-2">Tickets</TabsTrigger>
                <TabsTrigger value="remote" className="py-2">Remoto</TabsTrigger>
              </TabsList>

              <TabsContent value="overview" className="space-y-3">
                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                  <ActionCard
                    icon={<Ticket className="h-4 w-4" />}
                    title="Criar ticket"
                    description={
                      resolved.ticketNumber
                        ? `Ja existe o ticket #${resolved.ticketNumber} neste atendimento. Abra outro apenas se realmente precisar separar a demanda.`
                        : "Abre a tela de novo chamado com o contexto do atendimento. Use apenas quando a conversa precisar virar ticket."
                    }
                    href={resolved.ticketHref}
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
                    <CardTitle className="flex items-center gap-2 text-sm">
                      <Ticket className="h-4 w-4 text-primary" />
                      Tickets da empresa
                    </CardTitle>
                    <CardDescription>
                      Mostra os ultimos tickets do portal para evitar duplicidade e ajudar na continuidade do atendimento.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
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
                    <CardTitle className="flex items-center gap-2 text-sm">
                      <Monitor className="h-4 w-4 text-primary" />
                      Hosts da empresa
                    </CardTitle>
                    <CardDescription>
                      Lista curta dos hosts mais recentes para abrir o remoto com menos troca de tela.
                    </CardDescription>
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

function ActionCard({
  icon,
  title,
  description,
  href,
  disabled,
  disabledLabel,
  featured = false,
}: {
  icon: ReactNode;
  title: string;
  description: string;
  href: string;
  disabled: boolean;
  disabledLabel: string;
  featured?: boolean;
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
        ) : (
          <Button asChild className="w-full gap-2" variant={featured ? "default" : "secondary"}>
            <Link href={href} target="_blank" rel="noreferrer">
              <ExternalLink className="h-4 w-4" />
              Abrir
            </Link>
          </Button>
        )}
      </div>
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
