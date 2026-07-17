"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@dosc-syspro/ui";
import type { AgentInstallationSummary } from "@dosc-syspro/contracts/agent";
import type { RemoteHostDetails } from "@/features/remote/domain/remote-host.types";
import { requestRemoteSessionAction } from "@/features/remote/application/session-actions";
import { getRemoteApiErrorMessage, requestRemoteMutation } from "@/features/remote/interface/remote-api";
import { copyTextWithFallback } from "./host-details/host-details.helpers";
import { DEFAULT_INSTALLATION_DIRECTORY, UNLINKED_COMPANY_VALUE } from "./host-details/host-details.constants";
import { useHostComputedValues } from "./host-details/hooks/use-host-computed-values";
import { ConfirmActionDialog } from "@/components/platform/cadastros/shared/confirm-action-dialog";
import {
  HostHeroHeader,
  HostOverviewTab,
  HostBackupTab,
  HostSettingsTab,
  HostTechnicalTab,
  HostInstallationsTab,
  HostAgentTab,
  HostSoftwareTab,
} from "./host-details/components";

export function RemoteHostDetailsPanel({
  details,
  linkedDevice = null,
}: {
  details: RemoteHostDetails;
  linkedDevice?: AgentInstallationSummary | null;
}) {
  const router = useRouter();
  const { host } = details;

  // ── UI state ────────────────────────────────────────────────────────────────
  const [projectedHostName, setProjectedHostName] = useState(host.name);
  const [projectedMachineProfile, setProjectedMachineProfile] = useState<RemoteHostDetails["host"]["machineProfile"]>(
    host.machineProfile,
  );
  const [isMobileClient, setIsMobileClient] = useState(false);
  const [installationFilter, setInstallationFilter] = useState<"all" | "unlinked">("all");
  const [bulkInstallationCompanyId, setBulkInstallationCompanyId] = useState(details.companyOptions[0]?.id ?? "");
  const [selectedCompanyByUpdateId, setSelectedCompanyByUpdateId] = useState<Record<string, string>>({});
  const [manualInstallationCompanyId, setManualInstallationCompanyId] = useState(
    host.companyId ?? details.companyOptions[0]?.id ?? "",
  );
  const [manualInstallationPath, setManualInstallationPath] = useState(
    details.company.installationDirectory?.trim() || DEFAULT_INSTALLATION_DIRECTORY,
  );
  const [companyContextDraftByCompanyId, setCompanyContextDraftByCompanyId] = useState<
    Record<
      string,
      {
        serverType: "SYSPRO_SERVER" | "IIS" | "__none__";
        installationDirectory: string;
        serverHost: string;
        serverPort: string;
        serverProtocol: "HTTP" | "HTTPS" | "__none__";
        iisIsapiPath: string;
        observacoes: string;
      }
    >
  >({});
  const [savingCompanyContextId, setSavingCompanyContextId] = useState<string | null>(null);
  const [ticketDetails, setTicketDetails] = useState<{ title: string; state: string; priority: string } | null>(null);
  const [isLoadingTicket, setIsLoadingTicket] = useState(false);

    // ── Transitions ──────────────────────────────────────────────────────────────
  const [isSavingMachineName, startSavingMachineName] = useTransition();
  const [isRevokingAgentToken, startRevokingAgentToken] = useTransition();
  const [isRequestingResendConfig, startRequestingResendConfig] = useTransition();
  const [isRequestingSelfHeal, startRequestingSelfHeal] = useTransition();
  const [isRelinkingInstallation, startRelinkingInstallation] = useTransition();
  const [isBulkRelinkingInstallations, startBulkRelinkingInstallations] = useTransition();
  const [isCreatingManualInstallation, startCreatingManualInstallation] = useTransition();
  const [isSavingCompanyContext, startSavingCompanyContext] = useTransition();
  const [isStartingSession, startSessionTransition] = useTransition();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeletingHost, startDeletingHost] = useTransition();
  const [isRequestingUpgrade, startRequestingUpgrade] = useTransition();
  const [showRevokeConfirm, setShowRevokeConfirm] = useState(false);

  // ── Computed values (memos) ──────────────────────────────────────────────────
  const computed = useHostComputedValues(details, installationFilter);
  const {
    agent,
    normalizedRustdeskId,
    windowsComputerName,
    rustdeskHref,
    serviceStatus,
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
    sysproProcessSnapshot,
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
    localGateway,
    firebirdData,
    heartbeat,
    desiredSysproInstalls,
  } = computed;

  const ticketNumber = useSearchParams().get("ticketNumber");

  const normalizedProjectedHostName = projectedHostName.trim();
  const canSaveProjectedHostName =
    (normalizedProjectedHostName.length > 0 && normalizedProjectedHostName !== host.name.trim()) ||
    projectedMachineProfile !== host.machineProfile;

  // ── Effects ──────────────────────────────────────────────────────────────────
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
    setManualInstallationPath(details.company.installationDirectory?.trim() || DEFAULT_INSTALLATION_DIRECTORY);
  }, [details.company.installationDirectory]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const userAgent = window.navigator.userAgent.toLowerCase();
    setIsMobileClient(/android|iphone|ipad|ipod|mobile/.test(userAgent));
  }, []);

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

  // ── Helpers ──────────────────────────────────────────────────────────────────
  function buildCompanyContextDraft(
    companyContext: RemoteHostDetails["installationContexts"][number]["company"],
    fallbackDirectory: string,
  ) {
    return {
      serverType: companyContext?.serverType ?? "__none__",
      installationDirectory: companyContext?.installationDirectory?.trim() || fallbackDirectory || DEFAULT_INSTALLATION_DIRECTORY,
      serverHost: companyContext?.serverHost?.trim() || "",
      serverPort: companyContext?.serverPort ? String(companyContext.serverPort) : "",
      serverProtocol: companyContext?.serverProtocol ?? "__none__",
      iisIsapiPath: companyContext?.iisIsapiPath?.trim() || "",
      observacoes: companyContext?.observacoes ?? "",
    } as const;
  }

  function updateCompanyContextDraft(
    companyId: string,
    patch: Partial<{
      serverType: "SYSPRO_SERVER" | "IIS" | "__none__";
      installationDirectory: string;
      serverHost: string;
      serverPort: string;
      serverProtocol: "HTTP" | "HTTPS" | "__none__";
      iisIsapiPath: string;
      observacoes: string;
    }>,
    companyContext: RemoteHostDetails["installationContexts"][number]["company"],
    fallbackDirectory: string,
  ) {
    setCompanyContextDraftByCompanyId((prev) => {
      const current = prev[companyId] ?? buildCompanyContextDraft(companyContext, fallbackDirectory);
      return { ...prev, [companyId]: { ...current, ...patch } };
    });
  }

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

  function handleSaveProjectedHostName() {
    if (!normalizedProjectedHostName) { toast.error("Informe um nome válido para a máquina."); return; }
    startSavingMachineName(async () => {
      try {
        await requestRemoteMutation({
          url: `/api/remote/hosts/${host.id}`,
          method: "PATCH",
          body: {
            companyId: host.companyId,
            name: normalizedProjectedHostName,
            machineName: agent.machineName,
            machineProfile: projectedMachineProfile,
            environment: null,
            provider: host.provider,
            description: host.description,
            notes: host.notes,
            agentExternalId: agent.rustdeskId,
            status: host.status,
          },
        });
        toast.success("Nome da máquina atualizado.");
      } catch (error) {
        toast.error(getRemoteApiErrorMessage(error));
      }
    });
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
        toast.success("Host excluído com sucesso.");
        setShowDeleteConfirm(false);
        router.push("/portal/infraestrutura?tab=hosts");
        router.refresh();
      } catch (error) {
        toast.error(getRemoteApiErrorMessage(error));
      }
    });
  }

  function handleRequestRemoteAction(action: "RESEND_CONFIG" | "REAPPLY_ALIAS" | "UPGRADE_CLIENT") {
    const run = async () => {
      try {
        const result = await requestRemoteMutation<Record<string, unknown>>({
          url: `/api/remote/hosts/${host.id}/actions`,
          method: "POST",
          body: { action },
        });
        toast.success(result.message ?? "Ação manual do agente enfileirada.");
        router.refresh();
      } catch (error) {
        toast.error(getRemoteApiErrorMessage(error));
      }
    };
    if (action === "RESEND_CONFIG") { startRequestingResendConfig(run); return; }
    if (action === "UPGRADE_CLIENT") { startRequestingUpgrade(run); return; }
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

  function handleSaveCompanyContext(
    companyId: string,
    companyContext: RemoteHostDetails["installationContexts"][number]["company"],
    fallbackDirectory: string,
  ) {
    const draft = companyContextDraftByCompanyId[companyId] ?? buildCompanyContextDraft(companyContext, fallbackDirectory);
    const normalizedDirectory = draft.installationDirectory.trim() || fallbackDirectory || DEFAULT_INSTALLATION_DIRECTORY;
    startSavingCompanyContext(async () => {
      setSavingCompanyContextId(companyId);
      try {
        await requestRemoteMutation({
          url: `/api/remote/companies/${companyId}/context`,
          method: "PATCH",
          body: {
            serverType: draft.serverType === "__none__" ? null : draft.serverType,
            installationDirectory: normalizedDirectory,
            serverHost: draft.serverHost.trim() || null,
            serverPort: draft.serverPort.trim() || null,
            serverProtocol: draft.serverProtocol === "__none__" ? null : draft.serverProtocol,
            iisIsapiPath: draft.iisIsapiPath.trim() || null,
            observacoes: draft.observacoes.trim() || null,
          },
        });
        toast.success("Contexto técnico da empresa atualizado.");
        router.refresh();
      } catch (error) {
        toast.error(getRemoteApiErrorMessage(error));
      } finally {
        setSavingCompanyContextId(null);
      }
    });
  }

  function handleStartOrchestratedSession() {
    if (!normalizedRustdeskId) {
      toast.error("Host sem identificador remoto. Não é possível iniciar sessão.");
      return;
    }
    const href = isMobileClient ? `rustdesk://[${normalizedRustdeskId}]` : `rustdesk://${normalizedRustdeskId}`;
    window.location.href = href;
    startSessionTransition(async () => {
      try {
        const result = await requestRemoteSessionAction({
          hostId: host.id,
          companyId: host.companyId,
          ticketNumber,
          reason: ticketNumber ? `Suporte via Portal para Ticket #${ticketNumber}` : "Acesso técnico via Portal",
        });
        if (!result.success) toast.error(result.error ?? "Falha ao registrar sessão auditada.");
      } catch {
        // Protocol already opened; audit failure is non-blocking
      }
    });
  }

  // ── Render ────────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      <HostHeroHeader
        host={host}
        heartbeat={heartbeat}
        normalizedRustdeskId={normalizedRustdeskId}
        machineIpv4={machineIpv4}
        ticketNumber={ticketNumber}
        isStartingSession={isStartingSession}
        isMobileClient={isMobileClient}
        onStartSession={handleStartOrchestratedSession}
      />

      <Tabs defaultValue="geral" className="space-y-6">
        <div className="flex w-full">
          <TabsList className="grid h-auto w-full grid-cols-3 gap-1 md:grid-cols-7">
            <TabsTrigger value="geral">Visão geral</TabsTrigger>
            <TabsTrigger value="monitoramento">Monitoramento</TabsTrigger>
            <TabsTrigger value="instalacoes">Componentes</TabsTrigger>
            <TabsTrigger value="softwares">Inventário</TabsTrigger>
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
            linkedDevice={linkedDevice}
            windowsComputerName={windowsComputerName}
            machineIpv4={machineIpv4}
            normalizedRustdeskId={normalizedRustdeskId}
            ticketNumber={ticketNumber}
            ticketDetails={ticketDetails}
            isLoadingTicket={isLoadingTicket}
            rebootPending={rebootPending}
            contractValidationError={contractValidationError}
            serviceStatus={serviceStatus}
            orchestrationStrategy={orchestrationStrategy}
            windowsUpdateStatus={details.agentTelemetry.windowsUpdateStatus}
            sysproProcessSnapshot={sysproProcessSnapshot}
            diskSnapshot={diskSnapshot}
          />
        </TabsContent>

        <TabsContent value="monitoramento">
          <HostTechnicalTab
            details={details}
            host={host}
            machineIpv4={machineIpv4}
            internetIpv4={internetIpv4}
            localGateway={localGateway}
            windowsComputerName={windowsComputerName}
            firebirdData={firebirdData}
            sysproVersionSnapshot={details.agentTelemetry.sysproVersionSnapshot}
            diskSnapshot={diskSnapshot}
            sysproProcessSnapshot={sysproProcessSnapshot}
            rebootPending={rebootPending}
            windowsUpdateStatus={details.agentTelemetry.windowsUpdateStatus}
            windowsUpdateStatusAt={details.agentTelemetry.windowsUpdateStatusAt}
          />
        </TabsContent>

        <TabsContent value="instalacoes">
          <HostInstallationsTab
            details={details}
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
            sysproVersionSnapshot={details.agentTelemetry.sysproVersionSnapshot}
            manualInstallationCompanyId={manualInstallationCompanyId}
            setManualInstallationCompanyId={setManualInstallationCompanyId}
            manualInstallationPath={manualInstallationPath}
            setManualInstallationPath={setManualInstallationPath}
            isCreatingManualInstallation={isCreatingManualInstallation}
            handleCreateManualInstallation={handleCreateManualInstallation}
            companyContextDraftByCompanyId={companyContextDraftByCompanyId}
            updateCompanyContextDraft={updateCompanyContextDraft}
            isSavingCompanyContext={isSavingCompanyContext}
            savingCompanyContextId={savingCompanyContextId}
            handleSaveCompanyContext={handleSaveCompanyContext}
          />
          <HostAgentTab
            host={host}
            orchestrationStrategy={orchestrationStrategy}
            productStatusMeta={productStatusMeta}
            contractValidationError={contractValidationError}
            agentHealthCard={agentHealthCard}
            serviceStatusIcon={serviceStatusIcon}
            autoHealStatusIcon={autoHealStatusIcon}
            details={details}
            bootstrapRateMetrics={bootstrapRateMetrics}
            contractSchemaVersions={contractSchemaVersions}
            handleCopy={handleCopy}
            rustDeskCompliance={rustDeskCompliance}
            visibleAgentCommands={visibleAgentCommands}
            hiddenAcknowledgedCount={hiddenAcknowledgedCount}
            hasPendingInstallGuide={hasPendingInstallGuide}
            desiredSysproInstalls={desiredSysproInstalls}
          />
        </TabsContent>

        <TabsContent value="softwares" className="space-y-6">
          <HostSoftwareTab
            softwareSnapshot={details.agentTelemetry.softwareSnapshot}
            softwareSnapshotAt={details.agentTelemetry.softwareSnapshotAt}
          />
        </TabsContent>

        <TabsContent value="bkp" className="space-y-6">
          <HostBackupTab firebirdData={firebirdData} />
        </TabsContent>

        <TabsContent value="eventos" className="space-y-6">
          <div className="rounded-xl border border-border/60 bg-card p-12 text-center shadow-sm">
            <h3 className="text-lg font-medium text-foreground">Eventos e Auditoria</h3>
            <p className="mt-2 text-sm text-muted-foreground">Esta aba exibirá o histórico de ações e logs de auditoria do dispositivo. Funcionalidade em desenvolvimento.</p>
          </div>
        </TabsContent>

        <TabsContent value="configuracoes" className="space-y-6">
          <HostSettingsTab
            details={details}
            linkedDevice={linkedDevice}
            projectedMachineProfile={projectedMachineProfile}
            setProjectedMachineProfile={setProjectedMachineProfile}
            isSavingMachineName={isSavingMachineName}
            canSaveProjectedHostName={canSaveProjectedHostName}
            onSaveHostName={handleSaveProjectedHostName}
            isRevokingAgentToken={isRevokingAgentToken}
            onRotateAgentToken={handleRotateAgentToken}
            isRequestingResendConfig={isRequestingResendConfig}
            isRequestingSelfHeal={isRequestingSelfHeal}
            onRequestRemoteAction={handleRequestRemoteAction}
            onDeleteHost={() => setShowDeleteConfirm(true)}
            isDeletingHost={isDeletingHost}
            isRequestingUpgrade={isRequestingUpgrade}
            onRevokeAgentToken={() => setShowRevokeConfirm(true)}
          />
        </TabsContent>
      </Tabs>

      <ConfirmActionDialog
        open={showDeleteConfirm}
        onOpenChange={setShowDeleteConfirm}
        title="Excluir Host"
        description={`Tem certeza que deseja excluir permanentemente o host "${host.name}"? Esta ação removerá todo o histórico de sessões e dados associados a esta máquina no portal.`}
        confirmLabel="Excluir permanentemente"
        cancelLabel="Cancelar"
        isLoading={isDeletingHost}
        variant="danger"
        onConfirm={handleDeleteHost}
      />

      <ConfirmActionDialog
        open={showRevokeConfirm}
        onOpenChange={setShowRevokeConfirm}
        title="Revogar Acesso do Agente"
        description={`Tem certeza que deseja revogar o token do agente associado a "${host.name}"? O portal parará de receber telemetria e atualizações desta máquina até que o agente seja reconfigurado.`}
        confirmLabel="Revogar acesso"
        cancelLabel="Cancelar"
        isLoading={isRevokingAgentToken}
        variant="danger"
        onConfirm={handleRevokeAgentToken}
      />
    </div>
  );
}
