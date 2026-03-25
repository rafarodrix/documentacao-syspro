"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, useTransition } from "react";
import {
  ArrowLeft,
  Copy,
  ExternalLink,
  Fingerprint,
  HardDriveDownload,
  TimerReset,
  UserRound,
  Wrench,
} from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import type { RemoteHostDetails } from "@/features/remote/domain/model";

function formatDateTime(value: string | null) {
  if (!value) return "Sem registro";
  return new Date(value).toLocaleString("pt-BR");
}

function formatRelativeHeartbeat(value: string | null) {
  if (!value) return "Sem heartbeat";

  const diffMinutes = Math.floor((Date.now() - new Date(value).getTime()) / 60000);
  if (diffMinutes < 1) return "Agora";
  if (diffMinutes < 60) return `${diffMinutes} min atras`;

  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours}h atras`;

  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays}d atras`;
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

function getAgentTokenMeta(value: string | null) {
  const normalized = value?.toLowerCase() ?? "";

  if (normalized.includes("agenttoken invalido") || normalized.includes("agenttoken expirado")) {
    return {
      label: "agentToken invalido",
      tone: "border-red-500/20 bg-red-500/10 text-red-700 dark:text-red-300",
      description: "O heartbeat foi recusado. Execute o bootstrap novamente neste host para emitir nova credencial.",
      needsBootstrap: true,
    };
  }

  if (normalized.includes("agenttoken rotacionado")) {
    return {
      label: "agentToken rotacionado",
      tone: "border-amber-500/20 bg-amber-500/10 text-amber-700 dark:text-amber-300",
      description: "A credencial anterior foi invalidada pelo portal. O host precisa de novo bootstrap.",
      needsBootstrap: true,
    };
  }

  if (normalized.includes("agenttoken indisponivel")) {
    return {
      label: "agentToken ausente",
      tone: "border-amber-500/20 bg-amber-500/10 text-amber-700 dark:text-amber-300",
      description: "O heartbeat local nao encontrou a credencial do agente. Reexecute o instalador deste host.",
      needsBootstrap: true,
    };
  }

  return {
    label: "agentToken valido",
    tone: "border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
    description: "O host possui credencial operacional para heartbeat recorrente.",
    needsBootstrap: false,
  };
}

function hasNumericRustDeskId(value: string | null) {
  return !!value && /^\d{7,12}$/.test(value.replace(/\s+/g, ""));
}

function getOperationalMeta(input: { rustdeskId: string | null; lastHeartbeatAt: string | null; needsBootstrap: boolean }) {
  const heartbeatMs = input.lastHeartbeatAt ? Date.now() - new Date(input.lastHeartbeatAt).getTime() : Number.POSITIVE_INFINITY;
  const heartbeatRecent = heartbeatMs <= 10 * 60 * 1000;
  const hasValidId = hasNumericRustDeskId(input.rustdeskId);

  if (heartbeatRecent && hasValidId && !input.needsBootstrap) {
    return {
      label: "Host operacional",
      description: "Heartbeat recente, ID valido e credencial operacional liberada.",
      tone: "border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
    };
  }

  return {
    label: "Host exige revisao",
    description: "Valide ID, heartbeat ou bootstrap antes de tratar este host como pronto para acesso.",
    tone: "border-amber-500/20 bg-amber-500/10 text-amber-700 dark:text-amber-300",
  };
}

function getHeartbeatOperationalMeta(value: string | null) {
  if (!value) {
    return {
      label: "Heartbeat pendente",
      description: "O portal ainda nao recebeu sucesso operacional do agente.",
      tone: "border-red-500/20 bg-red-500/10 text-red-700 dark:text-red-300",
    };
  }

  const diffMs = Date.now() - new Date(value).getTime();
  if (diffMs <= 10 * 60 * 1000) {
    return {
      label: "Heartbeat ativo",
      description: "O agente segue reportando atividade recente ao portal.",
      tone: "border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
    };
  }

  return {
    label: "Heartbeat degradado",
    description: "Existe historico de sucesso, mas a leitura recente ja pede verificacao.",
    tone: "border-amber-500/20 bg-amber-500/10 text-amber-700 dark:text-amber-300",
  };
}

function getBootstrapMeta(input: { lastRegisterAt: string | null; needsBootstrap: boolean }) {
  if (input.lastRegisterAt && !input.needsBootstrap) {
    return {
      label: "Bootstrap concluido",
      description: "O host ja concluiu bootstrap e pode seguir operando com a credencial atual.",
      tone: "border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
    };
  }

  if (input.lastRegisterAt) {
    return {
      label: "Bootstrap expirado",
      description: "O host ja foi registrado antes, mas agora precisa de novo bootstrap.",
      tone: "border-amber-500/20 bg-amber-500/10 text-amber-700 dark:text-amber-300",
    };
  }

  return {
    label: "Bootstrap pendente",
    description: "O host ainda nao concluiu um bootstrap valido neste portal.",
    tone: "border-red-500/20 bg-red-500/10 text-red-700 dark:text-red-300",
  };
}

export function RemoteHostDetailsPanel({ details }: { details: RemoteHostDetails }) {
  const { host } = details;
  const [machineName, setMachineName] = useState(host.machineName ?? "");
  const [isMobileClient, setIsMobileClient] = useState(false);
  const [isSavingMachineName, startSavingMachineName] = useTransition();
  const [isRevokingAgentToken, startRevokingAgentToken] = useTransition();
  const normalizedRustdeskId = host.rustdeskId ? host.rustdeskId.replace(/\s+/g, "") : null;
  const rustdeskHref = normalizedRustdeskId ? `rustdesk://${normalizedRustdeskId}` : null;
  const statusLabel = host.status === "ACTIVE" ? "Ativo" : host.status === "MAINTENANCE" ? "Manutencao" : "Inativo";
  const serviceStatus = getServiceStatusMeta(host.serviceStatus);
  const agentTokenMeta = useMemo(() => getAgentTokenMeta(host.lastHeartbeatErrorMessage), [host.lastHeartbeatErrorMessage]);
  const operationalMeta = useMemo(
    () =>
      getOperationalMeta({
        rustdeskId: host.rustdeskId,
        lastHeartbeatAt: host.lastHeartbeatAt,
        needsBootstrap: agentTokenMeta.needsBootstrap,
      }),
    [agentTokenMeta.needsBootstrap, host.lastHeartbeatAt, host.rustdeskId]
  );
  const heartbeatOperationalMeta = useMemo(() => getHeartbeatOperationalMeta(host.lastHeartbeatSuccessAt), [host.lastHeartbeatSuccessAt]);
  const bootstrapMeta = useMemo(
    () => getBootstrapMeta({ lastRegisterAt: host.lastRegisterAt, needsBootstrap: agentTokenMeta.needsBootstrap }),
    [agentTokenMeta.needsBootstrap, host.lastRegisterAt]
  );

  const installations = useMemo(() => {
    const seen = new Set<string>();
    const items = details.sysproUpdates
      .map((entry) => {
        const companyName = entry.resolvedCompanyName ?? entry.companyLabel;
        const key = `${companyName}::${entry.companyId ?? "unlinked"}`;
        if (seen.has(key)) return null;
        seen.add(key);
        return {
          companyId: entry.companyId,
          companyName,
          sourceLabel: entry.companyLabel,
        };
      })
      .filter((entry): entry is { companyId: string | null; companyName: string; sourceLabel: string } => !!entry);

    if (items.length) return items;

    return host.companyName
      ? [
          {
            companyId: host.companyId,
            companyName: host.companyName,
            sourceLabel: host.companyName,
          },
        ]
      : [];
  }, [details.sysproUpdates, host.companyId, host.companyName]);

  const heartbeat = useMemo(() => {
    if (!host.lastHeartbeatAt) {
      return {
        label: "Sem heartbeat",
        tone: "border-red-500/20 bg-red-500/10 text-red-700 dark:text-red-300",
        description: "O agente ainda nao registrou atividade recente no portal.",
      };
    }

    const diffMs = Date.now() - new Date(host.lastHeartbeatAt).getTime();
    const diffMinutes = Math.floor(diffMs / 60000);

    if (diffMinutes <= 5) {
      return {
        label: "Heartbeat recente",
        tone: "border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
        description: "Host provavelmente online e apto para acesso imediato.",
      };
    }

    if (diffMinutes <= 60) {
      return {
        label: "Heartbeat antigo",
        tone: "border-amber-500/20 bg-amber-500/10 text-amber-700 dark:text-amber-300",
        description: "O host respondeu antes, mas vale confirmar a conectividade.",
      };
    }

    return {
      label: "Sem resposta recente",
      tone: "border-red-500/20 bg-red-500/10 text-red-700 dark:text-red-300",
      description: "Ultimo contato muito antigo. Validar a instalacao do agente.",
    };
  }, [host.lastHeartbeatAt]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const userAgent = window.navigator.userAgent.toLowerCase();
    setIsMobileClient(/android|iphone|ipad|ipod|mobile/.test(userAgent));
  }, []);

  async function handleCopy(value: string | null, label: string) {
    if (!value) {
      toast.error(`${label} nao configurado.`);
      return;
    }

    try {
      await navigator.clipboard.writeText(value);
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

  function handleSaveMachineName() {
    startSavingMachineName(async () => {
      try {
        const response = await fetch(`/api/remote/hosts/${host.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            companyId: host.companyId,
            name: host.name,
            machineName,
            environment: host.environment,
            provider: host.provider,
            description: host.description,
            notes: host.notes,
            agentExternalId: host.rustdeskId,
            status: host.status,
          }),
        });

        const payload = await response.json().catch(() => null);
        if (!response.ok) {
          throw new Error(payload?.error ?? "Falha ao salvar nome da maquina.");
        }

        toast.success("Nome da maquina atualizado.");
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Falha ao salvar nome da maquina.");
      }
    });
  }

  function handleRotateAgentToken() {
    startRevokingAgentToken(async () => {
      try {
        const response = await fetch(`/api/remote/hosts/${host.id}/agent-token`, {
          method: "POST",
        });

        const payload = await response.json().catch(() => null);
        if (!response.ok) {
          throw new Error(payload?.error ?? "Falha ao rotacionar agentToken.");
        }

        toast.success(payload?.message ?? "agentToken rotacionado.");
        window.location.reload();
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Falha ao rotacionar agentToken.");
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
              <Badge variant="outline" className={serviceStatus.tone}>
                {serviceStatus.label}
              </Badge>
              <Badge variant="outline" className="border-border/60 bg-background/70 text-foreground">
                {statusLabel}
              </Badge>
              <Badge variant="outline" className={agentTokenMeta.tone}>
                {agentTokenMeta.label}
              </Badge>
              {host.environment ? (
                <Badge variant="outline" className="border-border/60 bg-background/70 text-muted-foreground">
                  {host.environment}
                </Badge>
              ) : null}
            </div>

            <div>
              <h1 className="text-2xl font-bold tracking-tight text-foreground">{host.name}</h1>
              <p className="mt-1 text-sm text-muted-foreground">
                {installations.length
                  ? `${installations.length} instalacao(oes) vinculada(s) nesta maquina`
                  : "Maquina remota vinculada ao portal"}
              </p>
              <p className="mt-2 text-sm text-muted-foreground">{host.description || "Sem descricao operacional."}</p>
            </div>

            <div className="grid gap-3 md:grid-cols-[1fr_auto]">
              <div className="rounded-xl border border-border/50 bg-muted/15 p-4">
                <p className="text-[11px] uppercase tracking-wide text-muted-foreground">RustDesk ID</p>
                <div className="mt-2 flex items-center gap-2">
                  <p className="font-mono text-base font-semibold text-foreground">{normalizedRustdeskId ?? "Nao configurado"}</p>
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleCopy(normalizedRustdeskId, "RustDesk ID")}>
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <Button onClick={handleOpenRustDesk} disabled={!rustdeskHref} className="gap-2 shadow-sm">
                  <ExternalLink className="h-4 w-4" />
                  {isMobileClient ? "Abrir no app" : "Abrir acesso remoto"}
                </Button>
                <Button variant="outline" onClick={() => handleCopy(host.installToken, "Token de instalacao")} className="gap-2">
                  <Fingerprint className="h-4 w-4" />
                  Copiar token
                </Button>
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-[1fr_auto]">
              <div className="space-y-2">
                <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Nome da maquina</p>
                <Input value={machineName} onChange={(event) => setMachineName(event.target.value)} placeholder="SERVIDOR-01" />
              </div>
              <div className="flex items-end">
                <Button onClick={handleSaveMachineName} disabled={isSavingMachineName || machineName === (host.machineName ?? "")}>
                  Salvar nome
                </Button>
              </div>
            </div>

            <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
              <span className="rounded-full border border-border/50 bg-muted/15 px-3 py-1">
                Heartbeat: {formatRelativeHeartbeat(host.lastHeartbeatAt)}
              </span>
              <span className="rounded-full border border-border/50 bg-muted/15 px-3 py-1">
                Sessao: {host.openSessionCount ? `${host.openSessionCount} ativa(s)` : "Nenhuma"}
              </span>
              <span className="rounded-full border border-border/50 bg-muted/15 px-3 py-1">
                Agente: {host.agentVersion ?? "Nao registrado"}
              </span>
            </div>

            <div className="grid gap-3 md:grid-cols-3">
              <div className={cn("rounded-xl border p-3", operationalMeta.tone)}>
                <p className="text-[11px] uppercase tracking-wide opacity-80">Operacao</p>
                <p className="mt-1 text-sm font-semibold">{operationalMeta.label}</p>
                <p className="mt-1 text-xs opacity-90">{operationalMeta.description}</p>
              </div>
              <div className={cn("rounded-xl border p-3", heartbeatOperationalMeta.tone)}>
                <p className="text-[11px] uppercase tracking-wide opacity-80">Saude do heartbeat</p>
                <p className="mt-1 text-sm font-semibold">{heartbeatOperationalMeta.label}</p>
                <p className="mt-1 text-xs opacity-90">{heartbeatOperationalMeta.description}</p>
              </div>
              <div className={cn("rounded-xl border p-3", bootstrapMeta.tone)}>
                <p className="text-[11px] uppercase tracking-wide opacity-80">Bootstrap</p>
                <p className="mt-1 text-sm font-semibold">{bootstrapMeta.label}</p>
                <p className="mt-1 text-xs opacity-90">{bootstrapMeta.description}</p>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            {agentTokenMeta.needsBootstrap ? (
              <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-3">
                <p className="font-medium text-foreground">Agente exige novo bootstrap</p>
                <p className="mt-1 text-sm text-muted-foreground">{agentTokenMeta.description}</p>
              </div>
            ) : null}
            <div className="rounded-xl border border-border/50 bg-muted/15 p-3">
              <p className="font-medium text-foreground">Heartbeat: {heartbeat.label}</p>
              <p className="mt-1 text-sm text-muted-foreground">{heartbeat.description}</p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-xl border border-border/50 bg-muted/15 p-3">
                <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Ultimo heartbeat</p>
                <p className="mt-1 text-sm font-semibold text-foreground">{formatRelativeHeartbeat(host.lastHeartbeatAt)}</p>
                <p className="mt-1 text-xs text-muted-foreground">{formatDateTime(host.lastHeartbeatAt)}</p>
              </div>
              <div className="rounded-xl border border-border/50 bg-muted/15 p-3">
                <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Servico do agente</p>
                <p className="mt-1 text-sm font-semibold text-foreground">{serviceStatus.label}</p>
              </div>
            </div>
            <div className="rounded-xl border border-border/50 bg-muted/15 p-3 text-sm text-muted-foreground">
              <p>
                1. Use <span className="font-medium text-foreground">{isMobileClient ? "Abrir no app" : "Abrir acesso remoto"}</span> como acao principal.
              </p>
              <p>2. Se o app nao abrir, copie o `RustDesk ID` e conecte manualmente.</p>
              <p>3. Atualize o nome da maquina quando o heartbeat vier com identificacao diferente.</p>
              {agentTokenMeta.needsBootstrap ? (
                <p>4. Este host precisa de novo bootstrap antes do proximo heartbeat valido.</p>
              ) : null}
              {host.openSessionCount > 0 ? <p>{agentTokenMeta.needsBootstrap ? "5" : "4"}. Ja existe sessao aberta. Evite duplicidade de atendimento.</p> : null}
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="conexao" className="space-y-4">
        <TabsList className="grid h-auto w-full grid-cols-2 gap-1 md:grid-cols-5">
          <TabsTrigger value="conexao">Conexao</TabsTrigger>
          <TabsTrigger value="instalacoes">Instalacoes</TabsTrigger>
          <TabsTrigger value="agente">Agente</TabsTrigger>
          <TabsTrigger value="clientes">Clientes</TabsTrigger>
          <TabsTrigger value="observacoes">Observacoes</TabsTrigger>
        </TabsList>

        <TabsContent value="conexao">
          <Card className="border-border/50">
            <CardHeader>
              <CardTitle className="text-lg">Resumo de conexao</CardTitle>
              <CardDescription>Somente os dados tecnicos que ainda valem consulta depois do bloco inicial.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <div className="rounded-xl border border-border/50 bg-muted/15 p-4">
                <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Machine name</p>
                <p className="mt-1 text-sm text-foreground">{machineName || "Nao registrada"}</p>
              </div>
              <div className="rounded-xl border border-border/50 bg-muted/15 p-4">
                <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Versao do agente</p>
                <p className="mt-1 text-sm text-foreground">{host.agentVersion ?? "Nao registrada"}</p>
              </div>
              <div className="rounded-xl border border-border/50 bg-muted/15 p-4">
                <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Token de instalacao</p>
                <p className="mt-1 font-mono text-sm text-foreground">{host.installToken ?? "Nao configurado"}</p>
              </div>
              <div className="rounded-xl border border-border/50 bg-muted/15 p-4">
                <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Provider</p>
                <p className="mt-1 text-sm text-foreground">{host.provider ?? "Nao definido"}</p>
              </div>
              <div className="rounded-xl border border-border/50 bg-muted/15 p-4">
                <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Ultimo sucesso</p>
                <p className="mt-1 text-sm text-foreground">{formatDateTime(host.lastHeartbeatSuccessAt)}</p>
              </div>
              <div className="rounded-xl border border-border/50 bg-muted/15 p-4">
                <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Ultimo IP</p>
                <p className="mt-1 text-sm text-foreground">{host.lastKnownIp ?? "Sem leitura"}</p>
              </div>
              <div className="rounded-xl border border-border/50 bg-muted/15 p-4 md:col-span-2 xl:col-span-2">
                <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Ultimo erro do heartbeat</p>
                <p className="mt-1 text-sm text-foreground">{host.lastHeartbeatErrorMessage ?? "Sem erro recente registrado"}</p>
                <p className="mt-1 text-xs text-muted-foreground">{formatDateTime(host.lastHeartbeatErrorAt)}</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="instalacoes">
          <Card className="border-border/50">
            <CardHeader>
              <CardTitle className="text-lg">Instalacoes da maquina</CardTitle>
              <CardDescription>
                Cada acesso remoto representa a maquina. Aqui aparecem todas as instalacoes/empresas encontradas nela.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {details.sysproUpdates.length ? (
                details.sysproUpdates.map((entry) => (
                  <div key={entry.id} className="rounded-xl border border-border/50 bg-muted/15 p-4">
                    <div className="grid gap-4 lg:grid-cols-[1fr_1.3fr_180px_180px]">
                      <div>
                        <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Empresa</p>
                        <p className="mt-1 text-sm font-medium text-foreground">{entry.resolvedCompanyName ?? entry.companyLabel}</p>
                        {!entry.companyId ? (
                          <p className="mt-1 text-xs text-amber-600 dark:text-amber-300">Sem vinculo automatico com empresa cadastrada</p>
                        ) : null}
                      </div>
                      <div>
                        <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Caminho monitorado</p>
                        <p className="mt-1 break-all font-mono text-xs text-foreground">{entry.path}</p>
                      </div>
                      <div>
                        <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Ultima atualizacao</p>
                        <p className="mt-1 text-sm text-foreground">{formatDateTime(entry.lastFileWriteAt)}</p>
                      </div>
                      <div>
                        <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Ultimo heartbeat</p>
                        <p className="mt-1 text-sm text-foreground">{formatDateTime(entry.lastHeartbeatAt)}</p>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">
                  Esta maquina ainda nao enviou instalacoes no heartbeat.
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="agente">
          <Card className="border-border/50">
            <CardHeader>
              <CardTitle className="text-lg">Fluxo de instalacao do agente</CardTitle>
              <CardDescription>Recorte operacional do FEAT-002 para nao depender de memoria do tecnico em campo.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap gap-2">
                <a href={host.agent.installerPath} className={cn(buttonVariants({ variant: "outline" }), "gap-2")}>
                  <HardDriveDownload className="h-4 w-4" />
                  Baixar .ps1 do host
                </a>
                <Button variant="outline" onClick={() => handleCopy(host.installToken, "Token de instalacao")} className="gap-2">
                  <Fingerprint className="h-4 w-4" />
                  Copiar token
                </Button>
                <Button variant="outline" onClick={() => handleCopy(normalizedRustdeskId, "RustDesk ID")} className="gap-2">
                  <Copy className="h-4 w-4" />
                  Copiar RustDesk ID
                </Button>
                <Button variant="outline" onClick={handleRotateAgentToken} disabled={isRevokingAgentToken} className="gap-2">
                  <Fingerprint className="h-4 w-4" />
                  {isRevokingAgentToken ? "Rotacionando..." : "Rotacionar agentToken"}
                </Button>
              </div>

              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                <div className="rounded-xl border border-border/50 bg-muted/15 p-4">
                  <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Estado do agentToken</p>
                  <p className="mt-1 text-sm text-foreground">{agentTokenMeta.label}</p>
                </div>
                <div className="rounded-xl border border-border/50 bg-muted/15 p-4">
                  <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Bootstrap inicial</p>
                  <p className="mt-1 text-sm text-foreground">{formatDateTime(host.agent.lastRegisterAt)}</p>
                </div>
                <div className="rounded-xl border border-border/50 bg-muted/15 p-4">
                  <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Origem do bootstrap</p>
                  <p className="mt-1 text-sm text-foreground">{host.agent.lastRegisterSource ?? "Sem leitura"}</p>
                </div>
                <div className="rounded-xl border border-border/50 bg-muted/15 p-4">
                  <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Ultimo heartbeat valido</p>
                  <p className="mt-1 text-sm text-foreground">{formatDateTime(host.agent.lastHeartbeatSuccessAt)}</p>
                </div>
                <div className="rounded-xl border border-border/50 bg-muted/15 p-4">
                  <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Ultimo IP reportado</p>
                  <p className="mt-1 text-sm text-foreground">{host.agent.lastKnownIp ?? "Sem leitura"}</p>
                </div>
              </div>

              <div className="grid gap-3 md:grid-cols-2">
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

              <div className="rounded-xl border border-border/50 bg-muted/15 p-4 text-sm text-muted-foreground">
                <p>1. Baixe o script dedicado deste host.</p>
                <p>2. Execute na maquina do cliente e confirme o RustDesk ID devolvido.</p>
                <p>3. O bootstrap emite `agentToken` e o heartbeat continuo passa a preferir essa credencial.</p>
                <p>4. Se rotacionar o `agentToken` ou se ele expirar, execute o bootstrap novamente neste host.</p>
                <p>5. Se o heartbeat nao vier, valide conectividade, permissao do PowerShell e URL do portal.</p>
                {isMobileClient ? <p>6. No celular, prefira `Abrir no app` e mantenha o `RustDesk ID` como fallback manual.</p> : null}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="clientes">
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
        </TabsContent>

        <TabsContent value="observacoes">
          <Card className="border-border/50">
            <CardHeader>
              <CardTitle className="text-lg">Observacoes e configuracoes operacionais</CardTitle>
              <CardDescription>Contexto manual do host e parametros tecnicos definidos no cadastro da empresa.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 xl:grid-cols-[0.92fr_1.08fr]">
              <div className="space-y-4">
                <div className="rounded-xl border border-border/50 bg-muted/15 p-4 text-sm text-muted-foreground">
                  <p className="flex items-center gap-2 font-medium text-foreground">
                    <Wrench className="h-4 w-4 text-muted-foreground" />
                    Host
                  </p>
                  <div className="mt-3 space-y-2">
                    <p><span className="font-medium text-foreground">Descricao:</span> {host.description || "Sem descricao operacional."}</p>
                    <p><span className="font-medium text-foreground">Observacoes:</span> {host.notes ?? "Sem observacoes do host."}</p>
                  </div>
                </div>

                <div className="rounded-xl border border-border/50 bg-muted/15 p-4 text-sm text-muted-foreground">
                  <p className="flex items-center gap-2 font-medium text-foreground">
                    <TimerReset className="h-4 w-4 text-muted-foreground" />
                    Empresa
                  </p>
                  <div className="mt-3 space-y-2">
                    <p><span className="font-medium text-foreground">Empresa:</span> {details.company.nomeFantasia ?? details.company.razaoSocial}</p>
                    <p><span className="font-medium text-foreground">Observacoes da empresa:</span> {details.company.observacoes ?? "Sem observacoes cadastradas."}</p>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div className="rounded-xl border border-border/50 bg-muted/15 p-4 text-sm text-muted-foreground">
                  <p className="flex items-center gap-2 font-medium text-foreground">
                    <HardDriveDownload className="h-4 w-4 text-muted-foreground" />
                    Configuracoes do servidor
                  </p>
                  <div className="mt-3 grid gap-3 md:grid-cols-2">
                    <div className="rounded-lg border border-border/40 bg-background/40 p-3">
                      <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Tipo de servidor</p>
                      <p className="mt-1 text-sm text-foreground">
                        {details.company.serverType ? COMPANY_SERVER_TYPE_LABEL[details.company.serverType] : "Nao configurado"}
                      </p>
                    </div>
                    <div className="rounded-lg border border-border/40 bg-background/40 p-3">
                      <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Diretorio da instalacao</p>
                      <p className="mt-1 break-all text-sm text-foreground">{details.company.installationDirectory || "Nao configurado"}</p>
                    </div>
                    <div className="rounded-lg border border-border/40 bg-background/40 p-3">
                      <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Servidor</p>
                      <p className="mt-1 text-sm text-foreground">{details.company.serverHost || "Nao configurado"}</p>
                    </div>
                    <div className="rounded-lg border border-border/40 bg-background/40 p-3">
                      <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Porta</p>
                      <p className="mt-1 text-sm text-foreground">{details.company.serverPort ? String(details.company.serverPort) : "Nao configurado"}</p>
                    </div>
                    <div className="rounded-lg border border-border/40 bg-background/40 p-3">
                      <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Conexao</p>
                      <p className="mt-1 text-sm text-foreground">{details.company.serverProtocol || "Nao configurado"}</p>
                    </div>
                    <div className="rounded-lg border border-border/40 bg-background/40 p-3">
                      <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Url Path (ISAPI)</p>
                      <p className="mt-1 break-all text-sm text-foreground">{details.company.iisIsapiPath || "Nao configurado"}</p>
                    </div>
                  </div>
                </div>

                <div className="rounded-xl border border-border/50 bg-muted/15 p-4 text-sm text-muted-foreground">
                  <p className="flex items-center gap-2 font-medium text-foreground">
                    <ExternalLink className="h-4 w-4 text-muted-foreground" />
                    Conexoes remotas
                  </p>
                  <div className="mt-3 space-y-3">
                    {details.company.remoteConnections.length ? (
                      details.company.remoteConnections.map((connection, index) => (
                        <div key={`${connection.type}-${index}`} className="rounded-lg border border-border/40 bg-background/40 p-3">
                          <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Tipo</p>
                          <p className="mt-1 text-sm font-medium text-foreground">{REMOTE_CONNECTION_LABEL[connection.type]}</p>
                          <p className="mt-2 text-[11px] uppercase tracking-wide text-muted-foreground">Nome/IP/identificacao</p>
                          <p className="mt-1 break-all text-sm text-foreground">{connection.details || "Sem detalhe informado"}</p>
                        </div>
                      ))
                    ) : (
                      <div className="rounded-lg border border-dashed border-border/50 bg-background/30 p-3">
                        Nenhuma conexao remota cadastrada na empresa.
                      </div>
                    )}
                  </div>
                </div>
              </div>
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
