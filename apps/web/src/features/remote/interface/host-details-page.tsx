"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { requestRemoteSessionAction } from "@/features/remote/application/session-actions";
import { useEffect, useMemo, useState, useTransition } from "react";
import {
  AlertTriangle,
  ArrowLeft,
  Check,
  CheckCircle2,
  ChevronsUpDown,
  CircleHelp,
  Copy,
  ExternalLink,
  Fingerprint,
  HardDriveDownload,
  UserRound,
  XCircle,
  Ticket,
  RefreshCcw,
  RefreshCw,
  PlayCircle,
  Cpu,
  Building2,
  Server,
  Monitor,
  Clock,
  Activity,
  Database,
  AlertCircle,
  Zap,
  Shield,
  Search,
} from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import type { RemoteHostDetails } from "@/features/remote/domain/model";
import { getRemoteProductStatusMeta } from "@/features/remote/domain";
import { getRemoteApiErrorMessage, requestRemoteMutation } from "@/features/remote/interface/remote-api";
import {
  isRemoteAgentAckReasonCode,
  REMOTE_AGENT_ACK_REASON_LABELS,
  type RemoteAgentAckReasonCode,
} from "@dosc-syspro/remote-domain/ack-reason-codes";

import {
  formatDateTime,
  formatRelativeHeartbeat,
  formatDateOnly,
  getSysproUpdateHealthMeta,
  getServiceStatusMeta,
  getServiceStatusIconMeta,
  getAutoHealStatusIconMeta,
  getCommandStatusMeta,
  formatHourMinute,
  extractStringFromPayload,
  readBootstrapRateMetrics,
  readContractSchemaVersions,
  extractContractValidationError,
  copyTextWithFallback,
  resolveExpectedRustDeskAlias,
} from "./host-details/utils";
import {
  DEFAULT_INSTALLATION_DIRECTORY,
  UNLINKED_COMPANY_VALUE,
} from "./host-details/constants";
import { SearchableCompanyPicker } from "./host-details/components/SearchableCompanyPicker";
import { HostTechnicalTab } from "./host-details/components/HostTechnicalTab";
import { HostInfraTab } from "./host-details/components/HostInfraTab";
import { HostInstallationsTab } from "./host-details/components/HostInstallationsTab";
import { HostAgentTab } from "./host-details/components/HostAgentTab";



export function RemoteHostDetailsPanel({ details }: { details: RemoteHostDetails }) {
  const router = useRouter();
  const { host } = details;
  const [projectedHostName, setProjectedHostName] = useState(host.name);
  const [isMobileClient, setIsMobileClient] = useState(false);
  const [isSavingMachineName, startSavingMachineName] = useTransition();
  const [isRevokingAgentToken, startRevokingAgentToken] = useTransition();
  const [isRequestingResendConfig, startRequestingResendConfig] = useTransition();
  const [isRequestingSelfHeal, startRequestingSelfHeal] = useTransition();
  const [isRelinkingInstallation, startRelinkingInstallation] = useTransition();
  const [isBulkRelinkingInstallations, startBulkRelinkingInstallations] = useTransition();
  const [installationFilter, setInstallationFilter] = useState<"all" | "unlinked">("all");
  const [bulkInstallationCompanyId, setBulkInstallationCompanyId] = useState(details.companyOptions[0]?.id ?? "");
  const [selectedCompanyByUpdateId, setSelectedCompanyByUpdateId] = useState<Record<string, string>>({});
  const [machineProfileDraft, setMachineProfileDraft] = useState(host.machineProfile ?? "");
  const [primaryCompanyDraft, setPrimaryCompanyDraft] = useState(host.companyId ?? details.companyOptions[0]?.id ?? "");
  const normalizedRustdeskId = host.rustdeskId ? host.rustdeskId.replace(/\s+/g, "") : null;
  const windowsComputerName = host.machineName ?? host.agent.machineName ?? null;
  const rustdeskHref = normalizedRustdeskId ? `rustdesk://${normalizedRustdeskId}` : null;
  
  // --- Tickets Ticket Context (Fase 7) ---
  const ticketNumber = useSearchParams().get("ticketNumber");
  const [ticketDetails, setTicketDetails] = useState<{ title: string; state: string; priority: string } | null>(null);
  const [isLoadingTicket, setIsLoadingTicket] = useState(false);

  useEffect(() => {
    if (ticketNumber) {
      setIsLoadingTicket(true);
      fetch(`/api/tickets/${ticketNumber}`)
        .then(res => res.json())
        .then(data => {
          if (!data.error) setTicketDetails(data);
        })
        .finally(() => setIsLoadingTicket(false));
    }
  }, [ticketNumber]);

  useEffect(() => {
    setMachineProfileDraft(host.machineProfile ?? "");
  }, [host.machineProfile]);

  useEffect(() => {
    setPrimaryCompanyDraft(host.companyId ?? details.companyOptions[0]?.id ?? "");
  }, [details.companyOptions, host.companyId]);

  const normalizedProjectedHostName = projectedHostName.trim();
  const canSaveProjectedHostName =
    normalizedProjectedHostName.length > 0 && normalizedProjectedHostName !== host.name.trim();
  const statusLabel = host.status === "ACTIVE" ? "Ativo" : host.status === "MAINTENANCE" ? "Manutencao" : "Inativo";
  const serviceStatus = getServiceStatusMeta(host.serviceStatus);
  const rustDeskCompliance = useMemo(() => {
    const expectedAlias = resolveExpectedRustDeskAlias({
      hostName: host.name,
      machineName: host.machineName,
      companyName: host.companyName,
    });
    const expectedServerHost = details.moduleSettings.rustDeskServerHost.trim() || "Sem configuracao";
    const expectedApiHost = details.moduleSettings.rustDeskServerHost.trim() || "Sem configuracao";
    const expectedVersion = details.moduleSettings.rustDeskVersion.trim() || "Sem configuracao";
    const expectedPublicKeyHash = details.moduleSettings.rustDeskPublicKeyHash;

    const reportedAlias = host.agent.lastKnownRustDeskAlias;
    const reportedVersion = host.agent.lastKnownRustDeskVersion;
    const reportedServerHost = host.agent.lastKnownRustDeskServerHost;
    const reportedApiHost = host.agent.lastKnownRustDeskApiHost;
    const reportedPublicKeyHash = host.agent.lastKnownRustDeskPublicKeyHash;

    return {
      lastSyncAt: host.agent.lastRustDeskConfigSyncAt,
      items: [
        {
          id: "alias",
          label: "Alias",
          expected: expectedAlias,
          reported: reportedAlias,
          match: !!reportedAlias && reportedAlias.trim().toLowerCase() === expectedAlias.trim().toLowerCase(),
        },
        {
          id: "version",
          label: "Versao",
          expected: expectedVersion,
          reported: reportedVersion,
          match: !!reportedVersion && reportedVersion.trim().toLowerCase() === expectedVersion.trim().toLowerCase(),
        },
        {
          id: "serverHost",
          label: "Servidor remoto",
          expected: expectedServerHost,
          reported: reportedServerHost,
          match: !!reportedServerHost && reportedServerHost.trim().toLowerCase() === expectedServerHost.trim().toLowerCase(),
        },
        {
          id: "apiHost",
          label: "Servidor da API",
          expected: expectedApiHost,
          reported: reportedApiHost,
          match: !!reportedApiHost && reportedApiHost.trim().toLowerCase() === expectedApiHost.trim().toLowerCase(),
        },
        {
          id: "publicKey",
          label: "Chave publica",
          expected: expectedPublicKeyHash ? "Hash oficial carregado" : "Sem configuracao",
          reported: reportedPublicKeyHash ? "Hash reportado pelo agente" : null,
          match: !!reportedPublicKeyHash && !!expectedPublicKeyHash && reportedPublicKeyHash === expectedPublicKeyHash,
        },
      ],
    };
  }, [
    details.moduleSettings.rustDeskPublicKeyHash,
    details.moduleSettings.rustDeskServerHost,
    details.moduleSettings.rustDeskVersion,
    host.agent.lastKnownRustDeskAlias,
    host.agent.lastKnownRustDeskApiHost,
    host.agent.lastKnownRustDeskPublicKeyHash,
    host.agent.lastKnownRustDeskServerHost,
    host.agent.lastKnownRustDeskVersion,
    host.agent.lastRustDeskConfigSyncAt,
    host.companyName,
    host.machineName,
    host.name,
  ]);
  const visibleAgentCommands = useMemo(() => {
    const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;

    return details.agentCommands.filter((command) => {
      if (command.status !== "ACKNOWLEDGED") return true;
      const createdAtMs = new Date(command.createdAt).getTime();
      return Number.isFinite(createdAtMs) && createdAtMs >= sevenDaysAgo;
    });
  }, [details.agentCommands]);
  const hiddenAcknowledgedCount = Math.max(0, details.agentCommands.length - visibleAgentCommands.length);
  const hasPendingInstallGuide = useMemo(
    () => details.installGuide.some((step) => !step.done),
    [details.installGuide]
  );
  const dedupedInstallationContexts = useMemo(() => {
    const byPath = new Map<string, RemoteHostDetails["installationContexts"][number]>();

    for (const context of details.installationContexts) {
      const pathKey = context.update.path.trim().toLowerCase();
      const current = byPath.get(pathKey);
      if (!current) {
        byPath.set(pathKey, context);
        continue;
      }

      const currentHasLink = !!current.update.companyId;
      const nextHasLink = !!context.update.companyId;
      if (nextHasLink && !currentHasLink) {
        byPath.set(pathKey, context);
        continue;
      }

      const currentHeartbeat = Date.parse(current.update.lastHeartbeatAt);
      const nextHeartbeat = Date.parse(context.update.lastHeartbeatAt);
      if (Number.isFinite(nextHeartbeat) && (!Number.isFinite(currentHeartbeat) || nextHeartbeat > currentHeartbeat)) {
        byPath.set(pathKey, context);
      }
    }

    return Array.from(byPath.values());
  }, [details.installationContexts]);

  const installations = useMemo(() => {
    const seen = new Set<string>();
    const primaryCompanyDirectory = details.company.installationDirectory?.trim() || DEFAULT_INSTALLATION_DIRECTORY;
    const items = dedupedInstallationContexts
      .map((context) => {
        const entry = context.update;
        const companyContext = context.company;
        const companyDirectory = companyContext?.installationDirectory?.trim();
        const resolvedDirectory = companyDirectory || primaryCompanyDirectory || DEFAULT_INSTALLATION_DIRECTORY;
        const key = `${entry.companyLabel}::${resolvedDirectory}`.toLowerCase();
        if (seen.has(key)) return null;
        seen.add(key);
        return {
          companyId: entry.companyId,
          resolvedCompanyName: entry.resolvedCompanyName,
          companyLabel: entry.companyLabel,
          path: resolvedDirectory,
        };
      })
      .filter(
        (
          entry
        ): entry is {
          companyId: string | null;
          resolvedCompanyName: string | null;
          companyLabel: string;
          path: string;
        } => !!entry
      );

    return items;
  }, [dedupedInstallationContexts, details.company.installationDirectory]);
  const installationsPreview = useMemo(() => installations.slice(0, 2), [installations]);
  const hasMoreInstallations = installations.length > installationsPreview.length;
  const detectedCompanyCount = useMemo(() => {
    const names = new Set(
      installations
        .map((entry) => (entry.resolvedCompanyName ?? entry.companyLabel).trim())
        .filter((value) => !!value)
        .map((value) => value.toLowerCase())
    );
    return names.size;
  }, [installations]);
  const canManageInstallations =
    details.tenantScope.role === "ADMIN" ||
    details.tenantScope.role === "SUPORTE" ||
    details.tenantScope.role === "DEVELOPER";
  const unlinkedInstallationsCount = useMemo(
    () => dedupedInstallationContexts.filter((context) => !context.update.companyId).length,
    [dedupedInstallationContexts]
  );
  const installationContextsForDisplay = useMemo(() => {
    if (installationFilter === "unlinked") {
      return dedupedInstallationContexts.filter((context) => !context.update.companyId);
    }
    return dedupedInstallationContexts;
  }, [dedupedInstallationContexts, installationFilter]);
  const serviceStatusIcon = useMemo(() => getServiceStatusIconMeta(host.serviceStatus), [host.serviceStatus]);
  const agentHealthCard = useMemo(() => {
    const latestAutoHealCommand = details.agentCommands.find(
      (command) => command.type === "REAPPLY_ALIAS" || command.type === "REAPPLY_CONFIG"
    );

    const autoHealLastAttemptAt =
      latestAutoHealCommand?.executedAt ??
      latestAutoHealCommand?.failedAt ??
      latestAutoHealCommand?.deliveredAt ??
      latestAutoHealCommand?.updatedAt ??
      latestAutoHealCommand?.createdAt ??
      null;

    const autoHealMeta = (() => {
      if (!latestAutoHealCommand) {
        return {
          label: "Sem leitura",
          status: null,
        };
      }

      if (latestAutoHealCommand.status === "ACKNOWLEDGED") {
        return {
          label: "Recovered",
          status: latestAutoHealCommand.status,
        };
      }

      if (latestAutoHealCommand.status === "FAILED") {
        return {
          label: "Falhou",
          status: latestAutoHealCommand.status,
        };
      }

      return {
        label: "Em andamento",
        status: latestAutoHealCommand.status,
      };
    })();

    const beforeServiceStatus =
      (latestAutoHealCommand &&
        (extractStringFromPayload(latestAutoHealCommand.resultPayload, [
          "serviceStatusBefore",
          "lastServiceStatusBefore",
          "previousServiceStatus",
          "beforeStatus",
          "statusBefore",
        ]) ||
          extractStringFromPayload(latestAutoHealCommand.payload, [
            "serviceStatusBefore",
            "lastServiceStatusBefore",
            "previousServiceStatus",
            "beforeStatus",
            "statusBefore",
          ]))) ??
      null;

    const afterServiceStatus =
      (latestAutoHealCommand &&
        (extractStringFromPayload(latestAutoHealCommand.resultPayload, [
          "serviceStatusAfter",
          "currentServiceStatus",
          "afterStatus",
          "statusAfter",
        ]) ||
          extractStringFromPayload(latestAutoHealCommand.payload, [
            "serviceStatusAfter",
            "currentServiceStatus",
            "afterStatus",
            "statusAfter",
          ]))) ??
      host.serviceStatus;

    const erpVersionKeys = [
      "erpVersion",
      "versionErp",
      "versaoErp",
      "sysproVersion",
      "versionSyspro",
      "versaoSyspro",
    ];

    const erpVersion =
      details.agentCommands
        .map((command) => {
          return (
            extractStringFromPayload(command.resultPayload, erpVersionKeys) ||
            extractStringFromPayload(command.payload, erpVersionKeys)
          );
        })
        .find((value): value is string => !!value) ?? null;

    const erpPaths = Array.from(
      new Set(
        installations
          .map((entry) => entry.path.trim())
          .filter((path) => !!path)
      )
    );
    const fallbackPath = details.company.installationDirectory?.trim() || DEFAULT_INSTALLATION_DIRECTORY;
    const resolvedPaths = erpPaths.length ? erpPaths : [fallbackPath];

    return {
      status: serviceStatus,
      autoHeal: {
        ...autoHealMeta,
        lastAttemptAt: autoHealLastAttemptAt,
        beforeStatus: beforeServiceStatus ? getServiceStatusMeta(beforeServiceStatus).label : null,
        afterStatus: getServiceStatusMeta(afterServiceStatus).label,
      },
      erp: {
        version: erpVersion,
        paths: resolvedPaths,
      },
    };
  }, [details.agentCommands, details.company.installationDirectory, host.serviceStatus, installations, serviceStatus]);
  const autoHealStatusIcon = useMemo(
    () => getAutoHealStatusIconMeta(agentHealthCard.autoHeal.status),
    [agentHealthCard.autoHeal.status]
  );
  const ServiceStatusIcon = serviceStatusIcon.Icon;
  const AutoHealStatusIcon = autoHealStatusIcon.Icon;
  const productStatusMeta = useMemo(
    () => getRemoteProductStatusMeta(details.agentHealth.productStatus),
    [details.agentHealth.productStatus]
  );
  const systemSnapshot = details.agentTelemetry.systemSnapshot;
  const networkSnapshot = details.agentTelemetry.networkSnapshot;
  const softwareSnapshot = details.agentTelemetry.softwareSnapshot;
  const hardwareIdentity = details.agentTelemetry.hardwareIdentity;
  const diskSnapshot = details.agentTelemetry.diskSnapshot;
  const sysproProcessSnapshot = details.agentTelemetry.sysproProcessSnapshot;
  const windowsUpdateStatus = details.agentTelemetry.windowsUpdateStatus;
  const rebootPending = details.agentTelemetry.rebootPending;
  const agentMetrics = details.agentTelemetry.agentMetrics;
  const bootstrapRateMetrics = useMemo(() => readBootstrapRateMetrics(agentMetrics), [agentMetrics]);
  const contractSchemaVersions = useMemo(() => readContractSchemaVersions(agentMetrics), [agentMetrics]);
  const contractValidationError = useMemo(() => {
    if (details.agentHealth.contractErrorCode) return details.agentHealth.contractErrorCode;
    return extractContractValidationError(host.lastHeartbeatErrorMessage);
  }, [details.agentHealth.contractErrorCode, host.lastHeartbeatErrorMessage]);
  const ackQueueMetrics = useMemo(() => {
    const pendingFromMetrics =
      agentMetrics && typeof agentMetrics["pendingAckQueueSize"] === "number"
        ? (agentMetrics["pendingAckQueueSize"] as number)
        : null;
    const ackQueueFlush =
      agentMetrics && typeof agentMetrics["ackQueueFlush"] === "object" && !Array.isArray(agentMetrics["ackQueueFlush"])
        ? (agentMetrics["ackQueueFlush"] as Record<string, unknown>)
        : null;
    const reprocessedFromMetrics =
      ackQueueFlush && typeof ackQueueFlush["failed"] === "number" ? (ackQueueFlush["failed"] as number) : null;

    const pendingFallback = details.agentCommands.filter(
      (command) => command.status === "PENDING" || command.status === "DELIVERED"
    ).length;
    const reprocessedFallback = details.agentCommands.filter((command) => command.attemptCount > 1).length;

    return {
      pending: pendingFromMetrics ?? pendingFallback,
      reprocessed: reprocessedFromMetrics ?? reprocessedFallback,
    };
  }, [agentMetrics, details.agentCommands]);
  const orchestrationStrategy = useMemo(() => {
    const raw =
      agentMetrics && typeof agentMetrics["orchestrationStrategy"] === "string"
        ? (agentMetrics["orchestrationStrategy"] as string)
        : null;
    if (!raw) return "Sem leitura";
    if (raw === "sync_token_first") return "Sync direto com token";
    if (raw === "discover_bootstrap") return "Discover + bootstrap";
    return raw;
  }, [agentMetrics]);
  const machineIpv4 = useMemo(() => {
    const fromSystem = extractStringFromPayload(systemSnapshot, [
      "ipv4",
      "ipV4",
      "primaryIpv4",
      "ipAddress",
      "localIp",
    ]);
    if (fromSystem) return fromSystem;
    const fromNetwork = extractStringFromPayload(networkSnapshot, [
      "ipv4",
      "ipV4",
      "primaryIp",
      "ipAddress",
      "localIp",
    ]);
    return fromNetwork ?? host.lastKnownIp ?? null;
  }, [host.lastKnownIp, networkSnapshot, systemSnapshot]);
  const sysproServerInstallations = useMemo(
    () => dedupedInstallationContexts.filter((context) => context.update.isServerHost === true),
    [dedupedInstallationContexts],
  );
  const firebirdData = useMemo(() => {
    const persistedFirebird = sysproServerInstallations.find(
      (context) => !!context.update.firebirdVersion || !!context.update.firebirdPath,
    )?.update;
    const hasPersistedFirebird = !!persistedFirebird;
    const softwareItem = softwareSnapshot.find((entry) => {
      const name = extractStringFromPayload(entry, ["displayName", "name", "productName", "title"]);
      return !!name && name.toLowerCase().includes("firebird");
    });
    const softwareName = softwareItem
      ? extractStringFromPayload(softwareItem, ["displayName", "name", "productName", "title"])
      : null;
    const softwareVersion = softwareItem
      ? extractStringFromPayload(softwareItem, ["displayVersion", "version", "productVersion"])
      : null;
    const fbProcess = sysproProcessSnapshot.find((entry) => {
      const processName = extractStringFromPayload(entry, ["processName", "name"]);
      return !!processName && processName.toLowerCase().includes("fbserver");
    });
    const processRunningRaw = fbProcess?.["running"];
    const processRunning = typeof processRunningRaw === "boolean" ? processRunningRaw : null;
    return {
      name: persistedFirebird?.firebirdPath ?? (!hasPersistedFirebird ? softwareName : null),
      version: persistedFirebird?.firebirdVersion ?? (!hasPersistedFirebird ? softwareVersion : null),
      processRunning,
    };
  }, [softwareSnapshot, sysproProcessSnapshot, sysproServerInstallations]);
  const heartbeat = useMemo(() => {
    if (!host.lastHeartbeatAt) {
      return {
        label: "Sem contato",
        tone: "border-red-500/20 bg-red-500/10 text-red-700 dark:text-red-300",
        description: "O agente ainda nao registrou atividade recente no portal.",
      };
    }

    const diffMs = Date.now() - new Date(host.lastHeartbeatAt).getTime();
    const diffMinutes = Math.floor(diffMs / 60000);

    if (diffMinutes <= 5) {
      return {
        label: "Contato recente",
        tone: "border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
        description: "Host provavelmente online e apto para acesso imediato.",
      };
    }

    if (diffMinutes <= 60) {
      return {
        label: "Contato intermitente",
        tone: "border-amber-500/20 bg-amber-500/10 text-amber-700 dark:text-amber-300",
        description: "O host respondeu antes, mas vale confirmar a conectividade.",
      };
    }

    return {
      label: "Sem resposta recente",
      tone: "border-red-500/20 bg-red-500/10 text-red-700 dark:text-red-300",
      description: "Ultimo contato muito antigo. Validar o onboarding e a conectividade do agente.",
    };
  }, [host.lastHeartbeatAt]);

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

  async function handleCopy(value: string | null, label: string) {
    if (!value) {
      toast.error(`${label} nao configurado.`);
      return;
    }

    try {
      await copyTextWithFallback(value);
      toast.success(`${label} copiado.`);
    } catch {
      toast.error(`Falha ao copiar ${label.toLowerCase()}.`);
    }
  }

  function handleOpenRustDesk() {
    if (!rustdeskHref) {
      toast.error("Identificador remoto nao configurado.");
      return;
    }

    window.location.assign(rustdeskHref);
    window.setTimeout(() => {
      toast("Se o acesso remoto nao abrir, copie o ID e conecte manualmente.");
    }, 600);
  }

  function handleSaveProjectedHostName() {
    if (!normalizedProjectedHostName) {
      toast.error("Informe um nome valido para a maquina.");
      return;
    }

    startSavingMachineName(async () => {
      try {
        await requestRemoteMutation({
          url: `/api/remote/hosts/${host.id}`,
          method: "PATCH",
          body: {
            companyId: host.companyId,
            name: normalizedProjectedHostName,
            machineName: host.machineName,
            machineProfile: host.machineProfile,
            environment: host.environment,
            provider: host.provider,
            description: host.description,
            notes: host.notes,
            agentExternalId: host.rustdeskId,
            status: host.status,
          },
        });

        toast.success("Nome da maquina atualizado.");
      } catch (error) {
        toast.error(getRemoteApiErrorMessage(error));
      }
    });
  }

  function handleSaveMachineProfile(nextMachineProfile: string | null) {
    startSavingMachineName(async () => {
      try {
        await requestRemoteMutation({
          url: `/api/remote/hosts/${host.id}`,
          method: "PATCH",
          body: {
            companyId: host.companyId,
            name: host.name,
            machineName: host.machineName,
            machineProfile: nextMachineProfile,
            environment: host.environment,
            provider: host.provider,
            description: host.description,
            notes: host.notes,
            agentExternalId: host.rustdeskId,
            status: host.status,
          },
        });

        toast.success("Perfil da maquina atualizado.");
        router.refresh();
      } catch (error) {
        toast.error(getRemoteApiErrorMessage(error));
      }
    });
  }

  function handleSavePrimaryCompany(nextCompanyId: string) {
    if (!nextCompanyId) {
      toast.error("Selecione a empresa principal do host.");
      return;
    }

    startSavingMachineName(async () => {
      try {
        await requestRemoteMutation({
          url: `/api/remote/hosts/${host.id}`,
          method: "PATCH",
          body: {
            companyId: nextCompanyId,
            name: host.name,
            machineName: host.machineName,
            machineProfile: host.machineProfile,
            environment: host.environment,
            provider: host.provider,
            description: host.description,
            notes: host.notes,
            agentExternalId: host.rustdeskId,
            status: host.status,
          },
        });

        toast.success("Empresa principal do host atualizada.");
        router.refresh();
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
        toast.success(result.message ?? "Credencial renovada.");
        router.refresh();
      } catch (error) {
        toast.error(getRemoteApiErrorMessage(error));
      }
    });
  }

  function handleRequestRemoteAction(action: "RESEND_CONFIG" | "REAPPLY_ALIAS") {
    const run = async () => {
      try {
        const result = await requestRemoteMutation<Record<string, unknown>>({
          url: `/api/remote/hosts/${host.id}/actions`,
          method: "POST",
          body: { action },
        });
        toast.success(result.message ?? "Acao remota enfileirada.");
        router.refresh();
      } catch (error) {
        toast.error(getRemoteApiErrorMessage(error));
      }
    };

    if (action === "RESEND_CONFIG") {
      startRequestingResendConfig(run);
      return;
    }

    startRequestingSelfHeal(run);
  }

  function handleRelinkInstallation(updateId: string, companyId: string | null) {
    startRelinkingInstallation(async () => {
      try {
        await requestRemoteMutation({
          url: `/api/remote/hosts/${host.id}/syspro-updates/${updateId}`,
          method: "PATCH",
          body: {
            companyId,
            mode: "replace",
          },
        });
        toast.success(companyId ? "Instalacao vinculada com sucesso." : "Vinculo removido com sucesso.");
        router.refresh();
      } catch (error) {
        toast.error(getRemoteApiErrorMessage(error));
      }
    });
  }

  function handleBulkRelinkInstallations(companyId: string | null) {
    if (!installationContextsForDisplay.length) {
      toast.error("Nenhuma instalacao disponivel para a acao em lote.");
      return;
    }

    startBulkRelinkingInstallations(async () => {
      try {
        await Promise.all(
          installationContextsForDisplay.map((context) =>
            requestRemoteMutation({
              url: `/api/remote/hosts/${host.id}/syspro-updates/${context.update.id}`,
              method: "PATCH",
              body: {
                companyId,
                mode: "replace",
              },
            })
          )
        );

        toast.success(
          companyId
            ? `Vinculo aplicado em ${installationContextsForDisplay.length} instalacao(oes).`
            : `Vinculo removido em ${installationContextsForDisplay.length} instalacao(oes).`
        );
        router.refresh();
      } catch (error) {
        toast.error(getRemoteApiErrorMessage(error));
      }
    });
  }

  const [isStartingSession, startSessionTransition] = useTransition();

  const handleStartOrchestratedSession = async () => {
    if (!normalizedRustdeskId) {
      toast.error("Host sem identificador remoto. Nao e possivel iniciar sessao.");
      return;
    }

    startSessionTransition(async () => {
      try {
        const result = await requestRemoteSessionAction({
          hostId: host.id,
          companyId: host.companyId,
          ticketNumber: ticketNumber,
          reason: ticketNumber ? `Suporte via Portal para Ticket #${ticketNumber}` : "Acesso tecnico via Portal",
        });

        if (result.success) {
          toast.success("Sessao auditada iniciada.");
          // Abre o RustDesk (usando o ID da maquina para o deep link)
          const href = isMobileClient 
            ? `rustdesk://[${normalizedRustdeskId}]` 
            : `rustdesk://${normalizedRustdeskId}`;
          
          window.location.href = href;
        } else {
          toast.error(result.error ?? "Falha ao iniciar sessao auditada.");
        }
      } catch (error) {
        toast.error("Erro ao processar inicio de sessao.");
      }
    });
  };

  return (
    <div className="space-y-6">
      {/* Sticky Hero Header */}
      <div className="sticky top-0 z-30 -mx-6 -mt-6 mb-6 border-b border-border/40 bg-background/60 px-6 py-4 backdrop-blur-xl transition-all animate-in fade-in slide-in-from-top-4 duration-500">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-4 min-w-0">
            <Link 
              href="/portal/plataforma-remota" 
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-border/60 bg-background/40 hover:bg-muted/80 hover:scale-105 transition-all text-muted-foreground hover:text-foreground"
              title="Voltar para a lista"
            >
              <ArrowLeft className="h-4 w-4" />
            </Link>
            <div className="min-w-0 space-y-0.5">
              <div className="flex items-center gap-2">
                <h1 className="truncate text-xl font-bold tracking-tight text-foreground md:text-2xl">
                  {host.name}
                </h1>
                <div className={`h-2.5 w-2.5 shrink-0 rounded-full border-2 ${heartbeat.label === "Contato recente" ? "animate-pulse border-emerald-500 bg-emerald-500" : "border-muted-foreground/30 bg-muted-foreground/20"}`} />
              </div>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                <span className="flex items-center gap-1 font-mono text-primary/80">
                  <Fingerprint className="h-3 w-3" />
                  {normalizedRustdeskId ?? "---"}
                </span>
                <span className="flex items-center gap-1">
                  <Building2 className="h-3 w-3" />
                  {host.companyName ?? "Sem empresa"}
                </span>
                {machineIpv4 && (
                  <span className="flex items-center gap-1 font-mono">
                    <Monitor className="h-3 w-3" />
                    {machineIpv4}
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Quick Diagnostic Indicators */}
            <div className="hidden items-center gap-1.5 border-x border-border/40 px-4 md:flex text-muted-foreground">
                {host.lastAgentMetrics?.cpuLoad != null && (
                  <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-muted/30 text-[11px] font-medium transition-colors hover:bg-muted/50" title="CPU Load">
                    <Cpu className="h-3.5 w-3.5 text-primary/70" />
                    {host.lastAgentMetrics.cpuLoad}%
                  </div>
                )}
                {host.lastAgentMetrics?.ramUsedPc != null && (
                  <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-muted/30 text-[11px] font-medium transition-colors hover:bg-muted/50" title="RAM usage">
                    <Activity className="h-3.5 w-3.5 text-sky-500/70" />
                    {host.lastAgentMetrics.ramUsedPc}%
                  </div>
                )}
            </div>

            <Button 
                onClick={handleStartOrchestratedSession} 
                disabled={!normalizedRustdeskId || isStartingSession} 
                className={cn(
                    "gap-2 px-6 shadow-lg shadow-primary/10 transition-all hover:scale-[1.02] active:scale-[0.98] h-10 font-semibold",
                    ticketNumber ? "bg-primary border-primary hover:bg-primary/90" : "bg-primary/90 hover:bg-primary"
                )}
            >
                {isStartingSession ? (
                    <RefreshCcw className="h-4 w-4 animate-spin" />
                ) : (
                    <PlayCircle className="h-4 w-4" />
                )}
                {isStartingSession ? "Iniciando..." : (isMobileClient ? "App" : "Sessao auditada")}
            </Button>
          </div>
        </div>
      </div>

      <Tabs defaultValue="geral" className="space-y-6">
        <div className="flex w-full md:justify-end">
          <TabsList className="grid h-auto w-full grid-cols-3 gap-1 md:w-auto md:grid-cols-5">
            <TabsTrigger value="geral">Visao Geral</TabsTrigger>
            <TabsTrigger value="tecnicas">Informacoes tecnicas</TabsTrigger>
            <TabsTrigger value="instalacoes">Instalacoes detectadas</TabsTrigger>
            <TabsTrigger value="infra">Infra</TabsTrigger>
            <TabsTrigger value="agente">Agente</TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="geral" className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Health & Performance Snapshot */}
            <Card className="border-border/40 bg-muted/5 shadow-sm">
              <CardHeader className="pb-3 px-6 pt-6">
                <CardTitle className="text-sm font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                  <Activity className="h-4 w-4" />
                  Saude do host
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6 pt-0 grid gap-6 sm:grid-cols-3">
                <div className="flex flex-col items-center justify-center p-4 rounded-xl border border-border/40 bg-background/50 text-center gap-2">
                  <Cpu className="h-6 w-6 text-primary" />
                  <span className="text-2xl font-bold font-mono">{host.lastAgentMetrics?.cpuLoad ?? "--"}%</span>
                  <span className="text-[10px] text-muted-foreground uppercase font-bold">CPU Load</span>
                </div>
                <div className="flex flex-col items-center justify-center p-4 rounded-xl border border-border/40 bg-background/50 text-center gap-2">
                  <Activity className="h-6 w-6 text-sky-500" />
                  <span className="text-2xl font-bold font-mono">{host.lastAgentMetrics?.ramUsedPc ?? "--"}%</span>
                  <span className="text-[10px] text-muted-foreground uppercase font-bold">RAM Usage</span>
                </div>
                <div className="flex flex-col items-center justify-center p-4 rounded-xl border border-border/40 bg-background/50 text-center gap-2">
                  <Database className="h-6 w-6 text-emerald-500" />
                  <span className="text-2xl font-bold font-mono">
                    {host.lastAgentMetrics?.diskFree != null 
                      ? `${(host.lastAgentMetrics.diskFree / (1024 * 1024 * 1024)).toFixed(0)}GB` 
                      : "--"}
                  </span>
                  <span className="text-[10px] text-muted-foreground uppercase font-bold">Free Disk</span>
                </div>
              </CardContent>
            </Card>

            {/* Support Ticket Context */}
            {ticketNumber ? (
              <Card className="border-blue-500/20 bg-blue-500/5 shadow-sm backdrop-blur-sm">
                <CardHeader className="pb-3 px-6 pt-6">
                  <CardTitle className="text-sm font-bold uppercase tracking-widest text-blue-400 flex items-center gap-2">
                    <Ticket className="h-4 w-4" />
                    Contexto do atendimento
                  </CardTitle>
                </CardHeader>
                <CardContent className="px-6 pb-6">
                  {isLoadingTicket ? (
                    <div className="flex items-center gap-2 text-sm text-blue-300">
                      <RefreshCw className="h-3 w-3 animate-spin" /> Carregando chamado #{ticketNumber}...
                    </div>
                  ) : ticketDetails ? (
                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="border-blue-500/40 bg-blue-500/10 text-blue-300 text-[10px] font-bold">
                          {ticketDetails.state.toUpperCase()}
                        </Badge>
                        <h3 className="text-lg font-bold text-white leading-tight">#{ticketNumber}: {ticketDetails.title}</h3>
                      </div>
                      <div className="text-xs text-blue-200/60 flex items-center gap-4">
                        <span>Prioridade: {ticketDetails.priority}</span>
                      </div>
                    </div>
                  ) : (
                    <div className="text-sm text-blue-300/70 italic">Nao foi possivel recuperar os detalhes do chamado #{ticketNumber}.</div>
                  )}
                </CardContent>
              </Card>
            ) : (
              <Card className="border-dashed border-border/60 bg-transparent flex items-center justify-center p-8 opacity-60">
                <div className="text-center space-y-2">
                  <Ticket className="h-8 w-8 text-muted-foreground/30 mx-auto" />
                  <p className="text-xs text-muted-foreground uppercase font-bold">Acesso sem chamado vinculado</p>
                </div>
              </Card>
            )}
          </div>

          <div className="grid gap-6 lg:grid-cols-[1fr_auto]">
            <div className="space-y-6">
              {/* Inventory Signals */}
              {(rebootPending || (host.lastAgentMetrics?.diskFree != null && host.lastAgentMetrics.diskFree < 5 * 1024 * 1024 * 1024) || contractValidationError) && (
                <Card className="border-rose-500/20 bg-rose-500/5">
                   <CardHeader className="pb-2 px-4 pt-4">
                    <CardTitle className="text-[10px] font-bold uppercase tracking-widest text-rose-500 flex items-center gap-2">
                      <AlertCircle className="h-3.5 w-3.5" />
                      Alertas criticos
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-4 flex flex-wrap gap-2">
                    {rebootPending && (
                      <Badge variant="outline" className="border-rose-500/30 bg-rose-500/10 text-rose-600 dark:text-rose-400">
                        <RefreshCw className="mr-1.5 h-3 w-3 animate-spin-slow" />
                        Reinicializacao necessaria
                      </Badge>
                    )}
                    {(host.lastAgentMetrics?.diskFree != null && host.lastAgentMetrics.diskFree < 5 * 1024 * 1024 * 1024) && (
                      <Badge variant="outline" className="border-rose-500/30 bg-rose-500/10 text-rose-600 dark:text-rose-400">
                        <Database className="mr-1.5 h-3 w-3" />
                        Espaco em disco critico
                      </Badge>
                    )}
                    {contractValidationError && (
                      <Badge variant="outline" className="border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400 font-mono">
                        <Shield className="mr-1.5 h-3 w-3" />
                        ERRO CONTRATO: {contractValidationError}
                      </Badge>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* System Overview List */}
              <div className="grid gap-4 sm:grid-cols-2">
                 <div className="rounded-xl border border-border/40 bg-muted/5 p-4 space-y-3 shadow-sm transition-all hover:bg-muted/10">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Clock className="h-4 w-4" />
                      <span className="text-[10px] font-bold uppercase tracking-wider">Ultima atividade</span>
                    </div>
                    <div className="space-y-0.5">
                      <p className="text-lg font-bold text-foreground">{formatRelativeHeartbeat(host.lastHeartbeatAt)}</p>
                      <p className="text-xs text-muted-foreground">{formatDateTime(host.lastHeartbeatAt)}</p>
                    </div>
                 </div>
                 
                 <div className="rounded-xl border border-border/40 bg-muted/5 p-4 space-y-3 shadow-sm transition-all hover:bg-muted/10 text-muted-foreground">
                    <div className="flex items-center gap-2">
                      <Shield className="h-4 w-4" />
                      <span className="text-[10px] font-bold uppercase tracking-wider">Estado do Agente</span>
                    </div>
                    <div className="space-y-0.5">
                      <p className="text-lg font-bold text-foreground capitalize">{serviceStatus.label}</p>
                      <p className="text-xs text-muted-foreground">Versao: {host.agentVersion ?? "N/A"}</p>
                    </div>
                 </div>
              </div>

               <Card className="border-border/40 bg-muted/5">
                 <CardHeader className="pb-3 px-6 pt-6 uppercase tracking-widest font-bold text-muted-foreground text-[10px] border-b border-border/40 mb-4">
                    Instalacoes detectadas no host
                 </CardHeader>
                 <CardContent className="px-6 pb-6 p-0">
                    <div className="grid gap-3 sm:grid-cols-2">
                        {installations.map((installation, idx) => (
                          <div key={idx} className="flex items-start gap-3 p-3 rounded-xl border border-border/30 bg-background/50 hover:border-primary/30 transition-all group">
                             <div className="mt-0.5 rounded-lg bg-primary/5 p-1.5 text-primary/70 group-hover:text-primary transition-colors">
                                <Server className="h-4 w-4" />
                             </div>
                             <div className="min-w-0">
                                <p className="text-xs font-bold text-foreground truncate">{installation.resolvedCompanyName ?? installation.companyLabel}</p>
                                <p className="text-[10px] font-mono text-muted-foreground truncate">{installation.path}</p>
                             </div>
                          </div>
                        ))}
                    </div>
                 </CardContent>
               </Card>
            </div>

            {/* Quick Timeline / Operation Log Sidebar */}
            <div className="w-full lg:w-72 space-y-4">
                <Card className="border-border/40 bg-muted/5">
                  <CardHeader className="p-4 pb-2">
                    <CardTitle className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Acoes rapidas</CardTitle>
                  </CardHeader>
                  <CardContent className="p-4 pt-0 flex flex-col gap-2">
                    <Button variant="outline" size="sm" className="w-full justify-start h-9 text-xs" onClick={() => handleRequestRemoteAction("RESEND_CONFIG")}>
                      <RefreshCw className="mr-2 h-3.5 w-3.5" />
                      Reenviar configuracao
                    </Button>
                    <Button variant="outline" size="sm" className="w-full justify-start h-9 text-xs" onClick={() => handleRequestRemoteAction("REAPPLY_ALIAS")}>
                      <Zap className="mr-2 h-3.5 w-3.5" />
                      Reaplicar identidade
                    </Button>
                    <Button variant="outline" size="sm" className="w-full justify-start h-9 text-xs text-rose-500 hover:text-rose-600 hover:bg-rose-500/5 group" onClick={handleRotateAgentToken}>
                      <Shield className="mr-2 h-3.5 w-3.5 transition-transform group-hover:rotate-180 duration-500" />
                      Renovar credenciais
                    </Button>
                  </CardContent>
                </Card>

                <div className="rounded-xl border border-border/40 bg-background/40 p-4 space-y-4">
                   <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Sessoes ativas</p>
                   <div className="flex items-center gap-3">
                      <div className="h-10 w-10 flex items-center justify-center rounded-full bg-emerald-500/10 text-emerald-500">
                        <Monitor className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-foreground">{host.openSessionCount || "Zero"} sessoes</p>
                        <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-tight">Monitoramento em tempo real</p>
                      </div>
                   </div>
                </div>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="tecnicas">
          <HostTechnicalTab
            details={details}
            host={host}
            machineIpv4={machineIpv4}
            windowsComputerName={windowsComputerName}
            sysproServerInstallations={sysproServerInstallations}
            firebirdData={firebirdData}
          />
        </TabsContent>

        <TabsContent value="infra">
          <HostInfraTab
            details={details}
            systemSnapshot={systemSnapshot}
            networkSnapshot={networkSnapshot}
            softwareSnapshot={softwareSnapshot}
            hardwareIdentity={hardwareIdentity}
            diskSnapshot={diskSnapshot}
            sysproProcessSnapshot={sysproProcessSnapshot}
            windowsUpdateStatus={windowsUpdateStatus}
            rebootPending={rebootPending}
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
            machineProfileDraft={machineProfileDraft}
            setMachineProfileDraft={setMachineProfileDraft}
            isSavingMachineProfile={isSavingMachineName}
            handleSaveMachineProfile={handleSaveMachineProfile}
            primaryCompanyDraft={primaryCompanyDraft}
            setPrimaryCompanyDraft={setPrimaryCompanyDraft}
            isSavingPrimaryCompany={isSavingMachineName}
            handleSavePrimaryCompany={handleSavePrimaryCompany}
          />
        </TabsContent>

        <TabsContent value="agente">
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
            agentMetrics={agentMetrics}
            isRevokingAgentToken={isRevokingAgentToken}
            handleRotateAgentToken={handleRotateAgentToken}
            isRequestingResendConfig={isRequestingResendConfig}
            handleRequestRemoteAction={handleRequestRemoteAction}
            isRequestingSelfHeal={isRequestingSelfHeal}
            handleCopy={handleCopy}
            rustDeskCompliance={rustDeskCompliance}
            visibleAgentCommands={visibleAgentCommands}
            hiddenAcknowledgedCount={hiddenAcknowledgedCount}
            ackQueueMetrics={ackQueueMetrics}
            hasPendingInstallGuide={hasPendingInstallGuide}
          />
        </TabsContent>

      </Tabs>
    </div>
  );
}






