import type { AgentDeviceSummary } from "@dosc-syspro/contracts/agent";
import type { RemoteConfiguredHostItem, RemoteAgentCommandType, RemoteAgentCommandStatus } from "@dosc-syspro/contracts/remote";
import type { RemoteHostDetails } from "@/features/remote/domain/model";
import type { LucideIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { AgentLinkSection } from "./AgentLinkSection";
import { Copy, Fingerprint, HardDriveDownload } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatDateTime, formatRelativeHeartbeat, formatHourMinute, getCommandStatusMeta, extractStringFromPayload } from "../host-details.helpers";
import { EXPECTED_SCHEMA_VERSIONS, AGENT_COMMAND_LABEL, AGENT_ACK_REASON_LABEL } from "../host-details.constants";
import type { RemoteAgentAckReasonCode } from "@dosc-syspro/remote-domain/ack-reason-codes";
import { isRemoteAgentAckReasonCode } from "@dosc-syspro/remote-domain/ack-reason-codes";

type StatusIconMeta = { Icon: LucideIcon; tone: string; label: string };

export interface HostAgentTabProps {
  host: RemoteConfiguredHostItem;
  orchestrationStrategy: string;
  productStatusMeta: { label: string; description: string; className: string };
  contractValidationError: string | null;
  agentHealthCard: {
    status: { label: string; tone: string };
    autoHeal: {
      label: string;
      status: string | null;
      lastAttemptAt: string | null;
      beforeStatus: string | null;
      afterStatus: string;
    };
    erp: { version: string | null; paths: string[] };
  };
  serviceStatusIcon: StatusIconMeta;
  autoHealStatusIcon: StatusIconMeta;
  details: RemoteHostDetails;
  bootstrapRateMetrics: { ratePct: number | null; cycles: number | null; bootstrapCycles: number | null };
  contractSchemaVersions: { discover: string | null; sync: string | null; ack: string | null };
  isRevokingAgentToken: boolean;
  handleRotateAgentToken: () => void;
  isRequestingResendConfig: boolean;
  handleRequestRemoteAction: (action: "RESEND_CONFIG" | "REAPPLY_ALIAS") => void;
  isRequestingSelfHeal: boolean;
  handleCopy: (value: string | null, label: string) => Promise<void>;
  rustDeskCompliance: {
    lastSyncAt: string | null;
    items: Array<{ id: string; label: string; expected: string; reported: string | null; match: boolean }>;
  };
  visibleAgentCommands: Array<{
    id: string;
    type: RemoteAgentCommandType;
    status: RemoteAgentCommandStatus;
    reason: string | null;
    payload: Record<string, unknown> | null;
    attemptCount: number;
    resultMessage: string | null;
    resultPayload: Record<string, unknown> | null;
    createdAt: string;
    updatedAt: string;
    deliveredAt: string | null;
    executedAt: string | null;
    failedAt: string | null;
  }>;
  hiddenAcknowledgedCount: number;
  hasPendingInstallGuide: boolean;
  desiredSysproInstalls: Array<{
    companyId: string;
    companyName: string;
    serverPath: string;
  }>;
  linkedDevice?: AgentDeviceSummary | null;
  hostId: string;
}

export function HostAgentTab({
  host,
  orchestrationStrategy,
  productStatusMeta,
  contractValidationError,
  agentHealthCard,
  serviceStatusIcon,
  autoHealStatusIcon,
  details,
  bootstrapRateMetrics,
  contractSchemaVersions,
  isRevokingAgentToken,
  handleRotateAgentToken,
  isRequestingResendConfig,
  handleRequestRemoteAction,
  isRequestingSelfHeal,
  handleCopy,
  rustDeskCompliance,
  visibleAgentCommands,
  hiddenAcknowledgedCount,
  hasPendingInstallGuide,
  desiredSysproInstalls,
  linkedDevice = null,
  hostId,
}: HostAgentTabProps) {
  const ServiceStatusIcon = serviceStatusIcon.Icon;
  const AutoHealStatusIcon = autoHealStatusIcon.Icon;
  const agent = host.agent;

  return (
    <div className="space-y-6">
      <div>
        <SectionLabel title="Agente Enterprise" />
        <AgentLinkSection hostId={hostId} linkedDevice={linkedDevice} />
      </div>

      <div>
        <SectionLabel title="Módulo Remoto" />
        <Card className="border-border/50">
          <CardHeader>
            <CardTitle className="text-lg">Agente de Monitoramento</CardTitle>
            <CardDescription>Diagnóstico operacional: telemetria, saúde, conectividade e execução de comandos.</CardDescription>
          </CardHeader>
      <CardContent className="space-y-4">
        <div className="rounded-xl border border-border/50 bg-muted/15 p-4">
          <p className="text-sm font-medium text-foreground">Resumo do agente</p>
          <div className="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-lg border border-border/40 bg-background/50 p-3">
              <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Heartbeat</p>
              <p className="mt-1 text-sm text-foreground">{formatRelativeHeartbeat(agent.lastHeartbeatAt)}</p>
              <p className="text-xs text-muted-foreground">{formatDateTime(agent.lastHeartbeatAt)}</p>
            </div>
            <div className="rounded-lg border border-border/40 bg-background/50 p-3">
              <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Estratégia</p>
              <p className="mt-1 text-sm text-foreground">{orchestrationStrategy}</p>
            </div>
            <div className="rounded-lg border border-border/40 bg-background/50 p-3">
              <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Estado do produto</p>
              <p className="mt-1 text-sm text-foreground">{productStatusMeta.label}</p>
              <p className="mt-1 text-xs text-muted-foreground">{productStatusMeta.description}</p>
            </div>
            <div className="rounded-lg border border-border/40 bg-background/50 p-3">
              <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Contrato</p>
              <p className="mt-1 text-sm text-foreground">{contractValidationError ?? "Sem erro"}</p>
            </div>
          </div>
          {host.productStatus === "AWAITING_LINK" ? (
            <div className="mt-3 rounded-lg border border-amber-500/20 bg-amber-500/10 p-3 text-sm text-amber-800 dark:text-amber-300">
              A máquina já foi descoberta pelo agente, mas ainda não foi vinculada no portal. Nesse estado o RustDesk ainda não está instalado. O próximo passo é concluir o vínculo do host para liberar bootstrap e provisionamento remoto.
            </div>
          ) : null}
        </div>

        <details className="rounded-xl border border-border/50 bg-muted/10 p-4">
          <summary className="cursor-pointer text-sm font-medium text-foreground">
            Diagnóstico avançado
          </summary>
          <div className="mt-4 space-y-4">
            <div className="rounded-xl border border-border/50 bg-muted/15 p-4">
              <p className="text-sm font-medium text-foreground">Saúde do agente</p>
              <div className="mt-3 grid gap-3 md:grid-cols-3">
                <div className="rounded-xl border border-border/50 bg-background/60 p-3">
                  <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Status atual</p>
                  <div className="mt-2 flex h-9 items-center" title={serviceStatusIcon.label}>
                    <ServiceStatusIcon
                      className={cn("h-6 w-6", serviceStatusIcon.tone)}
                      aria-label={serviceStatusIcon.label}
                    />
                  </div>
                </div>
                <div className="rounded-xl border border-border/50 bg-background/60 p-3">
                  <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Auto-recuperação</p>
                  <div className="mt-2 flex h-9 items-center" title={autoHealStatusIcon.label}>
                    <AutoHealStatusIcon
                      className={cn("h-6 w-6", autoHealStatusIcon.tone)}
                      aria-label={autoHealStatusIcon.label}
                    />
                  </div>
                  <p className="mt-1 text-xs font-medium text-foreground">{agentHealthCard.autoHeal.label}</p>
                  {agentHealthCard.autoHeal.beforeStatus ? (
                    <p className="mt-1 text-xs text-muted-foreground">
                      Antes: {agentHealthCard.autoHeal.beforeStatus} {"->"} Depois: {agentHealthCard.autoHeal.afterStatus}
                    </p>
                  ) : (
                    <p className="mt-1 text-xs text-muted-foreground">
                      Estado atual: {agentHealthCard.autoHeal.afterStatus}
                    </p>
                  )}
                  <p className="mt-2 text-xs text-muted-foreground">
                    Última tentativa às {formatHourMinute(agentHealthCard.autoHeal.lastAttemptAt)}
                  </p>
                </div>
                <div className="rounded-xl border border-border/50 bg-background/60 p-3">
                  <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Versão do ERP</p>
                  <p className="mt-2 text-sm text-foreground">{agentHealthCard.erp.version ?? "Sem leitura"}</p>
                  <div className="mt-1 space-y-1">
                    {agentHealthCard.erp.paths.slice(0, 2).map((path: string) => (
                      <p key={path} className="break-all text-xs text-muted-foreground">
                        {path}
                      </p>
                    ))}
                    {agentHealthCard.erp.paths.length > 2 ? (
                      <p className="text-xs text-muted-foreground">+{agentHealthCard.erp.paths.length - 2} caminho(s)</p>
                    ) : null}
                  </div>
                </div>
              </div>

              <div className="mt-3 rounded-xl border border-border/50 bg-background/60 p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium text-foreground">Desired state do dispositivo</p>
                    <p className="text-sm text-muted-foreground">
                      Instalações Syspro que o portal está projetando para o módulo `device`.
                    </p>
                  </div>
                  <Badge variant="outline" className="border-border/60 bg-background/70 text-muted-foreground">
                    {desiredSysproInstalls.length} instalação(ões)
                  </Badge>
                </div>
                {desiredSysproInstalls.length ? (
                  <div className="mt-4 grid gap-3 md:grid-cols-2">
                    {desiredSysproInstalls.map((install) => (
                      <div key={`${install.companyId}-${install.serverPath}`} className="rounded-lg border border-border/40 bg-background/50 p-3">
                        <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Empresa</p>
                        <p className="mt-1 text-sm text-foreground">{install.companyName}</p>
                        <p className="mt-3 text-[11px] uppercase tracking-wide text-muted-foreground">server_path</p>
                        <p className="mt-1 break-all font-mono text-xs text-foreground">{install.serverPath}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="mt-4 rounded-lg border border-dashed border-border/50 bg-background/40 p-3 text-sm text-muted-foreground">
                    Nenhuma instalação vinculada está sendo projetada para o agente.
                  </div>
                )}
              </div>
              <div className="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                <div className="rounded-xl border border-border/50 bg-background/60 p-3">
                  <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Última descoberta</p>
                  <p className="mt-2 text-sm text-foreground">{formatDateTime(details.agentHealth.lastDiscoverAt)}</p>
                </div>
                <div className="rounded-xl border border-border/50 bg-background/60 p-3">
                  <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Último sync</p>
                  <p className="mt-2 text-sm text-foreground">{formatDateTime(details.agentHealth.lastSyncAt)}</p>
                </div>
                <div className="rounded-xl border border-border/50 bg-background/60 p-3">
                  <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Falhas consecutivas</p>
                  <p className="mt-2 text-sm text-foreground">{details.agentHealth.consecutiveFailures}</p>
                </div>
                <div className="rounded-xl border border-border/50 bg-background/60 p-3">
                  <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Bootstrap 24h</p>
                  <p className="mt-2 text-sm text-foreground">
                    {bootstrapRateMetrics.ratePct === null ? "Sem leitura" : `${bootstrapRateMetrics.ratePct}%`}
                  </p>
                  {bootstrapRateMetrics.cycles !== null ? (
                    <p className="mt-1 text-xs text-muted-foreground">
                      {bootstrapRateMetrics.bootstrapCycles ?? 0}/{bootstrapRateMetrics.cycles} ciclos com vinculação
                    </p>
                  ) : null}
                </div>
              </div>

              <div className="mt-3 rounded-xl border border-border/50 bg-background/60 p-4">
                <p className="text-sm font-medium text-foreground">Compatibilidade do protocolo agente-portal</p>
                <div className="mt-3 grid gap-3 md:grid-cols-3">
                  <div className="rounded-lg border border-border/40 bg-background/50 p-3">
                    <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Discover schema</p>
                    <p className="mt-2 text-xs text-muted-foreground">
                      esperado: <span className="font-mono text-foreground">{EXPECTED_SCHEMA_VERSIONS.discover}</span>
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      recebido: <span className="font-mono text-foreground">{contractSchemaVersions.discover ?? "Sem leitura"}</span>
                    </p>
                  </div>
                  <div className="rounded-lg border border-border/40 bg-background/50 p-3">
                    <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Sync schema</p>
                    <p className="mt-2 text-xs text-muted-foreground">
                      esperado: <span className="font-mono text-foreground">{EXPECTED_SCHEMA_VERSIONS.sync}</span>
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      recebido: <span className="font-mono text-foreground">{contractSchemaVersions.sync ?? "Sem leitura"}</span>
                    </p>
                  </div>
                  <div className="rounded-lg border border-border/40 bg-background/50 p-3">
                    <p className="text-[11px] uppercase tracking-wide text-muted-foreground">ACK schema</p>
                    <p className="mt-2 text-xs text-muted-foreground">
                      esperado: <span className="font-mono text-foreground">{EXPECTED_SCHEMA_VERSIONS.ack}</span>
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      recebido: <span className="font-mono text-foreground">{contractSchemaVersions.ack ?? "Sem leitura"}</span>
                    </p>
                  </div>
                </div>
                <div className="mt-3 rounded-lg border border-border/40 bg-background/50 p-3">
                  <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Último erro de validação</p>
                  <p className="mt-1 break-all text-xs text-foreground">
                    {contractValidationError ?? "Sem erro de validação detectado no último ciclo."}
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-border/50 bg-background/40 p-4">
              <p className="text-sm font-medium text-foreground">Ações manuais de recuperação</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Use estas ações apenas quando houver divergência real no agente. O fluxo normal de sync já tenta
                corrigir alias e configuração automaticamente.
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
              <Button variant="outline" onClick={handleRotateAgentToken} disabled={isRevokingAgentToken} className="w-full gap-2 sm:w-auto">
                <Fingerprint className="h-4 w-4" />
                {isRevokingAgentToken ? "Renovando..." : "Renovar credencial do agente"}
              </Button>
              <Button
                variant="outline"
                onClick={() => handleRequestRemoteAction("RESEND_CONFIG")}
                disabled={isRequestingResendConfig}
                className="w-full gap-2 sm:w-auto"
              >
                <Copy className="h-4 w-4" />
                {isRequestingResendConfig ? "Solicitando..." : "Reaplicar configuração do módulo"}
              </Button>
              <Button
                variant="outline"
                onClick={() => handleRequestRemoteAction("REAPPLY_ALIAS")}
                disabled={isRequestingSelfHeal}
                className="w-full gap-2 sm:w-auto"
              >
                <HardDriveDownload className="h-4 w-4" />
                {isRequestingSelfHeal ? "Solicitando..." : "Reaplicar alias do RustDesk"}
              </Button>
              </div>
            </div>

            <details className="group rounded-xl border border-border/50 bg-muted/10 p-4">
              <summary className="cursor-pointer list-none text-sm font-medium text-foreground">
                Conformidade do módulo remoto
              </summary>
              <div className="mt-4 rounded-xl border border-border/50 bg-muted/15 p-4">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm font-medium text-foreground">Conformidade do módulo remoto</p>
                    <p className="text-sm text-muted-foreground">
                      O portal compara o que espera do host com o que o agente reportou no último sync.
                    </p>
                  </div>
                  <Badge variant="outline" className="w-fit border-border/60 bg-background/70 text-muted-foreground">
                    Última sync: {formatDateTime(rustDeskCompliance.lastSyncAt)}
                  </Badge>
                </div>

                <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-5">
                  {rustDeskCompliance.items.map((item) => (
                    <div key={item.id} className="rounded-xl border border-border/50 bg-background/60 p-4">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{item.label}</p>
                        <Badge
                          variant="outline"
                          className={
                            item.match
                              ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                              : "border-amber-500/20 bg-amber-500/10 text-amber-700 dark:text-amber-300"
                          }
                        >
                          {item.match ? "Conforme" : item.reported ? "Divergente" : "Sem leitura"}
                        </Badge>
                      </div>
                      <p className="mt-3 text-[11px] uppercase tracking-wide text-muted-foreground">Esperado</p>
                      <p className="mt-1 break-all text-sm text-foreground">{item.expected}</p>
                      <p className="mt-3 text-[11px] uppercase tracking-wide text-muted-foreground">Reportado</p>
                      <p className="mt-1 break-all text-sm text-foreground">{item.reported ?? "Sem leitura do agente"}</p>
                    </div>
                  ))}
                </div>
              </div>
            </details>

            <details className="group rounded-xl border border-border/50 bg-muted/10 p-4" open>
              <summary className="cursor-pointer list-none text-sm font-medium text-foreground">
                Fila de ações e execução
              </summary>
              <div className="mt-4 rounded-xl border border-border/50 bg-muted/15 p-4">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm font-medium text-foreground">Fila de ações do agente</p>
                    <p className="text-sm text-muted-foreground">
                      Comandos emitidos pelo portal com retorno de confirmação, resultado e telemetria de execução.
                    </p>
                  </div>
                  <Badge variant="outline" className="w-fit border-border/60 bg-background/70 text-muted-foreground">
                    {visibleAgentCommands.length} item(ns)
                  </Badge>
                </div>
                {hiddenAcknowledgedCount > 0 ? (
                  <p className="mt-2 text-xs text-muted-foreground">
                    {hiddenAcknowledgedCount} ACK antigo(s) ocultado(s) automaticamente.
                  </p>
                ) : null}

                {visibleAgentCommands.length ? (
                  <div className="mt-4 grid gap-3 md:grid-cols-2">
                    {visibleAgentCommands.map((command) => {
                      const statusMeta = getCommandStatusMeta(command);
                      const structuredReasonCode = extractStringFromPayload(command.resultPayload, ["reasonCode", "reason_code"]);
                      const structuredReasonLabel = structuredReasonCode
                        ? (isRemoteAgentAckReasonCode(structuredReasonCode)
                          ? AGENT_ACK_REASON_LABEL[structuredReasonCode as RemoteAgentAckReasonCode]
                          : "Código não catalogado")
                        : null;
                      return (
                        <div key={command.id} className="rounded-xl border border-border/50 bg-background/60 p-4">
                          <div className="flex items-center justify-between gap-3">
                            <p className="text-sm font-medium text-foreground">{AGENT_COMMAND_LABEL[command.type as keyof typeof AGENT_COMMAND_LABEL]}</p>
                            <Badge variant="outline" className={statusMeta.className}>
                              {statusMeta.label}
                            </Badge>
                          </div>
                          <p className="mt-2 text-sm text-muted-foreground">
                            {command.reason ?? "Sem justificativa adicional registrada."}
                          </p>
                          {structuredReasonCode ? (
                            <p className="mt-1 text-xs text-muted-foreground">
                              reasonCode: <span className="font-mono text-foreground">{structuredReasonCode}</span>{structuredReasonLabel ? ` - ${structuredReasonLabel}` : ""}
                            </p>
                          ) : null}
                          {command.resultMessage ? (
                            <p className="mt-2 text-sm text-foreground">Resultado: {command.resultMessage}</p>
                          ) : null}
                          <p className="mt-3 text-xs text-muted-foreground">
                            Criado em {formatDateTime(command.createdAt)}
                            {command.deliveredAt ? ` | entregue em ${formatDateTime(command.deliveredAt)}` : ""}
                            {command.executedAt ? ` | executado em ${formatDateTime(command.executedAt)}` : ""}
                            {command.failedAt ? ` | falhou em ${formatDateTime(command.failedAt)}` : ""}
                          </p>
                          <p className="mt-1 text-xs text-muted-foreground">Tentativas de entrega: {command.attemptCount}</p>
                          {command.resultPayload ? (
                            <div className="mt-3 rounded-lg border border-border/50 bg-muted/20 p-3">
                              <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Telemetria do agente</p>
                              <pre className="mt-2 overflow-x-auto whitespace-pre-wrap break-all text-xs text-muted-foreground">
                                {JSON.stringify(command.resultPayload, null, 2)}
                              </pre>
                            </div>
                          ) : null}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="mt-4 rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-4 text-sm text-emerald-700 dark:text-emerald-300">
                    Nenhuma ação pendente. O host reportado está aderente ao que o portal espera neste momento.
                  </div>
                )}
              </div>
            </details>


            {hasPendingInstallGuide ? (
              <details className="group rounded-xl border border-border/50 bg-muted/10 p-4">
                <summary className="cursor-pointer list-none text-sm font-medium text-foreground">
                  Checklist de prontidão
                </summary>
                <div className="mt-4 grid gap-3 md:grid-cols-2">
                  {details.installGuide.map((step) => (
                    <div key={step.id} className="rounded-xl border border-border/50 bg-muted/15 p-4">
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-sm font-medium text-foreground">{step.title}</p>
                        <Badge variant="outline" className={step.done ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300" : "border-amber-500/20 bg-amber-500/10 text-amber-700 dark:text-amber-300"}>
                          {step.done ? "OK" : "Pendente"}
                        </Badge>
                      </div>
                      <p className="mt-2 text-sm text-muted-foreground">{step.description}</p>
                    </div>
                  ))}
                </div>

                <div className="mt-3 flex flex-wrap items-center gap-2 rounded-xl border border-border/50 bg-muted/15 p-4 text-sm text-muted-foreground">
                  <span>Consulte o guia técnico para execução assistida do fluxo de vínculo e heartbeat.</span>
                </div>
              </details>
            ) : null}
          </div>
        </details>
      </CardContent>
        </Card>
      </div>
    </div>
  );
}

function SectionLabel({ title }: { title: string }) {
  return (
    <div className="mb-3 flex items-center gap-3">
      <span className="shrink-0 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
        {title}
      </span>
      <div className="h-px flex-1 bg-border/40" />
    </div>
  );
}
