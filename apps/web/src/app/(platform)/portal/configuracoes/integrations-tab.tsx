"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Bot, CheckCircle2, HardDrive, Loader2, MessageSquare, Plug, RefreshCw, Save, Server, TriangleAlert } from "lucide-react";
import {
  DEFAULT_CHATWOOT_BEHAVIOR_SETTINGS,
  DEFAULT_CHATWOOT_INTEGRATION_SETTINGS,
  chatwootBehaviorSettingsSchema,
  chatwootIntegrationSettingsSchema,
  type ChatwootBehaviorSettings,
  type ChatwootIntegrationSettings,
} from "@dosc-syspro/contracts/chatwoot";
import {
  DEFAULT_STORAGE_R2_SETTINGS,
  storageR2SettingsSchema,
  type StorageR2Settings,
} from "@dosc-syspro/contracts/settings";
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
    source?: "database" | "env" | "none";
    fallbackToDatabase?: boolean;
    mode: "public_base_url" | "signed_url";
    endpointHost: string | null;
    bucketName: string | null;
    publicBaseUrl: string | null;
    signedUrlTtlSeconds: number;
    hasAccessKeyId: boolean;
    hasSecretAccessKey: boolean;
    modules?: Record<string, { bucketName: string | null; prefix: string }>;
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

  async function copyToClipboard(value: string, successMessage: string) {
    try {
      await navigator.clipboard.writeText(value);
      toast.success(successMessage);
    } catch {
      toast.error("Nao foi possivel copiar a URL.");
    }
  }

  return (
    <Card className="border-border/60 bg-card/95 shadow-sm">
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

              <SectionShell
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
              </SectionShell>
            </div>

            <SectionShell
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
                <div className="grid min-w-0 gap-4 md:grid-cols-2">
                  <FormField id="chatwoot-url" label="URL">
                    <Input
                      id="chatwoot-url"
                      value={integrationSettings.url}
                      onChange={(event) => setIntegrationSettings((prev) => ({ ...prev, url: event.target.value }))}
                      placeholder="https://chatwoot.seudominio.com"
                    />
                  </FormField>
                  <FormField id="chatwoot-account-id" label="Account ID">
                    <Input
                      id="chatwoot-account-id"
                      value={integrationSettings.accountId}
                      onChange={(event) => setIntegrationSettings((prev) => ({ ...prev, accountId: event.target.value }))}
                      placeholder="1"
                    />
                  </FormField>
                  <FormField id="chatwoot-api-token" label="API Token">
                    <Input
                      id="chatwoot-api-token"
                      type="password"
                      value={integrationSettings.apiToken}
                      onChange={(event) => setIntegrationSettings((prev) => ({ ...prev, apiToken: event.target.value }))}
                      placeholder="Token principal do Chatwoot"
                    />
                  </FormField>
                  <FormField id="chatwoot-platform-api-token" label="Platform API Token">
                    <Input
                      id="chatwoot-platform-api-token"
                      type="password"
                      value={integrationSettings.platformApiToken}
                      onChange={(event) => setIntegrationSettings((prev) => ({ ...prev, platformApiToken: event.target.value }))}
                      placeholder="Token da Platform API"
                    />
                  </FormField>
                  <FormField id="chatwoot-inbox-id" label="Inbox ID">
                    <Input
                      id="chatwoot-inbox-id"
                      value={integrationSettings.inboxId}
                      onChange={(event) => setIntegrationSettings((prev) => ({ ...prev, inboxId: event.target.value }))}
                      placeholder="123"
                    />
                  </FormField>
                  <FormField id="chatwoot-inbox-identifier" label="Inbox Identifier">
                    <Input
                      id="chatwoot-inbox-identifier"
                      value={integrationSettings.inboxIdentifier}
                      onChange={(event) => setIntegrationSettings((prev) => ({ ...prev, inboxIdentifier: event.target.value }))}
                      placeholder="whatsapp-suporte"
                    />
                  </FormField>
                  <FormField id="chatwoot-webhook-secret" label="Webhook Secret">
                    <Input
                      id="chatwoot-webhook-secret"
                      type="password"
                      value={integrationSettings.webhookSecret}
                      onChange={(event) => setIntegrationSettings((prev) => ({ ...prev, webhookSecret: event.target.value }))}
                      placeholder="Secret do webhook"
                    />
                  </FormField>
                  <FormField
                    id="chatwoot-webhook-skew"
                    label="Tolerancia do webhook"
                    description="Janela em segundos para assinatura e clock skew."
                  >
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
                  </FormField>
                </div>
              )}
            </SectionShell>

            <SectionShell
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
                    onCheckedChange={(checked) =>
                      setBehavior((prev) => ({ ...prev, prependAgentNameOnOutbound: checked }))
                    }
                  />
                  <BehaviorToggle
                    id="autoAssignOnFirstAgentReply"
                    label="Autoatribuir ao primeiro agente que responder"
                    description="Assume a conversa para o primeiro agente que responder sem responsavel definido."
                    checked={behavior.autoAssignOnFirstAgentReply}
                    onCheckedChange={(checked) =>
                      setBehavior((prev) => ({ ...prev, autoAssignOnFirstAgentReply: checked }))
                    }
                  />
                  <BehaviorToggle
                    id="reopenConversationOnCustomerReply"
                    label="Permitir reabertura em conversa em espera"
                    description="Habilita a reabertura automatica de pending e snoozed."
                    checked={behavior.reopenConversationOnCustomerReply}
                    onCheckedChange={(checked) =>
                      setBehavior((prev) => ({ ...prev, reopenConversationOnCustomerReply: checked }))
                    }
                  />
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
                    description="Ative apenas se quiser trazer pending de volta para open no primeiro retorno do cliente."
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
                      onCheckedChange={(checked) =>
                        setBehavior((prev) => ({ ...prev, systemMessagesUseBotIdentity: checked }))
                      }
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
                      onChange={(event) =>
                        setBehavior((prev) => ({ ...prev, systemMessageApiToken: event.target.value }))
                      }
                      placeholder="Cole aqui o access token do AgentBot"
                    />
                  </FormField>
                </div>
                </SettingsGroup>

                <SettingsGroup
                  title="CSAT no WhatsApp"
                  description="Pesquisa automatica no fechamento da conversa, com tratamento de nota e tentativas invalidas."
                >
                <div className="grid min-w-0 gap-4">
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="outline">1 Pessimo</Badge>
                    <Badge variant="outline">2 Ruim</Badge>
                    <Badge variant="outline">3 Regular</Badge>
                    <Badge variant="outline">4 Bom</Badge>
                    <Badge variant="outline">5 Excelente</Badge>
                  </div>

                  <div className="grid min-w-0 gap-3 md:grid-cols-2">
                    <BehaviorToggle
                      id="csatEnabled"
                      label="Habilitar CSAT automatico"
                      description="Dispara avaliacao no encerramento conforme a politica de status."
                      checked={behavior.csatEnabled}
                      onCheckedChange={(checked) =>
                        setBehavior((prev) => ({ ...prev, csatEnabled: checked }))
                      }
                    />
                    <BehaviorToggle
                      id="sendCsatThankYouMessage"
                      label="Enviar mensagem apos a nota"
                      description="Confirma ao cliente quando a resposta valida for recebida."
                      checked={behavior.sendCsatThankYouMessage}
                      onCheckedChange={(checked) =>
                        setBehavior((prev) => ({ ...prev, sendCsatThankYouMessage: checked }))
                      }
                    />
                    <BehaviorToggle
                      id="csatReopenOnLowScore"
                      label="Reabrir conversa em nota baixa"
                      description="Reabre automaticamente quando a nota ficar igual ou abaixo do limite."
                      checked={behavior.csatReopenOnLowScore}
                      onCheckedChange={(checked) =>
                        setBehavior((prev) => ({ ...prev, csatReopenOnLowScore: checked }))
                      }
                    />
                  </div>

                  <div className="grid min-w-0 gap-4 md:grid-cols-2">
                    <FormField
                      id="csatTriggerStatus"
                      label="Disparar CSAT quando status for"
                      description="Use apenas resolved se archived for usado por rotina tecnica."
                    >
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
                    </FormField>

                    <FormField
                      id="csatLowScoreThreshold"
                      label="Limite de nota baixa"
                      description={
                        csatCanReopen
                          ? "Notas ate esse valor reabrem a conversa."
                          : "Disponivel apenas com CSAT ativo e reabertura por nota baixa habilitada."
                      }
                    >
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
                    </FormField>

                    <FormField
                      id="csatPendingTimeoutHours"
                      label="Timeout do CSAT (horas)"
                      description="Avaliacao pendente e encerrada ao fim desse prazo."
                    >
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
                    </FormField>

                    <FormField
                      id="csatInvalidReplyMaxAttempts"
                      label="Tentativas de resposta invalida"
                      description="Limite antes de encerrar a avaliacao e tratar a proxima mensagem como novo atendimento."
                    >
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
                    </FormField>
                  </div>

                  <div className="grid min-w-0 gap-4 md:grid-cols-2">
                    <MessageTemplateField
                      id="csatRequestMessage"
                      label="Mensagem de solicitacao"
                      counter={`${csatRequestLength}/2000`}
                      description="Enviada logo apos a conversa ser resolvida."
                      onRestore={() =>
                        setBehavior((prev) => ({
                          ...prev,
                          csatRequestMessage: DEFAULT_CHATWOOT_BEHAVIOR_SETTINGS.csatRequestMessage,
                        }))
                      }
                    >
                      <Textarea
                        id="csatRequestMessage"
                        className="min-h-32"
                        value={behavior.csatRequestMessage}
                        onChange={(event) =>
                          setBehavior((prev) => ({ ...prev, csatRequestMessage: event.target.value }))
                        }
                      />
                    </MessageTemplateField>
                    <MessageTemplateField
                      id="csatThankYouMessage"
                      label="Mensagem pos-avaliacao"
                      counter={`${csatThankYouLength}/1000`}
                      description={
                        behavior.sendCsatThankYouMessage
                          ? "Enviada depois que o cliente responde com uma nota valida."
                          : "Ative a confirmacao para enviar essa mensagem final."
                      }
                      onRestore={() =>
                        setBehavior((prev) => ({
                          ...prev,
                          csatThankYouMessage: DEFAULT_CHATWOOT_BEHAVIOR_SETTINGS.csatThankYouMessage,
                        }))
                      }
                    >
                      <Textarea
                        id="csatThankYouMessage"
                        className="min-h-32"
                        value={behavior.csatThankYouMessage}
                        disabled={!behavior.sendCsatThankYouMessage}
                        onChange={(event) =>
                          setBehavior((prev) => ({ ...prev, csatThankYouMessage: event.target.value }))
                        }
                      />
                    </MessageTemplateField>
                    <MessageTemplateField
                      id="csatInvalidReplyRetryMessage"
                      label="Mensagem para resposta invalida"
                      counter={`${csatInvalidReplyRetryLength}/1000`}
                      description="Usada nas tentativas intermediarias; o contador e acrescentado pelo backend."
                      onRestore={() =>
                        setBehavior((prev) => ({
                          ...prev,
                          csatInvalidReplyRetryMessage: DEFAULT_CHATWOOT_BEHAVIOR_SETTINGS.csatInvalidReplyRetryMessage,
                        }))
                      }
                    >
                      <Textarea
                        id="csatInvalidReplyRetryMessage"
                        className="min-h-28"
                        value={behavior.csatInvalidReplyRetryMessage}
                        disabled={!behavior.csatEnabled}
                        onChange={(event) =>
                          setBehavior((prev) => ({ ...prev, csatInvalidReplyRetryMessage: event.target.value }))
                        }
                      />
                    </MessageTemplateField>
                    <MessageTemplateField
                      id="csatInvalidReplyFinalMessage"
                      label="Mensagem ao encerrar a avaliacao"
                      counter={`${csatInvalidReplyFinalLength}/1000`}
                      description="Enviada quando o limite e atingido e a proxima mensagem passa a abrir um novo atendimento."
                      onRestore={() =>
                        setBehavior((prev) => ({
                          ...prev,
                          csatInvalidReplyFinalMessage: DEFAULT_CHATWOOT_BEHAVIOR_SETTINGS.csatInvalidReplyFinalMessage,
                        }))
                      }
                    >
                      <Textarea
                        id="csatInvalidReplyFinalMessage"
                        className="min-h-28"
                        value={behavior.csatInvalidReplyFinalMessage}
                        disabled={!behavior.csatEnabled}
                        onChange={(event) =>
                          setBehavior((prev) => ({ ...prev, csatInvalidReplyFinalMessage: event.target.value }))
                        }
                      />
                    </MessageTemplateField>
                  </div>

                  <div className="rounded-lg border border-border/60 bg-muted/20 p-3 text-xs text-muted-foreground">
                    Fluxo atual:
                    <span className="ml-1 text-foreground">
                      resposta publica do agente
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

                </div>
                </SettingsGroup>

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
            </SectionShell>
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
    <div className={`flex min-w-0 items-start justify-between gap-4 rounded-xl border border-border/70 bg-background px-4 py-3 ${disabled ? "opacity-60" : ""}`}>
      <span className="min-w-0 space-y-1">
        <Label htmlFor={id} className={`block text-sm font-medium ${disabled ? "cursor-not-allowed" : "cursor-pointer"}`}>
          {label}
        </Label>
        <span className="block text-sm text-muted-foreground">{description}</span>
      </span>
      <Checkbox id={id} checked={checked} disabled={disabled} onCheckedChange={(value) => onCheckedChange(value === true)} />
    </div>
  );
}

function SectionShell({
  title,
  description,
  action,
  children,
}: {
  title: string;
  description: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="space-y-4 rounded-2xl border border-border/60 bg-muted/15 p-4 md:p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <h3 className="text-base font-semibold">{title}</h3>
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

function SettingsGroup({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <div className="space-y-4 rounded-xl border border-border/70 bg-background p-4">
      <div className="space-y-1">
        <h4 className="text-sm font-semibold text-foreground">{title}</h4>
        {description ? <p className="text-sm text-muted-foreground">{description}</p> : null}
      </div>
      {children}
    </div>
  );
}

function FormField({
  id,
  label,
  description,
  children,
}: {
  id: string;
  label: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <div className="min-w-0 space-y-2">
      <Label htmlFor={id}>{label}</Label>
      {children}
      {description ? <p className="text-xs text-muted-foreground">{description}</p> : null}
    </div>
  );
}

function MessageTemplateField({
  id,
  label,
  counter,
  description,
  onRestore,
  children,
}: {
  id: string;
  label: string;
  counter: string;
  description: string;
  onRestore: () => void;
  children: ReactNode;
}) {
  return (
    <div className="min-w-0 space-y-2 rounded-xl border border-border/70 bg-background p-4">
      <div className="flex items-center justify-between gap-3">
        <Label htmlFor={id}>{label}</Label>
        <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
          <span>{counter}</span>
          <Button type="button" variant="ghost" size="sm" className="h-7 px-2 text-[11px]" onClick={onRestore}>
            Restaurar
          </Button>
        </div>
      </div>
      {children}
      <p className="text-xs text-muted-foreground">{description}</p>
    </div>
  );
}

function CopyInfoCard({
  title,
  description,
  value,
  copyLabel,
  onCopy,
}: {
  title: string;
  description: string;
  value: string;
  copyLabel: string;
  onCopy: () => void;
}) {
  return (
    <div className="space-y-3 rounded-xl border border-border/70 bg-background p-4">
      <div className="space-y-1">
        <h4 className="text-sm font-semibold text-foreground">{title}</h4>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
      <Textarea readOnly value={value} className="min-h-24 w-full min-w-0 break-all font-mono text-xs" />
      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="outline" size="sm" className="h-8 text-xs" onClick={onCopy}>
          {copyLabel}
        </Button>
      </div>
    </div>
  );
}

function StorageDiagnosticsTab() {
  const { diagnostics, isLoading, reload } = useIntegrationDiagnostics();
  const {
    settings,
    isLoading: isSettingsLoading,
    isSaving,
    setSettings,
    save,
  } = useStorageSettings();
  const storage = diagnostics?.storage;

  return (
    <div className="space-y-5">
      <Card className="border-border/60 bg-card/95 shadow-sm">
        <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <HardDrive className="h-5 w-5 text-primary" />
              Storage / Cloudflare R2
            </CardTitle>
            <CardDescription>
              Configure o provider de anexos por modulo, com bucket e pasta separados para tickets, Evolution e Chatwoot.
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={reload} disabled={isLoading}>
              {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
              Recarregar
            </Button>
            <Button size="sm" onClick={save} disabled={isSettingsLoading || isSaving}>
              {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
              Salvar storage
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-5">
          {isSettingsLoading ? (
            <LoadingState label="Carregando configuracao do storage..." />
          ) : (
            <>
              <div className="grid gap-4 md:grid-cols-2">
                <FormField id="storage-endpoint" label="Endpoint R2">
                  <Input
                    id="storage-endpoint"
                    value={settings.endpoint}
                    onChange={(event) => setSettings((prev) => ({ ...prev, endpoint: event.target.value }))}
                    placeholder="https://<accountid>.r2.cloudflarestorage.com"
                  />
                </FormField>
                <FormField id="storage-default-bucket" label="Bucket padrao">
                  <Input
                    id="storage-default-bucket"
                    value={settings.defaultBucketName}
                    onChange={(event) => setSettings((prev) => ({ ...prev, defaultBucketName: event.target.value }))}
                    placeholder="syspro-midias"
                  />
                </FormField>
                <FormField id="storage-access-key-id" label="Access Key ID">
                  <Input
                    id="storage-access-key-id"
                    type="password"
                    value={settings.accessKeyId}
                    onChange={(event) => setSettings((prev) => ({ ...prev, accessKeyId: event.target.value }))}
                    placeholder="Access Key ID do R2"
                  />
                </FormField>
                <FormField id="storage-secret-access-key" label="Secret Access Key">
                  <Input
                    id="storage-secret-access-key"
                    type="password"
                    value={settings.secretAccessKey}
                    onChange={(event) => setSettings((prev) => ({ ...prev, secretAccessKey: event.target.value }))}
                    placeholder="Secret Access Key do R2"
                  />
                </FormField>
                <FormField id="storage-public-base-url" label="Public Base URL padrao">
                  <Input
                    id="storage-public-base-url"
                    value={settings.defaultPublicBaseUrl}
                    onChange={(event) => setSettings((prev) => ({ ...prev, defaultPublicBaseUrl: event.target.value }))}
                    placeholder="https://cdn.seudominio.com"
                  />
                </FormField>
                <FormField id="storage-signed-url-ttl" label="TTL da URL assinada (segundos)">
                  <Input
                    id="storage-signed-url-ttl"
                    type="number"
                    min={60}
                    max={86400}
                    value={settings.signedUrlTtlSeconds}
                    onChange={(event) =>
                      setSettings((prev) => ({
                        ...prev,
                        signedUrlTtlSeconds: Number(event.target.value || prev.signedUrlTtlSeconds),
                      }))
                    }
                  />
                </FormField>
              </div>

              <div className="rounded-xl border border-border/60 bg-muted/15 p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium text-foreground">Fallback para banco</p>
                    <p className="text-xs text-muted-foreground">
                      Mantem anexos funcionando quando o storage nao estiver configurado ou estiver indisponivel.
                    </p>
                  </div>
                  <Checkbox
                    checked={settings.fallbackToDatabase}
                    onCheckedChange={(checked) => setSettings((prev) => ({ ...prev, fallbackToDatabase: checked === true }))}
                  />
                </div>
              </div>

              <div className="grid gap-4 lg:grid-cols-2">
                <StorageModuleCard
                  title="Tickets"
                  description="Separe anexos do portal de suporte do restante."
                  values={settings.modules.tickets}
                  onChange={(next) =>
                    setSettings((prev) => ({ ...prev, modules: { ...prev.modules, tickets: next } }))
                  }
                  defaultPrefix="tickets"
                />
                <StorageModuleCard
                  title="Evolution"
                  description="Midias recebidas do WhatsApp/Evolution antes do repasse."
                  values={settings.modules.evolution}
                  onChange={(next) =>
                    setSettings((prev) => ({ ...prev, modules: { ...prev.modules, evolution: next } }))
                  }
                  defaultPrefix="evolution-media"
                />
                <StorageModuleCard
                  title="Chatwoot"
                  description="Reservado para anexos e arquivos do fluxo Chatwoot."
                  values={settings.modules.chatwoot}
                  onChange={(next) =>
                    setSettings((prev) => ({ ...prev, modules: { ...prev.modules, chatwoot: next } }))
                  }
                  defaultPrefix="chatwoot-media"
                />
                <StorageModuleCard
                  title="Padrao"
                  description="Usado por modulos sem configuracao dedicada."
                  values={settings.modules.default}
                  onChange={(next) =>
                    setSettings((prev) => ({ ...prev, modules: { ...prev.modules, default: next } }))
                  }
                  defaultPrefix="shared"
                />
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <Card className="border-border/60 bg-card/95 shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Server className="h-5 w-5 text-primary" />
            Diagnostico efetivo
          </CardTitle>
          <CardDescription>
            Mostra a configuracao realmente resolvida pelo backend, com fallback de ambiente quando necessario.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          {isLoading ? (
            <LoadingState label="Carregando diagnostico do storage..." />
          ) : (
            <>
              <div className="grid gap-3 md:grid-cols-4">
                <StatusTile label="Status" ok={Boolean(storage?.configured)} okText="Configurado" failText="Incompleto" />
                <InfoTile label="Origem" value={storage?.source === "database" ? "Banco" : storage?.source === "env" ? "Runtime" : "Indefinida"} />
                <InfoTile label="Modo" value={storage?.mode === "public_base_url" ? "URL publica" : "URL assinada"} />
                <InfoTile label="TTL URL assinada" value={`${storage?.signedUrlTtlSeconds ?? 900}s`} />
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                <InfoTile label="Provider" value={storage?.provider || "Cloudflare R2"} />
                <InfoTile label="Endpoint" value={storage?.endpointHost || "N/A"} />
                <InfoTile label="Bucket efetivo" value={storage?.bucketName || "N/A"} />
                <InfoTile label="Public Base URL efetiva" value={storage?.publicBaseUrl || "Nao configurado"} />
                <StatusLine label="Access Key ID" ok={Boolean(storage?.hasAccessKeyId)} />
                <StatusLine label="Secret Access Key" ok={Boolean(storage?.hasSecretAccessKey)} />
              </div>

              {storage?.modules ? (
                <div className="grid gap-3 md:grid-cols-2">
                  {Object.entries(storage.modules).map(([moduleKey, moduleValue]) => (
                    <div key={moduleKey} className="rounded-xl border border-border/60 bg-muted/15 p-4">
                      <div className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">{moduleKey}</div>
                      <div className="mt-2 space-y-1 text-sm">
                        <div><span className="text-muted-foreground">Bucket:</span> {moduleValue.bucketName || "Padrao"}</div>
                        <div><span className="text-muted-foreground">Pasta:</span> {moduleValue.prefix}</div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : null}

              <div className={storage?.issues?.length ? "rounded-lg border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-700 dark:text-amber-300" : "rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm text-emerald-700 dark:text-emerald-300"}>
                {storage?.issues?.length ? (
                  <>
                    <div className="mb-2 flex items-center gap-2 font-medium">
                      <TriangleAlert className="h-4 w-4" />
                      Pontos de atencao
                    </div>
                    <ul className="space-y-1">
                      {storage.issues.map((issue) => (
                        <li key={issue}>- {issue}</li>
                      ))}
                    </ul>
                  </>
                ) : (
                  "Configuracao efetiva do R2 valida para uso."
                )}
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function StorageModuleCard({
  title,
  description,
  values,
  onChange,
  defaultPrefix,
}: {
  title: string;
  description: string;
  values: StorageR2Settings["modules"]["tickets"];
  onChange: (next: StorageR2Settings["modules"]["tickets"]) => void;
  defaultPrefix: string;
}) {
  const fieldPrefix = `storage-module-${title.toLowerCase()}`;

  return (
    <div className="rounded-2xl border border-border/60 bg-muted/10 p-4">
      <div className="mb-4">
        <h4 className="text-sm font-medium text-foreground">{title}</h4>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
      <div className="space-y-3">
        <FormField id={`${fieldPrefix}-bucket`} label="Bucket dedicado (opcional)">
          <Input
            id={`${fieldPrefix}-bucket`}
            value={values.bucketName}
            onChange={(event) => onChange({ ...values, bucketName: event.target.value })}
            placeholder="Se vazio, usa o bucket padrao"
          />
        </FormField>
        <FormField id={`${fieldPrefix}-public-base-url`} label="Public Base URL dedicada (opcional)">
          <Input
            id={`${fieldPrefix}-public-base-url`}
            value={values.publicBaseUrl}
            onChange={(event) => onChange({ ...values, publicBaseUrl: event.target.value })}
            placeholder="Se vazio, usa a URL publica padrao"
          />
        </FormField>
        <FormField id={`${fieldPrefix}-prefix`} label="Pasta / prefixo">
          <Input
            id={`${fieldPrefix}-prefix`}
            value={values.prefix}
            onChange={(event) => onChange({ ...values, prefix: event.target.value })}
            placeholder={defaultPrefix}
          />
        </FormField>
      </div>
    </div>
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

function useStorageSettings() {
  const [settings, setSettings] = useState<StorageR2Settings>(DEFAULT_STORAGE_R2_SETTINGS);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    let active = true;

    async function load() {
      setIsLoading(true);
      try {
        const response = await fetch("/api/platform/settings/storage-config", { method: "GET", cache: "no-store" });
        const json = await response.json().catch(() => ({}));
        const parsed = storageR2SettingsSchema.safeParse(json?.data);
        if (active) {
          setSettings(parsed.success ? parsed.data : DEFAULT_STORAGE_R2_SETTINGS);
        }
      } catch {
        if (active) {
          setSettings(DEFAULT_STORAGE_R2_SETTINGS);
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
    const parsed = storageR2SettingsSchema.safeParse(settings);
    if (!parsed.success) {
      toast.error("Configuracao de storage invalida.");
      setIsSaving(false);
      return;
    }

    try {
      const response = await fetch("/api/platform/settings/storage-config", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parsed.data),
      });
      const json = await response.json().catch(() => ({}));
      if (!response.ok || !json?.success) {
        toast.error(json?.error || "Falha ao salvar configuracao de storage.");
        return;
      }

      const saved = storageR2SettingsSchema.safeParse(json.data);
      if (saved.success) {
        setSettings(saved.data);
      }
      toast.success(json?.message || "Configuracao de storage salva.");
    } catch {
      toast.error("Falha ao salvar configuracao de storage.");
    } finally {
      setIsSaving(false);
    }
  }

  return {
    settings,
    isLoading,
    isSaving,
    setSettings,
    save,
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
