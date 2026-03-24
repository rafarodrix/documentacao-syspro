"use client";

import Link from "next/link";
import { useMemo } from "react";
import {
  ArrowLeft,
  Copy,
  ExternalLink,
  Fingerprint,
  HardDriveDownload,
  LifeBuoy,
  ShieldCheck,
  TimerReset,
  UserRound,
  Wrench,
} from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
  const normalizedRustdeskId = host.rustdeskId ? host.rustdeskId.replace(/\s+/g, "") : null;
  const rustdeskHref = normalizedRustdeskId ? `rustdesk://${normalizedRustdeskId}` : null;
  const statusLabel = host.status === "ACTIVE" ? "Ativo" : host.status === "MAINTENANCE" ? "Manutencao" : "Inativo";
  const serviceStatus = getServiceStatusMeta(host.serviceStatus);

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

  return (
    <div className="space-y-6">
      <Card className="border-border/50 overflow-hidden">
        <CardContent className="grid gap-6 p-6 lg:grid-cols-[1.25fr_0.75fr]">
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

            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-3">
                <Link href="/portal/plataforma-remota" className={cn(buttonVariants({ variant: "outline" }), "h-8 gap-2 px-3")}>
                  <ArrowLeft className="h-4 w-4" />
                  Voltar
                </Link>
                {rustdeskHref ? (
                  <Button onClick={handleOpenRustDesk} className="gap-2 shadow-sm">
                    <ExternalLink className="h-4 w-4" />
                    Abrir acesso remoto
                  </Button>
                ) : (
                  <Button disabled>RustDesk nao configurado</Button>
                )}
              </div>

              <div>
                <h1 className="text-3xl font-bold tracking-tight text-foreground">{host.name}</h1>
                <p className="mt-1 text-base text-muted-foreground">{host.companyName ?? "Sem empresa"}</p>
                <p className="mt-2 text-sm text-muted-foreground">{host.description || "Sem descricao operacional."}</p>
              </div>
            </div>

          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
            <div className="rounded-xl border border-border/50 bg-muted/15 p-4">
              <p className="text-[11px] uppercase tracking-wide text-muted-foreground">RustDesk ID</p>
              <p className="mt-1 font-mono text-base font-semibold text-foreground">{normalizedRustdeskId ?? "Nao configurado"}</p>
            </div>
            <div className="rounded-xl border border-border/50 bg-muted/15 p-4">
              <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Ultimo heartbeat</p>
              <p className="mt-1 text-base font-semibold text-foreground">{formatRelativeHeartbeat(host.lastHeartbeatAt)}</p>
              <p className="mt-1 text-xs text-muted-foreground">{formatDateTime(host.lastHeartbeatAt)}</p>
            </div>
            <div className="rounded-xl border border-border/50 bg-muted/15 p-4">
              <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Servico do agente</p>
              <p className="mt-1 text-base font-semibold text-foreground">{serviceStatus.label}</p>
            </div>
            <div className="rounded-xl border border-border/50 bg-muted/15 p-4">
              <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Sessao aberta</p>
              <p className="mt-1 text-base font-semibold text-foreground">{host.openSessionCount ? `${host.openSessionCount} ativa(s)` : "Nenhuma"}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-[1.05fr_0.95fr]">
        <Card className="border-border/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <ShieldCheck className="h-5 w-5 text-primary" />
              Acoes imediatas
            </CardTitle>
            <CardDescription>Atalhos para reduzir cliques na operacao de suporte.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2">
            <Button onClick={handleOpenRustDesk} disabled={!rustdeskHref} className="justify-start gap-2">
              <ExternalLink className="h-4 w-4" />
              Abrir RustDesk
            </Button>
            <Button variant="outline" onClick={() => handleCopy(normalizedRustdeskId, "RustDesk ID")} className="justify-start gap-2">
              <Copy className="h-4 w-4" />
              Copiar RustDesk ID
            </Button>
            <Button variant="outline" onClick={() => handleCopy(host.installToken, "Token de instalacao")} className="justify-start gap-2">
              <Fingerprint className="h-4 w-4" />
              Copiar token
            </Button>
            <Link href="/portal/plataforma-remota" className={cn(buttonVariants({ variant: "outline" }), "justify-start gap-2")}>
              <ArrowLeft className="h-4 w-4" />
              Voltar ao diretorio
            </Link>
          </CardContent>
        </Card>

        <Card className="border-border/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <LifeBuoy className="h-5 w-5 text-primary" />
              Guia operacional
            </CardTitle>
            <CardDescription>Leitura curta para o analista decidir rapido.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="rounded-xl border border-border/50 bg-muted/15 p-3">
              <p className="font-medium text-foreground">Heartbeat: {heartbeat.label}</p>
              <p className="mt-1 text-muted-foreground">{heartbeat.description}</p>
            </div>
            <div className="rounded-xl border border-border/50 bg-muted/15 p-3 text-muted-foreground">
              <p>1. Valide o heartbeat e o status do host.</p>
              <p>2. Use `Abrir RustDesk` como acao principal.</p>
              <p>3. Se houver bloqueio do navegador, use `Copiar RustDesk ID`.</p>
              <p>4. Se falhar, valide senha do host e servidor configurado.</p>
              {host.openSessionCount > 0 ? <p>5. Ja existe sessao aberta. Evite duplicidade de atendimento.</p> : null}
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="conexao" className="space-y-4">
        <TabsList className="grid h-auto w-full grid-cols-2 gap-1 md:grid-cols-6">
          <TabsTrigger value="conexao">Conexao</TabsTrigger>
          <TabsTrigger value="bases">Bases</TabsTrigger>
          <TabsTrigger value="agente">Agente</TabsTrigger>
          <TabsTrigger value="empresa">Empresa</TabsTrigger>
          <TabsTrigger value="clientes">Clientes</TabsTrigger>
          <TabsTrigger value="observacoes">Observacoes</TabsTrigger>
        </TabsList>

        <TabsContent value="conexao">
          <Card className="border-border/50">
            <CardHeader>
              <CardTitle className="text-lg">Resumo de conexao</CardTitle>
              <CardDescription>Informacoes que normalmente ficam dispersas entre cadastro, agente e sessao.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              <div className="rounded-xl border border-border/50 bg-muted/15 p-4">
                <p className="text-[11px] uppercase tracking-wide text-muted-foreground">RustDesk ID</p>
                <p className="mt-1 font-mono text-sm text-foreground">{normalizedRustdeskId ?? "Nao configurado"}</p>
              </div>
              <div className="rounded-xl border border-border/50 bg-muted/15 p-4">
                <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Machine name</p>
                <p className="mt-1 text-sm text-foreground">{host.machineName ?? "Nao registrada"}</p>
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
                <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Heartbeat</p>
                <p className="mt-1 text-sm text-foreground">{formatDateTime(host.lastHeartbeatAt)}</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="bases">
          <Card className="border-border/50">
            <CardHeader>
              <CardTitle className="text-lg">Bases monitoradas</CardTitle>
              <CardDescription>
                Leituras recebidas do heartbeat para maquinas que hospedam mais de uma base Syspro.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {details.sysproUpdates.length ? (
                details.sysproUpdates.map((entry) => (
                  <div key={entry.id} className="rounded-xl border border-border/50 bg-muted/15 p-4">
                    <div className="grid gap-4 lg:grid-cols-[1fr_1.3fr_180px_180px]">
                      <div>
                        <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Empresa</p>
                        <p className="mt-1 text-sm font-medium text-foreground">{entry.companyLabel}</p>
                        {entry.resolvedCompanyName && entry.resolvedCompanyName !== entry.companyLabel ? (
                          <p className="mt-1 text-xs text-muted-foreground">Vinculada a: {entry.resolvedCompanyName}</p>
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
                  Este host ainda nao enviou leituras de multi-bases no heartbeat.
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

        <TabsContent value="empresa">
          <Card className="border-border/50">
            <CardHeader>
              <CardTitle className="text-lg">Dados da empresa</CardTitle>
              <CardDescription>Contexto rapido para confirmar quem esta sendo atendido.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2 text-sm text-muted-foreground">
                <p><span className="font-medium text-foreground">Empresa:</span> {details.company.nomeFantasia ?? details.company.razaoSocial}</p>
                <p><span className="font-medium text-foreground">Razao social:</span> {details.company.razaoSocial}</p>
                <p><span className="font-medium text-foreground">CNPJ:</span> {details.company.cnpj}</p>
              </div>
              <div className="space-y-2 text-sm text-muted-foreground">
                <p><span className="font-medium text-foreground">E-mail:</span> {details.company.emailContato ?? "Nao informado"}</p>
                <p><span className="font-medium text-foreground">Telefone:</span> {details.company.telefone ?? "Nao informado"}</p>
                <p><span className="font-medium text-foreground">Host ID:</span> {host.id}</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="clientes">
          <Card className="border-border/50">
            <CardHeader>
              <CardTitle className="text-lg">Pessoas vinculadas</CardTitle>
              <CardDescription>Usuarios ativos da empresa para dar contexto ao atendimento.</CardDescription>
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
