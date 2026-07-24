"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@dosc-syspro/ui";
import type { AgentInstallationSummary } from "@dosc-syspro/contracts/agent";
import type { RemoteHostDetails } from "@/features/remote/domain/remote-host.types";
import { requestRemoteMutation, getRemoteApiErrorMessage } from "@/features/remote/interface/remote-api";
import { copyTextWithFallback } from "./host-details/host-details.helpers";
import { DEFAULT_INSTALLATION_DIRECTORY, UNLINKED_COMPANY_VALUE, supportsManagedAgentUpgrade, type RemoteHostManualAction } from "./host-details/host-details.constants";
import { useHostComputedValues } from "./host-details/hooks/use-host-computed-values";
import { useHostIdentityDraft } from "./host-details/hooks/use-host-identity-draft";
import { ConfirmActionDialog } from "@/components/platform/cadastros/shared/confirm-action-dialog";
import {
  HostHeroHeader,
  HostOverviewTab,
  HostBackupTab,
  HostServicesTab,
  HostSettingsTab,
  HostDiagnosticsTab,
  HostCriticalEventsTab,
} from "./host-details/components";
import { ErpTab } from "@/features/infrastructure/device/erp/erp-tab";
import { parseHostDetailsTab, type HostDetailsTab } from "@/features/infrastructure/device/domain/device-detail-paths";
import { useRustDeskConnect } from "@/features/infrastructure/device/hooks/use-rustdesk-connect";

export function RemoteHostDetailsPanel({
  details,
  linkedDevice = null,
}: {
  details: RemoteHostDetails;
  linkedDevice?: AgentInstallationSummary | null;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { host } = details;

  // ── UI state ────────────────────────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState<HostDetailsTab>(() =>
    searchParams.get("edit") === "true" ? "geral" : parseHostDetailsTab(searchParams.get("tab")),
  );
  const [openIdentityOnMount] = useState(() => searchParams.get("edit") === "true");
  const [installationFilter, setInstallationFilter] = useState<"all" | "unlinked">("all");
  const { isMobileClient, isConnecting, connect } = useRustDeskConnect();
  const [bulkInstallationCompanyId, setBulkInstallationCompanyId] = useState(details.companyOptions[0]?.id ?? "");
  const [selectedCompanyByUpdateId, setSelectedCompanyByUpdateId] = useState<Record<string, string>>({});
  const [manualInstallationCompanyId, setManualInstallationCompanyId] = useState(
    host.companyId ?? details.companyOptions[0]?.id ?? "",
  );
  const [manualInstallationPath, setManualInstallationPath] = useState(DEFAULT_INSTALLATION_DIRECTORY);
  const [ticketDetails, setTicketDetails] = useState<{ title: string; state: string; priority: string } | null>(null);
  const [isLoadingTicket, setIsLoadingTicket] = useState(false);

  // ── Transitions ──────────────────────────────────────────────────────────────
  const [isRevokingAgentToken, startRevokingAgentToken] = useTransition();
  const [isRequestingResendConfig, startRequestingResendConfig] = useTransition();
  const [isRequestingSelfHeal, startRequestingSelfHeal] = useTransition();
  const [isRelinkingInstallation, startRelinkingInstallation] = useTransition();
  const [isBulkRelinkingInstallations, startBulkRelinkingInstallations] = useTransition();
  const [isCreatingManualInstallation, startCreatingManualInstallation] = useTransition();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeletingHost, startDeletingHost] = useTransition();
  const [isRequestingUpgrade, startRequestingUpgrade] = useTransition();
  const [isRequestingAgentUpgrade, startRequestingAgentUpgrade] = useTransition();
  const [showRevokeConfirm, setShowRevokeConfirm] = useState(false);

  // ── Computed values (memos) ──────────────────────────────────────────────────
  const computed = useHostComputedValues(details, installationFilter);
  const {
    agent,
    normalizedRustdeskId,
    windowsComputerName,
    rustDeskCompliance,
    visibleAgentCommands,
    hiddenAcknowledgedCount,
    hasPendingInstallGuide,
    dedupedInstallationContexts,
    installationContextsForDisplay,
    unlinkedInstallationsCount,
    canManageInstallations,
    serviceStatusIcon,
    diskSnapshot,
    rebootPending,
    agentHealthCard,
    autoHealStatusIcon,
    productStatusMeta,
    bootstrapRateMetrics,
    contractSchemaVersions,
    contractValidationError,
    orchestrationStrategy,
    machineIpv4,
    internetIpv4,
    firebirdData,
    heartbeat,
  } = computed;

  const identity = useHostIdentityDraft({
    host,
    companyOptions: details.companyOptions,
    agentRustdeskId: agent.rustdeskId,
    agentMachineName: agent.machineName,
    openOnMount: openIdentityOnMount,
  });

  const ticketNumber = searchParams.get("ticketNumber");
  const canRequestAgentUpgrade = supportsManagedAgentUpgrade(agent.agentVersion);

  function updateHostDetailsQuery(mutate: (params: URLSearchParams) => void) {
    const params = new URLSearchParams(searchParams.toString());
    mutate(params);
    const qs = params.toString();
    router.replace(qs ? `?${qs}` : "?", { scroll: false });
  }

  function handleTabChange(nextTab: string) {
    const parsed = parseHostDetailsTab(nextTab);
    setActiveTab(parsed);
    updateHostDetailsQuery((params) => {
      if (parsed === "geral") {
        params.delete("tab");
      } else {
        params.set("tab", parsed);
      }
    });
  }

  // ── Effects ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    setActiveTab(parseHostDetailsTab(searchParams.get("tab")));
  }, [searchParams]);

  useEffect(() => {
    if (searchParams.get("edit") !== "true") return;
    updateHostDetailsQuery((params) => {
      params.delete("edit");
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- clear one-shot edit deep-link once
  }, []);

  useEffect(() => {
    if (ticketNumber) {
      setIsLoadingTicket(true);
      fetch(`/api/tickets/${ticketNumber}`)
        .then((res) => res.json())
        .then((data) => { if (!data.error) setTicketDetails(data); })
        .finally(() => setIsLoadingTicket(false));
    }
  }, [ticketNumber]);

  useEffect(() => {
    setManualInstallationCompanyId(host.companyId ?? details.companyOptions[0]?.id ?? "");
  }, [details.companyOptions, host.companyId]);

  useEffect(() => {
    const next: Record<string, string> = {};
    for (const context of dedupedInstallationContexts) {
      next[context.update.id] = context.update.companyId ?? UNLINKED_COMPANY_VALUE;
    }
    setSelectedCompanyByUpdateId(next);
  }, [dedupedInstallationContexts]);

  useEffect(() => {
    if (details.companyOptions.length === 0) return;
    setBulkInstallationCompanyId((current) => current || details.companyOptions[0].id);
  }, [details.companyOptions]);

  // ── Action handlers ───────────────────────────────────────────────────────────
  async function handleCopy(value: string | null, label: string) {
    if (!value) { toast.error(`${label} não configurado.`); return; }
    try {
      await copyTextWithFallback(value);
      toast.success(`${label} copiado.`);
    } catch {
      toast.error(`Falha ao copiar ${label.toLowerCase()}.`);
    }
  }

  function handleRotateAgentToken() {
    startRevokingAgentToken(async () => {
      try {
        const result = await requestRemoteMutation<Record<string, unknown>>({
          url: `/api/remote/hosts/${host.id}/agent-token`,
          method: "POST",
        });
        toast.success(result.message ?? "Credencial do agente renovada.");
        router.refresh();
      } catch (error) {
        toast.error(getRemoteApiErrorMessage(error));
      }
    });
  }

  function handleRevokeAgentToken() {
    startRevokingAgentToken(async () => {
      try {
        const result = await requestRemoteMutation<Record<string, unknown>>({
          url: `/api/remote/hosts/${host.id}/agent-token`,
          method: "DELETE",
        });
        toast.success(result.message ?? "Credencial do agente revogada.");
        setShowRevokeConfirm(false);
        router.refresh();
      } catch (error) {
        toast.error(getRemoteApiErrorMessage(error));
      }
    });
  }

  function handleDeleteHost() {
    startDeletingHost(async () => {
      try {
        await requestRemoteMutation({
          url: `/api/remote/hosts/${host.id}`,
          method: "DELETE",
        });
        toast.success("Dispositivo excluído com sucesso.");
        setShowDeleteConfirm(false);
        router.push("/portal/infraestrutura?tab=dispositivos");
        router.refresh();
      } catch (error) {
        toast.error(getRemoteApiErrorMessage(error));
      }
    });
  }

  function handleRequestRemoteAction(action: RemoteHostManualAction) {
    const run = async () => {
      try {
        const result = await requestRemoteMutation<Record<string, unknown>>({
          url: `/api/remote/hosts/${host.id}/actions`,
          method: "POST",
          body: { action },
        });
        toast.success(
          result.message ??
            (action === "UPGRADE_AGENT"
              ? "Atualização do agente agendada. Confirme a nova versão no próximo heartbeat."
              : "Ação manual do agente enfileirada."),
        );
        router.refresh();
      } catch (error) {
        toast.error(getRemoteApiErrorMessage(error));
      }
    };
    if (action === "RESEND_CONFIG") { startRequestingResendConfig(run); return; }
    if (action === "UPGRADE_CLIENT") { startRequestingUpgrade(run); return; }
    if (action === "UPGRADE_AGENT") { startRequestingAgentUpgrade(run); return; }
    startRequestingSelfHeal(run);
  }

  function handleRelinkInstallation(updateId: string, companyId: string | null) {
    startRelinkingInstallation(async () => {
      try {
        await requestRemoteMutation({
          url: `/api/remote/hosts/${host.id}/syspro-updates/${updateId}`,
          method: "PATCH",
          body: { companyId, mode: "replace" },
        });
        toast.success(companyId ? "Instalação vinculada com sucesso." : "Vínculo removido com sucesso.");
        router.refresh();
      } catch (error) {
        toast.error(getRemoteApiErrorMessage(error));
      }
    });
  }

  function handleAddCompanyToInstallation(updateId: string, companyId: string) {
    startRelinkingInstallation(async () => {
      try {
        await requestRemoteMutation({
          url: `/api/remote/hosts/${host.id}/syspro-updates/${updateId}`,
          method: "PATCH",
          body: { companyId, mode: "add" },
        });
        toast.success("Empresa adicionada à instalação com sucesso.");
        router.refresh();
      } catch (error) {
        toast.error(getRemoteApiErrorMessage(error));
      }
    });
  }

  function handleBulkRelinkInstallations(companyId: string | null) {
    if (!installationContextsForDisplay.length) {
      toast.error("Nenhuma instalação disponível para a ação em lote.");
      return;
    }
    startBulkRelinkingInstallations(async () => {
      try {
        await Promise.all(
          installationContextsForDisplay.map((context) =>
            requestRemoteMutation({
              url: `/api/remote/hosts/${host.id}/syspro-updates/${context.update.id}`,
              method: "PATCH",
              body: { companyId, mode: companyId ? "add" : "replace" },
            }),
          ),
        );
        toast.success(
          companyId
            ? `Empresa adicionada em ${installationContextsForDisplay.length} instalação(ões).`
            : `Vínculo removido em ${installationContextsForDisplay.length} instalação(ões).`,
        );
        router.refresh();
      } catch (error) {
        toast.error(getRemoteApiErrorMessage(error));
      }
    });
  }

  function handleCreateManualInstallation() {
    if (!manualInstallationCompanyId) { toast.error("Selecione a empresa da instalação."); return; }
    const normalizedPath = manualInstallationPath.trim();
    if (!normalizedPath) { toast.error("Informe o diretório monitorado da instalação."); return; }
    startCreatingManualInstallation(async () => {
      try {
        await requestRemoteMutation({
          url: `/api/remote/hosts/${host.id}/syspro-updates`,
          method: "POST",
          body: { companyId: manualInstallationCompanyId, path: normalizedPath },
        });
        toast.success("Instalação manual adicionada.");
        router.refresh();
      } catch (error) {
        toast.error(getRemoteApiErrorMessage(error));
      }
    });
  }

  function handleStartOrchestratedSession() {
    connect({
      externalId: normalizedRustdeskId,
      hostId: host.id,
      companyId: host.companyId,
      ticketNumber,
      reason: ticketNumber
        ? `Suporte via Portal para Ticket #${ticketNumber}`
        : "Acesso técnico via Portal",
      emptyError: "Dispositivo sem identificador remoto. Não é possível iniciar a sessão.",
      audit: true,
    });
  }

  // ── Render ────────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      <HostHeroHeader
        host={host}
        heartbeat={heartbeat}
        windowsComputerName={windowsComputerName}
        normalizedRustdeskId={normalizedRustdeskId}
        machineIpv4={machineIpv4}
        ticketNumber={ticketNumber}
        isStartingSession={isConnecting}
        isMobileClient={isMobileClient}
        onStartSession={handleStartOrchestratedSession}
      />

      <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-6">
        <div className="flex w-full">
          <TabsList className="grid h-auto w-full grid-cols-3 gap-1 md:grid-cols-7">
            <TabsTrigger value="geral">Visão geral</TabsTrigger>
            <TabsTrigger value="diagnostico">Diagnóstico</TabsTrigger>
            <TabsTrigger value="servicos">Serviços do dispositivo</TabsTrigger>
            <TabsTrigger value="erp">ERP</TabsTrigger>
            <TabsTrigger value="bkp">Backup</TabsTrigger>
            <TabsTrigger value="eventos">Eventos</TabsTrigger>
            <TabsTrigger value="configuracoes">Configurações</TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="geral" className="space-y-6">
          <HostOverviewTab
            host={host}
            agent={agent}
            heartbeat={heartbeat}
            companyOptions={details.companyOptions}
            windowsComputerName={windowsComputerName}
            ticketNumber={ticketNumber}
            ticketDetails={ticketDetails}
            isLoadingTicket={isLoadingTicket}
            rebootPending={rebootPending}
            contractValidationError={contractValidationError}
            windowsUpdateStatus={details.agentTelemetry.windowsUpdateStatus}
            diskSnapshot={diskSnapshot}
            agentTelemetry={details.agentTelemetry}
            erpInstallations={details.erpInstallations}
            visibleAgentCommands={visibleAgentCommands}
            agentTargetVersion={details.moduleSettings.agentTargetVersion?.trim() || null}
            agentAutoUpgrade={Boolean(details.moduleSettings.agentAutoUpgrade)}
            localIpv4={machineIpv4}
            publicIpv4={internetIpv4}
            productStatusLabel={productStatusMeta.label}
            operationalStatus={host.operationalStatus}
            projectedHostName={identity.projectedHostName}
            setProjectedHostName={identity.setProjectedHostName}
            projectedCompanyId={identity.projectedCompanyId}
            setProjectedCompanyId={identity.setProjectedCompanyId}
            projectedMachineProfile={identity.projectedMachineProfile}
            setProjectedMachineProfile={identity.setProjectedMachineProfile}
            projectedNotes={identity.projectedNotes}
            setProjectedNotes={identity.setProjectedNotes}
            canSaveProjectedHostName={identity.canSaveProjectedHostName}
            isSavingMachineName={identity.isSavingMachineName}
            onSaveHostName={identity.handleSaveProjectedHostName}
            installationCount={dedupedInstallationContexts.length}
            identitySheetOpen={identity.identitySheetOpen}
            onIdentitySheetOpenChange={identity.setIdentitySheetOpen}
          />
        </TabsContent>

        <TabsContent value="diagnostico" className="space-y-6">
          <HostDiagnosticsTab details={details} />
        </TabsContent>

        <TabsContent value="servicos">
          <HostServicesTab
            host={host}
            agent={agent}
            details={details}
            firebirdData={firebirdData}
            sysproVersionSnapshot={details.agentTelemetry.sysproVersionSnapshot}
            rustDeskCompliance={rustDeskCompliance}
            onRequestRemoteAction={handleRequestRemoteAction}
            isRequestingAgentUpgrade={isRequestingAgentUpgrade}
            canRequestAgentUpgrade={canRequestAgentUpgrade}
            onCopyRustDeskId={(val: string | null) => handleCopy(val, "ID do RustDesk")}
            onConnectRustDesk={handleStartOrchestratedSession}
          />
        </TabsContent>

        <TabsContent value="erp" className="m-0 space-y-6">
          <ErpTab details={details} hostId={host.id} />
        </TabsContent>

        <TabsContent value="bkp" className="space-y-6">
          <HostBackupTab firebirdData={firebirdData} />
        </TabsContent>

        <TabsContent value="eventos" className="space-y-6">
          <HostCriticalEventsTab hostId={host.id} initialEvents={details.criticalEvents} />
        </TabsContent>

        <TabsContent value="configuracoes" className="space-y-6">
          <HostSettingsTab
            host={host}
            details={details}
            linkedDevice={linkedDevice}
            windowsComputerName={windowsComputerName}
            onEditIdentity={() => {
              setActiveTab("geral");
              updateHostDetailsQuery((params) => {
                params.delete("tab");
              });
              identity.openIdentityEditor();
            }}
            isRevokingAgentToken={isRevokingAgentToken}
            onRotateAgentToken={handleRotateAgentToken}
            isRequestingResendConfig={isRequestingResendConfig}
            isRequestingSelfHeal={isRequestingSelfHeal}
            onRequestRemoteAction={handleRequestRemoteAction}
            onDeleteHost={() => setShowDeleteConfirm(true)}
            isDeletingHost={isDeletingHost}
            isRequestingUpgrade={isRequestingUpgrade}
            isRequestingAgentUpgrade={isRequestingAgentUpgrade}
            canRequestAgentUpgrade={canRequestAgentUpgrade}
            onRevokeAgentToken={() => setShowRevokeConfirm(true)}
            
            // From installations tab
            installationFilter={installationFilter}
            setInstallationFilter={setInstallationFilter}
            canManageInstallations={canManageInstallations}
            bulkInstallationCompanyId={bulkInstallationCompanyId}
            setBulkInstallationCompanyId={setBulkInstallationCompanyId}
            isBulkRelinkingInstallations={isBulkRelinkingInstallations}
            handleBulkRelinkInstallations={handleBulkRelinkInstallations}
            dedupedInstallationContexts={dedupedInstallationContexts}
            unlinkedInstallationsCount={unlinkedInstallationsCount}
            installationContextsForDisplay={installationContextsForDisplay}
            selectedCompanyByUpdateId={selectedCompanyByUpdateId}
            setSelectedCompanyByUpdateId={setSelectedCompanyByUpdateId}
            isRelinkingInstallation={isRelinkingInstallation}
            handleRelinkInstallation={handleRelinkInstallation}
            handleAddCompanyToInstallation={handleAddCompanyToInstallation}
            manualInstallationCompanyId={manualInstallationCompanyId}
            setManualInstallationCompanyId={setManualInstallationCompanyId}
            manualInstallationPath={manualInstallationPath}
            setManualInstallationPath={setManualInstallationPath}
            isCreatingManualInstallation={isCreatingManualInstallation}
            handleCreateManualInstallation={handleCreateManualInstallation}
            sysproVersionSnapshot={details.agentTelemetry.sysproVersionSnapshot}

            // From agent tab
            orchestrationStrategy={orchestrationStrategy}
            productStatusMeta={productStatusMeta}
            contractValidationError={contractValidationError}
            agentHealthCard={agentHealthCard}
            serviceStatusIcon={serviceStatusIcon}
            autoHealStatusIcon={autoHealStatusIcon}
            bootstrapRateMetrics={bootstrapRateMetrics}
            contractSchemaVersions={contractSchemaVersions}
            handleCopy={handleCopy}
            rustDeskCompliance={rustDeskCompliance}
            visibleAgentCommands={visibleAgentCommands}
            hiddenAcknowledgedCount={hiddenAcknowledgedCount}
            hasPendingInstallGuide={hasPendingInstallGuide}
          />
        </TabsContent>
      </Tabs>

      <ConfirmActionDialog
        open={showDeleteConfirm}
        onOpenChange={setShowDeleteConfirm}
        title="Excluir dispositivo"
        description={`Tem certeza que deseja excluir permanentemente o dispositivo "${host.name}"? Esta ação removerá todo o histórico de sessões e dados associados a esta máquina no portal.`}
        confirmLabel="Excluir permanentemente"
        cancelLabel="Cancelar"
        isLoading={isDeletingHost}
        variant="danger"
        onConfirm={handleDeleteHost}
      />

      <ConfirmActionDialog
        open={showRevokeConfirm}
        onOpenChange={setShowRevokeConfirm}
        title="Revogar acesso do agente"
        description={`Tem certeza que deseja revogar o token do agente associado a "${host.name}"? O portal parará de receber telemetria e atualizações desta máquina até que o agente seja reconfigurado.`}
        confirmLabel="Revogar acesso"
        cancelLabel="Cancelar"
        isLoading={isRevokingAgentToken}
        variant="danger"
        onConfirm={handleRevokeAgentToken}
      />

      <ConfirmActionDialog
        open={identity.showCompanyChangeConfirm}
        onOpenChange={identity.setShowCompanyChangeConfirm}
        title="Alterar empresa principal"
        description="Esta alteração atualizará a listagem do dispositivo, vínculo do agente, sessões remotas, alertas, relatórios e alias do RustDesk. As empresas vinculadas às instalações Syspro não serão alteradas automaticamente."
        confirmLabel="Confirmar alteração"
        cancelLabel="Cancelar"
        isLoading={identity.isSavingMachineName}
        onConfirm={identity.confirmCompanyChange}
      />
    </div>
  );
}
