"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, useTransition } from "react";
import {
  ArrowLeft,
  Copy,
  ExternalLink,
  Fingerprint,
  HardDriveDownload,
  UserRound,
} from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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

const COMPANY_SERVER_TYPE_LABEL: Record<"SYSPRO_SERVER" | "IIS", string> = {
  SYSPRO_SERVER: "Syspro Server",
  IIS: "IIS",
};

const REMOTE_CONNECTION_LABEL: Record<"DDNS_NOIP" | "RADMIN_VPN", string> = {
  DDNS_NOIP: "DDNS (NoIP)",
  RADMIN_VPN: "Radmin VPN",
};
const DEFAULT_INSTALLATION_DIRECTORY = "C:\\Syspro\\Server\\SysproServer.exe";

type CompanyContextDraft = {
  serverType: string;
  installationDirectory: string;
  serverHost: string;
  serverPort: string;
  serverProtocol: string;
  iisIsapiPath: string;
  observacoes: string;
};

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
      description: "A credencial do agente expirou por politica do portal. Execute a vinculacao de maquina novamente neste host.",
      needsBootstrap: true,
    };
  }

  if (normalized.includes("agenttoken invalido")) {
    return {
      label: "Credencial invalida",
      tone: "border-red-500/20 bg-red-500/10 text-red-700 dark:text-red-300",
      description: "O heartbeat foi recusado. Execute a vinculacao de maquina novamente neste host para emitir nova credencial.",
      needsBootstrap: true,
    };
  }

  if (normalized.includes("agenttoken rotacionado")) {
    return {
      label: "Credencial renovada",
      tone: "border-amber-500/20 bg-amber-500/10 text-amber-700 dark:text-amber-300",
      description: "A credencial anterior foi invalidada pelo portal. O host precisa de nova vinculacao de maquina.",
      needsBootstrap: true,
    };
  }

  if (normalized.includes("agenttoken indisponivel")) {
    return {
      label: "Credencial ausente",
      tone: "border-amber-500/20 bg-amber-500/10 text-amber-700 dark:text-amber-300",
      description: "O heartbeat local nao encontrou a credencial do agente. Reexecute a vinculacao de maquina autenticada neste host.",
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

export function RemoteHostDetailsPanel({ details }: { details: RemoteHostDetails }) {
  const { host } = details;
  const [projectedHostName, setProjectedHostName] = useState(host.name);
  const [pendingUpdateCompanyById, setPendingUpdateCompanyById] = useState<Record<string, string>>({});
  const [companyContextDrafts, setCompanyContextDrafts] = useState<Record<string, CompanyContextDraft>>({});
  const [savingCompanyContextId, setSavingCompanyContextId] = useState<string | null>(null);
  const [isMobileClient, setIsMobileClient] = useState(false);
  const [isSavingMachineName, startSavingMachineName] = useTransition();
  const [isRevokingAgentToken, startRevokingAgentToken] = useTransition();
  const [linkingUpdateId, startLinkingUpdateId] = useTransition();
  const normalizedRustdeskId = host.rustdeskId ? host.rustdeskId.replace(/\s+/g, "") : null;
  const windowsComputerName = host.machineName ?? host.agent.machineName ?? null;
  const rustdeskHref = normalizedRustdeskId ? `rustdesk://${normalizedRustdeskId}` : null;
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
    const items = details.installationContexts
      .map((context) => {
        const entry = context.update;
        const companyContext = context.company;
        const companyDirectory = companyContext?.installationDirectory?.trim();
        const displayDirectory = companyDirectory || entry.path;
        const key = `${entry.companyLabel}::${displayDirectory}`.toLowerCase();
        if (seen.has(key)) return null;
        seen.add(key);
        return {
          companyId: entry.companyId,
          resolvedCompanyName: entry.resolvedCompanyName,
          companyLabel: entry.companyLabel,
          path: displayDirectory,
          directorySource: companyDirectory ? "company" : "agent",
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
          directorySource: "company" | "agent";
        } => !!entry
      );

    return items;
  }, [details.installationContexts]);
  const installationsPreview = useMemo(() => installations.slice(0, 2), [installations]);
  const hasMoreInstallations = installations.length > installationsPreview.length;
  const companyOptionLabelCount = useMemo(() => {
    return details.companyOptions.reduce<Record<string, number>>((acc, option) => {
      acc[option.label] = (acc[option.label] ?? 0) + 1;
      return acc;
    }, {});
  }, [details.companyOptions]);

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
    setCompanyContextDrafts((current) => {
      const next = { ...current };
      for (const context of details.installationContexts) {
        if (!context.company) continue;
        const companyId = context.company.id;
        if (next[companyId]) continue;
        next[companyId] = {
          serverType: context.company.serverType ?? "SYSPRO_SERVER",
          installationDirectory: context.company.installationDirectory ?? DEFAULT_INSTALLATION_DIRECTORY,
          serverHost: context.company.serverHost ?? "localhost",
          serverPort: context.company.serverPort ? String(context.company.serverPort) : "",
          serverProtocol: context.company.serverProtocol ?? "HTTP",
          iisIsapiPath: context.company.iisIsapiPath ?? "",
          observacoes: context.company.observacoes ?? "",
        };
      }
      return next;
    });
  }, [details.installationContexts]);

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
    startSavingMachineName(async () => {
      try {
        await requestRemoteMutation({
          url: `/api/remote/hosts/${host.id}`,
          method: "PATCH",
          body: {
            companyId: host.companyId,
            name: projectedHostName,
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
        const result = await requestRemoteMutation<{ message?: string }>({
          url: `/api/remote/hosts/${host.id}/agent-token`,
          method: "POST",
        });
        toast.success(result.message ?? "Credencial renovada.");
        window.location.reload();
      } catch (error) {
        toast.error(getRemoteApiErrorMessage(error));
      }
    });
  }

  function handleCompanyContextDraftChange(
    companyId: string,
    field: keyof CompanyContextDraft,
    value: string
  ) {
    setCompanyContextDrafts((current) => {
      const previous = current[companyId] ?? {
        serverType: "SYSPRO_SERVER",
        installationDirectory: DEFAULT_INSTALLATION_DIRECTORY,
        serverHost: "localhost",
        serverPort: "",
        serverProtocol: "HTTP",
        iisIsapiPath: "",
        observacoes: "",
      };
      return {
        ...current,
        [companyId]: {
          ...previous,
          [field]: value,
        },
      };
    });
  }

  async function handleSaveCompanyContextByInstallation(companyId: string) {
    const draft = companyContextDrafts[companyId];
    if (!draft) {
      toast.error("Configuracao da empresa nao carregada.");
      return;
    }

    try {
      setSavingCompanyContextId(companyId);
      await requestRemoteMutation({
        url: `/api/remote/companies/${companyId}/context`,
        method: "PATCH",
        body: {
          serverType: draft.serverType === "IIS" ? "IIS" : "SYSPRO_SERVER",
          installationDirectory: draft.installationDirectory.trim() || DEFAULT_INSTALLATION_DIRECTORY,
          serverHost: draft.serverHost,
          serverPort: draft.serverPort,
          serverProtocol: draft.serverProtocol === "HTTPS" ? "HTTPS" : "HTTP",
          iisIsapiPath: draft.iisIsapiPath,
          observacoes: draft.observacoes,
        },
      });

      toast.success("Configuracoes da empresa atualizadas.");
      window.location.reload();
    } catch (error) {
      toast.error(getRemoteApiErrorMessage(error));
    } finally {
      setSavingCompanyContextId(null);
    }
  }

  function handleRelinkInstallation(updateId: string) {
    startLinkingUpdateId(async () => {
      try {
        await requestRemoteMutation({
          url: `/api/remote/hosts/${host.id}/syspro-updates/${updateId}`,
          method: "PATCH",
          body: {
            companyId: pendingUpdateCompanyById[updateId] || null,
          },
        });

        toast.success("Empresa vinculada na instalacao monitorada.");
        window.location.reload();
      } catch (error) {
        toast.error(getRemoteApiErrorMessage(error));
      }
    });
  }

  function handleAddCompanyToInstallation(updateId: string) {
    startLinkingUpdateId(async () => {
      try {
        await requestRemoteMutation({
          url: `/api/remote/hosts/${host.id}/syspro-updates/${updateId}`,
          method: "PATCH",
          body: {
            companyId: pendingUpdateCompanyById[updateId] || null,
            mode: "add",
          },
        });

        toast.success("Empresa adicional vinculada a esta instalacao.");
        window.location.reload();
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

            <div>
              <h1 className="text-2xl font-bold tracking-tight text-foreground">{projectedHostName}</h1>
              <p className="mt-1 text-sm text-muted-foreground">
                {installations.length
                  ? `${installations.length} instalacoes vinculadas nesta maquina`
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
                      Instalacao {installationIndex + 1} (diretorio {installation.directorySource === "company" ? "empresa" : "agente"}): {installation.path}
                    </p>
                    <p className="mt-1 text-sm font-medium text-foreground">
                      {installation.resolvedCompanyName ?? installation.companyLabel}
                    </p>
                  </div>
                ))}
                {hasMoreInstallations ? (
                  <p className="text-xs text-muted-foreground">
                    +{installations.length - installationsPreview.length} instalacao(oes). Veja todas na aba{" "}
                    <span className="font-medium text-foreground">Empresa</span>.
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

            <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_180px]">
              <div className="space-y-2">
                <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Nome da maquina (projetado)</p>
                <Input value={projectedHostName} onChange={(event) => setProjectedHostName(event.target.value)} placeholder="CASA DO PRODUTOR | SERVIDOR" />
                <p className="text-xs text-muted-foreground">
                  Nome exibido no portal, editavel para organizacao operacional.
                </p>
              </div>
              <div className="flex items-end">
                <Button
                  className="w-full lg:w-auto"
                  onClick={handleSaveProjectedHostName}
                  disabled={isSavingMachineName || projectedHostName.trim() === host.name.trim()}
                >
                  Salvar nome
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

      <Tabs defaultValue="conexao" className="space-y-4">
        <TabsList className="grid h-auto w-full grid-cols-2 gap-1 md:grid-cols-4">
          <TabsTrigger value="conexao">{isMobileClient ? "Acesso" : "Conexao"}</TabsTrigger>
          <TabsTrigger value="contexto">Empresa</TabsTrigger>
          <TabsTrigger value="agente">Agente</TabsTrigger>
          <TabsTrigger value="clientes">{isMobileClient ? "Pessoas" : "Clientes"}</TabsTrigger>
        </TabsList>

        <TabsContent value="conexao">
          <Card className="border-border/50">
            <CardHeader>
              <CardTitle className="text-lg">Conexao da maquina</CardTitle>
              <CardDescription>Somente sinais operacionais essenciais. Detalhes tecnicos ficam no diagnostico.</CardDescription>
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
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="contexto">
          <Card className="border-border/50">
            <CardHeader>
              <CardTitle className="text-lg">Empresa e instalacoes da maquina</CardTitle>
              <CardDescription>Dados operacionais por instalacao, com o diretorio da instalacao como fonte unica do caminho monitorado.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-3 md:grid-cols-2">
                <div className="rounded-xl border border-border/50 bg-muted/15 p-4">
                  <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Empresa principal</p>
                  <p className="mt-1 text-sm font-medium text-foreground">{details.company.nomeFantasia ?? details.company.razaoSocial}</p>
                </div>
                <div className="rounded-xl border border-border/50 bg-muted/15 p-4">
                  <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Host / Instalacoes detectadas</p>
                  <p className="mt-1 text-sm font-medium text-foreground">{host.name}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{details.installationContexts.length} instalacao(oes)</p>
                </div>
              </div>

              {details.installationContexts.length ? (
                <div className="space-y-4">
                  {details.installationContexts.map((context, index) => {
                    const entry = context.update;
                    const companyContext = context.company;
                    const companyName = companyContext?.nomeFantasia ?? companyContext?.razaoSocial ?? entry.resolvedCompanyName ?? entry.companyLabel;
                    const serverType = companyContext?.serverType ? COMPANY_SERVER_TYPE_LABEL[companyContext.serverType] : "Nao configurado";
                    const draft = companyContext ? companyContextDrafts[companyContext.id] : null;
                    const draftDirectory = draft?.installationDirectory?.trim();
                    const companyDirectory = companyContext?.installationDirectory?.trim();
                    const agentDirectory = entry.path?.trim();
                    const installationDirectory =
                      draftDirectory ||
                      companyDirectory ||
                      agentDirectory ||
                      DEFAULT_INSTALLATION_DIRECTORY;
                    const installationDirectorySource =
                      draftDirectory || companyDirectory
                        ? "empresa"
                        : agentDirectory
                        ? "agente"
                        : "padrao";

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
                          </div>
                          <div className="rounded-lg border border-border/40 bg-background/40 p-3">
                            <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Tipo de servidor</p>
                            <p className="mt-1 text-sm text-foreground">{serverType}</p>
                          </div>
                          <div className="rounded-lg border border-border/40 bg-background/40 p-3">
                            <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
                              Caminho monitorado (diretorio {installationDirectorySource})
                            </p>
                            <p className="mt-1 break-all font-mono text-xs text-foreground">{installationDirectory}</p>
                          </div>
                        </div>

                        <details className="mt-3 rounded-lg border border-border/40 bg-background/40 p-3">
                          <summary className="cursor-pointer text-sm font-medium text-foreground">Informacoes do servidor</summary>
                          <div className="mt-3 grid gap-3 md:grid-cols-2">
                            <div className="rounded-lg border border-border/40 bg-background/40 p-3">
                              <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Tipo de servidor</p>
                              {companyContext && details.permissions.canEditCompanyContext ? (
                                <select
                                  value={draft?.serverType ?? (companyContext.serverType ?? "SYSPRO_SERVER")}
                                  onChange={(event) =>
                                    handleCompanyContextDraftChange(
                                      companyContext.id,
                                      "serverType",
                                      event.target.value
                                    )
                                  }
                                  className="mt-1 h-10 w-full rounded-md border border-border bg-background px-3 text-sm"
                                >
                                  <option value="SYSPRO_SERVER">Syspro Server</option>
                                  <option value="IIS">IIS</option>
                                </select>
                              ) : (
                                <p className="mt-1 text-sm text-foreground">{serverType}</p>
                              )}
                            </div>
                            <div className="rounded-lg border border-border/40 bg-background/40 p-3">
                              <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Diretorio da instalacao (fonte de verdade)</p>
                              {companyContext && details.permissions.canEditCompanyContext ? (
                                <Input
                                  value={draft?.installationDirectory ?? companyContext.installationDirectory ?? entry.path ?? DEFAULT_INSTALLATION_DIRECTORY}
                                  onChange={(event) =>
                                    handleCompanyContextDraftChange(
                                      companyContext.id,
                                      "installationDirectory",
                                      event.target.value
                                    )
                                  }
                                />
                              ) : (
                                <p className="mt-1 break-all font-mono text-xs text-foreground">{installationDirectory}</p>
                              )}
                              <p className="mt-2 text-xs text-muted-foreground">
                                Padrao recomendado: <span className="font-mono">{DEFAULT_INSTALLATION_DIRECTORY}</span>
                              </p>
                            </div>
                            <div className="rounded-lg border border-border/40 bg-background/40 p-3">
                              <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Servidor</p>
                              {companyContext && details.permissions.canEditCompanyContext ? (
                                <Input
                                  value={draft?.serverHost ?? companyContext.serverHost ?? "localhost"}
                                  onChange={(event) =>
                                    handleCompanyContextDraftChange(companyContext.id, "serverHost", event.target.value)
                                  }
                                />
                              ) : (
                                <p className="mt-1 text-sm text-foreground">{companyContext?.serverHost ?? "Nao configurado"}</p>
                              )}
                            </div>
                            <div className="rounded-lg border border-border/40 bg-background/40 p-3">
                              <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Porta</p>
                              {companyContext && details.permissions.canEditCompanyContext ? (
                                <Input
                                  value={draft?.serverPort ?? (companyContext.serverPort ? String(companyContext.serverPort) : "")}
                                  onChange={(event) =>
                                    handleCompanyContextDraftChange(companyContext.id, "serverPort", event.target.value)
                                  }
                                />
                              ) : (
                                <p className="mt-1 text-sm text-foreground">
                                  {companyContext?.serverPort ? String(companyContext.serverPort) : "Nao configurado"}
                                </p>
                              )}
                            </div>
                            <div className="rounded-lg border border-border/40 bg-background/40 p-3">
                              <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Conexao</p>
                              {companyContext && details.permissions.canEditCompanyContext ? (
                                <select
                                  value={draft?.serverProtocol ?? (companyContext.serverProtocol ?? "HTTP")}
                                  onChange={(event) =>
                                    handleCompanyContextDraftChange(
                                      companyContext.id,
                                      "serverProtocol",
                                      event.target.value
                                    )
                                  }
                                  className="mt-1 h-10 w-full rounded-md border border-border bg-background px-3 text-sm"
                                >
                                  <option value="HTTP">HTTP</option>
                                  <option value="HTTPS">HTTPS</option>
                                </select>
                              ) : (
                                <p className="mt-1 text-sm text-foreground">{companyContext?.serverProtocol ?? "Nao configurado"}</p>
                              )}
                            </div>
                            <div className="rounded-lg border border-border/40 bg-background/40 p-3">
                              <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Url Path (ISAPI)</p>
                              {companyContext && details.permissions.canEditCompanyContext ? (
                                <Input
                                  value={draft?.iisIsapiPath ?? (companyContext.iisIsapiPath ?? "")}
                                  onChange={(event) =>
                                    handleCompanyContextDraftChange(companyContext.id, "iisIsapiPath", event.target.value)
                                  }
                                />
                              ) : (
                                <p className="mt-1 break-all text-sm text-foreground">{companyContext?.iisIsapiPath ?? "Nao configurado"}</p>
                              )}
                            </div>
                          </div>
                        </details>

                        <details className="mt-3 rounded-lg border border-border/40 bg-background/40 p-3">
                          <summary className="cursor-pointer text-sm font-medium text-foreground">Observacoes</summary>
                          <div className="mt-3 rounded-lg border border-border/40 bg-background/40 p-3">
                            {companyContext && details.permissions.canEditCompanyContext ? (
                              <Textarea
                                rows={4}
                                value={draft?.observacoes ?? (companyContext.observacoes ?? "")}
                                onChange={(event) =>
                                  handleCompanyContextDraftChange(companyContext.id, "observacoes", event.target.value)
                                }
                                placeholder="Observacoes operacionais da empresa."
                              />
                            ) : (
                              <p className="whitespace-pre-wrap text-sm text-foreground">
                                {companyContext?.observacoes ?? "Sem observacoes operacionais para esta empresa."}
                              </p>
                            )}
                          </div>
                          {companyContext && details.permissions.canEditCompanyContext ? (
                            <div className="mt-3 flex justify-end">
                              <Button
                                onClick={() => handleSaveCompanyContextByInstallation(companyContext.id)}
                                disabled={savingCompanyContextId === companyContext.id}
                              >
                                {savingCompanyContextId === companyContext.id ? "Salvando..." : "Salvar configuracoes da empresa"}
                              </Button>
                            </div>
                          ) : null}
                        </details>

                        <details className="mt-3 rounded-lg border border-border/40 bg-background/40 p-3">
                          <summary className="cursor-pointer text-sm font-medium text-foreground">Conexao remota</summary>
                          <div className="mt-3 space-y-3">
                            {companyContext?.remoteConnections.length ? (
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
                                Nenhuma conexao remota cadastrada para esta empresa.
                              </div>
                            )}
                          </div>
                        </details>

                        <div className="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                            <div className="rounded-lg border border-border/40 bg-background/40 p-3">
                              <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
                                Caminho monitorado (diretorio {installationDirectorySource})
                              </p>
                              <p className="mt-1 break-all font-mono text-xs text-foreground">{installationDirectory}</p>
                            </div>
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

                        {details.permissions.canRelinkInstallations ? (
                          <div className="mt-4 grid gap-3 lg:grid-cols-[minmax(0,1fr)_180px_180px]">
                            <select
                              value={pendingUpdateCompanyById[entry.id] ?? entry.companyId ?? details.company.id}
                              onChange={(event) =>
                                setPendingUpdateCompanyById((current) => ({ ...current, [entry.id]: event.target.value }))
                              }
                              className="h-10 rounded-md border border-border bg-background px-3 text-sm"
                            >
                              {details.companyOptions.map((company) => (
                                <option key={company.id} value={company.id}>
                                  {companyOptionLabelCount[company.label] > 1
                                    ? `${company.label} (${company.id.slice(0, 8)})`
                                    : company.label}
                                </option>
                              ))}
                            </select>
                            <Button className="w-full lg:w-auto" onClick={() => handleRelinkInstallation(entry.id)} disabled={linkingUpdateId}>
                              Trocar empresa
                            </Button>
                            <Button
                              variant="outline"
                              className="w-full lg:w-auto"
                              onClick={() => handleAddCompanyToInstallation(entry.id)}
                              disabled={linkingUpdateId}
                            >
                              Adicionar empresa
                            </Button>
                          </div>
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="rounded-xl border border-border/50 bg-muted/15 p-4 text-sm text-muted-foreground">
                  Esta maquina ainda nao enviou instalacoes no heartbeat.
                </div>
              )}
            </CardContent>
          </Card>
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
                    ? "Este host precisa de nova vinculacao de maquina autenticada"
                    : "Este host esta no fluxo autenticado por credencial"}
                </p>
                <p className="mt-1">
                  {agentTokenMeta.needsBootstrap
                    ? "Execute novamente a vinculacao de maquina autenticada neste host e aguarde o proximo heartbeat valido."
                    : "Se precisar reinstalar ou reaplicar configuracao, siga o fluxo de vinculacao de maquina autenticada no agente."}
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                <Button variant="outline" onClick={() => handleCopy(host.installToken, "Credencial do host")} className="w-full gap-2 sm:w-auto">
                  <Fingerprint className="h-4 w-4" />
                  Copiar credencial
                </Button>
                <Button variant="outline" onClick={() => handleCopy(normalizedRustdeskId, "RustDesk ID")} className="w-full gap-2 sm:w-auto">
                  <Copy className="h-4 w-4" />
                  Copiar RustDesk ID
                </Button>
                {!agentTokenMeta.needsBootstrap ? (
                  <Button variant="outline" onClick={handleRotateAgentToken} disabled={isRevokingAgentToken} className="w-full gap-2 sm:w-auto">
                    <Fingerprint className="h-4 w-4" />
                    {isRevokingAgentToken ? "Renovando..." : "Renovar credencial"}
                  </Button>
                ) : (
                  <div className="w-full rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-700 dark:text-amber-300 sm:w-auto">
                    Nova vinculacao da maquina pendente
                  </div>
                )}
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
                    {details.agentCommands.map((command) => (
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
                    ))}
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
                <div className="mt-4 grid gap-3 md:grid-cols-3">
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
                  <p>1. Execute a vinculacao de maquina autenticada para este host.</p>
                  <p>2. Confirme o RustDesk ID devolvido pela maquina do cliente.</p>
                  <p>3. A vinculacao de maquina emite a credencial operacional e o heartbeat continuo passa a usar essa credencial.</p>
                  <p>4. Se a credencial for renovada ou expirar, execute a vinculacao de maquina novamente neste host.</p>
                  <p>5. A descoberta e apenas etapa de triagem e nao reativa heartbeat autenticado em host ja vinculado.</p>
                  <p>6. Se o heartbeat nao vier, valide conectividade, tarefa do agente e URL do portal.</p>
                  {isMobileClient ? <p>7. No celular, prefira `Abrir no app` e mantenha o `RustDesk ID` como fallback manual.</p> : null}
                </div>
              </details>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="clientes">
          <Card className="border-border/50">
            <CardHeader>
              <CardTitle className="text-lg">Pessoas vinculadas</CardTitle>
              <CardDescription>
                Usuarios ativos da empresa base do cadastro. Para maquinas multiempresa, a leitura principal agora esta em `Contexto`.
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
        </TabsContent>
      </Tabs>

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
  );
}
