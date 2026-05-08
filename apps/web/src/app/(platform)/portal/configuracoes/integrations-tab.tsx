"use client";

import { useEffect, useMemo, useState } from "react";
import { Bot, CheckCircle2, HardDrive, Loader2, MessageSquare, Plug, RefreshCw, Save, Server, TriangleAlert } from "lucide-react";
import {
  DEFAULT_CHATWOOT_BEHAVIOR_SETTINGS,
  DEFAULT_CHATWOOT_INTEGRATION_SETTINGS,
  chatwootBehaviorSettingsSchema,
  chatwootIntegrationSettingsSchema,
  type ChatwootBehaviorSettings,
  type ChatwootIntegrationSettings,
} from "@dosc-syspro/contracts/chatwoot";
import { toast } from "sonner";

import EvolutionSettingsTab from "./evolution-tab";
import {
  SettingsPageIntro,
  SettingsTabsRail,
  SettingsTabsRailTrigger,
} from "./settings-shell";
import { Badge, Button, Card, CardContent, CardDescription, CardHeader, CardTitle, Checkbox, Input, Label, Select, SelectContent, SelectItem, SelectTrigger, SelectValue, Tabs, TabsContent, Textarea } from "@dosc-syspro/ui";

type IntegrationDiagnostics = {
  success: boolean;
  chatwoot?: {
    configured: boolean;
    source: string | null;
    activeConnections: number;
    runtime: Record<string, boolean>;
    diagnostics: unknown;
    behavior?: ChatwootBehaviorSettings;
  };
  storage?: {
    provider: string;
    configured: boolean;
    mode: "public_base_url" | "signed_url";
    endpointHost: string | null;
    bucketName: string | null;
    publicBaseUrl: string | null;
    signedUrlTtlSeconds: number;
    hasAccessKeyId: boolean;
    hasSecretAccessKey: boolean;
    issues: string[];
  };
  error?: string;
};

export function IntegrationsSettingsTab() {
  return (
    <div className="space-y-6">
      <SettingsPageIntro
        icon={Plug}
        eyebrow="Conectores"
        title="Integracoes"
        description="Centralize os conectores operacionais do portal em um fluxo unico de consulta, configuracao e diagnostico. Segredos continuam protegidos no backend e no runtime."
      />

      <Tabs defaultValue="chatwoot" className="space-y-5">
        <SettingsTabsRail className="sm:grid-cols-3">
          <SettingsTabsRailTrigger
            value="chatwoot"
            icon={MessageSquare}
            title="Chatwoot"
          />
          <SettingsTabsRailTrigger
            value="evolution"
            icon={Bot}
            title="Evolution"
          />
          <SettingsTabsRailTrigger
            value="storage"
            icon={HardDrive}
            title="Storage"
          />
        </SettingsTabsRail>

        <TabsContent value="chatwoot" className="focus-visible:ring-0">
          <ChatwootDiagnosticsTab />
        </TabsContent>

        <TabsContent value="evolution" className="focus-visible:ring-0">
          <EvolutionSettingsTab />
        </TabsContent>

        <TabsContent value="storage" className="focus-visible:ring-0">
          <StorageDiagnosticsTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function ChatwootDiagnosticsTab() {
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
  const csatCanReopen = behavior.csatEnabled && behavior.csatReopenOnLowScore;
  const csatRequestLength = behavior.csatRequestMessage.trim().length;
  const csatThankYouLength = behavior.csatThankYouMessage.trim().length;
  const csatInvalidReplyRetryLength = behavior.csatInvalidReplyRetryMessage.trim().length;
  const csatInvalidReplyFinalLength = behavior.csatInvalidReplyFinalMessage.trim().length;

  useEffect(() => {
    if (typeof window !== "undefined") {
      setPortalOrigin(window.location.origin);
    }
  }, []);

  return (
    <Card className="border-border/60 bg-card/95 shadow-sm">
      <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-primary" />
            Chatwoot
          </CardTitle>
          <CardDescription>
            Diagnostico seguro da integracao usada para atendimento, inbox e roteamento de mensagens.
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
            <div className="grid gap-3 md:grid-cols-3">
              <StatusTile label="Status" ok={Boolean(chatwoot?.configured)} okText="Configurado" failText="Incompleto" />
              <InfoTile label="Origem" value={chatwoot?.source || "N/A"} />
              <InfoTile label="Conexoes ativas" value={String(chatwoot?.activeConnections ?? 0)} />
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              {Object.entries(runtime).map(([key, value]) => (
                <StatusLine key={key} label={formatRuntimeKey(key)} ok={value} />
              ))}
            </div>

            <pre className="overflow-x-auto rounded-lg border bg-muted/30 p-3 text-xs text-muted-foreground">
              {JSON.stringify(chatwoot?.diagnostics ?? { info: "Nenhum contexto ativo resolvido." }, null, 2)}
            </pre>

            <div className="space-y-4 rounded-2xl border border-border/60 bg-muted/15 p-4 md:p-5">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <h3 className="text-base font-semibold">Conexao principal do Chatwoot</h3>
                  <p className="text-sm text-muted-foreground">
                    Configuracao persistida para URL, inbox, credenciais e webhook. Em SaaS, isso substitui o uso exclusivo de variaveis de ambiente.
                  </p>
                </div>
                <Button size="sm" onClick={saveIntegrationSettings} disabled={isIntegrationSettingsLoading || isIntegrationSettingsSaving}>
                  {isIntegrationSettingsSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                  Salvar conexao
                </Button>
              </div>

              {isIntegrationSettingsLoading ? (
                <LoadingState label="Carregando configuracao principal do Chatwoot..." />
              ) : (
                <div className="grid min-w-0 gap-4 md:grid-cols-2">
                  <div className="min-w-0 space-y-2">
                    <Label htmlFor="chatwoot-url">URL</Label>
                    <Input
                      id="chatwoot-url"
                      value={integrationSettings.url}
                      onChange={(event) => setIntegrationSettings((prev) => ({ ...prev, url: event.target.value }))}
                      placeholder="https://chatwoot.seudominio.com"
                    />
                  </div>
                  <div className="min-w-0 space-y-2">
                    <Label htmlFor="chatwoot-account-id">Account ID</Label>
                    <Input
                      id="chatwoot-account-id"
                      value={integrationSettings.accountId}
                      onChange={(event) => setIntegrationSettings((prev) => ({ ...prev, accountId: event.target.value }))}
                      placeholder="1"
                    />
                  </div>
                  <div className="min-w-0 space-y-2">
                    <Label htmlFor="chatwoot-api-token">API Token</Label>
                    <Input
                      id="chatwoot-api-token"
                      type="password"
                      value={integrationSettings.apiToken}
                      onChange={(event) => setIntegrationSettings((prev) => ({ ...prev, apiToken: event.target.value }))}
                      placeholder="Token principal do Chatwoot"
                    />
                  </div>
                  <div className="min-w-0 space-y-2">
                    <Label htmlFor="chatwoot-platform-api-token">Platform API Token</Label>
                    <Input
                      id="chatwoot-platform-api-token"
                      type="password"
                      value={integrationSettings.platformApiToken}
                      onChange={(event) => setIntegrationSettings((prev) => ({ ...prev, platformApiToken: event.target.value }))}
                      placeholder="Token da Platform API"
                    />
                  </div>
                  <div className="min-w-0 space-y-2">
                    <Label htmlFor="chatwoot-inbox-id">Inbox ID</Label>
                    <Input
                      id="chatwoot-inbox-id"
                      value={integrationSettings.inboxId}
                      onChange={(event) => setIntegrationSettings((prev) => ({ ...prev, inboxId: event.target.value }))}
                      placeholder="123"
                    />
                  </div>
                  <div className="min-w-0 space-y-2">
                    <Label htmlFor="chatwoot-inbox-identifier">Inbox Identifier</Label>
                    <Input
                      id="chatwoot-inbox-identifier"
                      value={integrationSettings.inboxIdentifier}
                      onChange={(event) => setIntegrationSettings((prev) => ({ ...prev, inboxIdentifier: event.target.value }))}
                      placeholder="whatsapp-suporte"
                    />
                  </div>
                  <div className="min-w-0 space-y-2">
                    <Label htmlFor="chatwoot-webhook-secret">Webhook Secret</Label>
                    <Input
                      id="chatwoot-webhook-secret"
                      type="password"
                      value={integrationSettings.webhookSecret}
                      onChange={(event) => setIntegrationSettings((prev) => ({ ...prev, webhookSecret: event.target.value }))}
                      placeholder="Secret do webhook"
                    />
                  </div>
                  <div className="min-w-0 space-y-2">
                    <Label htmlFor="chatwoot-webhook-skew">Tolerancia do webhook (segundos)</Label>
                    <Input
                      id="chatwoot-webhook-skew"
                      type="number"
                      min={1}
                      max={3600}
                      value={integrationSettings.webhookMaxSkewSeconds}
                      onChange={(event) =>
                        setIntegrationSettings((prev) => ({
                          ...prev,
                          webhookMaxSkewSeconds: Number(event.target.value || prev.webhookMaxSkewSeconds),
                        }))
                      }
                    />
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-4 rounded-2xl border border-border/60 bg-muted/15 p-4 md:p-5">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <h3 className="text-base font-semibold">Automacoes do Webhook</h3>
                  <p className="text-sm text-muted-foreground">
                    Regras aplicadas quando o Chatwoot envia eventos para o backend.
                  </p>
                </div>
                <Button size="sm" onClick={save} disabled={isBehaviorLoading || isSaving}>
                  {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                  Salvar
                </Button>
              </div>

              {isBehaviorLoading ? (
                <LoadingState label="Carregando automacoes do Chatwoot..." />
              ) : (
                <>
                <div className="grid gap-3 md:grid-cols-2">
                  <BehaviorToggle
                    id="prependAgentNameOnOutbound"
                    label="Enviar nome do atendente no WhatsApp"
                    description="Prefixa a resposta enviada ao cliente com o nome do atendente em destaque, por exemplo '*Rafael Rodrigues:* Olá, como posso ajudar?'."
                    checked={behavior.prependAgentNameOnOutbound}
                    onCheckedChange={(checked) =>
                      setBehavior((prev) => ({ ...prev, prependAgentNameOnOutbound: checked }))
                    }
                  />
                  <BehaviorToggle
                    id="autoAssignOnFirstAgentReply"
                    label="Autoatribuir ao primeiro agente que responder"
                    description="Quando uma mensagem de saida de agente chegar sem responsavel na conversa, o backend atribui a conversa a esse agente."
                    checked={behavior.autoAssignOnFirstAgentReply}
                    onCheckedChange={(checked) =>
                      setBehavior((prev) => ({ ...prev, autoAssignOnFirstAgentReply: checked }))
                    }
                  />
                  <BehaviorToggle
                    id="markConversationPendingOnAgentReply"
                    label="Marcar como pendente apos resposta do agente"
                    description="Ao enviar resposta publica do agente, o backend tenta mover a conversa para pending. A primeira resposta apos uma reabertura automatica do cliente nao repende a conversa."
                    checked={behavior.markConversationPendingOnAgentReply}
                    onCheckedChange={(checked) =>
                      setBehavior((prev) => ({ ...prev, markConversationPendingOnAgentReply: checked }))
                    }
                  />
                  <BehaviorToggle
                    id="reopenConversationOnCustomerReply"
                    label="Reabrir quando o cliente responder"
                    description="Chave mestre da reabertura automatica para conversas em pending ou snoozed. Conversas resolved ou archived sempre iniciam um novo atendimento."
                    checked={behavior.reopenConversationOnCustomerReply}
                    onCheckedChange={(checked) =>
                      setBehavior((prev) => ({ ...prev, reopenConversationOnCustomerReply: checked }))
                    }
                  />
                  <div className="flex min-w-0 min-h-28 flex-col gap-3 rounded-lg border bg-background p-4">
                    <div className="min-w-0 space-y-1">
                      <Label className="text-sm font-medium">
                        Politica para conversa resolvida
                      </Label>
                      <span className="block break-words text-sm text-muted-foreground">
                        O comportamento legado de reabrir a conversa atual foi removido. Mensagens novas em conversas resolved ou archived sempre abrem uma nova conversa.
                      </span>
                    </div>
                    <div className="rounded-md border border-border/60 bg-muted/20 px-3 py-2 text-sm text-foreground">
                      Abrir nova conversa
                    </div>
                  </div>
                  <BehaviorToggle
                    id="reopenSnoozedConversationOnCustomerReply"
                    label="Reabrir quando estiver adiada"
                    description="Quando ativo, novas mensagens do cliente em conversas snoozed reabrem para open."
                    checked={behavior.reopenSnoozedConversationOnCustomerReply}
                    onCheckedChange={(checked) =>
                      setBehavior((prev) => ({ ...prev, reopenSnoozedConversationOnCustomerReply: checked }))
                    }
                    disabled={!behavior.reopenConversationOnCustomerReply}
                  />
                  <BehaviorToggle
                    id="reopenPendingConversationOnCustomerReply"
                    label="Reabrir tambem quando estiver pendente"
                    description="Quando ativo, resposta do cliente em conversa pending tambem promove para open. Deixe desligado para evitar ruido operacional no Chatwoot."
                    checked={behavior.reopenPendingConversationOnCustomerReply}
                    onCheckedChange={(checked) =>
                      setBehavior((prev) => ({ ...prev, reopenPendingConversationOnCustomerReply: checked }))
                    }
                    disabled={!behavior.reopenConversationOnCustomerReply}
                  />
                  <BehaviorToggle
                    id="releaseConversationLinkOnResolved"
                    label="Liberar vinculo ao resolver"
                    description="Ao receber status resolved/archived, remove o vinculo local para uma proxima mensagem poder abrir nova conversa."
                    checked={behavior.releaseConversationLinkOnResolved}
                    onCheckedChange={(checked) =>
                      setBehavior((prev) => ({ ...prev, releaseConversationLinkOnResolved: checked }))
                    }
                  />
                  <BehaviorToggle
                    id="ticketCreationAppEnabled"
                    label="Preparar Dashboard App do Chatwoot"
                    description="Mantem a opcao registrada para habilitar o painel embutido do Chatwoot com ticket manual e acesso remoto no portal."
                    checked={behavior.ticketCreationAppEnabled}
                    onCheckedChange={(checked) =>
                      setBehavior((prev) => ({ ...prev, ticketCreationAppEnabled: checked }))
                    }
                  />
                </div>

                <div className="grid min-w-0 gap-4 rounded-lg border bg-background p-4">
                  <div className="min-w-0">
                    <h4 className="text-sm font-semibold">Identidade tecnica das mensagens do sistema</h4>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Use um bot tecnico para CSAT e outras mensagens automaticas, evitando que o nome do admin apareca no Chatwoot e no WhatsApp.
                    </p>
                  </div>

                  <div className="grid min-w-0 gap-3 md:grid-cols-2">
                    <BehaviorToggle
                      id="systemMessagesUseBotIdentity"
                      label="Usar bot tecnico nas mensagens automaticas"
                      description="Quando ativo, o backend tenta enviar as mensagens de sistema com o token dedicado configurado abaixo."
                      checked={behavior.systemMessagesUseBotIdentity}
                      onCheckedChange={(checked) =>
                        setBehavior((prev) => ({ ...prev, systemMessagesUseBotIdentity: checked }))
                      }
                    />
                  </div>

                  <div className="min-w-0 space-y-2">
                    <Label htmlFor="systemMessageApiToken">Token do bot no Chatwoot</Label>
                    <Input
                      id="systemMessageApiToken"
                      type="password"
                      value={behavior.systemMessageApiToken}
                      onChange={(event) =>
                        setBehavior((prev) => ({ ...prev, systemMessageApiToken: event.target.value }))
                      }
                      placeholder="Cole aqui o access token do AgentBot"
                    />
                    <p className="text-xs text-muted-foreground">
                      Token dedicado do AgentBot/usuario tecnico. O nome usado nas mensagens passa a ser o proprio nome configurado no Chatwoot para esse bot.
                    </p>
                  </div>
                </div>

                <div className="grid min-w-0 gap-4 rounded-lg border bg-background p-4">
                  <div className="min-w-0">
                    <h4 className="text-sm font-semibold">CSAT no WhatsApp</h4>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Envia avaliacao automatica quando a conversa for resolvida no Chatwoot e trata a resposta do cliente no webhook.
                    </p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <Badge variant="outline">1 Pessimo</Badge>
                      <Badge variant="outline">2 Ruim</Badge>
                      <Badge variant="outline">3 Regular</Badge>
                      <Badge variant="outline">4 Bom</Badge>
                      <Badge variant="outline">5 Excelente</Badge>
                    </div>
                  </div>

                  <div className="grid min-w-0 gap-3 md:grid-cols-2">
                    <BehaviorToggle
                      id="csatEnabled"
                      label="Habilitar CSAT automatico"
                      description="Ativa a pesquisa automatica no fechamento da conversa. A politica abaixo define se vale para resolved e archived ou apenas resolved."
                      checked={behavior.csatEnabled}
                      onCheckedChange={(checked) =>
                        setBehavior((prev) => ({ ...prev, csatEnabled: checked }))
                      }
                    />
                    <BehaviorToggle
                      id="sendCsatThankYouMessage"
                      label="Enviar mensagem apos a nota"
                      description="Quando o cliente responder a avaliacao com uma nota valida, o backend envia uma confirmacao final."
                      checked={behavior.sendCsatThankYouMessage}
                      onCheckedChange={(checked) =>
                        setBehavior((prev) => ({ ...prev, sendCsatThankYouMessage: checked }))
                      }
                    />
                    <BehaviorToggle
                      id="csatReopenOnLowScore"
                      label="Reabrir conversa em nota baixa"
                      description="Quando o cliente responder com nota igual ou abaixo do limite, o backend reabre a conversa automaticamente."
                      checked={behavior.csatReopenOnLowScore}
                      onCheckedChange={(checked) =>
                        setBehavior((prev) => ({ ...prev, csatReopenOnLowScore: checked }))
                      }
                    />
                  </div>

                  <div className="grid min-w-0 gap-4 md:grid-cols-2">
                    <div className={`min-w-0 space-y-2 ${!behavior.csatEnabled ? "opacity-60" : ""}`}>
                      <Label htmlFor="csatTriggerStatus">Disparar CSAT quando status for</Label>
                      <Select
                        value={behavior.csatTriggerStatus}
                        onValueChange={(value) =>
                          setBehavior((prev) => ({
                            ...prev,
                            csatTriggerStatus: value as ChatwootBehaviorSettings["csatTriggerStatus"],
                          }))
                        }
                        disabled={!behavior.csatEnabled}
                      >
                        <SelectTrigger id="csatTriggerStatus">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="resolved_or_archived">Resolved ou archived</SelectItem>
                          <SelectItem value="resolved_only">Apenas resolved</SelectItem>
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-muted-foreground">
                        Use `apenas resolved` se a sua operacao arquiva conversas por rotina tecnica e nao quer disparar avaliacao nesses casos.
                      </p>
                    </div>

                    <div className="min-w-0 space-y-2">
                      <Label htmlFor="csatLowScoreThreshold">Limite de nota baixa</Label>
                      <Input
                        id="csatLowScoreThreshold"
                        type="number"
                        min={1}
                        max={5}
                        value={behavior.csatLowScoreThreshold}
                        disabled={!csatCanReopen}
                        onChange={(event) =>
                          setBehavior((prev) => ({
                            ...prev,
                            csatLowScoreThreshold: Number(event.target.value || prev.csatLowScoreThreshold),
                          }))
                        }
                      />
                      <p className="text-xs text-muted-foreground">
                        {csatCanReopen
                          ? "Notas ate esse valor reabrem a conversa automaticamente."
                          : "Disponivel apenas quando o CSAT estiver ativo e a reabertura por nota baixa estiver habilitada."}
                      </p>
                    </div>

                    <div className="min-w-0 space-y-2">
                      <Label htmlFor="csatPendingTimeoutHours">Timeout do CSAT (horas)</Label>
                      <Input
                        id="csatPendingTimeoutHours"
                        type="number"
                        min={1}
                        max={168}
                        value={behavior.csatPendingTimeoutHours}
                        onChange={(event) =>
                          setBehavior((prev) => ({
                            ...prev,
                            csatPendingTimeoutHours: Number(event.target.value || prev.csatPendingTimeoutHours),
                          }))
                        }
                      />
                      <p className="text-xs text-muted-foreground">Registrado no estado do Chatwoot para uso do fluxo operacional e timeout assistido.</p>
                    </div>

                    <div className="min-w-0 space-y-2">
                      <Label htmlFor="csatInvalidReplyMaxAttempts">Tentativas de resposta invalida</Label>
                      <Input
                        id="csatInvalidReplyMaxAttempts"
                        type="number"
                        min={1}
                        max={10}
                        value={behavior.csatInvalidReplyMaxAttempts}
                        disabled={!behavior.csatEnabled}
                        onChange={(event) =>
                          setBehavior((prev) => ({
                            ...prev,
                            csatInvalidReplyMaxAttempts: Number(event.target.value || prev.csatInvalidReplyMaxAttempts),
                          }))
                        }
                      />
                      <p className="text-xs text-muted-foreground">
                        Quantas vezes o cliente pode responder fora da faixa de 1 a 5 antes do sistema encerrar a avaliacao e forcar um novo atendimento.
                      </p>
                    </div>
                  </div>

                  <div className="grid min-w-0 gap-4 md:grid-cols-2">
                    <div className="min-w-0 space-y-2">
                      <div className="flex items-center justify-between gap-3">
                        <Label htmlFor="csatRequestMessage">Mensagem de solicitacao</Label>
                        <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                          <span>{csatRequestLength}/2000</span>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-7 px-2 text-[11px]"
                            onClick={() =>
                              setBehavior((prev) => ({
                                ...prev,
                                csatRequestMessage: DEFAULT_CHATWOOT_BEHAVIOR_SETTINGS.csatRequestMessage,
                              }))
                            }
                          >
                            Restaurar
                          </Button>
                        </div>
                      </div>
                      <Textarea
                        id="csatRequestMessage"
                        className="min-h-40"
                        value={behavior.csatRequestMessage}
                        onChange={(event) =>
                          setBehavior((prev) => ({ ...prev, csatRequestMessage: event.target.value }))
                        }
                      />
                      <p className="text-xs text-muted-foreground">
                        Essa mensagem e enviada logo apos a conversa ser resolvida.
                      </p>
                    </div>
                    <div className="min-w-0 space-y-2">
                      <div className="flex items-center justify-between gap-3">
                        <Label htmlFor="csatThankYouMessage">Mensagem pos-avaliacao</Label>
                        <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                          <span>{csatThankYouLength}/1000</span>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-7 px-2 text-[11px]"
                            onClick={() =>
                              setBehavior((prev) => ({
                                ...prev,
                                csatThankYouMessage: DEFAULT_CHATWOOT_BEHAVIOR_SETTINGS.csatThankYouMessage,
                              }))
                            }
                          >
                            Restaurar
                          </Button>
                        </div>
                      </div>
                      <Textarea
                        id="csatThankYouMessage"
                        className="min-h-40"
                        value={behavior.csatThankYouMessage}
                        disabled={!behavior.sendCsatThankYouMessage}
                        onChange={(event) =>
                          setBehavior((prev) => ({ ...prev, csatThankYouMessage: event.target.value }))
                        }
                      />
                      <p className="text-xs text-muted-foreground">
                        {behavior.sendCsatThankYouMessage
                          ? "Enviada depois que o cliente responde com uma nota valida."
                          : "Ative a automacao acima para enviar essa confirmacao final."}
                      </p>
                    </div>
                    <div className="min-w-0 space-y-2">
                      <div className="flex items-center justify-between gap-3">
                        <Label htmlFor="csatInvalidReplyRetryMessage">Mensagem para resposta invalida</Label>
                        <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                          <span>{csatInvalidReplyRetryLength}/1000</span>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-7 px-2 text-[11px]"
                            onClick={() =>
                              setBehavior((prev) => ({
                                ...prev,
                                csatInvalidReplyRetryMessage: DEFAULT_CHATWOOT_BEHAVIOR_SETTINGS.csatInvalidReplyRetryMessage,
                              }))
                            }
                          >
                            Restaurar
                          </Button>
                        </div>
                      </div>
                      <Textarea
                        id="csatInvalidReplyRetryMessage"
                        className="min-h-32"
                        value={behavior.csatInvalidReplyRetryMessage}
                        disabled={!behavior.csatEnabled}
                        onChange={(event) =>
                          setBehavior((prev) => ({ ...prev, csatInvalidReplyRetryMessage: event.target.value }))
                        }
                      />
                      <p className="text-xs text-muted-foreground">
                        Enviada quando o cliente responde algo diferente de uma nota valida. O contador de tentativa e acrescentado pelo backend.
                      </p>
                    </div>
                    <div className="min-w-0 space-y-2">
                      <div className="flex items-center justify-between gap-3">
                        <Label htmlFor="csatInvalidReplyFinalMessage">Mensagem ao encerrar a avaliacao</Label>
                        <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                          <span>{csatInvalidReplyFinalLength}/1000</span>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-7 px-2 text-[11px]"
                            onClick={() =>
                              setBehavior((prev) => ({
                                ...prev,
                                csatInvalidReplyFinalMessage: DEFAULT_CHATWOOT_BEHAVIOR_SETTINGS.csatInvalidReplyFinalMessage,
                              }))
                            }
                          >
                            Restaurar
                          </Button>
                        </div>
                      </div>
                      <Textarea
                        id="csatInvalidReplyFinalMessage"
                        className="min-h-32"
                        value={behavior.csatInvalidReplyFinalMessage}
                        disabled={!behavior.csatEnabled}
                        onChange={(event) =>
                          setBehavior((prev) => ({ ...prev, csatInvalidReplyFinalMessage: event.target.value }))
                        }
                      />
                      <p className="text-xs text-muted-foreground">
                        Enviada quando o limite de respostas invalidas e atingido e a proxima mensagem do cliente passara a abrir um novo atendimento.
                      </p>
                    </div>
                  </div>

                  <div className="rounded-lg border border-border/60 bg-muted/20 p-3 text-xs text-muted-foreground">
                    Fluxo atual:
                    <span className="ml-1 text-foreground">
                      {behavior.markConversationPendingOnAgentReply
                        ? "resposta publica do agente -> pending (exceto 1a resposta apos reabertura automatica)"
                        : "resposta publica do agente"}
                      {" -> "}resolver conversa
                      {behavior.csatTriggerStatus === "resolved_only" ? " (apenas status resolved)" : " (status resolved ou archived)"}
                      {" -> "}enviar CSAT
                      {" -> "}aguardar resposta por ate {behavior.csatPendingTimeoutHours}h
                      {" -> "}cobrar nota invalida ate {behavior.csatInvalidReplyMaxAttempts}x
                      {behavior.sendCsatThankYouMessage ? " -> confirmar recebimento da nota" : ""}
                      {csatCanReopen ? ` -> reabrir se nota <= ${behavior.csatLowScoreThreshold}` : ""}
                      {" -> "}nova conversa apos esgotar tentativas
                    </span>
                  </div>

                  {behavior.ticketCreationAppEnabled && (
                    <div className="min-w-0 space-y-3 rounded-lg border border-primary/20 bg-primary/5 p-3 text-sm text-muted-foreground">
                      <p className="break-words">
                        O portal aceita a abertura direta em
                        <span className="mx-1 break-all font-mono text-foreground">/portal/tickets/novo?source=chatwoot</span>
                        com os parametros
                        <span className="mx-1 break-all font-mono text-foreground">chatwootConversationId</span>,
                        <span className="mx-1 break-all font-mono text-foreground">chatwootContactId</span>,
                        <span className="mx-1 break-all font-mono text-foreground">chatwootAccountId</span>,
                        <span className="mx-1 break-all font-mono text-foreground">chatwootConversationUrl</span>,
                        <span className="mx-1 break-all font-mono text-foreground">customerName</span>,
                        <span className="mx-1 break-all font-mono text-foreground">customerPhone</span>,
                        <span className="mx-1 break-all font-mono text-foreground">customerWhatsapp</span>,
                        <span className="mx-1 break-all font-mono text-foreground">customerEmail</span>,
                        <span className="mx-1 break-all font-mono text-foreground">companyId</span>,
                        <span className="mx-1 break-all font-mono text-foreground">subject</span>
                        e
                        <span className="ml-1 break-all font-mono text-foreground">description</span>.
                      </p>
                      <p className="mt-2">
                        Quando esse link for usado, a tela de criacao ja abre vinculada ao atendimento importado do Chatwoot e envia os metadados junto com o ticket.
                      </p>
                      <div className="rounded-md border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-700 dark:text-amber-300">
                        Para o Painel de Aplicativos do Chatwoot, use a URL fixa do Dashboard App. A criacao de ticket continua manual e so e liberada quando o contato estiver vinculado a uma empresa no portal.
                      </div>
                      <div className="min-w-0 space-y-2">
                        <Label htmlFor="chatwoot-dashboard-app-url" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                          URL do Dashboard App embutido
                        </Label>
                        <Textarea
                          id="chatwoot-dashboard-app-url"
                          readOnly
                          value={dashboardAppUrl}
                          className="min-h-20 w-full min-w-0 break-all font-mono text-xs"
                        />
                        <p className="text-xs text-muted-foreground">
                          Esse endpoint embute um painel proprio dentro da conversa do Chatwoot com duas acoes manuais: criar ticket e abrir acesso remoto.
                        </p>
                        <div className="flex flex-wrap gap-2">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="h-8 text-xs"
                            onClick={async () => {
                              try {
                                await navigator.clipboard.writeText(dashboardAppUrl);
                                toast.success("URL do Dashboard App copiada.");
                              } catch {
                                toast.error("Nao foi possivel copiar a URL.");
                              }
                            }}
                          >
                            Copiar URL do Dashboard App
                          </Button>
                        </div>
                      </div>
                      <div className="min-w-0 space-y-2 border-t border-border/60 pt-3">
                        <Label htmlFor="chatwoot-ticket-app-url" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                          Atalho direto opcional para ticket
                        </Label>
                        <p className="text-xs text-muted-foreground">
                          Use este link apenas se quiser um atalho externo. Para o painel embutido do Chatwoot, prefira a URL fixa acima.
                        </p>
                        <Textarea
                          id="chatwoot-ticket-app-url"
                          readOnly
                          value={ticketCreationAppUrl}
                          className="min-h-28 w-full min-w-0 break-all font-mono text-xs"
                        />
                        <div className="flex flex-wrap gap-2">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="h-8 text-xs"
                            onClick={async () => {
                              try {
                                await navigator.clipboard.writeText(ticketCreationAppUrl);
                                toast.success("URL do app copiada.");
                              } catch {
                                toast.error("Nao foi possivel copiar a URL.");
                              }
                            }}
                          >
                            Copiar URL do app
                          </Button>
                        </div>
                      </div>
                      <div className="min-w-0 space-y-2 border-t border-border/60 pt-3">
                        <Label htmlFor="chatwoot-remote-app-url" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                          Atalho direto opcional para hosts da empresa
                        </Label>
                        <Textarea
                          id="chatwoot-remote-app-url"
                          readOnly
                          value={remoteDirectoryAppUrl}
                          className="min-h-24 w-full min-w-0 break-all font-mono text-xs"
                        />
                        <p className="text-xs text-muted-foreground">
                          Esse app abre a plataforma remota ja filtrada pela empresa do contato e preserva o numero do ticket quando a conversa ja estiver vinculada.
                        </p>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="h-8 text-xs"
                          onClick={async () => {
                            try {
                              await navigator.clipboard.writeText(remoteDirectoryAppUrl);
                              toast.success("URL dos hosts copiada.");
                            } catch {
                              toast.error("Nao foi possivel copiar a URL.");
                            }
                          }}
                        >
                          Copiar URL dos hosts
                        </Button>
                      </div>
                      <div className="min-w-0 space-y-2 border-t border-border/60 pt-3">
                        <Label htmlFor="chatwoot-remote-host-app-url" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                          Atalho direto opcional para host especifico
                        </Label>
                        <Textarea
                          id="chatwoot-remote-host-app-url"
                          readOnly
                          value={remoteHostAppUrl}
                          className="min-h-24 w-full min-w-0 break-all font-mono text-xs"
                        />
                        <p className="text-xs text-muted-foreground">
                          Use essa variante quando a conversa ja tiver o atributo <span className="break-all font-mono text-foreground">host_id</span> sincronizado.
                        </p>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="h-8 text-xs"
                          onClick={async () => {
                            try {
                              await navigator.clipboard.writeText(remoteHostAppUrl);
                              toast.success("URL do host copiada.");
                            } catch {
                              toast.error("Nao foi possivel copiar a URL.");
                            }
                          }}
                        >
                          Copiar URL do host
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
                </>
              )}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

function BehaviorToggle({
  id,
  label,
  description,
  checked,
  onCheckedChange,
  disabled = false,
}: {
  id: keyof ChatwootBehaviorSettings;
  label: string;
  description: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <div className={`flex min-w-0 min-h-28 items-start gap-3 rounded-lg border bg-background p-4 ${disabled ? "opacity-60" : ""}`}>
      <Checkbox id={id} checked={checked} disabled={disabled} onCheckedChange={(value) => onCheckedChange(value === true)} />
      <span className="min-w-0 space-y-1">
        <Label htmlFor={id} className={`text-sm font-medium ${disabled ? "cursor-not-allowed" : "cursor-pointer"}`}>
          {label}
        </Label>
        <span className="block break-words text-sm text-muted-foreground">{description}</span>
      </span>
    </div>
  );
}

function StorageDiagnosticsTab() {
  const { diagnostics, isLoading, reload } = useIntegrationDiagnostics();
  const storage = diagnostics?.storage;

  return (
    <Card className="border-border/60 bg-card/95 shadow-sm">
      <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <CardTitle className="flex items-center gap-2">
            <HardDrive className="h-5 w-5 text-primary" />
            Storage / Cloudflare R2
          </CardTitle>
          <CardDescription>
            Diagnostico das variaveis de ambiente usadas para anexos de midia. Secrets nao sao exibidos.
          </CardDescription>
        </div>
        <Button variant="outline" size="sm" onClick={reload} disabled={isLoading}>
          {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
          Recarregar
        </Button>
      </CardHeader>
      <CardContent className="space-y-5">
        {isLoading ? (
          <LoadingState label="Carregando diagnostico do storage..." />
        ) : (
          <>
            <div className="grid gap-3 md:grid-cols-3">
              <StatusTile label="Status" ok={Boolean(storage?.configured)} okText="Configurado" failText="Incompleto" />
              <InfoTile label="Modo" value={storage?.mode === "public_base_url" ? "URL publica" : "URL assinada"} />
              <InfoTile label="TTL URL assinada" value={`${storage?.signedUrlTtlSeconds ?? 900}s`} />
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <InfoTile label="Provider" value={storage?.provider || "Cloudflare R2"} />
              <InfoTile label="Endpoint" value={storage?.endpointHost || "N/A"} />
              <InfoTile label="Bucket" value={storage?.bucketName || "N/A"} />
              <InfoTile label="Public Base URL" value={storage?.publicBaseUrl || "Nao configurado"} />
              <StatusLine label="Access Key ID" ok={Boolean(storage?.hasAccessKeyId)} />
              <StatusLine label="Secret Access Key" ok={Boolean(storage?.hasSecretAccessKey)} />
            </div>

            {storage?.issues?.length ? (
              <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-700 dark:text-amber-300">
                <div className="mb-2 flex items-center gap-2 font-medium">
                  <TriangleAlert className="h-4 w-4" />
                  Pontos de atencao
                </div>
                <ul className="space-y-1">
                  {storage.issues.map((issue) => (
                    <li key={issue}>- {issue}</li>
                  ))}
                </ul>
              </div>
            ) : (
              <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm text-emerald-700 dark:text-emerald-300">
                Configuracao minima do R2 presente no runtime.
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}

function useIntegrationDiagnostics() {
  const [diagnostics, setDiagnostics] = useState<IntegrationDiagnostics | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    void requestIntegrationDiagnostics(setDiagnostics, setIsLoading);
  }, []);

  return {
    diagnostics,
    isLoading,
    reload: () => requestIntegrationDiagnostics(setDiagnostics, setIsLoading),
  };
}

function useChatwootBehaviorSettings() {
  const [behavior, setBehavior] = useState<ChatwootBehaviorSettings>(DEFAULT_CHATWOOT_BEHAVIOR_SETTINGS);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    let active = true;

    async function load() {
      setIsLoading(true);
      try {
        const response = await fetch("/api/platform/settings/chatwoot-behavior", { method: "GET", cache: "no-store" });
        const json = await response.json().catch(() => ({}));
        const parsed = chatwootBehaviorSettingsSchema.safeParse(json?.data);
        if (active) {
          setBehavior(parsed.success ? parsed.data : DEFAULT_CHATWOOT_BEHAVIOR_SETTINGS);
        }
      } catch {
        if (active) {
          setBehavior(DEFAULT_CHATWOOT_BEHAVIOR_SETTINGS);
        }
      } finally {
        if (active) setIsLoading(false);
      }
    }

    void load();
    return () => {
      active = false;
    };
  }, []);

  async function save() {
    setIsSaving(true);
    const parsed = chatwootBehaviorSettingsSchema.safeParse(behavior);
    if (!parsed.success) {
      toast.error("Configuracoes invalidas do Chatwoot.");
      setIsSaving(false);
      return;
    }

    try {
      const response = await fetch("/api/platform/settings/chatwoot-behavior", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parsed.data),
      });
      const json = await response.json().catch(() => ({}));
      if (!response.ok || !json?.success) {
        toast.error(json?.error || "Falha ao salvar automacoes do Chatwoot.");
        return;
      }

      const saved = chatwootBehaviorSettingsSchema.safeParse(json.data);
      if (saved.success) {
        setBehavior(saved.data);
      }
      toast.success(json?.message || "Automacoes do Chatwoot salvas.");
    } catch {
      toast.error("Falha ao salvar automacoes do Chatwoot.");
    } finally {
      setIsSaving(false);
    }
  }

  return { behavior, isLoading, isSaving, setBehavior, save };
}

function useChatwootIntegrationSettings() {
  const [integrationSettings, setIntegrationSettings] = useState<ChatwootIntegrationSettings>(
    DEFAULT_CHATWOOT_INTEGRATION_SETTINGS,
  );
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    let active = true;

    async function load() {
      setIsLoading(true);
      try {
        const response = await fetch("/api/platform/settings/chatwoot-config", { method: "GET", cache: "no-store" });
        const json = await response.json().catch(() => ({}));
        const parsed = chatwootIntegrationSettingsSchema.safeParse(json?.data);
        if (active) {
          setIntegrationSettings(parsed.success ? parsed.data : DEFAULT_CHATWOOT_INTEGRATION_SETTINGS);
        }
      } catch {
        if (active) {
          setIntegrationSettings(DEFAULT_CHATWOOT_INTEGRATION_SETTINGS);
        }
      } finally {
        if (active) setIsLoading(false);
      }
    }

    void load();
    return () => {
      active = false;
    };
  }, []);

  async function save() {
    setIsSaving(true);
    const parsed = chatwootIntegrationSettingsSchema.safeParse(integrationSettings);
    if (!parsed.success) {
      toast.error("Configuracao principal do Chatwoot invalida.");
      setIsSaving(false);
      return;
    }

    try {
      const response = await fetch("/api/platform/settings/chatwoot-config", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parsed.data),
      });
      const json = await response.json().catch(() => ({}));
      if (!response.ok || !json?.success) {
        toast.error(json?.error || "Falha ao salvar conexao principal do Chatwoot.");
        return;
      }

      const saved = chatwootIntegrationSettingsSchema.safeParse(json.data);
      if (saved.success) {
        setIntegrationSettings(saved.data);
      }
      toast.success(json?.message || "Configuracao principal do Chatwoot salva.");
    } catch {
      toast.error("Falha ao salvar conexao principal do Chatwoot.");
    } finally {
      setIsSaving(false);
    }
  }

  return { integrationSettings, isLoading, isSaving, setIntegrationSettings, save };
}

async function requestIntegrationDiagnostics(
  setDiagnostics: (value: IntegrationDiagnostics) => void,
  setIsLoading: (value: boolean) => void,
) {
  setIsLoading(true);
  try {
    const response = await fetch("/api/platform/settings/integrations/diagnostics", { method: "GET", cache: "no-store" });
    const json = (await response.json()) as IntegrationDiagnostics;
    setDiagnostics(json);
  } catch {
    setDiagnostics({ success: false, error: "Falha ao carregar diagnostico." });
  } finally {
    setIsLoading(false);
  }
}

function LoadingState({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-2 text-sm text-muted-foreground">
      <Loader2 className="h-4 w-4 animate-spin" />
      {label}
    </div>
  );
}

function StatusTile({ label, ok, okText, failText }: { label: string; ok: boolean; okText: string; failText: string }) {
  return (
    <div className="rounded-lg border bg-muted/20 p-4">
      <p className="text-xs uppercase tracking-wider text-muted-foreground">{label}</p>
      <Badge variant="outline" className={ok ? "mt-2 border-emerald-500/40 text-emerald-600" : "mt-2 border-amber-500/40 text-amber-600"}>
        {ok ? okText : failText}
      </Badge>
    </div>
  );
}

function InfoTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border bg-muted/20 p-4">
      <p className="text-xs uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="mt-2 break-all text-sm font-medium text-foreground">{value}</p>
    </div>
  );
}

function StatusLine({ label, ok }: { label: string; ok: boolean }) {
  return (
    <div className="flex items-center justify-between rounded-lg border bg-muted/20 px-3 py-2 text-sm">
      <span className="flex items-center gap-2">
        <Server className="h-4 w-4 text-muted-foreground" />
        {label}
      </span>
      <span className={ok ? "inline-flex items-center gap-1 text-emerald-600" : "inline-flex items-center gap-1 text-amber-600"}>
        {ok ? <CheckCircle2 className="h-4 w-4" /> : <TriangleAlert className="h-4 w-4" />}
        {ok ? "OK" : "Pendente"}
      </span>
    </div>
  );
}

function formatRuntimeKey(key: string) {
  return key
    .replace(/^has/, "")
    .replace(/([A-Z])/g, " $1")
    .trim();
}
