"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import Link from "next/link";
import {
  Building2,
  ExternalLink,
  Headphones,
  Loader2,
  MessageSquare,
  Monitor,
  ShieldAlert,
  Ticket,
  Waypoints,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

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
      hostId,
      rustdeskId,
      ticketNumber,
      contactName,
      customerEmail,
      customerPhone,
      conversationId,
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

            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              <InfoCard
                icon={<Building2 className="h-4 w-4 text-primary" />}
                label="Empresa"
                value={resolved.companyName || "Nao vinculada"}
                helper={resolved.companyId || "Contato sem empresa no portal"}
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

            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              <ActionCard
                icon={<Ticket className="h-4 w-4" />}
                title="Criar ticket"
                description="Abre a tela de novo chamado com o contexto do atendimento. Use apenas quando a conversa precisar virar ticket."
                href={resolved.ticketHref}
                disabled={!canCreateTicket}
                disabledLabel="Exige empresa vinculada"
              />
              <ActionCard
                icon={<Waypoints className="h-4 w-4" />}
                title="Hosts da empresa"
                description="Abre a plataforma remota ja filtrada pela empresa deste contato para localizar hosts e iniciar atendimento."
                href={resolved.remoteDirectoryHref}
                disabled={!canOpenRemoteDirectory}
                disabledLabel="Exige empresa vinculada"
              />
              <ActionCard
                icon={<Monitor className="h-4 w-4" />}
                title="Host atual"
                description="Vai direto para o host sincronizado nesta conversa, preservando o ticket quando ele ja existir."
                href={resolved.remoteHostHref}
                disabled={!canOpenHost}
                disabledLabel="Sem host sincronizado"
              />
            </div>

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
}: {
  icon: ReactNode;
  title: string;
  description: string;
  href: string;
  disabled: boolean;
  disabledLabel: string;
}) {
  return (
    <div className="rounded-lg border border-border/60 bg-card p-4">
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
          <Button asChild className="w-full gap-2">
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
