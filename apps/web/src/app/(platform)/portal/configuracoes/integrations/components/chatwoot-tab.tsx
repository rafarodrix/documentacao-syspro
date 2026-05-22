"use client";

import { useEffect, useMemo, useState } from "react";
import { Loader2, MessageSquare, RefreshCw, Save } from "lucide-react";
import { Button, Card, CardContent, CardDescription, CardHeader, CardTitle, Input } from "@dosc-syspro/ui";
import { toast } from "sonner";
import { useIntegrationDiagnostics } from "../hooks/use-integration-diagnostics";
import { useChatwootIntegrationSettings } from "../hooks/use-chatwoot-integration-settings";
import { useChatwootBehaviorSettings } from "../hooks/use-chatwoot-behavior-settings";
import { formatRuntimeKey } from "../integrations.helpers";
import { SectionCard } from "@/components/patterns";
import { LoadingState, InfoTile, StatusTile, StatusLine } from "../integrations-primitives";
import { BehaviorToggle, CopyInfoCard, FormField, SettingsGroup } from "../integration-form-primitives";
import { ChatwootConnectionForm } from "./chatwoot-connection-form";
import { ChatwootCsatSection } from "./chatwoot-csat-section";

export function ChatwootDiagnosticsTab() {
  const { diagnostics, isLoading, reload } = useIntegrationDiagnostics();
  const {
    integrationSettings,
    isLoading: isIntegrationSettingsLoading,
    isSaving: isIntegrationSettingsSaving,
    setIntegrationSettings,
    save: saveIntegrationSettings,
  } = useChatwootIntegrationSettings();
  const {
    behavior,
    isLoading: isBehaviorLoading,
    isSaving,
    setBehavior,
    save,
  } = useChatwootBehaviorSettings();

  const chatwoot = diagnostics?.chatwoot;
  const runtime = chatwoot?.runtime ?? {};
  const [portalOrigin, setPortalOrigin] = useState("");

  const ticketCreationAppUrl = useMemo(() => {
    const baseOrigin = portalOrigin || "https://SEU_PORTAL";
    const params = new URLSearchParams({
      source: "chatwoot",
      chatwootConversationId: "{{conversation.id}}",
      chatwootContactId: "{{contact.id}}",
      chatwootAccountId: "{{account.id}}",
      chatwootConversationUrl: "{{conversation.url}}",
      customerName: "{{contact.name}}",
      customerPhone: "{{contact.phone_number}}",
      customerWhatsapp: "{{contact.phone_number}}",
      customerEmail: "{{contact.email}}",
      subject: "{{contact.name}} - Novo ticket",
      description: "Atendimento originado no Chatwoot.",
    });
    return `${baseOrigin}/portal/tickets/novo?${params.toString()}`;
  }, [portalOrigin]);

  const dashboardAppUrl = useMemo(() => {
    const baseOrigin = portalOrigin || "https://SEU_PORTAL";
    return `${baseOrigin}/chatwoot/app`;
  }, [portalOrigin]);

  const remoteDirectoryAppUrl = useMemo(() => {
    const baseOrigin = portalOrigin || "https://SEU_PORTAL";
    const params = new URLSearchParams({
      tab: "hosts",
      companyId: "{{contact.custom_attributes.syspro_company_id}}",
      ticketNumber: "{{conversation.custom_attributes.ticket_number}}",
    });
    return `${baseOrigin}/portal/infraestrutura?${params.toString()}`;
  }, [portalOrigin]);

  const remoteHostAppUrl = useMemo(() => {
    const baseOrigin = portalOrigin || "https://SEU_PORTAL";
    return `${baseOrigin}/portal/infraestrutura/hosts/{{conversation.custom_attributes.host_id}}?ticketNumber={{conversation.custom_attributes.ticket_number}}`;
  }, [portalOrigin]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      setPortalOrigin(window.location.origin);
    }
  }, []);

  async function copyToClipboard(value: string, successMessage: string) {
    try {
      await navigator.clipboard.writeText(value);
      toast.success(successMessage);
    } catch {
      toast.error("Nao foi possivel copiar a URL.");
    }
  }

  return (
    <Card className="relative overflow-hidden border-border/40 bg-card/75 shadow-sm backdrop-blur-md dark:bg-zinc-950/45">
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent" />
      <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-primary" />
            Chatwoot
          </CardTitle>
          <CardDescription>
            Configure a operacao do Chatwoot com leitura mais clara do ambiente, da conexao principal e das automacoes.
          </CardDescription>
        </div>
        <Button variant="outline" size="sm" onClick={reload} disabled={isLoading}>
          {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
          Recarregar
        </Button>
      </CardHeader>
      <CardContent className="space-y-5">
        {isLoading ? (
          <LoadingState label="Carregando diagnostico do Chatwoot..." />
        ) : (
          <>
            <div className="grid gap-4 xl:grid-cols-[0.92fr_1.08fr]">
              <div className="grid gap-3 sm:grid-cols-3 xl:grid-cols-1">
                <StatusTile label="Status" ok={Boolean(chatwoot?.configured)} okText="Configurado" failText="Incompleto" />
                <InfoTile label="Origem" value={chatwoot?.source || "N/A"} />
                <InfoTile label="Conexoes ativas" value={String(chatwoot?.activeConnections ?? 0)} />
              </div>

              <SectionCard
                title="Leitura rapida do ambiente"
                description="Resumo tecnico do runtime e validacoes minimas do contexto ativo."
              >
                <div className="grid gap-3 md:grid-cols-2">
                  {Object.entries(runtime).map(([key, value]) => (
                    <StatusLine key={key} label={formatRuntimeKey(key)} ok={value} />
                  ))}
                </div>

                <details className="rounded-xl border border-dashed border-border/70 bg-muted/20 px-4 py-3">
                  <summary className="cursor-pointer text-sm font-medium text-foreground">Diagnostico tecnico bruto</summary>
                  <pre className="mt-3 overflow-x-auto rounded-lg border bg-background p-3 text-xs text-muted-foreground">
                    {JSON.stringify(chatwoot?.diagnostics ?? { info: "Nenhum contexto ativo resolvido." }, null, 2)}
                  </pre>
                </details>
              </SectionCard>
            </div>

            <SectionCard
              title="Conexao principal"
              description="Dados persistidos para URL, inbox, credenciais e webhook do ambiente principal."
              action={
                <Button size="sm" onClick={saveIntegrationSettings} disabled={isIntegrationSettingsLoading || isIntegrationSettingsSaving}>
                  {isIntegrationSettingsSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                  Salvar conexao
                </Button>
              }
            >
              {isIntegrationSettingsLoading ? (
                <LoadingState label="Carregando configuracao principal do Chatwoot..." />
              ) : (
                <ChatwootConnectionForm
                  integrationSettings={integrationSettings}
                  setIntegrationSettings={setIntegrationSettings}
                />
              )}
            </SectionCard>

            <SectionCard
              title="Automacoes do webhook"
              description="Regras aplicadas quando o Chatwoot envia eventos para o backend."
              action={
                <Button size="sm" onClick={save} disabled={isBehaviorLoading || isSaving}>
                  {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                  Salvar automacoes
                </Button>
              }
            >
              {isBehaviorLoading ? (
                <LoadingState label="Carregando automacoes do Chatwoot..." />
              ) : (
                <>
                  <SettingsGroup
                    title="Operacao e reabertura"
                    description="Atribuicao, rotulo do agente e retorno do cliente em conversas em espera."
                  >
                    <div className="grid gap-3 md:grid-cols-2">
                      <BehaviorToggle
                        id="prependAgentNameOnOutbound"
                        label="Enviar nome do atendente no WhatsApp"
                        description="Prefixa a resposta publica com o nome do agente."
                        checked={behavior.prependAgentNameOnOutbound}
                        onCheckedChange={(checked) => setBehavior((prev) => ({ ...prev, prependAgentNameOnOutbound: checked }))}
                      />
                      <BehaviorToggle
                        id="autoAssignOnFirstAgentReply"
                        label="Autoatribuir ao primeiro agente que responder"
                        description="Assume a conversa para o primeiro agente que responder sem responsavel definido."
                        checked={behavior.autoAssignOnFirstAgentReply}
                        onCheckedChange={(checked) => setBehavior((prev) => ({ ...prev, autoAssignOnFirstAgentReply: checked }))}
                      />
                      <BehaviorToggle
                        id="reopenConversationOnCustomerReply"
                        label="Permitir reabertura em conversa em espera"
                        description="Habilita a reabertura automatica de pending e snoozed."
                        checked={behavior.reopenConversationOnCustomerReply}
                        onCheckedChange={(checked) => setBehavior((prev) => ({ ...prev, reopenConversationOnCustomerReply: checked }))}
                      />
                      <BehaviorToggle
                        id="reopenSnoozedConversationOnCustomerReply"
                        label="Reabrir quando estiver adiada"
                        description="Quando ativo, novas mensagens do cliente em conversas snoozed reabrem para open."
                        checked={behavior.reopenSnoozedConversationOnCustomerReply}
                        onCheckedChange={(checked) => setBehavior((prev) => ({ ...prev, reopenSnoozedConversationOnCustomerReply: checked }))}
                        disabled={!behavior.reopenConversationOnCustomerReply}
                      />
                      <BehaviorToggle
                        id="reopenPendingConversationOnCustomerReply"
                        label="Reabrir tambem quando estiver pendente"
                        description="Ative apenas se quiser trazer pending de volta para open no primeiro retorno do cliente."
                        checked={behavior.reopenPendingConversationOnCustomerReply}
                        onCheckedChange={(checked) => setBehavior((prev) => ({ ...prev, reopenPendingConversationOnCustomerReply: checked }))}
                        disabled={!behavior.reopenConversationOnCustomerReply}
                      />
                      <BehaviorToggle
                        id="releaseConversationLinkOnResolved"
                        label="Liberar vinculo ao resolver"
                        description="Ao receber status resolved/archived, remove o vinculo local para uma proxima mensagem poder abrir nova conversa."
                        checked={behavior.releaseConversationLinkOnResolved}
                        onCheckedChange={(checked) => setBehavior((prev) => ({ ...prev, releaseConversationLinkOnResolved: checked }))}
                      />
                    </div>
                  </SettingsGroup>

                  <SettingsGroup
                    title="Identidade tecnica das mensagens do sistema"
                    description="Use um bot tecnico para CSAT e outras mensagens automaticas, sem expor um usuario administrativo."
                  >
                    <div className="grid min-w-0 gap-4">
                      <div className="grid min-w-0 gap-3 md:grid-cols-2">
                        <BehaviorToggle
                          id="systemMessagesUseBotIdentity"
                          label="Usar bot tecnico nas mensagens automaticas"
                          description="Quando ativo, o backend tenta enviar as mensagens de sistema com o token dedicado configurado abaixo."
                          checked={behavior.systemMessagesUseBotIdentity}
                          onCheckedChange={(checked) => setBehavior((prev) => ({ ...prev, systemMessagesUseBotIdentity: checked }))}
                        />
                      </div>
                      <FormField
                        id="systemMessageApiToken"
                        label="Token do bot no Chatwoot"
                        description="Access token do AgentBot ou usuario tecnico dedicado."
                      >
                        <Input
                          id="systemMessageApiToken"
                          type="password"
                          value={behavior.systemMessageApiToken}
                          onChange={(event) => setBehavior((prev) => ({ ...prev, systemMessageApiToken: event.target.value }))}
                          placeholder="Cole aqui o access token do AgentBot"
                        />
                      </FormField>
                    </div>
                  </SettingsGroup>

                  <ChatwootCsatSection behavior={behavior} setBehavior={setBehavior} />

                  <SettingsGroup
                    title="Apps e atalhos"
                    description="URLs prontas para o painel de aplicativos do Chatwoot e para atalhos externos do portal."
                  >
                    <div className="space-y-4 rounded-xl border border-primary/20 bg-primary/5 p-4">
                      <div className="text-sm text-muted-foreground">
                        Use o Dashboard App como entrada principal dentro do Chatwoot. Os outros links servem como atalhos externos para fluxos especificos.
                      </div>
                      <div className="grid gap-4 xl:grid-cols-2">
                        <CopyInfoCard
                          title="Dashboard App embutido"
                          description="Painel dentro da conversa com acoes manuais como criar ticket e abrir acesso remoto."
                          value={dashboardAppUrl}
                          copyLabel="Copiar URL do Dashboard App"
                          onCopy={() => copyToClipboard(dashboardAppUrl, "URL do Dashboard App copiada.")}
                        />
                        <CopyInfoCard
                          title="Atalho direto opcional para ticket"
                          description="Use apenas se quiser um link externo. Para o painel embutido, prefira a URL fixa acima."
                          value={ticketCreationAppUrl}
                          copyLabel="Copiar URL do app"
                          onCopy={() => copyToClipboard(ticketCreationAppUrl, "URL do app copiada.")}
                        />
                        <CopyInfoCard
                          title="Atalho para hosts da empresa"
                          description="Abre a plataforma remota filtrada pela empresa do contato e preserva o numero do ticket quando houver vinculo."
                          value={remoteDirectoryAppUrl}
                          copyLabel="Copiar URL dos hosts"
                          onCopy={() => copyToClipboard(remoteDirectoryAppUrl, "URL dos hosts copiada.")}
                        />
                        <CopyInfoCard
                          title="Atalho para host especifico"
                          description="Use quando a conversa ja tiver o atributo host_id sincronizado."
                          value={remoteHostAppUrl}
                          copyLabel="Copiar URL do host"
                          onCopy={() => copyToClipboard(remoteHostAppUrl, "URL do host copiada.")}
                        />
                      </div>
                    </div>
                  </SettingsGroup>
                </>
              )}
            </SectionCard>
          </>
        )}
      </CardContent>
    </Card>
  );
}
