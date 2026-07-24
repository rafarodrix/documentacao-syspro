"use client";

import { Copy, Fingerprint, HardDriveDownload, RefreshCcw, Save, Trash2, ArrowUpCircle } from "lucide-react";
import { Button, Card, CardContent, CardDescription, CardHeader, CardTitle } from "@dosc-syspro/ui";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@dosc-syspro/ui";
import type { RemoteHostDetails } from "@/features/remote/domain/remote-host.types";
import type { AgentInstallationSummary } from "@dosc-syspro/contracts/agent";
import { AgentLinkSection } from "./agent-link-section";
import { DeviceIdentityForm } from "./device-identity-form";
import { SettingsInstallationsView, type SettingsInstallationsViewProps } from "./settings-installations-view";
import { SettingsAgentView, type SettingsAgentViewProps } from "./settings-agent-view";
import type { RemoteHostManualAction } from "../host-details.constants";

type Props = SettingsInstallationsViewProps & Omit<SettingsAgentViewProps, "host"> & {
  host: RemoteHostDetails["host"];
  details: RemoteHostDetails;
  linkedDevice?: AgentInstallationSummary | null;
  projectedHostName: string;
  setProjectedHostName: (value: string) => void;
  projectedCompanyId: string;
  setProjectedCompanyId: (value: string) => void;
  projectedMachineProfile: RemoteHostDetails["host"]["machineProfile"];
  setProjectedMachineProfile: (value: RemoteHostDetails["host"]["machineProfile"]) => void;
  projectedNotes: string;
  setProjectedNotes: (value: string) => void;
  windowsComputerName: string | null;
  isSavingMachineName: boolean;
  canSaveProjectedHostName: boolean;
  onSaveHostName: () => void;
  isRevokingAgentToken: boolean;
  onRotateAgentToken: () => void;
  isRequestingResendConfig: boolean;
  isRequestingSelfHeal: boolean;
  onRequestRemoteAction: (action: RemoteHostManualAction) => void;
  onDeleteHost: () => void;
  isDeletingHost: boolean;
  isRequestingUpgrade: boolean;
  isRequestingAgentUpgrade: boolean;
  canRequestAgentUpgrade: boolean;
  onRevokeAgentToken: () => void;
};

export function HostSettingsTab(props: Props) {
  const {
    host,
    details,
    linkedDevice,
    projectedHostName,
    setProjectedHostName,
    projectedCompanyId,
    setProjectedCompanyId,
    projectedMachineProfile,
    setProjectedMachineProfile,
    projectedNotes,
    setProjectedNotes,
    windowsComputerName,
    isSavingMachineName,
    canSaveProjectedHostName,
    onSaveHostName,
    isRevokingAgentToken,
    onRotateAgentToken,
    isRequestingResendConfig,
    isRequestingSelfHeal,
    onRequestRemoteAction,
    onDeleteHost,
    isDeletingHost,
    isRequestingUpgrade,
    isRequestingAgentUpgrade,
    canRequestAgentUpgrade,
    onRevokeAgentToken,
    visibleAgentCommands,
  } = props;
  
  const { moduleSettings } = details;
  const pendingAgentUpgrade = visibleAgentCommands.find(
    (command) =>
      command.type === "UPGRADE_AGENT" &&
      (command.status === "PENDING" || command.status === "DELIVERED"),
  );
  const latestAgentUpgrade = visibleAgentCommands.find((command) => command.type === "UPGRADE_AGENT") ?? null;
  const canDeleteHost =
    details.tenantScope.role === "ADMIN" ||
    details.tenantScope.role === "SUPORTE" ||
    details.tenantScope.role === "DEVELOPER";

  return (
    <Tabs defaultValue="geral" className="flex flex-col md:flex-row gap-6">
      <div className="w-full md:w-64 shrink-0">
        <TabsList className="flex flex-col h-auto w-full items-stretch justify-start space-y-1 bg-transparent p-0">
          <TabsTrigger value="geral" className="justify-start px-4 py-2.5 text-left data-[state=active]:bg-muted">
            Identificação do dispositivo
          </TabsTrigger>
          <TabsTrigger value="instalacoes" className="justify-start px-4 py-2.5 text-left data-[state=active]:bg-muted">
            Instalações Syspro
          </TabsTrigger>
          <TabsTrigger value="agente" className="justify-start px-4 py-2.5 text-left data-[state=active]:bg-muted">
            Agente e Sincronização
          </TabsTrigger>
          <TabsTrigger value="acesso-remoto" className="justify-start px-4 py-2.5 text-left data-[state=active]:bg-muted">
            Acesso Remoto
          </TabsTrigger>
          <TabsTrigger value="zona-risco" className="justify-start px-4 py-2.5 text-left data-[state=active]:bg-muted text-red-500 data-[state=active]:text-red-500">
            Zona de Risco
          </TabsTrigger>
        </TabsList>
      </div>

      <div className="flex-1 w-full min-w-0">
        <TabsContent value="geral" className="space-y-6 m-0">
          <Card className="border-border/50">
            <CardHeader>
              <CardTitle className="text-lg">Identificação do dispositivo</CardTitle>
              <CardDescription>Defina nome amigável, empresa principal, função atribuída e observações deste dispositivo.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <DeviceIdentityForm
                displayName={projectedHostName}
                onDisplayNameChange={setProjectedHostName}
                primaryCompanyId={projectedCompanyId}
                onPrimaryCompanyIdChange={setProjectedCompanyId}
                companyOptions={details.companyOptions}
                hostname={windowsComputerName}
                machineProfile={projectedMachineProfile}
                onMachineProfileChange={setProjectedMachineProfile}
                notes={projectedNotes}
                onNotesChange={setProjectedNotes}
                disabled={isSavingMachineName}
              />

              <Button
                type="button"
                onClick={onSaveHostName}
                disabled={isSavingMachineName || !canSaveProjectedHostName}
                className="gap-2"
              >
                {isSavingMachineName ? <RefreshCcw className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                {isSavingMachineName ? "Salvando..." : "Salvar alterações"}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="instalacoes" className="space-y-6 m-0">
          <SettingsInstallationsView
            details={props.details}
            installationFilter={props.installationFilter}
            setInstallationFilter={props.setInstallationFilter}
            canManageInstallations={props.canManageInstallations}
            bulkInstallationCompanyId={props.bulkInstallationCompanyId}
            setBulkInstallationCompanyId={props.setBulkInstallationCompanyId}
            isBulkRelinkingInstallations={props.isBulkRelinkingInstallations}
            handleBulkRelinkInstallations={props.handleBulkRelinkInstallations}
            dedupedInstallationContexts={props.dedupedInstallationContexts}
            unlinkedInstallationsCount={props.unlinkedInstallationsCount}
            installationContextsForDisplay={props.installationContextsForDisplay}
            selectedCompanyByUpdateId={props.selectedCompanyByUpdateId}
            setSelectedCompanyByUpdateId={props.setSelectedCompanyByUpdateId}
            isRelinkingInstallation={props.isRelinkingInstallation}
            handleRelinkInstallation={props.handleRelinkInstallation}
            handleAddCompanyToInstallation={props.handleAddCompanyToInstallation}
            sysproVersionSnapshot={props.sysproVersionSnapshot}
            manualInstallationCompanyId={props.manualInstallationCompanyId}
            setManualInstallationCompanyId={props.setManualInstallationCompanyId}
            manualInstallationPath={props.manualInstallationPath}
            setManualInstallationPath={props.setManualInstallationPath}
            isCreatingManualInstallation={props.isCreatingManualInstallation}
            handleCreateManualInstallation={props.handleCreateManualInstallation}
          />
        </TabsContent>

        <TabsContent value="agente" className="space-y-6 m-0">
          <Card className="border-border/50">
            <CardHeader>
              <CardTitle className="text-lg">Instalação do agente</CardTitle>
              <CardDescription>
                Estado do runtime instalado neste dispositivo e vínculo usado para heartbeat e sincronização.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <AgentLinkSection
                hostId={details.host.id}
                linkedDevice={linkedDevice ?? null}
                showNavigation={false}
                showUnlink={false}
              />
            </CardContent>
          </Card>

          <SettingsAgentView
            host={host as any}
            orchestrationStrategy={props.orchestrationStrategy}
            productStatusMeta={props.productStatusMeta}
            contractValidationError={props.contractValidationError}
            agentHealthCard={props.agentHealthCard}
            serviceStatusIcon={props.serviceStatusIcon}
            autoHealStatusIcon={props.autoHealStatusIcon}
            details={props.details}
            bootstrapRateMetrics={props.bootstrapRateMetrics}
            contractSchemaVersions={props.contractSchemaVersions}
            handleCopy={props.handleCopy}
            rustDeskCompliance={props.rustDeskCompliance}
            visibleAgentCommands={props.visibleAgentCommands}
            hiddenAcknowledgedCount={props.hiddenAcknowledgedCount}
            hasPendingInstallGuide={props.hasPendingInstallGuide}
          />
        </TabsContent>

        <TabsContent value="acesso-remoto" className="space-y-6 m-0">
          <Card className="border-border/50">
            <CardHeader>
              <CardTitle className="text-lg">Perfil remoto aplicado</CardTitle>
              <CardDescription>Configuração efetiva esperada pelo portal para o agente e o RustDesk neste host.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-3">
                <div className="rounded-xl border border-border/50 bg-muted/10 p-4">
                  <p className="text-xs text-muted-foreground">Servidor remoto</p>
                  <p className="mt-1 text-sm font-medium text-foreground">{moduleSettings.rustDeskServerHost.trim() || "Sem configuração"}</p>
                </div>
                <div className="rounded-xl border border-border/50 bg-muted/10 p-4">
                  <p className="text-xs text-muted-foreground">Versão alvo do RustDesk</p>
                  <p className="mt-1 text-sm font-medium text-foreground">{moduleSettings.rustDeskVersion.trim() || "Sem configuração"}</p>
                </div>
                <div className="rounded-xl border border-border/50 bg-muted/10 p-4">
                  <p className="text-xs text-muted-foreground">Hash da chave pública</p>
                  <p className="mt-1 break-all text-sm font-medium text-foreground">
                    {moduleSettings.rustDeskPublicKeyHash?.trim() || "Sem configuração"}
                  </p>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                <div className="rounded-xl border border-border/50 bg-muted/10 p-4">
                  <p className="text-xs text-muted-foreground">Auto instalar</p>
                  <p className="mt-1 text-sm font-medium text-foreground">{moduleSettings.rustDeskAutoInstall ? "Ativo" : "Inativo"}</p>
                </div>
                <div className="rounded-xl border border-border/50 bg-muted/10 p-4">
                  <p className="text-xs text-muted-foreground">Auto atualizar</p>
                  <p className="mt-1 text-sm font-medium text-foreground">{moduleSettings.rustDeskAutoUpgrade ? "Ativo" : "Inativo"}</p>
                </div>
                <div className="rounded-xl border border-border/50 bg-muted/10 p-4">
                  <p className="text-xs text-muted-foreground">Reiniciar serviço após aplicar</p>
                  <p className="mt-1 text-sm font-medium text-foreground">{moduleSettings.rustDeskRestartServiceAfterApply ? "Ativo" : "Inativo"}</p>
                </div>
                <div className="rounded-xl border border-border/50 bg-muted/10 p-4">
                  <p className="text-xs text-muted-foreground">Suprimir atalhos da tray</p>
                  <p className="mt-1 text-sm font-medium text-foreground">{moduleSettings.rustDeskSuppressTrayShortcuts ? "Ativo" : "Inativo"}</p>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                <div className="rounded-xl border border-border/50 bg-muted/10 p-4">
                  <p className="text-xs text-muted-foreground">Ocultar tray</p>
                  <p className="mt-1 text-sm font-medium text-foreground">{moduleSettings.rustDeskHideTray ? "Ativo" : "Inativo"}</p>
                </div>
                <div className="rounded-xl border border-border/50 bg-muted/10 p-4">
                  <p className="text-xs text-muted-foreground">Ocultar parar serviço</p>
                  <p className="mt-1 text-sm font-medium text-foreground">{moduleSettings.rustDeskHideStopService ? "Ativo" : "Inativo"}</p>
                </div>
                <div className="rounded-xl border border-border/50 bg-muted/10 p-4">
                  <p className="text-xs text-muted-foreground">Permitir configuração remota local</p>
                  <p className="mt-1 text-sm font-medium text-foreground">{moduleSettings.rustDeskAllowRemoteConfigModification ? "Ativo" : "Inativo"}</p>
                </div>
                <div className="rounded-xl border border-border/50 bg-muted/10 p-4">
                  <p className="text-xs text-muted-foreground">DirectX Capture</p>
                  <p className="mt-1 text-sm font-medium text-foreground">{moduleSettings.rustDeskEnableDirectXCapture ? "Ativo" : "Inativo"}</p>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                <div className="rounded-xl border border-border/50 bg-muted/10 p-4">
                  <p className="text-xs text-muted-foreground">Permitir render D3D</p>
                  <p className="mt-1 text-sm font-medium text-foreground">{moduleSettings.rustDeskAllowD3DRender ? "Ativo" : "Inativo"}</p>
                </div>
                <div className="rounded-xl border border-border/50 bg-muted/10 p-4">
                  <p className="text-xs text-muted-foreground">Tipo do pacote</p>
                  <p className="mt-1 text-sm font-medium text-foreground">{moduleSettings.rustDeskInstallerPackageType}</p>
                </div>
                <div className="rounded-xl border border-border/50 bg-muted/10 p-4">
                  <p className="text-xs text-muted-foreground">SHA256 do instalador</p>
                  <p className="mt-1 break-all text-sm font-medium text-foreground">
                    {moduleSettings.rustDeskInstallerSha256.trim() || "Não definido"}
                  </p>
                </div>
              </div>

              <div className="rounded-xl border border-border/50 bg-muted/10 p-4">
                <p className="text-xs text-muted-foreground">URL do instalador</p>
                <p className="mt-1 break-all text-sm font-medium text-foreground">{moduleSettings.rustDeskInstallerUrl.trim() || "Não definido"}</p>
              </div>
              <div className="rounded-xl border border-border/50 bg-muted/10 p-4">
                <p className="text-xs text-muted-foreground">Argumentos do instalador</p>
                <p className="mt-1 break-all text-sm font-medium text-foreground">{moduleSettings.rustDeskInstallArgs.trim() || "Não definido"}</p>
              </div>
              <div className="rounded-xl border border-border/50 bg-muted/10 p-4">
                <p className="text-xs text-muted-foreground">Configuração exportada do servidor</p>
                <p className="mt-1 break-all text-sm font-medium text-foreground">{moduleSettings.rustDeskServerConfig.trim() || "Sem configuração"}</p>
              </div>
              <div className="rounded-xl border border-border/50 bg-muted/10 p-4">
                <p className="text-xs text-muted-foreground">Chave pública exportada</p>
                <p className="mt-1 break-all text-sm font-medium text-foreground">{moduleSettings.rustDeskPublicKey.trim() || "Sem configuração"}</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="zona-risco" className="space-y-6 m-0">
          <Card className="border-border/50">
            <CardHeader>
              <CardTitle className="text-lg">Ações do agente</CardTitle>
              <CardDescription>
                Ações manuais de recuperação, bootstrap e reconfiguração do módulo remoto. Use quando a máquina parar no fluxo ou divergir do perfil esperado.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" onClick={onRotateAgentToken} disabled={isRevokingAgentToken} className="gap-2">
                  <Fingerprint className="h-4 w-4" />
                  {isRevokingAgentToken ? "Solicitando..." : "Forçar inicialização remota"}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => onRequestRemoteAction("RESEND_CONFIG")}
                  disabled={isRequestingResendConfig}
                  className="gap-2"
                >
                  <Copy className="h-4 w-4" />
                  {isRequestingResendConfig ? "Solicitando..." : "Reaplicar configuração do módulo"}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => onRequestRemoteAction("REAPPLY_ALIAS")}
                  disabled={isRequestingSelfHeal}
                  className="gap-2"
                >
                  <HardDriveDownload className="h-4 w-4" />
                  {isRequestingSelfHeal ? "Solicitando..." : "Reaplicar alias do RustDesk"}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => onRequestRemoteAction("UPGRADE_CLIENT")}
                  disabled={isRequestingUpgrade}
                  className="gap-2"
                >
                  <ArrowUpCircle className="h-4 w-4" />
                  {isRequestingUpgrade ? "Solicitando..." : "Atualizar Cliente RustDesk"}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => onRequestRemoteAction("UPGRADE_AGENT")}
                  disabled={isRequestingAgentUpgrade || !canRequestAgentUpgrade}
                  className="gap-2"
                  title={canRequestAgentUpgrade ? undefined : "Requer agente 1.0.85 ou superior"}
                >
                  <ArrowUpCircle className="h-4 w-4" />
                  {isRequestingAgentUpgrade ? "Agendando..." : "Atualizar agente"}
                </Button>
              </div>
              <p className="mt-3 text-xs text-muted-foreground">
                &ldquo;Forçar inicialização remota&rdquo; invalida a credencial atual e faz o agente executar novo bootstrap autenticado no próximo ciclo.
                &ldquo;Atualizar agente&rdquo; usa a versão alvo <span className="font-mono text-foreground">{moduleSettings.agentTargetVersion}</span>
                {moduleSettings.agentAutoUpgrade ? " (auto-upgrade da frota ativo)" : " (auto-upgrade da frota desligado)"}.
              </p>
              {pendingAgentUpgrade || latestAgentUpgrade ? (
                <div className="mt-3 rounded-lg border border-border/50 bg-muted/15 px-3 py-2 text-xs text-muted-foreground">
                  {pendingAgentUpgrade ? (
                    <>
                      Upgrade do agente <span className="font-medium text-foreground">pendente</span>
                      {pendingAgentUpgrade.deliveredAt ? " (já entregue ao host)" : " (aguardando próximo sync)"}.
                      Acompanhe também em Configurações → Agente → fila de ações.
                    </>
                  ) : (
                    <>
                      Último UPGRADE_AGENT: status <span className="font-mono text-foreground">{latestAgentUpgrade!.status}</span>
                      {latestAgentUpgrade!.executedAt ? ` · executado` : ""}
                      {latestAgentUpgrade!.failedAt ? ` · falhou` : ""}.
                    </>
                  )}
                </div>
              ) : null}
            </CardContent>
          </Card>

          {canDeleteHost && (
            <Card className="border-red-500/20 bg-red-500/5">
              <CardHeader>
                <CardTitle className="text-lg text-red-500 flex items-center gap-2">
                  <Trash2 className="h-5 w-5 text-red-500" />
                  Zona de Perigo
                </CardTitle>
                <CardDescription className="text-red-600/80 dark:text-red-400/80">
                  Ações irreversíveis para este host remoto. Tenha certeza do que está fazendo.
                </CardDescription>
              </CardHeader>
                <CardContent className="space-y-6">
                  <div className="flex flex-col space-y-3 sm:flex-row sm:items-center sm:justify-between sm:space-y-0 border-b border-border/30 pb-4">
                    <div className="space-y-1">
                      <p className="text-sm font-medium text-foreground">Revogar credenciais do agente</p>
                      <p className="text-xs text-muted-foreground">
                        Invalida imediatamente o token de comunicação deste host. O agente parará de sincronizar dados até que um novo bootstrap seja realizado.
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      onClick={onRevokeAgentToken}
                      disabled={isRevokingAgentToken}
                      className="border-red-500/35 hover:bg-red-500/10 text-red-500 font-semibold shadow-sm flex items-center gap-2 sm:self-start"
                    >
                      <Fingerprint className="h-4 w-4 text-red-500" />
                      {isRevokingAgentToken ? "Revogando..." : "Revogar acesso"}
                    </Button>
                  </div>

                  <div className="flex flex-col space-y-3 sm:flex-row sm:items-center sm:justify-between sm:space-y-0">
                    <div className="space-y-1">
                      <p className="text-sm font-medium text-foreground">Excluir este host permanentemente</p>
                      <p className="text-xs text-muted-foreground">
                        Remove o host do portal, limpa o token do agente e encerra a sincronização. Apenas use se o host estiver obsoleto.
                      </p>
                    </div>
                    <Button
                      variant="destructive"
                      onClick={onDeleteHost}
                      disabled={isDeletingHost}
                      className="bg-red-600 hover:bg-red-700 text-white font-semibold shadow-sm flex items-center gap-2 sm:self-start"
                    >
                      {isDeletingHost ? <RefreshCcw className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                      {isDeletingHost ? "Excluindo..." : "Excluir host"}
                    </Button>
                  </div>
                </CardContent>
            </Card>
          )}
        </TabsContent>
      </div>
    </Tabs>
  );
}
