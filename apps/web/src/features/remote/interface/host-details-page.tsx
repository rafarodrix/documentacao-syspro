"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
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
import { getRemoteApiErrorMessage, requestRemoteMutation } from "@/features/remote/interface/remote-api";

function formatDateTime(value: string | null) {
  if (!value) return "Sem registro";
  return new Date(value).toLocaleString("pt-BR");
}

function formatRelativeHeartbeat(value: string | null) {
  if (!value) return "Sem contato";

  const diffMinutes = Math.floor((Date.now() - new Date(value).getTime()) / 60000);
  if (diffMinutes < 1) return "Agora";
  if (diffMinutes < 60) return `${diffMinutes} min atras`;

  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours}h atras`;

  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays}d atras`;
}

function formatDateOnly(value: string | null) {
  if (!value) return "Sem registro";
  return new Date(value).toLocaleDateString("pt-BR");
}

function getServiceStatusMeta(value: string | null) {
  if (!value) {
    return {
      label: "Sem leitura",
      tone: "border-border/60 bg-background/70 text-muted-foreground",
    };
  }

  const normalized = value.toLowerCase();
  if (normalized === "running") {
    return {
      label: "Servico em execucao",
      tone: "border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
    };
  }

  if (normalized === "restarted_by_agent") {
    return {
      label: "Servico reiniciado pelo agente",
      tone: "border-amber-500/20 bg-amber-500/10 text-amber-700 dark:text-amber-300",
    };
  }

  if (normalized === "not_found") {
    return {
      label: "Servico RustDesk nao encontrado",
      tone: "border-red-500/20 bg-red-500/10 text-red-700 dark:text-red-300",
    };
  }

  return {
    label: value,
    tone: "border-border/60 bg-background/70 text-foreground",
  };
}

function getServiceStatusIconMeta(value: string | null) {
  if (!value) {
    return {
      Icon: CircleHelp,
      tone: "text-muted-foreground",
      label: "Sem leitura",
    };
  }

  const normalized = value.toLowerCase();
  if (normalized === "running") {
    return {
      Icon: CheckCircle2,
      tone: "text-emerald-600 dark:text-emerald-400",
      label: "Running",
    };
  }

  if (normalized === "restarted_by_agent") {
    return {
      Icon: AlertTriangle,
      tone: "text-amber-600 dark:text-amber-400",
      label: "Recovered",
    };
  }

  if (normalized === "not_found") {
    return {
      Icon: XCircle,
      tone: "text-red-600 dark:text-red-400",
      label: "Not found",
    };
  }

  return {
    Icon: CircleHelp,
    tone: "text-foreground",
    label: value,
  };
}

function getAutoHealStatusIconMeta(value: string | null) {
  if (!value) {
    return {
      Icon: CircleHelp,
      tone: "text-muted-foreground",
      label: "Sem leitura",
    };
  }

  if (value === "ACKNOWLEDGED") {
    return {
      Icon: AlertTriangle,
      tone: "text-amber-600 dark:text-amber-400",
      label: "Recovered",
    };
  }

  if (value === "FAILED") {
    return {
      Icon: XCircle,
      tone: "text-red-600 dark:text-red-400",
      label: "Falhou",
    };
  }

  if (value === "PENDING" || value === "DELIVERED") {
    return {
      Icon: CircleHelp,
      tone: "text-foreground",
      label: "Em andamento",
    };
  }

  return {
    Icon: CircleHelp,
    tone: "text-muted-foreground",
    label: value,
  };
}

function formatHourMinute(value: string | null) {
  if (!value) return "Sem registro";
  return new Date(value).toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function extractStringFromPayload(
  payload: Record<string, unknown> | null,
  preferredKeys: string[]
) {
  if (!payload) return null;

  const normalizedPreferredKeys = new Set(preferredKeys.map((key) => key.toLowerCase()));
  const queue: unknown[] = [payload];
  const visited = new Set<object>();

  while (queue.length) {
    const current = queue.shift();
    if (!current || typeof current !== "object") continue;
    if (visited.has(current as object)) continue;
    visited.add(current as object);

    for (const [key, value] of Object.entries(current as Record<string, unknown>)) {
      if (
        normalizedPreferredKeys.has(key.toLowerCase()) &&
        typeof value === "string" &&
        value.trim()
      ) {
        return value.trim();
      }
    }

    for (const value of Object.values(current as Record<string, unknown>)) {
      if (value && typeof value === "object") {
        queue.push(value);
      }
    }
  }

  return null;
}

const COMPANY_SERVER_TYPE_LABEL: Record<"SYSPRO_SERVER" | "IIS", string> = {
  SYSPRO_SERVER: "Syspro Server",
  IIS: "IIS",
};

const REMOTE_CONNECTION_LABEL: Record<"DDNS_NOIP" | "RADMIN_VPN", string> = {
  DDNS_NOIP: "DDNS (NoIP)",
  RADMIN_VPN: "Radmin VPN",
};
const DEFAULT_INSTALLATION_DIRECTORY = "C:\\Syspro\\Server\\SysproServer.exe";
const UNLINKED_COMPANY_VALUE = "__unlinked__";
const EXPECTED_SCHEMA_VERSIONS = {
  discover: "discover.payload.v1",
  sync: "sync.payload.v1",
  ack: "ack.payload.v1",
} as const;

const AGENT_COMMAND_LABEL: Record<
  "REAPPLY_ALIAS" | "REAPPLY_CONFIG" | "UPGRADE_CLIENT" | "ROTATE_TOKEN_REQUIRED",
  string
> = {
  REAPPLY_ALIAS: "Reaplicar alias",
  REAPPLY_CONFIG: "Reaplicar configuracao",
  UPGRADE_CLIENT: "Atualizar cliente",
  ROTATE_TOKEN_REQUIRED: "Renovacao de credencial obrigatoria",
};

function getAgentTokenMeta(value: string | null) {
  const normalized = value?.toLowerCase() ?? "";

  if (normalized.includes("agenttoken expirado")) {
    return {
      label: "Credencial expirada",
      tone: "border-red-500/20 bg-red-500/10 text-red-700 dark:text-red-300",
      description: "A credencial do agente expirou por politica do portal. Execute a Vinculacao de Maquina novamente neste host.",
      needsBootstrap: true,
    };
  }

  if (normalized.includes("agenttoken invalido")) {
    return {
      label: "Credencial invalida",
      tone: "border-red-500/20 bg-red-500/10 text-red-700 dark:text-red-300",
      description: "O heartbeat foi recusado. Execute a Vinculacao de Maquina novamente neste host para emitir nova credencial.",
      needsBootstrap: true,
    };
  }

  if (normalized.includes("agenttoken rotacionado")) {
    return {
      label: "Credencial renovada",
      tone: "border-amber-500/20 bg-amber-500/10 text-amber-700 dark:text-amber-300",
      description: "A credencial anterior foi invalidada pelo portal. O host precisa de nova Vinculacao de Maquina.",
      needsBootstrap: true,
    };
  }

  if (normalized.includes("agenttoken indisponivel")) {
    return {
      label: "Credencial ausente",
      tone: "border-amber-500/20 bg-amber-500/10 text-amber-700 dark:text-amber-300",
      description: "O heartbeat local nao encontrou a credencial do agente. Reexecute a Vinculacao de Maquina autenticada neste host.",
      needsBootstrap: true,
    };
  }

  return {
    label: "Credencial valida",
    tone: "border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
    description: "O host possui credencial operacional para heartbeat recorrente.",
    needsBootstrap: false,
  };
}

function getBootstrapFlowLabel(
  value:
    | "pending_link"
    | "linked_host_detected"
    | "host_bootstrap_required"
    | "token_invalid"
    | "triagem_await_install_token"
    | "body_parse_failed"
    | "unknown"
) {
  if (value === "pending_link") return "pending_link";
  if (value === "linked_host_detected") return "linked_host_detected";
  if (value === "host_bootstrap_required") return "host_bootstrap_required";
  if (value === "token_invalid") return "token_invalid";
  if (value === "triagem_await_install_token") return "triagem_await_install_token";
  if (value === "body_parse_failed") return "body_parse_failed";
  return "unknown";
}

function getBootstrapFlowMeta(
  value:
    | "pending_link"
    | "linked_host_detected"
    | "host_bootstrap_required"
    | "token_invalid"
    | "triagem_await_install_token"
    | "body_parse_failed"
    | "unknown"
) {
  if (value === "token_invalid") {
    return {
      tone: "border-red-500/20 bg-red-500/10 text-red-700 dark:text-red-300",
      hint: "Credencial do agente invalida/expirada. Rebootstrap necessario.",
    };
  }
  if (value === "host_bootstrap_required" || value === "triagem_await_install_token") {
    return {
      tone: "border-amber-500/20 bg-amber-500/10 text-amber-700 dark:text-amber-300",
      hint: "Host aguardando bootstrap para voltar ao sync autenticado.",
    };
  }
  if (value === "linked_host_detected") {
    return {
      tone: "border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
      hint: "Host vinculado e apto ao fluxo token-first.",
    };
  }
  return {
    tone: "border-border/60 bg-background/70 text-muted-foreground",
    hint: "Fluxo reportado pelo dominio para a ultima avaliacao do agente.",
  };
}

function readBootstrapRateMetrics(agentMetrics: Record<string, unknown> | null) {
  const raw = agentMetrics?.["bootstrapRate24h"];
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return { ratePct: null as number | null, cycles: null as number | null, bootstrapCycles: null as number | null };
  }
  const payload = raw as Record<string, unknown>;
  const rate = typeof payload.bootstrapRatePct === "number" ? payload.bootstrapRatePct : null;
  const cycles = typeof payload.cycles === "number" ? payload.cycles : null;
  const bootstrapCycles = typeof payload.bootstrapCycles === "number" ? payload.bootstrapCycles : null;
  return { ratePct: rate, cycles, bootstrapCycles };
}

function readContractSchemaVersions(agentMetrics: Record<string, unknown> | null) {
  const raw = agentMetrics?.["schemaVersions"];
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return { discover: null as string | null, sync: null as string | null, ack: null as string | null };
  }
  const payload = raw as Record<string, unknown>;
  const discover = typeof payload.discover === "string" ? payload.discover : null;
  const sync = typeof payload.sync === "string" ? payload.sync : null;
  const ack = typeof payload.ack === "string" ? payload.ack : null;
  return { discover, sync, ack };
}

function extractContractValidationError(value: string | null) {
  if (!value) return null;
  const normalized = value.toLowerCase();
  const looksLikeValidationError =
    normalized.includes("schema") ||
    normalized.includes("payload") ||
    normalized.includes("obrigatorio") ||
    normalized.includes("required") ||
    normalized.includes("invalido");
  return looksLikeValidationError ? value : null;
}

async function copyTextWithFallback(value: string) {
  if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(value);
      return;
    } catch {}
  }

  const textarea = document.createElement("textarea");
  textarea.value = value;
  textarea.setAttribute("readonly", "true");
  textarea.style.position = "fixed";
  textarea.style.top = "-9999px";
  textarea.style.left = "-9999px";
  textarea.style.opacity = "0";
  document.body.appendChild(textarea);
  textarea.focus();
  textarea.select();
  textarea.setSelectionRange(0, value.length);

  const copied = document.execCommand("copy");
  textarea.remove();

  if (!copied) {
    throw new Error("copy_failed");
  }
}

function resolveExpectedRustDeskAlias(input: {
  hostName: string;
  machineName: string | null;
  companyName: string | null;
}) {
  const machineName = input.machineName?.trim();
  if (machineName) return machineName;
  if (input.companyName?.trim()) return `${input.companyName.trim()} | ${input.hostName}`;
  return input.hostName;
}

function SearchableCompanyPicker({
  value,
  options,
  onChange,
  disabled,
}: {
  value: string;
  options: Array<{ id: string; label: string }>;
  onChange: (value: string) => void;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter((option) => option.label.toLowerCase().includes(q));
  }, [options, query]);
  const selectedLabel =
    value === UNLINKED_COMPANY_VALUE
      ? "Sem vinculo"
      : options.find((option) => option.id === value)?.label ?? "Selecionar empresa";

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" role="combobox" disabled={disabled} className="w-full justify-between">
          <span className="truncate">{selectedLabel}</span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-60" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-2" align="start">
        <Input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Pesquisar empresa..."
          className="mb-2"
        />
        <div className="max-h-60 space-y-1 overflow-auto">
          <button
            type="button"
            className="flex w-full items-center justify-between rounded-md px-2 py-1.5 text-left text-sm hover:bg-muted"
            onClick={() => {
              onChange(UNLINKED_COMPANY_VALUE);
              setOpen(false);
            }}
          >
            <span>Sem vinculo</span>
            {value === UNLINKED_COMPANY_VALUE ? <Check className="h-4 w-4" /> : null}
          </button>
          {filtered.map((option) => (
            <button
              key={option.id}
              type="button"
              className="flex w-full items-center justify-between rounded-md px-2 py-1.5 text-left text-sm hover:bg-muted"
              onClick={() => {
                onChange(option.id);
                setOpen(false);
              }}
            >
              <span className="truncate">{option.label}</span>
              {value === option.id ? <Check className="h-4 w-4" /> : null}
            </button>
          ))}
          {!filtered.length ? <p className="px-2 py-1.5 text-xs text-muted-foreground">Nenhuma empresa encontrada.</p> : null}
        </div>
      </PopoverContent>
    </Popover>
  );
}

export function RemoteHostDetailsPanel({ details }: { details: RemoteHostDetails }) {
  const router = useRouter();
  const { host } = details;
  const [projectedHostName, setProjectedHostName] = useState(host.name);
  const [isMobileClient, setIsMobileClient] = useState(false);
  const [isSavingMachineName, startSavingMachineName] = useTransition();
  const [isRevokingAgentToken, startRevokingAgentToken] = useTransition();
  const [isRotatingInstallToken, startRotatingInstallToken] = useTransition();
  const [isRequestingResendConfig, startRequestingResendConfig] = useTransition();
  const [isRequestingSelfHeal, startRequestingSelfHeal] = useTransition();
  const [isRequestingRebootstrap, startRequestingRebootstrap] = useTransition();
  const [isRelinkingInstallation, startRelinkingInstallation] = useTransition();
  const [isBulkRelinkingInstallations, startBulkRelinkingInstallations] = useTransition();
  const [installationFilter, setInstallationFilter] = useState<"all" | "unlinked">("all");
  const [bulkInstallationCompanyId, setBulkInstallationCompanyId] = useState(details.companyOptions[0]?.id ?? "");
  const [selectedCompanyByUpdateId, setSelectedCompanyByUpdateId] = useState<Record<string, string>>({});
  const [latestInstallToken, setLatestInstallToken] = useState<string | null>(null);
  const normalizedRustdeskId = host.rustdeskId ? host.rustdeskId.replace(/\s+/g, "") : null;
  const windowsComputerName = host.machineName ?? host.agent.machineName ?? null;
  const rustdeskHref = normalizedRustdeskId ? `rustdesk://${normalizedRustdeskId}` : null;
  const normalizedProjectedHostName = projectedHostName.trim();
  const canSaveProjectedHostName =
    normalizedProjectedHostName.length > 0 && normalizedProjectedHostName !== host.name.trim();
  const statusLabel = host.status === "ACTIVE" ? "Ativo" : host.status === "MAINTENANCE" ? "Manutencao" : "Inativo";
  const serviceStatus = getServiceStatusMeta(host.serviceStatus);
  const agentTokenMeta = useMemo(() => getAgentTokenMeta(host.lastHeartbeatErrorMessage), [host.lastHeartbeatErrorMessage]);
  const agentTokenExpiresAt = useMemo(() => {
    if (!host.agent.agentTokenIssuedAt) return null;
    const issuedAt = new Date(host.agent.agentTokenIssuedAt);
    issuedAt.setDate(issuedAt.getDate() + 30);
    return issuedAt.toISOString();
  }, [host.agent.agentTokenIssuedAt]);
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
          label: "Servidor ID/Relay",
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
          label: "Key publica",
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
  const installations = useMemo(() => {
    const seen = new Set<string>();
    const primaryCompanyDirectory = details.company.installationDirectory?.trim() || DEFAULT_INSTALLATION_DIRECTORY;
    const items = details.installationContexts
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
  }, [details.company.installationDirectory, details.installationContexts]);
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
    () => details.installationContexts.filter((context) => !context.update.companyId).length,
    [details.installationContexts]
  );
  const installationContextsForDisplay = useMemo(() => {
    if (installationFilter === "unlinked") {
      return details.installationContexts.filter((context) => !context.update.companyId);
    }
    return details.installationContexts;
  }, [details.installationContexts, installationFilter]);
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
  }, [details.agentCommands, details.company.installationDirectory, installations, serviceStatus]);
  const autoHealStatusIcon = useMemo(
    () => getAutoHealStatusIconMeta(agentHealthCard.autoHeal.status),
    [agentHealthCard.autoHeal.status]
  );
  const ServiceStatusIcon = serviceStatusIcon.Icon;
  const AutoHealStatusIcon = autoHealStatusIcon.Icon;
  const bootstrapFlowLabel = useMemo(
    () => getBootstrapFlowLabel(details.agentHealth.bootstrapFlow),
    [details.agentHealth.bootstrapFlow]
  );
  const bootstrapFlowMeta = useMemo(
    () => getBootstrapFlowMeta(details.agentHealth.bootstrapFlow),
    [details.agentHealth.bootstrapFlow]
  );
  const shouldShowDiagnosticsPlaybook = useMemo(
    () =>
      details.agentHealth.bootstrapFlow === "token_invalid" ||
      details.agentHealth.bootstrapFlow === "triagem_await_install_token" ||
      details.agentHealth.bootstrapFlow === "body_parse_failed",
    [details.agentHealth.bootstrapFlow]
  );
  const diagnosticsPlaybookScript = useMemo(() => {
    const discoveryToken = "<DISCOVERY_TOKEN>";
    const installToken = host.installToken ?? "<INSTALL_TOKEN>";
    const rustdeskId = normalizedRustdeskId ?? "<RUSTDESK_ID>";
    return [
      "$reg = \"HKLM:\\SOFTWARE\\Trilink\\RemoteAgent\"",
      "if (-not (Test-Path $reg)) { New-Item -Path $reg -Force | Out-Null }",
      `Set-ItemProperty -Path $reg -Name "DiscoveryToken" -Value "${discoveryToken}"`,
      `Set-ItemProperty -Path $reg -Name "InstallToken" -Value "${installToken}"`,
      `Set-ItemProperty -Path $reg -Name "PortalBaseUrl" -Value "https://ajuda.trilinksoftware.com.br"`,
      "",
      "$body = @{",
      `  installToken = "${installToken}"`,
      `  rustdeskId   = "${rustdeskId}"`,
      "  machineName  = $env:COMPUTERNAME",
      "  agentVersion = \"trilink-agent-v1\"",
      "  environment  = \"Producao\"",
      "} | ConvertTo-Json",
      "",
      "Invoke-WebRequest -Method Post -Uri \"https://ajuda.trilinksoftware.com.br/api/remote/rustdesk/bootstrap\" -ContentType \"application/json\" -Body $body -UseBasicParsing",
    ].join("\n");
  }, [host.installToken, normalizedRustdeskId]);
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
    for (const context of details.installationContexts) {
      next[context.update.id] = context.update.companyId ?? UNLINKED_COMPANY_VALUE;
    }
    setSelectedCompanyByUpdateId(next);
  }, [details.installationContexts]);

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
      toast.error("RustDesk ID nao configurado.");
      return;
    }

    window.location.assign(rustdeskHref);
    window.setTimeout(() => {
      toast("Se o RustDesk nao abrir, copie o ID e conecte manualmente.");
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

  function handleRotateInstallToken() {
    startRotatingInstallToken(async () => {
      try {
        const result = await requestRemoteMutation<{ installToken?: string | null }>({
          url: `/api/remote/hosts/${host.id}/install-token`,
          method: "POST",
        });
        const token = result.data?.installToken?.trim() ?? null;
        if (token) {
          setLatestInstallToken(token);
          await handleCopy(token, "InstallToken");
        }
        toast.success(result.message ?? "Token de instalacao regenerado.");
        router.refresh();
      } catch (error) {
        toast.error(getRemoteApiErrorMessage(error));
      }
    });
  }

  function handleRequestRemoteAction(action: "REBOOTSTRAP" | "RESEND_CONFIG" | "SELF_HEAL") {
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

    if (action === "REBOOTSTRAP") {
      startRequestingRebootstrap(run);
      return;
    }

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

  return (
    <div className="space-y-6">
      <div className="flex items-center">
        <Link href="/portal/plataforma-remota" className={cn(buttonVariants({ variant: "outline" }), "h-8 gap-2 px-3")}>
          <ArrowLeft className="h-4 w-4" />
          Voltar
        </Link>
      </div>

      <Card className="border-border/50 overflow-hidden">
        <CardContent className="grid gap-5 p-5 lg:grid-cols-[1.15fr_0.85fr]">
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline" className={heartbeat.tone}>
                {heartbeat.label}
              </Badge>
              <Badge variant="outline" className="border-border/60 bg-background/70 text-foreground">
                {statusLabel}
              </Badge>
              {host.environment ? (
                <Badge variant="outline" className="border-border/60 bg-background/70 text-muted-foreground">
                  {host.environment}
                </Badge>
              ) : null}
            </div>

            <div className="space-y-2">
              <div className="flex flex-col gap-2 md:flex-row md:items-center">
                <Input
                  value={projectedHostName}
                  onChange={(event) => setProjectedHostName(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" && canSaveProjectedHostName && !isSavingMachineName) {
                      event.preventDefault();
                      handleSaveProjectedHostName();
                    }
                  }}
                  placeholder="CASA DO PRODUTOR | SERVIDOR"
                  className="h-11 text-xl font-bold tracking-tight md:text-2xl"
                />
                <Button
                  onClick={handleSaveProjectedHostName}
                  disabled={isSavingMachineName || !canSaveProjectedHostName}
                  className="w-full md:w-auto"
                >
                  Salvar nome
                </Button>
              </div>
              {canSaveProjectedHostName ? (
                <p className="text-xs text-amber-600 dark:text-amber-300">Alteracao pendente. Clique em salvar para aplicar.</p>
              ) : null}
              <p className="mt-1 text-sm text-muted-foreground">
                {installations.length
                  ? `${installations.length} instalacao(oes) | ${detectedCompanyCount} empresa(s)`
                  : "Maquina remota vinculada ao portal"}
              </p>
            </div>
            {installations.length ? (
              <div className="space-y-2">
                {installationsPreview.map((installation, installationIndex) => (
                  <div
                    key={`${installation.companyId ?? "unlinked"}::${installation.companyLabel}::${installation.path}::${installationIndex}`}
                    className="rounded-lg border border-border/50 bg-muted/15 p-3"
                  >
                    <p
                      className="truncate text-[11px] uppercase tracking-wide text-muted-foreground"
                      title={`Instalacao ${installationIndex + 1} (diretorio): ${installation.path}`}
                    >
                      Instalacao {installationIndex + 1} (diretorio empresa): {installation.path}
                    </p>
                    <p className="mt-1 text-sm font-medium text-foreground">
                      {installation.resolvedCompanyName ?? installation.companyLabel}
                    </p>
                  </div>
                ))}
                {hasMoreInstallations ? (
                  <p className="text-xs text-muted-foreground">
                    +{installations.length - installationsPreview.length} instalacao(oes). Veja todas na aba{" "}
                    <span className="font-medium text-foreground">Instalacoes</span>.
                  </p>
                ) : null}
              </div>
            ) : null}

            <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_220px]">
              <div className="rounded-xl border border-border/50 bg-muted/15 p-4">
                <p className="text-[11px] uppercase tracking-wide text-muted-foreground">RustDesk ID</p>
                <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-center">
                  <p className="min-w-0 break-all font-mono text-base font-semibold text-foreground">
                    {normalizedRustdeskId ?? "Nao configurado"}
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full gap-2 sm:w-auto"
                    onClick={() => handleCopy(normalizedRustdeskId, "RustDesk ID")}
                  >
                    <Copy className="h-4 w-4" />
                    Copiar ID
                  </Button>
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <Button onClick={handleOpenRustDesk} disabled={!rustdeskHref} className="w-full gap-2 shadow-sm">
                  <ExternalLink className="h-4 w-4" />
                  {isMobileClient ? "Abrir no app" : "Abrir acesso remoto"}
                </Button>
              </div>
            </div>

            <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
              <span className="rounded-full border border-border/50 bg-muted/15 px-3 py-1">
                Sessao: {host.openSessionCount ? `${host.openSessionCount} ativa(s)` : "Nenhuma"}
              </span>
              <span className="rounded-full border border-border/50 bg-muted/15 px-3 py-1">
                Agente: {host.agentVersion ?? "Nao registrado"}
              </span>
            </div>

          </div>

          <div className="space-y-3">
            <div className="rounded-xl border border-border/50 bg-muted/15 p-4">
              <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Ultimo contato da maquina</p>
              <p className="mt-1 text-lg font-semibold text-foreground">{formatRelativeHeartbeat(host.lastHeartbeatAt)}</p>
              <p className="mt-1 text-xs text-muted-foreground">{formatDateTime(host.lastHeartbeatAt)}</p>
              <p className="mt-3 text-sm text-muted-foreground">{heartbeat.description}</p>
              <p className="mt-2 text-sm text-muted-foreground">
                Situacao do servico remoto: <span className="font-medium text-foreground">{serviceStatus.label}</span>
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="infra" className="space-y-4">
        <div className="flex w-full md:justify-end">
          <TabsList className="grid h-auto w-full grid-cols-2 gap-1 md:w-auto md:grid-cols-3">
            <TabsTrigger value="infra">{isMobileClient ? "Acesso" : "Infra"}</TabsTrigger>
            <TabsTrigger value="instalacoes">Instalacoes</TabsTrigger>
            <TabsTrigger value="agente">Agente</TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="infra">
          <Card className="border-border/50">
            <CardHeader>
              <CardTitle className="text-lg">Infraestrutura da maquina</CardTitle>
              <CardDescription>Conexao, hardware e rede em um unico painel tecnico.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="rounded-xl border border-border/50 bg-muted/15 p-4">
                  <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Nome do computador (Windows)</p>
                  <p className="mt-1 text-sm text-foreground">{windowsComputerName ?? "Sem leitura do agente"}</p>
                </div>
                <div className="rounded-xl border border-border/50 bg-muted/15 p-4">
                  <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Versao do agente</p>
                  <p className="mt-1 text-sm text-foreground">{host.agentVersion ?? "Nao registrada"}</p>
                </div>
              </div>

              <details className="group rounded-xl border border-border/50 bg-muted/10 p-4">
                <summary className="cursor-pointer list-none text-sm font-medium text-foreground">
                  Diagnostico tecnico complementar
                </summary>
                <div className="mt-4 grid gap-3 md:grid-cols-2">
                  <div className="rounded-xl border border-border/50 bg-muted/15 p-4">
                    <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Credencial do host</p>
                    <p className="mt-1 break-all font-mono text-sm text-foreground">{host.installToken ?? "Nao configurado"}</p>
                  </div>
                  <div className="rounded-xl border border-border/50 bg-muted/15 p-4">
                    <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Ultimo heartbeat valido</p>
                    <p className="mt-1 text-sm text-foreground">{formatDateTime(host.lastHeartbeatSuccessAt)}</p>
                  </div>
                  <div className="rounded-xl border border-border/50 bg-muted/15 p-4">
                    <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Ultimo IP reportado</p>
                    <p className="mt-1 text-sm text-foreground">{host.lastKnownIp ?? "Sem leitura"}</p>
                  </div>
                  <div className="rounded-xl border border-border/50 bg-muted/15 p-4">
                    <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Provider</p>
                    <p className="mt-1 text-sm text-foreground">{host.provider ?? "Nao definido"}</p>
                  </div>
                  <div className="rounded-xl border border-border/50 bg-muted/15 p-4 md:col-span-2">
                    <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Ultimo erro do heartbeat</p>
                    <p className="mt-1 text-sm text-foreground">{host.lastHeartbeatErrorMessage ?? "Sem erro recente registrado"}</p>
                    <p className="mt-1 text-xs text-muted-foreground">{formatDateTime(host.lastHeartbeatErrorAt)}</p>
                  </div>
                </div>
              </details>

              <div className="rounded-xl border border-border/50 bg-muted/15 p-4">
                <p className="text-sm font-medium text-foreground">Hardware e conectividade reportados pelo agente</p>
                <div className="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                  <div className="rounded-xl border border-border/50 bg-background/60 p-3">
                    <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Sistema operacional</p>
                    <p className="mt-2 text-sm text-foreground">
                      {typeof systemSnapshot?.osCaption === "string" && systemSnapshot.osCaption.trim()
                        ? systemSnapshot.osCaption
                        : "Sem leitura"}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">Atualizado em {formatDateTime(details.agentTelemetry.systemSnapshotAt)}</p>
                  </div>
                  <div className="rounded-xl border border-border/50 bg-background/60 p-3">
                    <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Memoria / Disco</p>
                    <p className="mt-2 text-sm text-foreground">
                      RAM livre: {typeof systemSnapshot?.freeRamMb === "number" ? `${systemSnapshot.freeRamMb} MB` : "-"}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Disco livre C: {typeof systemSnapshot?.diskFreeGb === "number" ? `${systemSnapshot.diskFreeGb} GB` : "-"}
                    </p>
                  </div>
                  <div className="rounded-xl border border-border/50 bg-background/60 p-3">
                    <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Rede</p>
                    <p className="mt-2 text-sm text-foreground">
                      Gateway: {typeof networkSnapshot?.defaultGateway === "string" && networkSnapshot.defaultGateway.trim()
                        ? networkSnapshot.defaultGateway
                        : "Sem leitura"}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">Atualizado em {formatDateTime(details.agentTelemetry.networkSnapshotAt)}</p>
                  </div>
                  <div className="rounded-xl border border-border/50 bg-background/60 p-3">
                    <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Inventario de software</p>
                    <p className="mt-2 text-sm text-foreground">{softwareSnapshot.length} item(ns)</p>
                    <p className="mt-1 text-xs text-muted-foreground">Atualizado em {formatDateTime(details.agentTelemetry.softwareSnapshotAt)}</p>
                  </div>
                  <div className="rounded-xl border border-border/50 bg-background/60 p-3">
                    <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Hardware e discos</p>
                    <p className="mt-2 text-sm text-foreground">
                      Modelo: {typeof hardwareIdentity?.systemModel === "string" && hardwareIdentity.systemModel.trim()
                        ? hardwareIdentity.systemModel
                        : "Sem leitura"}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Volumes: {diskSnapshot.length} | Atualizado em {formatDateTime(details.agentTelemetry.diskSnapshotAt)}
                    </p>
                  </div>
                  <div className="rounded-xl border border-border/50 bg-background/60 p-3">
                    <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Saude operacional</p>
                    <p className="mt-2 text-sm text-foreground">
                      Reboot pendente: {rebootPending === null ? "Sem leitura" : rebootPending ? "Sim" : "Nao"}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Processos Syspro em alerta: {sysproProcessSnapshot.filter((entry) => entry["running"] === false).length}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Updates pendentes: {typeof windowsUpdateStatus?.["pendingCount"] === "number" ? windowsUpdateStatus["pendingCount"] : "-"}
                    </p>
                  </div>
                </div>
                <details className="mt-3 rounded-lg border border-border/40 bg-background/40 p-3">
                  <summary className="cursor-pointer text-sm font-medium text-foreground">Snapshots raw (hardware/rede/software)</summary>
                  <pre className="mt-3 overflow-x-auto whitespace-pre-wrap break-all text-xs text-muted-foreground">
                    {JSON.stringify(
                      {
                        systemSnapshot: systemSnapshot ?? { status: "Sem leitura" },
                        networkSnapshot: networkSnapshot ?? { status: "Sem leitura" },
                        softwareSnapshot: softwareSnapshot.length ? softwareSnapshot : [{ status: "Sem leitura" }],
                        hardwareIdentity: hardwareIdentity ?? { status: "Sem leitura" },
                        diskSnapshot: diskSnapshot.length ? diskSnapshot : [{ status: "Sem leitura" }],
                        sysproProcessSnapshot: sysproProcessSnapshot.length ? sysproProcessSnapshot : [{ status: "Sem leitura" }],
                        windowsUpdateStatus: windowsUpdateStatus ?? { status: "Sem leitura" },
                        rebootPending: rebootPending,
                      },
                      null,
                      2
                    )}
                  </pre>
                </details>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="instalacoes">
          <div className="space-y-4">
            <Card className="border-border/50">
              <CardHeader>
                <CardTitle className="text-lg">Instalacoes da maquina</CardTitle>
                <CardDescription>
                  Vinculo por instalacao com busca de empresa, filtro de pendencias e acoes em lote.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="rounded-xl border border-border/50 bg-muted/15 p-4">
                  <div className="grid gap-3 lg:grid-cols-[220px_minmax(0,1fr)_auto_auto] lg:items-end">
                    <div className="space-y-1">
                      <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Filtro</p>
                      <Select
                        value={installationFilter}
                        onValueChange={(value: "all" | "unlinked") => setInstallationFilter(value)}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Todas as instalacoes</SelectItem>
                          <SelectItem value="unlinked">Somente sem vinculo</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {canManageInstallations ? (
                      <div className="space-y-1">
                        <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
                          Empresa para vincular em lote
                        </p>
                        <SearchableCompanyPicker
                          value={bulkInstallationCompanyId || UNLINKED_COMPANY_VALUE}
                          options={details.companyOptions}
                          onChange={(next) =>
                            setBulkInstallationCompanyId(next === UNLINKED_COMPANY_VALUE ? "" : next)
                          }
                          disabled={isBulkRelinkingInstallations || !details.companyOptions.length}
                        />
                      </div>
                    ) : (
                      <p className="text-xs text-muted-foreground lg:pb-2">
                        Seu perfil tem acesso somente leitura para vinculacao de instalacoes.
                      </p>
                    )}

                    {canManageInstallations ? (
                      <Button
                        size="sm"
                        disabled={
                          isBulkRelinkingInstallations ||
                          !bulkInstallationCompanyId ||
                          !installationContextsForDisplay.length
                        }
                        onClick={() => handleBulkRelinkInstallations(bulkInstallationCompanyId)}
                      >
                        Vincular filtradas
                      </Button>
                    ) : null}
                    {canManageInstallations ? (
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={isBulkRelinkingInstallations || !installationContextsForDisplay.length}
                        onClick={() => handleBulkRelinkInstallations(null)}
                      >
                        Desvincular filtradas
                      </Button>
                    ) : null}
                  </div>
                  <p className="mt-3 text-xs text-muted-foreground">
                    {installationFilter === "unlinked"
                      ? `${installationContextsForDisplay.length} instalacao(oes) sem vinculo exibida(s).`
                      : `${details.installationContexts.length} instalacao(oes) detectada(s), ${unlinkedInstallationsCount} sem vinculo.`}
                  </p>
                </div>
                {installationContextsForDisplay.length ? (
                  <div className="space-y-4">
                    {installationContextsForDisplay.map((context, index) => {
                    const entry = context.update;
                    const companyContext = context.company;
                    const primaryCompanyDirectory = details.company.installationDirectory?.trim() || DEFAULT_INSTALLATION_DIRECTORY;
                    const companyName = companyContext?.nomeFantasia ?? companyContext?.razaoSocial ?? "Sem empresa vinculada";
                    const serverType = companyContext?.serverType ? COMPANY_SERVER_TYPE_LABEL[companyContext.serverType] : "Nao configurado";
                    const companyDirectory = companyContext?.installationDirectory?.trim();
                    const installationDirectory =
                      companyContext
                        ? (companyDirectory || primaryCompanyDirectory || DEFAULT_INSTALLATION_DIRECTORY)
                        : (entry.path?.trim() || DEFAULT_INSTALLATION_DIRECTORY);

                    return (
                      <div key={entry.id} className="rounded-xl border border-border/50 bg-muted/15 p-4 text-sm text-muted-foreground">
                        <p className="flex items-center gap-2 font-medium text-foreground">
                          <HardDriveDownload className="h-4 w-4 text-muted-foreground" />
                          Instalacao {index + 1}
                        </p>
                        <div className="mt-3 grid gap-3 md:grid-cols-3">
                          <div className="rounded-lg border border-border/40 bg-background/40 p-3">
                            <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Nome da empresa</p>
                            <p className="mt-1 text-sm font-medium text-foreground">{companyName}</p>
                            {!entry.companyId ? (
                              <p className="mt-1 text-xs text-amber-600 dark:text-amber-300">
                                Instalacao sem vinculo formal com empresa do cadastro.
                              </p>
                            ) : null}
                          </div>
                          <div className="rounded-lg border border-border/40 bg-background/40 p-3">
                            <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Tipo de servidor</p>
                            <p className="mt-1 text-sm text-foreground">{serverType}</p>
                          </div>
                          <div className="rounded-lg border border-border/40 bg-background/40 p-3">
                            <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
                              Caminho monitorado (diretorio empresa)
                            </p>
                            <p className="mt-1 break-all font-mono text-xs text-foreground">{installationDirectory}</p>
                          </div>
                        </div>

                        <details className="mt-3 rounded-lg border border-border/40 bg-background/40 p-3">
                          <summary className="cursor-pointer text-sm font-medium text-foreground">Informacoes do servidor</summary>
                          <div className="mt-3 grid gap-3 md:grid-cols-2">
                            <div className="rounded-lg border border-border/40 bg-background/40 p-3">
                              <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Servidor</p>
                              <p className="mt-1 text-sm text-foreground">{entry.companyId ? (companyContext?.serverHost ?? "Nao configurado") : "Sem vinculo"}</p>
                            </div>
                            <div className="rounded-lg border border-border/40 bg-background/40 p-3">
                              <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Porta</p>
                              <p className="mt-1 text-sm text-foreground">
                                {entry.companyId ? (companyContext?.serverPort ? String(companyContext.serverPort) : "Nao configurado") : "Sem vinculo"}
                              </p>
                            </div>
                            <div className="rounded-lg border border-border/40 bg-background/40 p-3">
                              <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Conexao</p>
                              <p className="mt-1 text-sm text-foreground">{entry.companyId ? (companyContext?.serverProtocol ?? "Nao configurado") : "Sem vinculo"}</p>
                            </div>
                            <div className="rounded-lg border border-border/40 bg-background/40 p-3">
                              <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Url Path (ISAPI)</p>
                              <p className="mt-1 break-all text-sm text-foreground">{entry.companyId ? (companyContext?.iisIsapiPath ?? "Nao configurado") : "Sem vinculo"}</p>
                            </div>
                          </div>
                        </details>

                        <details className="mt-3 rounded-lg border border-border/40 bg-background/40 p-3">
                          <summary className="cursor-pointer text-sm font-medium text-foreground">Observacoes</summary>
                          <div className="mt-3 rounded-lg border border-border/40 bg-background/40 p-3">
                            <p className="whitespace-pre-wrap text-sm text-foreground">
                              {entry.companyId
                                ? (companyContext?.observacoes ?? "Sem observacoes operacionais para esta empresa.")
                                : "Sem vinculo com empresa do cadastro para exibir observacoes."}
                            </p>
                          </div>
                        </details>

                        <details className="mt-3 rounded-lg border border-border/40 bg-background/40 p-3">
                          <summary className="cursor-pointer text-sm font-medium text-foreground">Conexao remota</summary>
                          <div className="mt-3 space-y-3">
                            {entry.companyId && companyContext?.remoteConnections.length ? (
                              companyContext.remoteConnections.map((connection, connectionIndex) => (
                                <div key={`${connection.type}-${connectionIndex}`} className="rounded-lg border border-border/40 bg-background/40 p-3">
                                  <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Tipo</p>
                                  <p className="mt-1 text-sm font-medium text-foreground">{REMOTE_CONNECTION_LABEL[connection.type]}</p>
                                  <p className="mt-2 text-[11px] uppercase tracking-wide text-muted-foreground">Nome/IP/identificacao</p>
                                  <p className="mt-1 break-all text-sm text-foreground">{connection.details || "Sem detalhe informado"}</p>
                                </div>
                              ))
                            ) : (
                              <div className="rounded-lg border border-dashed border-border/50 bg-background/30 p-3">
                                {entry.companyId
                                  ? "Nenhuma conexao remota cadastrada para esta empresa."
                                  : "Sem vinculo com empresa do cadastro para exibir conexoes remotas."}
                              </div>
                            )}
                          </div>
                        </details>

                        <div className="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                          <div className="rounded-lg border border-border/40 bg-background/40 p-3">
                            <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Ultima atualizacao</p>
                            <p className="mt-1 text-sm text-foreground">{formatDateTime(entry.lastFileWriteAt)}</p>
                          </div>
                          <div className="rounded-lg border border-border/40 bg-background/40 p-3">
                            <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Ultimo heartbeat</p>
                            <p className="mt-1 text-sm text-foreground">{formatDateTime(entry.lastHeartbeatAt)}</p>
                          </div>
                          <div className="rounded-lg border border-border/40 bg-background/40 p-3">
                            <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Empresa vinculada</p>
                            <p className="mt-1 text-sm text-foreground">{entry.companyId ? "Vinculada" : "Sem vinculo"}</p>
                          </div>
                        </div>

                        <div className="mt-3 rounded-lg border border-border/40 bg-background/30 p-3">
                          <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Vinculo da instalacao</p>
                          {canManageInstallations ? (
                            <div className="mt-2 grid gap-2 md:grid-cols-[minmax(0,1fr)_auto_auto] md:items-center">
                              <SearchableCompanyPicker
                                value={selectedCompanyByUpdateId[entry.id] ?? (entry.companyId ?? UNLINKED_COMPANY_VALUE)}
                                onChange={(value) =>
                                  setSelectedCompanyByUpdateId((prev) => ({
                                    ...prev,
                                    [entry.id]: value,
                                  }))
                                }
                                options={details.companyOptions}
                                disabled={isRelinkingInstallation}
                              />
                              <Button
                                size="sm"
                                disabled={isRelinkingInstallation}
                                onClick={() => {
                                  const selected =
                                    selectedCompanyByUpdateId[entry.id] ??
                                    (entry.companyId ?? UNLINKED_COMPANY_VALUE);
                                  handleRelinkInstallation(
                                    entry.id,
                                    selected === UNLINKED_COMPANY_VALUE ? null : selected
                                  );
                                }}
                              >
                                Salvar vinculo
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                disabled={isRelinkingInstallation || !entry.companyId}
                                onClick={() => {
                                  setSelectedCompanyByUpdateId((prev) => ({
                                    ...prev,
                                    [entry.id]: UNLINKED_COMPANY_VALUE,
                                  }));
                                  handleRelinkInstallation(entry.id, null);
                                }}
                              >
                                Remover vinculo
                              </Button>
                            </div>
                          ) : (
                            <p className="mt-2 text-xs text-muted-foreground">
                              Seu perfil tem acesso somente leitura para vinculacao de instalacoes.
                            </p>
                          )}
                        </div>
                      </div>
                    );
                    })}
                  </div>
                ) : (
                  <div className="rounded-xl border border-border/50 bg-muted/15 p-4 text-sm text-muted-foreground">
                    {installationFilter === "unlinked"
                      ? "Nenhuma instalacao sem vinculo encontrada para o filtro atual."
                      : "Esta maquina ainda nao enviou instalacoes no heartbeat."}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="border-border/50">
              <CardHeader>
                <CardTitle className="text-lg">Pessoas vinculadas</CardTitle>
                <CardDescription>
                  Usuarios ativos da empresa base do cadastro. Para maquinas multiempresa, a leitura principal agora esta em `Instalacoes`.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {details.linkedUsers.length ? (
                  details.linkedUsers.map((user) => (
                    <div key={user.id} className="flex items-start justify-between gap-3 rounded-xl border border-border/50 bg-muted/15 p-4">
                      <div className="space-y-1">
                        <p className="flex items-center gap-2 text-sm font-medium text-foreground">
                          <UserRound className="h-4 w-4 text-muted-foreground" />
                          {user.name ?? user.email}
                        </p>
                        <p className="text-xs text-muted-foreground">{user.email}</p>
                      </div>
                      <Badge variant="outline" className="border-border/60 bg-background/70 text-foreground">
                        {user.role}
                      </Badge>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground">Nenhum usuario ativo vinculado a esta empresa.</p>
                )}
              </CardContent>
            </Card>

            <Card className="border-border/50">
              <CardHeader>
                <CardTitle className="text-lg">Sessoes recentes</CardTitle>
                <CardDescription>Historico recente do host com contexto de ticket e status.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {details.recentSessions.length ? (
                  details.recentSessions.map((session) => (
                    <div key={session.id} className="rounded-xl border border-border/50 bg-muted/15 p-4">
                      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                        <div className="space-y-1">
                          <p className="text-sm font-medium text-foreground">{session.hostName}</p>
                          <p className="text-xs text-muted-foreground">
                            Solicitado por {session.requestedByName ?? session.requestedByUserId}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Ticket: {session.ticketNumber ? `#${session.ticketNumber}` : "Nao informado"}
                          </p>
                          <p className="text-xs text-muted-foreground">Criada em {formatDateTime(session.createdAt)}</p>
                        </div>
                        <Badge variant="outline" className="border-border/60 bg-background/70 text-foreground">
                          {session.status}
                        </Badge>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground">Nenhuma sessao registrada para este host ainda.</p>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="agente">
          <Card className="border-border/50">
            <CardHeader>
              <CardTitle className="text-lg">Fluxo operacional do agente</CardTitle>
              <CardDescription>Recorte operacional do FEAT-002 para nao depender de memoria do tecnico em campo.</CardDescription>
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
                      {agentHealthCard.erp.paths.slice(0, 2).map((path) => (
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
                    <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Ultimo discover</p>
                    <p className="mt-2 text-sm text-foreground">{formatDateTime(details.agentHealth.lastDiscoverAt)}</p>
                  </div>
                  <div className="rounded-xl border border-border/50 bg-background/60 p-3">
                    <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Ultimo sync</p>
                    <p className="mt-2 text-sm text-foreground">{formatDateTime(details.agentHealth.lastSyncAt)}</p>
                  </div>
                  <div className="rounded-xl border border-border/50 bg-background/60 p-3">
                    <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Bootstrap flow</p>
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
                    <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Estrategia do ciclo</p>
                    <p className="mt-2 text-sm text-foreground">{orchestrationStrategy}</p>
                  </div>
                  <div className="rounded-xl border border-border/50 bg-background/60 p-3">
                    <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Bootstrap 24h</p>
                    <p className="mt-2 text-sm text-foreground">
                      {bootstrapRateMetrics.ratePct === null ? "Sem leitura" : `${bootstrapRateMetrics.ratePct}%`}
                    </p>
                    {bootstrapRateMetrics.cycles !== null ? (
                      <p className="mt-1 text-xs text-muted-foreground">
                        {bootstrapRateMetrics.bootstrapCycles ?? 0}/{bootstrapRateMetrics.cycles} ciclos
                      </p>
                    ) : null}
                  </div>
                </div>

                <div className="mt-3 rounded-xl border border-border/50 bg-background/60 p-4">
                  <p className="text-sm font-medium text-foreground">Saude do contrato Agente ↔ Portal</p>
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
                <summary className="cursor-pointer text-sm font-medium text-foreground">MÃ©tricas do agente (raw)</summary>
                <pre className="mt-3 overflow-x-auto whitespace-pre-wrap break-all text-xs text-muted-foreground">
                  {JSON.stringify(agentMetrics ?? { status: "Sem leitura" }, null, 2)}
                </pre>
              </details>

              <div className="flex flex-wrap gap-2">
                <Button variant="outline" onClick={() => handleCopy(host.installToken, "Credencial do host")} className="w-full gap-2 sm:w-auto">
                  <Fingerprint className="h-4 w-4" />
                  Copiar credencial
                </Button>
                <Button
                  variant="outline"
                  onClick={handleRotateInstallToken}
                  disabled={isRotatingInstallToken}
                  className="w-full gap-2 sm:w-auto"
                >
                  <Fingerprint className="h-4 w-4" />
                  {isRotatingInstallToken ? "Gerando..." : "Regenerar installToken"}
                </Button>
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
                  onClick={() => handleRequestRemoteAction("REBOOTSTRAP")}
                  disabled={isRequestingRebootstrap}
                  className="w-full gap-2 sm:w-auto"
                >
                  <AlertTriangle className="h-4 w-4" />
                  {isRequestingRebootstrap ? "Solicitando..." : "Rebootstrap"}
                </Button>
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
                  onClick={() => handleRequestRemoteAction("SELF_HEAL")}
                  disabled={isRequestingSelfHeal}
                  className="w-full gap-2 sm:w-auto"
                >
                  <HardDriveDownload className="h-4 w-4" />
                  {isRequestingSelfHeal ? "Solicitando..." : "Pedir self-heal"}
                </Button>
              </div>

              {shouldShowDiagnosticsPlaybook ? (
                <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4">
                  <p className="text-sm font-medium text-amber-800 dark:text-amber-200">
                    Playbook automatico de diagnostico
                  </p>
                  <p className="mt-1 text-sm text-amber-800 dark:text-amber-100">
                    Estado atual do host: <span className="font-mono">{bootstrapFlowLabel}</span>. Copie o script para o suporte executar no servidor.
                  </p>
                  <pre className="mt-3 overflow-x-auto whitespace-pre-wrap break-all rounded-lg border border-amber-500/30 bg-background/60 p-3 text-xs text-foreground">
                    {diagnosticsPlaybookScript}
                  </pre>
                  <div className="mt-3">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => handleCopy(diagnosticsPlaybookScript, "Script de diagnostico")}
                    >
                      <Copy className="mr-2 h-4 w-4" />
                      Copiar script de diagnostico
                    </Button>
                  </div>
                </div>
              ) : null}

              {latestInstallToken ? (
                <div className="rounded-xl border border-amber-500/20 bg-amber-500/10 p-4">
                  <p className="text-sm font-medium text-amber-800 dark:text-amber-200">
                    Novo installToken gerado para este host
                  </p>
                  <p className="mt-2 break-all font-mono text-xs text-amber-800 dark:text-amber-100">
                    {latestInstallToken}
                  </p>
                  <div className="mt-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => handleCopy(latestInstallToken, "InstallToken")}
                    >
                      <Copy className="mr-2 h-4 w-4" />
                      Copiar installToken
                    </Button>
                  </div>
                </div>
              ) : null}

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
                  Compliance e convergencia do cliente
                </summary>
                <div className="mt-4 rounded-xl border border-border/50 bg-muted/15 p-4">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm font-medium text-foreground">Compliance do cliente RustDesk</p>
                    <p className="text-sm text-muted-foreground">
                      O portal compara o que espera do cliente com o que o agente reportou no ultimo `sync`.
                    </p>
                  </div>
                  <Badge variant="outline" className="w-fit border-border/60 bg-background/70 text-muted-foreground">
                    Ultima sync: {formatDateTime(rustDeskCompliance.lastSyncAt)}
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

              <details className="group rounded-xl border border-border/50 bg-muted/10 p-4">
                <summary className="cursor-pointer list-none text-sm font-medium text-foreground">
                  Fila de acoes e telemetria de execucao
                </summary>
                <div className="mt-4 rounded-xl border border-border/50 bg-muted/15 p-4">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm font-medium text-foreground">Fila de acoes do agente</p>
                    <p className="text-sm text-muted-foreground">
                      Comandos pendentes calculados a partir da divergencia entre o portal e o cliente RustDesk.
                    </p>
                  </div>
                  <Badge variant="outline" className="w-fit border-border/60 bg-background/70 text-muted-foreground">
                    {details.agentCommands.length} item(ns)
                  </Badge>
                </div>

                {details.agentCommands.length ? (
                  <div className="mt-4 grid gap-3 md:grid-cols-2">
                    {details.agentCommands.map((command) => {
                      const structuredReasonCode = extractStringFromPayload(command.resultPayload, ["reasonCode", "reason_code"]);
                      return (
                        <div key={command.id} className="rounded-xl border border-border/50 bg-background/60 p-4">
                          <div className="flex items-center justify-between gap-3">
                            <p className="text-sm font-medium text-foreground">{AGENT_COMMAND_LABEL[command.type]}</p>
                            <Badge variant="outline" className="border-amber-500/20 bg-amber-500/10 text-amber-700 dark:text-amber-300">
                              {command.status}
                            </Badge>
                          </div>
                          <p className="mt-2 text-sm text-muted-foreground">
                            {command.reason ?? "Sem justificativa adicional registrada."}
                          </p>
                          {structuredReasonCode ? (
                            <p className="mt-1 text-xs text-muted-foreground">
                              reasonCode: <span className="font-mono text-foreground">{structuredReasonCode}</span>
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
                    Nenhuma acao pendente. O cliente reportado esta aderente ao que o portal espera neste momento.
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
                    <p className="text-sm text-muted-foreground">
                      Linha temporal por comando com criacao, entrega, execucao, falha e duracao.
                    </p>
                  </div>
                  <Badge variant="outline" className="w-fit border-border/60 bg-background/70 text-muted-foreground">
                    {details.commandTimeline.length} evento(s)
                  </Badge>
                </div>

                {details.commandTimeline.length ? (
                  <div className="mt-4 space-y-2">
                    {details.commandTimeline.map((entry) => (
                      <div key={entry.id} className="rounded-xl border border-border/50 bg-background/60 p-3">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <p className="text-sm font-medium text-foreground">{AGENT_COMMAND_LABEL[entry.type]}</p>
                          <Badge variant="outline" className="border-border/60 bg-background/70 text-foreground">
                            {entry.status}
                          </Badge>
                        </div>
                        <p className="mt-2 text-xs text-muted-foreground">
                          criado: {formatDateTime(entry.createdAt)}
                          {entry.deliveredAt ? ` | entregue: ${formatDateTime(entry.deliveredAt)}` : ""}
                          {entry.executedAt ? ` | executado: ${formatDateTime(entry.executedAt)}` : ""}
                          {entry.failedAt ? ` | falhou: ${formatDateTime(entry.failedAt)}` : ""}
                          {entry.durationSeconds !== null ? ` | duracao: ${entry.durationSeconds}s` : ""}
                        </p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="mt-4 text-sm text-muted-foreground">Sem eventos recentes para timeline deste host.</p>
                )}
                </div>
              </details>

              <details className="group rounded-xl border border-border/50 bg-muted/10 p-4">
                <summary className="cursor-pointer list-none text-sm font-medium text-foreground">
                  Guia tecnico e checklist de campo
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

                <div className="mt-3 rounded-xl border border-border/50 bg-muted/15 p-4 text-sm text-muted-foreground">
                  <p>1. Execute a Vinculacao de Maquina autenticada para este host.</p>
                  <p>2. Confirme o RustDesk ID devolvido pela maquina do cliente.</p>
                  <p>3. A Vinculacao de Maquina emite a credencial operacional e o heartbeat continuo passa a usar essa credencial.</p>
                  <p>4. Se a credencial for renovada ou expirar, execute a Vinculacao de Maquina novamente neste host.</p>
                  <p>5. A descoberta e apenas etapa de triagem e nao reativa heartbeat autenticado em host ja vinculado.</p>
                  <p>6. Se o heartbeat nao vier, valide conectividade, tarefa do agente e URL do portal.</p>
                  {isMobileClient ? <p>7. No celular, prefira `Abrir no app` e mantenha o `RustDesk ID` como fallback manual.</p> : null}
                </div>
              </details>
            </CardContent>
          </Card>
        </TabsContent>

      </Tabs>
    </div>
  );
}


