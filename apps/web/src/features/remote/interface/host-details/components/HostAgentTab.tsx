import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Copy, Fingerprint, HardDriveDownload } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatDateTime, formatRelativeHeartbeat, formatHourMinute, formatDateOnly, getCommandStatusMeta, extractStringFromPayload } from "../utils";
import { EXPECTED_SCHEMA_VERSIONS, AGENT_COMMAND_LABEL } from "../constants";
import type { RemoteAgentAckReasonCode } from "@dosc-syspro/remote-domain/ack-reason-codes";
import { isRemoteAgentAckReasonCode } from "@dosc-syspro/remote-domain/ack-reason-codes";
import { AGENT_ACK_REASON_LABEL } from "../constants";

export function HostAgentTab({
  agentTokenMeta,
  host,
  orchestrationStrategy,
  bootstrapFlowLabel,
  productStatusMeta,
  contractValidationError,
  agentHealthCard,
  serviceStatusIcon,
  autoHealStatusIcon,
  details,
  bootstrapFlowMeta,
  bootstrapRateMetrics,
  contractSchemaVersions,
  agentMetrics,
  isRevokingAgentToken,
  handleRotateAgentToken,
  isRequestingResendConfig,
  handleRequestRemoteAction,
  isRequestingSelfHeal,
  handleCopy,
  agentTokenExpiresAt,
  rustDeskCompliance,
  visibleAgentCommands,
  hiddenAcknowledgedCount,
  ackQueueMetrics,
  hasPendingInstallGuide,
}: any) {
  const ServiceStatusIcon = serviceStatusIcon.Icon;
  const AutoHealStatusIcon = autoHealStatusIcon.Icon;

  return (
    <Card className="border-border/50">
      <CardHeader>
        <CardTitle className="text-lg">Fluxo operacional do agente</CardTitle>
        <CardDescription>Recorte operacional detalhado da telemetria, health, conectividade e execucao local.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div
          className={cn(
            "rounded-xl border p-4 text-sm",
            agentTokenMeta.needsBootstrap
              ? "border-rose-500/20 bg-rose-500/10 text-rose-700 dark:text-rose-200"
              : "border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-200"
          )}
        >
          <p className="font-medium">
            {agentTokenMeta.needsBootstrap
              ? "Este host precisa de nova Vinculacao de Maquina autenticada"
              : "Este host esta no fluxo autenticado por credencial"}
          </p>
          <p className="mt-1">
            {agentTokenMeta.needsBootstrap
              ? "Execute novamente a Vinculacao de Maquina autenticada neste host e aguarde o proximo heartbeat valido."
              : "Se precisar reinstalar ou reaplicar configuracao, siga o fluxo de Vinculacao de Maquina autenticada no agente."}
          </p>
        </div>

        <div className="rounded-xl border border-border/50 bg-muted/15 p-4">
          <p className="text-sm font-medium text-foreground">Resumo operacional</p>
          <div className="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-lg border border-border/40 bg-background/50 p-3">
              <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Heartbeat</p>
              <p className="mt-1 text-sm text-foreground">{formatRelativeHeartbeat(host.lastHeartbeatAt)}</p>
              <p className="text-xs text-muted-foreground">{formatDateTime(host.lastHeartbeatAt)}</p>
            </div>
            <div className="rounded-lg border border-border/40 bg-background/50 p-3">
              <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Estrategia</p>
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
        </div>

        <details className="rounded-xl border border-border/50 bg-muted/10 p-4">
          <summary className="cursor-pointer text-sm font-medium text-foreground">
            Avancado (telemetria, comandos e diagnostico)
          </summary>
          <div className="mt-4 space-y-4">
            <div className="rounded-xl border border-border/50 bg-muted/15 p-4">
              <p className="text-sm font-medium text-foreground">Saude do agente</p>
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
                  <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Estado de Auto-cura</p>
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
                    Ultima tentativa as {formatHourMinute(agentHealthCard.autoHeal.lastAttemptAt)}
                  </p>
                </div>
                <div className="rounded-xl border border-border/50 bg-background/60 p-3">
                  <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Versao do ERP</p>
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
              <div className="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                <div className="rounded-xl border border-border/50 bg-background/60 p-3">
                  <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Ultima descoberta</p>
                  <p className="mt-2 text-sm text-foreground">{formatDateTime(details.agentHealth.lastDiscoverAt)}</p>
                </div>
                <div className="rounded-xl border border-border/50 bg-background/60 p-3">
                  <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Ultimo sync</p>
                  <p className="mt-2 text-sm text-foreground">{formatDateTime(details.agentHealth.lastSyncAt)}</p>
                </div>
                <div className="rounded-xl border border-border/50 bg-background/60 p-3">
                  <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Fluxo de vinculacao</p>
                  <Badge variant="outline" className={cn("mt-2 font-mono text-[11px]", bootstrapFlowMeta.tone)}>
                    {bootstrapFlowLabel}
                  </Badge>
                  <p className="mt-2 text-xs text-muted-foreground">{bootstrapFlowMeta.hint}</p>
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
                      {bootstrapRateMetrics.bootstrapCycles ?? 0}/{bootstrapRateMetrics.cycles} ciclos com vinculacao
                    </p>
                  ) : null}
                </div>
              </div>

              <div className="mt-3 rounded-xl border border-border/50 bg-background/60 p-4">
                <p className="text-sm font-medium text-foreground">Saude do contrato Agente para Portal</p>
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
                  <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Ultimo erro de validacao</p>
                  <p className="mt-1 break-all text-xs text-foreground">
                    {contractValidationError ?? "Sem erro de validacao detectado no ultimo ciclo."}
                  </p>
                </div>
              </div>
            </div>

            <details className="rounded-lg border border-border/40 bg-background/40 p-3">
              <summary className="cursor-pointer text-sm font-medium text-foreground">Metricas do agente (raw)</summary>
              <pre className="mt-3 overflow-x-auto whitespace-pre-wrap break-all text-xs text-muted-foreground">
                {JSON.stringify(agentMetrics ?? { status: "Sem leitura" }, null, 2)}
              </pre>
            </details>

            <div className="flex flex-wrap gap-2">
              {!agentTokenMeta.needsBootstrap ? (
                <Button variant="outline" onClick={handleRotateAgentToken} disabled={isRevokingAgentToken} className="w-full gap-2 sm:w-auto">
                  <Fingerprint className="h-4 w-4" />
                  {isRevokingAgentToken ? "Renovando..." : "Renovacao de Credencial"}
                </Button>
              ) : (
                <div className="w-full rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-700 dark:text-amber-300 sm:w-auto">
                  Nova Vinculacao de Maquina pendente
                </div>
              )}
              <Button
                variant="outline"
                onClick={() => handleRequestRemoteAction("RESEND_CONFIG")}
                disabled={isRequestingResendConfig}
                className="w-full gap-2 sm:w-auto"
              >
                <Copy className="h-4 w-4" />
                {isRequestingResendConfig ? "Solicitando..." : "Reenviar configuracao"}
              </Button>
              <Button
                variant="outline"
                onClick={() => handleRequestRemoteAction("REAPPLY_ALIAS")}
                disabled={isRequestingSelfHeal}
                className="w-full gap-2 sm:w-auto"
              >
                <HardDriveDownload className="h-4 w-4" />
                {isRequestingSelfHeal ? "Solicitando..." : "Reaplicar identidade"}
              </Button>
            </div>

            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              <div className="rounded-xl border border-border/50 bg-muted/15 p-4">
                <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Estado da credencial</p>
                <p className="mt-1 text-sm text-foreground">{agentTokenMeta.label}</p>
              </div>
              <div className="rounded-xl border border-border/50 bg-muted/15 p-4">
                <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Primeira vinculacao autenticada</p>
                <p className="mt-1 text-sm text-foreground">{formatDateTime(host.agent.lastRegisterAt)}</p>
              </div>
              <div className="rounded-xl border border-border/50 bg-muted/15 p-4">
                <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Origem da vinculacao</p>
                <p className="mt-1 text-sm text-foreground">{host.agent.lastRegisterSource ?? "Sem leitura"}</p>
              </div>
              <div className="rounded-xl border border-border/50 bg-muted/15 p-4">
                <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Emissao da credencial</p>
                <p className="mt-1 text-sm text-foreground">{formatDateTime(host.agent.agentTokenIssuedAt)}</p>
              </div>
              <div className="rounded-xl border border-border/50 bg-muted/15 p-4">
                <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Ultimo uso da credencial</p>
                <p className="mt-1 text-sm text-foreground">{formatDateTime(host.agent.agentTokenLastUsedAt)}</p>
              </div>
              <div className="rounded-xl border border-border/50 bg-muted/15 p-4">
                <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Expiracao prevista</p>
                <p className="mt-1 text-sm text-foreground">{formatDateOnly(agentTokenExpiresAt)}</p>
              </div>
            </div>

            <details className="group rounded-xl border border-border/50 bg-muted/10 p-4">
              <summary className="cursor-pointer list-none text-sm font-medium text-foreground">
                Compliance e convergencia do modulo remoto
              </summary>
              <div className="mt-4 rounded-xl border border-border/50 bg-muted/15 p-4">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm font-medium text-foreground">Compliance do modulo remoto</p>
                    <p className="text-sm text-muted-foreground">
                      O portal compara o que espera do host com o que o agente reportou no ultimo `sync`.
                    </p>
                  </div>
                  <Badge variant="outline" className="w-fit border-border/60 bg-background/70 text-muted-foreground">
                    Ultima sync: {formatDateTime(rustDeskCompliance.lastSyncAt)}
                  </Badge>
                </div>

                <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-5">
                  {rustDeskCompliance.items.map((item: any) => (
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
                Fila de acoes e telemetria de execucao
              </summary>
              <div className="mt-4 rounded-xl border border-border/50 bg-muted/15 p-4">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm font-medium text-foreground">Fila de acoes do agente</p>
                    <p className="text-sm text-muted-foreground">
                      Comandos emitidos pelo portal com retorno de ACK, resultado e telemetria de execucao.
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
                    {visibleAgentCommands.map((command: any) => {
                      const statusMeta = getCommandStatusMeta(command);
                      const structuredReasonCode = extractStringFromPayload(command.resultPayload, ["reasonCode", "reason_code"]);
                      const structuredReasonLabel = structuredReasonCode
                        ? (isRemoteAgentAckReasonCode(structuredReasonCode)
                          ? AGENT_ACK_REASON_LABEL[structuredReasonCode as RemoteAgentAckReasonCode]
                          : "Codigo nao catalogado")
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
                    Nenhuma acao pendente. O host reportado esta aderente ao que o portal espera neste momento.
                  </div>
                )}
              </div>
            </details>

            <details className="group rounded-xl border border-border/50 bg-muted/10 p-4">
              <summary className="cursor-pointer list-none text-sm font-medium text-foreground">
                Observabilidade operacional do host
              </summary>
              <div className="mt-4 grid gap-3 md:grid-cols-3 xl:grid-cols-5">
                <div className="rounded-xl border border-border/50 bg-muted/15 p-4">
                  <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Taxa de sucesso 24h</p>
                  <p className="mt-1 text-2xl font-semibold text-foreground">{details.commandSuccessRates.window24h}%</p>
                </div>
                <div className="rounded-xl border border-border/50 bg-muted/15 p-4">
                  <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Taxa de sucesso 7d</p>
                  <p className="mt-1 text-2xl font-semibold text-foreground">{details.commandSuccessRates.window7d}%</p>
                </div>
                <div className="rounded-xl border border-border/50 bg-muted/15 p-4">
                  <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Taxa de sucesso 30d</p>
                  <p className="mt-1 text-2xl font-semibold text-foreground">{details.commandSuccessRates.window30d}%</p>
                </div>
                <div className="rounded-xl border border-border/50 bg-muted/15 p-4">
                  <p className="text-[11px] uppercase tracking-wide text-muted-foreground">ACK pendente</p>
                  <p className="mt-1 text-2xl font-semibold text-foreground">{ackQueueMetrics.pending}</p>
                  <p className="text-xs text-muted-foreground">PENDING/DELIVERED aguardando retorno final</p>
                </div>
                <div className="rounded-xl border border-border/50 bg-muted/15 p-4">
                  <p className="text-[11px] uppercase tracking-wide text-muted-foreground">ACK reprocessado</p>
                  <p className="mt-1 text-2xl font-semibold text-foreground">{ackQueueMetrics.reprocessed}</p>
                  <p className="text-xs text-muted-foreground">Comandos com mais de 1 tentativa</p>
                </div>
              </div>

              <div className="mt-3 rounded-xl border border-border/50 bg-muted/15 p-4">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm font-medium text-foreground">Timeline operacional do host</p>
                    <p className="text-sm text-muted-foreground">Historico de criacao, entrega, execucao e falha por comando.</p>
                  </div>
                  <Badge variant="outline" className="w-fit border-border/60 bg-background/70 text-muted-foreground">
                    {details.commandTimeline.length} evento(s)
                  </Badge>
                </div>
                {details.commandTimeline.length ? (
                  <div className="mt-4 space-y-4">
                    {details.commandTimeline.map((item: any) => (
                      <div key={item.id} className="relative pl-6">
                        <div className="absolute left-0 top-1 h-3 w-3 rounded-full bg-muted-foreground" />
                        <div className="absolute bottom-0 left-[5px] top-4 w-[2px] bg-border/50 last:hidden" />
                        <p className="text-sm font-medium text-foreground">{item.description ?? AGENT_COMMAND_LABEL[item.type as keyof typeof AGENT_COMMAND_LABEL]}</p>
                        <p className="mt-1 text-xs text-muted-foreground">{formatDateTime(item.timestamp ?? item.createdAt)}</p>
                        {item.payload ? (
                          <pre className="mt-2 overflow-x-auto whitespace-pre-wrap break-all rounded-md bg-background/60 p-2 text-xs text-muted-foreground">
                            {JSON.stringify(item.payload, null, 2)}
                          </pre>
                        ) : null}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="mt-4 text-sm text-muted-foreground">Nenhum historico de diagnostico registrado.</p>
                )}
              </div>
            </details>

            {hasPendingInstallGuide ? (
              <details className="group rounded-xl border border-border/50 bg-muted/10 p-4">
                <summary className="cursor-pointer list-none text-sm font-medium text-foreground">
                  Resumo de prontidao operacional
                </summary>
                <div className="mt-4 grid gap-3 md:grid-cols-2">
                  {details.installGuide.map((step: any) => (
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
                  <span>Consulte o playbook tecnico para execucao assistida do fluxo de vinculacao e heartbeat.</span>
                </div>
              </details>
            ) : null}
          </div>
        </details>
      </CardContent>
    </Card>
  );
}
