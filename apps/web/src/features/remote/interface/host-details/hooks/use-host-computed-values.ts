"use client";

import { useMemo } from "react";
import type { RemoteHostDetails } from "@/features/remote/domain/remote-host.types";
import { getRemoteProductStatusMeta } from "@/features/remote/domain";
import {
  getServiceStatusMeta,
  getServiceStatusIconMeta,
  getAutoHealStatusIconMeta,
  extractStringFromPayload,
  readBootstrapRateMetrics,
  readContractSchemaVersions,
  extractContractValidationError,
  resolveExpectedRustDeskAlias,
} from "../host-details.helpers";
import { DEFAULT_INSTALLATION_DIRECTORY } from "../host-details.constants";

export function useHostComputedValues(
  details: RemoteHostDetails,
  installationFilter: "all" | "unlinked",
) {
  const host = details.host;
  const agent = host.agent;
  const normalizedRustdeskId = agent.rustdeskId ? agent.rustdeskId.replace(/\s+/g, "") : null;
  const windowsComputerName = agent.machineName ?? null;
  const rustdeskHref = normalizedRustdeskId ? `rustdesk://${normalizedRustdeskId}` : null;

  const serviceStatus = getServiceStatusMeta(host.serviceStatus);

  const { systemSnapshot, networkSnapshot, softwareSnapshot, sysproProcessSnapshot, diskSnapshot, windowsUpdateStatus, rebootPending, agentMetrics, hardwareIdentity, sysproVersionSnapshot } =
    details.agentTelemetry;

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

    return {
      lastSyncAt: host.agent.lastRustDeskConfigSyncAt,
      items: [
        {
          id: "alias",
          label: "Alias",
          expected: expectedAlias,
          reported: host.agent.lastKnownRustDeskAlias,
          match: !!host.agent.lastKnownRustDeskAlias && host.agent.lastKnownRustDeskAlias.trim().toLowerCase() === expectedAlias.trim().toLowerCase(),
        },
        {
          id: "version",
          label: "Versão",
          expected: expectedVersion,
          reported: host.agent.lastKnownRustDeskVersion,
          match: !!host.agent.lastKnownRustDeskVersion && host.agent.lastKnownRustDeskVersion.trim().toLowerCase() === expectedVersion.trim().toLowerCase(),
        },
        {
          id: "serverHost",
          label: "Servidor remoto",
          expected: expectedServerHost,
          reported: host.agent.lastKnownRustDeskServerHost,
          match: !!host.agent.lastKnownRustDeskServerHost && host.agent.lastKnownRustDeskServerHost.trim().toLowerCase() === expectedServerHost.trim().toLowerCase(),
        },
        {
          id: "apiHost",
          label: "Servidor da API",
          expected: expectedApiHost,
          reported: host.agent.lastKnownRustDeskApiHost,
          match: !!host.agent.lastKnownRustDeskApiHost && host.agent.lastKnownRustDeskApiHost.trim().toLowerCase() === expectedApiHost.trim().toLowerCase(),
        },
        {
          id: "publicKey",
          label: "Chave pública",
          expected: expectedPublicKeyHash ? "Hash oficial carregado" : "Sem configuração",
          reported: host.agent.lastKnownRustDeskPublicKeyHash ? "Hash reportado pelo agente" : null,
          match: !!host.agent.lastKnownRustDeskPublicKeyHash && !!expectedPublicKeyHash && host.agent.lastKnownRustDeskPublicKeyHash === expectedPublicKeyHash,
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
    [details.installGuide],
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
    return dedupedInstallationContexts
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
        (entry): entry is { companyId: string | null; resolvedCompanyName: string | null; companyLabel: string; path: string } =>
          !!entry,
      );
  }, [dedupedInstallationContexts, details.company.installationDirectory]);

  const desiredSysproInstalls = useMemo(
    () =>
      dedupedInstallationContexts
        .filter((context) => !!context.update.companyId)
        .map((context) => {
          const companyName =
            context.company?.nomeFantasia?.trim() ||
            context.company?.razaoSocial?.trim() ||
            context.update.resolvedCompanyName?.trim() ||
            context.update.companyLabel.trim();
          const rawPath = context.update.path.trim();
          const serverPath = /\.exe$/i.test(rawPath) ? rawPath.replace(/[/\\][^/\\]+\.exe$/i, "") : rawPath;
          return { companyId: context.update.companyId!, companyName, serverPath };
        }),
    [dedupedInstallationContexts],
  );

  const detectedCompanyCount = useMemo(() => {
    const names = new Set(
      installations
        .map((entry) => (entry.resolvedCompanyName ?? entry.companyLabel).trim())
        .filter((value) => !!value)
        .map((value) => value.toLowerCase()),
    );
    return names.size;
  }, [installations]);

  const canManageInstallations =
    details.tenantScope.role === "ADMIN" ||
    details.tenantScope.role === "SUPORTE" ||
    details.tenantScope.role === "DEVELOPER";

  const unlinkedInstallationsCount = useMemo(
    () => dedupedInstallationContexts.filter((context) => !context.update.companyId).length,
    [dedupedInstallationContexts],
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
      (command) => command.type === "REAPPLY_ALIAS" || command.type === "REAPPLY_CONFIG",
    );
    const autoHealLastAttemptAt =
      latestAutoHealCommand?.executedAt ??
      latestAutoHealCommand?.failedAt ??
      latestAutoHealCommand?.deliveredAt ??
      latestAutoHealCommand?.updatedAt ??
      latestAutoHealCommand?.createdAt ??
      null;
    const autoHealMeta = (() => {
      if (!latestAutoHealCommand) return { label: "Sem leitura", status: null };
      if (latestAutoHealCommand.status === "ACKNOWLEDGED") return { label: "Recovered", status: latestAutoHealCommand.status };
      if (latestAutoHealCommand.status === "FAILED") return { label: "Falhou", status: latestAutoHealCommand.status };
      return { label: "Em andamento", status: latestAutoHealCommand.status };
    })();
    const beforeServiceStatus =
      (latestAutoHealCommand &&
        (extractStringFromPayload(latestAutoHealCommand.resultPayload, ["serviceStatusBefore", "lastServiceStatusBefore", "previousServiceStatus", "beforeStatus", "statusBefore"]) ||
          extractStringFromPayload(latestAutoHealCommand.payload, ["serviceStatusBefore", "lastServiceStatusBefore", "previousServiceStatus", "beforeStatus", "statusBefore"]))) ??
      null;
    const afterServiceStatus =
      (latestAutoHealCommand &&
        (extractStringFromPayload(latestAutoHealCommand.resultPayload, ["serviceStatusAfter", "currentServiceStatus", "afterStatus", "statusAfter"]) ||
          extractStringFromPayload(latestAutoHealCommand.payload, ["serviceStatusAfter", "currentServiceStatus", "afterStatus", "statusAfter"]))) ??
      host.serviceStatus;
    const versionEntries = Array.isArray(sysproVersionSnapshot?.["installations"])
      ? (sysproVersionSnapshot["installations"] as Array<Record<string, unknown>>)
      : [];
    const collectedVersions = versionEntries
      .map((entry) => (typeof entry["exeVersion"] === "string" ? entry["exeVersion"].trim() : ""))
      .filter((value) => !!value);
    const erpVersion = collectedVersions[0] ?? null;
    const erpPaths = Array.from(new Set(installations.map((entry) => entry.path.trim()).filter((path) => !!path)));
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
      erp: { version: erpVersion, paths: resolvedPaths },
    };
  }, [details.agentCommands, details.company.installationDirectory, host.serviceStatus, installations, serviceStatus, sysproVersionSnapshot]);

  const autoHealStatusIcon = useMemo(
    () => getAutoHealStatusIconMeta(agentHealthCard.autoHeal.status),
    [agentHealthCard.autoHeal.status],
  );

  const productStatusMeta = useMemo(
    () => getRemoteProductStatusMeta(details.agentHealth.productStatus),
    [details.agentHealth.productStatus],
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
    const ipv4Pattern = /\b(?:(?:25[0-5]|2[0-4]\d|1?\d?\d)\.){3}(?:25[0-5]|2[0-4]\d|1?\d?\d)\b/g;
    const isPrivateIpv4 = (value: string) =>
      /^10\./.test(value) || /^192\.168\./.test(value) || /^172\.(1[6-9]|2\d|3[0-1])\./.test(value) || /^127\./.test(value);
    const extractIpv4Candidates = (input: unknown): string[] => {
      const found = new Set<string>();
      const visit = (value: unknown) => {
        if (typeof value === "string") {
          const matches = value.match(ipv4Pattern) ?? [];
          for (const match of matches) found.add(match);
          return;
        }
        if (Array.isArray(value)) { value.forEach(visit); return; }
        if (value && typeof value === "object") Object.values(value as Record<string, unknown>).forEach(visit);
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
    const softwareName = softwareItem ? extractStringFromPayload(softwareItem, ["displayName", "name", "productName", "title"]) : null;
    const softwareVersion = softwareItem ? extractStringFromPayload(softwareItem, ["displayVersion", "version", "productVersion"]) : null;
    const fbProcess = sysproProcessSnapshot.find((entry) => {
      const processName = extractStringFromPayload(entry, ["processName", "name"]);
      return !!processName && processName.toLowerCase().includes("fbserver");
    });
    const processRunning =
      typeof fbProcess?.["running"] === "boolean"
        ? fbProcess["running"]
        : typeof fbProcess?.["status"] === "string"
          ? String(fbProcess["status"]).toLowerCase() === "running"
          : null;
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

  return {
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
    installations,
    desiredSysproInstalls,
    detectedCompanyCount,
    canManageInstallations,
    unlinkedInstallationsCount,
    installationContextsForDisplay,
    serviceStatusIcon,
    systemSnapshot,
    networkSnapshot,
    softwareSnapshot,
    hardwareIdentity,
    diskSnapshot,
    sysproProcessSnapshot,
    windowsUpdateStatus,
    rebootPending,
    agentMetrics,
    agentHealthCard,
    autoHealStatusIcon,
    productStatusMeta,
    bootstrapRateMetrics,
    contractSchemaVersions,
    contractValidationError,
    orchestrationStrategy,
    machineIpv4,
    sysproServerInstallations,
    firebirdData,
    heartbeat,
  };
}
