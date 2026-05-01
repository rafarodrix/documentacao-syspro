"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { requestRemoteSessionAction } from "@/features/remote/application/session-actions";
import { useEffect, useMemo, useState, useTransition } from "react";
import {
  ArrowLeft,
  ArrowRightLeft,
  Copy,
  ExternalLink,
  Fingerprint,
  HardDriveDownload,
  Ticket,
  RefreshCcw,
  RefreshCw,
  PlayCircle,
  Cpu,
  Building2,
  Monitor,
  Clock,
  Activity,
  Database,
  AlertCircle,
  Shield,
  Archive,
} from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import type { AgentDeviceSummary } from "@dosc-syspro/contracts/agent";
import type { RemoteHostDetails } from "@/features/remote/domain/remote-host.types";
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
} from "./host-details/host-details.helpers";
import {
  DEFAULT_INSTALLATION_DIRECTORY,
  MACHINE_PROFILE_LABEL,
  UNLINKED_COMPANY_VALUE,
} from "./host-details/host-details.constants";
import { HostTechnicalTab } from "./host-details/components/host-technical-tab";
import { HostInstallationsTab } from "./host-details/components/host-installations-tab";
import { HostAgentTab } from "./host-details/components/host-agent-tab";
import { AgentLinkSection } from "./host-details/components/agent-link-section";



export function RemoteHostDetailsPanel({
  details,
  linkedDevice = null,
}: {
  details: RemoteHostDetails;
  linkedDevice?: AgentDeviceSummary | null;
}) {
  const router = useRouter();
  const { host } = details;
  const [projectedHostName, setProjectedHostName] = useState(host.name);
  const [projectedMachineProfile, setProjectedMachineProfile] = useState<RemoteHostDetails["host"]["machineProfile"]>(
    host.machineProfile
  );
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
  const [manualInstallationCompanyId, setManualInstallationCompanyId] = useState(host.companyId ?? details.companyOptions[0]?.id ?? "");
  const [manualInstallationPath, setManualInstallationPath] = useState(
    details.company.installationDirectory?.trim() || DEFAULT_INSTALLATION_DIRECTORY
  );
  const [isCreatingManualInstallation, startCreatingManualInstallation] = useTransition();
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
  const [isSavingCompanyContext, startSavingCompanyContext] = useTransition();
  const [savingCompanyContextId, setSavingCompanyContextId] = useState<string | null>(null);
  const agent = host.agent;
  const normalizedRustdeskId = agent.rustdeskId ? agent.rustdeskId.replace(/\s+/g, "") : null;
  const windowsComputerName = agent.machineName ?? null;
  const rustdeskHref = normalizedRustdeskId ? `rustdesk://${normalizedRustdeskId}` : null;
  
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
    setManualInstallationCompanyId(host.companyId ?? details.companyOptions[0]?.id ?? "");
  }, [details.companyOptions, host.companyId]);

  useEffect(() => {
    setManualInstallationPath(details.company.installationDirectory?.trim() || DEFAULT_INSTALLATION_DIRECTORY);
  }, [details.company.installationDirectory]);

  const normalizedProjectedHostName = projectedHostName.trim();
  const canSaveProjectedHostName =
    (normalizedProjectedHostName.length > 0 && normalizedProjectedHostName !== host.name.trim()) ||
    projectedMachineProfile !== host.machineProfile;
  const serviceStatus = getServiceStatusMeta(host.serviceStatus);
  const rustDeskCompliance = useMemo(() => {
    const expectedAlias = resolveExpectedRustDeskAlias({
      hostName: host.name,
      machineName: agent.machineName,
      companyName: host.companyName,
    });
    const expectedServerHost = details.moduleSettings.rustDeskServerHost.trim() || "Sem configuração";
    const expectedApiHost = details.moduleSettings.rustDeskServerHost.trim() || "Sem configuração";
    const expectedVersion = details.moduleSettings.rustDeskVersion.trim() || "Sem configuração";
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
          label: "Versão",
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
          label: "Chave pública",
          expected: expectedPublicKeyHash ? "Hash oficial carregado" : "Sem configuração",
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
    agent.machineName,
    host.companyName,
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
    const byInstallationKey = new Map<string, RemoteHostDetails["installationContexts"][number]>();

    for (const context of details.installationContexts) {
      const pathKey = context.update.path.trim().toLowerCase();
      const companyKey =
        context.update.companyId?.trim().toLowerCase() ||
        (context.update.resolvedCompanyName ?? context.update.companyLabel).trim().toLowerCase() ||
        "unlinked";
      const installationKey = `${companyKey}::${pathKey}`;
      const current = byInstallationKey.get(installationKey);
      if (!current) {
        byInstallationKey.set(installationKey, context);
        continue;
      }

      const currentHasLink = !!current.update.companyId;
      const nextHasLink = !!context.update.companyId;
      if (nextHasLink && !currentHasLink) {
        byInstallationKey.set(installationKey, context);
        continue;
      }

      const currentHeartbeat = Date.parse(current.update.lastHeartbeatAt);
      const nextHeartbeat = Date.parse(context.update.lastHeartbeatAt);
      if (Number.isFinite(nextHeartbeat) && (!Number.isFinite(currentHeartbeat) || nextHeartbeat > currentHeartbeat)) {
        byInstallationKey.set(installationKey, context);
      }
    }

    return Array.from(byInstallationKey.values());
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
  const desiredSysproInstalls = useMemo(() => {
    return dedupedInstallationContexts
      .filter((context) => !!context.update.companyId)
      .map((context) => {
        const companyName =
          context.company?.nomeFantasia?.trim() ||
          context.company?.razaoSocial?.trim() ||
          context.update.resolvedCompanyName?.trim() ||
          context.update.companyLabel.trim();
        const rawPath = context.update.path.trim();
        const serverPath = /\.exe$/i.test(rawPath) ? rawPath.replace(/[/\\][^/\\]+\.exe$/i, "") : rawPath;
        return {
          companyId: context.update.companyId!,
          companyName,
          serverPath,
        };
      });
  }, [dedupedInstallationContexts]);
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
  const systemSnapshot = details.agentTelemetry.systemSnapshot;
  const networkSnapshot = details.agentTelemetry.networkSnapshot;
  const softwareSnapshot = details.agentTelemetry.softwareSnapshot;
  const hardwareIdentity = details.agentTelemetry.hardwareIdentity;
  const diskSnapshot = details.agentTelemetry.diskSnapshot;
  const sysproProcessSnapshot = details.agentTelemetry.sysproProcessSnapshot;
  const windowsUpdateStatus = details.agentTelemetry.windowsUpdateStatus;
  const rebootPending = details.agentTelemetry.rebootPending;
  const agentMetrics = details.agentTelemetry.agentMetrics;
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

    const versionEntries = Array.isArray(systemSnapshot?.["installations"])
      ? (systemSnapshot["installations"] as Array<Record<string, unknown>>)
      : [];
    const collectedVersions = versionEntries
      .map((entry) => (typeof entry["exeVersion"] === "string" ? entry["exeVersion"].trim() : ""))
      .filter((value) => !!value);
    const erpVersion = collectedVersions[0] ?? null;

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
  }, [details.company.installationDirectory, host.serviceStatus, installations, serviceStatus, systemSnapshot]);
  const autoHealStatusIcon = useMemo(
    () => getAutoHealStatusIconMeta(agentHealthCard.autoHeal.status),
    [agentHealthCard.autoHeal.status]
  );
  const productStatusMeta = useMemo(
    () => getRemoteProductStatusMeta(details.agentHealth.productStatus),
    [details.agentHealth.productStatus]
  );
  const bootstrapRateMetrics = useMemo(() => readBootstrapRateMetrics(agentMetrics), [agentMetrics]);
  const contractSchemaVersions = useMemo(() => readContractSchemaVersions(agentMetrics), [agentMetrics]);
  const contractValidationError = useMemo(() => {
    if (details.agentHealth.contractErrorCode) return details.agentHealth.contractErrorCode;
    return extractContractValidationError(agent.lastHeartbeatErrorMessage);
  }, [agent.lastHeartbeatErrorMessage, details.agentHealth.contractErrorCode]);
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
    const ipv4Pattern =
      /\b(?:(?:25[0-5]|2[0-4]\d|1?\d?\d)\.){3}(?:25[0-5]|2[0-4]\d|1?\d?\d)\b/g;

    const isPrivateIpv4 = (value: string) =>
      /^10\./.test(value) ||
      /^192\.168\./.test(value) ||
      /^172\.(1[6-9]|2\d|3[0-1])\./.test(value) ||
      /^127\./.test(value);

    const extractIpv4Candidates = (input: unknown): string[] => {
      const found = new Set<string>();
      const visit = (value: unknown) => {
        if (typeof value === "string") {
          const matches = value.match(ipv4Pattern) ?? [];
          for (const match of matches) found.add(match);
          return;
        }
        if (Array.isArray(value)) {
          value.forEach(visit);
          return;
        }
        if (value && typeof value === "object") {
          Object.values(value as Record<string, unknown>).forEach(visit);
        }
      };
      visit(input);
      return Array.from(found);
    };

    const fromSnapshots = [...extractIpv4Candidates(networkSnapshot), ...extractIpv4Candidates(systemSnapshot)];
    const privateFromSnapshots = fromSnapshots.find(isPrivateIpv4);
    if (privateFromSnapshots) return privateFromSnapshots;

    const explicitLocal = extractStringFromPayload(networkSnapshot, ["localIp", "localIpv4", "ipv4", "ipV4", "primaryIp"]);
    if (explicitLocal && isPrivateIpv4(explicitLocal)) return explicitLocal;

    if (agent.lastKnownIp && isPrivateIpv4(agent.lastKnownIp)) return agent.lastKnownIp;
    return explicitLocal ?? agent.lastKnownIp ?? null;
  }, [agent.lastKnownIp, networkSnapshot, systemSnapshot]);

  function buildCompanyContextDraft(
    companyContext: RemoteHostDetails["installationContexts"][number]["company"],
    fallbackDirectory: string,
  ) {
    return {
      serverType: companyContext?.serverType ?? "__none__",
      installationDirectory:
        companyContext?.installationDirectory?.trim() || fallbackDirectory || DEFAULT_INSTALLATION_DIRECTORY,
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
      return {
        ...prev,
        [companyId]: {
          ...current,
          ...patch,
        },
      };
    });
  }
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
    if (!agent.lastHeartbeatAt) {
      return {
        label: "Sem contato",
        tone: "border-red-500/20 bg-red-500/10 text-red-700 dark:text-red-300",
        description: "O agente ainda não registrou atividade recente no portal.",
      };
    }

    const diffMs = Date.now() - new Date(agent.lastHeartbeatAt).getTime();
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
      description: "Último contato muito antigo. Validar o onboarding e a conectividade do agente.",
    };
  }, [agent.lastHeartbeatAt]);

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
      toast.error(`${label} não configurado.`);
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
      toast.error("Identificador remoto não configurado.");
      return;
    }

    window.location.href = rustdeskHref;
    window.setTimeout(() => {
      toast("Se o acesso remoto não abrir, copie o ID e conecte manualmente.");
    }, 600);
  }

  function handleSaveProjectedHostName() {
    if (!normalizedProjectedHostName) {
      toast.error("Informe um nome válido para a máquina.");
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

  function handleRequestRemoteAction(action: "RESEND_CONFIG" | "REAPPLY_ALIAS") {
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
          body: {
            companyId,
            mode: "add",
          },
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
              body: {
                companyId,
                mode: companyId ? "add" : "replace",
              },
            })
          )
        );

        toast.success(
          companyId
            ? `Empresa adicionada em ${installationContextsForDisplay.length} instalação(ões).`
            : `Vínculo removido em ${installationContextsForDisplay.length} instalação(ões).`
        );
        router.refresh();
      } catch (error) {
        toast.error(getRemoteApiErrorMessage(error));
      }
    });
  }

  function handleCreateManualInstallation() {
    if (!manualInstallationCompanyId) {
      toast.error("Selecione a empresa da instalação.");
      return;
    }

    const normalizedPath = manualInstallationPath.trim();
    if (!normalizedPath) {
      toast.error("Informe o diretório monitorado da instalação.");
      return;
    }

    startCreatingManualInstallation(async () => {
      try {
        await requestRemoteMutation({
          url: `/api/remote/hosts/${host.id}/syspro-updates`,
          method: "POST",
          body: {
            companyId: manualInstallationCompanyId,
            path: normalizedPath,
          },
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

  const [isStartingSession, startSessionTransition] = useTransition();

  const handleStartOrchestratedSession = () => {
    if (!normalizedRustdeskId) {
      toast.error("Host sem identificador remoto. Não é possível iniciar sessão.");
      return;
    }

    const href = isMobileClient
      ? `rustdesk://[${normalizedRustdeskId}]`
      : `rustdesk://${normalizedRustdeskId}`;
    window.location.href = href;

    startSessionTransition(async () => {
      try {
        const result = await requestRemoteSessionAction({
          hostId: host.id,
          companyId: host.companyId,
          ticketNumber: ticketNumber,
          reason: ticketNumber ? `Suporte via Portal para Ticket #${ticketNumber}` : "Acesso técnico via Portal",
        });

        if (!result.success) {
          toast.error(result.error ?? "Falha ao registrar sessão auditada.");
        }
      } catch {
        // Protocol already opened; audit failure is non-blocking
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
              href="/portal/infraestrutura?tab=hosts" 
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
                {isStartingSession ? "Iniciando..." : (isMobileClient ? "App" : "Sessão auditada")}
            </Button>
          </div>
        </div>
      </div>

      <Tabs defaultValue="geral" className="space-y-6">
        <div className="flex w-full">
          <TabsList className="grid h-auto w-full grid-cols-3 gap-1 md:grid-cols-6">
            <TabsTrigger value="geral">Visão Geral</TabsTrigger>
            <TabsTrigger value="monitoramento">Monitoramento</TabsTrigger>
            <TabsTrigger value="instalacoes">Instalações</TabsTrigger>
            <TabsTrigger value="agente">Agente</TabsTrigger>
            <TabsTrigger value="bkp">BKP</TabsTrigger>
            <TabsTrigger value="configuracoes">Configurações</TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="geral" className="space-y-6">
          {/* Identity summary */}
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-xl border border-border/40 bg-muted/5 p-4 space-y-1.5 shadow-sm">
              <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                <Monitor className="h-3 w-3" /> Nome da máquina
              </p>
              <p className="text-sm font-medium text-foreground truncate">{windowsComputerName ?? host.name}</p>
            </div>
            <div className="rounded-xl border border-border/40 bg-muted/5 p-4 space-y-1.5 shadow-sm">
              <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                <Monitor className="h-3 w-3" /> IPv4
              </p>
              <p className="text-sm font-medium font-mono text-foreground">{machineIpv4 ?? "Sem leitura"}</p>
            </div>
            <div className="rounded-xl border border-border/40 bg-muted/5 p-4 space-y-1.5 shadow-sm">
              <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                <Fingerprint className="h-3 w-3" /> RustDesk ID
              </p>
              <p className="text-sm font-medium font-mono text-foreground">{normalizedRustdeskId ?? "Sem leitura"}</p>
            </div>
            <div className="rounded-xl border border-border/40 bg-muted/5 p-4 space-y-1.5 shadow-sm">
              <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                <Shield className="h-3 w-3" /> Versão do agente
              </p>
              <p className="text-sm font-medium text-foreground">{agent.agentVersion ?? "N/A"}</p>
            </div>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            {/* Linked Agent Device */}
            <AgentLinkSection hostId={host.id} linkedDevice={linkedDevice} />

            {/* Support Ticket Context */}
            {ticketNumber && (
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
                    <div className="text-sm text-blue-300/70 italic">Não foi possível recuperar os detalhes do chamado #{ticketNumber}.</div>
                  )}
                </CardContent>
              </Card>
            )}
          </div>

          {/* Inventory Signals */}
          {(rebootPending || (host.lastAgentMetrics?.diskFree != null && host.lastAgentMetrics.diskFree < 5 * 1024 * 1024 * 1024) || contractValidationError) && (
                <Card className="border-rose-500/20 bg-rose-500/5">
                   <CardHeader className="pb-2 px-4 pt-4">
                    <CardTitle className="text-[10px] font-bold uppercase tracking-widest text-rose-500 flex items-center gap-2">
                      <AlertCircle className="h-3.5 w-3.5" />
                      Alertas críticos
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-4 flex flex-wrap gap-2">
                    {rebootPending && (
                      <Badge variant="outline" className="border-rose-500/30 bg-rose-500/10 text-rose-600 dark:text-rose-400">
                        <RefreshCw className="mr-1.5 h-3 w-3 animate-spin-slow" />
                        Reinicialização necessária
                      </Badge>
                    )}
                    {(host.lastAgentMetrics?.diskFree != null && host.lastAgentMetrics.diskFree < 5 * 1024 * 1024 * 1024) && (
                      <Badge variant="outline" className="border-rose-500/30 bg-rose-500/10 text-rose-600 dark:text-rose-400">
                        <Database className="mr-1.5 h-3 w-3" />
                        Espaço em disco crítico
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

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-xl border border-border/40 bg-muted/5 p-4 space-y-3 shadow-sm transition-all hover:bg-muted/10">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Clock className="h-4 w-4" />
                <span className="text-[10px] font-bold uppercase tracking-wider">Última atividade</span>
              </div>
              <div className="space-y-0.5">
                <p className="text-lg font-bold text-foreground">{formatRelativeHeartbeat(agent.lastHeartbeatAt)}</p>
                <p className="text-xs text-muted-foreground">{formatDateTime(agent.lastHeartbeatAt)}</p>
              </div>
            </div>
            <div className="rounded-xl border border-border/40 bg-muted/5 p-4 space-y-3 shadow-sm transition-all hover:bg-muted/10 text-muted-foreground">
              <div className="flex items-center gap-2">
                <Shield className="h-4 w-4" />
                <span className="text-[10px] font-bold uppercase tracking-wider">Estado do agente</span>
              </div>
              <div className="space-y-0.5">
                <p className="text-lg font-bold text-foreground capitalize">{serviceStatus.label}</p>
                <p className="text-xs text-muted-foreground">Estratégia: {orchestrationStrategy}</p>
              </div>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="monitoramento">
          <HostTechnicalTab
            details={details}
            host={host}
            machineIpv4={machineIpv4}
            windowsComputerName={windowsComputerName}
            firebirdData={firebirdData}
            sysproVersionSnapshot={details.agentTelemetry.sysproVersionSnapshot}
            diskSnapshot={diskSnapshot}
            sysproProcessSnapshot={sysproProcessSnapshot}
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
            handleCopy={handleCopy}
            rustDeskCompliance={rustDeskCompliance}
            visibleAgentCommands={visibleAgentCommands}
            hiddenAcknowledgedCount={hiddenAcknowledgedCount}
            hasPendingInstallGuide={hasPendingInstallGuide}
            desiredSysproInstalls={desiredSysproInstalls}
          />
        </TabsContent>

        <TabsContent value="bkp" className="space-y-6">
          <Card className="border-border/50">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Archive className="h-5 w-5 text-muted-foreground" />
                Backup
              </CardTitle>
              <CardDescription>Gerenciamento de backup dos bancos de dados Firebird e arquivos críticos do Syspro.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="rounded-xl border border-border/50 bg-muted/15 p-4">
                <p className="text-sm font-medium text-foreground">Banco de dados detectado</p>
                <div className="mt-3 grid gap-3 md:grid-cols-3">
                  <div className="rounded-lg border border-border/40 bg-background/50 p-3">
                    <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Firebird</p>
                    <p className="mt-1 text-sm text-foreground">{firebirdData.name ?? "Sem leitura"}</p>
                  </div>
                  <div className="rounded-lg border border-border/40 bg-background/50 p-3">
                    <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Versão</p>
                    <p className="mt-1 text-sm text-foreground">{firebirdData.version ?? "Sem leitura"}</p>
                  </div>
                  <div className="rounded-lg border border-border/40 bg-background/50 p-3">
                    <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Processo fbserver</p>
                    <p className="mt-1 text-sm text-foreground">
                      {firebirdData.processRunning === null ? "Sem leitura" : firebirdData.processRunning ? "Em execução" : "Parado"}
                    </p>
                  </div>
                </div>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                {([
                  { title: "Jobs gbak / nbackup", description: "Agendamento automático de backup incremental e full via gbak/nbackup com retenção configurável." },
                  { title: "Catálogo de artefatos", description: "Registro de todos os backups gerados com metadados de tamanho, hash e status de validação." },
                  { title: "Restauração assistida", description: "Fluxo guiado para restauração pontual com validação de integridade antes da aplicação." },
                  { title: "Notificações de falha", description: "Alertas imediatos via portal e e-mail em caso de falha ou timeout no processo de backup." },
                ] as const).map((feature) => (
                  <div key={feature.title} className="rounded-xl border border-dashed border-border/40 bg-muted/5 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm font-medium text-foreground">{feature.title}</p>
                      <Badge variant="outline" className="border-amber-500/20 bg-amber-500/10 text-amber-700 dark:text-amber-300 text-[10px]">
                        Em desenvolvimento
                      </Badge>
                    </div>
                    <p className="mt-2 text-sm text-muted-foreground">{feature.description}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="configuracoes" className="space-y-6">
          <Card className="border-border/50">
            <CardHeader>
              <CardTitle className="text-lg">Perfil remoto aplicado</CardTitle>
              <CardDescription>Configuração efetiva esperada pelo portal para o agente e o RustDesk neste host.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-3">
                <div className="rounded-xl border border-border/50 bg-muted/10 p-4">
                  <p className="text-xs text-muted-foreground">Servidor remoto</p>
                  <p className="mt-1 text-sm font-medium text-foreground">{details.moduleSettings.rustDeskServerHost.trim() || "Sem configuração"}</p>
                </div>
                <div className="rounded-xl border border-border/50 bg-muted/10 p-4">
                  <p className="text-xs text-muted-foreground">Versão alvo do RustDesk</p>
                  <p className="mt-1 text-sm font-medium text-foreground">{details.moduleSettings.rustDeskVersion.trim() || "Sem configuração"}</p>
                </div>
                <div className="rounded-xl border border-border/50 bg-muted/10 p-4">
                  <p className="text-xs text-muted-foreground">Hash da chave pública</p>
                  <p className="mt-1 break-all text-sm font-medium text-foreground">
                    {details.moduleSettings.rustDeskPublicKeyHash?.trim() || "Sem configuração"}
                  </p>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                <div className="rounded-xl border border-border/50 bg-muted/10 p-4">
                  <p className="text-xs text-muted-foreground">Auto instalar</p>
                  <p className="mt-1 text-sm font-medium text-foreground">{details.moduleSettings.rustDeskAutoInstall ? "Ativo" : "Inativo"}</p>
                </div>
                <div className="rounded-xl border border-border/50 bg-muted/10 p-4">
                  <p className="text-xs text-muted-foreground">Auto atualizar</p>
                  <p className="mt-1 text-sm font-medium text-foreground">{details.moduleSettings.rustDeskAutoUpgrade ? "Ativo" : "Inativo"}</p>
                </div>
                <div className="rounded-xl border border-border/50 bg-muted/10 p-4">
                  <p className="text-xs text-muted-foreground">Reiniciar serviço após aplicar</p>
                  <p className="mt-1 text-sm font-medium text-foreground">{details.moduleSettings.rustDeskRestartServiceAfterApply ? "Ativo" : "Inativo"}</p>
                </div>
                <div className="rounded-xl border border-border/50 bg-muted/10 p-4">
                  <p className="text-xs text-muted-foreground">Suprimir atalhos da tray</p>
                  <p className="mt-1 text-sm font-medium text-foreground">{details.moduleSettings.rustDeskSuppressTrayShortcuts ? "Ativo" : "Inativo"}</p>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                <div className="rounded-xl border border-border/50 bg-muted/10 p-4">
                  <p className="text-xs text-muted-foreground">Ocultar tray</p>
                  <p className="mt-1 text-sm font-medium text-foreground">{details.moduleSettings.rustDeskHideTray ? "Ativo" : "Inativo"}</p>
                </div>
                <div className="rounded-xl border border-border/50 bg-muted/10 p-4">
                  <p className="text-xs text-muted-foreground">Ocultar parar serviço</p>
                  <p className="mt-1 text-sm font-medium text-foreground">{details.moduleSettings.rustDeskHideStopService ? "Ativo" : "Inativo"}</p>
                </div>
                <div className="rounded-xl border border-border/50 bg-muted/10 p-4">
                  <p className="text-xs text-muted-foreground">Permitir configuração remota local</p>
                  <p className="mt-1 text-sm font-medium text-foreground">{details.moduleSettings.rustDeskAllowRemoteConfigModification ? "Ativo" : "Inativo"}</p>
                </div>
                <div className="rounded-xl border border-border/50 bg-muted/10 p-4">
                  <p className="text-xs text-muted-foreground">DirectX Capture</p>
                  <p className="mt-1 text-sm font-medium text-foreground">{details.moduleSettings.rustDeskEnableDirectXCapture ? "Ativo" : "Inativo"}</p>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                <div className="rounded-xl border border-border/50 bg-muted/10 p-4">
                  <p className="text-xs text-muted-foreground">Permitir render D3D</p>
                  <p className="mt-1 text-sm font-medium text-foreground">{details.moduleSettings.rustDeskAllowD3DRender ? "Ativo" : "Inativo"}</p>
                </div>
                <div className="rounded-xl border border-border/50 bg-muted/10 p-4">
                  <p className="text-xs text-muted-foreground">Tipo do pacote</p>
                  <p className="mt-1 text-sm font-medium text-foreground">{details.moduleSettings.rustDeskInstallerPackageType}</p>
                </div>
                <div className="rounded-xl border border-border/50 bg-muted/10 p-4">
                  <p className="text-xs text-muted-foreground">SHA256 do instalador</p>
                  <p className="mt-1 break-all text-sm font-medium text-foreground">
                    {details.moduleSettings.rustDeskInstallerSha256.trim() || "Não definido"}
                  </p>
                </div>
              </div>

              <div className="rounded-xl border border-border/50 bg-muted/10 p-4">
                <p className="text-xs text-muted-foreground">URL do instalador</p>
                <p className="mt-1 break-all text-sm font-medium text-foreground">{details.moduleSettings.rustDeskInstallerUrl.trim() || "Não definido"}</p>
              </div>
              <div className="rounded-xl border border-border/50 bg-muted/10 p-4">
                <p className="text-xs text-muted-foreground">Argumentos do instalador</p>
                <p className="mt-1 break-all text-sm font-medium text-foreground">{details.moduleSettings.rustDeskInstallArgs.trim() || "Não definido"}</p>
              </div>
              <div className="rounded-xl border border-border/50 bg-muted/10 p-4">
                <p className="text-xs text-muted-foreground">Configuração exportada do servidor</p>
                <p className="mt-1 break-all text-sm font-medium text-foreground">{details.moduleSettings.rustDeskServerConfig.trim() || "Sem configuração"}</p>
              </div>
              <div className="rounded-xl border border-border/50 bg-muted/10 p-4">
                <p className="text-xs text-muted-foreground">Chave pública exportada</p>
                <p className="mt-1 break-all text-sm font-medium text-foreground">{details.moduleSettings.rustDeskPublicKey.trim() || "Sem configuração"}</p>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/50">
            <CardHeader>
              <CardTitle className="text-lg">Identidade do host</CardTitle>
              <CardDescription>Nome e perfil da máquina usados pelo portal para identificação e filtragem.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3 md:grid-cols-[minmax(0,1fr)_220px_auto] md:items-end">
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground">Tipo do host</p>
                <Select
                  value={projectedMachineProfile ?? "__none__"}
                  onValueChange={(value) =>
                    setProjectedMachineProfile(value === "__none__" ? null : (value as RemoteHostDetails["host"]["machineProfile"]))
                  }
                  disabled={isSavingMachineName}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">Não definido</SelectItem>
                    {Object.entries(MACHINE_PROFILE_LABEL).map(([value, label]) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button
                type="button"
                onClick={handleSaveProjectedHostName}
                disabled={isSavingMachineName || !canSaveProjectedHostName}
                className="gap-2"
              >
                {isSavingMachineName ? <RefreshCcw className="h-4 w-4 animate-spin" /> : <ArrowRightLeft className="h-4 w-4" />}
                {isSavingMachineName ? "Salvando..." : "Salvar host"}
              </Button>
            </CardContent>
          </Card>

          <Card className="border-border/50">
            <CardHeader>
              <CardTitle className="text-lg">Ações do agente</CardTitle>
              <CardDescription>Ações manuais de recuperação, bootstrap e reconfiguração do módulo remoto. Use quando a máquina parar no fluxo ou divergir do perfil esperado.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" onClick={handleRotateAgentToken} disabled={isRevokingAgentToken} className="gap-2">
                  <Fingerprint className="h-4 w-4" />
                  {isRevokingAgentToken ? "Solicitando..." : "Forçar inicialização remota"}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => handleRequestRemoteAction("RESEND_CONFIG")}
                  disabled={isRequestingResendConfig}
                  className="gap-2"
                >
                  <Copy className="h-4 w-4" />
                  {isRequestingResendConfig ? "Solicitando..." : "Reaplicar configuração do módulo"}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => handleRequestRemoteAction("REAPPLY_ALIAS")}
                  disabled={isRequestingSelfHeal}
                  className="gap-2"
                >
                  <HardDriveDownload className="h-4 w-4" />
                  {isRequestingSelfHeal ? "Solicitando..." : "Reaplicar alias do RustDesk"}
                </Button>
              </div>
              <p className="mt-3 text-xs text-muted-foreground">
                “Forçar inicialização remota” invalida a credencial atual e faz o agente executar novo bootstrap autenticado no próximo ciclo.
              </p>
            </CardContent>
          </Card>

          <div>
            <p className="mb-3 text-sm font-medium text-muted-foreground">Funcionalidades em desenvolvimento</p>
            <div className="grid gap-4 md:grid-cols-2">
              {([
                { title: "Políticas de acesso", description: "Restrições de horário, IP e perfil de usuário para controle granular de quem pode acessar o host." },
                { title: "Vault de credenciais", description: "Armazenamento seguro de credenciais de acesso local com rotação automática e auditoria." },
                { title: "Alertas e monitoramento", description: "Notificações proativas para CPU crítica, disco baixo, agente offline e falhas de serviço." },
              ] as const).map((feature) => (
                <div key={feature.title} className="rounded-xl border border-dashed border-border/40 bg-muted/5 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-medium text-foreground">{feature.title}</p>
                    <Badge variant="outline" className="border-amber-500/20 bg-amber-500/10 text-amber-700 dark:text-amber-300 text-[10px]">
                      Em desenvolvimento
                    </Badge>
                  </div>
                  <p className="mt-2 text-sm text-muted-foreground">{feature.description}</p>
                </div>
              ))}
            </div>
          </div>
        </TabsContent>

      </Tabs>
    </div>
  );
}




