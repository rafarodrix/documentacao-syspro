"use client";

import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
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

export function RemoteHostDetailsPanel({ details }: { details: RemoteHostDetails }) {
  const { host } = details;
  const [machineName, setMachineName] = useState(host.machineName ?? "");
  const [isSavingMachineName, startSavingMachineName] = useTransition();
  const normalizedRustdeskId = host.rustdeskId ? host.rustdeskId.replace(/\s+/g, "") : null;
  const rustdeskHref = normalizedRustdeskId ? `rustdesk://${normalizedRustdeskId}` : null;
  const statusLabel = host.status === "ACTIVE" ? "Ativo" : host.status === "MAINTENANCE" ? "Manutencao" : "Inativo";
  const serviceStatus = getServiceStatusMeta(host.serviceStatus);

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
                  Abrir acesso remoto
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
          </div>

          <div className="space-y-3">
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
              <p>1. Use `Abrir acesso remoto` como acao principal.</p>
              <p>2. Se falhar, copie o `RustDesk ID` e conecte manualmente.</p>
              <p>3. Atualize o nome da maquina quando o heartbeat vier com identificacao diferente.</p>
              {host.openSessionCount > 0 ? <p>4. Ja existe sessao aberta. Evite duplicidade de atendimento.</p> : null}
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
                <p>3. Aguarde o heartbeat inicial para o host sair de `PENDING_INSTALL`.</p>
                <p>4. Se o heartbeat nao vier, valide conectividade, permissao do PowerShell e URL do portal.</p>
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
              <CardTitle className="text-lg">Observacoes operacionais</CardTitle>
              <CardDescription>Informacao manual para nao depender de memoria do suporte.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
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
                  <p><span className="font-medium text-foreground">Observacoes da empresa:</span> {details.company.observacoes ?? "Sem observacoes cadastradas."}</p>
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
